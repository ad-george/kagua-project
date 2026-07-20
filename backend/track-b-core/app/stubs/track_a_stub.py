from pydantic import BaseModel
from typing import List, Optional, Dict

# ================== CONTRACT MODELS ==================

class ExtractContextResponse(BaseModel):
    crop: Optional[str] = None
    problem: Optional[str] = None
    county: str
    season: Optional[str] = None
    growth_stage: Optional[str] = None
    advice_received: List[Dict] = []
    weather: Optional[Dict] = None
    confidence: str = "LOW"
    guidance_mode: str = "COULD_NOT_UNDERSTAND"

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

# ================== STUB FUNCTIONS ==================

def extract_context(raw_input: str, county: str):
    """Stub for Track A"""
    return ExtractContextResponse(
        crop="maize",
        problem="yellow leaves",
        county=county,
        season="long_rains",
        growth_stage="ripening",
        advice_received=[
            {"source": "neighbour", "advice": "wait and see"},
            {"source": "agrovet", "advice": "spray"}
        ],
        weather={"forecast": "rain expected tomorrow", "source": "KMD"},
        confidence="HIGH",
        guidance_mode="SPECIFIC"
    ).model_dump()

def get_comparison(context: dict, field_observation: dict):
    """Stub for Track A"""
    return ComparisonResponse(
        confidence="HIGH",
        guidance_mode="SPECIFIC",
        sources_found=2,
        observed=["yellow leaves", "holes"],
        perspectives=[
            {"source": "neighbour", "view": "Waiting may save money"},
            {"source": "agrovet", "view": "Treating early is better"}
        ],
        uncertainty=["exact pest", "severity"],
        sources_used=[
            {"name": "KALRO", "snippet": "Sample guidance...", "link": "#"}
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