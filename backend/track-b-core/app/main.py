from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from datetime import datetime

# Import Track A (stub or real)
from app.services.track_a_loader import get_track_a

# Import database
from app.models.base import get_db
from app.models.models import User, DecisionJourney

# Load Track A once at startup
extract_context, get_comparison, get_source_details, generate_summary = get_track_a()

# Import Track A functions
from ai_app.rag.retriever import retrieve_knowledge
from app.audio_endpoints import register_audio_endpoints
print("Track A loaded successfully")

# Create FastAPI app
app = FastAPI(
    title="Kagua - Track B Core API",
    description="Core backend for Project Kagua",
    version="0.1.0"
)

# Add CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register audio endpoints
register_audio_endpoints(app)


# Define request models for analyze and compare endpoints
class AnalyzeRequest(BaseModel):
    phone: str
    raw_input: str
    county: str
    name: str = None


# Define request model for compare endpoint
class CompareRequest(BaseModel):
    context: Dict[str, Any]
    field_observation: List[str] = []  # Screen 3 sends a list, not a dict


# Define request model for the summary endpoint — takes the context plus
# the comparison result already computed in /compare, so this endpoint
# does no comparison work of its own, only narrates what's already decided.
# Triggered at the Screen 4 → 5 transition (not eagerly inside /compare),
# since Screen 4 doesn't need this content, only Screen 5 does.
class SummaryRequest(BaseModel):
    context: Dict[str, Any]
    comparison: Dict[str, Any]


@app.get("/")
async def root():
    return {"message": "Kagua Track B is running!", "status": "healthy"}


# Analyze endpoint: Extract context from user's input and save journey
@app.post("/analyze")
async def analyze(request: AnalyzeRequest, db: Session = Depends(get_db)):
    """Extract context from user's input and save journey"""
    from app.services.journey_service import get_or_create_user, create_journey
    user = get_or_create_user(db, request.phone, request.county, request.name)
    result = extract_context(request.raw_input, request.county)

    # If both crop and reported_problem are present, create a new journey.
    # We now also pass the full extracted context and raw input, so the
    # journey can later be resumed exactly where the farmer left off.
    if result.get("crop") and result.get("reported_problem"):
        journey = create_journey(
            db,
            user.id,
            result["crop"],
            result.get("season", "unknown"),
            result.get("growth_stage", "unknown"),
            result["reported_problem"],
            extracted_context=result,
            raw_input=request.raw_input,
        )
        result["journey_id"] = journey.id
        result["user_id"] = user.id
    return result

# Compare endpoint: Search knowledge base, get comparison and guidance, and save to journey
@app.post("/compare")
async def compare(request: CompareRequest, db: Session = Depends(get_db)):
    """Search the knowledge base, get comparison and guidance, and save to journey"""
    from app.services.journey_service import update_journey_step
    journey_id = request.context.get("journey_id")

    # Combine what extract_context already found with Screen 3's field observations.
    combined_observations = (
        request.context.get("observations", []) + request.field_observation
    )
    # To ensure retrieve_knowledge sees the combined observations, not just what extract_context originally found.
    retrieved = retrieve_knowledge(
        crop=request.context.get("crop"),
        reported_problem=request.context.get("reported_problem"),
        observations=combined_observations,
    )
    # To ensure get_comparison also sees the combined observations, not just what extract_context originally found.
    enriched_context = dict(request.context)
    enriched_context["observations"] = combined_observations
    result = get_comparison(enriched_context, retrieved)
    if isinstance(result, dict):
        result.setdefault("observed", enriched_context.get("observations", []))

    # If a journey_id is present, merge this step's data into the journey's
    # existing steps (rather than overwriting them), and mark that the
    # farmer has now reached Screen 4, this is what lets "Continue" resume
    # at the correct screen instead of always restarting at Screen 1.
    if journey_id:
        updates = {
            "current_screen": 4,
            "field_observation": request.field_observation,
            "comparison": result,
            "timestamp": str(datetime.utcnow()),
        }
        update_journey_step(db, journey_id, updates)
        result["journey_id"] = journey_id
    return result


# Summary endpoint: Generate the natural-language Kagua Summary for Screen 5,
# using the context plus the comparison already computed in /compare. Called
# when the farmer taps Continue on Screen 4 — not folded into /compare —
# since Screen 4 itself never needs this content, only Screen 5 does.
@app.post("/summary")
async def summary(request: SummaryRequest, db: Session = Depends(get_db)):
    """Generate the Kagua Summary and save it to the journey"""
    from app.services.journey_service import update_journey_step

    journey_id = request.context.get("journey_id")

    result = generate_summary(request.context, request.comparison)

    # Same merge-not-overwrite pattern as /compare, marking that the farmer
    # has now reached Screen 5.
    if journey_id:
        updates = {
            "current_screen": 5,
            "summary": result,
            "timestamp": str(datetime.utcnow()),
        }
        update_journey_step(db, journey_id, updates)
        result["journey_id"] = journey_id
    return result


# Source details endpoint: Get detailed content from sources
@app.post("/source-details")
async def source_details(sources: List[Dict[str, Any]]):
    """Get detailed content from sources"""
    result = get_source_details(sources)
    return result

# Test endpoint to create or get a user
@app.post("/test-user")
async def test_user(phone: str, county: str, name: str = None, db: Session = Depends(get_db)):
    """Test: Create or get user"""
    from app.services.journey_service import get_or_create_user
    user = get_or_create_user(db, phone, county, name)
    return {"user_id": user.id, "phone": user.phone_number, "county": user.county, "name": user.name}

# Test endpoint to create a journey
@app.get("/user/{phone}/journeys")
async def get_user_journeys(phone: str, db: Session = Depends(get_db)):
    """Get all journeys for a user"""
    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        return {"error": "User not found", "phone": phone}
    journeys = db.query(DecisionJourney).filter(
        DecisionJourney.user_id == user.id
    ).order_by(DecisionJourney.created_at.desc()).all()
    result = []
    for journey in journeys:
        result.append({
            "id": journey.id,
            "crop": journey.crop,
            "season": journey.season,
            "growth_stage": journey.growth_stage,
            "problem": journey.problem,
            "status": journey.status,
            "steps": journey.steps,
            "created_at": journey.created_at.isoformat() if journey.created_at else None,
            "updated_at": journey.updated_at.isoformat() if journey.updated_at else None,
        })
    return {
        "user_id": user.id,
        "phone": user.phone_number,
        "name": user.name,
        "total_journeys": len(result),
        "journeys": result,
    }

# Test endpoint to get a single journey by ID
@app.get("/journey/{journey_id}")
async def get_journey(journey_id: int, db: Session = Depends(get_db)):
    """Get a single journey by ID"""
    journey = db.query(DecisionJourney).filter(
        DecisionJourney.id == journey_id
    ).first()
    if not journey:
        return {"error": "Journey not found", "journey_id": journey_id}
    return {
        "id": journey.id,
        "user_id": journey.user_id,
        "crop": journey.crop,
        "season": journey.season,
        "growth_stage": journey.growth_stage,
        "problem": journey.problem,
        "status": journey.status,
        "steps": journey.steps,
        "created_at": journey.created_at.isoformat() if journey.created_at else None,
        "updated_at": journey.updated_at.isoformat() if journey.updated_at else None,
    }

# Follow-up endpoint: saves the farmer's post-conversation outcome and
# rating. Called from the Home screen when the farmer responds to the
# "How did it go?" card. Both fields are optional so a partial response
# (e.g. only outcome, no rating yet) is still saved.
from typing import Optional

class FollowUpRequest(BaseModel):
    outcome: Optional[str] = None
    rating: Optional[str] = None

@app.put("/journey/{journey_id}/follow-up")
async def update_follow_up(journey_id: int, request: FollowUpRequest, db: Session = Depends(get_db)):
    """Save the farmer's follow-up outcome and helpfulness rating."""
    journey = db.query(DecisionJourney).filter(DecisionJourney.id == journey_id).first()
    if not journey:
        return {"error": "Journey not found", "journey_id": journey_id}
    if request.outcome is not None:
        journey.follow_up_outcome = request.outcome
    if request.rating is not None:
        journey.follow_up_rating = request.rating
    journey.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Follow-up saved", "journey_id": journey_id}


# Test endpoint to update the status of a journey
@app.put("/journey/{journey_id}/status")
async def update_journey_status(journey_id: int, status: str, db: Session = Depends(get_db)):
    """Update journey status (in_progress, completed)"""
    journey = db.query(DecisionJourney).filter(
        DecisionJourney.id == journey_id
    ).first()
    if not journey:
        return {"error": "Journey not found", "journey_id": journey_id}
    journey.status = status
    journey.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(journey)
    return {
        "message": "Status updated",
        "journey_id": journey.id,
        "new_status": journey.status,
    }