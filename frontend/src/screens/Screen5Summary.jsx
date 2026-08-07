import { useState } from "react";
import SummaryCard from "../components/SummaryCard";
import ShareOptions from "../components/ShareOptions";
import UnderstandMoreModal from "../components/UnderstandMoreModal";
import AudioPlayer from "../components/AudioPlayer";
import { getExplanationLabel } from "../i18n/explanationLabels";
import {
  generateSummaryPDF,
  buildWhatsAppLink,
} from "../services/exportSummary";
import "./Screen5Summary.css";

// All four "what to do next" actions live together in one card, in this
// order. "hasFindNearby" rows toggle an inline placeholder panel instead
// of firing onClick directly; the other two open their respective modals.
const ACTION_ROWS = [
  { id: "agrovet", label: "Discuss with an Agrovet", hasFindNearby: true },
  { id: "extension", label: "Discuss with an Extension Officer", hasFindNearby: true },
  { id: "sources", label: "Explore Trusted Sources" },
  { id: "share", label: "Share Summary" },
];

function Screen5Summary({
  extractedContext,
  comparison,
  summary,
  sourceDetails,
  onFinish,
  isReviewMode = false,
}) {
  const [openFindNearbyId, setOpenFindNearbyId] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSourcesModal, setShowSourcesModal] = useState(false);

  if (!extractedContext || !comparison) {
    return (
      <div className="screen5-container">
        <h2>Loading summary...</h2>
      </div>
    );
  }

  const language = extractedContext?.language;

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
      // summary.summary_text already starts with the "KAGUA SUMMARY" /
      // "MUHTASARI WA KAGUA" header (baked in by generate_summary.py) —
      // never prepend the header again here, or it prints twice.
      const textToCopy = summary?.summary_text
        ? `${summary.summary_text}${
            summary.discussion_points?.length > 0
              ? `\n\n${getExplanationLabel("questionsToAsk", language)}:\n${summary.discussion_points.map((p) => `• ${p}`).join("\n")}`
              : ""
          }\n\nPrepared by Kagua`
        : [
            "KAGUA SUMMARY",
            "",
            `Crop: ${extractedContext?.crop || "Not specified"}`,
            `Reported problem: ${extractedContext?.reported_problem || "Not specified"}`,
            "",
            comparison?.uncertainty?.length > 0
              ? `What remains unclear: ${comparison.uncertainty.join("; ")}`
              : "No major uncertainties were flagged.",
            "",
            "Prepared by Kagua",
          ].join("\n");

      await navigator.clipboard.writeText(textToCopy);
      alert("Summary copied to clipboard. You can paste it into WhatsApp or SMS.");
    } catch (error) {
      console.error("Failed to copy summary:", error);
      alert("Unable to copy summary");
    }
  };

  const openFindNearby = (id) => {
    setOpenFindNearbyId(id);
  };

  const handleActionClick = (row) => {
    if (row.hasFindNearby) {
      openFindNearby(row.id);
    } else if (row.id === "sources") {
      setShowSourcesModal(true);
    } else if (row.id === "share") {
      setShowShareModal(true);
    }
  };

  // ── What Kagua did this session ──
  // Reads the comparison object already present — no API call needed.
  // Framed as things Kagua organized/surfaced for the farmer, not skills
  // the farmer practiced — Kagua isn't teaching a lesson, it's helping
  // organize information.
  // Each bullet is independently conditional on its own data (multiple
  // perspectives, observations, uncertainty, trusted sources), so a
  // session with no trusted sources simply omits that one line rather
  // than needing separate handling — the card as a whole only disappears
  // when none of the four conditions are met.
  const getSessionSummaryPoints = () => {
    if (!comparison) return [];
    const points = [];
    if (comparison.perspectives && comparison.perspectives.length > 1)
      points.push("Reviewed information from different sources");
    if (extractedContext?.observations && extractedContext.observations.length > 0)
      points.push("Organised your field observations");
    if (comparison.uncertainty && comparison.uncertainty.length > 0)
      points.push("Identified what remains uncertain");
    if (comparison.sources_used && comparison.sources_used.length > 0)
      points.push("Drew on trusted agricultural sources");
    return points;
  };

  const sessionSummaryPoints = getSessionSummaryPoints();
  const showSessionSummary = !isReviewMode && sessionSummaryPoints.length > 0;

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

      {/* ── Page header — full width, centered above both columns ──
          Moved out of the left column so "Your Kagua Summary" centers
          against the whole page instead of just the narrow left column,
          matching Screen4's header pattern. The Listen button now sits
          inline next to the subtitle here (no card wrapper) instead of
          living in its own card in the right column — also matching
          Screen4. */}
      <div className="screen5-page-header">
        <h1 className="screen5-title">Your Kagua Summary</h1>
        <div className="screen5-subtitle-row">
          <p className="screen5-transition-note">
            {isReviewMode
              ? "This is a summary of your past conversation."
              : "This summary brings together the information from your conversation."}
          </p>
          <AudioPlayer text={buildPageText()} language={extractedContext?.language} />
        </div>
      </div>

      <div className="screen5-grid">

        {/* ── Left column: what was gathered ── */}
        <div className="screen5-left">
          <SummaryCard
            crop={extractedContext?.crop}
            reportedProblem={extractedContext?.reported_problem}
            observations={extractedContext?.observations}
            adviceReceived={extractedContext?.advice_received}
            confidence={comparison?.confidence}
          />
        </div>

        {/* ── Right column: what to do next ── */}
        <div className="screen5-main">

          {/* "During this conversation" — session recap, sits first. */}
          {showSessionSummary && (
            <div className="screen5-session-summary screen5-info-card">
              <p className="screen5-info-card-label">{getExplanationLabel("duringThisConversation", language)}</p>
              <ul className="screen5-session-summary-list">
                {sessionSummaryPoints.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Discussion points from the generated summary — only renders
              when there's something real to show (matches
              generate_summary.py's own rule: it leaves this list empty
              rather than inventing generic questions when there's nothing
              specific to ask). */}
          {summary?.discussion_points && summary.discussion_points.length > 0 && (
            <div className="screen5-discussion-points screen5-info-card">
              <p className="screen5-info-card-label">{getExplanationLabel("questionsToAsk", language)}</p>
              <ul className="screen5-discussion-list">
                {summary.discussion_points.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions: same shared card styling as the other info cards.
              Laid out 2-by-2 rather than stacked, so this card's height
              stays in line with the others instead of running long. */}
          <div className="screen5-actions-card screen5-info-card">
            <p className="screen5-info-card-label">
              {isReviewMode ? "What would you like to do?" : "Continue with your summary"}
            </p>

            <div className="screen5-action-grid">
              {ACTION_ROWS.map((row) => (
                <button
                  key={row.id}
                  className="screen5-action-tile"
                  onClick={() => handleActionClick(row)}
                >
                  {row.label}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Save & Return — centered below both columns */}
      <div className="screen5-finish-row">
        <button
          className="btn btn-primary screen5-finish-btn"
          onClick={onFinish}
        >
          {isReviewMode ? "Back to Home" : "Save & Return Home"}
        </button>
      </div>

      {/* Find nearby popup — same overlay/modal treatment as Share, so it
          appears as a centered popup rather than expanding inline. */}
      {openFindNearbyId && (
        <div
          className="screen5-modal-overlay"
          onClick={() => setOpenFindNearbyId(null)}
        >
          <div
            className="screen5-share-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="screen5-share-modal-header">
              <h3 className="screen5-share-modal-title">
                {ACTION_ROWS.find((row) => row.id === openFindNearbyId)?.label}
              </h3>
              <button
                className="screen5-modal-close"
                onClick={() => setOpenFindNearbyId(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="screen5-findnearby-modal-text">
              Nearby agrovets and extension officers will appear here.
            </p>
          </div>
        </div>
      )}

      {/* Share popup */}
      {showShareModal && (
        <div
          className="screen5-modal-overlay"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="screen5-share-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="screen5-share-modal-header">
              <h3 className="screen5-share-modal-title">Share summary</h3>
              <button
                className="screen5-modal-close"
                onClick={() => setShowShareModal(false)}
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

      {showSourcesModal && (
        <UnderstandMoreModal
          sourceDetails={sourceDetails}
          selectionReason={comparison?.sources_selection_reason}
          onClose={() => setShowSourcesModal(false)}
        />
      )}
    </div>
  );
}

export default Screen5Summary;