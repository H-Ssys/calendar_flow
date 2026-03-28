"""Tests for JWT authentication across all endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_valid_token_passes(test_app: AsyncClient, valid_token: str) -> None:
    """A valid JWT should not return 401."""
    resp = await test_app.get("/health")
    assert resp.status_code == 200  # health doesn't need auth

    # Notes search requires auth -- with valid token it should reach the handler
    # (may fail with connection error to SiYuan, but NOT 401)
    resp = await test_app.post(
        "/api/v1/notes/search",
        json={"query": "test"},
        headers={"Authorization": f"Bearer {valid_token}"},
    )
    assert resp.status_code != 401


@pytest.mark.asyncio
async def test_expired_token_returns_401(test_app: AsyncClient, expired_token: str) -> None:
    """An expired JWT should return 401."""
    resp = await test_app.post(
        "/api/v1/notes/search",
        json={"query": "test"},
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_missing_auth_header_returns_401_or_403(test_app: AsyncClient) -> None:
    """Missing Authorization header should return 401 or 403."""
    resp = await test_app.post(
        "/api/v1/notes/search",
        json={"query": "test"},
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_malformed_token_returns_401(test_app: AsyncClient, invalid_token: str) -> None:
    """A JWT signed with the wrong secret should return 401."""
    resp = await test_app.post(
        "/api/v1/notes/search",
        json={"query": "test"},
        headers={"Authorization": f"Bearer {invalid_token}"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_garbage_token_returns_401(test_app: AsyncClient) -> None:
    """A completely invalid string as a token should return 401."""
    resp = await test_app.post(
        "/api/v1/notes/search",
        json={"query": "test"},
        headers={"Authorization": "Bearer not-a-real-jwt"},
    )
    assert resp.status_code == 401
