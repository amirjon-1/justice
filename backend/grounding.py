"""
grounding.py — Mathematical cosine-similarity grounding verifier for JusticeMap.

Replaces the LLM-based hallucination guard with a local, zero-latency
mathematical check. No API call needed.

Uses the same all-MiniLM-L6-v2 model as the RAG pipeline.
A claim is "verified" if its max cosine similarity to any source chunk >= THRESHOLD.
"""

import logging
import re

import numpy as np
from sentence_transformers import SentenceTransformer, util

logger = logging.getLogger(__name__)

THRESHOLD = 0.70
_model = SentenceTransformer("all-MiniLM-L6-v2")


def _split_sentences(text: str) -> list[str]:
    """Split text into non-trivial sentences."""
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [s.strip() for s in parts if len(s.strip()) > 20]


def compute_grounding_score(
    claims: list[str],
    source_chunks: list[str],
    threshold: float = THRESHOLD,
) -> dict:
    """
    For each claim, compute cosine similarity against every source chunk.
    Take the max similarity per claim as its grounding score.
    Average across all claims for overall confidence.

    A claim is "verified" if its max cosine sim >= threshold.

    Returns:
    {
      "overall_confidence": 0.91,
      "claim_scores": [
        {"claim": "...", "best_match_chunk": "...", "score": 0.94, "verified": True},
        ...
      ],
      "unverified_claims": ["..."],
      "threshold": 0.70,
      "statute_scores": {}   # populated separately by score_statutes()
    }
    """
    if not claims or not source_chunks:
        logger.warning("Grounding: empty claims or chunks — returning neutral score")
        return {
            "overall_confidence": 0.5,
            "claim_scores": [],
            "unverified_claims": [],
            "threshold": threshold,
            "statute_scores": {},
        }

    claim_embeddings = _model.encode(claims, convert_to_tensor=True, show_progress_bar=False)
    chunk_embeddings = _model.encode(source_chunks, convert_to_tensor=True, show_progress_bar=False)

    claim_scores = []
    raw_scores = []
    unverified_claims = []

    for claim, claim_emb in zip(claims, claim_embeddings):
        sims = util.cos_sim(claim_emb, chunk_embeddings)[0]  # shape: [n_chunks]
        best_idx = int(sims.argmax())
        best_score = float(sims[best_idx])
        verified = best_score >= threshold

        claim_scores.append({
            "claim": claim,
            "best_match_chunk": source_chunks[best_idx][:300],
            "score": round(best_score, 3),
            "verified": verified,
        })
        raw_scores.append(best_score)
        if not verified:
            unverified_claims.append(claim)

    overall_confidence = round(float(np.mean(raw_scores)), 3) if raw_scores else 0.5
    logger.info(
        f"Grounding: {len(claims)} claims, "
        f"overall={overall_confidence:.2f}, "
        f"unverified={len(unverified_claims)}"
    )

    return {
        "overall_confidence": overall_confidence,
        "claim_scores": claim_scores,
        "unverified_claims": unverified_claims,
        "threshold": threshold,
        "statute_scores": {},
    }


def score_statutes(statutes: list[dict], source_chunks: list[str]) -> dict[str, float]:
    """
    Compute a match score for each statute against source chunks.
    Key = "Name Section" string (same key used by TheLawsTab for lookup).
    Returns {statute_key: score}.
    """
    if not statutes or not source_chunks:
        return {}

    excerpts = [
        f"{s.get('name', '')} {s.get('section', '')} {s.get('excerpt', '')}".strip()
        for s in statutes
    ]
    excerpt_embeddings = _model.encode(excerpts, convert_to_tensor=True, show_progress_bar=False)
    chunk_embeddings = _model.encode(source_chunks, convert_to_tensor=True, show_progress_bar=False)

    scores: dict[str, float] = {}
    for statute, emb in zip(statutes, excerpt_embeddings):
        sims = util.cos_sim(emb, chunk_embeddings)[0]
        best_score = round(float(sims.max()), 3)
        key = f"{statute.get('name', '')} {statute.get('section', '')}".strip()
        scores[key] = best_score

    return scores
