"""Retrieval layer for the Knowledge & Search agent.

Builds an in-memory index over SOP / risk-assessment chunks at startup.
Primary path: Azure embeddings + cosine similarity.
Fallback path: scikit-learn TF-IDF cosine (auto-selected if embeddings are
unavailable). The chosen path is logged and exposed via `index_mode()`.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field

import numpy as np

from azure_llm import embed
from services.data_loader import get_documents

log = logging.getLogger("sage.rag")

_CHUNK_WORDS = 180
_OVERLAP_WORDS = 40


@dataclass
class _Index:
    chunks: list[dict] = field(default_factory=list)
    mode: str = "uninitialised"  # "embeddings" | "tfidf"
    matrix: np.ndarray | None = None
    vectorizer: object | None = None  # TfidfVectorizer when in tfidf mode


_INDEX = _Index()


def _chunk_text(text: str) -> list[str]:
    """Split a document into overlapping word windows, keeping section headers."""
    words = text.split()
    if len(words) <= _CHUNK_WORDS:
        return [text]
    chunks = []
    step = _CHUNK_WORDS - _OVERLAP_WORDS
    for start in range(0, len(words), step):
        chunk = " ".join(words[start : start + _CHUNK_WORDS])
        chunks.append(chunk)
        if start + _CHUNK_WORDS >= len(words):
            break
    return chunks


def build_index() -> str:
    """Build the retrieval index. Returns the mode actually used."""
    docs = get_documents()
    chunks: list[dict] = []
    for doc in docs:
        for i, piece in enumerate(_chunk_text(doc["text"])):
            chunks.append(
                {
                    "doc_id": doc["id"],
                    "title": doc["title"],
                    "kind": doc["kind"],
                    "chunk_id": f"{doc['id']}#{i}",
                    "text": piece,
                }
            )
    _INDEX.chunks = chunks

    # Try embeddings first.
    vectors = embed([c["text"] for c in chunks]) if chunks else None
    if vectors is not None:
        mat = np.array(vectors, dtype=np.float32)
        # normalise for cosine via dot product
        norms = np.linalg.norm(mat, axis=1, keepdims=True)
        norms[norms == 0] = 1e-9
        _INDEX.matrix = mat / norms
        _INDEX.mode = "embeddings"
        log.info("RAG index built with Azure EMBEDDINGS over %d chunks", len(chunks))
        return _INDEX.mode

    # Fallback: TF-IDF.
    from sklearn.feature_extraction.text import TfidfVectorizer

    vec = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=1)
    matrix = vec.fit_transform([c["text"] for c in chunks]) if chunks else None
    _INDEX.vectorizer = vec
    _INDEX.matrix = matrix
    _INDEX.mode = "tfidf"
    log.info("RAG index built with TF-IDF fallback over %d chunks", len(chunks))
    return _INDEX.mode


def index_mode() -> str:
    return _INDEX.mode


def retrieve(query: str, k: int = 4) -> list[dict]:
    """Return the top-k most relevant chunks for `query`, with a 0-1 score."""
    if not _INDEX.chunks or _INDEX.matrix is None:
        return []

    if _INDEX.mode == "embeddings":
        qv = embed([query])
        if qv is None:  # embeddings became unavailable mid-session
            return _keyword_fallback(query, k)
        q = np.array(qv[0], dtype=np.float32)
        q = q / (np.linalg.norm(q) or 1e-9)
        scores = _INDEX.matrix @ q
    else:
        qv = _INDEX.vectorizer.transform([query])
        # cosine similarity against tf-idf matrix
        from sklearn.metrics.pairwise import cosine_similarity

        scores = cosine_similarity(qv, _INDEX.matrix).ravel()

    top = np.argsort(scores)[::-1][:k]
    results = []
    for idx in top:
        c = _INDEX.chunks[int(idx)]
        results.append({**c, "score": round(float(scores[int(idx)]), 3)})
    return results


def _keyword_fallback(query: str, k: int) -> list[dict]:
    """Crude keyword overlap if embeddings disappear after startup."""
    terms = set(re.findall(r"\w+", query.lower()))
    scored = []
    for c in _INDEX.chunks:
        words = set(re.findall(r"\w+", c["text"].lower()))
        overlap = len(terms & words)
        scored.append((overlap, c))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [{**c, "score": float(s)} for s, c in scored[:k]]
