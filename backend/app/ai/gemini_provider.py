"""
GeminiProvider — Google Gemini implementation using the `google-genai` SDK.

Strategy:
  1. Try the configured model first.
  2. On 429 (quota exhausted) or 503 (overloaded), wait the delay from the
     error response, then try the NEXT model in the fallback chain.
  3. If all models exhaust, raise AIProviderError with a clear message.

This means one document can be processed even when the primary model's
daily/minute quota is fully exhausted.
"""

import asyncio
import logging
import re
from typing import List, Optional

from app.ai.base import AIProvider, AIProviderError

logger = logging.getLogger(__name__)

# Ordered fallback chain — provider tries each in order when quota/503 hit
_MODEL_FALLBACK_CHAIN: List[str] = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-flash-lite-latest",
    "gemini-flash-latest",
]
_DEFAULT_MODEL = "gemini-2.5-flash-lite"

_DAILY_QUOTA_PATTERNS = [
    "PerDay",
    "PerDayPer",
    "GenerateRequestsPerDay",
]


def _is_daily_quota(error_str: str) -> bool:
    """True when error indicates a daily (not per-minute) quota violation."""
    return any(p in error_str for p in _DAILY_QUOTA_PATTERNS)


def _parse_retry_delay(error_str: str) -> float:
    """
    Extract 'retryDelay' seconds from the Gemini error string.
    Returns 5.0 if not found.
    """
    match = re.search(r"'retryDelay':\s*'(\d+(?:\.\d+)?)s?'", error_str)
    if match:
        return min(float(match.group(1)) + 2.0, 120.0)  # add 2s buffer, cap 120s
    return 5.0


class GeminiProvider(AIProvider):
    """
    Google Gemini provider using the `google-genai` SDK.

    On every call, tries the primary model first, then falls back through
    _MODEL_FALLBACK_CHAIN if that model hits quota (429) or overload (503).
    Within each model, retries once using the delay from the error response.
    """

    def __init__(self, api_key: str, model: Optional[str] = None) -> None:
        try:
            from google import genai  # type: ignore
            self._client = genai.Client(api_key=api_key)
        except ImportError as exc:
            raise AIProviderError(
                "google-genai package not installed. Run: pip install google-genai"
            ) from exc

        requested = model or _DEFAULT_MODEL
        # Build chain starting from the configured model
        if requested in _MODEL_FALLBACK_CHAIN:
            idx = _MODEL_FALLBACK_CHAIN.index(requested)
            self._model_chain = _MODEL_FALLBACK_CHAIN[idx:]
        else:
            self._model_chain = [requested] + _MODEL_FALLBACK_CHAIN

        self._model = self._model_chain[0]
        logger.info("GeminiProvider ready — chain: %s", self._model_chain)

    @property
    def model_name(self) -> str:
        return self._model

    async def generate(self, prompt: str, json_mode: bool = False) -> str:
        """
        Send a prompt and return text. Tries each model in the fallback chain.
        Within each model, retries once using the retryDelay from the 429/503.
        """
        from google.genai import types  # type: ignore

        config_kwargs: dict = {"temperature": 0.1, "max_output_tokens": 2048}
        if json_mode:
            config_kwargs["response_mime_type"] = "application/json"
        generation_config = types.GenerateContentConfig(**config_kwargs)

        last_exc: Optional[Exception] = None

        for model in self._model_chain:
            # Each model gets 2 attempts (original + 1 retry on transient errors)
            for attempt in range(2):
                try:
                    current_model = model  # capture for closure

                    def _call() -> str:
                        response = self._client.models.generate_content(
                            model=current_model,
                            contents=prompt,
                            config=generation_config,
                        )
                        return response.text

                    result = await asyncio.to_thread(_call)
                    if model != self._model:
                        logger.info("Used fallback model: %s", model)
                    return result

                except Exception as exc:
                    error_str = str(exc)
                    is_quota = "429" in error_str or "RESOURCE_EXHAUSTED" in error_str
                    is_overloaded = "503" in error_str or "UNAVAILABLE" in error_str
                    last_exc = exc

                    if not (is_quota or is_overloaded):
                        # Non-retriable error — break immediately
                        logger.error("Gemini non-retriable error on %s: %s", model, error_str[:120])
                        raise AIProviderError(f"Gemini API error: {exc}") from exc

                    if is_quota and _is_daily_quota(error_str):
                        # Daily quota exhausted — skip to next model immediately
                        logger.warning("Gemini daily quota exhausted on %s — trying next model", model)
                        break  # break inner loop → try next model

                    if attempt == 0:
                        # First failure on this model → wait the suggested delay, retry once
                        wait = _parse_retry_delay(error_str)
                        logger.warning(
                            "Gemini %s on %s (attempt 1/2) — retrying in %.0fs",
                            "503" if is_overloaded else "429 rate-limit",
                            model, wait,
                        )
                        await asyncio.sleep(wait)
                    else:
                        # Second failure → try next model
                        logger.warning("Gemini still failing on %s — trying next model", model)
                        break  # break inner loop → try next model

        logger.error("All Gemini models exhausted. Last error: %s", last_exc)
        raise AIProviderError(
            "All Gemini models have exceeded their quota for today. "
            "Please try again after midnight (UTC) or enable billing at "
            "https://console.cloud.google.com/billing"
        ) from last_exc
