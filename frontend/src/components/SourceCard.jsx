
import "./SourceCard.css";

function SourceCard({ sourceType, organization, advice }) {
    const label = organization || sourceType;

    return (
        <div className="source-card">
            <p className="source-card-label">{label}</p>
            <p className="source-card-advice">{advice}</p>
        </div>
    );
}

export default SourceCard;


