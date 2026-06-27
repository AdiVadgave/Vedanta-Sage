# Vedanta AI-Enabled Safety Agents — 3-Day Demo Build Plan

## Context

Vedanta (mining & metals conglomerate) issued a Scope of Work for **AI-enabled Safety Agents** to close their "safety execution gap": good processes on paper, poor execution in the field. The four root pain points are (1) safety info not accessible at the point of work, (2) inconsistent safety documentation, (3) recurring incidents with no systemic learning, (4) unused safety data.

**Constraint:** We have **3 days** to build a working solution for a **client demo/pitch**. Phase 1 (stakeholder discovery) is skipped; we will generate **realistic dummy data** (SOPs, risk assessments, incidents, inspection logs) to drive a convincing end-to-end demo. We have Azure OpenAI credentials (chat deployment confirmed; embeddings unknown → fallback designed).

**Intended outcome:** A polished, runnable web app (FastAPI + React) demonstrating **5 Safety Agents**, each visibly mapped to a SoW pain point, powered by Azure OpenAI over believable Vedanta-style safety data.

---

## The 5 Agents (scope → SoW mapping)

| # | Agent | What it does in the demo | SoW item / pain point |
|---|-------|--------------------------|------------------------|
| 1 | **Knowledge & Search Agent** (flagship) | RAG chat over SOPs, risk assessments, critical controls. Plain-language answers with cited sources at "point of work". Standards-version watch flags SOPs referencing outdated standards. | Pain #1; "AI-powered search/retrieval", "plain-language guidance", "version control & monitoring of legal/standard changes" |
| 2 | **Incident Investigation Assistant** | Guided, SOP-aligned investigation: enter an incident → AI produces structured 5-Why/root-cause, contributing factors, recommended controls. | "Configured structured incident investigation assistant aligned to SOPs" (pain #2/#3) |
| 3 | **Incident Intelligence Agent** | Analytics dashboard over incidents + near-misses: trends, recurring-pattern clustering, hotspots, AI auto-generated "Lessons Learned" cards. | "Analytics engine to identify recurring patterns", "automate lessons learned" (pain #3/#4) |
| 4 | **Documentation Assistant** | AI-assisted shift handover + pre-task (JSA/permit) docs. Auto-fills forms from operational data; AI completeness/quality score + suggestions. | "AI-assisted shift handover & pre-task tool", "auto-populate forms", "improve completeness" (pain #2) |
| 5 | **Predictive Maintenance Agent** | Analyzes pre-use checklist/inspection data; ML model flags equipment likely to fail; early-warning alert feed with AI-written recommended action. | "Analyse pre-use checklist data", "predictive models", "early warning alerts" (pain #4) |

Plus a **Dashboard home** tying it together with headline safety KPIs.

---

## Tech Stack

- **Backend:** Python 3.11, FastAPI, Uvicorn, Pydantic. Azure OpenAI via `openai` SDK (`AzureOpenAI`). `pandas` + `scikit-learn` for analytics/ML. `python-dotenv` for env.
- **Retrieval (RAG):** In-memory vector store. **Primary:** Azure embeddings + numpy cosine. **Fallback:** scikit-learn `TfidfVectorizer` cosine (auto-selected if embeddings deployment is absent/unset). Small corpus → no FAISS needed.
- **Predictive model:** scikit-learn `RandomForestClassifier` trained at startup on synthetic-but-trended equipment inspection data (degradation → failure label). Deterministic seed.
- **Frontend:** Vite + React + TypeScript, **Tailwind CSS** for fast polished UI, **Recharts** for charts, **axios** for API. Clean sidebar-nav dashboard layout, Vedanta-style branding (dark/industrial theme).
- **Config:** `.env` with the 4 provided keys + optional `AZURE_OPENAI_EMBEDDING_DEPLOYMENT`.

---

## Project Structure (files to create)

```
Vedanta/
├─ backend/
│  ├─ main.py                  # FastAPI app, CORS, router mounting, startup (load data, build index, train model)
│  ├─ config.py                # env loading, AzureOpenAI client factory
│  ├─ azure_llm.py             # chat() + embed() helpers w/ retry & graceful errors
│  ├─ rag.py                   # chunking, index build (embeddings OR tf-idf fallback), retrieve()
│  ├─ routers/
│  │  ├─ knowledge.py          # /api/knowledge/ask, /sources, /standards-watch
│  │  ├─ investigation.py      # /api/investigation/analyze
│  │  ├─ intelligence.py       # /api/intelligence/stats, /patterns, /lessons
│  │  ├─ documentation.py      # /api/docs/handover, /pretask, /score
│  │  └─ predictive.py         # /api/predict/equipment, /alerts
│  ├─ services/
│  │  ├─ data_loader.py        # load all dummy datasets into memory
│  │  ├─ analytics.py          # pandas aggregations, clustering for recurring patterns
│  │  └─ predictor.py          # train + score RandomForest
│  ├─ data/                    # generated dummy data (see below)
│  ├─ requirements.txt
│  └─ .env.example
├─ frontend/
│  ├─ src/
│  │  ├─ App.tsx, main.tsx, index.css (Tailwind)
│  │  ├─ api/client.ts         # axios instance
│  │  ├─ components/           # Sidebar, KpiCard, ChartCard, ChatBox, SourceCard, AlertItem
│  │  └─ pages/                # Dashboard, Knowledge, Investigation, Intelligence, Documentation, Predictive
│  ├─ package.json, vite.config.ts, tailwind.config.js, index.html
├─ scripts/
│  └─ generate_data.py         # one-shot synthetic data generator (SOPs, incidents, inspections)
└─ README.md                   # how to run both servers
```

---

## Dummy Data to Generate (`scripts/generate_data.py` → `backend/data/`)

- **SOPs (6–8 markdown files):** Confined Space Entry, Lockout-Tagout (LOTO), Working at Height, Hot Work / Molten Metal Handling, Crane & Lifting Ops, Electrical Isolation, Hazardous Energy. Each: purpose, scope, critical controls, step-by-step, PPE, referenced standard+version.
- **Risk assessments / JSAs:** 1 per SOP (hazard, risk rating, controls).
- **Critical controls register:** ICMM-style critical controls with verification checks.
- **Standards registry:** standard name, current version, SOP last-reviewed version (some intentionally stale → drives standards-watch).
- **Incidents dataset (`incidents.csv`, ~120 rows):** date, site (Jharsuguda/Lanjigarh/Korba/etc.), area, type (slip/fall, LOTO bypass, burn, crane, electrical…), severity, equipment, root cause, narrative. Seeded with deliberate recurring clusters (e.g., repeated LOTO bypasses) so Intelligence agent finds patterns.
- **Near-misses (`near_misses.csv`, ~80 rows).**
- **Equipment inspections (`inspections.csv`):** per-equipment time series of pre-use checklist readings (vibration, temp, hours, defects flagged) with a trended degradation signal and failure labels for ML.

---

## Backend Design Notes

- **`azure_llm.py`:** single `chat(messages, system=...)` and `embed(texts)`; both read deployment names from env; `embed()` returns `None`/raises → caller falls back. Wrap calls with light retry + clear error surfaced to UI.
- **`rag.py`:** on startup, chunk SOP/RA/control docs (~500 tokens, overlap). Build embedding matrix if `embed()` works on a probe call; else build TF-IDF matrix. `retrieve(query, k)` returns top-k chunks with source metadata for citations. `knowledge.ask` = retrieve → stuff context → `chat()` with a grounded "answer only from context, cite sources, say if unknown" system prompt.
- **`analytics.py`:** pandas groupbys for trends/hotspots; recurring patterns via TF-IDF + KMeans (or rule grouping by type+rootcause) over incident narratives; `lessons` calls LLM per cluster to write a Lessons-Learned card.
- **`predictor.py`:** train `RandomForestClassifier` on inspection features at startup (fixed `random_state`); `/predict/equipment` returns per-equipment failure probability + risk band; `/alerts` = items over threshold, each enriched with an LLM-written recommended action.
- **CORS** open to the Vite dev origin.

## Frontend Design Notes

- **Layout:** left sidebar (logo + 6 nav items), top bar, content area. Industrial dark theme, accent color, rounded cards.
- **Dashboard:** KPI cards (incidents MTD, near-miss ratio, open alerts, SOP coverage), trend chart, recent alerts, recent lessons.
- **Knowledge:** chat UI; answers render with expandable **source cards** (SOP name + snippet); side panel "Standards Watch" listing stale SOPs.
- **Investigation:** form (incident details) → structured AI result (root cause, 5-Whys, factors, recommended controls) in a printable card.
- **Intelligence:** charts (by type/site/severity/time), recurring-pattern list, auto Lessons-Learned cards.
- **Documentation:** tabs for Shift Handover & Pre-Task; "Auto-fill from operations" button; AI completeness score gauge + suggestions.
- **Predictive:** equipment risk table (sortable by probability), risk-band badges, alert feed with recommended actions, a degradation trend chart per selected equipment.

---

## 3-Day Build Schedule

- **Day 1 — Foundation + flagship.** Scaffold backend & frontend; `config`/`azure_llm` with embeddings probe + fallback; `scripts/generate_data.py` → all datasets; RAG index; **Knowledge Agent** end-to-end (API + chat UI + sources + standards-watch); Dashboard shell.
- **Day 2 — Data agents.** Analytics service; **Incident Intelligence** (charts, patterns, lessons) + **Investigation Assistant**; **Documentation Assistant** (handover/pre-task + auto-fill + scoring). Wire Dashboard KPIs to real aggregates.
- **Day 3 — Predictive + polish.** Train predictor; **Predictive Maintenance** (table, alerts, trend chart); theming/branding pass, empty/error/loading states, README run instructions, end-to-end rehearsal of the demo script.

---

## Risks & Mitigations

- **No embeddings deployment** → TF-IDF fallback already designed; corpus is small so quality stays good.
- **Time overrun** → Agents are independent; priority order = Knowledge → Intelligence → Documentation → Predictive → Investigation. Each is demoable standalone.
- **LLM latency/cost in demo** → cache repeated calls (e.g., lessons-learned) to JSON; show loading states.
- **Azure rate limits** → light retry/backoff in `azure_llm.py`.

---

## Verification

1. **Backend:** `cd backend && pip install -r requirements.txt && python scripts/../scripts/generate_data.py` (generate data), then `uvicorn main:app --reload`. Hit `http://localhost:8000/docs` and exercise each endpoint; confirm Azure key works via a `/api/knowledge/ask` probe, and confirm the embeddings-vs-tfidf path chosen is logged at startup.
2. **Frontend:** `cd frontend && npm install && npm run dev` → open `http://localhost:5173`. Walk all 6 pages.
3. **End-to-end demo rehearsal (the real acceptance test):**
   - Knowledge: ask "What are the critical controls for confined space entry?" → grounded answer with SOP citations; Standards Watch shows a stale SOP.
   - Investigation: submit a sample incident → structured root-cause output.
   - Intelligence: charts render; a recurring LOTO pattern is surfaced; a Lessons-Learned card generates.
   - Documentation: generate a shift handover, auto-fill, get a completeness score.
   - Predictive: equipment table shows risk bands; at least one early-warning alert with a recommended action.
4. **Resilience:** unset `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` and confirm RAG still answers (TF-IDF path).
