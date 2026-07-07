"""
AIProvider — abstract interface for AI language model providers.

Design goal: business logic (classification, summary, tags) never
imports a concrete provider. To swap Gemini → OpenAI → Ollama,
only the provider implementation needs to change.
"""

from abc import ABC, abstractmethod


class AIProvider(ABC):
    """
    Minimal interface every AI provider must implement.
    All implementations must be safe to call from async contexts.
    """

    @abstractmethod
    async def generate(self, prompt: str, json_mode: bool = False) -> str:
        """
        Send a prompt and return the text response.

        Args:
            prompt:    Full prompt string (system + user content combined).
            json_mode: If True, ask the model to return valid JSON only.

        Returns:
            Raw text response from the model.

        Raises:
            AIProviderError: on any provider-level failure.
        """
        ...

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Human-readable name of the underlying model."""
        ...


class AIProviderError(Exception):
    """Raised when an AI provider call fails."""
