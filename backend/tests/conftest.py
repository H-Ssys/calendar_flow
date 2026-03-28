"""Shared pytest fixtures for the backend test suite."""

import os
from datetime import datetime, timedelta, timezone
from typing import AsyncGenerator
from unittest.mock import patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from jose import jwt

# Set required env vars before importing the app
os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "test-service-key")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret-at-least-32-chars-long!")
os.environ.setdefault("SIYUAN_URL", "http://localhost:6806")
os.environ.setdefault("SIYUAN_TOKEN", "test-siyuan-token")

from app.main import app  # noqa: E402


JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"]
JWT_ALGORITHM = "HS256"
TEST_USER_ID = "test-user-00000000-0000-0000-0000-000000000001"


@pytest.fixture
def valid_token() -> str:
    """Generate a valid JWT for testing."""
    payload = {
        "sub": TEST_USER_ID,
        "aud": "authenticated",
        "role": "authenticated",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


@pytest.fixture
def expired_token() -> str:
    """Generate an expired JWT for testing."""
    payload = {
        "sub": TEST_USER_ID,
        "aud": "authenticated",
        "role": "authenticated",
        "iat": datetime.now(timezone.utc) - timedelta(hours=2),
        "exp": datetime.now(timezone.utc) - timedelta(hours=1),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


@pytest.fixture
def invalid_token() -> str:
    """Generate a malformed JWT (signed with wrong secret)."""
    payload = {
        "sub": TEST_USER_ID,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return jwt.encode(payload, "wrong-secret-key-that-is-long-enough!!", algorithm=JWT_ALGORITHM)


@pytest_asyncio.fixture
async def test_app() -> AsyncGenerator[AsyncClient, None]:
    """Provide an httpx AsyncClient wired to the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
