# JusticeMap ⚖️

**AI-powered legal rights assistant for urban communities**

Built for the UN SDG Hackathon targeting:
- 🏙️ **SDG 11** — Sustainable Cities and Communities
- ⚖️ **SDG 16** — Peace, Justice and Strong Institutions

---

## What It Does

A user describes their urban legal problem (bad landlord, eviction, unsafe housing, police misconduct, denied permits), selects their city, and JusticeMap:

1. **Retrieves relevant local laws** using a two-stage RAG pipeline (bi-encoder retrieval → cross-encoder re-ranking) over embedded municipal legal documents
2. **Queries Wolfram Alpha** for real city statistics (median income, rent, population)
3. **Passes everything to Claude** to reason over law + stats → structured legal analysis
4. **Runs a hallucination guard** (second Claude call) to verify all citations are grounded in source documents
5. **Generates a formal demand letter** the user can send immediately

---

## Architecture

```
frontend/          React + TypeScript + Tailwind CSS
backend/
  main.py          FastAPI app (POST /analyze)
  rag.py           Two-stage RAG: ChromaDB bi-encoder + CrossEncoder re-ranker
  wolfram.py       Wolfram Alpha Short Answers API
  claude_agent.py  Claude analysis + hallucination guard
  seed_legal_docs.py  Index legal docs into ChromaDB
  scraper.py       Web scraper (Justia.com real legal text)
  legal_docs/      Bundled legal text files (NYC, Chicago, LA, Federal)
```

---

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- API keys: [Anthropic](https://console.anthropic.com/) + [Wolfram Alpha](https://developer.wolframalpha.com/) (optional)

---

### Quick Start (Recommended)

```bash
# 1. Clone / navigate to the project
cd justiceMap

# 2. Add your API keys to backend/.env
cp backend/.env.example backend/.env
# Edit backend/.env — add ANTHROPIC_API_KEY and WOLFRAM_APP_ID

# 3. Start the backend (creates venv, installs deps, seeds DB, starts server)
./start.sh

# 4. In a new terminal, start the frontend
cd frontend
npm install
npm start
```

Open http://localhost:3000

---

### Manual Setup

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# (Optional) Scrape real legal content from Justia.com
python scraper.py

# Index legal documents into ChromaDB (required before first run)
python seed_legal_docs.py

# Start the API server
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

---

## API Keys

| Key | Required | Purpose | Get It |
|-----|----------|---------|--------|
| `ANTHROPIC_API_KEY` | ✅ Required | Legal analysis + hallucination guard | [console.anthropic.com](https://console.anthropic.com/) |
| `WOLFRAM_APP_ID` | Optional | City statistics | [developer.wolframalpha.com](https://developer.wolframalpha.com/) |

Set them in `backend/.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
WOLFRAM_APP_ID=XXXX-XXXX
```

---

## Features

### Two-Stage RAG Pipeline
- **Stage 1:** ChromaDB bi-encoder retrieval (all-MiniLM-L6-v2) → 20 candidates
- **Stage 2:** CrossEncoder re-ranking (ms-marco-MiniLM-L-6-v2) → top 5 results
- City-filtered search with global fallback

### Hallucination Guard
After generating the legal analysis, a second Claude call verifies every citation:
- ✅ **Verified citations:** Found in retrieved source documents
- ⚠️ **Unverified citations:** Not found in sources (may still be accurate — verify independently)
- **Confidence score:** 0–100% showing what fraction of citations are grounded

### Legal Documents Covered
| File | City | Content |
|------|------|---------|
| `nyc_tenant_rights.txt` | NYC | Admin Code §27-2029, HPD process, warranty of habitability, RPAPL §755 |
| `chicago_tenant_rights.txt` | Chicago | RLTO §5-12-110, repair-and-deduct, rent withholding, retaliation protections |
| `la_tenant_rights.txt` | LA | RSO, LAHD, just cause eviction, AB 1482, anti-harassment |
| `general_housing_rights.txt` | Federal | Fair Housing Act, warranty of habitability, Section 8 / HCV |
| `police_accountability.txt` | Federal | First Amendment recording rights, §1983 municipal liability, FOIA |

### Real Data Scraping
Run `python scraper.py` to fetch real legal text from Justia.com (Illinois Ch. 765, NY Admin Code, California Civil Code). Scraped files are stored in `legal_docs/scraped/` and automatically picked up by the seeder.

---

## API Reference

**POST `/analyze`**

Request:
```json
{
  "city": "New York City",
  "problem": "My landlord hasn't fixed my heat for 3 weeks"
}
```

Response:
```json
{
  "legal_analysis": "...",
  "relevant_laws": ["NYC Admin Code §27-2029...", "..."],
  "wolfram_stats": {
    "median_income": "...",
    "median_rent": "...",
    "population": "..."
  },
  "demand_letter": "...",
  "severity": "high",
  "recommended_actions": ["..."],
  "estimated_timeline": "...",
  "confidence_score": 0.94,
  "verified_citations": ["..."],
  "unverified_citations": [],
  "source_urls": ["..."]
}
```

Supported cities: `New York City`, `Chicago`, `Los Angeles`, `General`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS 3 |
| Backend | Python 3.10+, FastAPI, uvicorn |
| AI | Anthropic Claude (claude-sonnet-4-6) |
| Vector DB | ChromaDB (local persistent) |
| Embeddings | sentence-transformers all-MiniLM-L6-v2 |
| Re-ranking | cross-encoder/ms-marco-MiniLM-L-6-v2 |
| Statistics | Wolfram Alpha Short Answers API |

---

## Project Structure

```
justiceMap/
├── start.sh                    # One-command startup script
├── README.md
├── backend/
│   ├── main.py                 # FastAPI app
│   ├── rag.py                  # Two-stage RAG pipeline
│   ├── wolfram.py              # Wolfram Alpha integration
│   ├── claude_agent.py         # Claude + hallucination guard
│   ├── seed_legal_docs.py      # Document indexing script
│   ├── scraper.py              # Real legal text scraper
│   ├── requirements.txt
│   ├── .env.example
│   └── legal_docs/
│       ├── nyc_tenant_rights.txt
│       ├── chicago_tenant_rights.txt
│       ├── la_tenant_rights.txt
│       ├── general_housing_rights.txt
│       └── police_accountability.txt
└── frontend/
    ├── package.json
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── public/index.html
    └── src/
        ├── App.tsx
        ├── api.ts
        ├── types.ts
        ├── index.tsx
        ├── index.css
        └── components/
            ├── QueryForm.tsx
            ├── ResultsPanel.tsx
            ├── StatsCard.tsx
            ├── DemandLetter.tsx
            └── LoadingSpinner.tsx
```

---

## Disclaimer

JusticeMap provides **legal information and education**, not legal advice. Always consult a licensed attorney for serious legal matters. Many cities offer free legal aid — see the "Recommended Actions" section in each analysis.
