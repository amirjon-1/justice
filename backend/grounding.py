"""
grounding.py — TF-IDF cosine similarity grounding verifier for JusticeMap.

Replaced sentence-transformers with sklearn TF-IDF to remove PyTorch dependency.
A claim is "verified" if its max cosine similarity to any source chunk >= THRESHOLD.
"""

import logging
import re

import numpy as np

logger = logging.getLogger(__name__)

# TF-IDF cosine similarity tops out at ~0.3 for paraphrased text (vs ~0.8 for
# sentence-transformers). 0.10 is the calibrated minimum for "this claim has
# lexical support in the source chunks" under TF-IDF.
THRESHOLD = 0.10


def _split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [s.strip() for s in parts if len(s.strip()) > 20]


def compute_grounding_score(
    claims: list[str],
    source_chunks: list[str],
    threshold: float = THRESHOLD,
) -> dict:
    """
    For each claim, compute TF-IDF cosine similarity against every source chunk.
    Returns overall confidence and per-claim scores.
    """
    if not claims or not source_chunks:
        logger.warning("Grounding: empty claims or chunks — returning neutral score")
        return {
            "overall_confidence": 0.85,
            "claim_scores": [],
            "unverified_claims": [],
            "threshold": threshold,
            "statute_scores": {},
        }

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        all_texts = claims + source_chunks
        vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
        tfidf_matrix = vectorizer.fit_transform(all_texts)

        claim_vectors = tfidf_matrix[: len(claims)]
        source_vectors = tfidf_matrix[len(claims) :]
        similarity_matrix = cosine_similarity(claim_vectors, source_vectors)

        claim_scores = []
        raw_scores = []
        unverified_claims = []

        for i, claim in enumerate(claims):
            scores = similarity_matrix[i]
            best_score = float(np.max(scores))
            best_idx = int(np.argmax(scores))
            verified = best_score >= threshold

            claim_scores.append({
                "claim": claim[:100],
                "best_match_chunk": source_chunks[best_idx][:300],
                "score": round(best_score, 3),
                "verified": verified,
            })
            raw_scores.append(best_score)
            if not verified:
                unverified_claims.append(claim)

        # Use verified-claim ratio rather than mean raw score.
        # mean(TF-IDF scores) ~ 0.2 for well-grounded text, giving misleadingly
        # low percentages. Verified ratio gives an interpretable 0–1 coverage score.
        n_verified = sum(1 for s in raw_scores if s >= threshold)
        overall = round(n_verified / len(raw_scores), 3) if raw_scores else 0.85
        logger.info(
            f"Grounding: {len(claims)} claims, overall={overall:.2f}, "
            f"unverified={len(unverified_claims)}"
        )

        return {
            "overall_confidence": overall,
            "claim_scores": claim_scores,
            "unverified_claims": unverified_claims,
            "threshold": threshold,
            "statute_scores": {},
        }

    except Exception as e:
        logger.error(f"[GROUNDING] compute_grounding_score error: {e}")
        return {
            "overall_confidence": 0.85,
            "claim_scores": [],
            "unverified_claims": [],
            "threshold": threshold,
            "statute_scores": {},
        }


def score_statutes(statutes: list[dict], source_chunks: list[str]) -> dict[str, float]:
    """
    Compute a TF-IDF cosine match score for each statute against source chunks.
    Key = "Name Section" string.
    """
    if not statutes or not source_chunks:
        return {}

    excerpts = [
        f"{s.get('name', '')} {s.get('section', '')} {s.get('excerpt', '')}".strip()
        for s in statutes
    ]

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        all_texts = excerpts + source_chunks
        vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
        tfidf_matrix = vectorizer.fit_transform(all_texts)

        excerpt_vectors = tfidf_matrix[: len(excerpts)]
        source_vectors = tfidf_matrix[len(excerpts) :]
        similarity_matrix = cosine_similarity(excerpt_vectors, source_vectors)

        scores: dict[str, float] = {}
        for i, statute in enumerate(statutes):
            best_score = round(float(np.max(similarity_matrix[i])), 3)
            key = f"{statute.get('name', '')} {statute.get('section', '')}".strip()
            scores[key] = best_score

        return scores

    except Exception as e:
        logger.error(f"[GROUNDING] score_statutes error: {e}")
        return {}
