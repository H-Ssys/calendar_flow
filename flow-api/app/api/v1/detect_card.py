import json

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.security import verify_token
from app.services.ai_providers import run_ocr

router = APIRouter()


@router.post("/detect-card")
async def detect_card_bounds(
    image: UploadFile = File(...),
    user=Depends(verify_token),
):
    """
    Detect the bounding box of a business card in an image.
    Returns {x, y, width, height} as percentages (0-100).
    Used as AI fallback when client-side canvas detection fails.
    """
    image_bytes = await image.read()

    prompt = """Analyze this image and find the business card in it.
Return ONLY a JSON object with the bounding box of the card as percentages of the image dimensions:
{"x": <left edge %>, "y": <top edge %>, "width": <card width %>, "height": <card height %>}

Rules:
- All values are percentages from 0 to 100
- x,y is the top-left corner of the card
- If the card fills the entire image, return {"x": 0, "y": 0, "width": 100, "height": 100}
- If no card is found, return {"x": 0, "y": 0, "width": 100, "height": 100}
- Output ONLY raw JSON. No markdown, no code blocks."""

    try:
        raw_text = await run_ocr(image_bytes, prompt)

        # Parse JSON from response
        first = raw_text.find("{")
        last = raw_text.rfind("}")
        if first == -1 or last == -1:
            return {"x": 0, "y": 0, "width": 100, "height": 100, "confidence": 0}

        data = json.loads(raw_text[first : last + 1])
        return {
            "x": float(data.get("x", 0)),
            "y": float(data.get("y", 0)),
            "width": float(data.get("width", 100)),
            "height": float(data.get("height", 100)),
            "confidence": 0.85,
        }
    except Exception as e:
        return {"x": 0, "y": 0, "width": 100, "height": 100, "confidence": 0}
