import os
import json
import re
import numpy as np

# knowledge base retrieval logic for Track-A-AI
KNOWLEDGE_BASE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "knowledge-base")

CROP_FOLDER_MAP = {
    "maize": "maize",
    "irish potatoes": "potato",
    "cabbage": "cabbage",
}

_knowledge_cache = {}
_embedding_cache = {}  # crop_folder -> list of (entry, embedding)
_model = None


def _get_model():
    """Load the multilingual embedding model once and reuse it."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    return _model


def _entry_to_text(entry: dict) -> str:
    """Flatten the most semantically rich fields of a knowledge base entry into
    a single string for embedding. Covers observations, pests, diseases, topic,
    and related topics — the same fields the keyword scorer weights most."""
    parts = []
    if entry.get("topic"):
        parts.append(entry["topic"])
    for obs in entry.get("common_farmer_observations", []):
        parts.append(obs)
    for pest in entry.get("major_pests", []):
        parts.append(pest)
    for disease in entry.get("major_diseases", []):
        parts.append(disease)
    for related in entry.get("related_topics", []):
        parts.append(related)
    return " ".join(parts)


def load_knowledge_base():
    """Loads every JSON file once and keeps it in memory."""
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


def _get_embeddings(crop_folder: str, entries: list):
    """Pre-embed all entries for a crop folder once, cache the result."""
    if crop_folder in _embedding_cache:
        return _embedding_cache[crop_folder]
    model = _get_model()
    texts = [_entry_to_text(e) for e in entries]
    embeddings = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
    _embedding_cache[crop_folder] = embeddings
    return embeddings


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two already-normalized vectors."""
    return float(np.dot(a, b))


# ── Keyword scorer (unchanged from original) ─────────────────────────────────

def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.lower()).strip()


def _tokenize(text: str) -> list:
    return [token for token in re.findall(r"[a-z0-9]+", text.lower()) if len(token) > 2]


def _score_field(query_text: str, field_value, weight: int) -> int:
    if not field_value:
        return 0
    query_tokens = set(_tokenize(query_text))
    field_values = [field_value] if isinstance(field_value, str) else list(field_value)
    best_item_score = 0
    for item in field_values:
        if not item:
            continue
        item_text = _normalize_text(str(item))
        item_tokens = set(_tokenize(item_text))
        if not item_tokens:
            continue
        item_score = weight * len(query_tokens & item_tokens)
        if item_text in query_text:
            item_score += weight * 2
        best_item_score = max(best_item_score, item_score)
    return best_item_score


def _keyword_score(query_text: str, entry: dict) -> int:
    score = 0
    score += _score_field(query_text, entry.get("common_farmer_observations", []), weight=6)
    score += _score_field(query_text, entry.get("major_pests", []), weight=5)
    score += _score_field(query_text, entry.get("major_diseases", []), weight=5)
    score += _score_field(query_text, entry.get("topic", ""), weight=4)
    score += _score_field(query_text, entry.get("related_topics", []), weight=3)
    return score


# ── Hybrid retriever ──────────────────────────────────────────────────────────

def retrieve_knowledge(crop: str, reported_problem: str, observations: list, top_n: int = 3, min_score: int = 1) -> list:
    """
    Hybrid retrieval: combines semantic similarity (multilingual embeddings) with
    keyword overlap scoring. Semantic search handles Kiswahili and mixed-language
    queries that keyword matching would miss. Keyword scoring adds precision for
    exact agricultural terms. Final score = semantic (60%) + keyword (40%).
    """
    if not crop:
        return []
    crop_folder = CROP_FOLDER_MAP.get(crop.lower())
    if not crop_folder:
        return []

    knowledge_base = load_knowledge_base()
    entries = knowledge_base.get(crop_folder, [])
    if not entries:
        return []

    query_parts = []
    if reported_problem:
        query_parts.append(reported_problem)
    for obs in observations or []:
        query_parts.append(obs)
    query_text = _normalize_text(" ".join(query_parts))

    # ── Semantic scores ───────────────────────────────────────────────────────
    try:
        model = _get_model()
        entry_embeddings = _get_embeddings(crop_folder, entries)
        query_embedding = model.encode(query_text, convert_to_numpy=True, normalize_embeddings=True)
        semantic_scores = [_cosine_similarity(query_embedding, emb) for emb in entry_embeddings]
        # Normalize to 0-1 range across this crop's entries
        s_min, s_max = min(semantic_scores), max(semantic_scores)
        s_range = s_max - s_min if s_max > s_min else 1.0
        semantic_scores_norm = [(s - s_min) / s_range for s in semantic_scores]
        semantic_available = True
    except Exception:
        # If sentence-transformers isn't installed yet, fall back to keyword only
        semantic_scores_norm = [0.0] * len(entries)
        semantic_available = False

    # ── Keyword scores ────────────────────────────────────────────────────────
    keyword_scores_raw = [_keyword_score(query_text, entry) for entry in entries]
    kw_max = max(keyword_scores_raw) if any(keyword_scores_raw) else 1
    keyword_scores_norm = [s / kw_max for s in keyword_scores_raw]

    # ── Hybrid combination ────────────────────────────────────────────────────
    semantic_weight = 0.6 if semantic_available else 0.0
    keyword_weight = 1.0 - semantic_weight

    scored = []
    for i, entry in enumerate(entries):
        hybrid = semantic_weight * semantic_scores_norm[i] + keyword_weight * keyword_scores_norm[i]
        # Keep min_score guard using raw keyword score so existing behaviour is preserved
        if keyword_scores_raw[i] >= min_score or (semantic_available and semantic_scores[i] > 0.3):
            scored.append((hybrid, entry))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [{"score": round(score, 4), **entry} for score, entry in scored[:top_n]]
