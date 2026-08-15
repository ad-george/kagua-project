import json
import re
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

NEVER FRAME A SUMMARY AS A DIRECT STATEMENT ABOUT THIS FARMER'S CROP OR AS A
QUOTE FROM THE SOURCE: this is a description of what topic the source
covers, not an assertion the source made about her specific situation.
BAD: "According to KALRO, your maize has nitrogen deficiency."
BAD: "KALRO says your symptoms indicate pest damage."
GOOD: "Explains common maize pests and diseases, how to recognise them, and
what to check before deciding on next steps."
The farmer-friendly sentence should describe what the material explains or
helps with in general — never claim it made a determination about her crop.

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

KAGUA_FOUND — WHAT KAGUA FOUND WHEN IT PUT THE INFORMATION TOGETHER:
This is a new, separate field. Its job is to give the farmer the single most
useful INTERPRETIVE sentence (or two short sentences) about how her pieces
of information relate to each other — not a transcript of what she already
saw on Screen 2/3. It appears directly under a "What Kagua found" heading,
so do not repeat that heading or say things like "Kagua found that..." —
just state the interpretation directly.

THIS FIELD HAS THE SAME SAFETY WEIGHT AS THE PERSPECTIVES RULES ABOVE.

You will receive a field called "attributed_reasons" inside farmer_situation.
This is a list of {"source": ..., "reason": ...} pairs that has ALREADY been
extracted deterministically, in code, from the farmer's own advice text — you
are not deciding whether reasons exist, that decision has already been made
before this prompt ran. Your only job is to turn this list into a sentence.

- IF attributed_reasons IS NON-EMPTY: write kagua_found by stating the
  meaningful difference, using ONLY the reasons listed in attributed_reasons —
  do not soften, add to, or drop any of them, and do not pull in any other
  reasoning from elsewhere. If attributed_reasons has 2+ entries, compare them
  directly. If it has exactly 1 entry, state that single reason plainly with
  no comparison (there is nothing to compare it against).

  REWRITE THE REASON INTO A CLEAN PHRASE — NEVER PASTE THE RAW REASON TEXT
  VERBATIM: the "reason" value in attributed_reasons is the raw extracted
  text, and it still contains its own grammatical scaffolding (e.g. "thought
  it might be stem borer pest," "believed it was fall armyworm caused by
  weather patterns"). Pasting that raw text directly into a new sentence
  produces broken, doubled-up grammar — this is a real bug that has
  happened before and must not happen again. You must reconstruct a clean
  sentence: keep the core content (the cause each person named) and the
  attribution (whose belief it was and how certain they sounded), but
  rewrite the scaffolding so it reads as one grammatical sentence, not two
  fragments stapled together.
  BAD (this exact failure has occurred — pasting the raw reason text after
  "linked it to," producing doubled grammar): "Neighbour linked it to
  thought it might be stem borer pest; agrovet linked it to believed it was
  fall armyworm caused by weather patterns." — this is broken English and
  must never be produced.
  GOOD (same underlying facts, rewritten as one clean sentence, attribution
  and certainty both preserved): "Your neighbour linked the damage to stem
  borer, while the agrovet linked it to fall armyworm and the recent
  weather." — notice "thought it might be" and "believed it was" are gone
  as scaffolding, but the underlying claims are fully intact and still
  clearly attributed to each person, not stated as Kagua's own claim.

  DO NOT REORDER BY PERCEIVED AUTHORITY OR LIKELIHOOD: list/compare the
  reasons in the same order attributed_reasons was given to you (which
  matches the order the farmer originally mentioned them in). Never reorder
  so that the "more official-sounding" source (e.g. an agrovet) comes
  first, or so that the explanation you judge more plausible comes first —
  either would quietly imply a ranking, which kagua_found must never do.

  PRESERVE THE SOURCE'S OWN CERTAINTY EXACTLY — DO NOT ADD OR REMOVE
  HEDGING: keep the same level of certainty the reason was given with (see
  the rewrite rule above — rewriting the scaffolding is not the same as
  changing the certainty). Do not insert softening qualifiers like
  "possible," "maybe," or "might be" in front of a reason that was not
  already hedged that way, and do not strengthen a reason that was already
  hedged into something more certain.
  BAD (adds an extra hedge not present in the reason): reason is "believed
  it was late blight caused by damp weather" → kagua_found says "...linked
  it to damp weather and possible late blight" (the word "possible" was
  added by you, not attributed to the agrovet — this misrepresents what was
  actually said).
  GOOD (states it exactly as attributed, no added or removed hedging):
  "...the agrovet said it was late blight caused by damp weather."

  WORKED EXAMPLE (situation is illustrative only, never reuse this specific
  wording — but this is the exact structure required whenever
  attributed_reasons is non-empty):
  attributed_reasons (illustrative): [
    {"source": "neighbour", "reason": "thought it was cold air damaging the leaves"},
    {"source": "agrovet", "reason": "believed it was late blight caused by damp weather"}
  ]
  CORRECT kagua_found: "Your neighbour linked the problem to cold air, while
  the agrovet said it was late blight caused by damp weather. Kagua cannot
  yet establish which explanation fits your situation."
  INCORRECT (softens the agrovet's reason by inserting "possible," which was
  never part of the attributed reason): "Your neighbour linked the problem
  to cold air, while the agrovet linked it to damp weather and possible late
  blight. The information gathered so far does not establish which
  explanation fits your situation."
  ALSO INCORRECT (pastes the raw reason text as scaffolding instead of
  rewriting it — see the rewrite rule above): "Neighbour linked it to
  thought it was cold air damaging the leaves; agrovet linked it to believed
  it was late blight caused by damp weather."

  You may add one short, neutral follow-on clause about what that kind of
  difference generally means (e.g. that it can be useful to ask each person
  how they reached that view), but never a clause that resolves, ranks, or
  explains which one is more likely correct.

- IF attributed_reasons IS EMPTY: write null for kagua_found. Do not write a
  fallback sentence yourself, do not write "no reason was given" or similar
  in any form — a safe fallback sentence is applied automatically outside of
  this response, entirely outside your control, so leave this field null and
  move on. Writing your own text here when attributed_reasons is empty is
  incorrect regardless of how careful or hedged that text is.

3. If there are no perspectives at all, base kagua_found only on how her
   observations relate to what the trusted sources cover (at a general,
   non-diagnostic level — never naming a specific pest/disease/cause), or,
   if sources_found is 0, write null (a safe fallback is applied
   automatically, same as above).

4. NEVER use this field to diagnose, name a likely cause, rank sources,
   recommend an action, or resolve a disagreement. It interprets HOW the
   pieces of information relate to each other — not WHAT is wrong with the
   crop.

5. Keep it to at most two short sentences, plain language, grounded only in
   this farmer's actual data — never in any example shown in this prompt.

Return ONLY valid JSON, no other text, matching exactly this shape:
{
  "confidence": "HIGH or LOW",
  "guidance_mode": "SPECIFIC or GENERAL_OBSERVATION",
  "sources_found": <number of candidates you judged genuinely relevant>,
  "perspectives": [
    {"source": "<source_type from her advice_received>", "view": "<a short factual restatement of the advice, preserving any already-attributed reasoning per the rule above — no NEW explanation or reasoning invented by you>"}
  ],
  "uncertainty": [<what remains unknown or unconfirmed>],
  "kagua_found": "<the interpretive 'What Kagua found' sentence(s) built ONLY from attributed_reasons per the rules above, in the farmer's response language — or null if attributed_reasons was empty>",
  "sources_selection_reason": "<one short sentence, in the farmer's response language, explaining WHY these particular sources were surfaced — reference her actual reported_problem/observations by name (e.g. 'because you mentioned yellow leaves and holes in the leaves'), NOT a generic template. Must stay neutral: these were chosen for topical relevance to what she described, never framed as confirming a diagnosis. Never mention specific pest/disease names from the sources here — just what SHE reported that made them relevant.>",
  "source_summaries": {
    "<exact topic field from each candidate you were given>": "<one simple farmer-friendly sentence, one entry per candidate>"
  }
}

Do NOT include an "observed" field yourself — the list of what the farmer
reported/observed is built deterministically in code from her actual
reported_problem and observations, not generated by you. This is the same
reasoning as sources_used below: passing through the farmer's own words
exactly, with no risk of you paraphrasing, embellishing, or introducing a
detail she never actually stated.

Do NOT include a "sources_used" field yourself — which sources are shown to
the farmer as reference material is decided separately, in code, from what
was actually retrieved. This is intentional: "Explore Trusted Sources" shows
relevant reference material regardless of whether it was specific enough to
back a confident claim in this comparison — your confidence judgment above
still controls the narrative (perspectives/uncertainty/kagua_found), just not
which sources get shown for further reading. source_summaries, however,
should cover every candidate you were given, since those simplified
sentences get used for display regardless of which sources end up shown.
"""

# ── Deterministic reason extraction and fallback selection ──
# The decision of WHETHER kagua_found should be a safe fallback sentence, or
# an LLM-synthesized comparison of attributed reasons, is made entirely here
# in Python — never left to the model to judge. The model only ever gets
# asked to do the part that genuinely requires language synthesis: turning
# an already-confirmed list of reasons into a readable sentence.

# Matches an explicit reason in a trailing parenthetical, e.g.
# "Suggested spraying (thought it might be pests)" -> "thought it might be
# pests". This is the same parenthetical convention already used upstream
# (see the "PRESERVE ATTRIBUTED REASONING" rule above) — advice arrives
# already carrying this format if a reason was given at all, so detecting
# it is a plain string match, not a judgment call.
_REASON_PATTERN = re.compile(r"\(([^()]+)\)\s*$")


def _extract_reason(advice_text: str):
    if not advice_text:
        return None
    match = _REASON_PATTERN.search(advice_text.strip())
    return match.group(1).strip() if match else None


# Deterministically builds the list of {source, reason} pairs from the
# farmer's own advice_received — never from LLM output — so whether
# "reasons exist" is a plain fact computed in code, not a scan the model is
# trusted to perform correctly. Passed to the LLM as an input; the model is
# never allowed to decide this for itself (see GET_COMPARISON_TASK_PROMPT).
def _attributed_reasons(context: dict) -> list:
    reasons = []
    for a in context.get("advice_received") or []:
        reason = _extract_reason(a.get("advice"))
        if reason:
            reasons.append({"source": a.get("source_type"), "reason": reason})
    return reasons


def _is_kiswahili(language: str) -> bool:
    return language in ("kiswahili", "mixed")


# Strips the leading epistemic scaffolding a raw extracted reason still
# carries (e.g. "thought it might be stem borer pest" -> "stem borer pest"),
# leaving just the core clause. This exists so _compose_reasons_fallback
# below can build a grammatical sentence deterministically, without ever
# needing an LLM call, and without repeating the exact bug this was written
# to fix: pasting "thought it might be X" directly after "linked it to,"
# producing doubled-up grammar ("linked it to thought it might be X").
# If a reason doesn't start with recognizable scaffolding (already a clean
# phrase), it's returned unchanged.
_SCAFFOLD_PATTERN = re.compile(
    r"^(?:thought|believed|suspected|felt|guessed|said|thinks?|believes?|suspects?|feels?)\s+"
    r"(?:it\s+)?(?:was|is|might\s+be|could\s+be)\s+",
    re.IGNORECASE,
)


def _strip_epistemic_scaffolding(reason: str) -> str:
    if not reason:
        return reason
    stripped = _SCAFFOLD_PATTERN.sub("", reason.strip())
    return stripped if stripped else reason.strip()


# Fallback sentences, chosen deterministically in code based on how many
# perspectives exist and whether any carry an attributed reason — never
# based on the LLM's own judgment of when to use them.
_DIFFERS_NO_REASON_FALLBACK = {
    "english": "The advice differs, but the reasons behind the different views are not clear from the information provided.",
    "kiswahili": "Ushauri tofauti umepokelewa, lakini sababu za tofauti hizo hazijabainishwa wazi kutoka kwenye taarifa ulizotoa.",
}
_ONE_PERSPECTIVE_NO_REASON_FALLBACK = {
    "english": "One piece of advice was received. On its own, it does not confirm the cause of the situation.",
    "kiswahili": "Ushauri mmoja ulipokelewa. Peke yake, haujathibitisha chanzo cha hali hii.",
}
KAGUA_FOUND_NO_DATA_FALLBACK = {
    "english": "There is not yet enough information to identify a clear pattern. More observations may help.",
    "kiswahili": "Bado hakuna taarifa za kutosha kubaini mfumo wazi. Uchunguzi zaidi unaweza kusaidia.",
}


# Picks the correct safe fallback sentence when attributed_reasons is empty
# — i.e. whenever there is nothing genuine for kagua_found to be built from.
# This function is the ONLY place that decides which fallback applies; the
# LLM is never asked to make this choice (see prompt: it writes null here).
def _select_no_reason_fallback(num_perspectives: int, language: str) -> str:
    lang_key = "kiswahili" if _is_kiswahili(language) else "english"
    if num_perspectives >= 2:
        return _DIFFERS_NO_REASON_FALLBACK[lang_key]
    if num_perspectives == 1:
        return _ONE_PERSPECTIVE_NO_REASON_FALLBACK[lang_key]
    return KAGUA_FOUND_NO_DATA_FALLBACK[lang_key]


# Deterministic composer for kagua_found, used whenever attributed_reasons
# is non-empty: as the last-resort fallback if the LLM response failed to
# parse or omitted kagua_found, AND as the override target if the LLM's own
# output looks like it pasted raw scaffolding (see _looks_like_raw_paste
# below). This never invents a reason — it only restates the exact reasons
# already extracted in _attributed_reasons, run through
# _strip_epistemic_scaffolding first so the result is one clean sentence
# rather than two fragments stapled together.
def _compose_reasons_fallback(reasons: list, language: str) -> str:
    is_sw = _is_kiswahili(language)
    cleaned = [
        {"source": r["source"], "core": _strip_epistemic_scaffolding(r["reason"])}
        for r in reasons
    ]

    if len(cleaned) == 1:
        r = cleaned[0]
        if is_sw:
            sentence = f"{r['source']} alihusisha hali hiyo na {r['core']}."
        else:
            sentence = f"{r['source']} linked the situation to {r['core']}."
        return sentence[0].upper() + sentence[1:]

    first, rest = cleaned[0], cleaned[1:]
    if is_sw:
        rest_parts = [f"{r['source']} alihusisha na {r['core']}" for r in rest]
        sentence = (
            f"Your {first['source']} alihusisha hali hiyo na {first['core']}, wakati "
            + ", na ".join(rest_parts)
            + ". Kagua bado haiwezi kubaini ni maelezo yapi yanalingana na hali yako."
        )
    else:
        rest_parts = [f"the {r['source']} linked it to {r['core']}" for r in rest]
        sentence = (
            f"Your {first['source']} linked it to {first['core']}, while "
            + ", and ".join(rest_parts)
            + ". Kagua cannot yet establish which explanation fits your situation."
        )
    return sentence


# Detects the specific failure mode this file has already hit twice: the
# LLM pasting a reason's raw, unstripped scaffolding text (e.g. "thought it
# might be X") directly into kagua_found instead of rewriting it into a
# clean sentence, despite the prompt explicitly instructing against this.
# This is a backstop, not a replacement for the prompt instruction — the
# prompt is still the primary defense, this just refuses to trust it a
# third time. If the raw (unstripped) reason text shows up verbatim in the
# output AND still contains scaffolding language, that's a strong signal
# the model pasted rather than synthesized.
_SCAFFOLD_MARKERS = ("thought it", "believed it", "suspected it", "felt it", "thinks it", "believes it", "suspects it")


def _looks_like_raw_paste(kagua_found: str, reasons: list) -> bool:
    if not kagua_found or not reasons:
        return False
    text_lower = kagua_found.lower()
    for r in reasons:
        raw = (r.get("reason") or "").strip().lower()
        if raw and raw in text_lower and any(marker in raw for marker in _SCAFFOLD_MARKERS):
            return True
    return False


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


# Builds the "observed" list deterministically from the farmer's actual
# field observations only — never from the LLM, and never including
# reported_problem. Previously the LLM was asked to construct this list
# itself ("a list combining her reported_problem and observations"), which
# meant it could paraphrase, embellish, or introduce a detail never
# actually stated. That fix (making this deterministic) was only half the
# problem: it also kept merging reported_problem into the same list as
# real observations, which is exactly the "Problem: X appearing under What
# you observed" mixing that must NOT happen — reported_problem is what the
# farmer SAID is wrong; observations are distinct physical signs. Kagua's
# own architecture treats these as separate concepts everywhere else
# (Screen 2, Screen 5's SummaryCard) — this was the one place they were
# still being silently combined. reported_problem is already available to
# the frontend via extractedContext, so it doesn't need to also be
# returned here — this function only ever returns genuine observations.
# Deduplicates case-insensitively (e.g. "stunted growth" / "Stunted growth"
# from Screen 3's checklist landing in the same list as an LLM-extracted
# observation) while preserving the first-seen casing and original order.
def _build_observed(context: dict) -> list:
    items = []
    for obs in context.get("observations") or []:
        if obs:
            items.append(obs)

    seen = set()
    deduped = []
    for item in items:
        key = item.strip().lower()
        if key not in seen:
            seen.add(key)
            deduped.append(item)
    return deduped


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
    language = context.get("language")

    # Computed once, in Python, from the farmer's own data — this is the
    # single source of truth for whether kagua_found should be a safe
    # fallback or an LLM-synthesized comparison. Neither branch below asks
    # the LLM to make this decision.
    attributed_reasons = _attributed_reasons(context)

    if not retrieved_knowledge:
        result = dict(LOW_CONFIDENCE_FALLBACK)
        result["observed"] = _build_observed(context)
        result["perspectives"] = [
            {"source": a.get("source_type"), "view": a.get("advice")}
            for a in context.get("advice_received", [])
        ]
        # No LLM call happens on this branch at all, so kagua_found is
        # always built deterministically here — either the reasons
        # composer (if reasons exist) or the appropriate no-reason
        # fallback (if not). Never a blanket "no data" string regardless
        # of what advice_received actually contained.
        if attributed_reasons:
            result["kagua_found"] = _compose_reasons_fallback(attributed_reasons, language)
        else:
            result["kagua_found"] = _select_no_reason_fallback(len(result["perspectives"]), language)
        return result

    user_message = json.dumps({
        "farmer_situation": {
            "crop": context.get("crop"),
            "reported_problem": context.get("reported_problem"),
            "observations": context.get("observations"),
            "advice_received": context.get("advice_received"),
            "mentioned_weather": context.get("mentioned_weather"),
            "additional_field_observation": field_observation,
            # Handed to the LLM as an already-decided fact, not something it
            # derives itself — see GET_COMPARISON_TASK_PROMPT's kagua_found
            # instructions. Empty list means "no reasons exist," and the
            # LLM is told to return null in that case rather than write its
            # own fallback text.
            "attributed_reasons": attributed_reasons,
        },
        "candidate_knowledge_entries": retrieved_knowledge,
    })
    language_instruction = build_language_instruction(
        context.get("raw_input") or context.get("reported_problem"),
        language,
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

    # observed is always built here in Python from the farmer's actual
    # reported_problem/observations — never from the LLM (see _build_observed
    # docstring). Overwrites unconditionally: even if the LLM included an
    # "observed" field in its JSON despite the prompt telling it not to,
    # this replaces it rather than trusting it.
    result["observed"] = _build_observed(context)

    # Guarantee this key is always present, even if the LLM omitted it —
    # the frontend falls back to a generic sentence when this is None.
    result.setdefault("sources_selection_reason", None)

    # ── kagua_found: the decision is made here, in Python, never by the LLM ──
    # attributed_reasons was computed once at the top of this function and
    # handed to the LLM as a fact. Whatever the LLM wrote is ONLY trusted
    # when attributed_reasons is genuinely non-empty (i.e. the LLM was
    # correctly given real reasons to synthesize from). When
    # attributed_reasons is empty, the LLM's output is discarded outright
    # and replaced with the deterministic fallback — this makes it
    # impossible for the model to substitute its own fallback text, or to
    # skip the fallback when it should have used one, regardless of what
    # it actually returned.
    num_perspectives = len(result.get("perspectives") or [])
    if attributed_reasons:
        llm_kagua_found = result.get("kagua_found")
        if not llm_kagua_found:
            # LLM returned null/empty despite being given real reasons to
            # work with — use the deterministic composer rather than
            # leaving the field blank.
            result["kagua_found"] = _compose_reasons_fallback(attributed_reasons, language)
        elif _looks_like_raw_paste(llm_kagua_found, attributed_reasons):
            # Backstop for a failure mode that has occurred twice already
            # despite explicit prompt instructions against it (see
            # _looks_like_raw_paste docstring): the model pasted a reason's
            # raw scaffolding text verbatim instead of rewriting it into a
            # clean sentence. Rather than trust the prompt a third time,
            # this is caught deterministically and swapped for the
            # composer, which is guaranteed grammatical.
            result["kagua_found"] = _compose_reasons_fallback(attributed_reasons, language)
        # else: trust the LLM's synthesis — this is the one genuinely
        # open-ended part of kagua_found, and it's the only case where the
        # LLM's own wording is used.
    else:
        result["kagua_found"] = _select_no_reason_fallback(num_perspectives, language)

    return result