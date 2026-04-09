import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.core.config import settings
from app.core.security import verify_token
from app.core.supabase_admin import supabase_admin
from app.services.ai_providers import run_ocr

router = APIRouter()


async def get_user_corrections(user_id: str) -> str:
    """Fetch last 5 OCR corrections for self-learning prompt."""
    try:
        result = (
            supabase_admin.from_("ai_correction_memory")
            .select("feedback_summary")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        )
        if result.data:
            corrections = [r["feedback_summary"] for r in result.data]
            return "- " + "\n- ".join(corrections)
    except Exception:
        pass
    return "No prior corrections found."


@router.post("/ocr")
async def extract_business_card(
    image: UploadFile = File(...),
    user_id: str = Form(default=""),
    user=Depends(verify_token),
):
    """
    Extract contact fields from business card image.
    Provider: controlled by OCR_PROVIDER env var (deepseek/gemini/openai).
    """
    # user can be dict (JWT payload) or object (Supabase user)
    uid = user_id or str(getattr(user, 'id', None) or user.get('sub', ''))
    image_bytes = await image.read()
    corrections = await get_user_corrections(uid)

    prompt = f"""Role: Data Extraction Agent.
Task: Extract business card data into strict JSON.

WARNING - AVOID THESE PAST MISTAKES:
{corrections}

Extract these fields:
- full_name (full name as printed)
- title (job title)
- department
- company
- industry (infer from company/title if not shown)
- phone (array: [main, other, tel, other_tel, fax])
- email (array: [main, other])
- address
- website
- social_profiles (object: facebook, instagram, linkedin, twitter URLs if found)
- notes (slogans, taglines, extra info)
- meeting_context (event names, dates, where you met)
- reference (who introduced you or context)

Output: ONLY raw JSON. No Markdown. No code blocks."""

    # Run OCR with configured provider
    try:
        raw_text = await run_ocr(image_bytes, prompt)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"OCR provider error ({settings.ocr_provider}): {str(e)}",
        )

    # Parse JSON
    first = raw_text.find("{")
    last = raw_text.rfind("}")
    if first == -1 or last == -1:
        raise HTTPException(
            status_code=422,
            detail=f"No JSON found in response: {raw_text[:200]}",
        )

    try:
        contact_data = json.loads(raw_text[first : last + 1])
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=422, detail=f"JSON parse error: {str(e)}"
        )

    # Normalize array fields
    phone = contact_data.get("phone", [])
    email = contact_data.get("email", [])
    if isinstance(phone, str):
        phone = [phone]
    if isinstance(email, str):
        email = [email]

    return {
        "name": contact_data.get("full_name", ""),
        "full_name": contact_data.get("full_name", ""),
        "title": contact_data.get("title", ""),
        "department": contact_data.get("department", ""),
        "company": contact_data.get("company", ""),
        "industry": contact_data.get("industry", ""),
        "phone": phone[0] if len(phone) > 0 else "",
        "other_phone": phone[1] if len(phone) > 1 else "",
        "tel_phone": phone[2] if len(phone) > 2 else "",
        "other_tel": phone[3] if len(phone) > 3 else "",
        "fax": phone[4] if len(phone) > 4 else "",
        "email": email[0] if len(email) > 0 else "",
        "other_email": email[1] if len(email) > 1 else "",
        "address": contact_data.get("address", ""),
        "website": contact_data.get("website", ""),
        "social_profiles": contact_data.get("social_profiles", {}),
        "notes": contact_data.get("notes", ""),
        "meeting_context": contact_data.get("meeting_context", ""),
        "reference": contact_data.get("meeting_context", ""),
        "_provider": settings.ocr_provider,
    }

