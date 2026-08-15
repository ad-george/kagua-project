import re

# Lightweight, no-model-call heuristic for guessing which language actually
# dominates a "mixed" transcript. This is intentionally simple — a small
# set of very common Swahili function words/particles that show up
# constantly in Swahili-grammar sentences (not just borrowed nouns), so a
# transcript that's mostly English with one Swahili name/honorific/loanword
# won't trip it, but a transcript that's genuinely Swahili-grammar with
# some English words mixed in will.
_SWAHILI_FUNCTION_WORDS = {
    "na", "ya", "wa", "za", "la", "ni", "si", "kwa", "katika", "sana",
    "hii", "hiki", "hivi", "huu", "hawa", "hao", "yangu", "yako", "yake",
    "wetu", "wenu", "wao", "leo", "jana", "kesho", "nini", "vipi", "sasa",
    "bado", "tu", "sisi", "wewe", "yeye", "mimi", "wana", "ana", "nimeona",
    "nimepata", "nataka", "ninataka", "nashuku", "naona",
}


def _guess_mixed_direction(user_text: str | None) -> str:
    """Rough heuristic for whether 'mixed' input leans Kiswahili or English.

    Counts how many words in the transcript are common Swahili function
    words/particles (the kind that appear throughout genuinely
    Swahili-grammar sentences) versus total word count. A transcript that's
    mostly English with a stray Swahili name, honorific, or loanword won't
    cross the threshold; a transcript that's actually built on Swahili
    grammar will. This is deliberately conservative — defaulting to
    "english" when uncertain, since forcing a Kiswahili-heavy reply onto a
    farmer who typed mostly in English is the more disruptive failure mode
    of the two (see the extract_context.py "Mzee"/honorym example: a single
    Swahili word in an English sentence should not flip the reply language).
    """
    if not user_text or not user_text.strip():
        return "english"

    words = re.findall(r"[a-zA-Z']+", user_text.lower())
    if not words:
        return "english"

    swahili_hits = sum(1 for w in words if w in _SWAHILI_FUNCTION_WORDS)
    ratio = swahili_hits / len(words)

    # Threshold is intentionally low-but-not-trivial: a couple of stray
    # Swahili words (a name, an honorific, "sana" once) in an otherwise
    # long English transcript won't cross it, but a sentence genuinely
    # built on Swahili grammar throughout will.
    return "kiswahili" if ratio >= 0.15 else "english"


def infer_response_language(user_text: str | None, detected_language: str | None = None) -> str:
    """Map the already-detected farmer language to a reply-language target.

    We rely on the language already extracted from the farmer input and avoid a
    separate model call for language detection. This keeps the flow simpler,
    cheaper, and centered on the main prompt.
    """
    if detected_language:
        detected = detected_language.strip().lower()
        if detected in {"kiswahili", "swahili"}:
            return "Kiswahili"
        if detected == "english":
            return "English"
        if detected == "mixed":
            # "mixed" from extract_context.py fires for code-switching in
            # EITHER direction — mostly-Kiswahili-grammar with English
            # words mixed in, or mostly-English with a stray Swahili name,
            # honorific, or loanword mixed in (e.g. "my neighbor Mzee
            # Gitau"). Those two cases need opposite reply-language
            # defaults, so "mixed" alone isn't enough information — check
            # the actual transcript for which direction it leans before
            # deciding.
            return "mixed_kiswahili" if _guess_mixed_direction(user_text) == "kiswahili" else "mixed_english"

    if not user_text or not user_text.strip():
        return "English"
    return "English"


def build_language_instruction(user_text: str | None, detected_language: str | None = None) -> str:
    """Build a concise instruction for the LLM about reply language."""
    response_language = infer_response_language(user_text, detected_language)

    if response_language == "mixed_kiswahili":
        # Dominant-Kiswahili code-switching (e.g. "Mahindi yangu yana
        # yellow leaves") — the original "mixed" handling, kept as-is for
        # this direction. Leaning Kiswahili here keeps generated body
        # content in agreement with the frontend's own headings, which
        # already treat "mixed" as Kiswahili-leaning for UI labels.
        return (
            "The farmer is code-switching between Kiswahili and English, which is natural. "
            "Respond primarily in Kiswahili — write full sentences, section headings, and "
            "explanations in Kiswahili rather than English. Keep any English or loanword terms "
            "the farmer herself used where they fit naturally within a Kiswahili sentence "
            "(e.g. spray, fertilizer), the way Kenyan farmers naturally speak — but the response "
            "as a whole should read as Kiswahili, not English with occasional Kiswahili words. "
            "Do not force overly formal or textbook Kiswahili; natural, conversational phrasing "
            "is fine. Do not switch the response entirely to English."
        )

    if response_language == "mixed_english":
        # Dominant-English input with a stray Swahili word mixed in — a
        # name, an honorific ("Mzee", "Mama"), or a single loanword. The
        # farmer is not code-switching to communicate content in Swahili;
        # forcing a Kiswahili-primary reply here is the exact bug this
        # heuristic exists to prevent. Reply in English, and don't
        # translate or replace whatever Swahili word she used (e.g. a
        # name or honorific) — it belongs in the response as-is.
        return (
            "The farmer wrote primarily in English, with a Swahili name, honorific, or loanword "
            "mixed in naturally (e.g. referring to someone as 'Mzee' or 'Mama'). This is not "
            "meaningful code-switching — respond entirely in English, in full sentences, section "
            "headings, and explanations. Keep any name or honorific she used exactly as she wrote "
            "it rather than translating it. Do not switch the response into Kiswahili."
        )

    response_instruction = f"Generate the entire response in {response_language}."
    return (
        f"The farmer's preferred response language is {response_language}. "
        f"{response_instruction} "
        "Do not switch languages unless the farmer explicitly requests a translation."
    )