import { Mic, Check } from "lucide-react";
import { useState } from "react";
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
    if (e.key === "Enter") {
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

  const hasSomethingSelected =
    selected.length > 0 || customNotes.length > 0 || otherText.trim().length > 3;

  // Left column shows:
  // 1. "Something else" input when that card is open
  // 2. "Anything else?" Yes/No when regular options selected and something else not open
  // 3. Both can coexist — if options selected AND something else typed, left shows the input
  //    and "Anything else?" is skipped (they already have custom text)
  const showSomethingElseInput = somethingElseOpen;
  const showAnythingElse =
    selected.length > 0 && !somethingElseOpen;

  return (
    <div className="screen3-container">
      {/* Title + subtitle live above the grid so they can span and center
          across both columns, instead of being stuck inside whichever
          column .screen3-header ends up in after the desktop order-swap. */}
      <div className="screen3-page-header">
        <h1 className="screen3-title">What do you see on the plant?</h1>
        <p className="screen3-subtitle">
          Check one affected plant and select everything that applies.
        </p>
      </div>

      <div className="screen3-grid">

        {/* LEFT COLUMN */}
        <div className="screen3-header">

          {hasSomethingSelected && (
            <div className="screen3-summary-card">
              <p className="screen3-summary-label">What you've noted so far</p>
              <ul className="screen3-summary-list">
                {selected.map((item) => (
                  <li key={item} className="screen3-summary-item">
                    {item}
                  </li>
                ))}
                {customNotes.map((note, index) => (
                  <li key={`note-${index}`} className="screen3-summary-item">
                    <span className="screen3-summary-item-text">{note}</span>
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
            </div>
          )}

          {/* Path A: Something else — voice/text input, no Yes/No */}
          {showSomethingElseInput && (
            <div className="screen3-other">
              <p className="screen3-other-label">What did you notice?</p>
              <div className="screen3-other-expand">
                {!showOtherText ? (
                  <div className="screen3-other-voice">
                    <VoiceRecorder onTranscription={handleOtherTranscription} />
                    <div className="screen3-other-divider"><span>or</span></div>
                    <button
                      className="btn btn-secondary screen3-type-btn"
                      onClick={() => setShowOtherText(true)}
                    >
                      Type instead
                    </button>
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
                    <input
                      type="text"
                      className="screen3-other-input"
                      placeholder="Describe what you see, then press Enter..."
                      value={otherText}
                      onChange={(e) => setOtherText(e.target.value)}
                      onKeyDown={handleOtherKeyDown}
                      onBlur={commitOtherText}
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
                      onClick={() => setHasMore(false)}
                    >
                      No
                    </button>
                  </div>
                </>
              )}

              {hasMore === true && (
                <div className="screen3-other-expand">
                  {!showOtherText ? (
                    <div className="screen3-other-voice">
                      <VoiceRecorder onTranscription={handleOtherTranscription} />
                      <div className="screen3-other-divider"><span>or</span></div>
                      <button
                        className="btn btn-secondary screen3-type-btn"
                        onClick={() => setShowOtherText(true)}
                      >
                        Type instead
                      </button>
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
                      <input
                        type="text"
                        className="screen3-other-input"
                        placeholder="e.g. wilting stems, then press Enter..."
                        value={otherText}
                        onChange={(e) => setOtherText(e.target.value)}
                        onKeyDown={handleOtherKeyDown}
                        onBlur={commitOtherText}
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
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

          <button
            className="btn btn-primary screen3-continue-btn"
            onClick={handleSubmit}
            disabled={!hasSomethingSelected}
          >
            Continue
          </button>
        </div>

      </div>
    </div>
  );
}

export default Screen3Observe;