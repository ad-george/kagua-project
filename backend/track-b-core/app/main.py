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
extract_context, get_comparison, get_source_details = get_track_a()

# Import Track A functions
from ai_app.rag.retriever import retrieve_knowledge
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
# Define request model for source details endpoint
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

    # if both crop and reported_problem are present, create a new journey
    if result.get("crop") and result.get("reported_problem"):
        journey = create_journey(
            db,
            user.id,
            result["crop"],
            result.get("season", "unknown"),
            result.get("growth_stage", "unknown"),
            result["reported_problem"],
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
    # If a journey_id is present, update the journey with the comparison result and field observations.
    if journey_id:
        step_data = {
            "comparison": result,
            "field_observation": request.field_observation,
            "timestamp": str(datetime.utcnow()),
        }
        update_journey_step(db, journey_id, step_data)
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
    # If the user is not found, return an error message with the phone number
    if not user:
        return {"error": "User not found", "phone": phone}
    journeys = db.query(DecisionJourney).filter(
        DecisionJourney.user_id == user.id
    ).order_by(DecisionJourney.created_at.desc()).all()
    result = []
    # If the user has no journeys, return an empty list with the user details
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
    # If the user has journeys, return the list of journeys with the user details
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
    # If the journey is not found, return an error message with the journey ID
    if not journey:
        return {"error": "Journey not found", "journey_id": journey_id}
    # If the journey is found, return the journey details
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
# Test endpoint to update the status of a journey
@app.put("/journey/{journey_id}/status")
async def update_journey_status(journey_id: int, status: str, db: Session = Depends(get_db)):
    """Update journey status (in_progress, completed)"""
    journey = db.query(DecisionJourney).filter(
        DecisionJourney.id == journey_id
    ).first()
    # If the journey is not found, return an error message with the journey ID
    if not journey:
        return {"error": "Journey not found", "journey_id": journey_id}
    # If the journey is found, update the status and return a success message
    journey.status = status
    journey.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(journey)
    # Return a success message with the journey ID and new status
    return {
        "message": "Status updated",
        "journey_id": journey.id,
        "new_status": journey.status,
    }