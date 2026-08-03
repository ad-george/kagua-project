import os
import sys

from dotenv import load_dotenv

load_dotenv()

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from ai_app.extract_context import extract_context
from ai_app.get_comparison import get_comparison
from ai_app.generate_summary import generate_summary
from ai_app.language_utils import build_language_instruction
from ai_app.rag.retriever import retrieve_knowledge

TEST_CASES = [
    {
        "name": "English Text",
        "text": "My maize leaves are turning yellow.",
        "language": "english",
    },
    {
        "name": "English Voice",
        "text": "My maize leaves are turning yellow.",
        "language": "english",
    },
    {
        "name": "Kiswahili Text",
        "text": "Majani ya mahindi yangu yanageuka njano.",
        "language": "kiswahili",
    },
    {
        "name": "Kiswahili Voice",
        "text": "Majani ya mahindi yangu yanageuka njano.",
        "language": "kiswahili",
    },
    {
        "name": "Mixed Language 1",
        "text": "Mahindi yangu zina yellow leaves.",
        "language": "mixed",
    },
    {
        "name": "Mixed Language 2",
        "text": "Agrovet amesema nispraye lakini jirani amesema nisubiri.",
        "language": "mixed",
    },
]


def run() -> None:
    print("=" * 80)
    print("END-TO-END MULTILINGUAL TEST")
    print("=" * 80)

    passed = 0
    failed = 0

    for case in TEST_CASES:
        print("\n")
        print("=" * 80)
        print(case["name"])
        print("=" * 80)

        try:
            print("USER INPUT")
            print(case["text"])
            print()

            instruction = build_language_instruction(
                case["text"],
                case["language"],
            )

            print("LANGUAGE INSTRUCTION")
            print(instruction)
            print()

            context = extract_context(case["text"])
            context["language"] = case["language"]
            context["raw_input"] = case["text"]

            retrieved_knowledge = retrieve_knowledge(
                crop=context.get("crop"),
                reported_problem=context.get("reported_problem"),
                observations=context.get("observations", []),
            )

            comparison = get_comparison(context, retrieved_knowledge)
            result = generate_summary(context, comparison)
            response_text = result.get("summary_text") or "<no summary generated>"

            print("MODEL RESPONSE")
            print("-" * 80)
            print(response_text)
            print("-" * 80)
            print("✅ PASS")
            passed += 1
        except Exception as exc:
            print("MODEL RESPONSE")
            print("-" * 80)
            print(f"❌ FAILED: {exc}")
            print("-" * 80)
            failed += 1

    print("\nFinished.")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")


if __name__ == "__main__":
    run()
