"""
ClassificationService — classifies a document into one of 20 categories.

Single responsibility: determine category, subcategory, and confidence.
Never imports other AI services.
"""

import json
import logging
from dataclasses import dataclass
from typing import Optional

from app.ai.base import AIProvider

logger = logging.getLogger(__name__)

CATEGORIES = [
    "Resume", "Certificate", "Invoice", "Receipt", "Passport",
    "Driving License", "PAN Card", "Aadhaar", "Bank Statement",
    "Electricity Bill", "Water Bill", "Gas Bill", "Insurance",
    "Tax Document", "Employment Letter", "Offer Letter",
    "College Document", "Rental Agreement", "Medical Report", "Other",
]

_PROMPT_TEMPLATE = """\
You are a document classification expert. Analyze the text below and classify it.

DOCUMENT TEXT (first 3000 characters):
{text}

Available categories: {categories}

Respond with valid JSON only — no explanation, no markdown:
{{
  "category": "<exact category name from the list above>",
  "subcategory": "<more specific type, or null>",
  "confidence": <integer 0-100>
}}

Rules:
- Choose the closest matching category. Use "Other" only if no category fits.
- confidence: 90-100 = very certain, 70-89 = likely, 50-69 = uncertain, <50 = guessing
- subcategory examples: "Work Experience" for Resume, "Utility" for bills, null if unclear
"""


@dataclass
class ClassificationResult:
    category: str
    subcategory: Optional[str]
    confidence: float


class ClassificationService:
    """
    Classifies a document using an AI provider.
    Responsible only for category/subcategory/confidence — nothing else.
    """

    def __init__(self, provider: AIProvider) -> None:
        self.provider = provider

    async def classify(self, text: str) -> ClassificationResult:
        """
        Classify document text. Returns ClassificationResult.
        Falls back to category="Other" with confidence=0 on any error.
        """
        # Truncate to avoid token limits while preserving key content
        truncated = text[:3000] if len(text) > 3000 else text

        prompt = _PROMPT_TEMPLATE.format(
            text=truncated,
            categories=", ".join(CATEGORIES),
        )

        try:
            raw = await self.provider.generate(prompt, json_mode=True)
            data = json.loads(raw)

            category = data.get("category", "Other")
            if category not in CATEGORIES:
                logger.warning("AI returned unknown category %r, defaulting to Other", category)
                category = "Other"

            return ClassificationResult(
                category=category,
                subcategory=data.get("subcategory") or None,
                confidence=float(data.get("confidence", 50)),
            )

        except Exception as exc:
            from app.ai.base import AIProviderError
            if isinstance(exc, AIProviderError):
                # 503/429 errors — let AIService handle them properly
                # so it can store ai_error and NOT overwrite good data
                raise
            # Only JSON parse or unexpected errors get the fallback
            logger.error("Classification parse error: %s", exc)
            return ClassificationResult(category="Other", subcategory=None, confidence=0.0)
