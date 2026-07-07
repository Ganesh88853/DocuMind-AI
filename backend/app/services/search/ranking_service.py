"""
RankingService — computes the final document relevance score and match explanation.

Ranking algorithm weights:
  60% — Semantic similarity (cosine distance from embedding)
  15% — Category relevance (query terms in category name)
  10% — Tag relevance (query terms matching tag names)
  10% — Metadata relevance (query terms in metadata values)
   3% — Recency boost (newer documents score higher)
   2% — Favorite boost

Final score is clamped to [0, 1].
Explanation is rule-based (no LLM — deterministic and fast).
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class RankingService:
    """
    Produces a composite relevance score and a human-readable match explanation.
    Designed to be stateless — all inputs passed per call.
    """

    # Weight configuration (must sum to 1.0)
    W_SEMANTIC = 0.60
    W_CATEGORY = 0.15
    W_TAGS = 0.10
    W_METADATA = 0.10
    W_RECENCY = 0.03
    W_FAVORITE = 0.02

    def score(
        self,
        semantic_sim: float,
        category: Optional[str],
        tags: List[str],
        ai_metadata: Optional[Dict[str, Any]],
        created_at: datetime,
        is_favorite: bool,
        query_terms: List[str],
    ) -> float:
        """Compute composite relevance score in [0, 1]."""
        score = self.W_SEMANTIC * min(semantic_sim, 1.0)

        # Category relevance
        if category:
            cat_lower = category.lower()
            if any(term in cat_lower for term in query_terms):
                score += self.W_CATEGORY
            elif any(term[:4] in cat_lower for term in query_terms if len(term) >= 4):
                score += self.W_CATEGORY * 0.5

        # Tag relevance
        if tags:
            matching = sum(
                1 for t in tags
                if any(term in t.lower() or t.lower() in term for term in query_terms)
            )
            score += self.W_TAGS * min(matching / max(len(tags), 1), 1.0)

        # Metadata relevance
        if ai_metadata:
            meta_str = " ".join(
                str(v).lower() for v in ai_metadata.values()
                if isinstance(v, (str, int, float))
            )
            meta_hits = sum(1 for term in query_terms if term in meta_str)
            score += self.W_METADATA * min(meta_hits / max(len(query_terms), 1), 1.0)

        # Recency boost — linear decay over 30 days
        now = datetime.now(timezone.utc)
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        days_old = max(0, (now - created_at).days)
        recency = max(0.0, 1.0 - days_old / 30.0)
        score += self.W_RECENCY * recency

        # Favorite boost
        if is_favorite:
            score += self.W_FAVORITE

        return min(float(score), 1.0)

    def explain(
        self,
        semantic_sim: float,
        category: Optional[str],
        tags: List[str],
        ai_metadata: Optional[Dict[str, Any]],
        is_favorite: bool,
        query_terms: List[str],
    ) -> str:
        """Generate a deterministic, human-readable match explanation."""
        reasons: List[str] = []

        # Semantic similarity explanation
        if semantic_sim >= 0.80:
            reasons.append("strong semantic similarity to your query")
        elif semantic_sim >= 0.60:
            reasons.append("good semantic match with your query")
        elif semantic_sim >= 0.40:
            reasons.append("partial semantic match")
        else:
            reasons.append("low semantic similarity")

        # Category match
        if category:
            cat_lower = category.lower()
            if any(term in cat_lower for term in query_terms):
                reasons.append(f"category '{category}' matches your query")
            else:
                reasons.append(f"categorized as {category}")

        # Matching tags
        matching_tags = [
            t for t in tags
            if any(term in t.lower() or t.lower() in term for term in query_terms)
        ]
        if matching_tags:
            reasons.append(f"tagged with: {', '.join(matching_tags[:4])}")
        elif tags:
            reasons.append(f"tags: {', '.join(tags[:3])}")

        # Metadata match
        if ai_metadata:
            meta_matches = [
                str(v) for k, v in ai_metadata.items()
                if isinstance(v, str) and any(term in v.lower() for term in query_terms)
            ]
            if meta_matches:
                reasons.append(f"metadata contains: {', '.join(meta_matches[:2])}")

        # Favorite
        if is_favorite:
            reasons.append("marked as favorite")

        if not reasons:
            return "Matched by content similarity."

        return "Matched because " + "; ".join(reasons) + "."
