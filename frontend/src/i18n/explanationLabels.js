const EXPLANATION_LABELS = {
  // Screen 4
  whatYouObserved: { english: "What you observed", kiswahili: "Ulichoona" },
  adviceReceived: { english: "Advice received", kiswahili: "Ushauri uliopokelewa" },
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
export function getExplanationLabel(key, language) {
  const entry = EXPLANATION_LABELS[key];
  if (!entry) {
    console.warn(`Missing explanation label key: ${key}`);
    return key;
  }
  const useKiswahili = language === "kiswahili" || language === "mixed";
  return useKiswahili ? entry.kiswahili : entry.english;
}