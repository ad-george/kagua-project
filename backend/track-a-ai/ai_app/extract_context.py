import json
from groq import Groq
import os

# Initialize the Groq client
groq_client = Groq(api_key=os.environ["GROQ_API_KEY"])

# System prompt for extracting structured information from a farmer's voice note
EXTRACT_CONTEXT_SYSTEM_PROMPT = """
You are an information extraction system. Your only job is to read one farming
conversation (a farmer's voice note, transcribed to text) and extract structured
information from it — you are not talking to the farmer, so do not add advice,
opinions, or conversational tone.

CROP NORMALIZATION: This project supports exactly three pilot crops. Always
return crop using its standard English name, even if the farmer used a Swahili
or local term:
- "maize" (also: mahindi)
- "irish potatoes" (also: viazi, potatoes)
- "cabbage" (also: kabichi)
If the farmer mentions a crop outside these three, return the crop as she said
it, in lowercase, do not force it into one of the three.

LANGUAGE DETECTION: Mark language as "mixed" whenever the sentence combines
Swahili grammar/words with English words in the same sentence (this is common
code-switching, e.g. "Mahindi yangu yana yellow leaves" is mixed, not kiswahili).
Only use "kiswahili" when the entire sentence is in Swahili, and "english" when
the entire sentence is in English.

EXCEPTION — proper nouns, names, and honorifics do NOT count as
code-switching. A person's name, an honorific/title attached to a name
(e.g. "Mzee", "Mama", "Bwana", "Mzee Gitau", "Mama Njeri"), or a place
name that happens to be a Swahili word does not make an otherwise-English
sentence "mixed" — judge the language purely by the grammar and vocabulary
of the sentence's actual content, not by names or titles embedded in it.
Example: "My neighbor Mzee Gitau told me it's cold soil" is english, not
mixed — "Mzee" here identifies a specific person, it is not Swahili being
used to communicate content. The same exception applies to crop/place
names already normalized elsewhere in this prompt (e.g. "mahindi" used as
the crop name itself, not embedded in a sentence, does not on its own
trigger "mixed" if the surrounding sentence is otherwise English).

CRITICAL RULE: Do not infer or guess missing information. If the farmer never
mentions a crop, return null for crop. If she never mentions a specific problem,
return null for reported_problem. Never fill in a plausible-sounding value, only extract what was actually said.

The farmer is REPORTING a problem, not confirming a diagnosis. Extract it as
"reported_problem", not as an established fact.

DO NOT PROMOTE A THIRD PARTY'S DIAGNOSIS INTO reported_problem: if a named
diagnosis or disease name appears in the transcript because a neighbour,
agrovet, or other source said it — not because the farmer is describing it
as her own belief — that diagnosis belongs ONLY inside that person's
advice_received entry (as the reasoning, per the advice-reasoning rule
below), never in reported_problem. This holds even if the farmer disagrees
with that diagnosis, and even if it's the most prominent term in the
transcript. reported_problem must reflect what the farmer herself is
reporting is wrong — either a physical sign she describes, or a belief she
explicitly states as her own.
Example: "My neighbour told me this is definitely MLND and I should uproot
everything. But I think the problem is just nitrogen because of the heavy
rain."
BAD: reported_problem = "MLND" (this was the neighbour's claim, not the
farmer's; she explicitly disagreed with it)
GOOD: reported_problem = "nitrogen deficiency" (her own stated belief) —
and advice_received includes {"source_type": "neighbour", "advice":
"Suggested uprooting everything (thought it was MLND)"} — with "MLND"
appearing only there, correctly attributed.
If the farmer states no physical sign or belief of her own at all — only
relays someone else's diagnosis without endorsing it — return null for
reported_problem rather than filling it with the other person's claim.

Do not duplicate the reported_problem into observations. Observations are ONLY
distinct physical signs mentioned separately from the main problem — for example
if she says "my maize is yellow AND I saw holes," reported_problem is "yellow
leaves" and observations is ["holes"]. If she mentions no separate signs, return
observations as an empty list, do not repeat reported_problem there. This also
applies within a single phrase, e.g. "yellow leaves with holes" should produce
reported_problem: "yellow leaves" and observations: ["holes"], not both fields
containing the same or overlapping content.

If the farmer mentions more than one crop AND it's unclear which one she's
asking about, do not pick one. Return crop as null and extraction_confidence as
"low". If she clearly identifies which crop has the problem (e.g. "my maize is
fine but my cabbage has yellow leaves"), extract the crop she specified normally, this is not ambiguous.

Normalize equivalent source names where the meaning is clear, for example:
"shopkeeper", "agro dealer", "agrovet owner", "farm input shop" all mean "agrovet".
A named organization (e.g. "One Acre Fund") should be kept as "organization",
with "source_type" set to the general role (e.g. "trainer").

CRITICAL RULE FOR ADVICE: The "advice" field must always lead with a short
factual restatement of what was suggested — that part must never contain
speculation words like "believes," "thinks," "suspects," "possibly," or
"likely because." If the source also gave a reason for their advice, append
it in parentheses using clearly attributed, neutral phrasing (e.g. "thought
it might be...", "believed it was..."), so it reads as the source's stated
belief, never as Kagua asserting a fact. Do not drop a stated reason
entirely — losing it changes the meaning of what was actually said — but
never let the reason stand alone as an unattributed causal claim.
Examples, given "my neighbour thinks it's pests so he told me to spray":
BAD: "Thinks it's pests, suggested spraying." (reason stated as if fact, no attribution)
BAD: "Suggested spraying." (reason dropped entirely, loses information)
GOOD: "Suggested spraying (thought it might be pests)."
This applies even when the reasoning is stated plainly by the farmer —
preserve it, but always wrapped in attributed language.

Return only unique observations, do not repeat the same observation twice even
if the farmer mentions it more than once.

If the farmer mentions weather (e.g. "rain is expected tomorrow"), capture it
in mentioned_weather. If she mentions nothing about weather, return an empty list.

BADGE EXTRACTION — STRUCTURAL FACTS ABOUT HOW THE ADVICE ARRIVED, NEVER ABOUT
WHETHER THE ADVICE IS CORRECT: For each advice_received entry, also extract
three structural facts about the interaction itself. Each field must be
true, false, or null — return null whenever the transcript does not clearly
state or clearly imply the answer. NEVER guess, and never default to a
"typical" value just because of the source's role (e.g. do not assume every
agrovet sells a product unless the transcript actually says so).

IMPORTANT — these three fields are about the INTERACTION ITSELF (who they
are, whether they saw the plant, whether they pushed a product), never
about the content of their diagnosis. Never let what a source said was
wrong with the crop influence any of these three answers — a source who
gave a completely wrong diagnosis can still be a named source who saw the
plant in person and sold nothing, and a source who gave the "right"
diagnosis can still be anonymous and selling something. Judge each field
only against its own specific test below, not against how plausible or
correct their advice sounded.

- "saw_in_person": true if this source personally saw or examined the crop
  or the field directly (in person). false if the source was only told
  about it, shown a photo, or otherwise did not see it directly themselves.
  null if the transcript doesn't make this clear either way. Being asked
  for advice and giving an answer — even a confident, specific-sounding
  one — does NOT by itself imply the source saw or visited the field.
  Only mark true if the transcript actually states or clearly implies a
  visit, an in-person look, or a direct physical examination (of the
  field, the plant, or something physical brought to them like a sample
  leaf). Do not infer a visit just because the advice sounds detailed or
  authoritative — confidence in the advice is not evidence of having seen
  anything.
- "named_source": true if this is an identifiable person or specific
  service the farmer directly interacted with (a neighbour, a specific
  agrovet, an extension officer, a named organization) — referring to them
  by role only (e.g. "my neighbour," "the agrovet," "the woman at the
  agrovet") still counts as named/known, since she can identify and return
  to them. Do NOT return null just because no personal name was given —
  a role-based reference to a specific individual or shop she actually
  visited or spoke to is enough on its own to answer true. false only if
  the source is genuinely anonymous or broadcast — a radio programme, a
  forwarded WhatsApp message from an unknown origin, a social media post,
  a group-chat message from someone she doesn't personally know. null only
  if genuinely unclear which category applies (e.g. the transcript gives no
  indication at all of who or what the source was).
- "sells_product": true ONLY if the transcript explicitly indicates this
  source recommended, offered, or tried to sell her a specific product
  (e.g. "tried to sell me a chemical spray," "told me to buy X," "handed
  me two fungicides"). false if the source_type is inherently
  non-commercial (neighbour, family, extension officer) AND there is no
  mention of a product being sold or recommended for purchase — in this
  case you MUST return false, not null; the absence of any product
  mention for a non-commercial source is itself the answer, not an
  unclear case. null is reserved ONLY for a source whose role is
  ambiguous or commercial-capable (e.g. an agrovet, a trainer) where the
  transcript never says whether a product was pushed either way.

Worked badge examples (structural facts only, ignoring what was diagnosed).
These two examples use different, unrelated sources on purpose — the rule
being illustrated is general and applies to whatever source types and
phrasing appear in any transcript, not just these specific words or names.

Example 1 — "My neighbour, Mzee Gitau, told me it's just cold soil and
advised mixing manure with lime. The agrovet woman said it's early blight
and handed me two fungicides to spray."
- Neighbour: saw_in_person = null (the transcript only says she asked him
  and he told her something — there is no mention of him visiting the
  field, looking at the plants, or examining anything physical; do not
  mark true just because his advice sounds specific or confident), named_source
  = true (a specific, identifiable neighbour by name/role — she can go
  back to him), sells_product = false (neighbour is non-commercial and no
  product/sale is mentioned — do not return null here).
- Agrovet: saw_in_person = true (this transcript's fuller version has her
  physically bringing a sample leaf to the agrovet, which the agrovet then
  examines in person — a physical sample handed over and looked at counts
  as an in-person examination, even though the whole field wasn't visited),
  named_source = true (a specific agrovet she physically visited — role-only
  reference still counts, do not return null for lack of a personal name),
  sells_product = true (she was explicitly handed fungicides).

Example 2 — "My cousin came by and said the yellowing is probably a
watering issue. Later I heard on the radio that a similar problem was
going around this season."
- Cousin: named_source = true (family member she knows and can go back to
  — role-only reference is enough), sells_product = false (family is
  non-commercial and no product is mentioned).
- Radio: named_source = false (a broadcast with no identifiable person she
  can return to), sells_product = null (radio segments are ambiguous —
  the transcript doesn't say whether any product was mentioned on air,
  so this stays unclear rather than being forced to false).

In both examples, note that the accuracy or plausibility of each source's
diagnosis has no bearing on any badge answer — every field is judged only
against its own specific test (identifiability, direct interaction,
product involvement), never against how convincing or correct the advice
sounded.

Only extract these badges for advice_received entries that are already
being extracted per the rules above — never invent an entry just to attach
badges to it.

ADVICE AGREEMENT — ONLY RELEVANT WHEN 2 OR MORE ADVICE ENTRIES EXIST: also
return a top-level "advice_agreement" field. Compare the actual actions
each source suggested (not their stated reasons — the concrete action):
- "agree" if the sources suggested the same or clearly equivalent action.
- "disagree" if the sources suggested different or conflicting actions.
- null if there are fewer than 2 advice_received entries, or if it's
  genuinely unclear whether the actions are the same or different.
This is a plain factual comparison of what was suggested — never a
judgment about which suggestion is correct, better, or more likely true.

PRICE MENTIONED — ONLY IF AN EXPLICIT AMOUNT WAS STATED: also return a
top-level "price_mentioned" field. Set it ONLY if the transcript explicitly
states a specific price, cost, or quote anywhere (e.g. "the spray costs
KES 2,500," "he wanted 500 bob for it," "quoted me three thousand
shillings"). Preserve the amount and currency exactly as she said it —
clean up only obvious spelling/spacing, never convert, round, or reformat
the number, and never add a currency symbol she didn't use herself. If no
price, cost, or amount of money is mentioned anywhere in the transcript,
return null — never estimate or infer a typical price for a product or
service that wasn't actually quoted a number.

Return ONLY valid JSON, no other text, matching exactly this shape:
{
  "reported_problem": "<short agricultural phrase, e.g. 'yellow leaves' not a full sentence, or null>",
  "crop": "<the crop mentioned, normalized to standard English name per rules above, or null>",
  "observations": ["<distinct physical signs beyond reported_problem, unique only>"],
  "advice_received": [
    {
      "source_type": "<normalized role: neighbour, agrovet, trainer, family, etc.>",
      "organization": "<named organization if mentioned, e.g. 'One Acre Fund', else null>",
      "advice": "<what they said, short phrase>",
      "saw_in_person": true,
      "named_source": true,
      "sells_product": null
    }
  ],
  "advice_agreement": "<'agree', 'disagree', or null per the rules above>",
  "price_mentioned": "<the exact price/amount as stated, e.g. 'KES 2,500', or null if none was mentioned>",
  "mentioned_weather": ["<any weather the farmer mentioned herself, e.g. 'rain expected tomorrow'>"],
  "language": "<'english', 'kiswahili', or 'mixed' if she code-switched>",
  "extraction_confidence": "<'high', 'medium', or 'low' depending on how clear the input was>",
  "could_not_understand": false
}

If the input is garbled, empty, or completely incomprehensible, return exactly:
{
  "reported_problem": null,
  "crop": null,
  "observations": [],
  "advice_received": [],
  "advice_agreement": null,
  "price_mentioned": null,
  "mentioned_weather": [],
  "language": null,
  "extraction_confidence": "low",
  "could_not_understand": true
}

The observations and advice_received lists can have any number of entries, including zero.
"""


# Defensive guarantee that every advice_received entry has all three badge
# keys present (as None if the LLM omitted one), so the frontend never has
# to distinguish "key missing" from "key explicitly null" — both mean
# "don't show this badge."
def _ensure_badge_keys(advice_received: list) -> list:
    for entry in advice_received or []:
        entry.setdefault("saw_in_person", None)
        entry.setdefault("named_source", None)
        entry.setdefault("sells_product", None)
    return advice_received


# Deterministic backstop for sells_product only — the one badge field
# where the prompt's own rule reduces to something code can verify: a
# non-commercial source_type (neighbour, family, extension officer) with
# no product mentioned MUST be false per EXTRACT_CONTEXT_SYSTEM_PROMPT's
# own instructions, not null. This exists because the LLM doesn't always
# apply that rule even when clearly stated (observed directly: the same
# rule was already in the prompt and still returned null for a plain
# neighbour-advice case). This is NOT extended to named_source or to
# sells_product for ambiguous/commercial-capable roles (agrovet, trainer)
# — those genuinely depend on judgment a fixed rule can't safely replace,
# which is exactly why the prompt marks them null-when-unclear rather
# than defaulting them.
#
# Deliberately conservative: only fires when sells_product is still null
# after extraction, the source_type is one of the three documented
# non-commercial categories, AND the advice text itself shows no
# product-purchase language. If any such language is present, this is
# left as null rather than forced false — a wrongly-forced false would
# hide a real "sells a product" badge, which is worse than a badge that
# simply doesn't render.
_NON_COMMERCIAL_SOURCE_TYPES = {"neighbour", "neighbor", "family", "extension officer"}
_PRODUCT_MENTION_KEYWORDS = (
    "buy", "bought", "sell", "sold", "sale", "purchase",
    "spray", "fungicide", "pesticide", "chemical", "product",
)


def _apply_sells_product_backstop(advice_received: list) -> list:
    for entry in advice_received or []:
        if entry.get("sells_product") is not None:
            continue

        source_type = (entry.get("source_type") or "").strip().lower()
        if source_type not in _NON_COMMERCIAL_SOURCE_TYPES:
            continue

        advice_text = (entry.get("advice") or "").lower()
        if any(keyword in advice_text for keyword in _PRODUCT_MENTION_KEYWORDS):
            continue

        entry["sells_product"] = False
    return advice_received


# Extract context from a farmer's voice note
def extract_context(raw_input: str, county: str = "Kiambu") -> dict:
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": EXTRACT_CONTEXT_SYSTEM_PROMPT},
            {"role": "user", "content": raw_input},
        ],
        response_format={"type": "json_object"},
        # Structured/factual extraction (badges, language, crop, etc.) should
        # be as deterministic as possible run-to-run for the same input —
        # this isn't creative generation. Default sampling temperature was
        # producing exactly this kind of instability (e.g. saw_in_person
        # flipping between true/null across identical re-runs). temperature=0
        # doesn't guarantee perfect determinism on every provider/model, but
        # it substantially reduces this kind of variance.
        temperature=0,
    )
    # Attempt to parse the response as JSON, and handle any parsing errors gracefully
    try:
        result = json.loads(response.choices[0].message.content)
    except json.JSONDecodeError:
        # return a default structure indicating that the input could not be understood
        result = {
            "reported_problem": None,
            "crop": None,
            "observations": [],
            "advice_received": [],
            "advice_agreement": None,
            "price_mentioned": None,
            "mentioned_weather": [],
            "language": None,
            "extraction_confidence": "low",
            "could_not_understand": True,
        }
    # Add the raw input and county to the result for reference
    result["raw_input"] = raw_input
    result.setdefault("county", county)
    result.setdefault("season", None)
    result.setdefault("growth_stage", None)
    result.setdefault("advice_agreement", None)
    result.setdefault("price_mentioned", None)
    result["advice_received"] = _ensure_badge_keys(result.get("advice_received") or [])
    result["advice_received"] = _apply_sells_product_backstop(result["advice_received"])
    return result