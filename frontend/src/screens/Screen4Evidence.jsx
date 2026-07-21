import PerspectiveCard from "../components/PerspectiveCard";
import AudioPlayer from "../components/AudioPlayer";
import "./Screen4Evidence.css";

function Screen4Evidence({ comparison, onContinue }) {
  const { confidence, observed, perspectives, uncertainty, sources_used } = comparison;

  const currentUnderstandingText =
    "Your observations have helped organize what is known, what has been suggested, and what remains unclear.";

  return (
    <div className="screen4-container">
      <h1 className="screen4-title">What the Evidence Means</h1>
      <p className="screen4-based-on">Based on what you've shared so far</p>

      {/* What you observed */}
      {observed && observed.length > 0 && (
        <div className="screen4-observed-box">
          <p className="screen4-observed-label">What you observed</p>
          <ul className="screen4-observed-list">
            {observed.map((item, index) => (
              <li key={index}>
                <span className="screen4-observed-tick">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* What we know so far — always shown */}
      <div className="screen4-summary-banner">
        <h3>What we know so far</h3>
        <p>
          Here's what has been observed, what has been suggested, and what
          remains unclear.
        </p>
      </div>

      {/* Low confidence banner — only when LOW */}
      {confidence === "LOW" && (
        <div className="screen4-low-confidence-banner">
          <span className="screen4-banner-icon">ℹ</span>
          <p>
            The observations you've shared could have several possible
            explanations. Rather than guessing, let's look at what has been
            observed, what advice has been received, and what information is
            still missing.
          </p>
        </div>
      )}

      {/* Advice received */}
      <div className="screen4-section">
        <h2 className="screen4-subtitle">Advice you've received</h2>
        <div className="screen4-perspectives">
          {perspectives.length > 0 ? (
            perspectives.map((p, index) => (
              <div key={index} className="screen4-perspective-item">
                <PerspectiveCard source={p.source} view={p.view} />
                <AudioPlayer text={p.view} />
              </div>
            ))
          ) : (
            <p className="screen4-empty-note">No advice was shared to compare yet.</p>
          )}
        </div>
      </div>

      {/* Trusted sources */}
      {sources_used.length > 0 && (
        <div className="screen4-section">
          <h2 className="screen4-subtitle">What trusted sources say</h2>
          <div className="screen4-sources">
            {sources_used.map((source, index) => (
              <div key={index} className="screen4-source-item">
                <p className="screen4-source-name">{source.name}</p>
                <p className="screen4-source-snippet">{source.snippet}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uncertainty */}
      <div className="screen4-section">
        <h2 className="screen4-subtitle">What we still don't know</h2>
        <div className="screen4-uncertainty-box">
          <ul className="screen4-uncertainty-list">
            {uncertainty.map((item, index) => (
              <li key={index}>
                <span className="screen4-uncertainty-dot" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Current understanding */}
      <div className="screen4-reflection">
        <p className="screen4-reflection-label">Current understanding</p>
        <p className="screen4-reflection-text">{currentUnderstandingText}</p>
        <AudioPlayer text={currentUnderstandingText} />
      </div>

      <div className="screen4-closing-note">
        <p>
          You now have more information to help you continue the conversation
          with confidence.
        </p>
      </div>

      <button className="screen4-continue-btn" onClick={onContinue}>
        Continue
      </button>
    </div>
  );
}

export default Screen4Evidence;