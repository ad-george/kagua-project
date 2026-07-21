import { useState } from "react";
import VoiceRecorder from "../components/VoiceRecorder";
import "./Screen3Observe.css";

const OBSERVATION_OPTIONS = [
  "Yellow leaves",
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
  const [showOtherText, setShowOtherText] = useState(false);

  const toggleOption = (option) => {
    setSelected((prev) => {
      if (prev.includes(option)) {
        return prev.filter((item) => item !== option);
      }
      return [...prev, option];
    });
  };

  const handleOtherTranscription = (transcribedText) => {
    setOtherText(transcribedText);
    setShowOtherText(true);
  };

  const handleSubmit = () => {
    const finalObservations = [...selected];
    if (otherText.trim()) {
      finalObservations.push(otherText.trim());
    }
    onContinue(finalObservations);
  };

  const hasSomethingSelected = selected.length > 0 || otherText.trim().length > 0;

  return (
    <div className="screen3-container">
      {/* <p className="screen3-brand">Kagua</p> */}
      <h1 className="screen3-title">What do you see on the plant?</h1>
      <p className="screen3-subtitle">
        Check one affected plant and select everything that applies.
      </p>

      <div className="screen3-options">
        {OBSERVATION_OPTIONS.map((option) => (
          <label
            key={option}
            className={`screen3-option ${selected.includes(option) ? "screen3-option--selected" : ""}`}
          >
            <span className="screen3-checkbox">
              {selected.includes(option) && (
                <span className="screen3-checkbox-tick">✓</span>
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
      </div>

      <div className="screen3-other">
        <p className="screen3-other-label">Anything else you've noticed?</p>

        {!showOtherText ? (
          <div className="screen3-other-voice">
            <VoiceRecorder onTranscription={handleOtherTranscription} />
            <div className="screen3-other-divider">
              <span>or</span>
            </div>
            <button
              className="screen3-type-btn"
              onClick={() => setShowOtherText(true)}
            >
              Type a description instead
            </button>
          </div>
        ) : (
          <div className="screen3-other-input-card">
            <button
              className="screen3-voice-switch-btn"
              onClick={() => { setShowOtherText(false); setOtherText(""); }}
            >
              <span>🎙</span> Use voice instead
            </button>
            <div className="screen3-other-input-divider" />
            <input
              type="text"
              className="screen3-other-input"
              placeholder="e.g. wilting stems, yellow rings around leaves…"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              autoFocus
            />
          </div>
        )}
      </div>

      <button
        className="screen3-continue-btn"
        onClick={handleSubmit}
        disabled={!hasSomethingSelected}
      >
        Continue
      </button>
    </div>
  );
}

export default Screen3Observe;