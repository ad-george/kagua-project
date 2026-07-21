from app.rag.retriever import load_knowledge_base

# Function to get the full details of sources used in a comparison. 
# It takes a list of sources (from get_comparison) and returns a list of dictionaries containing the name, topic, summary, learning points, link, and audio URL for each source. If a matching entry is found in the knowledge base, it uses that information; otherwise, it falls back to the snippet provided in the source.
def get_source_details(sources_used: list) -> list:
    """
    Given the sources_used list from get_comparison, return the fuller, readable version of each source for the 'Understand More Before
    Deciding' screen, full context, not just the short comparison snippet.
    """
    knowledge_base = load_knowledge_base()
    all_entries = [entry for entries in knowledge_base.values() for entry in entries]
    # Loop through each source in sources_used, find the matching entry in the knowledge base by topic, and construct a detailed dictionary for each source. If no matching entry is found, use the snippet from the source as the summary.
    details = []
    for source in sources_used:
        topic = source.get("topic")
        matching_entry = next((e for e in all_entries if e.get("topic") == topic), None)
        # If a matching entry is found, use its document_summary and trusted_learning_points; otherwise, use the snippet from the source as the summary and leave learning_points empty.
        if matching_entry:
            details.append({
                "name": source.get("name"),
                "topic": topic,
                "summary": matching_entry.get("document_summary"),
                "learning_points": matching_entry.get("trusted_learning_points", []),
                "link": source.get("link"),
                "audio_url": None,
            })
        # If no matching entry is found, use the snippet from the source as the summary and leave learning_points empty.
        else:
            details.append({
                "name": source.get("name"),
                "topic": topic,
                "summary": source.get("snippet"),
                "learning_points": [],
                "link": source.get("link"),
                "audio_url": None,
            })
    return details

