"""Resilient wrapper around the Azure-hosted Claude model + Azure embeddings.

This Azure AI Foundry resource serves the Claude deployment through the native
**Anthropic Messages API** (`/anthropic/v1/messages`, `x-api-key` +
`anthropic-version` headers) rather than the Azure OpenAI chat route. Embeddings
(text-embedding-3-*) are still served on the standard Azure OpenAI route, so we
use the openai SDK client for `embed()` only.

- `chat()` -> Anthropic Messages API via httpx.
- `embed()` -> Azure OpenAI embeddings, or None when unavailable (TF-IDF fallback).
- Light retry with backoff; clear, user-surfaceable errors.
"""
from __future__ import annotations

import json
import logging
import time
from typing import Optional

import httpx

from config import get_client, get_settings

log = logging.getLogger("sage.llm")

NOT_CONFIGURED = "__SAGE_LLM_NOT_CONFIGURED__"
ANTHROPIC_VERSION = "2023-06-01"


class LLMError(RuntimeError):
    """Raised when the LLM call fails after retries."""


def _retry(fn, *, attempts: int = 3, base_delay: float = 1.0):
    last_exc: Optional[Exception] = None
    for i in range(attempts):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001 - re-raised as LLMError
            last_exc = exc
            wait = base_delay * (2**i)
            log.warning("LLM call failed (attempt %s/%s): %s", i + 1, attempts, exc)
            if i < attempts - 1:
                time.sleep(wait)
    raise LLMError(str(last_exc) if last_exc else "Unknown LLM error")


def chat(
    prompt: str,
    *,
    system: Optional[str] = None,
    temperature: float = 0.2,
    max_tokens: int = 1200,
    json_mode: bool = False,
) -> str:
    """Single-turn completion via the Anthropic Messages API.

    Returns the NOT_CONFIGURED marker (not an exception) when credentials are
    missing so endpoints degrade gracefully.

    json_mode=True appends a strict "JSON only" instruction (this Azure-hosted
    model does not support assistant-message prefill); the response is parsed
    with the tolerant `extract_json` helper by callers.
    """
    settings = get_settings()
    if not settings.is_configured:
        return NOT_CONFIGURED

    # Normalise endpoint: accept ".../", ".../anthropic" or ".../anthropic/".
    base = settings.endpoint.rstrip("/")
    if base.endswith("/anthropic"):
        base = base[: -len("/anthropic")]
    url = f"{base}/anthropic/v1/messages"
    headers = {
        "x-api-key": settings.api_key,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    }

    user_content = prompt
    if json_mode:
        user_content += (
            "\n\nReturn ONLY a single valid JSON object. Do not include any text "
            "before or after it, and do not wrap it in markdown code fences."
        )
    messages = [{"role": "user", "content": user_content}]

    body: dict = {
        "model": settings.chat_deployment,
        "max_tokens": max_tokens,
        "temperature": max(0.0, min(1.0, temperature)),
        "messages": messages,
    }
    if system:
        body["system"] = system

    def _call():
        r = httpx.post(url, json=body, headers=headers, timeout=120)
        r.raise_for_status()
        data = r.json()
        text = "".join(
            block.get("text", "")
            for block in data.get("content", [])
            if block.get("type") == "text"
        )
        return text

    return _retry(_call)


def chat_json(prompt: str, *, system: Optional[str] = None, **kwargs) -> Optional[dict]:
    """Convenience: chat in JSON mode and parse, tolerating fences/extra text.

    Returns None if not configured; raises nothing on parse failure (returns the
    best-effort parse or {"_raw": text})."""
    raw = chat(prompt, system=system, json_mode=True, **kwargs)
    if raw == NOT_CONFIGURED:
        return None
    return extract_json(raw)


def extract_json(text: str) -> dict:
    """Best-effort JSON parse: direct, then strip fences, then brace-slice."""
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass
    return {"_raw": text}


def embed(texts: list[str]) -> Optional[list[list[float]]]:
    """Return embeddings for `texts`, or None if embeddings are unavailable.

    Uses the standard Azure OpenAI embeddings route (text-embedding-3-*). Any
    failure returns None so the RAG layer falls back to TF-IDF.
    """
    settings = get_settings()
    client = get_client()
    if client is None or not settings.embedding_deployment:
        return None
    try:
        def _call():
            resp = client.embeddings.create(
                model=settings.embedding_deployment, input=texts
            )
            return [d.embedding for d in resp.data]

        return _retry(_call, attempts=2)
    except Exception as exc:  # noqa: BLE001
        log.warning("Embeddings unavailable, falling back to TF-IDF: %s", exc)
        return None
