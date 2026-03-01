"""
vector_store.py — Lightweight numpy vector store replacing ChromaDB.

Persists to disk as .npy (embeddings) + .json (documents + metadata).
No pydantic dependency → works on Python 3.14+.
"""

import json
import logging
import os
import shutil

import numpy as np

logger = logging.getLogger(__name__)

_EMBEDDINGS_FILE = "embeddings.npy"
_DATA_FILE = "data.json"


class VectorStore:
    """
    Cosine-similarity vector store backed by numpy arrays on disk.
    Drop-in replacement for the ChromaDB usage in this project.
    """

    def __init__(self, path: str):
        self.path = path
        self.documents: list[str] = []
        self.metadatas: list[dict] = []
        self.embeddings: np.ndarray = np.empty((0,), dtype=np.float32)
        self._load()

    # ── Persistence ──────────────────────────────────────────────────────────

    def _load(self):
        emb_path = os.path.join(self.path, _EMBEDDINGS_FILE)
        data_path = os.path.join(self.path, _DATA_FILE)

        if os.path.exists(emb_path) and os.path.exists(data_path):
            try:
                self.embeddings = np.load(emb_path)
                with open(data_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.documents = data["documents"]
                self.metadatas = data["metadatas"]
                logger.info(
                    f"Loaded vector store from '{self.path}': "
                    f"{len(self.documents)} chunks"
                )
            except Exception as e:
                logger.warning(f"Could not load vector store: {e}. Starting fresh.")
                self._reset()

    def _save(self):
        os.makedirs(self.path, exist_ok=True)
        np.save(os.path.join(self.path, _EMBEDDINGS_FILE), self.embeddings)
        with open(os.path.join(self.path, _DATA_FILE), "w", encoding="utf-8") as f:
            json.dump(
                {"documents": self.documents, "metadatas": self.metadatas},
                f,
                ensure_ascii=False,
            )

    def _reset(self):
        self.documents = []
        self.metadatas = []
        self.embeddings = np.empty((0,), dtype=np.float32)

    # ── Public API (mirrors ChromaDB collection API) ──────────────────────────

    def count(self) -> int:
        return len(self.documents)

    def delete(self):
        """Delete all data from disk and memory."""
        if os.path.exists(self.path):
            shutil.rmtree(self.path)
        self._reset()
        logger.info(f"Deleted vector store at '{self.path}'")

    def add(
        self,
        ids: list[str],
        documents: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict],
    ):
        """Add documents with their embeddings and metadata."""
        new_emb = np.array(embeddings, dtype=np.float32)

        if self.embeddings.ndim == 1 and self.embeddings.size == 0:
            # First batch
            self.embeddings = new_emb
        else:
            self.embeddings = np.vstack([self.embeddings, new_emb])

        self.documents.extend(documents)
        self.metadatas.extend(metadatas)
        self._save()

    def query(
        self,
        query_embeddings: list[list[float]],
        n_results: int,
        where: dict | None = None,
    ) -> dict:
        """
        Return the top-n most similar documents to the query embedding.

        `where` is an equality filter on metadata, e.g. {"city": "nyc"}.
        """
        if len(self.documents) == 0:
            return {"documents": [[]], "metadatas": [[]], "distances": [[]]}

        q = np.array(query_embeddings[0], dtype=np.float32)

        # Cosine similarity
        norms = np.linalg.norm(self.embeddings, axis=1)
        q_norm = np.linalg.norm(q)
        with np.errstate(divide="ignore", invalid="ignore"):
            sims = np.dot(self.embeddings, q) / np.where(
                norms * q_norm == 0, 1e-9, norms * q_norm
            )

        # Apply metadata filter
        if where:
            key, val = next(iter(where.items()))
            valid_indices = [
                i for i, m in enumerate(self.metadatas) if m.get(key) == val
            ]
            if valid_indices:
                mask = np.full(len(self.documents), -2.0)
                mask[valid_indices] = sims[valid_indices]
                sims = mask

        top_k = min(n_results, len(self.documents))
        top_indices = np.argsort(sims)[::-1][:top_k]
        # Exclude any that were masked out entirely
        top_indices = [i for i in top_indices if sims[i] > -1.5]

        return {
            "documents": [[self.documents[i] for i in top_indices]],
            "metadatas": [[self.metadatas[i] for i in top_indices]],
            "distances": [[float(1 - sims[i]) for i in top_indices]],
        }
