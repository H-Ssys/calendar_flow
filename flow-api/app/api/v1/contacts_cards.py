import io
import os
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from PIL import Image

from app.core.security import verify_token
from app.core.supabase_admin import supabase_admin

router = APIRouter()


def _bucket_cards() -> str:
    return os.getenv("SUPABASE_STORAGE_BUCKET_CARDS", "contacts-cards")


def _bucket_avatars() -> str:
    return os.getenv("SUPABASE_STORAGE_BUCKET_AVATARS", "contact-avatars")


def _uid(user) -> str:
    uid = getattr(user, "id", None) or (user.get("sub") if isinstance(user, dict) else None)
    if not uid:
        raise HTTPException(status_code=401, detail="Missing user id in token")
    return str(uid)


def _to_jpeg(image_bytes: bytes, max_size: tuple[int, int] = (2000, 2000)) -> bytes:
    img = Image.open(io.BytesIO(image_bytes))
    img.thumbnail(max_size, Image.LANCZOS)
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=88)
    return buf.getvalue()


def _upload(bucket: str, path: str, data: bytes) -> str:
    storage = supabase_admin.storage.from_(bucket)
    try:
        storage.upload(
            path=path,
            file=data,
            file_options={"content-type": "image/jpeg", "upsert": "true"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")
    return storage.get_public_url(path)


@router.post("/contacts/{contact_id}/cards")
async def upload_card(
    contact_id: str,
    side: Literal["front", "back"] = Form(...),
    image: UploadFile = File(...),
    user=Depends(verify_token),
):
    uid = _uid(user)
    jpeg = _to_jpeg(await image.read())
    path = f"{uid}/{contact_id}/{side}.jpg"
    url = _upload(_bucket_cards(), path, jpeg)
    return {"url": url}


@router.delete("/contacts/{contact_id}/cards/{side}")
async def delete_card(
    contact_id: str,
    side: Literal["front", "back"],
    user=Depends(verify_token),
):
    uid = _uid(user)
    path = f"{uid}/{contact_id}/{side}.jpg"
    try:
        supabase_admin.storage.from_(_bucket_cards()).remove([path])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage delete failed: {e}")
    return {"ok": True}


@router.post("/contacts/{contact_id}/avatar")
async def upload_avatar(
    contact_id: str,
    image: UploadFile = File(...),
    user=Depends(verify_token),
):
    uid = _uid(user)
    jpeg = _to_jpeg(await image.read(), max_size=(512, 512))
    path = f"{uid}/{contact_id}/avatar.jpg"
    url = _upload(_bucket_avatars(), path, jpeg)
    return {"url": url}
