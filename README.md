# JusticeMap

**AI-powered legal rights assistant for urban communities**

Built for the UN SDG Hackathon targeting:
- **SDG 11** — Sustainable Cities and Communities
- **SDG 16** — Peace, Justice and Strong Institutions

---

## What It Does

Describe your urban legal problem (bad landlord, eviction, unsafe housing, police misconduct, denied permits), select your city, and JusticeMap:

1. **Detects language** — auto-detects input language and responds in kind
2. **Runs an intake agent** — extracts key facts and generates targeted search queries
3. **Retrieves relevant local laws** via ChromaDB RAG over embedded municipal documents
4. **Queries Wolfram Alpha** for real city statistics (median income, rent, population)
5. **Structures applicable statutes** with a research agent
6. **Generates a full legal analysis** with severity rating and recommended actions
7. **Writes a formal demand letter** you can send immediately
8. **Scores confidence** via TF-IDF cosine similarity grounding (no LLM needed)
9. **Escalates to legal aid orgs** when severity or confidence warrants it

---

## Architecture

```
frontend/                     React 18, TypeScript, React Router v7
backend/
  main.py                     FastAPI app — 8-step pipeline orchestrator
  claude_agent.py             4 Groq agents (intake, research, analysis, letter)
  rag.py                      ChromaDB retrieval with ONNX embeddings
  grounding.py                TF-IDF cosine similarity confidence scoring
  wolfram.py                  Wolfram Alpha city stats
  legal_aid.py                Escalation logic + legal aid org directory
  seed_legal_docs.py          Index legal docs into ChromaDB (run before first start)
  scraper.py                  Web scraper for additional legal text
  legal_docs/                 18 bundled legal text files (NYC, Chicago, LA, Federal)
```

---

## Setup

### Prerequisites

- Python **3.11** (required — 3.12+ may conflict with ChromaDB)
- Node.js 18+
- API keys: [Groq](https://console.groq.com/) (required) + [Wolfram Alpha](https://developer.wolframalpha.com/) (optional)

---

### Backend

```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Seed the vector database (must run before starting the server)
python seed_legal_docs.py

# Start the API server
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

Open http://localhost:3000

---

## Environment Variables

Create `backend/.env`:

```
GROQ_API_KEY=gsk_...
WOLFRAM_APP_ID=XXXX-XXXX        # optional — city stats will be empty without this
```

| Variable | Required | Purpose |
|----------|----------|---------|
| `GROQ_API_KEY` | Yes | Powers all 4 LLM agents (llama-3.3-70b-versatile) |
| `WOLFRAM_APP_ID` | No | City statistics (median income, rent, population) |

---

## Deployment

**Frontend → Vercel**

Push to GitHub; import the repo in Vercel. Set the root directory to `frontend`.

**Backend → Render**

The `backend/render.yaml` is pre-configured. Render will:
1. `pip install -r requirements.txt`
2. `python seed_legal_docs.py` — builds the ChromaDB vector store at build time
3. Start `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1`

Set `GROQ_API_KEY` (and optionally `WOLFRAM_APP_ID`) as environment variables in the Render dashboard.

After deploying, set the backend URL in `frontend/.env.production`:
```
REACT_APP_API_URL=https://your-service.onrender.com
```

---

## API Reference

**GET `/health`** — liveness check

**POST `/analyze`**

```json
{
  "city": "New York City",
  "problem": "My landlord hasn't fixed my heat for 3 weeks"
}
```

Supported cities: `New York City`, `Chicago`, `Los Angeles`, `General`

Response includes:
```json
{
  "legal_analysis": "...",
  "plain_english_summary": "...",
  "severity": "high",
  "relevant_laws": ["NYC Admin Code §27-2029", "..."],
  "recommended_actions": ["..."],
  "demand_letter": "...",
  "confidence_score": 0.82,
  "verified_citations": ["..."],
  "unverified_citations": [],
  "wolfram_stats": { "median_income": "...", "median_rent": "...", "population": "..." },
  "source_urls": ["..."],
  "should_escalate": false,
  "legal_aid_orgs": [],
  "detected_language": "English",
  "processing_time_seconds": 12.4
}
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, React Router v7, framer-motion |
| Backend | Python 3.11, FastAPI, uvicorn |
| LLM | Groq — llama-3.3-70b-versatile |
| Vector DB | ChromaDB 0.4.22 (local persistent) |
| Embeddings | ONNXMiniLM_L6_V2 (no PyTorch) |
| Grounding | scikit-learn TF-IDF cosine similarity |
| Statistics | Wolfram Alpha Short Answers API |
| Hosting | Vercel (frontend) + Render free tier (backend) |

---

## Legal Documents Covered

| File | City | Content |
|------|------|---------|
| `nyc_tenant_rights.txt` | NYC | Admin Code §27-2029, HPD process, warranty of habitability |
| `nyc_business_rights.txt` | NYC | Business licensing, permits |
| `nyc_infrastructure_rights.txt` | NYC | 311, infrastructure complaints |
| `chicago_tenant_rights.txt` | Chicago | RLTO §5-12-110, repair-and-deduct, retaliation protections |
| `chicago_business_rights.txt` | Chicago | Business regulations |
| `la_tenant_rights.txt` | LA | RSO, LAHD, just cause eviction, AB 1482, anti-harassment |
| `la_business_rights.txt` | LA | Business licensing |
| `general_housing_rights.txt` | Federal | Fair Housing Act, warranty of habitability, Section 8 |
| `general_civil_rights.txt` | Federal | Civil rights protections |
| `general_employment_rights.txt` | Federal | Employment law |
| `general_discrimination.txt` | Federal | Anti-discrimination law |
| `general_consumer_rights.txt` | Federal | Consumer protections |
| `general_immigration_rights.txt` | Federal | Immigration rights |
| `general_education_rights.txt` | Federal | Education rights |
| `general_noise_nuisance.txt` | Federal | Noise and nuisance law |
| `general_public_benefits.txt` | Federal | Public benefits |
| `general_municipal_liability.txt` | Federal | §1983 municipal liability |
| `police_accountability.txt` | Federal | First Amendment recording rights, FOIA |

Run `python scraper.py` to fetch additional real legal text from Justia.com. Scraped files are stored in `legal_docs/scraped/` and automatically picked up by the seeder.

---

## Project Structure

```
justice/
├── README.md
├── .gitignore
├── vercel.json                 # Vercel root-level config
├── backend/
│   ├── main.py                 # FastAPI app (8-step pipeline)
│   ├── claude_agent.py         # 4 Groq LLM agents
│   ├── rag.py                  # ChromaDB retrieval
│   ├── grounding.py            # TF-IDF grounding verifier
│   ├── wolfram.py              # Wolfram Alpha integration
│   ├── legal_aid.py            # Escalation + legal aid directory
│   ├── seed_legal_docs.py      # Vector DB seeding script
│   ├── scraper.py              # Legal text scraper
│   ├── render.yaml             # Render deployment config
│   ├── requirements.txt
│   └── legal_docs/             # 18 bundled legal text files
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── vercel.json
    ├── .env.production         # REACT_APP_API_URL for production
    └── src/
        ├── App.tsx             # React Router routes
        ├── api.ts              # POST /analyze client
        ├── types.ts            # TypeScript interfaces
        ├── pages/
        │   ├── LandingPage.tsx
        │   ├── AnalyzePage.tsx
        │   └── AboutPage.tsx
        └── components/
            ├── Navbar.tsx
            ├── GlobeHero.tsx
            ├── AgentPipeline.tsx
            ├── LawGraph.tsx
            └── tabs/
```

---

## Disclaimer

JusticeMap provides **legal information and education**, not legal advice. Always consult a licensed attorney for serious legal matters. Many cities offer free legal aid — see the "Recommended Actions" section in each analysis.
