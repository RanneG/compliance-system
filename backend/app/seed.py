from __future__ import annotations

import secrets

from . import store


def seed_if_empty() -> None:
    store.init_db()
    if store.list_permits():
        return

    samples = [
        {
            "equipment_sn": "WD-12",
            "equipment_name": "Washer-disinfector 2",
            "location": "Darth Valley Hospital",
            "nature_of_work": "maintenance",
            "description": "Scheduled WD service and drip-leak check.",
            "decontaminated": True,
            "created_by": "Amelia Chen",
            "signature_png": _sig("AC"),
        },
        {
            "equipment_sn": "AER-04",
            "equipment_name": "Automated endoscope reprocessor",
            "location": "Darth Valley Hospital",
            "nature_of_work": "repair",
            "description": "Cycle fault. Isolate, decontaminate, and replace dosing pump.",
            "decontaminated": True,
            "created_by": "Amelia Chen",
            "signature_png": _sig("AC"),
        },
        {
            "equipment_sn": "ED-09",
            "equipment_name": "Drying cabinet",
            "location": "Queen Mary's Hospital",
            "nature_of_work": "service",
            "description": "Annual filter and airflow verification.",
            "decontaminated": True,
            "created_by": "Jonah Hale",
            "signature_png": _sig("JH"),
        },
        {
            "equipment_sn": "WD-01",
            "equipment_name": "Washer-disinfector 1",
            "location": "Queen Mary's Hospital",
            "nature_of_work": "maintenance",
            "description": "Quarterly service and independent monitoring check.",
            "decontaminated": True,
            "created_by": "Jonah Hale",
            "signature_png": _sig("JH"),
        },
    ]
    created = [store.create_permit(item) for item in samples]

    active = store.activate_permit(created[0]["id"], "Amelia Chen", secrets.token_urlsafe(24))
    store.record_declaration(
        active["access_token"],
        "R. Okonkwo / Olympus Field",
        _sig("RO"),
        "seed",
        True,
    )
    store.record_handover(
        active["access_token"],
        "Completed planned service. Independent monitoring within spec. Ready for clinical use.",
        True,
        "R. Okonkwo / Olympus Field",
        _sig("RO"),
        "seed",
    )

    store.activate_permit(created[1]["id"], "Amelia Chen", secrets.token_urlsafe(24))

    vault = store.activate_permit(created[3]["id"], "Jonah Hale", secrets.token_urlsafe(24))
    store.record_declaration(vault["access_token"], "Lina Park / Steris", _sig("LP"), "seed", True)
    store.record_handover(
        vault["access_token"],
        "Quarterly service complete. Returned to service.",
        True,
        "Lina Park / Steris",
        _sig("LP"),
        "seed",
    )
    store.record_user_review(created[3]["id"], "Jonah Hale", True, _sig("JH"), "seed")
    store.audit_permit(created[3]["id"], "Jonah Hale", _sig("JH"), "seed")


def _sig(initials: str) -> str:
    png = (
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )
    return f"data:image/png;base64,{png}"
