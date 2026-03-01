"""
rag.py — Bi-encoder RAG pipeline for JusticeMap.

Single-stage: numpy VectorStore bi-encoder retrieval → top 5 results.
Cross-encoder re-ranking removed to stay within Render free-tier 512MB RAM.
"""

import logging
import os

from vector_store import VectorStore

logger = logging.getLogger(__name__)

VECTOR_STORE_PATH = os.getenv("VECTOR_STORE_PATH", "./vector_db")
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# City name → metadata tag mapping
CITY_TAG_MAP = {
    "New York City": "nyc",
    "Chicago": "chicago",
    "Los Angeles": "los_angeles",
    "General": None,  # No city filter — search all documents
}

# Lazy-loaded singletons
_encoder = None
_store: VectorStore | None = None


def _get_encoder():
    global _encoder
    if _encoder is None:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading bi-encoder: {EMBEDDING_MODEL}")
        _encoder = SentenceTransformer(EMBEDDING_MODEL)
    return _encoder


def _get_store() -> VectorStore:
    global _store
    if _store is None:
        _store = VectorStore(path=VECTOR_STORE_PATH)
        logger.info(f"Vector store has {_store.count()} chunks")
    return _store


def retrieve_relevant_laws(
    query: str,
    city: str,
    n_results: int = 5,
) -> tuple[list[str], list[dict]]:
    """
    Single-stage bi-encoder retrieval. Returns top n_results directly.
    Cross-encoder re-ranking removed to stay within 512MB RAM on Render free tier.
    """
    store = _get_store()
    total = store.count()

    if total == 0:
        logger.warning("Vector store is empty. Run seed_legal_docs.py first.")
        return [], []

    encoder = _get_encoder()
    query_embedding = encoder.encode([query])[0].tolist()

    n_fetch = min(n_results, total)
    city_tag = CITY_TAG_MAP.get(city)

    if city_tag is None:
        logger.info(f"[RAG] city={city!r} → no city filter, global search")
        results = store.query(
            query_embeddings=[query_embedding],
            n_results=n_fetch,
        )
    else:
        logger.info(f"[RAG] city={city!r} → city_tag={city_tag!r}")
        try:
            results = store.query(
                query_embeddings=[query_embedding],
                n_results=n_fetch,
                where={"city": city_tag},
            )
            if not results["documents"][0]:
                logger.info(f"No city-specific results for '{city_tag}'; falling back to global")
                results = store.query(
                    query_embeddings=[query_embedding],
                    n_results=n_fetch,
                )
        except Exception as e:
            logger.warning(f"City-filtered query failed: {e}; falling back to global search")
            results = store.query(
                query_embeddings=[query_embedding],
                n_results=n_fetch,
            )

    candidates = results["documents"][0]
    metadatas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(candidates)

    if not candidates:
        logger.warning("No candidates returned from vector store.")
        return [], []

    logger.info(f"RAG retrieval: {len(candidates)} results for city={city!r}")
    return candidates, metadatas


def retrieve_relevant_laws_multi(
    queries: list[str],
    city: str,
    n_results_each: int = 5,
) -> tuple[list[str], list[dict]]:
    """
    Run multiple RAG queries (from IntakeAgent) and merge results.
    Deduplicates on document content. Returns combined docs + metadata.
    """
    seen: set[str] = set()
    all_docs: list[str] = []
    all_metas: list[dict] = []

    for query in queries[:3]:
        docs, metas = retrieve_relevant_laws(query, city, n_results=n_results_each)
        for doc, meta in zip(docs, metas):
            if doc not in seen:
                seen.add(doc)
                all_docs.append(doc)
                all_metas.append(meta)

    logger.info(f"Multi-query RAG: {len(queries)} queries → {len(all_docs)} unique chunks")
    return all_docs, all_metas
