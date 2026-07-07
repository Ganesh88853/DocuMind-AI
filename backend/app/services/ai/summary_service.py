"""
SummaryService — generates a concise ≤120-word summary of a document.

Single responsibility: produce a plain-text summary.
Instructs the model to never hallucinate — state uncertainty explicitly.
"""

import logging
from typing import Optional

from app.ai.base import AIProvider

logger = logging.getLogger(__name__)

_PROMPT_TEMPLATE = """\
Summarize the following document in 120 words or fewer.

Rules:
- State only what is clearly present in the text.
- If something is uncertain, write "could not be determined" — do not guess.
- Do not use bullet points. Write a coherent paragraph.
- Do not start with "This document".

Document category: {category}
Document text (first 4000 characters):
{text}

Summary (plain text, no markdown, ≤120 words):
"""


class SummaryService:
    """
    Generates a plain-text document summary.
    Never returns markdown or structured data.
    """

    def __init__(self, provider: AIProvider) -> None:
        self.provider = provider

    async def summarise(self, text: str, category: str) -> Optional[str]:
        """
        Generate a ≤120-word summary of the document.
        Returns None on failure (OCR data is never affected).
        """
        truncated = text[:4000]
        prompt = _PROMPT_TEMPLATE.format(category=category, text=truncated)

        try:
            summary = await self.provider.generate(prompt, json_mode=False)
            # Trim and enforce word count
            words = summary.strip().split()
            if len(words) > 130:
                summary = " ".join(words[:120]) + "…"
            return summary.strip() or None
        except Exception as exc:
            logger.error("Summary generation failed: %s", exc)
            return None
