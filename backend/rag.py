"""
rag.py — Two-stage RAG pipeline for JusticeMap.

Stage 1: numpy VectorStore bi-encoder retrieval → top 20 candidates
Stage 2: CrossEncoder re-ranker (ms-marco-MiniLM-L-6-v2) → top 5 final results

Uses a simple numpy-based vector store (no ChromaDB / no pydantic dependency)
so it works on Python 3.14+.
"""

import logging
import os

from vector_store import VectorStore

logger = logging.getLogger(__name__)

VECTOR_STORE_PATH = os.getenv("VECTOR_STORE_PATH", "./vector_db")
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"

# City name → metadata tag mapping
CITY_TAG_MAP = {
    "New York City": "nyc",
    "Chicago": "chicago",
    "Los Angeles": "los_angeles",
    "General": None,  # No city filter — search all documents
}

# Lazy-loaded singletons
_encoder = None
_reranker = None
_store: VectorStore | None = None


def _get_encoder():
    global _encoder
    if _encoder is None:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading bi-encoder: {EMBEDDING_MODEL}")
        _encoder = SentenceTransformer(EMBEDDING_MODEL)
    return _encoder


def _get_reranker():
    global _reranker
    if _reranker is None:
        try:
            from sentence_transformers import CrossEncoder
            logger.info(f"Loading cross-encoder re-ranker: {RERANKER_MODEL}")
            _reranker = CrossEncoder(RERANKER_MODEL)
        except Exception as e:
            logger.warning(f"Could not load cross-encoder ({e}); reranking skipped.")
            _reranker = None
    return _reranker


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
    Two-stage retrieval pipeline.

    Stage 1: Bi-encoder embedding + cosine ANN search → top 20 candidates.
             Tries city-filtered search first; falls back to unfiltered.
    Stage 2: CrossEncoder re-ranking → top n_results final documents.

    Returns:
        (documents, metadatas) — parallel lists of text chunks and their metadata.
    """
    store = _get_store()
    total = store.count()

    if total == 0:
        logger.warning("Vector store is empty. Run seed_legal_docs.py first.")
        return [], []

    encoder = _get_encoder()
    query_embedding = encoder.encode([query])[0].tolist()

    n_stage1 = min(20, total)
    city_tag = CITY_TAG_MAP.get(city)

    if city_tag is None:
        # "General" or unknown city — global search across ALL documents, no city filter
        print(f"[DEBUG] RAG: city={city!r} → no city filter, searching all documents", flush=True)
        logger.info(f"[RAG] city={city!r} → no city filter, global search")
        results = store.query(
            query_embeddings=[query_embedding],
            n_results=n_stage1,
        )
    else:
        # City-specific: try filtered first, fall back to global if too few results
        print(f"[DEBUG] RAG: city={city!r} → filtering by city_tag={city_tag!r}", flush=True)
        logger.info(f"[RAG] city={city!r} → city_tag={city_tag!r}")
        try:
            results = store.query(
                query_embeddings=[query_embedding],
                n_results=n_stage1,
                where={"city": city_tag},
            )
            if not results["documents"][0] or len(results["documents"][0]) < 3:
                logger.info(
                    f"Few city-specific results for '{city_tag}'; broadening to global search"
                )
                results = store.query(
                    query_embeddings=[query_embedding],
                    n_results=n_stage1,
                )
        except Exception as e:
            logger.warning(f"City-filtered query failed: {e}; falling back to global search")
            results = store.query(
                query_embeddings=[query_embedding],
                n_results=n_stage1,
            )

    candidates = results["documents"][0]
    metadatas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(candidates)

    if not candidates:
        logger.warning("No candidates returned from vector store.")
        return [], []

    logger.info(f"Stage 1 retrieval: {len(candidates)} candidates")

    # Stage 2: Cross-encoder re-ranking
    reranker = _get_reranker()
    if reranker is not None and len(candidates) > n_results:
        try:
            pairs = [(query, doc) for doc in candidates]
            scores = reranker.predict(pairs)
            ranked = sorted(
                zip(scores, candidates, metadatas),
                key=lambda x: x[0],
                reverse=True,
            )
            top_docs = [doc for _, doc, _ in ranked[:n_results]]
            top_meta = [meta for _, _, meta in ranked[:n_results]]
            logger.info(f"Stage 2 re-ranking: {len(candidates)} → {len(top_docs)}")
            return top_docs, top_meta
        except Exception as e:
            logger.warning(f"Cross-encoder re-ranking failed ({e}); using raw ranking")

    return candidates[:n_results], metadatas[:n_results]


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
