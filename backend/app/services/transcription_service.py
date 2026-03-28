"""Transcription service -- stub for Whisper/Deepgram."""


class TranscriptionService:
    """Placeholder for audio transcription processing."""

    async def transcribe(self, audio_bytes: bytes) -> dict[str, object]:
        """Transcribe audio bytes and return transcript + metadata.

        Stub: returns placeholder data. To be replaced with
        Whisper or Deepgram integration.
        """
        return {
            "transcript": "",
            "duration": 0.0,
            "summary": "",
        }
