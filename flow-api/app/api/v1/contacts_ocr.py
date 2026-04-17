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
        "full_name":       {"type": "STRING"},
        "alt_name":        {"type": "STRING"},
        "title":           {"type": "STRING"},
        "alt_title":       {"type": "STRING"},
        "company":         {"type": "STRING"},
        "alt_company":     {"type": "STRING"},
        "industry":        {"type": "STRING"},
        "phone":           {"type": "STRING"},
        "other_phone":     {"type": "STRING"},
        "tel_phone":       {"type": "STRING"},
        "other_tel":       {"type": "STRING"},
        "fax":             {"type": "STRING"},
        "email":           {"type": "STRING"},
        "other_email":     {"type": "STRING"},
        "address":         {"type": "STRING"},
        "alt_address":     {"type": "STRING"},
        "website":         {"type": "STRING"},
        "notes":           {"type": "STRING"},
        "meeting_context": {"type": "STRING"},
        "language":        {"type": "STRING"},
        "raw_text":        {"type": "STRING"},
    },
    "required": ["raw_text"],
}

PROMPT = """You are a business card data extraction agent.
Extract ALL information from this business card image into strict JSON.

Fields to extract:
- full_name: Full name as printed on card
- alt_name: Alternative language or secondary name if present
- title: Job title or position
- alt_title: Alternative language job title
- company: Company or organization name
- alt_company: Alternative language company name
- industry: Infer from company name and title
- phone: Primary phone number (mobile preferred)
- other_phone: Second phone number if present
- tel_phone: Office TEL number if labeled TEL
- other_tel: Additional TEL if present
- fax: Fax number if present
- email: Primary email address
- other_email: Additional email addresses (semicolon separated)
- address: Full address including postal code and country
- alt_address: Alternative language address
- website: Website URL
- notes: Slogans, registration numbers (MST), or extra text
- meeting_context: Any event names or dates printed on card
- language: ISO 639-1 code of primary language on card
- raw_text: All text on the card exactly as printed

Rules:
- Return ONLY valid JSON, no markdown, no explanation
- Use null for fields not found
- phone fields: preserve the original format including country codes
- If multiple phones exist, fill phone first, then other_phone, tel_phone, other_tel, fax in order"""


def _encode_jpeg(image_bytes: bytes) -> str:
    img = Image.open(io.BytesIO(image_bytes))
    img.thumbnail((1500, 1500), Image.LANCZOS)
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


async def _call_gemini(image_bytes: bytes) -> dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY", "")
    model = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite-preview")
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

    MAX_ATTEMPTS = 3
    RETRYABLE_CODES = {429, 500, 502, 503, 504}
    data = None

    for attempt in range(MAX_ATTEMPTS):
        async with BATCH_SEMAPHORE:
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    resp = await client.post(url, json=payload)
                    resp.raise_for_status()
                    data = resp.json()
                    break  # success
            except (httpx.TimeoutException, asyncio.TimeoutError):
                print(f"GEMINI TIMEOUT (attempt {attempt + 1}/{MAX_ATTEMPTS})")
                if attempt < MAX_ATTEMPTS - 1:
                    await asyncio.sleep(2 * (attempt + 1))
                    continue
                return {"raw_text": None, "error": "timeout"}
            except httpx.HTTPError as e:
                status = getattr(e.response, "status_code", 0) if hasattr(e, "response") and e.response else 0
                retryable = status in RETRYABLE_CODES
                print(f"GEMINI HTTP {status} (attempt {attempt + 1}/{MAX_ATTEMPTS}, retryable={retryable})")
                if retryable and attempt < MAX_ATTEMPTS - 1:
                    await asyncio.sleep(2 * (attempt + 1))
                    continue
                error_detail = str(e)
                if hasattr(e, "response") and e.response is not None:
                    try:
                        error_detail = e.response.text[:500]
                    except Exception:
                        pass
                return {"raw_text": None, "error": f"http_error: {error_detail}"}

    if data is None:
        return {"raw_text": None, "error": "max_retries_exceeded"}

    print(f"GEMINI RAW RESPONSE: {json.dumps(data, indent=2)[:2000]}")

    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(text)
        # Map to frontend OcrResult field names while keeping extra fields
        parsed["name"] = parsed.pop("full_name", None)
        parsed["phone_alt"] = parsed.pop("other_phone", None)
        print(f"GEMINI PARSED: {parsed}")
        return parsed
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        print(f"GEMINI PARSE ERROR: {e} | raw: {data}")
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
