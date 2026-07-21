import json
from groq import Groq
import os
from app.prompts.system_prompt import KAGUA_SYSTEM_PROMPT

groq_client = Groq(api_key=os.environ["GROQ_API_KEY"])

GET_COMPARISON_TASK_PROMPT = """
Your task right now: given a farmer's situation and candidate knowledge-base
entries retrieved for her crop, produce a comparison that helps her understand
her situation, you ARE speaking to the farmer now, following all rules above.

You will receive candidate knowledge entries. Some may only loosely relate to
her actual situation — you must judge, using your own reasoning, whether they
genuinely address what she described. Do not assume a candidate is relevant
just because it was retrieved; read its actual content and compare it to her
reported_problem and observations.

CONFIDENCE DECISION:
- Return "confidence": "HIGH" only if at least one candidate genuinely,
  specifically addresses her reported problem and observations.
- Return "confidence": "LOW" if none of the candidates genuinely match, even
  if some were retrieved — a retrieved candidate is not automatically a match.
- When LOW, do not guess or invent an explanation. Say plainly that trusted
  sources don't have a confident match for this specific situation, and pivot
  to encouraging general field observation instead.

CRITICAL RULE FOR PERSPECTIVES: Do not explain why a person gave their advice.
You do not know their reasoning. Do not use phrases such as "believes,"
"thinks," "suspects," "may be based on," "possibly," or "likely because."
Your role is only to accurately restate the advice that was received, in a
short factual phrase.

Examples:
"Suggested waiting."
"Suggested applying fertilizer."
"Suggested spraying."
"Suggested inspecting more plants."

Do not add interpretations, explanations, or reasoning of any kind.

Return ONLY valid JSON, no other text, matching exactly this shape:
{
  "confidence": "HIGH or LOW",
  "guidance_mode": "SPECIFIC or GENERAL_OBSERVATION",
  "sources_found": <number of candidates you judged genuinely relevant>,
  "observed": [<list combining her reported_problem and observations>],
  "perspectives": [
    {"source": "<source_type from her advice_received>", "view": "<a short factual restatement of the advice only, e.g. 'Suggested waiting.' — no explanation or reasoning>"}
  ],
  "uncertainty": [<what remains unknown or unconfirmed>],
  "sources_used": [
    {"name": "<source organization>", "topic": "<the exact topic field from the candidate entry you used>", "snippet": "<short plain-language summary of the relevant guidance>"}
  ]
}

Do NOT include a "link" field yourself — it will be added automatically
afterward from verified data. Leave it out of your JSON entirely.

If confidence is LOW, sources_used should be an empty list, perspectives can
still reflect her advice_received (people's perspectives don't need source
confirmation to be included), and guidance_mode must be "GENERAL_OBSERVATION".
"""

LOW_CONFIDENCE_FALLBACK = {
    "confidence": "LOW",
    "guidance_mode": "GENERAL_OBSERVATION",
    "sources_found": 0,
    "observed": [],
    "perspectives": [],
    "uncertainty": ["No verified guidance matched this specific situation yet."],
    "sources_used": [],
}
# Function to attach verified links to the sources_used in the comparison result
def _attach_verified_links(comparison: dict, retrieved_knowledge: list) -> dict:
    """
    Deterministically overwrites each sources_used[].link with the real,
    verified url from the matching knowledge-base candidate — never trusts
    the AI to copy this correctly, since it has been observed generating
    plausible-looking but fake URLs instead of the real one.
    """
    topic_to_url = {
        entry.get("topic"): entry.get("source", {}).get("url")
        for entry in retrieved_knowledge
    }

    for source in comparison.get("sources_used", []):
        topic = source.get("topic")
        source["link"] = topic_to_url.get(topic)
    return comparison

# Function to get comparison based on context and retrieved knowledge
def get_comparison(context: dict, retrieved_knowledge: list, field_observation: str = None) -> dict:
    if not retrieved_knowledge:
        result = dict(LOW_CONFIDENCE_FALLBACK)
        result["observed"] = [context.get("reported_problem")] + (context.get("observations") or [])
        result["perspectives"] = [
            {"source": a.get("source_type"), "view": a.get("advice")}
            for a in context.get("advice_received", [])
        ]
        return result
    user_message = json.dumps({
        "farmer_situation": {
            "crop": context.get("crop"),
            "reported_problem": context.get("reported_problem"),
            "observations": context.get("observations"),
            "advice_received": context.get("advice_received"),
            "mentioned_weather": context.get("mentioned_weather"),
            "additional_field_observation": field_observation,
        },
        "candidate_knowledge_entries": retrieved_knowledge,
    })
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": KAGUA_SYSTEM_PROMPT + GET_COMPARISON_TASK_PROMPT},
            {"role": "user", "content": user_message},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )
    try:
        result = json.loads(response.choices[0].message.content)
    except json.JSONDecodeError:
        result = dict(LOW_CONFIDENCE_FALLBACK)
    result = _attach_verified_links(result, retrieved_knowledge)
    return result