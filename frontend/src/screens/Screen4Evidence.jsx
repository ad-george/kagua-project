import { useState } from "react";
import { Eye, EyeOff, User, Radio, DollarSign, Handshake, Shield, ChevronRight } from "lucide-react";
import AudioPlayer from "../components/AudioPlayer";
import { buildQuestionWhatsAppLink } from "../services/exportSummary";
import "./Screen4Evidence.css";

// ── Page title/subtitle ──
// Screen 4's job changed completely: it no longer explains WHAT was said
// (Screen 2 already does that) or interprets a disagreement — it teaches
// the farmer how to weigh WHO is talking to her, using only structural
// facts about the conversation (never the crop). Title reflects that.
const PAGE_TITLE = {
  english: "Where This Came From",
  kiswahili: "Habari Hii Ilitoka Wapi",
};
const PAGE_SUBTITLE = {
  english: "A few things worth knowing before you decide.",
  kiswahili: "Mambo machache ya kujua kabla ya kuamua.",
};

// ── Badges ──
// Icons and text are kept as two separate lookup tables (rather than one
// combined structure holding emoji strings, as before) so each badge can
// render a real lucide-react icon component instead of an emoji glyph —
// consistent, scalable, and themeable via currentColor instead of relying
// on the platform's emoji font rendering.
const BADGE_ICONS = {
  sawInPerson: { true: Eye, false: EyeOff },
  namedSource: { true: User, false: Radio },
  sellsProduct: { true: DollarSign, false: Handshake },
};

// Each badge only renders when its underlying field is explicitly true or
// false — never when it's null/undefined. This mirrors the design doc's
// "a badge only appears if that specific fact was actually stated" rule:
// the fields themselves are already extracted deterministically in
// extract_context.py with null as the default for anything unclear, so
// there is no additional guessing happening here — this is purely display
// logic reading a fact that's already been decided (or not) upstream.
const BADGE_LABELS = {
  sawInPerson: {
    true: { english: "Saw it in person", kiswahili: "Aliona ana kwa ana" },
    false: { english: "Told about it", kiswahili: "Aliambiwa tu" },
  },
  namedSource: {
    true: { english: "Named source", kiswahili: "Chanzo kinachojulikana" },
    false: { english: "Anonymous / broadcast source", kiswahili: "Chanzo kisichojulikana" },
  },
  sellsProduct: {
    true: { english: "Sells a product", kiswahili: "Anauza bidhaa" },
    false: { english: "Nothing to sell", kiswahili: "Hana bidhaa ya kuuza" },
  },
};

// 🛡️ Prebunking line — fires only when at least one source has
// sells_product === true, per the design doc ("not a standalone element").
const PREBUNK_TEXT = {
  english: "If another product is suggested, ask what specific reason makes it necessary.",
  kiswahili: "Ikiwa bidhaa nyingine itapendekezwa, uliza ni sababu gani hasa inayoifanya ihitajike.",
};

// ── The "one thing worth asking" question ──
// Deterministic lookup, not LLM-generated — matches the design doc's
// scenario structure exactly (B: one source, C: 2+ sources that disagree,
// D: 2+ sources that agree). Scenario is chosen from advice_agreement,
// extracted deterministically in extract_context.py from the actual
// actions each source suggested — never inferred here, and never assumed
// from source count alone.
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

// "Ready to send to [Source]:" label, per the design doc's send-step copy.
// Only names a specific source in the single-source scenario (B) — when
// there are 2+ sources (C/D), the question itself is deliberately framed
// as addressed to "either of them," so naming one source here would
// contradict that framing. In the multi-source case this falls back to a
// source-agnostic "Ready to send:" instead.
const READY_TO_SEND_LABEL = {
  english: "Ready to send to",
  kiswahili: "Tayari kutuma kwa",
};
const READY_TO_SEND_GENERIC = {
  english: "Ready to send:",
  kiswahili: "Tayari kutuma:",
};

function pickBilingual(entry, language) {
  const useKiswahili = language === "kiswahili" || language === "mixed";
  return useKiswahili ? entry.kiswahili : entry.english;
}

function capitalize(word) {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// Small helper so each badge span is built the same way — pulls the
// right icon component out of BADGE_ICONS and the right bilingual label
// out of BADGE_LABELS for the given field key + boolean value.
function Badge({ fieldKey, value, language }) {
  const Icon = BADGE_ICONS[fieldKey][value];
  const label = BADGE_LABELS[fieldKey][value];
  return (
    <span className="screen4-badge">
      <Icon size={14} strokeWidth={2} className="screen4-badge-icon" aria-hidden="true" />
      {pickBilingual(label, language)}
    </span>
  );
}

function Screen4Evidence({ extractedContext, onContinue, initialReplies, onSaveReply }) {
  const language = extractedContext?.language;
  const adviceReceived = extractedContext?.advice_received || [];
  const hasMultiple = adviceReceived.length > 1;

  // Idea 12 (reply capture): drafts are what she's currently typing,
  // replies are what's been saved. Kept separate so a half-typed reply
  // doesn't accidentally get treated as "logged" before she confirms it.
  // `replies` is seeded from initialReplies (passed down from App.js,
  // restored from journey.steps.screen4_replies) so a resumed journey
  // shows previously-logged replies instead of blank boxes — while still
  // letting her log more if she reaches Screen 4 again this session.
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replies, setReplies] = useState(initialReplies || {});

  // Source cards are collapsible when there are 2+ sources — each card's
  // whole row is the tap target (not the individual badges, which are
  // facts, not actions). Defaults to all-expanded so nothing she'd
  // currently see is hidden by default; tapping a card just lets her
  // declutter once she's read it. With a single source there's nothing
  // to declutter, so that card stays static (see hasMultiple checks
  // below) rather than being collapsible for no reason.
  const [expandedSources, setExpandedSources] = useState(() => {
    const initial = {};
    adviceReceived.forEach((_, i) => { initial[i] = true; });
    return initial;
  });

  const toggleSource = (index) => {
    setExpandedSources((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  // Defensive only — Scenario A (no advice/sources at all) is handled by
  // App.js skipping this screen entirely and routing straight to Screen 5.
  // This branch exists purely so the screen degrades gracefully instead of
  // rendering broken/empty content if it's ever reached with nothing to
  // show (e.g. a stale draft resumed from before this rebuild).
  if (adviceReceived.length === 0) {
    return (
      <div className="screen4-container">
        <div className="screen4-header">
          <h1 className="screen4-title">{pickBilingual(PAGE_TITLE, language)}</h1>
        </div>
        <div className="screen4-panel">
          <p className="screen4-empty-note">Nothing to compare yet.</p>
        </div>
        <div className="screen4-cta">
          <button className="btn btn-primary screen4-continue-btn" onClick={() => onContinue(replies)}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  const anySells = adviceReceived.some((a) => a.sells_product === true);

  // Scenario selection: unclear/null advice_agreement deliberately falls
  // back to the neutral "agree" framing ("What are you basing this on?")
  // rather than assuming a disagreement that may not actually exist — an
  // unclear signal should never default toward the more pointed question.
  let scenarioKey = "single";
  if (hasMultiple) {
    scenarioKey = extractedContext?.advice_agreement === "disagree" ? "disagree" : "agree";
  }
  const closingQuestion = pickBilingual(SCENARIO_QUESTIONS[scenarioKey], language);
  const whatsappLink = buildQuestionWhatsAppLink(closingQuestion, language);

  // "Ready to send to [Source]:" — single-source only names that source;
  // multi-source falls back to the generic label (see comment above).
  const readyToSendLine = hasMultiple
    ? pickBilingual(READY_TO_SEND_GENERIC, language)
    : `${pickBilingual(READY_TO_SEND_LABEL, language)} ${capitalize(adviceReceived[0]?.source_type)}:`;

  // Saves are now two-part: local state updates immediately so the box
  // switches to its "saved" display right away, and onSaveReply (from
  // App.js) fires the backend persistence + retry-queue logic in the
  // background. This is what lets a reply survive even if she closes the
  // tab before reaching the final Continue button.
  const handleReplySave = (index) => {
    const text = (replyDrafts[index] || "").trim();
    if (!text) return;
    setReplies((prev) => ({ ...prev, [index]: text }));
    if (onSaveReply) onSaveReply(index, text);
  };

  const handleReplyChange = (index, value) => {
    setReplyDrafts((prev) => ({ ...prev, [index]: value }));
  };

  const buildPageText = () => {
    return `${pickBilingual(PAGE_SUBTITLE, language)} ${closingQuestion}`;
  };

  return (
    <div className="screen4-container">

      {/* ── Header ── */}
      <div className="screen4-header">
        <h1 className="screen4-title">{pickBilingual(PAGE_TITLE, language)}</h1>
        <div className="screen4-subtitle-row">
          <p className="screen4-based-on">{pickBilingual(PAGE_SUBTITLE, language)}</p>
          <AudioPlayer text={buildPageText()} language={language} />
        </div>
      </div>

      {/* ── Where this came from: badges per source ── */}
      <div className="screen4-panel screen4-panel-sources">
        <h2 className="screen4-panel-title">
          {pickBilingual({ english: "Where this came from", kiswahili: "Habari hii ilitoka wapi" }, language)}
        </h2>

        <div className="screen4-source-list">
          {adviceReceived.map((a, index) => {
            const isExpanded = !hasMultiple || expandedSources[index];
            const sourceLabel = (
              <p className="screen4-source-name">
                {capitalize(a.source_type)}
                {a.organization ? ` · ${a.organization}` : ""}
              </p>
            );

            return (
              <div key={index} className="screen4-source-block">
                {/* Single source: static, non-clickable — nothing to
                    declutter with only one card. 2+ sources: the whole
                    row is the tap target; badges themselves stay
                    non-interactive since they're facts, not actions. */}
                {hasMultiple ? (
                  <button
                    type="button"
                    className="screen4-source-toggle"
                    onClick={() => toggleSource(index)}
                    aria-expanded={isExpanded}
                  >
                    {sourceLabel}
                    <ChevronRight
                      size={18}
                      strokeWidth={2.5}
                      className={`screen4-source-chevron ${isExpanded ? "screen4-source-chevron--open" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                ) : (
                  sourceLabel
                )}

                {isExpanded && (
                  <div className="screen4-badges-row">
                    {(a.saw_in_person === true || a.saw_in_person === false) && (
                      <Badge fieldKey="sawInPerson" value={a.saw_in_person} language={language} />
                    )}
                    {(a.named_source === true || a.named_source === false) && (
                      <Badge fieldKey="namedSource" value={a.named_source} language={language} />
                    )}
                    {(a.sells_product === true || a.sells_product === false) && (
                      <Badge fieldKey="sellsProduct" value={a.sells_product} language={language} />
                    )}
                    {/* Repeat-source badge (Idea 9) is not implemented yet —
                        it needs fuzzy-matching against the farmer's prior
                        journeys, which requires backend history access
                        this build doesn't have. Deliberately omitted
                        rather than guessed. */}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {anySells && (
          <div className="screen4-prebunk-box">
            <Shield size={16} strokeWidth={2} className="screen4-prebunk-icon" aria-hidden="true" />
            <p className="screen4-prebunk-text">{pickBilingual(PREBUNK_TEXT, language)}</p>
          </div>
        )}
      </div>

      {/* ── One thing worth asking + Send + Reply capture ── */}
      <div className="screen4-panel screen4-panel-question">
        <h2 className="screen4-panel-title">
          {hasMultiple
            ? pickBilingual({ english: "One thing worth asking either of them", kiswahili: "Jambo moja la kuuliza yeyote kati yao" }, language)
            : pickBilingual({ english: "One thing worth asking", kiswahili: "Jambo moja la kuuliza" }, language)}
        </h2>
        <p className="screen4-question-text">&ldquo;{closingQuestion}&rdquo;</p>

        {/* "Ready to send to [Source]:" framing, per the design doc's
            send-step copy — sits directly above the button so the two
            read as one action ("here's who + what, now send it"). */}
        <p className="screen4-ready-to-send-label">{readyToSendLine}</p>

        <a
          className="screen4-send-whatsapp-btn"
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          {pickBilingual({ english: "Send via WhatsApp", kiswahili: "Tuma kupitia WhatsApp" }, language)}
        </a>

        {/* Idea 12: reply capture. Text-only for now — voice capture would
            reuse whatever STT pipeline powers Screen1Input, which wasn't
            part of the files shared for this build. Now persisted
            server-side the moment each reply is saved via onSaveReply
            (see App.js), with a localStorage retry queue covering failed
            saves — local state here remains the source of truth while
            she's actively on this screen. */}
        <div className="screen4-reply-section">
          <p className="screen4-reply-prompt">
            {pickBilingual(
              { english: "Did you get a reply? Type what they said:", kiswahili: "Umepata jibu? Andika walichosema:" },
              language
            )}
          </p>
          {adviceReceived.map((a, index) => (
            <div key={index} className="screen4-reply-row">
              {hasMultiple && <p className="screen4-reply-source-label">{capitalize(a.source_type)}</p>}
              {replies[index] ? (
                <p className="screen4-reply-saved-text">{replies[index]}</p>
              ) : (
                <div className="screen4-reply-input-row">
                  <textarea
                    className="screen4-reply-textarea"
                    value={replyDrafts[index] || ""}
                    onChange={(e) => handleReplyChange(index, e.target.value)}
                    placeholder={pickBilingual(
                      { english: "Type their reply here…", kiswahili: "Andika jibu lao hapa…" },
                      language
                    )}
                  />
                  <button
                    type="button"
                    className="screen4-reply-save-btn"
                    onClick={() => handleReplySave(index)}
                  >
                    {pickBilingual({ english: "Save", kiswahili: "Hifadhi" }, language)}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Continue — centered ── */}
      <div className="screen4-cta">
        <button
          className="btn btn-primary screen4-continue-btn"
          onClick={() => onContinue(replies)}
        >
          Continue
        </button>
      </div>

    </div>
  );
}

export default Screen4Evidence;