// Scope is deliberately narrow: ONLY the section headings on Screen 4 and
// Screen 5 that frame Kagua's AI-generated explanation of the farmer's
// situation. These follow extractedContext.language because they're part
// of "understanding," not application chrome.
//
// Everything else — Navbar, Home, Login/Signup, Landing, Screen 1-3,
// buttons, navigation — stays English per the input-vs-understanding split.
// Do NOT add UI/navigation strings to this file; that system was
// deliberately removed (see Navbar.jsx history).
//
// NOTE: Kiswahili strings are a first-pass draft, not verified by a
// native speaker. Flag for review before this ships to real farmers.
const EXPLANATION_LABELS = {
  // Screen 4
  reportedProblem: { english: "Reported problem", kiswahili: "Tatizo Ulioripoti" },
  whatYouObserved: { english: "What you observed", kiswahili: "Ulichoona" },
  adviceReceived: { english: "Advice received", kiswahili: "Ushauri uliopokelewa" },
  whereInformationDiffers: { english: "Where the information differs", kiswahili: "Mahali ushauri unatofautiana" },
  differsCaption: {
    english: "Kagua does not decide which advice is correct — these are different perspectives to compare.",
    kiswahili: "Kagua haiamui ni ushauri gani sahihi — haya ni mitazamo tofauti ya kulinganisha.",
  },
  trustedSources: { english: "Trusted sources", kiswahili: "Vyanzo vinavyoaminika" },
  whatTrustedSourcesSay: { english: "What trusted sources say", kiswahili: "Vyanzo vinavyoaminika vinasema" },
  whatRemainsUnclear: { english: "What remains unclear", kiswahili: "Kinachobaki hakijathibitishwa" },
  whatWeStillDontKnow: { english: "What we still don't know", kiswahili: "Tusichokijua bado" },
  whatThisMeansRightNow: { english: "What this means right now", kiswahili: "Maana yake kwa sasa" },

  // Screen 5
  questionsToAsk: { english: "Questions you may want to ask", kiswahili: "Maswali unayoweza kuuliza" },
  duringThisConversation: { english: "During this conversation", kiswahili: "Wakati wa mazungumzo haya" },
};

// language is extractedContext.language: "english" | "kiswahili" | "mixed" | null.
//
// "mixed" now resolves to Kiswahili, not English. Reasoning: mixed-language
// input (e.g. "Mahindi yangu yana yellow leaves") is dominant-Kiswahili with
// a few English words dropped in — very common in real Kenyan speech, per
// earlier discussion. generate_summary.py's build_language_instruction()
// likely already leans Kiswahili for "mixed" input for the same reason, so
// keeping these headings in English for "mixed" would risk recreating the
// exact heading/body language mismatch that buildCurrentUnderstandingText()
// was fixed for — a Kiswahili-generated summary sitting under an
// English heading. Consistency between heading and body matters more here
// than which language "wins" in the abstract.
//
// Only a genuinely detected "english" (or null/unrecognized) falls back to
// English; everything else — "kiswahili" and "mixed" — renders Kiswahili.
export function getExplanationLabel(key, language) {
  const entry = EXPLANATION_LABELS[key];
  if (!entry) {
    console.warn(`Missing explanation label key: ${key}`);
    return key;
  }
  const useKiswahili = language === "kiswahili" || language === "mixed";
  return useKiswahili ? entry.kiswahili : entry.english;
}