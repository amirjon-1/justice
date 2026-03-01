"""
claude_agent.py — Three-agent Groq pipeline for JusticeMap.

Agent 1 — IntakeAgent:    Extract structured facts + optimized RAG queries
Agent 2 — ResearchAgent:  Structure retrieved law chunks into formal statutes
Agent 3 — AnalysisAgent:  Legal analysis + plain-English summary + actions
Agent 4 — LetterAgent:    Formal demand letter

Hallucination checking is now handled by grounding.py (cosine similarity),
not by a separate LLM agent.

All agents accept a `language` parameter and produce output in the detected
language of the user's input.
"""

import json
import logging
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import date

from groq import Groq
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
MODEL = "llama-3.3-70b-versatile"

client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


# ── Language helpers ──────────────────────────────────────────────────────────

def _language_instruction(language: str) -> str:
    """Append to any system prompt to enforce output language."""
    if language.lower() in ("english", "en", ""):
        return ""
    return (
        f"\n\nIMPORTANT: Respond in {language} language. "
        f"The user's input was detected as {language}. "
        f"Keep all JSON keys in English, but write all natural language values "
        f"(legal_analysis, plain_english_summary, recommended_actions step/explanation "
        f"text, demand_letter, non_issue_reason) in {language}."
    )


# ── Internal helper ──────────────────────────────────────────────────────────

def _call_groq(system: str, user: str, max_tokens: int = 1024, temperature: float = 0.2) -> dict | str:
    """Call Groq with JSON mode. Returns parsed dict."""
    if not client:
        raise ValueError("GROQ_API_KEY is not set. Add it to backend/.env")
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=max_tokens,
        temperature=temperature,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)


# ── Agent 1: Intake ──────────────────────────────────────────────────────────

INTAKE_SYSTEM = """You are a legal intake specialist for an urban legal aid service.
Your first job is to determine whether the user actually has a legal issue that warrants legal action.
Be honest and calibrated — most everyday frustrations are NOT legal issues.
Respond with valid JSON only."""

def run_intake_agent(problem: str, city: str, language: str = "English") -> dict:
    """
    Extract structured facts from the user's raw description.
    Returns optimized search_queries for the RAG pipeline.
    Includes is_actionable_legal_issue flag to detect non-issues early.
    """
    logger.info("Agent 1 — Intake: processing user problem")
    prompt = f"""CITY: {city}
USER PROBLEM: {problem}

First, critically assess whether this is an actual legal issue requiring legal intervention.

EXAMPLES OF NOT-ACTIONABLE situations (is_actionable_legal_issue = false):
- "My landlord didn't respond to my text in 2 minutes / 2 hours / same day"
- "My neighbor was rude to me"
- "My landlord hasn't called me back yet today"
- "I asked my landlord to fix something and they said they'd look into it"
- "My package was delivered late"
- Normal communication delays (less than 24 hours for non-emergency)
- First/single occurrence of a minor inconvenience

EXAMPLES OF ACTIONABLE legal issues (is_actionable_legal_issue = true):
EMERGENCY CONDITIONS — actionable immediately, regardless of response time or duration:
- Building flooded / active water damage / burst pipe
- Gas leak or fire damage
- No heat or hot water in cold weather (ANY duration — it is immediately a habitability issue)
- Structural damage making unit unsafe
- No electricity, sewage backup, or other conditions making unit uninhabitable
- Mold visible and spreading
Ongoing violations:
- Received formal eviction notice or lockout
- Landlord refused to make repairs for 7+ days after written notice
- Police misconduct, wrongful arrest, excessive force
- Housing code violations documented over multiple days
- Security deposit withheld without reason after move-out
- Discrimination based on protected class
- Landlord entering unit without proper notice

IMPORTANT: Do NOT dismiss something as non-actionable just because the person hasn't described a long duration. Emergency habitability conditions (flooding, no heat, gas leaks, sewage) are legally actionable the moment they occur.

Return JSON with these exact fields:
{{
  "is_actionable_legal_issue": true or false,
  "non_issue_reason": "If false: a brief, empathetic explanation of why this isn't a legal issue yet and what threshold WOULD make it one. Empty string if true.",
  "issue_type": "one of: housing|eviction|police|permits|discrimination|employment|consumer|immigration|business|infrastructure|civil_rights|noise|benefits|education|other",
  "urgency": "one of: immediate|this_week|general|not_applicable",
  "key_facts": ["specific fact extracted from the problem", "another fact"],
  "likely_violations": ["specific law or right that may be violated — empty array if not actionable"],
  "search_queries": [
    "optimized legal database query 1 — use legal terminology",
    "optimized legal database query 2",
    "optimized legal database query 3"
  ]
}}

For search_queries: write 2-3 queries that will best retrieve relevant municipal laws.
Use legal terms. Example: instead of "no heat" use "minimum heating temperature requirements landlord obligations tenant rights".
If not actionable, still write reasonable queries in case the situation escalates."""

    system_with_lang = INTAKE_SYSTEM + _language_instruction(language)
    try:
        result = _call_groq(system_with_lang, prompt, max_tokens=768, temperature=0.1)
        result.setdefault("is_actionable_legal_issue", True)
        result.setdefault("non_issue_reason", "")
        result.setdefault("search_queries", [problem])
        result.setdefault("issue_type", "housing")
        result.setdefault("urgency", "general")
        result.setdefault("key_facts", [])
        result.setdefault("likely_violations", [])
        logger.info(
            f"  actionable={result['is_actionable_legal_issue']}, "
            f"issue_type={result['issue_type']}, urgency={result['urgency']}"
        )
        return result
    except Exception as e:
        logger.error(f"IntakeAgent failed: {e}")
        return {
            "is_actionable_legal_issue": True,
            "non_issue_reason": "",
            "issue_type": "housing",
            "urgency": "general",
            "key_facts": [problem[:200]],
            "likely_violations": [],
            "search_queries": [problem],
        }


# ── Agent 2: Research ────────────────────────────────────────────────────────

RESEARCH_SYSTEM = """You are a municipal law researcher specializing in urban tenant rights,
civil rights, and housing law. Given raw law document excerpts, identify the most applicable
statutes and structure them formally. Respond with valid JSON only."""

def run_research_agent(law_chunks: list[str], intake: dict, city: str, language: str = "English") -> dict:
    """
    Structure retrieved law chunks into formal statute references.
    """
    logger.info(f"Agent 2 — Research: structuring {len(law_chunks)} law chunks")
    if not law_chunks:
        return {
            "relevant_statutes": [],
            "precedents": [],
            "jurisdiction_notes": f"No specific {city} statutes retrieved. General federal law applies.",
        }

    chunks_block = "\n\n---\n\n".join(
        f"[EXCERPT {i+1}]\n{chunk[:800]}" for i, chunk in enumerate(law_chunks[:8])
    )
    prompt = f"""CITY: {city}
ISSUE TYPE: {intake.get('issue_type', 'housing')}
KEY FACTS: {json.dumps(intake.get('key_facts', []))}
LIKELY VIOLATIONS: {json.dumps(intake.get('likely_violations', []))}

RETRIEVED LAW EXCERPTS:
{chunks_block}

Identify the most relevant statutes from these excerpts. Return JSON:
{{
  "relevant_statutes": [
    {{
      "name": "Official law name (e.g., NYC Housing Maintenance Code)",
      "section": "Specific section number (e.g., §27-2029)",
      "excerpt": "The specific text from the excerpt that directly applies (1-2 sentences)",
      "applicability_score": 0.95,
      "source_url": "URL if mentioned in the excerpt, else empty string"
    }}
  ],
  "precedents": ["Relevant enforcement context or case pattern from the excerpts"],
  "jurisdiction_notes": "City-specific enforcement context or notable local provisions"
}}

Only include statutes actually present in the excerpts. Max 5 statutes."""

    system_with_lang = RESEARCH_SYSTEM + _language_instruction(language)
    try:
        result = _call_groq(system_with_lang, prompt, max_tokens=1024, temperature=0.2)
        result.setdefault("relevant_statutes", [])
        result.setdefault("precedents", [])
        result.setdefault("jurisdiction_notes", "")
        logger.info(f"  found {len(result['relevant_statutes'])} relevant statutes")
        return result
    except Exception as e:
        logger.error(f"ResearchAgent failed: {e}")
        return {"relevant_statutes": [], "precedents": [], "jurisdiction_notes": ""}


# ── Agent 3: Analysis ────────────────────────────────────────────────────────

ANALYSIS_SYSTEM = """You are a senior legal rights analyst specializing in urban tenant rights,
civil rights, and housing law. You are calibrated and honest — you only flag real legal concerns,
not everyday frustrations. You cite exact statute numbers. Respond with valid JSON only."""

def run_analysis_agent(
    research: dict,
    intake: dict,
    wolfram_stats: dict,
    city: str,
    language: str = "English",
) -> dict:
    """
    Generate the main legal analysis, plain-English summary, and recommended actions.
    """
    logger.info("Agent 3 — Analysis: generating legal analysis")
    today = date.today().strftime("%B %d, %Y")
    statutes_block = json.dumps(research.get("relevant_statutes", []), indent=2)
    prompt = f"""CITY: {city}
DATE: {today}

USER SITUATION:
- Issue type: {intake.get('issue_type', 'housing')}
- Urgency: {intake.get('urgency', 'general')}
- Key facts: {json.dumps(intake.get('key_facts', []))}
- Potential violations: {json.dumps(intake.get('likely_violations', []))}

RELEVANT STATUTES (from legal database):
{statutes_block}

JURISDICTION NOTES: {research.get('jurisdiction_notes', '')}

CITY ECONOMIC DATA:
- Median household income: {wolfram_stats.get('median_income', 'N/A')}
- Median monthly rent: {wolfram_stats.get('median_rent', 'N/A')}
- Population: {wolfram_stats.get('population', 'N/A')}

SEVERITY DEFINITIONS (use these strictly — do not exaggerate):
- "high": Immediate health/safety/housing risk requiring action TODAY.
  Examples: No heat in winter for 48h+, emergency eviction within 5 days, active police misconduct, unit rendered uninhabitable.
- "medium": Real ongoing rights violation requiring action this week.
  Examples: Landlord ignored repair request for 7+ days after written notice, security deposit withheld without reason, documented retaliation, repeated code violations.
- "low": A real issue exists but no urgency — standard process applies.
  Examples: First written repair request not yet overdue, general landlord dispute early in process, seeking information about rights, minor lease disagreement.

Return JSON:
{{
  "legal_analysis": "2-3 substantive paragraphs. Para 1: which laws apply and why. Para 2: how they specifically apply to this specific situation with exact section references. Para 3: the user's strongest legal position and any urgency factors.",
  "plain_english_summary": "1 short paragraph in plain language a non-lawyer can fully understand. No jargon. Focus on what the person can DO right now.",
  "severity": "high|medium|low — use the definitions above; do not inflate",
  "recommended_actions": [
    {{
      "step": "Short action title",
      "explanation": "1-2 sentences: exactly what to do, who to call, what to say",
      "timeline": "Today|Within 24 hours|Within 7 days|Within 30 days"
    }}
  ],
  "estimated_resolution": "Realistic timeline, e.g., 'Heat complaints resolved in 1-3 weeks via HPD; court proceedings 2-6 months if needed'"
}}

Provide 3-5 recommended actions. Be specific — include phone numbers and agency names from the statutes.
IMPORTANT: Match severity to the actual facts. A landlord not responding to a single text is NOT high or medium severity."""

    system_with_lang = ANALYSIS_SYSTEM + _language_instruction(language)
    try:
        result = _call_groq(system_with_lang, prompt, max_tokens=2048, temperature=0.3)
        result.setdefault("legal_analysis", "")
        result.setdefault("plain_english_summary", "")
        result.setdefault("severity", "medium")
        result.setdefault("recommended_actions", [])
        result.setdefault("estimated_resolution", "")
        logger.info(f"  severity={result['severity']}, actions={len(result['recommended_actions'])}")
        return result
    except Exception as e:
        logger.error(f"AnalysisAgent failed: {e}")
        return {
            "legal_analysis": "Analysis unavailable. Please try again.",
            "plain_english_summary": "Please consult a local legal aid organization.",
            "severity": "medium",
            "recommended_actions": [{"step": "Contact legal aid", "explanation": "Reach out to your local legal aid organization.", "timeline": "Today"}],
            "estimated_resolution": "Unknown",
        }


# ── Agent 4a: Letter ─────────────────────────────────────────────────────────

LETTER_SYSTEM = """You are a paralegal who writes firm, professional demand letters for urban residents
asserting their legal rights. Letters are formal, cite specific statutes, and give clear deadlines.
Respond with valid JSON only."""

def run_letter_agent(
    analysis: dict,
    research: dict,
    intake: dict,
    city: str,
    language: str = "English",
) -> str:
    """
    Generate a complete formal demand letter.
    Returns the letter text as a string.
    """
    logger.info("Agent 4a — Letter: generating demand letter")
    today = date.today().strftime("%B %d, %Y")
    statutes = [
        f"{s.get('name','')} {s.get('section','')}".strip()
        for s in research.get("relevant_statutes", [])
    ]
    actions_summary = "; ".join(
        a.get("step", "") for a in analysis.get("recommended_actions", [])[:3]
    )
    prompt = f"""Write a formal demand letter for this situation.

CITY: {city}
DATE: {today}
ISSUE TYPE: {intake.get('issue_type', 'housing')}
KEY FACTS: {json.dumps(intake.get('key_facts', []))}
RELEVANT STATUTES: {json.dumps(statutes)}
SEVERITY: {analysis.get('severity', 'medium')}
RECOMMENDED RESOLUTION: {actions_summary}

Return JSON:
{{
  "demand_letter": "Complete formal letter text. Format:\n\n[YOUR NAME]\\n[YOUR ADDRESS]\\n[CITY, STATE, ZIP]\\n[EMAIL] | [PHONE]\\n\\n{today}\\n\\n[LANDLORD / INSTITUTION NAME]\\n[ADDRESS]\\n\\nRe: [SUBJECT - specific to situation]\\n\\nDear [RECIPIENT],\\n\\n[Opening paragraph stating the problem factually]\\n\\n[Second paragraph: cite specific statutes and what they require]\\n\\n[Third paragraph: formal demand with 7-day deadline]\\n\\n[Closing: state consequences if ignored - 311 complaint, legal action, rent withholding]\\n\\nSincerely,\\n[YOUR NAME]\\n\\ncc: [Relevant agency, e.g., NYC HPD / Chicago Department of Buildings]"
}}

Write the FULL letter — not a template summary. Include all paragraphs. The letter should be ready to send after filling in the bracketed placeholders."""

    system_with_lang = LETTER_SYSTEM + _language_instruction(language)
    try:
        result = _call_groq(system_with_lang, prompt, max_tokens=2048, temperature=0.2)
        letter = result.get("demand_letter", "")
        logger.info(f"  letter length: {len(letter)} chars")
        return letter
    except Exception as e:
        logger.error(f"LetterAgent failed: {e}")
        return ""


# ── Backward-compat wrapper (called by main.py indirectly) ───────────────────

def analyze_legal_situation(
    problem: str,
    city: str,
    relevant_laws: list[str],
    wolfram_stats: dict,
) -> dict:
    """
    Legacy wrapper — main.py handles orchestration directly.
    Kept for import compatibility. Grounding is handled externally.
    """
    from grounding import compute_grounding_score, score_statutes
    import re

    intake = run_intake_agent(problem, city)
    research = run_research_agent(relevant_laws, intake, city)
    analysis = run_analysis_agent(research, intake, wolfram_stats, city)
    letter = run_letter_agent(analysis, research, intake, city)

    sentences = re.split(r"(?<=[.!?])\s+", analysis.get("legal_analysis", ""))
    claims = [s.strip() for s in sentences if len(s.strip()) > 20]
    grounding = compute_grounding_score(claims, relevant_laws)
    grounding["statute_scores"] = score_statutes(research.get("relevant_statutes", []), relevant_laws)

    verified = [k for k, v in grounding["statute_scores"].items() if v >= 0.70]
    unverified = [k for k, v in grounding["statute_scores"].items() if v < 0.70]

    return {
        "intake": intake,
        "research": research,
        "analysis": analysis,
        "grounding_results": grounding,
        "demand_letter": letter,
        "legal_analysis": analysis.get("legal_analysis", ""),
        "plain_english_summary": analysis.get("plain_english_summary", ""),
        "severity": analysis.get("severity", "medium"),
        "recommended_actions": analysis.get("recommended_actions", []),
        "relevant_laws": [
            f"{s.get('name','')} {s.get('section','')}".strip()
            for s in research.get("relevant_statutes", [])
        ],
        "confidence_score": grounding["overall_confidence"],
        "verified_citations": verified,
        "unverified_citations": unverified,
        "source_urls": [],
        "agents_used": 4,
    }
