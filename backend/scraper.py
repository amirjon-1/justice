"""
scraper.py — Web scraper for real legal content from Justia.com

Fetches actual statute text and stores it as .txt files in legal_docs/scraped/
with metadata headers (source_url, city, code_section, date_scraped).

Run before seed_legal_docs.py for real legal data:
    python scraper.py
    python seed_legal_docs.py

Note: This is for educational and legal research purposes.
Please respect robots.txt and rate limits.
"""

import json
import logging
import os
import re
import time
from datetime import datetime

import requests
from bs4 import BeautifulSoup

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

SCRAPED_DOCS_PATH = "./legal_docs/scraped"

HEADERS = {
    "User-Agent": (
        "JusticeMap/1.0 (Educational Legal Research Tool; "
        "UN SDG 11/16 Hackathon; contact: justiceMap@example.com)"
    ),
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}

REQUEST_DELAY = 2.0  # Seconds between requests — be polite

SCRAPE_TARGETS = [
    {
        "url": "https://law.justia.com/codes/new-york/new-york-city-administrative-code/title-27/chapter-2/subchapter-3/article-1/",
        "city": "nyc",
        "topic": "tenant_rights",
        "code_section": "NYC Admin Code Title 27 Ch. 2 Subchapter 3",
        "filename": "nyc_admin_code_housing_scraped.txt",
        "follow_section_links": True,
    },
    {
        "url": "https://law.justia.com/codes/illinois/chapter-765/act-5-12/",
        "city": "chicago",
        "topic": "tenant_rights",
        "code_section": "Illinois Compiled Statutes Ch. 765 Act 5-12",
        "filename": "illinois_landlord_tenant_scraped.txt",
        "follow_section_links": True,
    },
    {
        "url": "https://law.justia.com/codes/california/civil-code/division-3/part-4/title-5/chapter-2/",
        "city": "los_angeles",
        "topic": "tenant_rights",
        "code_section": "California Civil Code Div. 3 Part 4 Title 5 Ch. 2",
        "filename": "california_civil_code_landlord_tenant_scraped.txt",
        "follow_section_links": True,
    },
]


def make_request(url: str) -> requests.Response | None:
    """Make a GET request with retry logic."""
    for attempt in range(3):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=20)
            resp.raise_for_status()
            return resp
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                logger.warning(f"404 Not Found: {url}")
                return None
            elif e.response.status_code == 429:
                wait = (attempt + 1) * 5
                logger.warning(f"Rate limited. Waiting {wait}s...")
                time.sleep(wait)
            else:
                logger.warning(f"HTTP error {e.response.status_code} for {url}: {e}")
                return None
        except requests.exceptions.Timeout:
            logger.warning(f"Timeout on attempt {attempt + 1} for: {url}")
            time.sleep(2)
        except requests.exceptions.ConnectionError as e:
            logger.warning(f"Connection error for {url}: {e}")
            return None
    return None


def extract_legal_text(soup: BeautifulSoup) -> str:
    """
    Extract legal text from a Justia.com page.
    Justia uses several different page layouts — we try multiple selectors.
    """
    text_parts = []

    # Strategy 1: Look for the main content area (Justia layout)
    for selector in [
        {"class_": "codes-content"},
        {"class_": "statute-content"},
        {"id": "codes-content"},
        {"id": "main-content"},
        {"class_": "law-body"},
    ]:
        elem = soup.find("div", **selector)
        if elem:
            text = elem.get_text(separator="\n", strip=True)
            if len(text) > 200:
                text_parts.append(text)
                break

    # Strategy 2: Article body
    if not text_parts:
        article = soup.find("article")
        if article:
            text = article.get_text(separator="\n", strip=True)
            if len(text) > 200:
                text_parts.append(text)

    # Strategy 3: Collect all paragraphs with substantial text
    if not text_parts:
        paragraphs = []
        for tag in soup.find_all(["p", "li", "div"]):
            t = tag.get_text(strip=True)
            # Skip navigation, headers, footers
            if len(t) > 100 and not any(
                skip in t.lower()
                for skip in ["advertisement", "copyright", "subscribe", "newsletter", "cookie"]
            ):
                paragraphs.append(t)
        if paragraphs:
            text_parts.append("\n\n".join(paragraphs[:50]))  # Cap at 50 paragraphs

    combined = "\n\n".join(text_parts)
    # Clean up excessive whitespace
    combined = re.sub(r"\n{3,}", "\n\n", combined)
    combined = re.sub(r" {2,}", " ", combined)
    return combined.strip()


def extract_section_links(soup: BeautifulSoup, base_url: str) -> list[str]:
    """Extract links to individual statute sections from a table-of-contents page."""
    links = []
    seen = set()

    for a in soup.find_all("a", href=True):
        href = a["href"]
        text = a.get_text(strip=True)

        # Only follow links that look like statute sections
        if not any(
            kw in href
            for kw in ["/codes/", "law.justia.com"]
        ):
            continue

        # Skip nav/footer links
        if any(
            skip in text.lower()
            for skip in ["previous", "next", "back", "home", "search", "index"]
        ):
            continue

        full_url = href if href.startswith("http") else f"https://law.justia.com{href}"

        # Only follow links that are deeper in the same code section
        if full_url not in seen and base_url.rstrip("/") in full_url:
            links.append(full_url)
            seen.add(full_url)

    return links[:15]  # Cap at 15 subsections per page


def scrape_page(url: str, target: dict) -> str:
    """Scrape a single page and return its legal text."""
    logger.info(f"  Scraping: {url}")
    resp = make_request(url)
    if not resp:
        return ""
    soup = BeautifulSoup(resp.text, "lxml")
    text = extract_legal_text(soup)
    if text:
        logger.info(f"    Got {len(text)} characters")
    else:
        logger.warning(f"    No text extracted from {url}")
    return text


def build_metadata_header(url: str, target: dict) -> str:
    return (
        f"SCRAPED LEGAL DOCUMENT\n"
        f"Source URL: {url}\n"
        f"City: {target['city']}\n"
        f"Topic: {target['topic']}\n"
        f"Code Section: {target['code_section']}\n"
        f"Date Scraped: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        f"{'=' * 70}\n\n"
    )


def scrape_target(target: dict) -> dict:
    """Scrape one target (possibly following subsection links)."""
    url = target["url"]
    all_text_parts = []

    # Scrape the main page
    main_resp = make_request(url)
    if not main_resp:
        return {"filename": target["filename"], "chars": 0, "error": "No response"}

    main_soup = BeautifulSoup(main_resp.text, "lxml")
    main_text = extract_legal_text(main_soup)
    if main_text:
        all_text_parts.append(f"## {url}\n\n{main_text}")

    # Follow subsection links if configured
    if target.get("follow_section_links"):
        section_links = extract_section_links(main_soup, url)
        logger.info(f"  Found {len(section_links)} subsection links to follow")
        for sec_url in section_links:
            time.sleep(REQUEST_DELAY)
            sec_text = scrape_page(sec_url, target)
            if sec_text and len(sec_text) > 100:
                all_text_parts.append(f"## {sec_url}\n\n{sec_text}")

    if not all_text_parts:
        return {"filename": target["filename"], "chars": 0, "error": "No content found"}

    combined = "\n\n" + "=" * 70 + "\n\n".join(all_text_parts)
    header = build_metadata_header(url, target)
    full_content = header + combined

    return {"filename": target["filename"], "chars": len(full_content), "content": full_content}


def scrape_all():
    """Main function: scrape all configured legal sources."""
    os.makedirs(SCRAPED_DOCS_PATH, exist_ok=True)
    logger.info(f"Scraping {len(SCRAPE_TARGETS)} legal sources...")
    logger.info(f"Output directory: {os.path.abspath(SCRAPED_DOCS_PATH)}")
    logger.info(f"Request delay: {REQUEST_DELAY}s between requests\n")

    results = []

    for i, target in enumerate(SCRAPE_TARGETS):
        logger.info(f"[{i + 1}/{len(SCRAPE_TARGETS)}] {target['code_section']}")
        logger.info(f"  URL: {target['url']}")

        result = scrape_target(target)

        if result.get("content"):
            output_path = os.path.join(SCRAPED_DOCS_PATH, target["filename"])
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(result["content"])
            logger.info(
                f"  Saved: {output_path} ({result['chars']:,} characters)"
            )
        else:
            error = result.get("error", "Unknown error")
            logger.warning(f"  Skipped: {error}")
            logger.warning(
                f"  Tip: The bundled legal_docs/*.txt files will be used as fallback."
            )

        results.append({k: v for k, v in result.items() if k != "content"})

        # Rate limit between targets
        if i < len(SCRAPE_TARGETS) - 1:
            time.sleep(REQUEST_DELAY * 2)

    # Write manifest
    manifest_path = os.path.join(SCRAPED_DOCS_PATH, "manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(
            {
                "scraped_at": datetime.now().isoformat(),
                "targets": results,
            },
            f,
            indent=2,
        )

    successful = sum(1 for r in results if r.get("chars", 0) > 0)
    logger.info(f"\nScraping complete: {successful}/{len(SCRAPE_TARGETS)} sources scraped.")
    logger.info("Now run: python seed_legal_docs.py")


if __name__ == "__main__":
    scrape_all()
