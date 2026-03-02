"""
main.py — JusticeMap FastAPI Backend (Multi-Agent Orchestrator)

Pipeline per request:
  1. Language detection (langdetect)
  2. IntakeAgent    — extract facts + optimized RAG queries
  3. Multi-query RAG — retrieve laws using intake's search_queries
  4. Wolfram Alpha  — city stats (concurrent with RAG)
  5. ResearchAgent  — structure law chunks into formal statutes
  6. AnalysisAgent  — legal analysis + recommendations
  7. LetterAgent    — demand letter
  8. Grounding verifier — cosine-similarity confidence scoring (local, no API)
  9. Escalation check — recommend legal aid orgs when appropriate

Run frontend: cd frontend && npm install && npm start
"""

import logging
import re
import time
from concurrent.futures import ThreadPoolExecutor  # still used for RAG+Wolfram parallel step

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

from claude_agent import (
    run_intake_agent,
    run_research_agent,
    run_analysis_agent,
    run_letter_agent,
)
from grounding import compute_grounding_score, score_statutes
from legal_aid import should_escalate, escalation_reason, get_legal_aid
from rag import retrieve_relevant_laws_multi
from wolfram import get_city_stats

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ── Language detection ────────────────────────────────────────────────────────

LANGUAGE_NAMES: dict[str, str] = {
    "en":    "English",
    "es":    "Spanish",
    "zh-cn": "Chinese (Simplified)",
    "zh-tw": "Chinese (Traditional)",
    "fr":    "French",
    "pt":    "Portuguese",
    "ar":    "Arabic",
    "hi":    "Hindi",
    "ko":    "Korean",
    "vi":    "Vietnamese",
    "ru":    "Russian",
    "tl":    "Filipino",
}

def detect_language(text: str) -> tuple[str, str]:
    """Returns (language_code, language_name). Defaults to English on failure."""
    try:
        from langdetect import detect
        code = detect(text)
        name = LANGUAGE_NAMES.get(code, LANGUAGE_NAMES.get(code.split("-")[0], "English"))
        return code, name
    except Exception:
        return "en", "English"


app = FastAPI(
    title="JusticeMap API",
    description="AI-powered urban legal rights assistant — UN SDG 11 & SDG 16",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPPORTED_CITIES = {"New York City", "Chicago", "Los Angeles", "General"}


class AnalyzeRequest(BaseModel):
    city: str
    problem: str

    @field_validator("city")
    @classmethod
    def validate_city(cls, v: str) -> str:
        if v not in SUPPORTED_CITIES:
            raise ValueError(f"City must be one of: {', '.join(sorted(SUPPORTED_CITIES))}")
        return v

    @field_validator("problem")
    @classmethod
    def validate_problem(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 10:
            raise ValueError("Please describe your situation in more detail.")
        if len(v) > 5000:
            raise ValueError("Description must be under 5000 characters.")
        return v


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "JusticeMap API", "version": "2.0.0"}


@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    t0 = time.perf_counter()
    print(f"[DEBUG] POST /analyze — city={request.city!r}, chars={len(request.problem)}", flush=True)
    logger.info(f"▶ POST /analyze — city={request.city!r}, chars={len(request.problem)}")

    try:
        # ── Step 1: Language detection ────────────────────────────────────────
        language_code, language_name = detect_language(request.problem)
        logger.info(f"  ✓ Language: {language_name} ({language_code})")

        # ── Step 2: Intake Agent ──────────────────────────────────────────────
        t1 = time.perf_counter()
        intake = run_intake_agent(request.problem, request.city, language=language_name)
        logger.info(f"  ✓ Intake ({time.perf_counter()-t1:.1f}s)")

        # ── Short-circuit: not an actionable legal issue ─────────────────────
        if not intake.get("is_actionable_legal_issue", True):
            total = round(time.perf_counter() - t0, 1)
            reason = intake.get("non_issue_reason", "This doesn't appear to be a legal issue yet.")
            logger.info(f"  ↩ Non-issue short-circuit ({total}s): {reason}")
            return {
                "intake": intake,
                "research": {"relevant_statutes": [], "precedents": [], "jurisdiction_notes": ""},
                "analysis": {
                    "legal_analysis": "",
                    "plain_english_summary": reason,
                    "severity": "not_applicable",
                    "recommended_actions": [],
                    "estimated_resolution": "",
                },
                "agents_used": 1,
                "demand_letter": "",
                "wolfram_stats": {},
                "source_urls": [],
                "legal_analysis": "",
                "plain_english_summary": reason,
                "severity": "not_applicable",
                "recommended_actions": [],
                "estimated_resolution": "",
                "relevant_laws": [],
                "grounding_results": {"overall_confidence": 1.0, "claim_scores": [], "unverified_claims": [], "threshold": 0.70, "statute_scores": {}},
                "confidence_score": 1.0,
                "verified_citations": [],
                "unverified_citations": [],
                "guard_flags": [],
                "jurisdiction_notes": "",
                "should_escalate": False,
                "escalation_reason": "",
                "legal_aid_orgs": [],
                "detected_language": language_name,
                "language_code": language_code,
                "processing_time_seconds": total,
            }

        # ── Step 3: Multi-query RAG + Wolfram (concurrent) ───────────────────
        t2 = time.perf_counter()
        search_queries = intake.get("search_queries", [request.problem])[:3]

        with ThreadPoolExecutor(max_workers=2) as ex:
            rag_future = ex.submit(retrieve_relevant_laws_multi, search_queries, request.city)
            wolfram_future = ex.submit(get_city_stats, request.city)

        law_docs, law_metas = rag_future.result()
        wolfram_stats = wolfram_future.result()
        logger.info(
            f"  ✓ RAG ({len(law_docs)} chunks) + Wolfram ({time.perf_counter()-t2:.1f}s)"
        )

        # ── Step 4: Research Agent ───────────────────────────────────────────
        t3 = time.perf_counter()
        research = run_research_agent(law_docs, intake, request.city, language=language_name)
        logger.info(f"  ✓ Research ({time.perf_counter()-t3:.1f}s)")

        # ── Step 5: Analysis Agent ───────────────────────────────────────────
        t4 = time.perf_counter()
        analysis = run_analysis_agent(research, intake, wolfram_stats, request.city, language=language_name)
        logger.info(f"  ✓ Analysis ({time.perf_counter()-t4:.1f}s)")

        # ── Step 6: Letter ───────────────────────────────────────────────────
        t5 = time.perf_counter()
        demand_letter = run_letter_agent(analysis, research, intake, request.city, language=language_name)
        logger.info(f"  ✓ Letter ({time.perf_counter()-t5:.1f}s)")

        # ── Step 7: Grounding verifier (local, no API) ───────────────────────
        t6 = time.perf_counter()
        sentences = re.split(r"(?<=[.!?])\s+", analysis.get("legal_analysis", ""))
        claims = [s.strip() for s in sentences if len(s.strip()) > 20]
        grounding_results = compute_grounding_score(claims, law_docs)
        grounding_results["statute_scores"] = score_statutes(
            research.get("relevant_statutes", []), law_docs
        )
        logger.info(
            f"  ✓ Grounding (confidence={grounding_results['overall_confidence']:.2f}, "
            f"{time.perf_counter()-t6:.1f}s)"
        )

        # ── Step 8: Escalation check ─────────────────────────────────────────
        severity = analysis.get("severity", "medium")
        issue_type = intake.get("issue_type", "housing")
        overall_confidence = grounding_results["overall_confidence"]

        do_escalate = should_escalate(overall_confidence, severity, issue_type)
        esc_reason = escalation_reason(overall_confidence, severity, issue_type)
        legal_aid_orgs = get_legal_aid(request.city, issue_type) if do_escalate else []
        logger.info(f"  ✓ Escalation: {do_escalate} (severity={severity}, confidence={overall_confidence:.2f})")

        # ── Build response ───────────────────────────────────────────────────
        source_urls = list({
            m.get("source_url", "")
            for m in law_metas
            if m.get("source_url")
        })
        for statute in research.get("relevant_statutes", []):
            url = statute.get("source_url", "").strip()
            if url and url not in source_urls:
                source_urls.append(url)

        relevant_laws = [
            f"{s.get('name', '')} {s.get('section', '')}".strip()
            for s in research.get("relevant_statutes", [])
        ]

        # Derive verified/unverified from grounding statute scores.
        # TF-IDF cosine similarity tops out ~0.3-0.6 for paraphrased text;
        # 0.30 is the calibrated threshold for "statute is grounded in source docs".
        statute_scores = grounding_results.get("statute_scores", {})
        verified_citations = [k for k, v in statute_scores.items() if v >= 0.30]
        unverified_citations = [k for k, v in statute_scores.items() if v < 0.30]

        total = time.perf_counter() - t0
        logger.info(f"◀ Done in {total:.1f}s — severity={severity}")

        return {
            # Agent outputs
            "intake": intake,
            "research": research,
            "analysis": analysis,
            "agents_used": 4,

            # Content fields
            "demand_letter": demand_letter,
            "wolfram_stats": wolfram_stats,
            "source_urls": source_urls,

            # Grounding (replaces LLM guard)
            "grounding_results": grounding_results,
            "confidence_score": overall_confidence,
            "verified_citations": verified_citations,
            "unverified_citations": unverified_citations,
            "guard_flags": grounding_results.get("unverified_claims", []),

            # Convenience top-level fields
            "legal_analysis": analysis.get("legal_analysis", ""),
            "plain_english_summary": analysis.get("plain_english_summary", ""),
            "severity": severity,
            "recommended_actions": analysis.get("recommended_actions", []),
            "estimated_resolution": analysis.get("estimated_resolution", ""),
            "relevant_laws": relevant_laws,
            "jurisdiction_notes": research.get("jurisdiction_notes", ""),

            # Escalation
            "should_escalate": do_escalate,
            "escalation_reason": esc_reason,
            "legal_aid_orgs": legal_aid_orgs,

            # Language
            "detected_language": language_name,
            "language_code": language_code,

            # Timing
            "processing_time_seconds": round(total, 1),
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        print(f"ANALYZE ERROR: {str(e)}", flush=True)
        print(traceback.format_exc(), flush=True)
        logger.exception(f"Pipeline error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
