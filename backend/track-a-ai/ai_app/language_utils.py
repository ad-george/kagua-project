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
        return (
            "The farmer is code-switching between Kiswahili and English, which is natural. "
            "Mirror their style: respond mostly in English but keep common Kiswahili farming "
            "terms natural where the farmer used them (e.g. mahindi, shamba, viazi, kabichi). "
            "Do not force a full translation into either language."
        )

    response_instruction = f"Generate the entire response in {response_language}."
    return (
        f"The farmer's preferred response language is {response_language}. "
        f"{response_instruction} "
        "Do not switch languages unless the farmer explicitly requests a translation."
    )
