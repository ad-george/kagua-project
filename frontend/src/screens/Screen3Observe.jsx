import { Mic, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import VoiceRecorder from "../components/VoiceRecorder";
import "./Screen3Observe.css";

const OBSERVATION_OPTIONS = [
  "Holes in the leaves",
  "Grey spots",
  "Brown spots",
  "Wilting",
  "White powder",
  "Stunted growth",
  "Insects visible",
];

function Screen3Observe({ onContinue }) {
  const [selected, setSelected] = useState([]);
  const [otherText, setOtherText] = useState("");
  // Committed custom notes — separate from otherText (the live draft in the
  // box) so clearing the box to type a new observation doesn't erase notes
  // already added to the summary.
  const [customNotes, setCustomNotes] = useState([]);
  const [showOtherText, setShowOtherText] = useState(false);
  const [hasMore, setHasMore] = useState(null);
  const [somethingElseOpen, setSomethingElseOpen] = useState(false);

  // The typed-note field is a <textarea> (was a single-line <input>, which
  // could only scroll horizontally and never wrap). This ref + resize
  // helper grows the box to fit the wrapped text as the person types,
  // instead of leaving it a fixed one-line height with hidden overflow.
  const otherTextareaRef = useRef(null);

  const resizeOtherTextarea = () => {
    const el = otherTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  // Runs on every otherText change — typing, clearing after commit, and
  // clearing after a voice transcription all update otherText, so this
  // single effect keeps the box's height in sync with all three instead
  // of needing a resize call duplicated at each call site.
  useEffect(() => {
    resizeOtherTextarea();
  }, [otherText]);

  const toggleOption = (option) => {
    setSelected((prev) => {
      const next = prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option];

      if (next.length === 0 && customNotes.length === 0 && !otherText.trim()) {
        setHasMore(null);
        setShowOtherText(false);
      }

      return next;
    });
  };

  // Commits the current draft into customNotes and clears the box so the
  // person can immediately start typing/recording the next observation.
  const commitOtherText = () => {
    const trimmed = otherText.trim();
    if (trimmed) {
      setCustomNotes((prev) => [...prev, trimmed]);
    }
    setOtherText("");
  };

  const removeCustomNote = (index) => {
    setCustomNotes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOtherKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commitOtherText();
    }
  };

  const handleOtherTranscription = (transcribedText) => {
    // Voice has no natural "Enter" moment, so a finished recording commits
    // straight away — the box then reopens empty for another entry.
    const trimmed = transcribedText.trim();
    if (trimmed) {
      setCustomNotes((prev) => [...prev, trimmed]);
    }
    setOtherText("");
    setShowOtherText(true);
  };

  const handleSubmit = () => {
    const finalObservations = [...selected, ...customNotes];
    if (otherText.trim()) {
      finalObservations.push(otherText.trim());
    }
    onContinue(finalObservations);
  };

  const hasSelection = selected.length > 0;
  const hasDraftNote = otherText.trim().length > 0;
  const hasCommittedNotes = customNotes.length > 0;
  // No longer gates Continue (see canContinue below) — kept as a named
  // value because it still drives the reassurance text shown when the
  // farmer hasn't added anything. A completely empty observation list is
  // a normal, fully-supported state everywhere else in the app
  // (get_comparison.py, generate_summary.py, Screen 4's empty states all
  // already handle "nothing recorded" gracefully) — this was the one
  // place still treating it as a blocking error instead of a valid answer.
  const hasMeaningfulInput = hasSelection || hasCommittedNotes;
  const hasSomethingSelected = hasSelection || hasCommittedNotes;

  // Left column shows:
  // 1. "Something else" input when that card is open
  // 2. "Anything else?" Yes/No when regular options selected and something else not open
  // 3. Both can coexist — if options selected AND something else typed, left shows the input
  //    and "Anything else?" is skipped (they already have custom text)
  const showSomethingElseInput = somethingElseOpen;
  const showAnythingElse = hasSelection && !somethingElseOpen && hasMore !== false;
  // Continue is now always reachable EXCEPT while a Yes/No decision is
  // actively pending (hasSelection is true and she hasn't answered
  // hasMore yet) — that specific friction is intentional and unchanged.
  // When nothing is selected at all, `!hasSelection` alone already makes
  // this true, so an empty Screen 3 no longer traps the farmer.
  const canContinue = !hasSelection || hasMore !== null;

  // The reassurance line ("Nothing else to add? You can continue.") is
  // meant for one specific moment: the farmer has added nothing at all
  // AND isn't currently looking at an open input box. If either input
  // path is open — "Something else" tapped, or "Yes" answered on the
  // Anything else? prompt — showing "nothing to add, you're done" right
  // next to an active textbox/mic contradicts what's on screen. So this
  // is gated on both input paths being closed, not just on there being
  // no committed input yet.
  const isInputPathOpen = somethingElseOpen || hasMore === true;
  const showEmptyReassurance = !hasMeaningfulInput && canContinue && !isInputPathOpen;

  return (
    <div className="screen3-container">
      {/* Title + subtitle live above the grid so they can span and center
          across both columns, instead of being stuck inside whichever
          column .screen3-header ends up in after the desktop order-swap. */}
      <div className="screen3-page-header">
        <h1 className="screen3-title">What do you see on the plant?</h1>
        <p className="screen3-subtitle">
          Select everything you notice.
        </p>
      </div>

      <div className="screen3-grid">

        {/* LEFT COLUMN */}
        <div className="screen3-header">

          {hasSomethingSelected && (
            <div className="screen3-summary-card">
              <p className="screen3-summary-label">What you've noted so far</p>

              {/* Short selected checklist tags — stays in the 2-column
                  grid, bullet vertically centered (fine for 1-line text). */}
              {selected.length > 0 && (
                <ul className="screen3-summary-list">
                  {selected.map((item) => (
                    <li key={item} className="screen3-summary-item">
                      {item}
                    </li>
                  ))}
                </ul>
              )}

              {/* Custom typed/voice notes — full sentences, so they get
                  full width instead of being squeezed into a half-width
                  grid column, and the bullet/× top-align to the first
                  line instead of floating in the vertical center of a
                  wrapped multi-line block. */}
              {customNotes.length > 0 && (
                <ul className="screen3-summary-notes-list">
                  {customNotes.map((note, index) => (
                    <li key={`note-${index}`} className="screen3-summary-note-item">
                      <span className="screen3-summary-note-item-text">{note}</span>
                      <button
                        type="button"
                        className="screen3-summary-item-remove"
                        onClick={() => removeCustomNote(index)}
                        aria-label={`Remove "${note}"`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Path A: Something else — voice/text input, no Yes/No */}
          {showSomethingElseInput && (
            <div className="screen3-other">
              <p className="screen3-other-label">What did you notice?</p>
              <div className="screen3-other-expand">
                {!showOtherText ? (
                  <div className="screen3-other-input-card">
                    <button
                      className="btn btn-secondary screen3-type-btn"
                      onClick={() => setShowOtherText(true)}
                    >
                      Type instead
                    </button>
                    <div className="screen3-other-voice">
                      <VoiceRecorder onTranscription={handleOtherTranscription} />
                    </div>
                  </div>
                ) : (
                  <div className="screen3-other-input-card">
                    <button
                      className="screen3-voice-switch-btn"
                      onClick={() => {
                        setShowOtherText(false);
                        setOtherText("");
                      }}
                    >
                      <Mic size={15} strokeWidth={2} />
                      Use voice instead
                    </button>
                    <textarea
                      ref={otherTextareaRef}
                      className="screen3-other-input"
                      placeholder="Describe what you see, then press Enter..."
                      value={otherText}
                      onChange={(e) => setOtherText(e.target.value)}
                      onKeyDown={handleOtherKeyDown}
                      onBlur={commitOtherText}
                      rows={1}
                      autoFocus
                    />
                  </div>
                )}

                {/* If they also selected regular options, nudge them */}
                {selected.length > 0 && (
                  <p className="screen3-also-selected-hint">
                    You've also selected {selected.length} option{selected.length > 1 ? "s" : ""} from the list.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Path B: Regular options selected, ask if anything extra */}
          {showAnythingElse && (
            <div className="screen3-other">
              {hasMore === null && (
                <>
                  <p className="screen3-other-label">
                    Anything else you've noticed?
                  </p>

                  <div className="screen3-yesno">
                    <button
                      className="btn btn-secondary screen3-yesno-btn"
                      onClick={() => setHasMore(true)}
                    >
                      Yes
                    </button>
                    <button
                      className="btn btn-secondary screen3-yesno-btn"
                      onClick={() => {
                        setHasMore(false);
                        setShowOtherText(false);
                        setOtherText("");
                      }}
                    >
                      No
                    </button>
                  </div>
                </>
              )}

              {hasMore === true && (
                <div className="screen3-other-expand">
                  {!showOtherText ? (
                    <div className="screen3-other-input-card">
                      <button
                        className="btn btn-secondary screen3-type-btn"
                        onClick={() => setShowOtherText(true)}
                      >
                        Type instead
                      </button>
                      <div className="screen3-other-voice">
                        <VoiceRecorder onTranscription={handleOtherTranscription} />
                      </div>
                    </div>
                  ) : (
                    <div className="screen3-other-input-card">
                      <button
                        className="screen3-voice-switch-btn"
                        onClick={() => {
                          setShowOtherText(false);
                          setOtherText("");
                        }}
                      >
                        <Mic size={15} strokeWidth={2} />
                        Use voice instead
                      </button>
                      <textarea
                        ref={otherTextareaRef}
                        className="screen3-other-input"
                        placeholder="e.g. wilting stems, then press Enter..."
                        value={otherText}
                        onChange={(e) => setOtherText(e.target.value)}
                        onKeyDown={handleOtherKeyDown}
                        onBlur={commitOtherText}
                        rows={1}
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reassurance text — only shown when nothing has been added yet
              AND no input box is currently open, so a farmer who genuinely
              has nothing else to report doesn't wonder whether the button
              is broken or whether she's expected to select something
              regardless. It deliberately disappears the moment "Something
              else" or the "Yes" branch opens an input, since "nothing to
              add" and "type your observation here" next to each other reads
              as contradictory. Not a selectable option, just a one-line
              confirmation that proceeding with nothing is fine. */}
          {showEmptyReassurance && (
            <p className="screen3-empty-reassurance">
              Nothing else to add? You can continue.
            </p>
          )}

          {/* Continue button in left column */}
          {canContinue && (
            <button
              className="btn btn-primary screen3-continue-btn"
              onClick={handleSubmit}
            >
              Continue
            </button>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="screen3-main">
          <div className="screen3-options">
            {OBSERVATION_OPTIONS.map((option) => (
              <label
                key={option}
                className={`screen3-option ${
                  selected.includes(option) ? "screen3-option--selected" : ""
                }`}
              >
                <span className="screen3-checkbox">
                  {selected.includes(option) && (
                    <span className="screen3-checkbox-tick">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="screen3-checkbox-input"
                />
                {option}
              </label>
            ))}

            {/* Something else card */}
            <label
              className={`screen3-option ${
                somethingElseOpen ? "screen3-option--selected" : ""
              }`}
              onClick={(e) => {
                e.preventDefault();
                if (!somethingElseOpen) {
                  setSomethingElseOpen(true);
                  setHasMore(null);
                  setShowOtherText(false);
                  setOtherText("");
                } else {
                  setSomethingElseOpen(false);
                  setOtherText("");
                  setShowOtherText(false);
                }
              }}
            >
              <span className="screen3-checkbox">
                {somethingElseOpen && (
                  <span className="screen3-checkbox-tick">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </span>
              Something else
            </label>
          </div>
        </div>

      </div>
    </div>
  );
}
export default Screen3Observe;