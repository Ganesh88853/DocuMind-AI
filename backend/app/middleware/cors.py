"""
CORS middleware configuration.
Allows frontend origins to communicate with the backend API.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings


def add_cors_middleware(app: FastAPI) -> None:
    """Attach CORSMiddleware with settings-driven allowed origins."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get_cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
