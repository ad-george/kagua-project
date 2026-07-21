import AudioPlayer from "./AudioPlayer";
import "./SummaryCard.css";

const CHECKLIST_ITEMS = [
  "Observations recorded",
  "Information organised for review",
  "Advice received captured",
  "Trusted information reviewed",
  "Kagua Summary prepared",
];

function SummaryCard({ crop, reportedProblem, observations, confidence }) {
  const observationsText =
    observations && observations.length > 0
      ? ` Field observations included: ${observations.join(", ")}.`
      : "";

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
        <div className="summary-card-row">
          <span className="summary-card-label">Crop</span>
          <span className="summary-card-value">{crop}</span>
        </div>

        <div className="summary-card-row">
          <span className="summary-card-label">Reported problem</span>
          <span className="summary-card-value">{reportedProblem}</span>
        </div>

        {observations && observations.length > 0 && (
          <div className="summary-card-row">
            <span className="summary-card-label">Field observations</span>
            <span className="summary-card-value">{observations.join(", ")}</span>
          </div>
        )}
      </div>

      <div className="summary-card-audio">
        <AudioPlayer text={fullSummaryText} />
      </div>

      <div className="summary-card-divider" />

      <p className="summary-card-checklist-heading">What this summary includes</p>
      <ul className="summary-card-checklist">
        {CHECKLIST_ITEMS.map((item) => (
          <li key={item} className="summary-card-check-item">
            <span className="summary-card-check-icon" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}

        {confidence === "LOW" && (
          <li className="summary-card-check-item summary-card-check-item--warning">
            <span className="summary-card-warn-icon" aria-hidden="true" />
            <span>More information may be needed before deciding what to do next</span>
          </li>
        )}
      </ul>
    </div>
  );
}

export default SummaryCard;