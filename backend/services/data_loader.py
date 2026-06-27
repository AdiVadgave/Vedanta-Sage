"""Loads all generated demo datasets into memory once at startup."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import pandas as pd

from config import DATA_DIR


@lru_cache
def get_incidents() -> pd.DataFrame:
    df = pd.read_csv(DATA_DIR / "incidents.csv")
    df["date"] = pd.to_datetime(df["date"])
    return df


@lru_cache
def get_near_misses() -> pd.DataFrame:
    df = pd.read_csv(DATA_DIR / "near_misses.csv")
    df["date"] = pd.to_datetime(df["date"])
    return df


@lru_cache
def get_inspections() -> pd.DataFrame:
    df = pd.read_csv(DATA_DIR / "inspections.csv")
    df["date"] = pd.to_datetime(df["date"])
    return df


@lru_cache
def get_standards() -> list[dict]:
    return json.loads((DATA_DIR / "standards.json").read_text(encoding="utf-8"))


@lru_cache
def get_critical_controls() -> list[dict]:
    return json.loads((DATA_DIR / "critical_controls.json").read_text(encoding="utf-8"))


def get_documents() -> list[dict]:
    """Return all knowledge documents (SOPs + risk assessments) as
    {id, title, kind, path, text} dicts for the RAG corpus."""
    docs: list[dict] = []
    for kind, folder in (("SOP", "sops"), ("JSA", "risk_assessments")):
        d = DATA_DIR / folder
        if not d.exists():
            continue
        for path in sorted(d.glob("*.md")):
            text = path.read_text(encoding="utf-8")
            title = text.splitlines()[0].lstrip("# ").strip() if text else path.stem
            docs.append(
                {
                    "id": path.stem,
                    "title": title,
                    "kind": kind,
                    "path": str(path),
                    "text": text,
                }
            )
    return docs
