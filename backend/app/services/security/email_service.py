"""
EmailService — pluggable email provider abstraction.

- ConsoleEmailProvider: logs email to stdout (default, no config needed)
- SMTPEmailProvider: sends real email via SMTP (set SMTP_HOST in .env)

The service auto-selects based on whether SMTP_HOST is configured.
"""

import logging
import smtplib
from abc import ABC, abstractmethod
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


# ─── Abstract Provider ────────────────────────────────────────────────────────


class EmailProvider(ABC):
    @abstractmethod
    async def send(self, to: str, subject: str, html_body: str) -> None: ...


# ─── Console Provider (mock) ──────────────────────────────────────────────────


class ConsoleEmailProvider(EmailProvider):
    """Development/test provider — prints emails to console."""

    async def send(self, to: str, subject: str, html_body: str) -> None:
        logger.info(
            "[EMAIL MOCK] To=%s | Subject=%s | Body preview: %.200s",
            to, subject, html_body,
        )


# ─── SMTP Provider ────────────────────────────────────────────────────────────


class SMTPEmailProvider(EmailProvider):
    """Production SMTP provider."""

    async def send(self, to: str, subject: str, html_body: str) -> None:
        import asyncio

        def _send() -> None:
            msg = MIMEMultipart("alternative")
            msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
            msg["To"] = to
            msg["Subject"] = subject
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.ehlo()
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.EMAIL_FROM, [to], msg.as_string())

        try:
            await asyncio.to_thread(_send)
            logger.info("Email sent to %s: %s", to, subject)
        except Exception as exc:
            logger.error("SMTP send failed to %s: %s", to, exc)
            raise


# ─── Factory ──────────────────────────────────────────────────────────────────


def get_email_provider() -> EmailProvider:
    if settings.SMTP_HOST:
        return SMTPEmailProvider()
    return ConsoleEmailProvider()


# ─── Email Service ────────────────────────────────────────────────────────────


class EmailService:
    def __init__(self) -> None:
        self._provider = get_email_provider()

    async def send_password_reset(self, to: str, token: str, full_name: str) -> None:
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        html = f"""
        <h2>Password Reset — DocuMind AI</h2>
        <p>Hi {full_name},</p>
        <p>Click the link below to reset your password. This link expires in 1 hour.</p>
        <p><a href="{reset_url}">Reset Password</a></p>
        <p>If you did not request this, ignore this email.</p>
        <p style="color:gray;font-size:12px">DocuMind AI Security Team</p>
        """
        await self._provider.send(to, "Reset your DocuMind AI password", html)

    async def send_email_verification(self, to: str, token: str, full_name: str) -> None:
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        html = f"""
        <h2>Verify your email — DocuMind AI</h2>
        <p>Hi {full_name},</p>
        <p>Please verify your email address by clicking the link below.</p>
        <p><a href="{verify_url}">Verify Email</a></p>
        <p style="color:gray;font-size:12px">DocuMind AI</p>
        """
        await self._provider.send(to, "Verify your DocuMind AI email", html)
