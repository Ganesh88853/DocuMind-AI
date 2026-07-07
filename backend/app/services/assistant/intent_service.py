"""
IntentService — classifies the user's question to guide retrieval and prompting.

Intentionally uses NO AI calls (keyword-based) to save API quota.
Intent helps the ContextBuilder and PromptBuilder tailor their output.
"""

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import List


class QueryIntent(str, Enum):
    COMPARISON  = "comparison"   # "compare my two offer letters"
    SUMMARY     = "summary"      # "summarize my internship docs"
    LISTING     = "listing"      # "list all invoices" / "what certificates do I have"
    SPECIFIC    = "specific"     # "what is my passport expiry date"
    GENERAL     = "general"      # anything else


@dataclass
class Intent:
    type: QueryIntent
    keywords: List[str] = field(default_factory=list)


_COMPARISON_WORDS = {"compare", "comparison", "vs", "versus", "difference", "differences",
                     "contrast", "both", "between", "two"}
_SUMMARY_WORDS    = {"summarize", "summarise", "summary", "overview", "brief", "highlight",
                     "explain", "describe"}
_LISTING_WORDS    = {"list", "all", "show", "find", "which", "what certificates",
                     "what documents", "do i have", "give me"}
_SPECIFIC_WORDS   = {"when", "expire", "expiry", "expiration", "date", "number", "what is",
                     "who is", "where", "how much", "amount", "total", "score", "grade"}


class IntentService:
    """
    Deterministic keyword-based intent classifier.
    Single responsibility: produce a QueryIntent from a question string.
    """

    def analyze(self, question: str) -> Intent:
        lower = question.lower()
        tokens = set(re.findall(r'\w+', lower))

        if tokens & _COMPARISON_WORDS:
            return Intent(type=QueryIntent.COMPARISON, keywords=list(tokens & _COMPARISON_WORDS))
        if tokens & _SUMMARY_WORDS:
            return Intent(type=QueryIntent.SUMMARY, keywords=list(tokens & _SUMMARY_WORDS))
        if tokens & _SPECIFIC_WORDS:
            return Intent(type=QueryIntent.SPECIFIC, keywords=list(tokens & _SPECIFIC_WORDS))
        if tokens & _LISTING_WORDS:
            return Intent(type=QueryIntent.LISTING, keywords=list(tokens & _LISTING_WORDS))
        return Intent(type=QueryIntent.GENERAL)
