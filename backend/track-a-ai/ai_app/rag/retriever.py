import os
import json
import re
# knowledge base retrieval logic for Track-A-AI
KNOWLEDGE_BASE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "knowledge-base")
# maps crop names to knowledge base folders
CROP_FOLDER_MAP = {
    "maize": "maize",
    "irish potatoes": "potato",
    "cabbage": "cabbage",
}
# cache of loaded knowledge base entries, keyed by crop folder name
_knowledge_cache = {}
# Functions to load and score knowledge base entries based on farmer input
def load_knowledge_base():
    """Loads every JSON file once and keeps it in memory, no repeated disk reads."""
    global _knowledge_cache
    if _knowledge_cache:
        return _knowledge_cache
    for crop_folder in os.listdir(KNOWLEDGE_BASE_PATH):
        folder_path = os.path.join(KNOWLEDGE_BASE_PATH, crop_folder)
        if not os.path.isdir(folder_path):
            continue
        entries = []
        for filename in os.listdir(folder_path):
            if filename.endswith(".json"):
                with open(os.path.join(folder_path, filename), "r", encoding="utf-8") as f:
                    entries.append(json.load(f))
        _knowledge_cache[crop_folder] = entries
    return _knowledge_cache

# Functions to normalize and tokenize text, and to score knowledge base entries based on overlap with farmer input
def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.lower()).strip()

# tokenize text into individual words
def _tokenize(text: str) -> list:
    return [token for token in re.findall(r"[a-z0-9]+", text.lower()) if len(token) > 2]

# Score a field by its single strongest matching item — not the sum of all items. This prevents broad, multi-topic documents from winning just by having many chances to partially match; a document must have ONE genuinely strong match to score well, not many weak ones.
def _score_field(query_text: str, field_value, weight: int) -> int:
    """Score a field by its single strongest matching item, not the sum of all items. This prevents broad, multi-topic documents from winning just
    by having many chances to partially match; a document must have ONE
    genuinely strong match to score well, not many weak ones."""
    if not field_value:
        return 0
    # Normalize and tokenize the query text
    query_tokens = set(_tokenize(query_text))
    field_values = [field_value] if isinstance(field_value, str) else list(field_value)
    # Score each item in the field and keep track of the best score
    best_item_score = 0
    for item in field_values:
        if not item:
            continue
        item_text = _normalize_text(str(item))
        item_tokens = set(_tokenize(item_text))
        if not item_tokens:
            continue
        # Calculate the score as the number of overlapping tokens, weighted
        item_score = weight * len(query_tokens & item_tokens)
        if item_text in query_text:
            item_score += weight * 2
        best_item_score = max(best_item_score, item_score)
    return best_item_score

# Function to retrieve knowledge base entries based on crop, reported problem, and observations
def retrieve_knowledge(crop: str, reported_problem: str, observations: list, top_n: int = 3, min_score: int = 1) -> list:
    """
    Retrieve knowledge base entries for a given crop, reported problem, and observations.
    Returns a list of entries sorted by relevance score, with a maximum of top_n entries.
    """
    if not crop:
        return []
    # Map the crop name to the corresponding knowledge base folder
    crop_folder = CROP_FOLDER_MAP.get(crop.lower())
    if not crop_folder:
        return []
    # Load the knowledge base entries for the crop folder
    knowledge_base = load_knowledge_base()
    entries = knowledge_base.get(crop_folder, [])
    if not entries:
        return []
    # Build a query string from the reported problem and observations, normalize it, and score each entry based on overlap with the query. Return the top_n entries with scores above min_score.
    query_parts = []
    if reported_problem:
        query_parts.append(reported_problem)
    for obs in observations or []:
        query_parts.append(obs)
    query_text = _normalize_text(" ".join(query_parts))
    # Score each entry based on the query text and return the top_n entries with scores above min_score.
    scored = []
    for entry in entries:
        score = 0
        score += _score_field(query_text, entry.get("common_farmer_observations", []), weight=6)
        score += _score_field(query_text, entry.get("major_pests", []), weight=5)
        score += _score_field(query_text, entry.get("major_diseases", []), weight=5)
        score += _score_field(query_text, entry.get("topic", ""), weight=4)
        score += _score_field(query_text, entry.get("related_topics", []), weight=3)
        # Add the entry to the list of scored entries
        if score >= min_score:
            scored.append((score, entry))
    # Sort the scored entries in descending order of score and return the top_n entries with their scores included.
    scored.sort(key=lambda x: x[0], reverse=True)
    return [{"score": score, **entry} for score, entry in scored[:top_n]]