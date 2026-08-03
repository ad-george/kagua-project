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
  // {
  //   id: "other",
  //   label: "Share with someone else",
  //   description: "Send your summary to a neighbour, friend, or anyone else.",
  //   hasFindNearby: false,
  // },
];

function Screen5Summary({
  extractedContext,
  comparison,
  summary,
  sourceDetails,
  onFinish,
  isReviewMode = false,
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
    const link = buildWhatsAppLink(extractedContext, comparison, summary);
    window.open(link, "_blank");
  };

  const handleSharePDF = () => {
    generateSummaryPDF(extractedContext, comparison, summary);
  };

  const handleShareSMS = () => {
    alert("SMS sharing is being prepared for your next update. For now, use WhatsApp or PDF sharing.");
  };

  const handleCopyText = async () => {
    try {
      const textToCopy = summary?.summary_text
        ? `KAGUA SUMMARY\n\n${summary.summary_text}${
            summary.discussion_points?.length > 0
              ? `\n\nQuestions to bring up:\n${summary.discussion_points.map((p) => `• ${p}`).join("\n")}`
              : ""
          }\n\n_Shared from Kagua_`
        : [
            "KAGUA SUMMARY",
            "",
            `Crop: ${extractedContext?.crop || "Not specified"}`,
            `Reported problem: ${extractedContext?.reported_problem || "Not specified"}`,
            "",
            comparison?.uncertainty?.length > 0
              ? `What remains unclear: ${comparison.uncertainty.join("; ")}`
              : "No major uncertainties were flagged.",
          ].join("\n");

      await navigator.clipboard.writeText(textToCopy);
      alert("Summary copied to clipboard. You can paste it into WhatsApp or SMS.");
    } catch (error) {
      console.error("Failed to copy summary:", error);
      alert("Unable to copy summary");
    }
  };

  const toggleFindNearby = (id) => {
    setOpenFindNearbyId((prev) => (prev === id ? null : id));
  };

  // ── MIL skills practiced this session ──
  // Reads the comparison object already present — no API call needed.
  // Each condition maps directly to a UNESCO MIL competency.
  const getMILSkills = () => {
    if (!comparison) return [];
    const skills = [];
    if (comparison.perspectives && comparison.perspectives.length > 1)
      skills.push("Comparing advice from different sources");
    if (extractedContext?.observations && extractedContext.observations.length > 0)
      skills.push("Checking evidence in your own field");
    if (comparison.uncertainty && comparison.uncertainty.length > 0)
      skills.push("Understanding what is still uncertain");
    if (comparison.confidence === "LOW")
      skills.push("Making a decision with incomplete information");
    if (comparison.sources_used && comparison.sources_used.length > 0)
      skills.push("Consulting trusted agricultural sources");
    return skills;
  };

  const milSkills = getMILSkills();

  // Build the complete page text for audio playback in logical order.
  // Prefers the backend-generated summary.summary_text (properly reflects
  // confidence, uncertainty, and source attribution — see generate_summary.py)
  // over this hand-built version, which is now only a fallback for cases
  // where no generated summary is available: the /summary call failed, or
  // this is an older journey reviewed/resumed from before this feature
  // existed and so has nothing saved in its steps.
  const buildPageText = () => {
    if (summary?.summary_text) {
      return summary.summary_text;
    }

    const crop = extractedContext?.crop || "Not specified";
    const problem = extractedContext?.reported_problem || "Not specified";
    const observations = Array.isArray(extractedContext?.observations)
      ? extractedContext.observations.join(", ")
      : extractedContext?.observations || "None";

    let audioText = `Here is your Kagua summary from our conversation. 
You came to me about your ${crop} crop, and you noticed ${problem}. 
I have gathered your field observations and the guidance you received, and I have organized them clearly for you. 
${isReviewMode ? "This is a summary of your past conversation." : "This summary is meant to help you feel prepared for the next step."} 
You can share this summary with an agrovet or extension officer, find nearby support, or explore trusted agricultural sources. 
If you are unsure about the next step, the summary also highlights what still remains unclear.`;

    return audioText;
  };

  return (
    <div className="screen5-container">
      <div className="screen5-grid">

        {/* ── Left column: what was gathered ── */}
        <div className="screen5-header">
          {/* <p className="screen5-brand">Kagua</p> */}
          <h1 className="screen5-title">{isReviewMode ? "Summary" : "You're Ready to Continue"}</h1>

          <p className="screen5-transition-note">
            {isReviewMode
              ? "This is a summary of your past conversation."
              : "Kagua has organized the observations, advice received, trusted information, and remaining questions from this conversation."}
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
            {isReviewMode ? "What would you like to do?" : "How would you like to continue?"}
          </h2>

          {/* Single Listen button for the entire page */}
          <div className="screen5-audio-row">
            <p className="screen5-audio-label">Listen to this page</p>
            <AudioPlayer text={buildPageText()} language={extractedContext?.language} />
          </div>

          {/* Discussion points from the generated summary — genuinely new
              content with nowhere else on this screen to live, so it gets
              its own small section. Only renders when there's something
              real to show (matches generate_summary.py's own rule: it
              leaves this list empty rather than inventing generic
              questions when there's nothing specific to ask). */}
          {summary?.discussion_points && summary.discussion_points.length > 0 && (
            <div className="screen5-discussion-points">
              <p className="screen5-discussion-label">Questions to bring up</p>
              <ul className="screen5-discussion-list">
                {summary.discussion_points.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {/* MIL skills practiced — derived from comparison data already
              present, no API call. Makes the MIL impact visible to the
              farmer and to judges without adding any backend work. */}
          {!isReviewMode && milSkills.length > 0 && (
            <div className="screen5-mil-card">
              <p className="screen5-mil-label">In this conversation you practiced</p>
              <ul className="screen5-mil-list">
                {milSkills.map((skill, index) => (
                  <li key={index}>
                    <span className="screen5-mil-tick">✓</span>
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          )}

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
                    onClick={() => setOpenShareId(option.id)}
                  >
                    Share summary
                  </button>
                </div>

                {option.hasFindNearby && openFindNearbyId === option.id && (
                  <div className="screen5-findnearby-placeholder">
                    <p>Nearby agrovets and extension officers will appear here.</p>
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
            {isReviewMode ? "Back to Home" : "Save"}
          </button>
        </div>

      </div>

      {/* Share popup — overlays the screen instead of expanding inline
          under whichever option card triggered it. */}
      {openShareId && (
        <div
          className="screen5-modal-overlay"
          onClick={() => setOpenShareId(null)}
        >
          <div
            className="screen5-share-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="screen5-share-modal-header">
              <h3 className="screen5-share-modal-title">Share summary</h3>
              <button
                className="screen5-modal-close"
                onClick={() => setOpenShareId(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <ShareOptions
              onShareWhatsApp={handleShareWhatsApp}
              onSharePDF={handleSharePDF}
              onShareSMS={handleShareSMS}
              onCopyText={handleCopyText}
            />
          </div>
        </div>
      )}

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