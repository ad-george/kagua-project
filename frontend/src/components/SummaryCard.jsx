import "./SummaryCard.css";

function SummaryCard({ crop, reportedProblem, observations, adviceReceived, confidence }) {
  // advice_received may come through as plain strings or as
  // {source, advice} objects — handle both rather than assuming one shape.
  // extract_context.py's actual shape is {source_type, organization, advice},
  // so source_type must be checked, not just source/person/who/given_by.
  // Falls back to just the advice text if a source-like key isn't found,
  // rather than ever printing "undefined:".
  const formattedAdvice = Array.isArray(adviceReceived)
    ? adviceReceived
        .map((item) => {
          if (typeof item === "string") return item;
          const source =
            item.source || item.source_type || item.person || item.who || item.given_by;
          const text = item.advice || item.text || item.suggestion;
          return source ? `${source}: ${text}` : text;
        })
        .join("; ")
    : null;

  return (
    <div className="summary-card">
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
        </div>

        {observations && observations.length > 0 && (
          <div className="summary-card-row">
            <span className="summary-card-label">Field observations</span>
            <span className="summary-card-value">{observations.join(", ")}</span>
          </div>
        )}

        {formattedAdvice && (
          <div className="summary-card-row">
            <span className="summary-card-label">Advice received</span>
            <span className="summary-card-value">{formattedAdvice}</span>
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