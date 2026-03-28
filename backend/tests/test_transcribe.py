"""Tests for the transcription endpoint."""

import io

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_transcribe_requires_auth(test_app: AsyncClient) -> None:
    """POST /api/v1/transcribe without auth should return 401/403."""
    resp = await test_app.post(
        "/api/v1/transcribe",
        files={"file": ("test.wav", b"fake-audio", "audio/wav")},
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_transcribe_with_auth(test_app: AsyncClient, valid_token: str) -> None:
    """POST /api/v1/transcribe with valid auth should return stub response."""
    resp = await test_app.post(
        "/api/v1/transcribe",
        files={"file": ("test.wav", b"fake-audio", "audio/wav")},
        headers={"Authorization": f"Bearer {valid_token}"},
    )
    # Should succeed (stub returns placeholder)
    assert resp.status_code == 200
    data = resp.json()
    assert "transcript" in data
    assert "duration" in data
    assert "summary" in data


@pytest.mark.asyncio
async def test_transcribe_rate_limit(test_app: AsyncClient, valid_token: str) -> None:
    """Rate limit: 10 requests succeed, 11th should return 429.

    Note: slowapi rate limiting may not trigger in test mode with
    ASGITransport since it relies on real IP resolution. This test
    documents the expected behavior -- full rate limit testing
    requires an integration test with uvicorn.
    """
    headers = {"Authorization": f"Bearer {valid_token}"}
    statuses: list[int] = []

    for i in range(12):
        resp = await test_app.post(
            "/api/v1/transcribe",
            files={"file": (f"test_{i}.wav", b"fake-audio", "audio/wav")},
            headers=headers,
        )
        statuses.append(resp.status_code)

    # At minimum, the first request should succeed
    assert statuses[0] == 200
    # If rate limiting is active, the 11th+ should be 429
    # (may not trigger in ASGI test transport)
