import re

# BLOCKLIST BRANDS that the AI should never recommend or endorse. This is a hard blocklist.
BLOCKLIST_BRANDS = [
    "dudu dust", "amiran", "gromax", "twiga", "greenlife", "belt", "actellic",
    "ortus", "milraz", "radomil", "dithane", "cancross", "force", "booster",
    "emmaron", "vendex", "tabibu", "goldchance", "super actellic",
]

# BLOCKLIST PHRASES that the AI should never recommend or endorse.
BLOCKLIST_PHRASES = [
    "you should buy", "go buy", "buy this", "purchase this",
    "you must spray", "you need to spray", "the correct product is",
    "the best product is", "i recommend purchasing", "i recommend using",
    "you should apply", "the best treatment is", "apply this pesticide",
    "apply this fungicide", "apply this herbicide", "use this pesticide",
    "use this fungicide", "use this herbicide",
]

# CERTAINTY PHRASES that the AI should never use, as they are overconfident and prescriptive.
CERTAINTY_PHRASES = [
    "this is definitely", "this is certainly", "the only cause is",
    "without doubt", "guaranteed solution", "this will solve",
    "this is the correct answer",
]
# DOSAGE_PATTERNS that the AI should never use, as they are prescriptive and potentially unsafe.
DOSAGE_PATTERNS = [
    r"\b\d+\s?(ml|l|litre|litres)\b",
    r"\b\d+\s?(g|kg)\b",
    r"\b\d+\s?(ml\/l|g\/l|kg\/ha)\b",
    r"\b\d+\s?per\s?(acre|ha|hectare)\b",
]

# SAFE_FALLBACK_TEXT is a pre-written message that replaces any AI-generated text that violates the guardrails. It informs the user that the content has been replaced for safety reasons and encourages them to seek professional advice.
SAFE_FALLBACK_TEXT = (
    "This point could not be shown safely and has been replaced. "
    "Please refer to the general guidance and consider discussing "
    "specific treatment options with a trusted agrovet or extension officer."
)

# Function to detect violations in a given text. It checks for brand names, prescriptive language, dosages, and overconfident language. Returns a list of violation types found in the text.
def detect_violations(text: str) -> list:
    """Returns all violation types found in text, e.g. ['dosage', 'brand_name']."""
    if not text:
        return []
    lowered = text.lower()
    violations = []
    # Check for brand names, prescriptive language, dosages, and overconfident language in the text. If any are found, add the corresponding violation type to the list.
    if any(brand in lowered for brand in BLOCKLIST_BRANDS):
        violations.append("brand_name")
    if any(phrase in lowered for phrase in BLOCKLIST_PHRASES):
        violations.append("prescriptive_language")
    if any(re.search(pattern, lowered) for pattern in DOSAGE_PATTERNS):
        violations.append("dosage")
    if any(phrase in lowered for phrase in CERTAINTY_PHRASES):
        violations.append("overconfidence")
    return violations

# Function to apply guardrails to a comparison dictionary. It scans every AI-generated text field for violations and replaces any flagged fields with a safe fallback message. It also records whether any guardrails were triggered and what violations were found.
def apply_guardrails(comparison: dict) -> dict:
    """
    Scans every AI-generated text field in a get_comparison() result for slipped brand names, prescriptive phrasing, dosages, or overconfident
    language. Any flagged field is replaced with a safe, pre-written fallback rather than shown to the farmer. Records what was caught in
    guardrail_violations, so it can be logged/monitored during testing.
    """
    triggered = False
    violations_found = set()
    # Loop through each perspective in the comparison and check for violations in the view text. If any violations are found, replace the view text with the safe fallback message and record the violation types.
    for p in comparison.get("perspectives", []):
        violations = detect_violations(p.get("view", ""))
        if violations:
            p["view"] = SAFE_FALLBACK_TEXT
            triggered = True
            violations_found.update(violations)
    # Loop through each uncertainty item in the comparison and check for violations. If any violations are found, replace the item with the safe fallback message and record the violation types.
    cleaned_uncertainty = []
    for item in comparison.get("uncertainty", []):
        violations = detect_violations(item)
        if violations:
            cleaned_uncertainty.append(SAFE_FALLBACK_TEXT)
            triggered = True
            violations_found.update(violations)
        else:
            cleaned_uncertainty.append(item)
    comparison["uncertainty"] = cleaned_uncertainty
    # Loop through each source used in the comparison and check for violations in the snippet text. If any violations are found, replace the snippet with the safe fallback message and record the violation types.
    for source in comparison.get("sources_used", []):
        violations = detect_violations(source.get("snippet", ""))
        if violations:
            source["snippet"] = SAFE_FALLBACK_TEXT
            triggered = True
            violations_found.update(violations)
    # Record whether any guardrails were triggered and what violations were found in the comparison dictionary.
    comparison["guardrail_triggered"] = triggered
    comparison["guardrail_violations"] = list(violations_found)
    return comparison

