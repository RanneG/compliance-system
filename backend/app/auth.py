from __future__ import annotations

import secrets

from fastapi import HTTPException, Request

SESSIONS: dict[str, str] = {}
ADMIN_USER = "admin"
ADMIN_PASSWORD = "admin"


def login(username: str, password: str) -> dict[str, str]:
    if username.strip().lower() != ADMIN_USER or password != ADMIN_PASSWORD:
        raise HTTPException(401, "Invalid username or password.")
    token = secrets.token_urlsafe(24)
    SESSIONS[token] = "Admin"
    return {"token": token, "name": "Admin"}


def logout(token: str) -> None:
    SESSIONS.pop(token, None)


def token_from_request(request: Request) -> str:
    header = request.headers.get("authorization") or ""
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return (request.query_params.get("access") or "").strip()


def require_admin(request: Request) -> str:
    user = SESSIONS.get(token_from_request(request))
    if not user:
        raise HTTPException(401, "Sign in required.")
    return user
