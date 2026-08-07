import AudioPlayer from "../components/AudioPlayer";
import { getExplanationLabel } from "../i18n/explanationLabels";
import "./Screen4Evidence.css";

// Builds the "What this means right now" text from the actual comparison
// result, instead of a single hardcoded string that previously claimed
// "Different advice has been received" even when no advice existed at all.
// No LLM call needed here — Screen4Evidence already receives the full
// comparison object, this just composes accurate language from it.
//
// Now language-aware: this text sits directly under a heading that's
// already translated via getExplanationLabel (e.g. "Maana yake kwa sasa"),
// so leaving the body English underneath it produced the exact
// heading/body language mismatch the explanation-headings fix was meant
// to avoid. Falls back to English for "mixed" or unrecognized language,
// same convention as getExplanationLabel.
const CURRENT_UNDERSTANDING_TEXT = {
  lowWithAdvice: {
    english:
      "Different advice has been received, but the available guidance does not confirm the exact cause of this situation. More observations may help build a clearer picture.",
    kiswahili:
      "Ushauri tofauti umepokelewa, lakini mwongozo uliopo haujathibitisha chanzo hasa cha hali hii. Uchunguzi zaidi unaweza kusaidia kupata picha wazi zaidi.",
  },
  lowNoAdvice: {
    english:
      "The available guidance does not confirm the exact cause of this situation. More observations may help build a clearer picture.",
    kiswahili:
      "Mwongozo uliopo haujathibitisha chanzo hasa cha hali hii. Uchunguzi zaidi unaweza kusaidia kupata picha wazi zaidi.",
  },
  adviceWithUncertainty: {
    english:
      "Your observations and the advice received together help explain the situation, though some uncertainty still remains.",
    kiswahili:
      "Uchunguzi wako na ushauri uliopokelewa pamoja vinasaidia kueleza hali hiyo, ingawa bado kuna baadhi ya mambo yasiyo wazi.",
  },
  adviceNoUncertainty: {
    english:
      "Your observations and the advice received together help explain the situation.",
    kiswahili:
      "Uchunguzi wako na ushauri uliopokelewa pamoja vinasaidia kueleza hali hiyo.",
  },
  noAdviceWithUncertainty: {
    english:
      "Your observations help explain the situation based on trusted sources, though some uncertainty still remains.",
    kiswahili:
      "Uchunguzi wako unasaidia kueleza hali hiyo kulingana na vyanzo vinavyoaminika, ingawa bado kuna baadhi ya mambo yasiyo wazi.",
  },
  noAdviceNoUncertainty: {
    english:
      "Your observations help explain the situation based on trusted sources.",
    kiswahili:
      "Uchunguzi wako unasaidia kueleza hali hiyo kulingana na vyanzo vinavyoaminika.",
  },
};

// language resolution matches getExplanationLabel in explanationLabels.js:
// "mixed" now resolves to Kiswahili, not English, to stay consistent with
// the heading above this text (see explanationLabels.js for full reasoning).
function pickText(entryKey, language) {
  const entry = CURRENT_UNDERSTANDING_TEXT[entryKey];
  const useKiswahili = language === "kiswahili" || language === "mixed";
  return useKiswahili ? entry.kiswahili : entry.english;
}

function buildCurrentUnderstandingText(comparison, language) {
  const hasAdvice = comparison.perspectives && comparison.perspectives.length > 0;
  const hasUncertainty = comparison.uncertainty && comparison.uncertainty.length > 0;

  if (comparison.confidence === "LOW") {
    return pickText(hasAdvice ? "lowWithAdvice" : "lowNoAdvice", language);
  }

  if (hasAdvice) {
    return pickText(hasUncertainty ? "adviceWithUncertainty" : "adviceNoUncertainty", language);
  }

  return pickText(hasUncertainty ? "noAdviceWithUncertainty" : "noAdviceNoUncertainty", language);
}

function Screen4Evidence({ comparison, extractedContext, onContinue }) {
  const { confidence, observed, perspectives, uncertainty, sources_used } = comparison;
  const language = extractedContext?.language;

  const currentUnderstandingText = buildCurrentUnderstandingText(comparison, language);
  const hasAdvice = perspectives && perspectives.length > 0;
  const hasSources = sources_used && sources_used.length > 0;
  const hasRightColumn = hasAdvice || hasSources;

  // Build the complete page text for audio playback
  const buildPageText = () => {
    let audioText = "Here is what the evidence means based on what you've shared so far. ";
    
    // What you observed
    if (observed && observed.length > 0) {
      audioText += `You observed: ${observed.join(", ")}. `;
    }
    
    // Advice received
    if (hasAdvice) {
      audioText += `You received advice from ${perspectives.length} source${perspectives.length > 1 ? 's' : ''}. `;
      perspectives.forEach((p, index) => {
        audioText += `${p.source} said: ${p.view}. `;
      });
    }
    
    // Trusted sources
    if (hasSources) {
      audioText += `Trusted sources provide additional information. `;
    }
    
    // What remains unclear
    if (uncertainty && uncertainty.length > 0) {
      audioText += `What we still don't know includes: ${uncertainty.join(", ")}. `;
    }
    
    // Current understanding
    audioText += currentUnderstandingText;
    
    return audioText;
  };

  return (
    <div className="screen4-container">

      {/* ── Header ──
          Trimmed from title + two explanatory paragraphs down to title +
          one short line. The removed paragraphs ("Based on what you've
          shared so far" and the "Kagua has organized..." sentence) were
          just narrating what the section headings below already show —
          cutting them keeps the screen focused on the farmer's
          information instead of the product's workflow. */}
      <div className="screen4-header">
        <h1 className="screen4-title">What the Evidence Means</h1>
        <div className="screen4-subtitle-row">
          <p className="screen4-based-on">Here's what we know so far.</p>
          <AudioPlayer text={buildPageText()} language={extractedContext?.language} />
        </div>
      </div>

      {/* ── Columns ──
          Reflection now lives in the LEFT column (with Observed and
          Unclear) instead of pairing with Advice/Sources on the right.
          That closes the height gap from both sides at once: it adds
          height to the side that was short, and removes height from the
          side that was tall.
          When there's no advice and no trusted sources, the right column
          would otherwise render empty — instead .screen4-columns gets the
          `--single` modifier (CSS) so the left column runs full width and
          the right column isn't rendered at all. */}
      <div className={`screen4-columns${hasRightColumn ? "" : " screen4-columns--single"}`}>

        <div className="screen4-column screen4-column-left">
          <div className="screen4-panel screen4-panel-observed">
            <h2 className="screen4-panel-title">{getExplanationLabel("whatYouObserved", language)}</h2>
            {observed && observed.length > 0 ? (
              <ul className="screen4-observed-pills">
                {observed.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="screen4-empty-note">Nothing recorded yet.</p>
            )}
          </div>

          <div className="screen4-panel screen4-panel-unclear">
            <h2 className="screen4-panel-title">{getExplanationLabel("whatWeStillDontKnow", language)}</h2>
            {uncertainty && uncertainty.length > 0 ? (
              <ul className="screen4-unclear-list">
                {uncertainty.map((item, index) => (
                  <li key={index}>
                    <span className="screen4-unclear-bullet">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="screen4-empty-note">Nothing flagged.</p>
            )}
          </div>

          <div className="screen4-panel screen4-panel-reflection">
            <h2 className="screen4-panel-title">{getExplanationLabel("whatThisMeansRightNow", language)}</h2>
            <p className="screen4-reflection-text">{currentUnderstandingText}</p>
          </div>
        </div>

        {hasRightColumn && (
          <div className="screen4-column screen4-column-right">
            <div className="screen4-panel screen4-panel-advice">
              {hasAdvice && (
                <>
                  <h2 className="screen4-panel-title">{getExplanationLabel("adviceReceived", language)}</h2>
                  <div className="screen4-advice-stack">
                    {perspectives.map((p, index) => (
                      <div key={index} className="screen4-advice-row">
                        <div className="screen4-advice-content">
                          <p className="screen4-advice-source">{p.source}</p>
                          <p className="screen4-advice-view">{p.view}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {hasSources && (
                <>
                  <h2 className="screen4-panel-title">
                    {hasAdvice
                      ? getExplanationLabel("trustedSources", language)
                      : getExplanationLabel("whatTrustedSourcesSay", language)}
                  </h2>

                  {/* Compact list, not full-paragraph cards — the farmer
                      doesn't need the full source text here, just enough
                      to know trusted sources exist and roughly what they
                      cover. Full detail (summary, questions, why advice
                      may differ, uncertainties, original link) lives in
                      the "Explore Trusted Sources" modal on Screen 5. */}
                  <p className="screen4-sources-note">
                    Trusted sources suggest these may be relevant. Full details are
                    available in "Explore Trusted Sources" on the next screen.
                  </p>
                  <ul className="screen4-sources-compact-list">
                    {sources_used.map((source, index) => (
                      <li key={index} className="screen4-source-compact-item">
                        <span className="screen4-source-compact-name">{source.name}</span>
                        {source.topic && (
                          <span className="screen4-source-compact-topic">: {source.topic}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── Continue — centered ── */}
      <div className="screen4-cta">
        <button
          className="btn btn-primary screen4-continue-btn"
          onClick={onContinue}
        >
          Continue
        </button>
      </div>

    </div>
  );
}

export default Screen4Evidence;