import AudioPlayer from "../components/AudioPlayer";
import "./Screen4Evidence.css";

// Builds the "What this means right now" text from the actual comparison
// result, instead of a single hardcoded string that previously claimed
// "Different advice has been received" even when no advice existed at all.
// No LLM call needed here — Screen4Evidence already receives the full
// comparison object, this just composes accurate language from it.
function buildCurrentUnderstandingText(comparison) {
  const hasAdvice = comparison.perspectives && comparison.perspectives.length > 0;
  const hasUncertainty = comparison.uncertainty && comparison.uncertainty.length > 0;

  if (comparison.confidence === "LOW") {
    return hasAdvice
      ? "Different advice has been received, but trusted sources don't yet have a confident match for this exact situation. More observations may help build a clearer picture."
      : "Trusted sources don't yet have a confident match for this exact situation. More observations may help build a clearer picture.";
  }

  if (hasAdvice) {
    return hasUncertainty
      ? "Your observations and the advice received together help explain the situation, though some uncertainty still remains."
      : "Your observations and the advice received together help explain the situation.";
  }

  return hasUncertainty
    ? "Your observations help explain the situation based on trusted sources, though some uncertainty still remains."
    : "Your observations help explain the situation based on trusted sources.";
}

function Screen4Evidence({ comparison, extractedContext, onContinue }) {
  const { confidence, observed, perspectives, uncertainty, sources_used } = comparison;

  const currentUnderstandingText = buildCurrentUnderstandingText(comparison);
  const hasAdvice = perspectives && perspectives.length > 0;
  const hasSources = sources_used && sources_used.length > 0;

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

      {/* ── Header ── */}
      <div className="screen4-header">
        <h1 className="screen4-title">What the Evidence Means</h1>
        <p className="screen4-based-on">Based on what you've shared so far</p>
        <p className="screen4-bridge">
          Kagua has organized your observations and the advice you received alongside
          what trusted sources say. Review this before your Kagua Summary is prepared.
        </p>
        <div className="screen4-audio-row">
          <AudioPlayer text={buildPageText()} language={extractedContext?.language} />
        </div>
      </div>



      {/* ── Row 2: What you observed | Advice received / Trusted sources ── */}
      <div className="screen4-row">

        <div className="screen4-panel">
          <h2 className="screen4-panel-title">What you observed</h2>
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

        {/* Only renders if there's advice and/or trusted sources to show —
            no empty-state placeholder, since a section that only announces
            its own absence doesn't help the farmer do anything. Advice and
            trusted sources are independent: confidence (and therefore
            whether trusted sources appear) depends on evidence quality, not
            on whether any person gave advice. */}
        {(hasAdvice || hasSources) && (
          <div className="screen4-panel">
            {hasAdvice && (
              <>
                <h2 className="screen4-panel-title">Advice received</h2>
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
                  {hasAdvice ? "Trusted sources" : "What trusted sources say"}
                </h2>
                <div className="screen4-sources-stack">
                  {sources_used.map((source, index) => (
                    <div key={index} className="screen4-source-item">
                      <p className="screen4-source-name">{source.name}</p>
                      <p className="screen4-source-snippet">{source.snippet}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {/* ── Row 3: What remains unclear | Current understanding ── */}
      <div className="screen4-row">

        <div className="screen4-panel">
          <h2 className="screen4-panel-title">What remains unclear</h2>
          <div className="screen4-unclear-box">
            <div className="screen4-unclear-header">
              <span className="screen4-unclear-icon"> </span>
              <span className="screen4-unclear-label">What we still don't know</span>
            </div>
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
        </div>

        <div className="screen4-panel">
          <h2 className="screen4-panel-title">What this means right now</h2>
          <div className="screen4-reflection-card">
            <p className="screen4-reflection-text">{currentUnderstandingText}</p>
          </div>
        </div>

      </div>

      {/* ── Row 4: Continue — centered ── */}
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
