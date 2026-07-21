import { useState } from "react";
import SourceCard from "../components/SourceCard";
import AudioPlayer from "../components/AudioPlayer";
import "./Screen2Context.css";

function Screen2Context({ extractedContext, onConfirm, onRecordAgain, onTypeInstead }) {
  const [showRetryChoice, setShowRetryChoice] = useState(false);
  const { crop, reported_problem, advice_received, mentioned_weather } = extractedContext;

  const summaryText = `Your crop is ${crop}. The problem reported is ${reported_problem}.`;

  return (
    <div className="screen2-container">
      <div className="screen2-header">
        {/* <p className="screen2-brand">Kagua</p> */}
        <h1 className="screen2-title">Here's what I understood</h1>
        <p className="screen2-intro">
          Check that this matches what you described.
        </p>
      </div>

      <div className="screen2-summary-card">
        <div className="screen2-summary-row">
          <span className="screen2-summary-label">Crop</span>
          <span className="screen2-summary-value">{crop}</span>
        </div>
        <div className="screen2-summary-divider" />
        <div className="screen2-summary-row">
          <span className="screen2-summary-label">Problem</span>
          <span className="screen2-summary-value">{reported_problem}</span>
        </div>
        <div className="screen2-summary-divider" />
        <AudioPlayer text={summaryText} />
      </div>

      <h2 className="screen2-section-title">Information you've received</h2>

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

      <div className="screen2-note">
        <p>
          These recommendations come from different types of knowledge and
          experience. Before deciding, let's check what the evidence says.
        </p>
      </div>

      {!showRetryChoice ? (
        <div className="screen2-confirm-buttons">
          <button className="screen2-continue-btn" onClick={onConfirm}>
            ✓ Yes, Continue
          </button>
          <button className="screen2-no-btn" onClick={() => setShowRetryChoice(true)}>
            No, I'll explain it again
          </button>
        </div>
      ) : (
        <div className="screen2-retry-choice">
          <p className="screen2-retry-label">How would you like to explain it?</p>
          <button className="screen2-retry-btn" onClick={onRecordAgain}>
            🎙 Speak Again
          </button>
          <button className="screen2-retry-btn" onClick={onTypeInstead}>
            ⌨️ Type Instead
          </button>
        </div>
      )}
    </div>
  );
}

export default Screen2Context;