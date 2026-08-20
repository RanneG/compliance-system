from app import auth
from app.main import app
from app import store
from fastapi.testclient import TestClient


def test_analytics_requires_auth():
    auth.SESSIONS.clear()
    client = TestClient(app)
    assert client.get("/api/analytics").status_code == 401


def test_analytics_report_shape():
    auth.SESSIONS.clear()
    client = TestClient(app)
    token = client.post("/api/auth/login", json={"username": "john ferrer", "password": "admin"}).json()["token"]
    report = client.get("/api/analytics", headers={"Authorization": f"Bearer {token}"}).json()
    assert "monthly_flow" in report
    assert len(report["monthly_flow"]) == 6
    assert "comparison" in report
    assert "by_location" in report
    assert report["quality"]["completion_rate"] >= 0


def test_analytics_monthly_flow_counts():
    store.init_db()
    report = store.analytics_report(months=3)
    assert sum(row["opened"] for row in report["monthly_flow"]) >= 0
    assert "cumulative_closed" in report["monthly_flow"][-1]
