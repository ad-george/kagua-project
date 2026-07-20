import os
import sys
from dotenv import load_dotenv

load_dotenv()

USE_REAL_TRACK_A = os.getenv("USE_REAL_TRACK_A", "False").lower() == "true"
TRACK_A_PATH = os.getenv("TRACK_A_PATH", "../track-a-ai/app")

def get_track_a():
    """Load Track A (stub or real) based on environment variable"""
    
    if USE_REAL_TRACK_A:
        # Add Track A path to Python path
        track_a_path = os.path.abspath(TRACK_A_PATH)
        if track_a_path not in sys.path:
            sys.path.insert(0, track_a_path)
        
        # Import real Track A
        try:
            from track_a_ai import extract_context, get_comparison, get_source_details
            print("✅ Using REAL Track A")
            return extract_context, get_comparison, get_source_details
        except ImportError as e:
            print(f"❌ Error loading Track A: {e}")
            print("⚠️ Falling back to stub")
            from app.stubs.track_a_stub import extract_context, get_comparison, get_source_details
            return extract_context, get_comparison, get_source_details
    else:
        # Use stub
        from app.stubs.track_a_stub import extract_context, get_comparison, get_source_details
        print("🔧 Using STUB Track A")
        return extract_context, get_comparison, get_source_details