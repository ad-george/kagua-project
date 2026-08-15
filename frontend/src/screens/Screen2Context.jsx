import { useState, useRef, useEffect } from "react";
import SourceCard from "../components/SourceCard";
import AudioPlayer from "../components/AudioPlayer";
import "./Screen2Context.css";

function Screen2Context({ extractedContext, onConfirm, onRecordAgain, onTypeInstead }) {
  const [showRetryChoice, setShowRetryChoice] = useState(false);
  const { crop, reported_problem, advice_received, mentioned_weather, extraction_confidence } = extractedContext;
  const retryChoiceRef = useRef(null);
  const summaryText = `Your crop is ${crop}. The problem reported is ${reported_problem}.`;
  const isLowConfidence = extraction_confidence === "low";

  // Tracked separately (rather than one combined hasInformation flag) so
  // weather can get its own heading/section instead of being folded into
  // "Advice you've received" — weather isn't advice from a person.
  const hasAdvice = advice_received.length > 0;
  const hasWeather = mentioned_weather.length > 0;
  const hasInformation = hasAdvice || hasWeather;

  // Build the complete page text for audio playback
  const buildPageText = () => {
    let audioText = `Here is what I understood from our conversation. Your crop is ${crop}. The problem reported is ${reported_problem}. `;
    
    if (hasInformation) {
      audioText += "You have also received some information. ";
      if (hasAdvice) {
        audioText += `You received advice from ${advice_received.length} source${advice_received.length > 1 ? 's' : ''}. `;
      }
      if (hasWeather) {
        audioText += "Weather information was also mentioned. ";
      }
    }
    
    audioText += "Please check that this matches what you described. If it's correct, you can continue. If not, you can explain it again.";
    
    return audioText;
  };

  useEffect(() => {
    if (showRetryChoice && retryChoiceRef.current) {
      retryChoiceRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [showRetryChoice]);

  return (
    <div className="screen2-container">
      <div className={`screen2-grid ${!hasInformation ? "no-info" : ""}`}>
        {/* ── Row 1: headings, one per column, same row ── */}
        <div className="screen2-area-title">
          <h1 className="screen2-title">What Kagua understood</h1>
          <p className="screen2-intro">
            Check that this matches what you described.
          </p>
          {isLowConfidence && (
            <div className="screen2-low-confidence-banner" role="alert">
              <span className="screen2-low-confidence-icon">⚠</span>
              <span>We weren't sure about some parts — please check carefully before continuing.</span>
            </div>
          )}
          {!hasInformation && (
            <div className="screen2-audio-row">
              <AudioPlayer text={buildPageText()} language={extractedContext.language} />
            </div>
          )}
        </div>

        {hasInformation && (
          <>
            <div className="screen2-area-section">
              <div className="screen2-section-header-row">
                <div>
                  {/* Heading text now depends on what's actually present.
                      Advice takes priority when both exist — weather still
                      gets its own labeled block below, just not the
                      section heading, since the heading previously always
                      said "Advice you've received" even when the only
                      thing present was weather. */}
                  {hasAdvice ? (
                    <>
                      <h2 className="screen2-section-title">
                        Advice you've received
                      </h2>
                      <p className="screen2-section-subtitle">
                        Advice from people and services you've mentioned.
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="screen2-section-title">
                        Weather mentioned
                      </h2>
                      <p className="screen2-section-subtitle">
                        Weather information you've mentioned.
                      </p>
                    </>
                  )}
                </div>
                <div className="screen2-audio-row">
                  <AudioPlayer text={buildPageText()} language={extractedContext.language} />
                </div>
              </div>
            </div>

            {/* ── Row 2: source cards + weather ── */}
            <div className="screen2-area-cards">
              {hasAdvice && (
                <div className="screen2-cards">
                  {advice_received.map((item, index) => (
                    <SourceCard
                      key={index}
                      sourceType={item.source_type}
                      organization={item.organization}
                      advice={item.advice}
                    />
                  ))}
                </div>
              )}

              {hasWeather && (
                <div className="screen2-weather-section">
                  {/* Only show this small label when advice cards are also
                      present above — if weather is the only thing here,
                      the section heading above already says "Weather
                      mentioned", so a second label would be redundant. */}
                  {hasAdvice && (
                    <p className="screen2-weather-label">Weather mentioned</p>
                  )}
                  <SourceCard
                    sourceType="weather"
                    organization={null}
                    advice={mentioned_weather[0]}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Summary card ── */}
        <div className="screen2-area-summary">
          <div className="screen2-summary-card">
            <h3 className="screen2-summary-heading">Your information</h3>
            <div className="screen2-summary-row">
              <span className="screen2-summary-label">Crop:</span>
              <span className="screen2-summary-value">{crop}</span>
            </div>
            <div className="screen2-summary-divider" />
            <div className="screen2-summary-row">
              <span className="screen2-summary-label">Reported problem:</span>
              <span className="screen2-summary-value">{reported_problem}</span>
            </div>
            <div className="screen2-summary-divider" />
          </div>
        </div>

        {/* ── Guidance note — only when retry is not showing ──
            Now keyed on hasAdvice specifically, not hasInformation — a
            weather-only conversation was previously showing "You have
            received advice from different people...", which isn't true
            when nobody actually gave advice. */}
        {!showRetryChoice && (
          <div className="screen2-area-note">
            <div className="screen2-note">
              {hasAdvice ? (
                <p>
                  You have received advice from different people. We will help you check what the evidence says before you decide.
                </p>
              ) : (
                <p>
                  Next, we will compare what trusted sources say about your crop.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Row 3: retry choice (left, conditional) ↔ note (right) ── */}
        {showRetryChoice && (
          <div className="screen2-area-retry" ref={retryChoiceRef}>
            <div className="screen2-retry-choice">
              <p className="screen2-retry-label">How do you want to try again?</p>
              <div className="screen2-retry-buttons-row">
                <button className="btn btn-secondary screen2-retry-btn" onClick={onRecordAgain}>
                  Speak again
                </button>
                <button className="btn btn-secondary screen2-retry-btn" onClick={onTypeInstead}>
                  Type instead
                </button>
              </div>
            </div>
          </div>
        )}


        {/* ── Row 4: confirm buttons or hint (right column only) ── */}
        <div className="screen2-area-actions">
          {!showRetryChoice && (
            <div className="screen2-confirm-buttons">
              <button className="btn btn-primary screen2-continue-btn" onClick={onConfirm}>
                Yes, continue
              </button>
              <button
                className="btn btn-secondary screen2-no-btn"
                onClick={() => setShowRetryChoice(true)}
              >
                No, I'll explain it again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Screen2Context;