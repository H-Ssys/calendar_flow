import logging
from typing import Any

import jwt
from fastapi import Header, HTTPException

from app.core.config import settings

logger = logging.getLogger(__name__)


async def verify_token(authorization: str = Header(...)) -> Any:
    """Verify Supabase JWT locally using the shared JWT secret."""
    token = authorization.replace("Bearer ", "")

    if not settings.jwt_secret:
        raise HTTPException(
            status_code=500, detail="JWT_SECRET not configured on server"
        )

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        logger.error(f"JWT verification failed: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
