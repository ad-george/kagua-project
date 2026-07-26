import { useState, useRef, useEffect } from "react";
import SourceCard from "../components/SourceCard";
import AudioPlayer from "../components/AudioPlayer";
import "./Screen2Context.css";

function Screen2Context({ extractedContext, onConfirm, onRecordAgain, onTypeInstead }) {
  const [showRetryChoice, setShowRetryChoice] = useState(false);
  const { crop, reported_problem, advice_received, mentioned_weather } = extractedContext;
  const retryChoiceRef = useRef(null);
  const summaryText = `Your crop is ${crop}. The problem reported is ${reported_problem}.`;

  const hasInformation =
    advice_received.length > 0 || mentioned_weather.length > 0;

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

        {/* ── Row 2 (left): summary card ── */}
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
            <AudioPlayer text={summaryText} />
          </div>
        </div>

        {/* ── Row 3: retry choice (left, conditional) ↔ note (right) ── */}
        {showRetryChoice && (
          <div className="screen2-area-retry" ref={retryChoiceRef}>
            <div className="screen2-retry-choice">
              <p className="screen2-retry-label">How would you like to explain it?</p>
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

        <div className="screen2-area-note">
          <div className="screen2-note">
            <p>
              These recommendations come from different types of knowledge and
              experience. Before deciding, let's check what the evidence says.
            </p>
          </div>
        </div>

        {/* ── Row 4: confirm buttons or hint (right column only) ── */}
        <div className="screen2-area-actions">
          {!showRetryChoice ? (
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
          ) : (
            <p className="screen2-retry-hint">
              See the options on the left to continue.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Screen2Context;