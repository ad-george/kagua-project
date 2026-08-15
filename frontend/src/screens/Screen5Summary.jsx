import { useState } from "react";
import ShareOptions from "../components/ShareOptions";
import UnderstandMoreModal from "../components/UnderstandMoreModal";
import AudioPlayer from "../components/AudioPlayer";
import { getExplanationLabel } from "../i18n/explanationLabels";
import { resolveDisplayLanguage } from "../i18n/languageDirection";
import {
  generateSummaryPDF,
  buildWhatsAppLink,
} from "../services/exportSummary";
import "./Screen5Summary.css";

// Local bilingual fallback for the on-screen short summary, used only if
// generate_summary.py's short_summary field is missing (call failed, or an
// older reviewed journey saved before this field existed). Deliberately
// generic and non-diagnostic, matching the safety bar of every other
// fallback in this app.
const SHORT_SUMMARY_FALLBACK = {
  english: "Kagua organized the information from this conversation.",
  kiswahili: "Kagua imepanga taarifa kutoka kwenye mazungumzo haya.",
};

// ── "What you asked" (Idea 12 carry-forward) ──
// SCENARIO_QUESTIONS is intentionally duplicated from Screen4Evidence.jsx
// rather than imported from a shared file — you'd already applied that
// file, so this avoids touching it again for this pass. Both copies must
// stay in sync if the wording ever changes; flagged here so that's not
// forgotten later.
const SCENARIO_QUESTIONS = {
  single: {
    english: "What made you confident about this?",
    kiswahili: "Ni nini kilichokufanya uwe na uhakika kuhusu hili?",
  },
  disagree: {
    english: "How are you telling this apart from what the other person thinks it is?",
    kiswahili: "Unatofautishaje hili na anachofikiria mtu mwingine?",
  },
  agree: {
    english: "What are you basing this on?",
    kiswahili: "Unaegemeza hili kwenye nini?",
  },
};

// ── Always-present small-scale caution (per the Screen 4/5 design doc) ──
const SMALL_SCALE_CAUTION = {
  english:
    "Trying anything on a small part of your field first — not all of it — limits what you'd lose if it's the wrong call.",
  kiswahili:
    "Kujaribu jambo lolote kwenye sehemu ndogo ya shamba lako kwanza — si shamba lote — hupunguza unachoweza kupoteza ikiwa si uamuzi sahihi.",
};

// ── Conditional price line — only renders if mentioned_price was actually
// extracted (see extract_context.py); never a placeholder, never invented.
const PRICE_QUOTE_TEMPLATE = {
  english: (price) => `That option was quoted at ${price}.`,
  kiswahili: (price) => `Chaguo hilo lilitajwa kugharimu ${price}.`,
};

function pickBilingual(entry, language) {
  const useKiswahili = language === "kiswahili" || language === "mixed";
  return useKiswahili ? entry.kiswahili : entry.english;
}

function capitalize(word) {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function Screen5Summary({
  extractedContext,
  comparison,
  summary,
  sourceDetails,
  screen4Replies,
  onFinish,
  isReviewMode = false,
}) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSourcesModal, setShowSourcesModal] = useState(false);

  if (!extractedContext || !comparison) {
    return (
      <div className="screen5-container">
        <h2>Loading summary...</h2>
      </div>
    );
  }

  const language = resolveDisplayLanguage(extractedContext?.language, extractedContext?.raw_input);

  // ── Carried forward from Screen 4 (Idea 12) ──
  // Recomputes the same deterministic question Screen 4 showed her, from
  // the same inputs (advice_received length + advice_agreement) — this is
  // never re-interpreted, only carried forward as-is, per the design doc.
  // Only rendered when advice actually existed (Screen 4 wasn't skipped).
  const adviceReceived = extractedContext?.advice_received || [];
  const hasAdvice = adviceReceived.length > 0;
  const hasMultipleAdvice = adviceReceived.length > 1;

  let scenarioKey = "single";
  if (hasMultipleAdvice) {
    scenarioKey = extractedContext?.advice_agreement === "disagree" ? "disagree" : "agree";
  }
  const carriedQuestion = hasAdvice ? pickBilingual(SCENARIO_QUESTIONS[scenarioKey], language) : null;
  const hasAnyReply = screen4Replies && Object.keys(screen4Replies).length > 0;

  // ── Conditional price line ──
  // Field name matches extract_context.py's actual output key exactly
  // (mentioned_price) — this previously read price_mentioned, a reversed
  // name that doesn't exist anywhere in the backend response, so the
  // price line was silently never rendering regardless of what the
  // farmer actually said.
  const priceQuote = extractedContext?.mentioned_price || null;

  const handleShareWhatsApp = () => {
    const link = buildWhatsAppLink(extractedContext, comparison, summary);
    window.open(link, "_blank");
  };

  const handleSharePDF = () => {
    generateSummaryPDF(extractedContext, comparison, summary);
  };

  const handleShareSMS = () => {
  const message = summary?.summary_text
    ? `${summary.summary_text}\n\nPrepared by Kagua.`
    : `Kagua Summary

  Crop: ${extractedContext?.crop || "Not specified"}
  Reported problem: ${extractedContext?.reported_problem || "Not specified"}

  What remains uncertain:
  ${
    comparison?.uncertainty?.length > 0
      ? comparison.uncertainty.join("; ")
      : "No major uncertainties were flagged."
  }

  Prepared by Kagua.`;

    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;

    window.location.href = smsUrl;
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

  // Prefer the backend-generated short_summary (see generate_summary.py) —
  // falls back to a safe generic sentence only if that call failed or this
  // is an older journey reviewed/resumed from before this field existed.
  const shortSummaryText = summary?.short_summary || pickBilingual(SHORT_SUMMARY_FALLBACK, language);

  // Build the complete page text for audio playback in logical order.
  // Prefers the backend-generated summary.summary_text (properly reflects
  // confidence, uncertainty, and source attribution — see generate_summary.py)
  // over this hand-built version, which is now only a fallback for cases
  // where no generated summary is available: the /summary call failed, or
  // this is an older journey reviewed/resumed from before this feature
  // existed and so has nothing saved in its steps. Unchanged from the
  // previous version of this file.
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
You can share this summary or explore trusted agricultural sources. 
If you are unsure about the next step, the summary also highlights what still remains unclear.`;

    return audioText;
  };

  return (
    <div className="screen5-container">

      {/* ── Page header — full width, centered above both columns ── */}
      <div className="screen5-page-header">
        <h1 className="screen5-title">Your Kagua Summary</h1>
        <div className="screen5-subtitle-row">
          <p className="screen5-transition-note">
            {isReviewMode
              ? "This is a summary of your past conversation."
              : "This summary brings together the information from your conversation."}
          </p>
          <AudioPlayer text={buildPageText()} language={language} />
        </div>
      </div>

      <div className="screen5-grid">

        {/* ── Left column: the short, non-repetitive Kagua Summary ──
            Replaces the old SummaryCard, which repeated crop, reported
            problem, observations, advice, and confidence — all of which
            the farmer already saw on Screens 2–4. This now shows only
            generate_summary.py's short_summary: what Kagua helped
            clarify, not a repeat of her own input. */}
        <div className="screen5-left">
          <div className="screen5-short-summary screen5-info-card">
            <p className="screen5-short-summary-text">{shortSummaryText}</p>
          </div>
        </div>

        {/* ── Right column: what to do next ── */}
        <div className="screen5-main">

          {/* Always present, per the design doc — a general small-scale
              caution applicable regardless of what was found, plus the
              conditional price line right beneath it if one was actually
              quoted. Placed first since it's a safety-relevant reminder,
              not tied to any particular finding above. */}
          <div className="screen5-caution-card screen5-info-card">
            <p className="screen5-caution-text">{pickBilingual(SMALL_SCALE_CAUTION, language)}</p>
            {priceQuote && (
              <p className="screen5-price-text">
                {pickBilingual(PRICE_QUOTE_TEMPLATE, language)(priceQuote)}
              </p>
            )}
          </div>

          {/* "What you asked" — carries forward the question Screen 4
              shaped for her, plus any reply she logged (Idea 12), exactly
              as she recorded it. Only renders if advice existed at all
              (Screen 4 wasn't skipped as Scenario A). A source's reply
              line only appears if she actually saved one — no "no reply
              yet" placeholder, matching this app's established rule of
              never announcing an absence (see generate_summary.py). */}
          {hasAdvice && (
            <div className="screen5-asked-card screen5-info-card">
              <p className="screen5-info-card-label">
                {pickBilingual({ english: "What you asked", kiswahili: "Ulichouliza" }, language)}
              </p>
              <p className="screen5-asked-question">&ldquo;{carriedQuestion}&rdquo;</p>
              {hasAnyReply && (
                <div className="screen5-asked-replies">
                  {adviceReceived.map((a, index) =>
                    screen4Replies[index] ? (
                      <div key={index} className="screen5-asked-reply-row">
                        {hasMultipleAdvice && (
                          <p className="screen5-asked-reply-source">{capitalize(a.source_type)}</p>
                        )}
                        <p className="screen5-asked-reply-text">{screen4Replies[index]}</p>
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </div>
          )}

          {/* Questions you can ask — only renders when there's something
              real to show (matches generate_summary.py's own rule: it
              leaves this list empty rather than inventing generic
              questions when there's nothing specific to ask). Capped to 2
              here as a defensive backstop — generate_summary.py already
              caps to 2, but a journey saved before that cap was tightened
              (e.g. reviewed from history) may still have 3 stored. */}
          {summary?.discussion_points && summary.discussion_points.length > 0 && (
            <div className="screen5-discussion-points screen5-info-card">
              <p className="screen5-info-card-label">{getExplanationLabel("questionsToAsk", language)}</p>
              <ul className="screen5-discussion-list">
                {summary.discussion_points.slice(0, 2).map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Explore Trusted Sources + Share Summary ──
              "Discuss with an Agrovet" and "Discuss with an Extension
              Officer" have been removed. That collapsed the old "Trusted
              Sources" group from 3 actions down to 1, so wrapping it in
              its own labeled card + multi-column grid no longer read as
              intentional — it looked like a leftover group-of-one. Both
              real actions now sit together as two aligned, equal-weight
              buttons in one row instead. */}
          <div className="screen5-actions-row">
            <button
              type="button"
              className="screen5-action-tile"
              onClick={() => setShowSourcesModal(true)}
            >
              Explore Trusted Sources
            </button>
            <button
              type="button"
              className="screen5-action-tile screen5-share-standalone"
              onClick={() => setShowShareModal(true)}
            >
              Share Summary
            </button>
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