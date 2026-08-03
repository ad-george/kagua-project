from pydantic import BaseModel
from typing import List, Optional, Dict

# ================== CONTRACT MODELS ==================
# These now match the REAL Track A functions' actual return shapes exactly
# (see ai_app/extract_context.py, get_comparison.py), so switching between
# stub and real mode via USE_REAL_TRACK_A never changes what the frontend
# or get_comparison's fallback logic receives.

class ExtractContextResponse(BaseModel):
    reported_problem: Optional[str] = None
    crop: Optional[str] = None
    observations: List[str] = []
    advice_received: List[Dict] = []
    mentioned_weather: List[str] = []
    language: Optional[str] = None
    extraction_confidence: str = "low"
    could_not_understand: bool = False

class ComparisonResponse(BaseModel):
    confidence: str
    guidance_mode: str
    sources_found: int
    observed: List[str]
    perspectives: List[Dict]
    uncertainty: List[str]
    sources_used: List[Dict]

class SourceDetail(BaseModel):
    name: str
    title: str
    text: str
    audio_url: str

class SummaryResponse(BaseModel):
    summary_text: str
    discussion_points: List[str] = []

# ================== STUB FUNCTIONS ==================

def extract_context(raw_input: str, county: str = "Kiambu"):
    """
    Stub for Track A. Matches the real extract_context.py's exact response
    shape — reported_problem (not "problem"), crop, observations,
    advice_received with "source_type" (not "source"), mentioned_weather
    (not "weather"), language, extraction_confidence, could_not_understand.
    """
    result = ExtractContextResponse(
        reported_problem="yellow leaves",
        crop="maize",
        observations=["wilting"],
        advice_received=[
            {"source_type": "neighbour", "organization": None, "advice": "Suggested waiting."},
            {"source_type": "agrovet", "organization": None, "advice": "Suggested spraying."},
        ],
        mentioned_weather=["rain expected tomorrow"],
        language="english",
        extraction_confidence="high",
        could_not_understand=False,
    ).model_dump()
    # Same three fields the real extract_context() adds after the model call
    result["raw_input"] = raw_input
    result["county"] = county
    result["season"] = None
    result["growth_stage"] = None
    return result

def get_comparison(context: dict, retrieved_knowledge: list, field_observation: str = None):
    """
    Stub for Track A. Parameter renamed from the original "field_observation"
    to "retrieved_knowledge" — main.py actually passes the retrieved
    knowledge-base candidates as the second argument, not field observations,
    so the old name was misleading even though the stub worked positionally.
    """
    return ComparisonResponse(
        confidence="HIGH",
        guidance_mode="SPECIFIC",
        sources_found=2,
        observed=["yellow leaves", "wilting"],
        perspectives=[
            # Factual restatements only, no reasoning ("may save money" /
            # "is better" were opinions, not what get_comparison.py's own
            # guardrail asks for) — matches the CRITICAL RULE FOR
            # PERSPECTIVES in get_comparison.py's task prompt.
            {"source": "neighbour", "view": "Suggested waiting."},
            {"source": "agrovet", "view": "Suggested spraying."},
        ],
        uncertainty=["exact cause", "severity"],
        sources_used=[
            {"name": "KALRO", "topic": "yellow leaves maize", "snippet": "Sample guidance...", "link": "#"}
        ]
    ).model_dump()

def get_source_details(sources_used: List[dict]):
    """Stub for Track A"""
    return [
        SourceDetail(
            name="KALRO",
            title="Managing yellow leaves in maize",
            text="This is sample content from trusted source...",
            audio_url="https://example.com/audio.mp3"
        ).model_dump()
    ]

def generate_summary(context: dict, comparison: dict) -> dict:
    """
    Stub for Track A — used when USE_REAL_TRACK_A is False, so /summary and
    the frontend wiring can be tested without hitting the real LLM.
    """
    return SummaryResponse(
        summary_text=(
            f"Crop: {context.get('crop', 'Not specified')}. "
            f"Reported problem: {context.get('reported_problem', 'Not specified')}. "
            f"Confidence: {comparison.get('confidence', 'Not available')}."
        ),
        discussion_points=[],
    ).model_dump()