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

  const hasInformation =
    advice_received.length > 0 || mentioned_weather.length > 0;

  // Build the complete page text for audio playback
  const buildPageText = () => {
    let audioText = `Here is what I understood from our conversation. Your crop is ${crop}. The problem reported is ${reported_problem}. `;
    
    if (hasInformation) {
      audioText += "You have also received some information. ";
      if (advice_received.length > 0) {
        audioText += `You received advice from ${advice_received.length} source${advice_received.length > 1 ? 's' : ''}. `;
      }
      if (mentioned_weather.length > 0) {
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
          <h1 className="screen2-title">Here's what I understood</h1>
          <p className="screen2-intro">
            Check that this matches what you described.
          </p>
          {isLowConfidence && (
            <div className="screen2-low-confidence-banner" role="alert">
              <span className="screen2-low-confidence-icon">⚠</span>
              <span>We weren't sure about some parts — please check carefully before continuing.</span>
            </div>
          )}
          <div className="screen2-audio-row">
            <AudioPlayer text={buildPageText()} language={extractedContext.language} />
          </div>
        </div>

        {hasInformation && (
          <>
            <div className="screen2-area-section">
              <h2 className="screen2-section-title">
                Information you've received
              </h2>
              <p className="screen2-section-subtitle">
                Advice from people and services you've mentioned.
              </p>
            </div>

            {/* ── Row 2: source cards ── */}
            <div className="screen2-area-cards">
              <div className="screen2-cards">
                {advice_received.map((item, index) => (
                  <SourceCard
                    key={index}
                    sourceType={item.source_type}
                    organization={item.organization}
                    advice={item.advice}
                  />
                ))}

                {mentioned_weather.length > 0 && (
                  <SourceCard
                    sourceType="weather"
                    organization={null}
                    advice={mentioned_weather[0]}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Summary card ── */}
        <div className="screen2-area-summary">
          <div className="screen2-summary-card">
            <div className="screen2-summary-row">
              <span className="screen2-summary-label">Crop:</span>
              <span className="screen2-summary-value">{crop}</span>
            </div>
            <div className="screen2-summary-divider" />
            <div className="screen2-summary-row">
              <span className="screen2-summary-label">Problem:</span>
              <span className="screen2-summary-value">{reported_problem}</span>
            </div>
            <div className="screen2-summary-divider" />
          </div>
        </div>

        {/* ── Guidance note — only when retry is not showing ── */}
        {!showRetryChoice && (
          <div className="screen2-area-note">
            <div className="screen2-note">
              {hasInformation ? (
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
