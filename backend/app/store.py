from __future__ import annotations

import json
import os
import sqlite3
import threading
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]


def data_dir() -> Path:
    return Path(os.environ.get("PTW_DATA_DIR", ROOT / "data"))


def db_path() -> Path:
    return data_dir() / "ptw.sqlite3"


def upload_dir() -> Path:
    return data_dir() / "uploads"

ALLOWED_MIME = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "application/pdf": ".pdf",
}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
NATURES = ("repair", "maintenance", "service")
STATUSES = ("draft", "active", "pending_user", "pending_review", "completed")
LOCATIONS = ("Darth Valley Hospital", "Queen Mary's Hospital")
LOCATION_PREFIX = {
    "Darth Valley Hospital": "DVH",
    "Queen Mary's Hospital": "QMH",
}

_lock = threading.Lock()
_initialized = False


def utcnow() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _connect() -> sqlite3.Connection:
    data_dir().mkdir(parents=True, exist_ok=True)
    upload_dir().mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def reset_runtime() -> None:
    global _initialized
    with _lock:
        _initialized = False


def init_db() -> None:
    global _initialized
    with _lock:
        if _initialized:
            return
        conn = _connect()
        try:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS permits (
                    id TEXT PRIMARY KEY,
                    equipment_sn TEXT NOT NULL,
                    location TEXT NOT NULL,
                    nature_of_work TEXT NOT NULL,
                    description TEXT NOT NULL DEFAULT '',
                    status TEXT NOT NULL,
                    access_token TEXT UNIQUE,
                    contractor_name TEXT,
                    work_details TEXT,
                    fit_for_purpose INTEGER,
                    created_by TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    activated_at TEXT,
                    submitted_at TEXT,
                    audited_at TEXT
                );

                CREATE TABLE IF NOT EXISTS signatures (
                    id TEXT PRIMARY KEY,
                    permit_id TEXT NOT NULL,
                    part TEXT NOT NULL,
                    signer_name TEXT NOT NULL,
                    signer_role TEXT NOT NULL,
                    image_png TEXT NOT NULL,
                    signed_at TEXT NOT NULL,
                    user_agent TEXT,
                    FOREIGN KEY (permit_id) REFERENCES permits(id)
                );

                CREATE TABLE IF NOT EXISTS evidence (
                    id TEXT PRIMARY KEY,
                    permit_id TEXT NOT NULL,
                    original_name TEXT NOT NULL,
                    stored_name TEXT NOT NULL,
                    content_type TEXT NOT NULL,
                    size_bytes INTEGER NOT NULL,
                    uploaded_at TEXT NOT NULL,
                    FOREIGN KEY (permit_id) REFERENCES permits(id)
                );

                CREATE TABLE IF NOT EXISTS audit_events (
                    id TEXT PRIMARY KEY,
                    permit_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (permit_id) REFERENCES permits(id)
                );

                CREATE INDEX IF NOT EXISTS idx_permits_status ON permits(status);
                CREATE INDEX IF NOT EXISTS idx_audit_permit ON audit_events(permit_id, created_at);
                """
            )
            _ensure_columns(conn)
            conn.commit()
        finally:
            conn.close()
        _initialized = True


def _ensure_columns(conn: sqlite3.Connection) -> None:
    cols = {row[1] for row in conn.execute("PRAGMA table_info(permits)")}
    additions = {
        "equipment_name": "TEXT NOT NULL DEFAULT ''",
        "decontaminated": "INTEGER NOT NULL DEFAULT 0",
        "not_fit_reason": "TEXT",
        "user_fit": "INTEGER",
        "user_not_fit_details": "TEXT",
    }
    for name, spec in additions.items():
        if name not in cols:
            conn.execute(f"ALTER TABLE permits ADD COLUMN {name} {spec}")


def _row_to_permit(row: sqlite3.Row, *, signatures: list[dict], evidence: list[dict], events: list[dict] | None = None) -> dict[str, Any]:
    data = dict(row)
    data["fit_for_purpose"] = None if data.get("fit_for_purpose") is None else bool(data["fit_for_purpose"])
    data["decontaminated"] = bool(data.get("decontaminated"))
    data["user_fit"] = None if data.get("user_fit") is None else bool(data["user_fit"])
    data["signatures"] = signatures
    data["evidence"] = evidence
    if events is not None:
        data["audit_trail"] = events
    return data


def _fetch_child_rows(conn: sqlite3.Connection, permit_id: str, include_trail: bool = False) -> tuple[list[dict], list[dict], list[dict] | None]:
    signatures = [
        dict(r)
        for r in conn.execute(
            "SELECT * FROM signatures WHERE permit_id = ? ORDER BY signed_at",
            (permit_id,),
        ).fetchall()
    ]
    evidence = [
        dict(r)
        for r in conn.execute(
            "SELECT * FROM evidence WHERE permit_id = ? ORDER BY uploaded_at",
            (permit_id,),
        ).fetchall()
    ]
    events = None
    if include_trail:
        events = [
            {**dict(r), "payload": json.loads(r["payload_json"])}
            for r in conn.execute(
                "SELECT * FROM audit_events WHERE permit_id = ? ORDER BY created_at",
                (permit_id,),
            ).fetchall()
        ]
        for event in events:
            event.pop("payload_json", None)
    return signatures, evidence, events


def _append_event(conn: sqlite3.Connection, permit_id: str, event_type: str, actor: str, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        INSERT INTO audit_events (id, permit_id, event_type, actor, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (str(uuid.uuid4()), permit_id, event_type, actor, json.dumps(payload), utcnow()),
    )


def _next_id(conn: sqlite3.Connection, location: str) -> str:
    prefix = LOCATION_PREFIX.get(location, "PTW")
    rows = conn.execute("SELECT id FROM permits WHERE id LIKE ?", (f"{prefix}%",)).fetchall()
    n = 0
    for row in rows:
        digits = "".join(ch for ch in str(row["id"])[len(prefix) :] if ch.isdigit())
        if digits:
            n = max(n, int(digits))
    return f"{prefix}{n + 1:02d}"


def create_permit(payload: dict[str, Any]) -> dict[str, Any]:
    init_db()
    nature = payload["nature_of_work"]
    if nature not in NATURES:
        raise ValueError("Nature of work must be Repair, Maintenance, or Service.")
    location = (payload.get("location") or "").strip()
    if location not in LOCATIONS:
        raise ValueError("Location must be Darth Valley Hospital or Queen Mary's Hospital.")
    now = utcnow()
    actor = payload.get("created_by") or "User"
    with _lock:
        conn = _connect()
        try:
            permit_id = _next_id(conn, location)
            conn.execute(
                """
                INSERT INTO permits (
                    id, equipment_sn, equipment_name, location, nature_of_work, description,
                    decontaminated, status, created_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
                """,
                (
                    permit_id,
                    payload["equipment_sn"].strip(),
                    (payload.get("equipment_name") or "").strip(),
                    location,
                    nature,
                    (payload.get("description") or "").strip(),
                    1 if payload.get("decontaminated") else 0,
                    actor,
                    now,
                    now,
                ),
            )
            signature = payload.get("signature_png")
            if signature:
                if not str(signature).startswith("data:image/png;base64,"):
                    raise ValueError("A PNG signature is required.")
                conn.execute(
                    """
                    INSERT INTO signatures (id, permit_id, part, signer_name, signer_role, image_png, signed_at, user_agent)
                    VALUES (?, ?, 'user', ?, 'user', ?, ?, ?)
                    """,
                    (str(uuid.uuid4()), permit_id, actor, signature, now, payload.get("user_agent") or ""),
                )
            _append_event(
                conn,
                permit_id,
                "permit.created",
                actor,
                {
                    "equipment_sn": payload["equipment_sn"].strip(),
                    "location": location,
                    "nature_of_work": nature,
                },
            )
            conn.commit()
        finally:
            conn.close()
    return get_permit(permit_id, include_trail=True)


def list_permits(status: str | None = None, q: str | None = None, vault_only: bool = False) -> list[dict[str, Any]]:
    init_db()
    conn = _connect()
    try:
        clauses = []
        args: list[Any] = []
        if vault_only:
            clauses.append("status = 'completed'")
        elif status:
            if status not in STATUSES:
                raise ValueError("Unknown status filter.")
            clauses.append("status = ?")
            args.append(status)
        if q:
            like = f"%{q.strip()}%"
            clauses.append(
                "(id LIKE ? OR equipment_sn LIKE ? OR location LIKE ? OR contractor_name LIKE ? OR description LIKE ?)"
            )
            args.extend([like, like, like, like, like])
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        rows = conn.execute(
            f"SELECT * FROM permits {where} ORDER BY updated_at DESC",
            args,
        ).fetchall()
        results = []
        for row in rows:
            signatures, evidence, _ = _fetch_child_rows(conn, row["id"])
            results.append(_row_to_permit(row, signatures=signatures, evidence=evidence))
        return results
    finally:
        conn.close()


def dashboard_stats() -> dict[str, int]:
    init_db()
    conn = _connect()
    try:
        counts = {status: 0 for status in STATUSES}
        for row in conn.execute("SELECT status, COUNT(*) AS n FROM permits GROUP BY status"):
            if row["status"] in counts:
                counts[row["status"]] = row["n"]
        counts["total"] = sum(counts[s] for s in STATUSES)
        counts["awaiting_review"] = counts["pending_user"] + counts["pending_review"]
        return counts
    finally:
        conn.close()


def _month_keys(months: int = 6) -> list[tuple[str, str]]:
    now = datetime.now(timezone.utc)
    year, month = now.year, now.month
    keys: list[tuple[str, str]] = []
    for _ in range(months):
        key = f"{year:04d}-{month:02d}"
        label = datetime(year, month, 1, tzinfo=timezone.utc).strftime("%b %Y")
        keys.insert(0, (key, label))
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    return keys


def _iso_days_ago(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).replace(microsecond=0).isoformat()


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _in_period(value: str | None, start: datetime, end: datetime) -> bool:
    parsed = _parse_iso(value)
    return parsed is not None and start <= parsed < end


def analytics_report(*, months: int = 6, period_days: int = 30) -> dict[str, Any]:
    init_db()
    conn = _connect()
    try:
        rows = [dict(r) for r in conn.execute("SELECT * FROM permits").fetchall()]
        counts = dashboard_stats()
        now = datetime.now(timezone.utc)
        period_start = now - timedelta(days=period_days)
        prev_start = now - timedelta(days=period_days * 2)

        def period_counts(start: datetime, end: datetime) -> dict[str, int]:
            created = activated = completed = 0
            for row in rows:
                if _in_period(row["created_at"], start, end):
                    created += 1
                if _in_period(row["activated_at"], start, end):
                    activated += 1
                if _in_period(row["audited_at"], start, end):
                    completed += 1
            return {"created": created, "activated": activated, "completed": completed}

        current_period = period_counts(period_start, now)
        previous_period = period_counts(prev_start, period_start)

        month_index = {key: idx for idx, (key, _) in enumerate(_month_keys(months))}
        monthly_flow = [
            {"month": key, "label": label, "opened": 0, "activated": 0, "closed": 0}
            for key, label in _month_keys(months)
        ]
        monthly_status = [
            {
                "month": key,
                "label": label,
                **{status: 0 for status in STATUSES},
            }
            for key, label in _month_keys(months)
        ]

        for row in rows:
            created = _parse_iso(row["created_at"])
            if created:
                key = created.strftime("%Y-%m")
                if key in month_index:
                    idx = month_index[key]
                    monthly_flow[idx]["opened"] += 1
                    status = row["status"]
                    if status in STATUSES:
                        monthly_status[idx][status] += 1
            activated = _parse_iso(row["activated_at"])
            if activated:
                key = activated.strftime("%Y-%m")
                if key in month_index:
                    monthly_flow[month_index[key]]["activated"] += 1
            audited = _parse_iso(row["audited_at"])
            if audited:
                key = audited.strftime("%Y-%m")
                if key in month_index:
                    monthly_flow[month_index[key]]["closed"] += 1

        cumulative_closed = 0
        for bucket in monthly_flow:
            cumulative_closed += bucket["closed"]
            bucket["cumulative_closed"] = cumulative_closed

        by_location: list[dict[str, Any]] = []
        for location in LOCATIONS:
            entry: dict[str, Any] = {"location": location, "total": 0}
            for status in STATUSES:
                entry[status] = 0
            for row in rows:
                if row["location"] == location and row["status"] in STATUSES:
                    entry[row["status"]] += 1
                    entry["total"] += 1
            by_location.append(entry)

        by_nature: list[dict[str, Any]] = []
        for nature in NATURES:
            total = open_count = completed = recent = 0
            for row in rows:
                if row["nature_of_work"] != nature:
                    continue
                total += 1
                if row["status"] != "completed":
                    open_count += 1
                else:
                    completed += 1
                if _in_period(row["created_at"], period_start, now):
                    recent += 1
            by_nature.append(
                {
                    "nature": nature,
                    "total": total,
                    "open": open_count,
                    "completed": completed,
                    "recent": recent,
                }
            )

        fit = not_fit = pending_fit = 0
        close_days: list[float] = []
        for row in rows:
            if row["fit_for_purpose"] is None:
                pending_fit += 1
            elif row["fit_for_purpose"]:
                fit += 1
            else:
                not_fit += 1
            created = _parse_iso(row["created_at"])
            audited = _parse_iso(row["audited_at"])
            if created and audited:
                close_days.append((audited - created).total_seconds() / 86400)

        all_completed = counts["completed"]
        all_total = counts["total"]
        completion_rate = round((all_completed / all_total) * 100, 1) if all_total else 0.0
        avg_days = round(sum(close_days) / len(close_days), 1) if close_days else None

        created_dates = [_parse_iso(row["created_at"]) for row in rows]
        created_dates = [d for d in created_dates if d is not None]

        return {
            "generated_at": utcnow(),
            "period_days": period_days,
            "months": months,
            "current": {
                "counts": counts,
                "open_pipeline": all_total - all_completed,
            },
            "comparison": {
                "current": current_period,
                "previous": previous_period,
                "delta": {
                    key: current_period[key] - previous_period[key]
                    for key in ("created", "activated", "completed")
                },
            },
            "monthly_flow": monthly_flow,
            "monthly_status": monthly_status,
            "by_location": by_location,
            "by_nature": by_nature,
            "quality": {
                "fit": fit,
                "not_fit": not_fit,
                "pending_fit": pending_fit,
                "completion_rate": completion_rate,
                "avg_days_to_close": avg_days,
            },
            "history": {
                "all_time_created": all_total,
                "all_time_completed": all_completed,
                "oldest_permit": min(created_dates).isoformat() if created_dates else None,
                "newest_permit": max(created_dates).isoformat() if created_dates else None,
            },
        }
    finally:
        conn.close()


def backdate_permit_timestamps(
    permit_id: str,
    *,
    created_at: str | None = None,
    activated_at: str | None = None,
    submitted_at: str | None = None,
    audited_at: str | None = None,
    updated_at: str | None = None,
) -> None:
    """Demo helper: adjust permit timestamps for analytics seed data."""
    init_db()
    fields: dict[str, str] = {}
    if created_at is not None:
        fields["created_at"] = created_at
    if activated_at is not None:
        fields["activated_at"] = activated_at
    if submitted_at is not None:
        fields["submitted_at"] = submitted_at
    if audited_at is not None:
        fields["audited_at"] = audited_at
    if updated_at is not None:
        fields["updated_at"] = updated_at
    if not fields:
        return
    with _lock:
        conn = _connect()
        try:
            assignments = ", ".join(f"{name} = ?" for name in fields)
            conn.execute(
                f"UPDATE permits SET {assignments} WHERE id = ?",
                (*fields.values(), permit_id),
            )
            conn.commit()
        finally:
            conn.close()


def get_permit(permit_id: str, include_trail: bool = True) -> dict[str, Any] | None:
    init_db()
    conn = _connect()
    try:
        row = conn.execute("SELECT * FROM permits WHERE id = ?", (permit_id,)).fetchone()
        if not row:
            return None
        signatures, evidence, events = _fetch_child_rows(conn, permit_id, include_trail=include_trail)
        return _row_to_permit(row, signatures=signatures, evidence=evidence, events=events)
    finally:
        conn.close()


def get_permit_by_token(token: str, include_trail: bool = False) -> dict[str, Any] | None:
    init_db()
    conn = _connect()
    try:
        row = conn.execute("SELECT * FROM permits WHERE access_token = ?", (token,)).fetchone()
        if not row:
            return None
        signatures, evidence, events = _fetch_child_rows(conn, row["id"], include_trail=include_trail)
        return _row_to_permit(row, signatures=signatures, evidence=evidence, events=events)
    finally:
        conn.close()


def activate_permit(permit_id: str, actor: str, token: str) -> dict[str, Any]:
    init_db()
    now = utcnow()
    with _lock:
        conn = _connect()
        try:
            row = conn.execute("SELECT * FROM permits WHERE id = ?", (permit_id,)).fetchone()
            if not row:
                raise KeyError("Permit not found.")
            if row["status"] not in ("draft", "active"):
                raise ValueError("Only draft or active permits can generate field access.")
            existing = row["access_token"] or token
            conn.execute(
                """
                UPDATE permits
                SET status = 'active', access_token = ?, activated_at = COALESCE(activated_at, ?),
                    updated_at = ?
                WHERE id = ?
                """,
                (existing, now, now, permit_id),
            )
            _append_event(conn, permit_id, "access.issued", actor, {"token_suffix": existing[-6:]})
            conn.commit()
        finally:
            conn.close()
    permit = get_permit(permit_id, include_trail=True)
    assert permit is not None
    return permit


def record_declaration(token: str, signer_name: str, image_png: str, user_agent: str, acknowledged: bool) -> dict[str, Any]:
    if not acknowledged:
        raise ValueError("Safety declaration must be acknowledged.")
    if not signer_name.strip():
        raise ValueError("Contractor name is required.")
    if not image_png.startswith("data:image/png;base64,"):
        raise ValueError("A PNG signature is required.")
    init_db()
    now = utcnow()
    with _lock:
        conn = _connect()
        try:
            row = conn.execute("SELECT * FROM permits WHERE access_token = ?", (token,)).fetchone()
            if not row:
                raise KeyError("Access token is invalid.")
            if row["status"] not in ("active", "pending_review"):
                raise ValueError("This permit is no longer open for field execution.")
            existing = conn.execute(
                "SELECT id FROM signatures WHERE permit_id = ? AND part = 'declaration'",
                (row["id"],),
            ).fetchone()
            if existing:
                raise ValueError("Safety declaration already signed.")
            conn.execute(
                """
                INSERT INTO signatures (id, permit_id, part, signer_name, signer_role, image_png, signed_at, user_agent)
                VALUES (?, ?, 'declaration', ?, 'contractor', ?, ?, ?)
                """,
                (str(uuid.uuid4()), row["id"], signer_name.strip(), image_png, now, user_agent),
            )
            conn.execute(
                "UPDATE permits SET contractor_name = ?, updated_at = ? WHERE id = ?",
                (signer_name.strip(), now, row["id"]),
            )
            _append_event(
                conn,
                row["id"],
                "declaration.signed",
                signer_name.strip(),
                {"signed_at": now, "immutable": True},
            )
            conn.commit()
            permit_id = row["id"]
        finally:
            conn.close()
    permit = get_permit(permit_id, include_trail=False)
    assert permit is not None
    return permit


def add_evidence(token: str, original_name: str, content_type: str, data: bytes) -> dict[str, Any]:
    if content_type not in ALLOWED_MIME:
        raise ValueError("Evidence must be JPG, PNG, or PDF.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise ValueError("Evidence files must be 10MB or smaller.")
    init_db()
    stored = f"{uuid.uuid4().hex}{ALLOWED_MIME[content_type]}"
    path = upload_dir() / stored
    path.write_bytes(data)
    now = utcnow()
    with _lock:
        conn = _connect()
        try:
            row = conn.execute("SELECT * FROM permits WHERE access_token = ?", (token,)).fetchone()
            if not row:
                path.unlink(missing_ok=True)
                raise KeyError("Access token is invalid.")
            if row["status"] != "active":
                path.unlink(missing_ok=True)
                raise ValueError("Evidence can only be attached while the permit is active.")
            evidence_id = str(uuid.uuid4())
            conn.execute(
                """
                INSERT INTO evidence (id, permit_id, original_name, stored_name, content_type, size_bytes, uploaded_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (evidence_id, row["id"], original_name, stored, content_type, len(data), now),
            )
            _append_event(
                conn,
                row["id"],
                "evidence.uploaded",
                row["contractor_name"] or "contractor",
                {"filename": original_name, "size_bytes": len(data), "content_type": content_type},
            )
            conn.execute("UPDATE permits SET updated_at = ? WHERE id = ?", (now, row["id"]))
            conn.commit()
            permit_id = row["id"]
        finally:
            conn.close()
    return {
        "id": evidence_id,
        "permit_id": permit_id,
        "original_name": original_name,
        "stored_name": stored,
        "content_type": content_type,
        "size_bytes": len(data),
        "uploaded_at": now,
    }


def record_handover(
    token: str,
    work_details: str,
    fit_for_purpose: bool,
    signer_name: str,
    image_png: str,
    user_agent: str,
    not_fit_reason: str = "",
) -> dict[str, Any]:
    if not work_details.strip():
        raise ValueError("Details of work carried out are required.")
    if not signer_name.strip():
        raise ValueError("Handover signature name is required.")
    if not image_png.startswith("data:image/png;base64,"):
        raise ValueError("A PNG signature is required.")
    init_db()
    now = utcnow()
    with _lock:
        conn = _connect()
        try:
            row = conn.execute("SELECT * FROM permits WHERE access_token = ?", (token,)).fetchone()
            if not row:
                raise KeyError("Access token is invalid.")
            if row["status"] != "active":
                raise ValueError("Handover can only be submitted on an active permit.")
            declared = conn.execute(
                "SELECT id FROM signatures WHERE permit_id = ? AND part = 'declaration'",
                (row["id"],),
            ).fetchone()
            if not declared:
                raise ValueError("Part 2 declaration must be signed before hand-back.")
            if not fit_for_purpose and not (not_fit_reason or "").strip():
                raise ValueError("If equipment is not fit for use, record the reason and action plan.")
            conn.execute(
                """
                INSERT INTO signatures (id, permit_id, part, signer_name, signer_role, image_png, signed_at, user_agent)
                VALUES (?, ?, 'handover', ?, 'contractor', ?, ?, ?)
                """,
                (str(uuid.uuid4()), row["id"], signer_name.strip(), image_png, now, user_agent),
            )
            conn.execute(
                """
                UPDATE permits
                SET work_details = ?, fit_for_purpose = ?, not_fit_reason = ?, contractor_name = ?,
                    status = 'pending_user', submitted_at = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    work_details.strip(),
                    1 if fit_for_purpose else 0,
                    None if fit_for_purpose else (not_fit_reason or "").strip(),
                    signer_name.strip(),
                    now,
                    now,
                    row["id"],
                ),
            )
            _append_event(
                conn,
                row["id"],
                "handover.submitted",
                signer_name.strip(),
                {
                    "fit_for_purpose": fit_for_purpose,
                    "signed_at": now,
                    "immutable": True,
                },
            )
            conn.commit()
            permit_id = row["id"]
        finally:
            conn.close()
    permit = get_permit(permit_id, include_trail=False)
    assert permit is not None
    return permit


def record_user_review(
    permit_id: str,
    actor: str,
    accepted_fit: bool,
    image_png: str,
    user_agent: str,
    not_fit_details: str = "",
) -> dict[str, Any]:
    if not image_png.startswith("data:image/png;base64,"):
        raise ValueError("A PNG signature is required.")
    if not accepted_fit and not not_fit_details.strip():
        raise ValueError("Record why the equipment is not accepted as fit for use.")
    init_db()
    now = utcnow()
    with _lock:
        conn = _connect()
        try:
            row = conn.execute("SELECT * FROM permits WHERE id = ?", (permit_id,)).fetchone()
            if not row:
                raise KeyError("Permit not found.")
            if row["status"] != "pending_user":
                raise ValueError("User review is only available after contractor hand-back.")
            conn.execute(
                """
                INSERT INTO signatures (id, permit_id, part, signer_name, signer_role, image_png, signed_at, user_agent)
                VALUES (?, ?, 'user_review', ?, 'user', ?, ?, ?)
                """,
                (str(uuid.uuid4()), permit_id, actor, image_png, now, user_agent),
            )
            conn.execute(
                """
                UPDATE permits
                SET user_fit = ?, user_not_fit_details = ?, status = 'pending_review', updated_at = ?
                WHERE id = ?
                """,
                (1 if accepted_fit else 0, None if accepted_fit else not_fit_details.strip(), now, permit_id),
            )
            _append_event(
                conn,
                permit_id,
                "user.reviewed",
                actor,
                {"accepted_fit": accepted_fit, "signed_at": now, "immutable": True},
            )
            conn.commit()
        finally:
            conn.close()
    permit = get_permit(permit_id, include_trail=True)
    assert permit is not None
    return permit


def audit_permit(permit_id: str, actor: str, image_png: str | None, user_agent: str) -> dict[str, Any]:
    init_db()
    now = utcnow()
    with _lock:
        conn = _connect()
        try:
            row = conn.execute("SELECT * FROM permits WHERE id = ?", (permit_id,)).fetchone()
            if not row:
                raise KeyError("Permit not found.")
            if row["status"] != "pending_review":
                raise ValueError("Only permits pending review can be moved to the audit vault.")
            if image_png:
                if not image_png.startswith("data:image/png;base64,"):
                    raise ValueError("A PNG signature is required.")
                conn.execute(
                    """
                    INSERT INTO signatures (id, permit_id, part, signer_name, signer_role, image_png, signed_at, user_agent)
                    VALUES (?, ?, 'audit', ?, 'authorized_person', ?, ?, ?)
                    """,
                    (str(uuid.uuid4()), permit_id, actor, image_png, now, user_agent),
                )
            conn.execute(
                """
                UPDATE permits
                SET status = 'completed', audited_at = ?, updated_at = ?
                WHERE id = ?
                """,
                (now, now, permit_id),
            )
            _append_event(
                conn,
                permit_id,
                "audit.locked",
                actor,
                {"signed_at": now, "immutable": True, "vault": True},
            )
            conn.commit()
        finally:
            conn.close()
    permit = get_permit(permit_id, include_trail=True)
    assert permit is not None
    return permit


def evidence_path(stored_name: str) -> Path:
    path = (upload_dir() / stored_name).resolve()
    if not str(path).startswith(str(upload_dir().resolve())):
        raise ValueError("Invalid evidence path.")
    return path
