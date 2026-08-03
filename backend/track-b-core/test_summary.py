"""
Test script for the /summary endpoint.

Run this while your backend server is already running locally
(the one you've been testing via Swagger at http://127.0.0.1:8002).

Usage:
    pip install requests   (if you don't already have it)
    python test_summary.py

Change BASE_URL below if your server runs on a different port.
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8002/summary"

# Phrases that should NEVER appear in summary_text, based on everything
# we've discussed: no announcing absent sections, no prescriptive language,
# no false certainty.
BANNED_PHRASES = [
    "no advice was received",
    "no observations were recorded",
    "you haven't received advice",
    "you should",
    "i recommend",
    "the best option",
    "the correct answer",
    "you must",
    "believes",
    "thinks it's",
    "likely because",
]

TEST_CASES = [
    {
        "name": "1. LOW confidence, no advice, no observations (the original sparse case)",
        "payload": {
            "context": {
                "reported_problem": "yellow leaves",
                "crop": "maize",
                "observations": [],
                "advice_received": [],
                "mentioned_weather": [],
                "language": "english",
                "extraction_confidence": "high",
                "could_not_understand": False,
                "raw_input": "My maize leaves are turning yellow",
                "county": "Kiambu",
                "season": None,
                "growth_stage": None,
                "journey_id": 45,
                "user_id": 2,
            },
            "comparison": {
                "confidence": "LOW",
                "guidance_mode": "GENERAL_OBSERVATION",
                "sources_found": 0,
                "observed": ["yellow leaves"],
                "perspectives": [],
                "uncertainty": ["No verified guidance matched this specific situation yet."],
                "sources_used": [],
            },
        },
    },
    {
        "name": "2. LOW confidence, WITH observations, still no advice",
        "payload": {
            "context": {
                "reported_problem": "yellow leaves",
                "crop": "maize",
                "observations": ["wilting", "dry leaves"],
                "advice_received": [],
                "mentioned_weather": [],
                "language": "english",
                "extraction_confidence": "high",
                "could_not_understand": False,
                "raw_input": "My maize leaves are turning yellow, also wilting and dry",
                "county": "Kiambu",
                "season": None,
                "growth_stage": None,
                "journey_id": 46,
                "user_id": 2,
            },
            "comparison": {
                "confidence": "LOW",
                "guidance_mode": "GENERAL_OBSERVATION",
                "sources_found": 0,
                "observed": ["yellow leaves", "wilting", "dry leaves"],
                "perspectives": [],
                "uncertainty": ["No verified guidance matched this specific situation yet."],
                "sources_used": [],
            },
        },
    },
    {
        "name": "3. HIGH confidence, WITH advice AND sources_used",
        "payload": {
            "context": {
                "reported_problem": "yellow leaves",
                "crop": "maize",
                "observations": ["wilting"],
                "advice_received": [
                    {"source_type": "neighbour", "organization": None, "advice": "Suggested waiting."},
                    {"source_type": "agrovet", "organization": None, "advice": "Suggested spraying."},
                ],
                "mentioned_weather": [],
                "language": "english",
                "extraction_confidence": "high",
                "could_not_understand": False,
                "raw_input": "My maize leaves are turning yellow and wilting, neighbour said wait, agrovet said spray",
                "county": "Kiambu",
                "season": None,
                "growth_stage": None,
                "journey_id": 47,
                "user_id": 2,
            },
            "comparison": {
                "confidence": "HIGH",
                "guidance_mode": "SPECIFIC",
                "sources_found": 1,
                "observed": ["yellow leaves", "wilting"],
                "perspectives": [
                    {"source": "neighbour", "view": "Suggested waiting."},
                    {"source": "agrovet", "view": "Suggested spraying."},
                ],
                "uncertainty": ["Whether nitrogen deficiency or waterlogging is the cause"],
                "sources_used": [
                    {
                        "name": "KALRO",
                        "topic": "yellow leaves maize",
                        "snippet": "Yellowing with wilting can indicate nitrogen deficiency or waterlogging.",
                        "link": "#",
                    }
                ],
            },
        },
    },
    {
        "name": "4. Kiswahili input — language-matching test",
        "payload": {
            "context": {
                "reported_problem": "majani ya njano",
                "crop": "maize",
                "observations": [],
                "advice_received": [],
                "mentioned_weather": [],
                "language": "kiswahili",
                "extraction_confidence": "high",
                "could_not_understand": False,
                "raw_input": "Majani ya mahindi yangu yanageuka njano",
                "county": "Kiambu",
                "season": None,
                "growth_stage": None,
                "journey_id": 48,
                "user_id": 2,
            },
            "comparison": {
                "confidence": "LOW",
                "guidance_mode": "GENERAL_OBSERVATION",
                "sources_found": 0,
                "observed": ["majani ya njano"],
                "perspectives": [],
                "uncertainty": ["Hakuna mwongozo ulioidhinishwa uliolingana na hali hii bado."],
                "sources_used": [],
            },
        },
    },
]


def check_response(data: dict) -> list:
    """Returns a list of problems found, empty list means it passed."""
    issues = []

    if "summary_text" not in data or not data.get("summary_text"):
        issues.append("Missing or empty summary_text")
        return issues

    text_lower = data["summary_text"].lower()
    for phrase in BANNED_PHRASES:
        if phrase in text_lower:
            issues.append(f"Found banned phrase: '{phrase}'")

    if "discussion_points" not in data:
        issues.append("Missing discussion_points key")

    return issues


def run_tests():
    passed = 0
    failed = 0

    for case in TEST_CASES:
        print("=" * 78)
        print(case["name"])
        print("=" * 78)

        try:
            response = requests.post(BASE_URL, json=case["payload"], timeout=60)
            response.raise_for_status()
            data = response.json()
        except requests.exceptions.RequestException as e:
            print(f"REQUEST FAILED: {e}")
            failed += 1
            print()
            continue

        issues = check_response(data)

        print(f"\nsummary_text:\n{data.get('summary_text')}\n")
        print(f"discussion_points: {data.get('discussion_points')}\n")

        if issues:
            print("FAIL —", len(issues), "issue(s) found:")
            for issue in issues:
                print(f"  - {issue}")
            failed += 1
        else:
            print("PASS — no banned phrases found, response shape looks correct.")
            passed += 1

        print()

    print("=" * 78)
    print(f"RESULTS: {passed} passed, {failed} failed, out of {len(TEST_CASES)} total")
    print("=" * 78)
    print(
        "\nNote: automated checks only catch the specific banned phrases listed\n"
        "above. Still read each summary_text yourself for tone, accuracy, and\n"
        "whether HIGH vs LOW confidence actually reads differently — that part\n"
        "can't be fully automated."
    )


if __name__ == "__main__":
    run_tests()