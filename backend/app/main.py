from __future__ import annotations

import io
import os
import secrets
from typing import Any

import qrcode
from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from pathlib import Path
from pydantic import BaseModel, Field

from . import auth, seed, store

FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"

app = FastAPI(title="Industrial Compliance System", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginBody(BaseModel):
    username: str
    password: str


class PermitCreate(BaseModel):
    equipment_sn: str = Field(min_length=2, max_length=80)
    equipment_name: str = ""
    location: str
    nature_of_work: str
    description: str = ""
    decontaminated: bool = False
    signature_png: str | None = None
    created_by: str = "User"


class ActivateBody(BaseModel):
    actor: str = "Authorized Person"
    public_base: str = "http://127.0.0.1:5173"


class DeclarationBody(BaseModel):
    signer_name: str
    signature_png: str
    acknowledged: bool


class HandoverBody(BaseModel):
    work_details: str
    fit_for_purpose: bool
    signer_name: str
    signature_png: str
    not_fit_reason: str = ""


class UserReviewBody(BaseModel):
    actor: str = "User"
    accepted_fit: bool
    signature_png: str
    not_fit_details: str = ""


class AuditBody(BaseModel):
    actor: str = "Authorized Person"
    signature_png: str | None = None


@app.on_event("startup")
def on_startup() -> None:
    store.init_db()
    if os.environ.get("PTW_SEED", "1") != "0":
        seed.seed_if_empty()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "product": "Industrial Compliance System"}


@app.post("/api/auth/login")
def login(body: LoginBody) -> dict[str, str]:
    return auth.login(body.username, body.password)


@app.post("/api/auth/logout")
def logout(request: Request) -> dict[str, str]:
    auth.logout(auth.token_from_request(request))
    return {"status": "ok"}


@app.get("/api/dashboard")
def dashboard(_user: str = Depends(auth.require_admin)) -> dict[str, Any]:
    return {"counts": store.dashboard_stats(), "permits": store.list_permits()}


@app.get("/api/analytics")
def analytics(
    months: int = 6,
    period_days: int = 30,
    _user: str = Depends(auth.require_admin),
) -> dict[str, Any]:
    return store.analytics_report(months=months, period_days=period_days)


@app.get("/api/permits")
def list_permits(
    status: str | None = None,
    q: str | None = Query(default=None),
    vault: bool = False,
    _user: str = Depends(auth.require_admin),
) -> list[dict[str, Any]]:
    try:
        return store.list_permits(status=status, q=q, vault_only=vault)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/api/permits", status_code=201)
def create_permit(body: PermitCreate, _user: str = Depends(auth.require_admin)) -> dict[str, Any]:
    try:
        return store.create_permit(body.model_dump())
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/permits/{permit_id}")
def get_permit(permit_id: str, _user: str = Depends(auth.require_admin)) -> dict[str, Any]:
    permit = store.get_permit(permit_id, include_trail=True)
    if not permit:
        raise HTTPException(404, "Permit not found.")
    return permit


@app.post("/api/permits/{permit_id}/activate")
def activate(permit_id: str, body: ActivateBody, _user: str = Depends(auth.require_admin)) -> dict[str, Any]:
    existing = store.get_permit(permit_id)
    if not existing:
        raise HTTPException(404, "Permit not found.")
    token = existing.get("access_token") or secrets.token_urlsafe(24)
    try:
        permit = store.activate_permit(permit_id, body.actor, token)
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
    permit["access_url"] = f"{body.public_base.rstrip('/')}/p/{permit['access_token']}"
    return permit


@app.get("/api/permits/{permit_id}/qr.png")
def permit_qr(
    permit_id: str,
    public_base: str = "http://127.0.0.1:5173",
    _user: str = Depends(auth.require_admin),
) -> Response:
    permit = store.get_permit(permit_id, include_trail=False)
    if not permit or not permit.get("access_token"):
        raise HTTPException(404, "No field access has been issued for this permit.")
    url = f"{public_base.rstrip('/')}/p/{permit['access_token']}"
    qr = qrcode.QRCode(box_size=8, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    image = qr.make_image(fill_color="#0c0e12", back_color="#f4efe6")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return Response(content=buffer.getvalue(), media_type="image/png")


@app.post("/api/permits/{permit_id}/user-review")
def user_review(permit_id: str, body: UserReviewBody, request: Request, _user: str = Depends(auth.require_admin)) -> dict[str, Any]:
    try:
        return store.record_user_review(
            permit_id,
            body.actor,
            body.accepted_fit,
            body.signature_png,
            request.headers.get("user-agent", ""),
            body.not_fit_details,
        )
    except KeyError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc


@app.post("/api/permits/{permit_id}/audit")
def audit(permit_id: str, body: AuditBody, request: Request, _user: str = Depends(auth.require_admin)) -> dict[str, Any]:
    try:
        return store.audit_permit(
            permit_id,
            body.actor,
            body.signature_png,
            request.headers.get("user-agent", ""),
        )
    except KeyError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc


@app.get("/api/access/{token}")
def contractor_access(token: str) -> dict[str, Any]:
    permit = store.get_permit_by_token(token, include_trail=False)
    if not permit:
        raise HTTPException(404, "This access link is invalid or has expired.")
    public = {k: v for k, v in permit.items() if k != "access_token"}
    public["token"] = token
    return public


@app.post("/api/access/{token}/declaration")
def declaration(token: str, body: DeclarationBody, request: Request) -> dict[str, Any]:
    try:
        return store.record_declaration(
            token,
            body.signer_name,
            body.signature_png,
            request.headers.get("user-agent", ""),
            body.acknowledged,
        )
    except KeyError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/api/access/{token}/evidence")
async def evidence(token: str, file: UploadFile = File(...)) -> dict[str, Any]:
    data = await file.read()
    name = file.filename or "evidence.bin"
    mime = file.content_type or ""
    if mime not in store.ALLOWED_MIME:
        lower = name.lower()
        if lower.endswith(".png"):
            mime = "image/png"
        elif lower.endswith(".jpg") or lower.endswith(".jpeg"):
            mime = "image/jpeg"
        elif lower.endswith(".pdf"):
            mime = "application/pdf"
    try:
        return store.add_evidence(token, file.filename or "evidence.bin", mime, data)
    except KeyError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/api/access/{token}/handover")
def handover(token: str, body: HandoverBody, request: Request) -> dict[str, Any]:
    try:
        return store.record_handover(
            token,
            body.work_details,
            body.fit_for_purpose,
            body.signer_name,
            body.signature_png,
            request.headers.get("user-agent", ""),
            body.not_fit_reason,
        )
    except KeyError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/evidence/{stored_name}")
def download_evidence(stored_name: str, _user: str = Depends(auth.require_admin)) -> FileResponse:
    path = store.evidence_path(stored_name)
    if not path.exists():
        raise HTTPException(404, "Evidence file not found.")
    return FileResponse(path)


def _spa_index() -> FileResponse | dict[str, str]:
    index = FRONTEND_DIST / "index.html"
    if index.exists():
        return FileResponse(index)
    return {"status": "ok", "product": "Industrial Compliance System"}


@app.get("/", response_model=None)
def root():
    return _spa_index()


@app.get("/{full_path:path}", response_model=None)
def spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(404, "Not Found")
    candidate = (FRONTEND_DIST / full_path).resolve()
    if str(candidate).startswith(str(FRONTEND_DIST.resolve())) and candidate.is_file():
        return FileResponse(candidate)
    return _spa_index()
