"""
Diagnostic script for the knowledge base / retriever — prints exactly what
retrieve_knowledge() finds (or doesn't), so we can tell whether the
"sources_used is always empty" issue is a missing-data problem or an actual
retrieval-logic bug.

Usage:
    Run from backend/track-b-core (same relative-path assumption as the
    other test scripts).

    python test_retrieval.py
"""

import sys
import os

sys.path.insert(0, os.path.abspath("../track-a-ai"))

from ai_app.rag.retriever import load_knowledge_base, retrieve_knowledge, KNOWLEDGE_BASE_PATH

print(f"Looking for knowledge base at: {os.path.abspath(KNOWLEDGE_BASE_PATH)}")
print(f"Path exists: {os.path.isdir(KNOWLEDGE_BASE_PATH)}\n")

kb = load_knowledge_base()

if not kb:
    print("Knowledge base loaded, but it's completely empty — no crop folders found at all.")
else:
    print("Crop folders found:")
    for crop_folder, entries in kb.items():
        print(f"  {crop_folder}: {len(entries)} entries")
        for entry in entries[:2]:
            print(f"    - {entry.get('topic', '(no topic field)')}")

print("\n--- Test retrieval for a few realistic scenarios ---\n")

test_cases = [
    {"crop": "maize", "reported_problem": "yellow leaves", "observations": ["wilting"]},
    {"crop": "irish potatoes", "reported_problem": "leaves turning brown", "observations": []},
    {"crop": "cabbage", "reported_problem": "holes in leaves", "observations": ["insects visible"]},
]

for case in test_cases:
    results = retrieve_knowledge(**case)
    print(f"{case['crop']} / '{case['reported_problem']}': {len(results)} result(s)")
    for r in results:
        print(f"    - {r.get('topic')} (score: {r.get('score')})")
    print()