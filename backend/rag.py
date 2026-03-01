"""
rag.py — ChromaDB-based RAG pipeline for JusticeMap.

Uses ONNXMiniLM_L6_V2 embeddings (no PyTorch required).
ChromaDB handles embedding + retrieval; no custom vector store needed.
"""

import logging
import os

logger = logging.getLogger(__name__)

VECTOR_STORE_PATH = os.getenv("VECTOR_STORE_PATH", "./vector_db")
COLLECTION_NAME = "legal_docs"

CITY_TAG_MAP = {
    "New York City": "nyc",
    "Chicago": "chicago",
    "Los Angeles": "los_angeles",
    "General": None,  # No city filter — search all documents
}

# Lazy singletons
_client = None
_collection = None


def _get_collection():
    global _client, _collection
    if _collection is None:
        import chromadb
        from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2
        ef = ONNXMiniLM_L6_V2()
        _client = chromadb.PersistentClient(path=VECTOR_STORE_PATH)
        _collection = _client.get_collection(
            name=COLLECTION_NAME,
            embedding_function=ef,
        )
        logger.info(f"ChromaDB collection loaded: {_collection.count()} chunks")
    return _collection


def retrieve_relevant_laws(
    query: str,
    city: str,
    n_results: int = 5,
) -> tuple[list[str], list[dict]]:
    """
    Retrieve top n_results law chunks relevant to the query.
    Uses ChromaDB with ONNX embeddings — no PyTorch required.
    """
    try:
        collection = _get_collection()
    except Exception as e:
        logger.error(f"Failed to load ChromaDB collection: {e}")
        return [], []

    city_tag = CITY_TAG_MAP.get(city)
    logger.info(f"[RAG] city={city!r} → city_tag={city_tag!r}")

    try:
        if city_tag is None:
            logger.info("[RAG] global search — no city filter")
            results = collection.query(
                query_texts=[query],
                n_results=n_results,
            )
        else:
            results = collection.query(
                query_texts=[query],
                n_results=n_results,
                where={"city": city_tag},
            )
            if not results["documents"][0]:
                logger.info(f"No city results for '{city_tag}'; falling back to global")
                results = collection.query(
                    query_texts=[query],
                    n_results=n_results,
                )
    except Exception as e:
        logger.warning(f"RAG query failed ({e}); trying global search")
        try:
            results = collection.query(
                query_texts=[query],
                n_results=n_results,
            )
        except Exception as e2:
            logger.error(f"Global RAG query also failed: {e2}")
            return [], []

    candidates = results["documents"][0]
    metadatas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(candidates)

    if not candidates:
        logger.warning("No candidates returned from ChromaDB.")
        return [], []

    logger.info(f"RAG retrieval: {len(candidates)} results for city={city!r}")
    return candidates, metadatas


def retrieve_relevant_laws_multi(
    queries: list[str],
    city: str,
    n_results_each: int = 5,
) -> tuple[list[str], list[dict]]:
    """
    Run multiple queries and merge results. Deduplicates on document content.
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
