from fastapi.testclient import TestClient

from app import auth
from app.main import app


def test_health_and_root():
    client = TestClient(app)
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"
    root = client.get("/")
    assert root.status_code == 200


def test_login_admin_and_protect_dashboard():
    auth.SESSIONS.clear()
    client = TestClient(app)
    denied = client.get("/api/dashboard")
    assert denied.status_code == 401

    bad = client.post("/api/auth/login", json={"username": "admin", "password": "nope"})
    assert bad.status_code == 401

    ok = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert ok.status_code == 200
    token = ok.json()["token"]
    allowed = client.get("/api/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert allowed.status_code == 200
    assert "counts" in allowed.json()
