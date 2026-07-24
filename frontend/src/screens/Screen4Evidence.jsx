import AudioPlayer from "../components/AudioPlayer";
import "./Screen4Evidence.css";

function Screen4Evidence({ comparison, onContinue }) {
  const { confidence, observed, perspectives, uncertainty, sources_used } = comparison;

  const currentUnderstandingText =
    "Your observations help explain what has been seen. Different advice has been received. At this stage there is not enough information to know which advice is most reliable. More observations may help reduce uncertainty.";

  return (
    <div className="screen4-container">

      {/* ── Header ── */}
      <div className="screen4-header">
        <h1 className="screen4-title">What the Evidence Means</h1>
        <p className="screen4-based-on">Based on what you've shared so far</p>
      </div>

    

      {/* ── Row 2: What you observed | Advice received ── */}
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

        <div className="screen4-panel">
          <h2 className="screen4-panel-title">Advice received</h2>
          {perspectives.length > 0 ? (
            <div className="screen4-advice-stack">
              {perspectives.map((p, index) => (
                <div key={index} className="screen4-advice-row">
                    <div className="screen4-advice-content">
                      <p className="screen4-advice-source">{p.source}</p>
                      <p className="screen4-advice-view">{p.view}</p>
                    </div>
                  <AudioPlayer text={p.view} />
                </div>
              ))}
            </div>
          ) : (
            <p className="screen4-empty-note">No advice shared yet.</p>
          )}

          {/* Trusted sources nested under advice */}
          {sources_used && sources_used.length > 0 && (
            <div className="screen4-sources-stack">
              {sources_used.map((source, index) => (
                <div key={index} className="screen4-source-item">
                  <p className="screen4-source-name">{source.name}</p>
                  <p className="screen4-source-snippet">{source.snippet}</p>
                </div>
              ))}
            </div>
          )}
        </div>

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
            <AudioPlayer text={currentUnderstandingText} />
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