import base64
import io
import json

import httpx
from PIL import Image

from app.core.config import settings

# ─── OCR PROVIDERS ───────────────────────────────────────────────


async def ocr_with_deepseek(image_bytes: bytes, prompt: str) -> str:
    """DeepSeek-V3 vision — primary provider."""
    # Convert image to base64
    img = Image.open(io.BytesIO(image_bytes))
    # Resize if too large (DeepSeek has size limits)
    max_size = (1500, 1500)
    img.thumbnail(max_size, Image.LANCZOS)
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=85)
    b64_image = base64.b64encode(buffer.getvalue()).decode("utf-8")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.deepseek_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "deepseek-chat",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{b64_image}"
                                },
                            },
                            {"type": "text", "text": prompt},
                        ],
                    }
                ],
                "max_tokens": 1000,
            },
        )
        response.raise_for_status()
        result = response.json()
        return result["choices"][0]["message"]["content"]


async def ocr_with_gemini(image_bytes: bytes, prompt: str) -> str:
    """Gemini 3.1 Flash-Lite vision."""
    import google.generativeai as genai

    genai.configure(api_key=settings.google_api_key)
    img = Image.open(io.BytesIO(image_bytes))
    model = genai.GenerativeModel("gemini-3.1-flash-lite-preview")
    response = model.generate_content([prompt, img])
    return response.text


async def ocr_with_openai(image_bytes: bytes, prompt: str) -> str:
    """OpenAI GPT-4o vision — fallback option."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{b64_image}"
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
        max_tokens=1000,
    )
    return response.choices[0].message.content


async def run_ocr(image_bytes: bytes, prompt: str) -> str:
    """Route OCR to the configured provider."""
    provider = settings.ocr_provider
    if provider == "deepseek":
        return await ocr_with_deepseek(image_bytes, prompt)
    elif provider == "gemini":
        return await ocr_with_gemini(image_bytes, prompt)
    elif provider == "openai":
        return await ocr_with_openai(image_bytes, prompt)
    else:
        raise ValueError(f"Unknown OCR provider: {provider}")


# ─── EMBEDDING PROVIDERS ──────────────────────────────────────────


async def embed_with_openai(text: str) -> list[float]:
    """OpenAI text-embedding-3-small — primary embedding provider."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


async def embed_with_deepseek(text: str) -> list[float]:
    """DeepSeek embeddings — alternative provider."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.deepseek.com/v1/embeddings",
            headers={
                "Authorization": f"Bearer {settings.deepseek_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "deepseek-embedding",
                "input": text,
            },
        )
        response.raise_for_status()
        return response.json()["data"][0]["embedding"]


async def run_embed(text: str) -> list[float]:
    """Route embedding to the configured provider."""
    provider = settings.embed_provider
    if provider == "openai":
        return await embed_with_openai(text)
    elif provider == "deepseek":
        return await embed_with_deepseek(text)
    else:
        raise ValueError(f"Unknown embed provider: {provider}")
