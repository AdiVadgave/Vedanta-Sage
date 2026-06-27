"""Sage — AI-Enabled Safety Agents for Vedanta. FastAPI application entrypoint."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from rag import build_index, index_mode
from routers import documentation, intelligence, investigation, knowledge, predictive
from services import analytics, predictor

logging.basicConfig(level=logging.INFO, format="%(levelname)s [%(name)s] %(message)s")
log = logging.getLogger("sage")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    log.info("Starting Sage backend...")
    log.info("Azure OpenAI configured: %s", settings.is_configured)
    log.info("Embeddings deployment set: %s", bool(settings.embedding_deployment))
    # Build the retrieval index and train the predictive model once.
    mode = build_index()
    log.info("RAG retrieval mode: %s", mode)
    predictor.train()
    log.info("Sage backend ready.")
    yield


app = FastAPI(title="Sage — AI Safety Agents", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # demo: allow the Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(knowledge.router)
app.include_router(investigation.router)
app.include_router(intelligence.router)
app.include_router(documentation.router)
app.include_router(predictive.router)


@app.get("/api/status")
def status():
    settings = get_settings()
    return {
        "service": "Sage",
        "llm_configured": settings.is_configured,
        "embeddings_enabled": settings.has_embeddings,
        "retrieval_mode": index_mode(),
    }


@app.get("/api/dashboard")
def dashboard():
    """Aggregated KPIs + highlights for the dashboard home."""
    stats = analytics.headline_stats()
    trend = analytics.monthly_trend()
    patterns = analytics.recurring_patterns()
    scored = predictor.score_equipment()
    high_risk = [e for e in scored if e["risk_band"] == "High"]
    return {
        "stats": stats,
        "trend": trend[-6:],
        "top_patterns": patterns[:3],
        "high_risk_equipment": high_risk[:5],
        "open_alerts": len([e for e in scored if e["failure_probability"] >= 0.33]),
        "retrieval_mode": index_mode(),
    }


@app.get("/")
def root():
    return {"message": "Sage AI Safety Agents API. See /docs for endpoints."}
