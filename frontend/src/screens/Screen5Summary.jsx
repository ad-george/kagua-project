import { useState } from "react";
import SummaryCard from "../components/SummaryCard";
import ShareOptions from "../components/ShareOptions";
import UnderstandMoreModal from "../components/UnderstandMoreModal";
import AudioPlayer from "../components/AudioPlayer";
import { generateSummaryPDF, buildWhatsAppLink } from "../services/exportSummary";
import "./Screen5Summary.css";

const CONTINUE_OPTIONS = [
  {
    id: "agrovet",
    label: "Discuss with an Agrovet",
    description: "Share your Kagua summary during your conversation.",
  },
  {
    id: "extension",
    label: "Discuss with an Extension Officer",
    description: "Use the same organized information during your discussion.",
  },
];

function Screen5Summary({ extractedContext, comparison, sourceDetails, onFinish }) {
  const [activeOption, setActiveOption] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  const handleShareWhatsApp = () => {
    const link = buildWhatsAppLink(extractedContext, comparison);
    window.open(link, "_blank");
  };
  const handleSharePDF = () => {
    generateSummaryPDF(extractedContext, comparison);
  };
  const handleShareSMS = () => alert("SMS sharing coming soon");
  const handleCallAgrovet = () => alert("Call feature coming soon");

  return (
    <div className="screen5-container">
      {/* <p className="screen5-brand">Kagua</p> */}
      <h1 className="screen5-title">You're Ready to Continue</h1>

      <p className="screen5-transition-note">
        Kagua has organized the observations, advice received, trusted
        information, and remaining questions from this conversation.
      </p>

      <SummaryCard
        crop={extractedContext.crop}
        reportedProblem={extractedContext.reported_problem}
        observations={extractedContext.observations}
        confidence={comparison.confidence}
      />

      <div className="screen5-audio-row">
        <AudioPlayer text="You can now choose to discuss this with an agrovet, discuss it with an extension officer, or explore trusted sources to learn more." />
      </div>

      <h2 className="screen5-subtitle">How would you like to continue?</h2>

      <div className="screen5-options">
        {CONTINUE_OPTIONS.map((option) => (
          <button
            key={option.id}
            className={`screen5-option-btn ${activeOption === option.id ? "screen5-option-btn--active" : ""}`}
            onClick={() => setActiveOption(activeOption === option.id ? null : option.id)}
          >
            <span className="screen5-option-label">{option.label}</span>
            <span className="screen5-option-description">{option.description}</span>
          </button>
        ))}

        <button
          className="screen5-option-btn screen5-option-btn--sources"
          onClick={() => setShowModal(true)}
        >
          <span className="screen5-option-label">Explore Trusted Sources</span>
          <span className="screen5-option-description">
            See the verified guidance related to your situation.
          </span>
        </button>
      </div>

      {activeOption && (
        <div className="screen5-share-section">
          <p className="screen5-share-note">
            I'll share everything you've gathered so far so you don't have to
            explain everything again.
          </p>
          <ShareOptions
            onShareWhatsApp={handleShareWhatsApp}
            onSharePDF={handleSharePDF}
            onShareSMS={handleShareSMS}
            onCallAgrovet={handleCallAgrovet}
          />
        </div>
      )}

      {showModal && (
        <UnderstandMoreModal
          sourceDetails={sourceDetails}
          onClose={() => setShowModal(false)}
        />
      )}

      <button className="screen5-finish-btn" onClick={onFinish}>
        Save & Return to Home
      </button>
    </div>
  );
}

export default Screen5Summary;