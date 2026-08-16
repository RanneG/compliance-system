from app import store
from app.seed import _sig


def test_full_permit_lifecycle():
    permit = store.create_permit(
        {
            "equipment_sn": "SN-TEST-01",
            "equipment_name": "Washer-disinfector",
            "location": "Darth Valley Hospital",
            "nature_of_work": "repair",
            "description": "Decontaminate and replace packing.",
            "decontaminated": True,
            "created_by": "User One",
            "signature_png": _sig("U1"),
        }
    )
    assert permit["status"] == "draft"
    assert permit["id"].startswith("DVH")
    assert permit["location"] == "Darth Valley Hospital"

    activated = store.activate_permit(permit["id"], "User One", "token-lifecycle-demo")
    assert activated["status"] == "active"

    store.record_declaration(
        "token-lifecycle-demo",
        "Field Contractor",
        _sig("FC"),
        "pytest",
        True,
    )
    handed = store.record_handover(
        "token-lifecycle-demo",
        "Work completed. Equipment returned to service.",
        True,
        "Field Contractor",
        _sig("FC"),
        "pytest",
    )
    assert handed["status"] == "pending_user"
    assert handed["fit_for_purpose"] is True

    reviewed = store.record_user_review(permit["id"], "User One", True, _sig("U1"), "pytest")
    assert reviewed["status"] == "pending_review"

    audited = store.audit_permit(permit["id"], "AP(D)", _sig("AP"), "pytest")
    assert audited["status"] == "completed"
    events = [item["event_type"] for item in audited["audit_trail"]]
    assert events == [
        "permit.created",
        "access.issued",
        "declaration.signed",
        "handover.submitted",
        "user.reviewed",
        "audit.locked",
    ]


def test_handover_requires_declaration_and_not_fit_reason():
    permit = store.create_permit(
        {
            "equipment_sn": "SN-TEST-02",
            "location": "Queen Mary's Hospital",
            "nature_of_work": "service",
            "created_by": "User One",
        }
    )
    assert permit["id"].startswith("QMH")
    store.activate_permit(permit["id"], "User One", "token-blocked")
    try:
        store.record_handover(
            "token-blocked",
            "done",
            True,
            "Contractor",
            _sig("C"),
            "pytest",
        )
        assert False, "expected declaration gate"
    except ValueError as exc:
        assert "declaration" in str(exc).lower() or "part 2" in str(exc).lower()
