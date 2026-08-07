from ai_app.rag.retriever import load_knowledge_base

def get_source_details(sources_used: list) -> list:
    """
    Given the sources_used list from get_comparison, return the fuller,
    readable version of each source for the 'Understand More' modal.
    Includes clarifying questions (farmer-friendly language) and why
    information may differ between sources.
    """
    knowledge_base = load_knowledge_base()
    all_entries = [entry for entries in knowledge_base.values() for entry in entries]

    details = []
    for source in sources_used:
        topic = source.get("topic")
        matching_entry = next((e for e in all_entries if e.get("topic") == topic), None)

        if matching_entry:
            details.append({
                "name": source.get("name"),
                "topic": topic,
                # Prefer the already-simplified, farmer-friendly text that
                # get_comparison.py already generated once (stored on
                # source["snippet"]) over the knowledge base's raw
                # document_summary, which is written in technical/research
                # language (e.g. "diagnostic field markers", "endemic
                # chewing pests"). No new LLM call needed here — this reuses
                # the simplification work already done, rather than
                # re-doing it or skipping it entirely. Only falls back to
                # the raw technical text if no friendly snippet exists.
                "summary": source.get("snippet") or matching_entry.get("document_summary"),
                # clarifying_questions are written in plain farmer language —
                # more useful in the modal than the technical learning points
                "learning_points": matching_entry.get("clarifying_questions", []),
                # Helps farmer understand why different sources may disagree
                "why_may_differ": matching_entry.get("why_information_may_differ", []),
                "uncertainties": matching_entry.get("uncertainties", []),
                "link": source.get("link"),
                "audio_url": None,
            })
        else:
            details.append({
                "name": source.get("name"),
                "topic": topic,
                "summary": source.get("snippet"),
                "learning_points": [],
                "why_may_differ": [],
                "uncertainties": [],
                "link": source.get("link"),
                "audio_url": None,
            })
    return details