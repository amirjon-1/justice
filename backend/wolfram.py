"""
wolfram.py — Wolfram Alpha Short Answers API integration for JusticeMap.
Retrieves real city statistics: median income, median rent, population.
"""

import requests
import os
import logging
from urllib.parse import urlencode

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

WOLFRAM_APP_ID = os.getenv("WOLFRAM_APP_ID", "")
BASE_URL = "http://api.wolframalpha.com/v1/spoken"


def _query_wolfram(query: str) -> str:
    """
    Make a single Wolfram Alpha Short Answers (spoken) API call.
    Returns the answer string, or 'N/A' on any failure.
    """
    if not WOLFRAM_APP_ID or WOLFRAM_APP_ID == "your_wolfram_app_id_here":
        logger.warning("WOLFRAM_APP_ID not configured — returning N/A")
        return "N/A"

    try:
        params = {
            "appid": WOLFRAM_APP_ID,
            "i": query,
        }
        response = requests.get(BASE_URL, params=params, timeout=10)

        if response.status_code == 200:
            text = response.text.strip()
            # Wolfram sometimes returns "Wolfram Alpha did not understand your input"
            if "did not understand" in text.lower() or "no results" in text.lower():
                return "N/A"
            return text

        elif response.status_code == 501:
            # 501 = Wolfram could not interpret the query
            logger.info(f"Wolfram 501 (no result) for: {query}")
            return "N/A"

        else:
            logger.warning(
                f"Wolfram Alpha returned HTTP {response.status_code} for query: '{query}'"
            )
            return "N/A"

    except requests.exceptions.Timeout:
        logger.error(f"Wolfram Alpha timeout for query: '{query}'")
        return "N/A"
    except requests.exceptions.ConnectionError:
        logger.error("Wolfram Alpha connection error")
        return "N/A"
    except Exception as e:
        logger.error(f"Wolfram Alpha unexpected error: {e}")
        return "N/A"


def get_city_stats(city: str) -> dict:
    """
    Retrieve key socioeconomic statistics for a city from Wolfram Alpha.

    Makes three API calls:
      1. Median household income
      2. Median rent
      3. Population

    Returns a dict with keys: median_income, median_rent, population.
    Any failed query returns 'N/A' for that field.
    """
    logger.info(f"Fetching Wolfram stats for: {city}")

    stats = {
        "median_income": _query_wolfram(f"median household income {city}"),
        "median_rent": _query_wolfram(f"median rent {city}"),
        "population": _query_wolfram(f"population {city}"),
    }

    logger.info(f"Wolfram stats result for {city}: {stats}")
    return stats
