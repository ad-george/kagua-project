import AudioPlayer from "./AudioPlayer";
import "./SummaryCard.css";

function SummaryCard({ crop, reportedProblem, observations, confidence }) {
  const fullSummaryText = `
  Crop: ${crop}.
  Reported problem: ${reportedProblem}.
  ${
    observations?.length > 0
      ? `Field observations include ${observations.join(", ")}.`
      : ""
  }
  Kagua has organised your observations, advice received, and trusted information from this conversation.
  `;

  return (
    <div className="summary-card">
      <h2 className="summary-card-title">Your Kagua Summary</h2>

      <div className="summary-card-fields">
        <div className="summary-card-top-row">
          <div className="summary-card-row">
            <span className="summary-card-label">Crop</span>
            <span className="summary-card-value">{crop}</span>
          </div>

          <div className="summary-card-row">
            <span className="summary-card-label">Reported problem</span>
            <span className="summary-card-value">{reportedProblem}</span>
          </div>

          <div className="summary-card-audio">
            <AudioPlayer text={fullSummaryText} />
          </div>
        </div>

        {observations && observations.length > 0 && (
          <div className="summary-card-row">
            <span className="summary-card-label">Field observations</span>
            <span className="summary-card-value">{observations.join(", ")}</span>
          </div>
        )}
      </div>

      <div className="summary-card-divider" />

      {confidence === "LOW" && (
        <div className="summary-card-warning">
          More information may be needed before deciding what to do next
        </div>
      )}
    </div>
  );
}

export default SummaryCard;