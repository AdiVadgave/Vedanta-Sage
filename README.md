# 🛡️ Sage — AI-Enabled Safety Agents

> Built for **Vedanta** to eliminate the *safety execution gap* — putting guidance,
> intelligence, and early warnings at the point of work.

Sage is a suite of **five AI Safety Agents** wrapped in a polished web console,
powered by **Azure OpenAI** over realistic Vedanta-style safety data.

| # | Agent | Pain point it solves |
|---|-------|----------------------|
| 1 | **Knowledge & Search** | Safety info not accessible at the point of work |
| 2 | **Incident Investigation** | Inconsistent / shallow investigations |
| 3 | **Incident Intelligence** | Recurring incidents without systemic learning |
| 4 | **Documentation Assistant** | Inconsistently completed safety documentation |
| 5 | **Predictive Maintenance** | Underutilised inspection data |

Plus a **Safety Command Centre** dashboard tying it all together.

---

## Architecture

```
Sage/
├─ backend/      FastAPI · Azure OpenAI · pandas · scikit-learn
│  ├─ rag.py            RAG (Azure embeddings → TF-IDF fallback)
│  ├─ services/         analytics, predictor (RandomForest), data_loader
│  ├─ routers/          one router per agent
│  ├─ data/             generated demo data (SOPs, incidents, inspections)
│  └─ scripts/generate_data.py
└─ frontend/     Vite · React · TypeScript · Tailwind · Recharts · Framer Motion
```

The retrieval layer auto-selects **Azure embeddings** when an embeddings
deployment is configured, and transparently falls back to **TF-IDF** otherwise —
so the demo always works.

---

## Quick start

### 1. Configure Azure OpenAI

Edit `backend/.env` and fill in your four credentials:

```env
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=<your-chat-deployment>
AZURE_OPENAI_API_VERSION=2024-08-01-preview
# optional — enables vector search; leave blank to use TF-IDF
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=
```

> The app runs **without** keys too — it gracefully degrades (returns retrieved
> SOP extracts and template responses) so you can always demo the UI.

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
python scripts/generate_data.py     # generate demo data (already done once)
python -m uvicorn main:app --reload --port 8000
```

API docs: <http://localhost:8000/docs> · health: <http://localhost:8000/api/status>

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The dev server proxies `/api` → `localhost:8000`.

---

## Demo script (5 minutes)

1. **Dashboard** — animated KPIs, incident trend, high-risk equipment, top recurring patterns.
2. **Knowledge** — ask *"What are the critical controls for confined space entry?"* →
   grounded answer with citations. Note **Standards Watch** flagging 4 outdated SOPs.
3. **Investigation** — run the pre-filled conveyor incident → structured 5-Why,
   failed controls, root cause, corrective actions.
4. **Intelligence** — explore charts, click a recurring pattern → AI generates a
   **Lessons Learned** bulletin.
5. **Documentation** — Auto-fill a shift handover from operations → Generate → Score quality.
6. **Predictive** — equipment risk ranking, sensor trends, model drivers, and
   early-warning alerts with AI-recommended actions.

---

## Notes

- All data is **synthetic** and deterministic (fixed seed). Regenerate anytime with
  `python scripts/generate_data.py`.
- Recurring patterns and equipment degradation are deliberately seeded so the
  Intelligence and Predictive agents have real signal to surface.
- LLM responses are cached in-process (lessons, alert actions) for fast, low-cost demos.
