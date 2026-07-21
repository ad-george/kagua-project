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

        <h2 className="modal-title">Understand More Before Deciding</h2>

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

              <ul className="modal-learning-points">
                {source.learning_points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>

              <div className="modal-source-actions">
                <button disabled title="Coming soon">Listen</button>
                {source.link && (
                  <a href={source.link} target="_blank" rel="noopener noreferrer">
                    Read Original
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