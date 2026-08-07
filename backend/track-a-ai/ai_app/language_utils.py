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
            return "mixed"

    if not user_text or not user_text.strip():
        return "English"

    return "English"


def build_language_instruction(user_text: str | None, detected_language: str | None = None) -> str:
    """Build a concise instruction for the LLM about reply language."""
    response_language = infer_response_language(user_text, detected_language)

    if response_language == "mixed":
        # Previously this told the model to respond "mostly in English" for
        # mixed-language input — but "mixed" here almost always means
        # dominant-Kiswahili speech with a few borrowed/loanword terms
        # (e.g. "nisipulize" is grammatically Kiswahili, built around a
        # borrowed root, not an English phrase). Defaulting the reply to
        # English for that case both misrepresents how Kiswahili the input
        # actually is, and contradicts the frontend's own headings, which
        # already treat "mixed" as Kiswahili (see explanationLabels.js).
        # Leaning Kiswahili here keeps the generated body content and the
        # section headings in agreement, instead of showing a Kiswahili
        # heading over an English-generated sentence.
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

    response_instruction = f"Generate the entire response in {response_language}."
    return (
        f"The farmer's preferred response language is {response_language}. "
        f"{response_instruction} "
        "Do not switch languages unless the farmer explicitly requests a translation."
    )