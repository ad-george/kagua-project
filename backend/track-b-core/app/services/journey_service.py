from sqlalchemy.orm import Session
from app.models.models import User, DecisionJourney
from datetime import datetime

# Function to get or create a user based on phone number, county, name, and language
def get_or_create_user(db: Session, phone: str, county: str, name: str = None, language: str = "en"):
    """Get existing user or create new one"""
    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        user = User(
            name=name,
            phone_number=phone,
            county=county,
            preferred_language=language
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
# Function to create a new decision journey for a user
def create_journey(db: Session, user_id: int, crop: str, season: str, growth_stage: str,
                    problem: str, extracted_context: dict = None, raw_input: str = None):
    """
    Start a new decision journey. Stores the full extraction result and raw
    input inside `steps`, along with current_screen=2, so the journey can be
    resumed from Screen 2 if the farmer leaves before finishing.
    """
    journey = DecisionJourney(
        user_id=user_id,
        crop=crop,
        season=season,
        growth_stage=growth_stage,
        problem=problem,
        status="in_progress",
        steps={
            "current_screen": 2,
            "raw_input": raw_input,
            "extracted_context": extracted_context,
        }
    )
    db.add(journey)
    db.commit()
    db.refresh(journey)
    return journey
# Function to update the steps of an existing decision journey
def update_journey_step(db: Session, journey_id: int, updates: dict):
    """
    Merge new step data into the journey's existing steps, rather than
    overwriting it. This way, earlier screens' data (e.g. extracted_context
    from Screen 1/2) isn't lost when a later screen (e.g. Screen 3/4) saves
    its own data.
    """
    journey = db.query(DecisionJourney).filter(DecisionJourney.id == journey_id).first()
    if journey:
        current_steps = dict(journey.steps) if journey.steps else {}
        current_steps.update(updates)
        journey.steps = current_steps
        journey.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(journey)
    return journey