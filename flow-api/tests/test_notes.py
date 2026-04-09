"""Tests for the notes proxy endpoints."""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_note_requires_auth(test_app: AsyncClient) -> None:
    """POST /api/v1/notes/create without auth should return 401/403."""
    resp = await test_app.post(
        "/api/v1/notes/create",
        json={"title": "t", "content": "c", "notebookId": "nb"},
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_update_note_requires_auth(test_app: AsyncClient) -> None:
    """POST /api/v1/notes/update without auth should return 401/403."""
    resp = await test_app.post(
        "/api/v1/notes/update",
        json={"blockId": "b", "content": "c"},
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_search_notes_requires_auth(test_app: AsyncClient) -> None:
    """POST /api/v1/notes/search without auth should return 401/403."""
    resp = await test_app.post(
        "/api/v1/notes/search",
        json={"query": "test"},
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_get_note_requires_auth(test_app: AsyncClient) -> None:
    """GET /api/v1/notes/{id} without auth should return 401/403."""
    resp = await test_app.get("/api/v1/notes/some-block-id")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_export_note_requires_auth(test_app: AsyncClient) -> None:
    """POST /api/v1/notes/export/{id} without auth should return 401/403."""
    resp = await test_app.post("/api/v1/notes/export/some-block-id")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_search_notes_with_auth(test_app: AsyncClient, valid_token: str) -> None:
    """POST /api/v1/notes/search with valid auth should reach handler."""
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "code": 0,
        "data": {"blocks": [{"id": "block1", "content": "test"}]},
    }
    mock_response.raise_for_status = lambda: None

    with patch("app.api.v1.notes._siyuan_request", new_callable=AsyncMock) as mock_req:
        mock_req.return_value = {
            "code": 0,
            "data": {"blocks": [{"id": "block1", "content": "test"}]},
        }

        resp = await test_app.post(
            "/api/v1/notes/search",
            json={"query": "test"},
            headers={"Authorization": f"Bearer {valid_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "blocks" in data


@pytest.mark.asyncio
async def test_get_note_with_auth(test_app: AsyncClient, valid_token: str) -> None:
    """GET /api/v1/notes/{id} with valid auth should reach handler."""
    with patch("app.api.v1.notes._siyuan_request", new_callable=AsyncMock) as mock_req:
        mock_req.return_value = {
            "code": 0,
            "data": {"kramdown": "# Test"},
        }

        resp = await test_app.get(
            "/api/v1/notes/block123",
            headers={"Authorization": f"Bearer {valid_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "kramdown" in data


@pytest.mark.asyncio
async def test_export_note_with_auth(test_app: AsyncClient, valid_token: str) -> None:
    """POST /api/v1/notes/export/{id} with valid auth should reach handler."""
    with patch("app.api.v1.notes._siyuan_request", new_callable=AsyncMock) as mock_req:
        mock_req.return_value = {
            "code": 0,
            "data": {"content": "# Exported"},
        }

        resp = await test_app.post(
            "/api/v1/notes/export/block123",
            headers={"Authorization": f"Bearer {valid_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "content" in data
