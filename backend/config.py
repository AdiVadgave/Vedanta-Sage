"""Central configuration for the Sage backend.

Loads environment variables from .env and exposes a configured AzureOpenAI
client plus the deployment names used across the app.
"""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

# Load .env located next to this file.
load_dotenv(BASE_DIR / ".env")


class Settings:
    """Runtime settings sourced from environment variables."""

    def __init__(self) -> None:
        self.api_key: str = os.getenv("AZURE_OPENAI_API_KEY", "").strip()
        self.endpoint: str = os.getenv("AZURE_OPENAI_ENDPOINT", "").strip()
        self.chat_deployment: str = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "").strip()
        self.api_version: str = os.getenv(
            "AZURE_OPENAI_API_VERSION", "2024-08-01-preview"
        ).strip()
        self.embedding_deployment: str = os.getenv(
            "AZURE_OPENAI_EMBEDDING_DEPLOYMENT", ""
        ).strip()

    @property
    def is_configured(self) -> bool:
        """True when the minimum chat credentials are present."""
        return bool(self.api_key and self.endpoint and self.chat_deployment)

    @property
    def has_embeddings(self) -> bool:
        return bool(self.is_configured and self.embedding_deployment)


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache
def get_client():
    """Return a cached AzureOpenAI client, or None if not configured."""
    settings = get_settings()
    if not settings.is_configured:
        return None
    # Imported lazily so the app can still boot (and report status) without the
    # SDK fully configured.
    from openai import AzureOpenAI

    return AzureOpenAI(
        api_key=settings.api_key,
        azure_endpoint=settings.endpoint,
        api_version=settings.api_version,
    )
