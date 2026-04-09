"""OCR service -- stub for GenKit + Tesseract fallback."""


class OCRService:
    """Placeholder for business card OCR processing."""

    async def process_image(self, image_bytes: bytes) -> dict[str, str]:
        """Process a business card image and extract contact fields.

        Stub: returns placeholder data. To be replaced with
        GenKit vision model + Tesseract fallback.
        """
        return {
            "name": "",
            "email": "",
            "phone": "",
            "company": "",
            "title": "",
        }
