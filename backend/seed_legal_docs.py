"""
seed_legal_docs.py — Index legal documents into vector_db/data.json.

Reads all .txt files from legal_docs/, chunks them into overlapping ~500-character
segments, and writes documents + metadata to vector_db/data.json for rag.py.

Run once before starting the server:
    python seed_legal_docs.py

Re-run to refresh the index.
"""

import glob
import json
import logging
import os
import re
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

VECTOR_STORE_PATH = os.getenv("VECTOR_STORE_PATH", "./vector_db")
LEGAL_DOCS_PATH = "./legal_docs"
SCRAPED_DOCS_PATH = "./legal_docs/scraped"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 100

CITY_TAG_MAP = {
    "nyc": "nyc",
    "new_york": "nyc",
    "chicago": "chicago",
    "la_": "los_angeles",
    "los_angeles": "los_angeles",
    "california": "los_angeles",
    "general": "general",
    "police": "general",
    "federal": "general",
}

TOPIC_TAG_MAP = {
    "tenant": "tenant_rights",
    "housing": "housing_rights",
    "police": "police_accountability",
    "civil_rights": "civil_rights",
    "fair_housing": "fair_housing",
    "rlto": "tenant_rights",
    "rso": "tenant_rights",
    "warranty": "housing_rights",
    "habitability": "housing_rights",
}

ISSUE_TYPE_MAP = {
    "business": "business",
    "infrastructure": "infrastructure",
    "civil_rights": "civil_rights",
    "discrimination": "discrimination",
    "employment": "employment",
    "consumer": "consumer",
    "immigration": "immigration",
    "noise": "noise",
    "public_benefits": "benefits",
    "benefits": "benefits",
    "education": "education",
    "police": "police",
    "tenant": "housing",
    "housing": "housing",
}


def infer_metadata(filepath: str) -> dict:
    base = os.path.splitext(os.path.basename(filepath))[0].lower()

    city = "general"
    for key, val in CITY_TAG_MAP.items():
        if key in base:
            city = val
            break

    topic = "legal"
    for key, val in TOPIC_TAG_MAP.items():
        if key in base:
            topic = val
            break

    issue_type = "other"
    for key, val in ISSUE_TYPE_MAP.items():
        if key in base:
            issue_type = val
            break

    source_url = ""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            first_lines = "".join(f.readline() for _ in range(6))
        url_match = re.search(r"Source URL:\s*(https?://\S+)", first_lines)
        if url_match:
            source_url = url_match.group(1)
    except Exception:
        pass

    return {
        "city": city,
        "topic": topic,
        "issue_type": issue_type,
        "source": os.path.splitext(os.path.basename(filepath))[0],
        "source_url": source_url,
    }


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    text = text.strip()
    if not text:
        return []

    chunks = []
    start = 0

    while start < len(text):
        end = min(start + chunk_size, len(text))

        if end < len(text):
            for sep in [". ", ".\n", "\n\n", "\n"]:
                idx = text.rfind(sep, start + chunk_size // 2, end)
                if idx != -1:
                    end = idx + len(sep)
                    break

        chunk = text[start:end].strip()
        if len(chunk) > 50:
            chunks.append(chunk)

        if end >= len(text):
            break
        start = end - overlap

    return chunks


def collect_doc_files() -> list[str]:
    files = []
    for fp in glob.glob(os.path.join(LEGAL_DOCS_PATH, "*.txt")):
        files.append(fp)
    if os.path.isdir(SCRAPED_DOCS_PATH):
        for fp in glob.glob(os.path.join(SCRAPED_DOCS_PATH, "*.txt")):
            files.append(fp)
    return sorted(set(files))


def seed_database():
    logger.info("=" * 60)
    logger.info("JusticeMap Legal Document Seeder (data.json)")
    logger.info("=" * 60)

    doc_files = collect_doc_files()
    if not doc_files:
        logger.error(f"No .txt files found in {LEGAL_DOCS_PATH}")
        sys.exit(1)

    logger.info(f"Found {len(doc_files)} document(s):")
    for f in doc_files:
        logger.info(f"  {f}")

    all_documents: list[str] = []
    all_metadatas: list[dict] = []

    for filepath in doc_files:
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                text = f.read()
        except Exception as e:
            logger.warning(f"Failed to read {filepath}: {e}")
            continue

        metadata = infer_metadata(filepath)
        chunks = chunk_text(text)

        logger.info(
            f"  {os.path.basename(filepath)}: {len(chunks)} chunks "
            f"(city={metadata['city']}, topic={metadata['topic']})"
        )

        for chunk in chunks:
            all_documents.append(chunk)
            all_metadatas.append(metadata.copy())

    os.makedirs(VECTOR_STORE_PATH, exist_ok=True)
    output_path = os.path.join(VECTOR_STORE_PATH, "data.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({"documents": all_documents, "metadatas": all_metadatas}, f)

    logger.info("=" * 60)
    logger.info("Seeding complete!")
    logger.info(f"  Documents indexed: {len(doc_files)}")
    logger.info(f"  Total chunks stored: {len(all_documents)}")
    logger.info(f"  Output: {os.path.abspath(output_path)}")
    logger.info("=" * 60)


if __name__ == "__main__":
    seed_database()
