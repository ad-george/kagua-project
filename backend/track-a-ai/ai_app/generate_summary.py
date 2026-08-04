import json
from groq import Groq
import os
from ai_app.prompts.system_prompt import KAGUA_SYSTEM_PROMPT
from ai_app.language_utils import build_language_instruction

groq_client = Groq(api_key=os.environ["GROQ_API_KEY"])

GENERATE_SUMMARY_TASK_PROMPT = """
Your task right now: given a farmer's situation and the comparison result already
produced for her, generate her Kagua Summary — you ARE speaking to the farmer now,
following all rules above, including the KAGUA SUMMARY structure and every strict
safety rule.

You already have the comparison result (confidence, perspectives, uncertainty,
sources_used). Do not re-derive or contradict it — treat it as settled fact and
only turn it into the natural-language summary a farmer can read or listen to.

Immediately after the header, always include one intro sentence explaining what
the document is, before any labeled sections. For English:
"This summary brings together the information shared during this conversation.
It can be used when discussing the situation with an agrovet or extension officer."
For Kiswahili, translate this sentence naturally rather than reusing the English text.

Follow the KAGUA SUMMARY structure, but use the headings in the same language as the farmer's preferred response language.

For English responses use:
- Crop
- Observed problem
- Advice received
- Field observations
- What we know
- What remains uncertain
- Discussion Points (only if genuinely useful; omit entirely if not needed)

For Kiswahili responses use:
- Zao
- Tatizo lililoonekana
- Ushauri uliopokelewa
- Uchunguzi wa shambani
- Tunachojua
- Kinachobaki hakijathibitishwa
- Mambo ya Kujadili (only if genuinely useful; omit entirely if not needed)

Do not reproduce the "------" divider lines shown as formatting decoration in
the KAGUA SUMMARY structure above — those are illustrative only, never part
of the actual text you output. Always write each section as "Label: value"
on a single line (e.g. "Crop: maize"), never as a label alone followed by
the value on a separate line with no colon.

"WHAT REMAINS UNCERTAIN" IS NEVER OPTIONAL WHEN UNCERTAINTY DATA EXISTS: if
the comparison result's uncertainty list is non-empty, this section must
always be included, restating that content. The earlier instruction to omit
empty sections applies only when the underlying field is genuinely empty —
it must never cause you to drop a section that has real data behind it.
Keep this section short — at most two brief bullet-style statements, e.g.
"The exact cause has not been confirmed." Do not pad it with extra clauses.
Confirm before finalizing your response: did I include every section that
has genuine content, and only omit the ones that are truly empty?

ATTRIBUTION RULE FOR "WHAT WE KNOW": Only the farmer's own reported problem and
observations may be stated as plain fact (e.g., "The maize has yellow
leaves."). Anything drawn from trusted-source content (sources_used) must be
explicitly attributed to those sources, never stated as a flat unattributed
fact. Use neutral, non-diagnostic phrasing such as "Trusted sources suggest
this may be associated with..." or "Trusted agricultural guidance notes that
this may be associated with..." rather than language that sounds like a
determination (avoid "suggests your problem is X" — prefer "may be
associated with X"). Kagua organizes what sources say — it does not assert
agricultural claims in its own voice.
BAD: "What we know: Yellowing with wilting can indicate nitrogen deficiency or waterlogging."
GOOD: "What we know: Trusted agricultural guidance notes that yellowing with wilting may be associated with nitrogen deficiency or waterlogging."

"ADVICE RECEIVED" MUST RESTATE ACTUAL CONTENT, NOT JUST NAME SOURCES:
When perspectives exist, state what each one actually said (using the factual
restatement already given in perspectives[].view), not merely which sources
were consulted.
BAD: "Advice received: Advice from neighbour and agrovet."
GOOD: "Advice received: The neighbour suggested waiting. The agrovet suggested spraying."

STRICT RULES FOR THIS TASK:
- Never include diagnoses, treatment recommendations, product names, pesticide
  names, chemical names, or brand names.
- Never rank perspectives or sources as better/worse/correct/incorrect.
- If confidence is "LOW", do not invent an explanation — say plainly that
  trusted sources don't have a confident match yet, and keep tone encouraging,
  not alarming.
- CRITICAL — for every section in the summary (Advice received, Field
  observations, What we know, What remains uncertain, Discussion Points): if
  there is nothing genuine to put there, omit that section or line entirely.
  Never write a sentence whose only job is to announce that something is
  missing. This applies to every section equally, not only advice.
  BAD: "Advice received: No advice was received."
  BAD: "Field observations: No observations were recorded."
  GOOD: (the line or section is simply not present in summary_text at all)
  A sentence that only states an absence does not help the farmer and must
  never appear, regardless of which section it would have belonged to.
- This omission rule applies even to "What we know," which is otherwise a
  core section — an empty label with nothing after it is the exact same
  problem as a placeholder sentence, just phrased differently. If there is
  nothing beyond the farmer's own reported problem to state there, omit the
  entire "What we know" line, label included, rather than leaving the label
  present with blank or no content after it.
  BAD: "What we know: " (label present, nothing after it)
  GOOD: (the "What we know" line is simply absent from summary_text entirely)
  The same applies to "Field observations": never emit the label with nothing
  after it — either include the actual observations or omit the label
  entirely.
- Discussion Points, if included, must arise naturally from the uncertainty
  listed — never invent generic checklist-style questions just to fill space.
- Keep each discussion point SHORT — one plain question a farmer could ask
  out loud in a single breath, roughly 8-12 words. Long, multi-clause
  questions read as homework and are intimidating; short ones are easy to
  scan and easy to actually ask.
  BAD: "What are the possible underlying causes of the yellowing observed on the maize leaves, and how might these differ based on the growth stage?"
  GOOD: "What could be causing the leaves to dry?"
  Limit to at most 3 discussion points, even if more uncertainty exists —
  pick the ones most useful to raise with an agrovet or extension officer.
- Keep sentences short and simple, suitable for a low-literacy rural farmer.
- Always begin the summary with the header "KAGUA SUMMARY" exactly as written,
  ONCE only, when the response language is English. For Kiswahili responses,
  use the translated header "MUHTASARI WA KAGUA" instead, also once only.
  Never repeat the header a second time anywhere in summary_text.
- Match the farmer's language for the content of each section (English or
  Kiswahili, based on the language field in her situation data). Use the
  matching heading set for the selected response language so the structure is
  fully localized, not just the descriptive content.

Return ONLY valid JSON, no other text, matching exactly this shape:
{
  "summary_text": "<the full natural-language Kagua Summary, as short labeled sections or short paragraphs, ready to be read aloud or displayed as-is>",
  "discussion_points": [<0 or more short, natural discussion points for talking with an agrovet or extension officer — omit or leave empty if none genuinely apply>]
}
"""

# Safe fallback if the model call fails or returns unparseable JSON — mirrors
# the LOW_CONFIDENCE_FALLBACK pattern in get_comparison.py, so the frontend
# always receives a usable shape rather than nulls it has to guard against.
SUMMARY_FALLBACK = {
    "summary_text": None,
    "discussion_points": [],
}


def generate_summary(context: dict, comparison: dict) -> dict:
    """
    Generates the natural-language Kagua Summary for Screen 5, using the
    farmer's extracted context plus the already-computed comparison result.
    Does not re-run any comparison logic — comparison is treated as given.
    """
    user_message = json.dumps({
        "farmer_situation": {
            "crop": context.get("crop"),
            "reported_problem": context.get("reported_problem"),
            "observations": context.get("observations"),
            "advice_received": context.get("advice_received"),
            "language": context.get("language"),
        },
        "comparison_result": {
            "confidence": comparison.get("confidence"),
            "perspectives": comparison.get("perspectives"),
            "uncertainty": comparison.get("uncertainty"),
            "sources_used": comparison.get("sources_used"),
        },
    })

    language_instruction = build_language_instruction(
        context.get("raw_input") or context.get("reported_problem"),
        context.get("language"),
    )
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": KAGUA_SYSTEM_PROMPT + GENERATE_SUMMARY_TASK_PROMPT + "\n\nLANGUAGE INSTRUCTION: " + language_instruction},
            {"role": "user", "content": user_message},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )

    try:
        result = json.loads(response.choices[0].message.content)
    except json.JSONDecodeError:
        result = dict(SUMMARY_FALLBACK)

    result.setdefault("summary_text", None)
    result.setdefault("discussion_points", [])
    return result