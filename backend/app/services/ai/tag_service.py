"""
TagGenerationService — generates 3–8 relevant tags for a document.

Tags are lowercase, reusable across documents, and stored in a global tags table.
"""

import json
import logging
from typing import List

from app.ai.base import AIProvider

logger = logging.getLogger(__name__)

_PROMPT_TEMPLATE = """\
Generate 3 to 8 relevant tags for the following document.

Document category: {category}
Document text (first 2000 characters):
{text}

Rules:
- All tags must be lowercase.
- Use single words or short hyphenated phrases (e.g. "bank-statement", "python").
- Tags should describe the document content, domain, or purpose.
- No duplicates.

Respond with a JSON array only — no explanation, no markdown:
["tag1", "tag2", "tag3"]
"""

# Category seed tags — always included for their category
_CATEGORY_SEEDS: dict = {
    "Resume": ["resume", "job", "career"],
    "Invoice": ["invoice", "finance", "billing"],
    "Receipt": ["receipt", "expense"],
    "Passport": ["passport", "identity", "government"],
    "Driving License": ["driving-license", "identity", "government"],
    "PAN Card": ["pan-card", "identity", "tax", "government"],
    "Aadhaar": ["aadhaar", "identity", "government"],
    "Bank Statement": ["bank", "finance", "statement"],
    "Certificate": ["certificate", "education", "achievement"],
    "Insurance": ["insurance", "policy"],
    "Tax Document": ["tax", "finance", "government"],
    "Employment Letter": ["employment", "job", "hr"],
    "Offer Letter": ["offer-letter", "job", "hr"],
    "College Document": ["college", "education"],
    "Rental Agreement": ["rental", "property", "legal"],
    "Medical Report": ["medical", "health"],
    "Electricity Bill": ["electricity", "utility", "bill"],
    "Water Bill": ["water", "utility", "bill"],
    "Gas Bill": ["gas", "utility", "bill"],
}


class TagGenerationService:
    """
    Generates tags for a document using AI, combined with deterministic seed tags.
    Tags are always lowercase and deduplicated before returning.
    """

    def __init__(self, provider: AIProvider) -> None:
        self.provider = provider

    async def generate_tags(self, text: str, category: str) -> List[str]:
        """
        Generate 3–8 tags. Always includes category seed tags.
        Falls back to seed tags only if AI call fails.
        """
        seeds = _CATEGORY_SEEDS.get(category, [])

        try:
            truncated = text[:2000]
            prompt = _PROMPT_TEMPLATE.format(category=category, text=truncated)
            raw = await self.provider.generate(prompt, json_mode=True)

            ai_tags: List[str] = json.loads(raw)
            if not isinstance(ai_tags, list):
                ai_tags = []

            # Normalise + merge with seeds, deduplicate
            combined = seeds + [t.lower().strip() for t in ai_tags if isinstance(t, str)]
            seen: set = set()
            unique = []
            for tag in combined:
                if tag and tag not in seen and len(tag) <= 50:
                    seen.add(tag)
                    unique.append(tag)

            return unique[:10]  # cap at 10 tags

        except Exception as exc:
            logger.error("Tag generation failed: %s", exc)
            return seeds  # fallback to seed tags
