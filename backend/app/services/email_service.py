"""Email service -- stub for Resend/SMTP."""


class EmailService:
    """Placeholder for email sending (invitations, digests)."""

    async def send_invite(
        self,
        to: str,
        event_id: str,
        sender_id: str,
    ) -> bool:
        """Send an event invitation email.

        Stub: returns False. To be replaced with Resend or SMTP.
        """
        return False

    async def send_digest(
        self,
        user_id: str,
    ) -> dict[str, object]:
        """Generate and send a notification digest.

        Stub: returns empty result. To be replaced with actual digest logic.
        """
        return {"sent": False, "items_count": 0}
