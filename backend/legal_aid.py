"""
legal_aid.py — Legal aid organization directory and escalation logic for JusticeMap.
"""

LEGAL_AID_ORGS: dict[str, list[dict]] = {
    "New York City": [
        {
            "name": "Legal Aid Society NYC",
            "phone": "212-577-3300",
            "url": "https://legalaidnyc.org",
            "specialties": ["housing", "eviction", "family"],
            "free": True,
        },
        {
            "name": "MFY Legal Services",
            "phone": "212-417-3700",
            "url": "https://mfy.org",
            "specialties": ["housing", "benefits", "discrimination"],
            "free": True,
        },
        {
            "name": "NYC Housing Court Help Center",
            "phone": "646-386-5554",
            "url": "https://nycourts.gov/courts/nyc/housing/",
            "specialties": ["eviction", "housing court"],
            "free": True,
        },
    ],
    "Chicago": [
        {
            "name": "Legal Aid Chicago",
            "phone": "312-341-1070",
            "url": "https://legalaidchicago.org",
            "specialties": ["housing", "eviction", "benefits"],
            "free": True,
        },
        {
            "name": "Lawyers' Committee for Better Housing",
            "phone": "312-347-7600",
            "url": "https://lcbh.org",
            "specialties": ["housing", "eviction", "tenant rights"],
            "free": True,
        },
    ],
    "Los Angeles": [
        {
            "name": "Neighborhood Legal Services of LA",
            "phone": "800-433-6251",
            "url": "https://nlsla.org",
            "specialties": ["housing", "eviction", "immigration"],
            "free": True,
        },
        {
            "name": "LA Center for Community Law and Action",
            "phone": "213-387-2822",
            "url": "https://lacla.org",
            "specialties": ["housing", "consumer", "benefits"],
            "free": True,
        },
    ],
    "General": [
        {
            "name": "LawHelp.org",
            "phone": None,
            "url": "https://lawhelp.org",
            "specialties": ["all"],
            "free": True,
        },
        {
            "name": "Legal Services Corporation",
            "phone": None,
            "url": "https://lsc.gov/about-lsc/what-legal-aid/find-legal-aid",
            "specialties": ["all"],
            "free": True,
        },
    ],
}


def should_escalate(confidence_score: float, severity: str, issue_type: str) -> bool:
    """Escalate if: grounding confidence low OR severity high OR issue is police misconduct."""
    if confidence_score < 0.70:
        return True
    if severity == "high":
        return True
    if issue_type == "police":
        return True
    return False


def escalation_reason(confidence_score: float, severity: str, issue_type: str) -> str:
    if issue_type == "police":
        return "Police misconduct cases involve constitutional rights — we recommend speaking with a civil rights attorney."
    if severity == "high":
        return "High severity case — we recommend speaking with a legal professional as soon as possible."
    if confidence_score < 0.70:
        return "Our analysis has lower confidence for this situation — a legal professional can provide a definitive assessment."
    return ""


def get_legal_aid(city: str, issue_type: str) -> list[dict]:
    orgs = LEGAL_AID_ORGS.get(city, LEGAL_AID_ORGS["General"])
    relevant = [
        o for o in orgs
        if issue_type in o["specialties"] or "all" in o["specialties"]
    ]
    return relevant if relevant else orgs
