import json
from groq import Groq
import os
from ai_app.prompts.system_prompt import KAGUA_SYSTEM_PROMPT
from ai_app.language_utils import build_language_instruction

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
- When LOW, do not guess or invent an explanation. Say plainly that the
  available guidance does not confirm the exact cause of this specific
  situation, and pivot to encouraging general field observation instead.

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

PRESERVE ATTRIBUTED REASONING ALREADY IN advice_received: if an advice_received
entry's "advice" text already includes reasoning in parentheses (e.g.
"Suggested spraying (thought it might be pests)"), keep that parenthetical
exactly as given when restating it in "view" — it was already extracted and
attributed correctly upstream. The rule above ("do not explain why") means
YOU must not invent or add new reasoning of your own; it does not mean
stripping reasoning that the farmer's advice source already stated and that
arrived already attributed. Do not remove existing parenthetical reasoning
just to shorten the phrase.

TRANSLATE STRAY ENGLISH/LOANWORDS INSIDE ADVICE TEXT WHEN WRITING IN
KISWAHILI: an advice entry's action word (e.g. "spray") may sometimes arrive
as an English or untranslated loanword (e.g. "nispulize") even within
otherwise-Kiswahili advice, since it was extracted from mixed-language
speech. When your response language is Kiswahili, restate the action itself
naturally in Kiswahili rather than reproducing the loanword verbatim — do not
leave an English/loanword action sitting inside an otherwise-Kiswahili "view"
sentence. Any attributed reasoning in parentheses should also render in
Kiswahili, while staying just as clearly attributed as before.
Example: advice="Suggested nispulize (thought it might be pests)", language=kiswahili
BAD: "view": "Suggested nispulize (thought it might be pests)."
GOOD: "view": "Alipendekeza kupulizia dawa (alidhani labda ni wadudu)."

FARMER-FRIENDLY SOURCE SUMMARIES: For every candidate knowledge entry you were
given (not just ones you judge specifically relevant — every candidate),
write ONE short, plain-language sentence a smallholder farmer could easily
understand, rephrasing its document_summary in simple words. Avoid research
jargon like "diagnostic field markers," "endemic," "virus complexes," or
similar technical phrasing. Focus on what the source actually helps the
farmer do or recognize, not on describing the document itself.

Example:
Technical: "Comprehensive crop protection guide outlining diagnostic field
markers for endemic chewing and sucking pests, virus complexes, ear rots, and
non-chemical integrated pest management systems."
Farmer-friendly: "Explains common maize pests and diseases, how to recognise
them, and what to check before deciding on next steps."

THIS IS NOT OPTIONAL AND MUST NEVER BE SKIPPED FOR ANY CANDIDATE: a missing
source_summaries entry for even one candidate means that source falls back
to its raw technical document_summary being shown directly to the farmer —
exactly the jargon-heavy language this rule exists to prevent. Before
finalizing your JSON response, count the candidate_knowledge_entries you were
given and confirm source_summaries has exactly that many entries, one per
topic, with none skipped — regardless of whether you judged that candidate
genuinely relevant to this farmer's situation. Relevance affects confidence/
sources_found, never whether a candidate gets a friendly summary.

SOURCE_SUMMARIES MUST MATCH THE RESPONSE LANGUAGE: write each source_summaries
sentence in the same language as the rest of your response (per the language
instruction below) — do not default to English for this field specifically
just because the source material itself is in English. A Kiswahili response
must have Kiswahili source_summaries too, not English ones sitting inside an
otherwise-Kiswahili result.

CROP NAME IN KISWAHILI: when a source summary or any other output mentions
the farmer's crop in Kiswahili, use exactly these translations, never a
substitute vegetable name:
- "maize" → "mahindi"
- "irish potatoes" → "viazi"
- "cabbage" → "kabichi" (NOT "kale" — kale/sukuma wiki is a different,
  unrelated leafy vegetable; do not conflate the two)

CRITICAL — THE EXAMPLES ABOVE ARE FORMAT ILLUSTRATIONS ONLY, NEVER CONTENT TO
REUSE: every example in this prompt (crops, symptoms, causes, phrasing) is
invented purely to show structure. Never copy any example's specific
wording, symptoms, or claims into your actual answer, even if it happens to
superficially resemble this farmer's real situation. Every value you return
must be grounded only in the actual farmer_situation and
candidate_knowledge_entries given to you in this conversation.

SOURCES_SELECTION_REASON — THIS MUST BE CASE-SPECIFIC, NOT A TEMPLATE: this
field exists so the farmer understands why THIS set of sources was shown to
HER, not a generic policy statement she'd see regardless of her situation.
Reference her actual reported_problem and/or observations by name.
BAD (generic template, could apply to any farmer): "These sources were
selected because they discuss symptoms that may relate to the observations
you shared."
GOOD (references her actual case): "These were selected because you
mentioned yellow leaves and holes in the leaves." (in Kiswahili if that's
her response language)
Keep it to one short sentence. Never name a specific pest, disease, or
diagnosis here — only restate what SHE reported, not what the sources say
about it.

Return ONLY valid JSON, no other text, matching exactly this shape:
{
  "confidence": "HIGH or LOW",
  "guidance_mode": "SPECIFIC or GENERAL_OBSERVATION",
  "sources_found": <number of candidates you judged genuinely relevant>,
  "observed": [<list combining her reported_problem and observations>],
  "perspectives": [
    {"source": "<source_type from her advice_received>", "view": "<a short factual restatement of the advice, preserving any already-attributed reasoning per the rule above — no NEW explanation or reasoning invented by you>"}
  ],
  "uncertainty": [<what remains unknown or unconfirmed>],
  "sources_selection_reason": "<one short sentence, in the farmer's response language, explaining WHY these particular sources were surfaced — reference her actual reported_problem/observations by name (e.g. 'because you mentioned yellow leaves and holes in the leaves'), NOT a generic template. Must stay neutral: these were chosen for topical relevance to what she described, never framed as confirming a diagnosis. Never mention specific pest/disease names from the sources here — just what SHE reported that made them relevant.>",
  "source_summaries": {
    "<exact topic field from each candidate you were given>": "<one simple farmer-friendly sentence, one entry per candidate>"
  }
}

Do NOT include a "sources_used" field yourself — which sources are shown to
the farmer as reference material is decided separately, in code, from what
was actually retrieved. This is intentional: "Explore Trusted Sources" shows
relevant reference material regardless of whether it was specific enough to
back a confident claim in this comparison — your confidence judgment above
still controls the narrative (observed/perspectives/uncertainty), just not
which sources get shown for further reading. source_summaries, however,
should cover every candidate you were given, since those simplified sentences
get used for display regardless of which sources end up shown.
"""

LOW_CONFIDENCE_FALLBACK = {
    "confidence": "LOW",
    "guidance_mode": "GENERAL_OBSERVATION",
    "sources_found": 0,
    "observed": [],
    "perspectives": [],
    "uncertainty": ["No verified guidance matched this specific situation yet."],
    "sources_used": [],
    "sources_selection_reason": None,
}


# Builds sources_used deterministically from what the retriever actually
# found, independent of the LLM's confidence judgment. Confidence reflects
# how specifically these sources address the farmer's *exact* situation —
# but "Explore Trusted Sources" is reference material, not a claim tied to
# a diagnosis, so it should show what was retrieved regardless of whether
# the LLM judged it a close enough match to narrate confidently.
#
# friendly_summaries (topic -> simplified sentence) only affects the display
# text — it never affects which sources are included, so a missing or
# failed LLM response degrades gracefully to the original technical
# document_summary rather than breaking anything.
def _build_sources_used(retrieved_knowledge: list, friendly_summaries: dict = None, top_n: int = 3) -> list:
    friendly_summaries = friendly_summaries or {}
    sources = []
    for entry in retrieved_knowledge[:top_n]:
        source_info = entry.get("source") or {}
        topic = entry.get("topic")
        sources.append({
            "name": source_info.get("organization"),
            "topic": topic,
            "snippet": friendly_summaries.get(topic) or entry.get("document_summary"),
            "link": source_info.get("url"),
        })
    return sources


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
    language_instruction = build_language_instruction(
        context.get("raw_input") or context.get("reported_problem"),
        context.get("language"),
    )
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": KAGUA_SYSTEM_PROMPT + GET_COMPARISON_TASK_PROMPT + "\n\nLANGUAGE INSTRUCTION: " + language_instruction},
            {"role": "user", "content": user_message},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )
    try:
        result = json.loads(response.choices[0].message.content)
    except json.JSONDecodeError:
        result = dict(LOW_CONFIDENCE_FALLBACK)

    # source_summaries only affects display text (see _build_sources_used) —
    # popping it here keeps it out of the final result shape, since it was
    # only ever an intermediate ingredient, not something the frontend needs.
    friendly_summaries = result.pop("source_summaries", {}) or {}

    # sources_used is always built here in Python from retrieved_knowledge
    # directly — never from the LLM — so it reflects what was actually
    # retrieved regardless of the confidence judgment above.
    result["sources_used"] = _build_sources_used(retrieved_knowledge, friendly_summaries)

    # Guarantee this key is always present, even if the LLM omitted it —
    # the frontend falls back to a generic sentence when this is None.
    result.setdefault("sources_selection_reason", None)

    return result