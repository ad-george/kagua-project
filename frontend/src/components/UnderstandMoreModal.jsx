import "./UnderstandMoreModal.css";

function UnderstandMoreModal({ sourceDetails, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>

        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className="modal-title">Trusted Sources</h2>
        <p className="modal-intro">
          This is what verified agricultural guidance says about your situation.
          Use this to prepare questions for your agrovet or extension officer.
        </p>

        {sourceDetails.length === 0 ? (
          <p className="modal-empty-note">
            We don't have verified guidance for this specific situation yet.
            You can still continue the conversation with an agrovet or
            extension officer using your Kagua Summary.
          </p>
        ) : (
          sourceDetails.map((source, index) => (
            <div key={index} className="modal-source">
              <h3 className="modal-source-name">{source.name}</h3>
              <p className="modal-source-topic">{source.topic}</p>
              <p className="modal-source-summary">{source.summary}</p>

              {/* Clarifying questions — written in plain farmer language,
                  helps them know what to look for in their field */}
              {source.learning_points && source.learning_points.length > 0 && (
                <div className="modal-section">
                  <p className="modal-section-label">Questions to check in your field</p>
                  <ul className="modal-learning-points">
                    {source.learning_points.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Why information may differ — helps farmer understand
                  why their neighbour and agrovet gave different advice */}
              {source.why_may_differ && source.why_may_differ.length > 0 && (
                <div className="modal-section">
                  <p className="modal-section-label">Why advice may differ</p>
                  <ul className="modal-learning-points">
                    {source.why_may_differ.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Uncertainties — what even trusted sources can't confirm */}
              {source.uncertainties && source.uncertainties.length > 0 && (
                <div className="modal-section">
                  <p className="modal-section-label">What remains uncertain</p>
                  <ul className="modal-learning-points">
                    {source.uncertainties.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="modal-source-actions">
                {source.link && (
                  <a href={source.link} target="_blank" rel="noopener noreferrer">
                    Read Original Source
                  </a>
                )}
              </div>
            </div>
          ))
        )}

      </div>
    </div>
  );
}

export default UnderstandMoreModal;
