import { useState } from "react";
import {
  Compass,
  Sprout,
  CircleHelp,
  MessageCircleQuestion,
  ListChecks,
  BookOpen,
  Share2,
} from "lucide-react";

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

const SHORT_SUMMARY_FALLBACK = {
  english:
    "Kagua reviewed everything you shared and is ready to help you take the next step.",
  kiswahili:
    "Kagua imepitia yote uliyoshiriki na iko tayari kukusaidia kuchukua hatua inayofuata.",
};

// ── "What you asked" ──
const SCENARIO_QUESTIONS = {
  single: {
    english: "What made you confident about this?",
    kiswahili: "Ni nini kilichokufanya uwe na uhakika kuhusu hili?",
  },

  disagree: {
    english:
      "How are you telling this apart from what the other person thinks it is?",
    kiswahili:
      "Unatofautishaje hili na anachofikiria mtu mwingine?",
  },

  agree: {
    english: "What are you basing this on?",
    kiswahili: "Unaegemeza hili kwenye nini?",
  },
};

const ASKED_ACTION_LINE = {
  english:
    "Bring this up next time you speak with them, or send it now from Screen 4.",

  kiswahili:
    "Ibue hili wakati mwingine utakapozungumza nao, au itume sasa kutoka Skrini ya 4.",
};

const SMALL_SCALE_CAUTION = {
  english:
    "Trying anything on a small part of your field first — not all of it — limits what you'd lose if it's the wrong call.",

  kiswahili:
    "Kujaribu jambo lolote kwenye sehemu ndogo ya shamba lako kwanza — si shamba lote — hupunguza unachoweza kupoteza ikiwa si uamuzi sahihi.",
};

const PRICE_QUOTE_TEMPLATE = {
  english: (price) => `That option was quoted at ${price}.`,
  kiswahili: (price) => `Chaguo hilo lilitajwa kugharimu ${price}.`,
};

const UNCERTAINTY_LABEL = {
  english: "What remains uncertain",
  kiswahili: "Kinachobaki hakijathibitishwa",
};

function pickBilingual(entry, language) {
  const useKiswahili =
    language === "kiswahili" || language === "mixed";

  return useKiswahili ? entry.kiswahili : entry.english;
}

function capitalize(word) {
  if (!word) return word;

  return word.charAt(0).toUpperCase() + word.slice(1);
}

// ─────────────────────────────────────────────
// Share / Explore Sources buttons
// ─────────────────────────────────────────────

function ActionButtons({
  language,
  onShareClick,
  onSourcesClick,
}) {
  return (
    <>
      {/* SHARE */}

      <button
        type="button"
        className="screen5-action-tile"
        onClick={onShareClick}
      >
        <Share2
          size={17}
          strokeWidth={2.2}
          aria-hidden="true"
        />

        <span>
          {pickBilingual(
            {
              english: "Share Summary",
              kiswahili: "Shiriki Muhtasari",
            },
            language
          )}
        </span>
      </button>

      {/* TRUSTED SOURCES */}

      <button
        type="button"
        className="screen5-action-tile"
        onClick={onSourcesClick}
      >
        <BookOpen
          size={17}
          strokeWidth={2.2}
          aria-hidden="true"
        />

        <span>
          {pickBilingual(
            {
              english: "Explore Trusted Sources",
              kiswahili:
                "Chunguza Vyanzo vya Kuaminika",
            },
            language
          )}
        </span>
      </button>
    </>
  );
}

// ─────────────────────────────────────────────
// Card Header
// ─────────────────────────────────────────────

function CardHeader({
  icon: Icon,
  label,
  tone = "primary",
}) {
  return (
    <div className={`screen5-card-header screen5-tone-${tone}`}>
      <span
        className="screen5-card-icon-badge"
        aria-hidden="true"
      >
        <Icon size={16} strokeWidth={2.2} />
      </span>

      <p className="screen5-card-header-label">
        {label}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Screen 5
// ─────────────────────────────────────────────

function Screen5Summary({
  extractedContext,
  comparison,
  summary,
  sourceDetails,
  screen4Replies,
  onFinish,
  isReviewMode = false,
}) {
  const [showSourcesModal, setShowSourcesModal] =
    useState(false);

  const [showShareModal, setShowShareModal] =
    useState(false);

  if (!extractedContext || !comparison) {
    return (
      <div className="screen5-container">
        <h2>Loading summary...</h2>
      </div>
    );
  }

  const language = resolveDisplayLanguage(
    extractedContext?.language,
    extractedContext?.raw_input
  );

  const adviceReceived =
    extractedContext?.advice_received || [];

  const hasAdvice = adviceReceived.length > 0;

  const hasMultipleAdvice =
    adviceReceived.length > 1;

  let scenarioKey = "single";

  if (hasMultipleAdvice) {
    scenarioKey =
      extractedContext?.advice_agreement === "disagree"
        ? "disagree"
        : "agree";
  }

  const carriedQuestion = hasAdvice
    ? pickBilingual(
        SCENARIO_QUESTIONS[scenarioKey],
        language
      )
    : null;

  const hasAnyReply =
    screen4Replies &&
    Object.keys(screen4Replies).length > 0;

  const priceQuote =
    extractedContext?.mentioned_price || null;

  const uncertaintyList = Array.isArray(
    comparison?.uncertainty
  )
    ? comparison.uncertainty
    : [];

  const hasUncertainty =
    uncertaintyList.length > 0;

  // ───────────────────────────────────────────
  // Share handlers
  // ───────────────────────────────────────────

  const handleShareWhatsApp = () => {
    const link = buildWhatsAppLink(
      extractedContext,
      comparison,
      summary
    );

    window.open(link, "_blank");

    setShowShareModal(false);
  };

  const handleSharePDF = () => {
    generateSummaryPDF(
      extractedContext,
      comparison,
      summary
    );

    setShowShareModal(false);
  };

  const handleShareSMS = () => {
    const message = summary?.summary_text
      ? `${summary.summary_text}\n\nPrepared by Kagua.`
      : `Kagua Summary

Crop: ${extractedContext?.crop || "Not specified"}
Reported problem: ${
          extractedContext?.reported_problem ||
          "Not specified"
        }

What remains uncertain:
${
  comparison?.uncertainty?.length > 0
    ? comparison.uncertainty.join("; ")
    : "No major uncertainties were flagged."
}

Prepared by Kagua.`;

    const smsUrl = `sms:?body=${encodeURIComponent(
      message
    )}`;

    window.location.href = smsUrl;

    setShowShareModal(false);
  };

  const handleCopyText = async () => {
    try {
      const textToCopy = summary?.summary_text
        ? `${summary.summary_text}${
            summary.discussion_points?.length > 0
              ? `\n\n${getExplanationLabel(
                  "questionsToAsk",
                  language
                )}:\n${summary.discussion_points
                  .map((p) => `• ${p}`)
                  .join("\n")}`
              : ""
          }\n\nPrepared by Kagua`
        : [
            "KAGUA SUMMARY",
            "",
            `Crop: ${
              extractedContext?.crop ||
              "Not specified"
            }`,
            `Reported problem: ${
              extractedContext?.reported_problem ||
              "Not specified"
            }`,
            "",
            comparison?.uncertainty?.length > 0
              ? `What remains unclear: ${comparison.uncertainty.join(
                  "; "
                )}`
              : "No major uncertainties were flagged.",
            "",
            "Prepared by Kagua",
          ].join("\n");

      await navigator.clipboard.writeText(
        textToCopy
      );

      alert(
        "Summary copied to clipboard. You can paste it into WhatsApp or SMS."
      );

      setShowShareModal(false);
    } catch (error) {
      console.error(
        "Failed to copy summary:",
        error
      );

      alert("Unable to copy summary");
    }
  };

  // ───────────────────────────────────────────
  // Page text for audio
  // ───────────────────────────────────────────

  const shortSummaryText =
    summary?.short_summary ||
    pickBilingual(
      SHORT_SUMMARY_FALLBACK,
      language
    );

  const buildPageText = () => {
    if (summary?.summary_text) {
      return summary.summary_text;
    }

    const crop =
      extractedContext?.crop ||
      "Not specified";

    const problem =
      extractedContext?.reported_problem ||
      "Not specified";

    return `Here is your Kagua summary from our conversation.

You came to me about your ${crop} crop, and you noticed ${problem}.

I have gathered your field observations and the guidance you received, and I have organized them clearly for you.

${
  isReviewMode
    ? "This is a summary of your past conversation."
    : "This summary is meant to help you feel prepared for the next step."
}

You can share this summary or explore trusted agricultural sources.

If you are unsure about the next step, the summary also highlights what still remains unclear.`;
  };

  // ───────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────

  return (
    <div className="screen5-container">

      {/* ─────────────────────────────────────
          PAGE HEADER
      ───────────────────────────────────── */}

      <div className="screen5-page-header">

        <h1 className="screen5-title">
          Your Kagua Summary
        </h1>

        <div className="screen5-subtitle-row">

          <p className="screen5-transition-note">
            {isReviewMode
              ? "This is a summary of your past conversation."
              : "This is what you can share, save, or bring with you the next time you speak to someone about it."}
          </p>

          <AudioPlayer
            text={buildPageText()}
            language={language}
          />

        </div>

      </div>

      {/* ─────────────────────────────────────
          MAIN GRID
      ───────────────────────────────────── */}

      <div className="screen5-grid">

        {/* ───────────────────────────────────
            HERO CARD
        ─────────────────────────────────── */}

        <div className="screen5-hero-card">

          <span
            className="screen5-hero-icon-badge"
            aria-hidden="true"
          >
            <Compass
              size={22}
              strokeWidth={2}
            />
          </span>

          <div className="screen5-hero-body">

            <p className="screen5-hero-eyebrow">
              {pickBilingual(
                {
                  english: "What Kagua found",
                  kiswahili: "Kagua Iligundua Nini",
                },
                language
              )}
            </p>

            <p className="screen5-hero-text">
              {shortSummaryText}
            </p>

          </div>

        </div>

        {/* ───────────────────────────────────
            MAIN CONTENT
        ─────────────────────────────────── */}

        <div className="screen5-main">

          {/* BEFORE YOU DECIDE */}

          <div className="screen5-info-card screen5-caution-card">

            <CardHeader
              icon={Sprout}
              tone="caution"
              label={pickBilingual(
                {
                  english: "Before you decide",
                  kiswahili: "Kabla Hujaamua",
                },
                language
              )}
            />

            <p className="screen5-caution-text">
              {pickBilingual(
                SMALL_SCALE_CAUTION,
                language
              )}
            </p>

            {priceQuote && (
              <p className="screen5-price-text">
                {pickBilingual(
                  PRICE_QUOTE_TEMPLATE,
                  language
                )(priceQuote)}
              </p>
            )}

          </div>

          {/* UNCERTAINTY + ACTIONS (kept together so the
              buttons always sit directly below this card,
              in whichever column it lands on desktop) */}

          {hasUncertainty && (
            <div className="screen5-uncertainty-group">

              <div className="screen5-info-card">

                <CardHeader
                  icon={CircleHelp}
                  tone="secondary"
                  label={pickBilingual(
                    UNCERTAINTY_LABEL,
                    language
                  )}
                />

                <ul className="screen5-uncertainty-list">

                  {uncertaintyList.map(
                    (item, index) => (
                      <li key={index}>
                        {item}
                      </li>
                    )
                  )}

                </ul>

              </div>

              <div className="screen5-actions-row">
                <ActionButtons
                  language={language}
                  onShareClick={() =>
                    setShowShareModal(true)
                  }
                  onSourcesClick={() =>
                    setShowSourcesModal(true)
                  }
                />
              </div>

            </div>
          )}

          {/* WHAT YOU ASKED */}

          {hasAdvice && (
            <div className="screen5-info-card">

              <CardHeader
                icon={MessageCircleQuestion}
                tone="primary"
                label={pickBilingual(
                  {
                    english: "What you asked",
                    kiswahili: "Ulichouliza",
                  },
                  language
                )}
              />

              <p className="screen5-asked-question">
                &ldquo;
                {carriedQuestion}
                &rdquo;
              </p>

              {!hasAnyReply && (
                <p className="screen5-asked-action-line">
                  {pickBilingual(
                    ASKED_ACTION_LINE,
                    language
                  )}
                </p>
              )}

              {hasAnyReply && (
                <div className="screen5-asked-replies">

                  {adviceReceived.map(
                    (a, index) =>
                      screen4Replies[index] ? (
                        <div
                          key={index}
                          className="screen5-asked-reply-row"
                        >

                          {hasMultipleAdvice && (
                            <p className="screen5-asked-reply-source">
                              {capitalize(
                                a.source_type
                              )}
                            </p>
                          )}

                          <p className="screen5-asked-reply-text">
                            {
                              screen4Replies[
                                index
                              ]
                            }
                          </p>

                        </div>
                      ) : null
                  )}

                </div>
              )}

            </div>
          )}

          {/* QUESTIONS TO ASK */}

          {summary?.discussion_points &&
            summary.discussion_points.length >
              0 && (
              <div className="screen5-info-card">

                <CardHeader
                  icon={ListChecks}
                  tone="secondary"
                  label={getExplanationLabel(
                    "questionsToAsk",
                    language
                  )}
                />

                <ul className="screen5-discussion-list">

                  {summary.discussion_points
                    .slice(0, 2)
                    .map(
                      (point, index) => (
                        <li key={index}>
                          {point}
                        </li>
                      )
                    )}

                </ul>

              </div>
            )}

          {/* ─────────────────────────────────
              ACTIONS (fallback)
              Only renders here when there's no
              uncertainty card to sit under —
              otherwise the buttons live inside
              screen5-uncertainty-group above.
          ───────────────────────────────── */}

          {!hasUncertainty && (
            <div className="screen5-actions-row screen5-actions-standalone">
              <ActionButtons
                language={language}
                onShareClick={() =>
                  setShowShareModal(true)
                }
                onSourcesClick={() =>
                  setShowSourcesModal(true)
                }
              />
            </div>
          )}

        </div>

      </div>

      {/* ─────────────────────────────────────
          FINISH
      ───────────────────────────────────── */}

      <div className="screen5-finish-row">

        <button
          className="btn btn-primary screen5-finish-btn"
          onClick={onFinish}
        >
          {isReviewMode
            ? "Back to Home"
            : "Save & Return Home"}
        </button>

      </div>

      {/* ─────────────────────────────────────
          TRUSTED SOURCES MODAL
      ───────────────────────────────────── */}

      {showSourcesModal && (
        <UnderstandMoreModal
          sourceDetails={sourceDetails}
          selectionReason={
            comparison?.sources_selection_reason
          }
          onClose={() =>
            setShowSourcesModal(false)
          }
        />
      )}

      {/* ─────────────────────────────────────
          SHARE MODAL
      ───────────────────────────────────── */}

      {showShareModal && (
        <div
          className="screen5-modal-overlay"
          onClick={() =>
            setShowShareModal(false)
          }
        >

          <div
            className="screen5-share-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="screen5-share-modal-header">

              <div>

                <h2 className="screen5-share-modal-title">
                  {pickBilingual(
                    {
                      english:
                        "Share your summary",
                      kiswahili:
                        "Shiriki muhtasari wako",
                    },
                    language
                  )}
                </h2>

                <p className="screen5-share-modal-subtitle">
                  {pickBilingual(
                    {
                      english:
                        "Choose how you'd like to share it.",
                      kiswahili:
                        "Chagua jinsi ungependa kuushiriki.",
                    },
                    language
                  )}
                </p>

              </div>

              <button
                type="button"
                className="screen5-modal-close"
                onClick={() =>
                  setShowShareModal(false)
                }
                aria-label="Close share options"
              >
                ×
              </button>

            </div>

            {/* SHARE OPTIONS */}

            <ShareOptions
              onShareWhatsApp={
                handleShareWhatsApp
              }
              onSharePDF={handleSharePDF}
              onShareSMS={handleShareSMS}
              onCopyText={handleCopyText}
            />

          </div>

        </div>
      )}

    </div>
  );
}

export default Screen5Summary;