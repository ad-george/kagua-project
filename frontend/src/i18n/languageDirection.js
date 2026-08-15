// Mirrors the direction-detection heuristic in the backend's
// language_utils.py (_guess_mixed_direction). Kept in sync deliberately —
// if extract_context.py returns "mixed", the backend now picks English or
// Kiswahili for generated content (summary_text, discussion_points) based
// on which language actually dominates the transcript, rather than always
// assuming Kiswahili. Before this file existed, the frontend's own
// pickBilingual() functions (Screen4Evidence.jsx, Screen5Summary.jsx)
// still treated ANY "mixed" as "show Kiswahili labels" — so a mostly
// English transcript with one stray Swahili word/name/honorific (e.g.
// "my neighbor Mzee Gitau") could show Kiswahili headings wrapped around
// English generated content. This utility closes that gap so both sides
// resolve "mixed" the same way, using the same signal (the raw transcript).
const SWAHILI_FUNCTION_WORDS = new Set([
  "na", "ya", "wa", "za", "la", "ni", "si", "kwa", "katika", "sana",
  "hii", "hiki", "hivi", "huu", "hawa", "hao", "yangu", "yako", "yake",
  "wetu", "wenu", "wao", "leo", "jana", "kesho", "nini", "vipi", "sasa",
  "bado", "tu", "sisi", "wewe", "yeye", "mimi", "wana", "ana", "nimeona",
  "nimepata", "nataka", "ninataka", "nashuku", "naona",
]);

function guessMixedDirection(rawInput) {
  if (!rawInput || !rawInput.trim()) return "english";

  const words = rawInput.toLowerCase().match(/[a-z']+/g) || [];
  if (words.length === 0) return "english";

  const swahiliHits = words.filter((w) => SWAHILI_FUNCTION_WORDS.has(w)).length;
  const ratio = swahiliHits / words.length;

  // Same conservative threshold as the backend heuristic — a couple of
  // stray Swahili words (a name, an honorific, "sana" once) in an
  // otherwise long English transcript won't cross it.
  return ratio >= 0.15 ? "kiswahili" : "english";
}

// Resolves extractedContext.language + extractedContext.raw_input into
// exactly "kiswahili" or "english" — the two values every pickBilingual()
// in this app already knows how to use. "mixed" is resolved using the
// transcript itself rather than defaulting to Kiswahili; "kiswahili" and
// "english" pass through unchanged; anything unrecognized (missing,
// null, unexpected value) falls back to "english" as the safe default.
export function resolveDisplayLanguage(language, rawInput) {
  const normalized = (language || "").trim().toLowerCase();

  if (normalized === "kiswahili" || normalized === "swahili") return "kiswahili";
  if (normalized === "english") return "english";
  if (normalized === "mixed") return guessMixedDirection(rawInput);

  return "english";
}