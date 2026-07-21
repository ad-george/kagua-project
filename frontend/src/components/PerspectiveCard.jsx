import "./PerspectiveCard.css";

function PerspectiveCard({ source, view }) {
  return (
    <div className="perspective-card">
      <p className="perspective-source">{source}</p>
      <p className="perspective-view">{view}</p>
    </div>
  );
}

export default PerspectiveCard;