from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from . import store


def _days_ago(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).replace(microsecond=0).isoformat()


def seed_if_empty() -> None:
    store.init_db()
    if store.list_permits():
        return

    samples = [
        # Month 1 (Recent / Current)
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
            "equipment_sn": "AUT-01",
            "equipment_name": "Autoclave Sterilizer 1",
            "location": "Queen Mary's Hospital",
            "nature_of_work": "maintenance",
            "description": "Pressure chamber seal replacement and calibration.",
            "decontaminated": True,
            "created_by": "Jonah Hale",
            "signature_png": _sig("JH"),
        },
        # Month 2 (~30-60 days ago)
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
        {
            "equipment_sn": "AER-02",
            "equipment_name": "Endoscope Reprocessor 2",
            "location": "Darth Valley Hospital",
            "nature_of_work": "service",
            "description": "Peracetic acid sensor replacement.",
            "decontaminated": True,
            "created_by": "Amelia Chen",
            "signature_png": _sig("AC"),
        },
        {
            "equipment_sn": "RO-03",
            "equipment_name": "Reverse Osmosis Plant",
            "location": "Darth Valley Hospital",
            "nature_of_work": "repair",
            "description": "High pressure pump valve overhaul.",
            "decontaminated": True,
            "created_by": "Amelia Chen",
            "signature_png": _sig("AC"),
        },
        # Month 3 (~60-90 days ago)
        {
            "equipment_sn": "STEAM-01",
            "equipment_name": "Steam Generator B",
            "location": "Queen Mary's Hospital",
            "nature_of_work": "repair",
            "description": "Safety valve annual recertification and thermal check.",
            "decontaminated": True,
            "created_by": "Jonah Hale",
            "signature_png": _sig("JH"),
        },
        {
            "equipment_sn": "WD-03",
            "equipment_name": "Washer-disinfector 3",
            "location": "Darth Valley Hospital",
            "nature_of_work": "service",
            "description": "Routine chamber descaling and nozzle inspection.",
            "decontaminated": True,
            "created_by": "Amelia Chen",
            "signature_png": _sig("AC"),
        },
        # Month 4 (~90-120 days ago)
        {
            "equipment_sn": "COMP-02",
            "equipment_name": "Medical Air Compressor",
            "location": "Queen Mary's Hospital",
            "nature_of_work": "maintenance",
            "description": "Biometric filter element renewal and dewpoint verification.",
            "decontaminated": True,
            "created_by": "Jonah Hale",
            "signature_png": _sig("JH"),
        },
        {
            "equipment_sn": "ED-02",
            "equipment_name": "Scope Storage Cabinet",
            "location": "Darth Valley Hospital",
            "nature_of_work": "repair",
            "description": "HEPA fan unit fan speed controller fix.",
            "decontaminated": True,
            "created_by": "Amelia Chen",
            "signature_png": _sig("AC"),
        },
        # Month 5 (~120-150 days ago)
        {
            "equipment_sn": "VAC-01",
            "equipment_name": "Central Vacuum System",
            "location": "Darth Valley Hospital",
            "nature_of_work": "service",
            "description": "Oil separator replacement and bacterial filter check.",
            "decontaminated": True,
            "created_by": "Amelia Chen",
            "signature_png": _sig("AC"),
        },
    ]

    created = [store.create_permit(item) for item in samples]

    # Permit 0: Active / Handover submitted
    active0 = store.activate_permit(created[0]["id"], "Amelia Chen", secrets.token_urlsafe(24))
    store.record_declaration(active0["access_token"], "R. Okonkwo / Olympus Field", _sig("RO"), "seed", True)
    store.record_handover(active0["access_token"], "Completed planned service. Ready for clinical use.", True, "R. Okonkwo / Olympus Field", _sig("RO"), "seed")

    # Permit 1: Active
    store.activate_permit(created[1]["id"], "Amelia Chen", secrets.token_urlsafe(24))

    # Permit 2: Draft
    # Keep draft

    # Permit 3: Active with declaration signed
    active3 = store.activate_permit(created[3]["id"], "Jonah Hale", secrets.token_urlsafe(24))
    store.record_declaration(active3["access_token"], "K. Vance / Getinge", _sig("KV"), "seed", True)

    # Permit 4: Completed
    p4 = store.activate_permit(created[4]["id"], "Jonah Hale", secrets.token_urlsafe(24))
    store.record_declaration(p4["access_token"], "Lina Park / Steris", _sig("LP"), "seed", True)
    store.record_handover(p4["access_token"], "Quarterly service complete. Returned to service.", True, "Lina Park / Steris", _sig("LP"), "seed")
    store.record_user_review(created[4]["id"], "Jonah Hale", True, _sig("JH"), "seed")
    store.audit_permit(created[4]["id"], "Jonah Hale", _sig("JH"), "seed")

    # Permit 5: Completed
    p5 = store.activate_permit(created[5]["id"], "Amelia Chen", secrets.token_urlsafe(24))
    store.record_declaration(p5["access_token"], "T. Miller / Cantel", _sig("TM"), "seed", True)
    store.record_handover(p5["access_token"], "Sensor calibrated and replaced.", True, "T. Miller / Cantel", _sig("TM"), "seed")
    store.record_user_review(created[5]["id"], "Amelia Chen", True, _sig("AC"), "seed")
    store.audit_permit(created[5]["id"], "Amelia Chen", _sig("AC"), "seed")

    # Permit 6: Active / Handover submitted
    p6 = store.activate_permit(created[6]["id"], "Amelia Chen", secrets.token_urlsafe(24))
    store.record_declaration(p6["access_token"], "S. Gupta / PureWater", _sig("SG"), "seed", True)
    store.record_handover(p6["access_token"], "Valve overhaul completed.", True, "S. Gupta / PureWater", _sig("SG"), "seed")

    # Permit 7: Completed
    p7 = store.activate_permit(created[7]["id"], "Jonah Hale", secrets.token_urlsafe(24))
    store.record_declaration(p7["access_token"], "M. Rossi / Spirax Sarco", _sig("MR"), "seed", True)
    store.record_handover(p7["access_token"], "Safety valve recertified.", True, "M. Rossi / Spirax Sarco", _sig("MR"), "seed")
    store.record_user_review(created[7]["id"], "Jonah Hale", True, _sig("JH"), "seed")
    store.audit_permit(created[7]["id"], "Jonah Hale", _sig("JH"), "seed")

    # Permit 8: Completed
    p8 = store.activate_permit(created[8]["id"], "Amelia Chen", secrets.token_urlsafe(24))
    store.record_declaration(p8["access_token"], "R. Okonkwo / Olympus Field", _sig("RO"), "seed", True)
    store.record_handover(p8["access_token"], "Chamber descaled.", True, "R. Okonkwo / Olympus Field", _sig("RO"), "seed")
    store.record_user_review(created[8]["id"], "Amelia Chen", True, _sig("AC"), "seed")
    store.audit_permit(created[8]["id"], "Amelia Chen", _sig("AC"), "seed")

    # Permit 9: Completed
    p9 = store.activate_permit(created[9]["id"], "Jonah Hale", secrets.token_urlsafe(24))
    store.record_declaration(p9["access_token"], "E. Davis / Atlas Copco", _sig("ED"), "seed", True)
    store.record_handover(p9["access_token"], "Filters renewed.", True, "E. Davis / Atlas Copco", _sig("ED"), "seed")
    store.record_user_review(created[9]["id"], "Jonah Hale", True, _sig("JH"), "seed")
    store.audit_permit(created[9]["id"], "Jonah Hale", _sig("JH"), "seed")

    # Permit 10: Completed
    p10 = store.activate_permit(created[10]["id"], "Amelia Chen", secrets.token_urlsafe(24))
    store.record_declaration(p10["access_token"], "T. Miller / Cantel", _sig("TM"), "seed", True)
    store.record_handover(p10["access_token"], "Controller fixed.", True, "T. Miller / Cantel", _sig("TM"), "seed")
    store.record_user_review(created[10]["id"], "Amelia Chen", True, _sig("AC"), "seed")
    store.audit_permit(created[10]["id"], "Amelia Chen", _sig("AC"), "seed")

    # Permit 11: Completed
    p11 = store.activate_permit(created[11]["id"], "Amelia Chen", secrets.token_urlsafe(24))
    store.record_declaration(p11["access_token"], "H. Smith / Busch Vacuum", _sig("HS"), "seed", True)
    store.record_handover(p11["access_token"], "Oil separator replaced.", True, "H. Smith / Busch Vacuum", _sig("HS"), "seed")
    store.record_user_review(created[11]["id"], "Amelia Chen", True, _sig("AC"), "seed")
    store.audit_permit(created[11]["id"], "Amelia Chen", _sig("AC"), "seed")

    # Backdate timestamps across the 6-month historical horizon
    store.backdate_permit_timestamps(created[0]["id"], created_at=_days_ago(12), activated_at=_days_ago(10), submitted_at=_days_ago(5), updated_at=_days_ago(5))
    store.backdate_permit_timestamps(created[1]["id"], created_at=_days_ago(8), activated_at=_days_ago(6), updated_at=_days_ago(6))
    store.backdate_permit_timestamps(created[2]["id"], created_at=_days_ago(3), updated_at=_days_ago(3))
    store.backdate_permit_timestamps(created[3]["id"], created_at=_days_ago(18), activated_at=_days_ago(15), updated_at=_days_ago(15))

    store.backdate_permit_timestamps(created[4]["id"], created_at=_days_ago(45), activated_at=_days_ago(42), submitted_at=_days_ago(38), audited_at=_days_ago(35), updated_at=_days_ago(35))
    store.backdate_permit_timestamps(created[5]["id"], created_at=_days_ago(52), activated_at=_days_ago(48), submitted_at=_days_ago(44), audited_at=_days_ago(40), updated_at=_days_ago(40))
    store.backdate_permit_timestamps(created[6]["id"], created_at=_days_ago(38), activated_at=_days_ago(35), submitted_at=_days_ago(32), updated_at=_days_ago(32))

    store.backdate_permit_timestamps(created[7]["id"], created_at=_days_ago(78), activated_at=_days_ago(74), submitted_at=_days_ago(70), audited_at=_days_ago(66), updated_at=_days_ago(66))
    store.backdate_permit_timestamps(created[8]["id"], created_at=_days_ago(85), activated_at=_days_ago(82), submitted_at=_days_ago(79), audited_at=_days_ago(75), updated_at=_days_ago(75))

    store.backdate_permit_timestamps(created[9]["id"], created_at=_days_ago(112), activated_at=_days_ago(108), submitted_at=_days_ago(104), audited_at=_days_ago(98), updated_at=_days_ago(98))
    store.backdate_permit_timestamps(created[10]["id"], created_at=_days_ago(118), activated_at=_days_ago(115), submitted_at=_days_ago(110), audited_at=_days_ago(105), updated_at=_days_ago(105))

    store.backdate_permit_timestamps(created[11]["id"], created_at=_days_ago(145), activated_at=_days_ago(140), submitted_at=_days_ago(136), audited_at=_days_ago(130), updated_at=_days_ago(130))


def _sig(initials: str) -> str:
    png = (
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )
    return f"data:image/png;base64,{png}"
