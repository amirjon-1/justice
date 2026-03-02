"""
rag.py — TF-IDF RAG pipeline for JusticeMap.

Replaced ChromaDB (broken on Python 3.14 due to pydantic v1) with a simple
TF-IDF cosine similarity retriever over the pre-built data.json store.
No external embedding model required.
"""

import json
import logging
import os

import numpy as np

logger = logging.getLogger(__name__)

VECTOR_STORE_PATH = os.getenv("VECTOR_STORE_PATH", "./vector_db")

CITY_TAG_MAP = {
    "New York City": "nyc",
    "Chicago": "chicago",
    "Los Angeles": "los_angeles",
    "General": None,  # No city filter — search all documents
}

# Lazy-loaded store
_documents: list[str] = []
_metadatas: list[dict] = []
_loaded = False


def _load_store() -> None:
    global _documents, _metadatas, _loaded
    if _loaded:
        return
    data_path = os.path.join(VECTOR_STORE_PATH, "data.json")
    if not os.path.exists(data_path):
        logger.error(f"RAG data file not found: {data_path}")
        _loaded = True
        return
    try:
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        _documents = data.get("documents", [])
        _metadatas = data.get("metadatas", [])
        logger.info(f"RAG store loaded: {len(_documents)} chunks from {data_path}")
    except Exception as e:
        logger.error(f"Failed to load RAG store: {e}")
    _loaded = True


def retrieve_relevant_laws(
    query: str,
    city: str,
    n_results: int = 5,
) -> tuple[list[str], list[dict]]:
    """
    Retrieve top n_results law chunks relevant to the query using TF-IDF cosine similarity.
    """
    _load_store()
    if not _documents:
        logger.warning("RAG store is empty — no documents loaded")
        return [], []

    city_tag = CITY_TAG_MAP.get(city)

    # Always include general docs + city-specific docs.
    # Restricting to city-only missed federal/constitutional law (police, civil rights)
    # which is tagged "general" but applies to every city.
    if city_tag is not None:
        indices = [
            i for i, m in enumerate(_metadatas)
            if m.get("city") == city_tag or m.get("city") == "general"
        ]
        if not indices:
            logger.info(f"No docs for city_tag={city_tag!r}; falling back to all docs")
            indices = list(range(len(_documents)))
    else:
        indices = list(range(len(_documents)))

    candidate_docs = [_documents[i] for i in indices]
    candidate_metas = [_metadatas[i] for i in indices]

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        corpus = [query] + candidate_docs
        vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
        tfidf_matrix = vectorizer.fit_transform(corpus)

        query_vec = tfidf_matrix[0]
        doc_vecs = tfidf_matrix[1:]
        scores = cosine_similarity(query_vec, doc_vecs)[0]

        top_k = min(n_results, len(candidate_docs))
        top_indices = np.argsort(scores)[::-1][:top_k]

        results = [(candidate_docs[i], candidate_metas[i]) for i in top_indices]
        docs = [r[0] for r in results]
        metas = [r[1] for r in results]

        logger.info(f"RAG: city={city!r} query={query[:60]!r} → {len(docs)} results")
        return docs, metas

    except Exception as e:
        logger.error(f"RAG TF-IDF retrieval failed: {e}")
        return [], []


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
