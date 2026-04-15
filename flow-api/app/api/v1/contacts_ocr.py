import asyncio
import base64
import io
import json
import os
import time
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from PIL import Image

from app.core.security import verify_token

MAX_BATCH_CARDS = 50

router = APIRouter()

BATCH_SEMAPHORE = asyncio.Semaphore(5)

CARD_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "name": {"type": "STRING"},
        "title": {"type": "STRING"},
        "company": {"type": "STRING"},
        "email": {"type": "STRING"},
        "phone": {"type": "STRING"},
        "phone_alt": {"type": "STRING"},
        "address": {"type": "STRING"},
        "website": {"type": "STRING"},
        "language": {"type": "STRING"},
        "raw_text": {"type": "STRING"},
    },
    "required": ["raw_text"],
}

PROMPT = """Extract business card fields into strict JSON.

Fields (all optional except raw_text):
- name: full name as printed
- title: job title
- company: organization
- email: primary email
- phone: primary phone
- phone_alt: secondary phone (mobile/tel/fax)
- address: postal address
- website: URL
- language: ISO 639-1 code of dominant text (en, zh, ja, ...)
- raw_text: verbatim text on card, newline-separated

Respond with JSON only."""


def _encode_jpeg(image_bytes: bytes) -> str:
    img = Image.open(io.BytesIO(image_bytes))
    img.thumbnail((1500, 1500), Image.LANCZOS)
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


async def _call_gemini(image_bytes: bytes) -> dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY", "")
    model = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    b64 = _encode_jpeg(image_bytes)
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}"
        f":generateContent?key={api_key}"
    )
    payload = {
        "contents": [
            {
                "parts": [
                    {"inline_data": {"mime_type": "image/jpeg", "data": b64}},
                    {"text": PROMPT},
                ]
            }
        ],
        "generationConfig": {
            "response_mime_type": "application/json",
            "response_schema": CARD_SCHEMA,
        },
    }

    async with BATCH_SEMAPHORE:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()
        except (httpx.TimeoutException, asyncio.TimeoutError):
            return {"raw_text": None, "error": "timeout"}
        except httpx.HTTPError as e:
            return {"raw_text": None, "error": f"http_error: {e}"}

    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        return {"raw_text": None, "error": f"parse_error: {e}"}


@router.post("/contacts/ocr")
async def extract_card(
    front_image: UploadFile = File(...),
    back_image: Optional[UploadFile] = File(None),
    user_id: str = Form(...),
    _user=Depends(verify_token),
):
    started = time.perf_counter()
    front_bytes = await front_image.read()

    if back_image is not None:
        back_bytes = await back_image.read()
        front_res, back_res = await asyncio.gather(
            _call_gemini(front_bytes),
            _call_gemini(back_bytes),
        )
    else:
        front_res = await _call_gemini(front_bytes)
        back_res = None

    processing_ms = int((time.perf_counter() - started) * 1000)
    return {"front": front_res, "back": back_res, "processing_ms": processing_ms}


# ─── BATCH OCR (synchronous fallback — no Celery/Redis in this project) ──────
#
# Cards are processed inline using BATCH_SEMAPHORE for concurrency control.
# asyncio.gather across all cards; the semaphore (5) caps in-flight Gemini
# calls. No job_id persistence → /status always returns 404.


@router.post("/contacts/ocr/batch")
async def extract_batch(
    card_images: list[UploadFile] = File(...),
    user_id: str = Form(...),
    _user=Depends(verify_token),
):
    if not card_images:
        raise HTTPException(status_code=400, detail="card_images is empty")
    if len(card_images) > MAX_BATCH_CARDS:
        raise HTTPException(
            status_code=400,
            detail=f"Batch size {len(card_images)} exceeds max {MAX_BATCH_CARDS}",
        )

    started = time.perf_counter()
    card_bytes = [await c.read() for c in card_images]
    results = await asyncio.gather(*(_call_gemini(b) for b in card_bytes))
    processing_ms = int((time.perf_counter() - started) * 1000)

    return {
        "status": "done",
        "progress": {"done": len(results), "total": len(results)},
        "results": results,
        "processing_ms": processing_ms,
    }


@router.get("/contacts/ocr/status/{job_id}")
async def batch_status(job_id: str, _user=Depends(verify_token)):
    raise HTTPException(status_code=404, detail="Job not found")
