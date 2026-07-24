import { useState } from "react";
import SummaryCard from "../components/SummaryCard";
import ShareOptions from "../components/ShareOptions";
import UnderstandMoreModal from "../components/UnderstandMoreModal";
import AudioPlayer from "../components/AudioPlayer";
import {
  generateSummaryPDF,
  buildWhatsAppLink,
} from "../services/exportSummary";
import "./Screen5Summary.css";

const CONTINUE_OPTIONS = [
  {
    id: "professional",
    label: "Discuss with an Agrovet or Extension Officer",
    description: "Share your Kagua summary during your conversation with them.",
    hasFindNearby: true,
  },
  {
    id: "other",
    label: "Share with someone else",
    description: "Send your summary to a neighbour, friend, or anyone else.",
    hasFindNearby: false,
  },
];

function Screen5Summary({
  extractedContext,
  comparison,
  sourceDetails,
  onFinish,
}) {
  const [openShareId, setOpenShareId] = useState(null);
  const [openFindNearbyId, setOpenFindNearbyId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  if (!extractedContext || !comparison) {
    return (
      <div className="screen5-container">
        <h2>Loading summary...</h2>
      </div>
    );
  }

  const handleShareWhatsApp = () => {
    const link = buildWhatsAppLink(extractedContext, comparison);
    window.open(link, "_blank");
  };

  const handleSharePDF = () => {
    generateSummaryPDF(extractedContext, comparison);
  };

  const handleShareSMS = () => {
    alert("SMS sharing coming soon");
  };

  const handleCopyText = async () => {
    try {
      const summaryText = `
KAGUA SUMMARY

Crop: ${extractedContext?.crop || "Not specified"}

Reported Problem:
${extractedContext?.reported_problem || "Not specified"}

Observations:
${
  Array.isArray(extractedContext?.observations)
    ? extractedContext.observations.join(", ")
    : extractedContext?.observations || "None"
}

Confidence:
${comparison?.confidence || "Not available"}
      `;

      await navigator.clipboard.writeText(summaryText);
      alert("Summary copied to clipboard");
    } catch (error) {
      console.error("Failed to copy summary:", error);
      alert("Unable to copy summary");
    }
  };

  const toggleShare = (id) => {
    setOpenShareId((prev) => (prev === id ? null : id));
  };

  const toggleFindNearby = (id) => {
    setOpenFindNearbyId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="screen5-container">
      <div className="screen5-grid">

        {/* ── Left column: what was gathered ── */}
        <div className="screen5-header">
          {/* <p className="screen5-brand">Kagua</p> */}
          <h1 className="screen5-title">You're Ready to Continue</h1>

          <p className="screen5-transition-note">
            Kagua has organized the observations, advice received, trusted
            information, and remaining questions from this conversation.
          </p>

          <SummaryCard
            crop={extractedContext?.crop}
            reportedProblem={extractedContext?.reported_problem}
            observations={extractedContext?.observations}
            confidence={comparison?.confidence}
          />
        </div>

        {/* ── Right column: what to do next ── */}
        <div className="screen5-main">
          <h2 className="screen5-subtitle">
            How would you like to continue?
          </h2>

          {/* Narrates this column's own content (the options below), so
              it lives here rather than under the summary card, which is
              about what was gathered, not what to do next. */}
          <div className="screen5-audio-row">
            <p className="screen5-audio-label">Listen to your next steps</p>
            <AudioPlayer text="You can now choose to discuss this with an agrovet, discuss it with an extension officer, or explore trusted sources to learn more." />
          </div>

          <div className="screen5-options">
            {CONTINUE_OPTIONS.map((option) => (
              <div key={option.id} className="screen5-option-card">
                <div className="screen5-option-header">
                  <span className="screen5-option-label">{option.label}</span>
                  <span className="screen5-option-description">{option.description}</span>
                </div>

                <div className="screen5-option-actions">
                  {option.hasFindNearby && (
                    <button
                      className="screen5-action-btn"
                      onClick={() => toggleFindNearby(option.id)}
                    >
                      {openFindNearbyId === option.id ? "Hide nearby options" : "Find nearby"}
                    </button>
                  )}
                  <button
                    className="screen5-action-btn"
                    onClick={() => toggleShare(option.id)}
                  >
                    {openShareId === option.id ? "Hide share options" : "Share summary"}
                  </button>
                </div>

                {option.hasFindNearby && openFindNearbyId === option.id && (
                  <div className="screen5-findnearby-placeholder">
                    <p>Nearby agrovets and extension officers will appear here.</p>
                  </div>
                )}

                {openShareId === option.id && (
                  <div className="screen5-share-section">
                    <ShareOptions
                      onShareWhatsApp={handleShareWhatsApp}
                      onSharePDF={handleSharePDF}
                      onShareSMS={handleShareSMS}
                      onCopyText={handleCopyText}
                    />
                  </div>
                )}
              </div>
            ))}

            <button
              className="screen5-option-btn screen5-option-btn--sources"
              onClick={() => setShowModal(true)}
            >
              <span className="screen5-option-label">
                Explore Trusted Sources
              </span>
              <span className="screen5-option-description">
                See the verified guidance related to your situation.
              </span>
            </button>
          </div>

          <button
            className="btn btn-primary screen5-finish-btn"
            onClick={onFinish}
          >
            Save
          </button>
        </div>

      </div>

      {showModal && (
        <UnderstandMoreModal
          sourceDetails={sourceDetails}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

export default Screen5Summary;