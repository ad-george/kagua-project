import os
import sys
from dotenv import load_dotenv
load_dotenv()

# Controlled via the .env file so this can be toggled without code changes.
USE_REAL_TRACK_A = os.getenv("USE_REAL_TRACK_A", "False").lower() == "true"

# Path to the Track A project root (backend/track-a-ai).
TRACK_A_PATH = os.getenv("TRACK_A_PATH", "../track-a-ai")

# Add Track A's root folder to Python's import search path BEFORE trying to import from it, this must happen first, or the import below fails.
track_a_path = os.path.abspath(TRACK_A_PATH)
if track_a_path not in sys.path:
    sys.path.insert(0, track_a_path)
# Load either the real Track A functions or the stub, depending on the toggle above. Only one of these branches actually runs, so there's no
# risk of one version silently overwriting the other.
if USE_REAL_TRACK_A:
    try:
        from ai_app.extract_context import extract_context
        from ai_app.get_comparison import get_comparison
        from ai_app.get_source_details import get_source_details
        from ai_app.generate_summary import generate_summary
        print("Using REAL Track A")
    except ImportError as e:
        # If the real Track A can't be imported for any reason, fall back to the stub rather than crashing the whole server.
        print(f"Error loading Track A: {e}")
        print("Falling back to stub")
        from app.stubs.track_a_stub import extract_context, get_comparison, get_source_details, generate_summary
else:
    from app.stubs.track_a_stub import extract_context, get_comparison, get_source_details, generate_summary
    print("Using STUB Track A")
# Function to return the four core Track A functions, either real or stub, as decided above.
def get_track_a():
    """
    Returns Track A's four core functions (extract_context, get_comparison,
    get_source_details, generate_summary) — either the real implementation
    or the stub, already decided above when this module was first loaded.
    """
    return extract_context, get_comparison, get_source_details, generate_summary