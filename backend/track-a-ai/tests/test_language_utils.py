from ai_app.language_utils import infer_response_language, build_language_instruction


def test_infers_kiswahili_when_context_language_is_kiswahili():
    assert infer_response_language("Majani ya mahindi yangu yanageuka njano", "kiswahili") == "kiswahili"


def test_infers_english_when_context_language_is_english():
    assert infer_response_language("My maize leaves are turning yellow", "english") == "english"


def test_builds_instruction_for_mixed_input():
    instruction = build_language_instruction("Mahindi yangu zina yellow leaves", "mixed")
    assert "dominant language" in instruction


def test_build_language_instruction_has_space_between_generate_and_the():
    instruction = build_language_instruction("My maize leaves are turning yellow.", "english")
    assert "Generate the entire response in English." in instruction

    kiswahili_instruction = build_language_instruction("Majani ya mahindi yangu yanageuka njano.", "kiswahili")
    assert "Generate the entire response in Kiswahili." in kiswahili_instruction
