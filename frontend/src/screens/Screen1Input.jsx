import { useState } from "react";
import { Mic, Keyboard } from "lucide-react";
import VoiceRecorder from "../components/VoiceRecorder";
import "./Screen1Input.css";

const EXAMPLE_PROMPTS = [
  "My maize leaves are turning yellow",
  "My neighbour says wait, the agrovet says spray",
  "My beans are wilting after heavy rain",
];

function Screen1Input({ onSubmit, startMode = "voice" }) {
  const [showTextInput, setShowTextInput] = useState(startMode === "text");
  const [inputText, setInputText] = useState("");

  const handleTranscription = (transcribedText) => {
    setInputText(transcribedText);
    setShowTextInput(true);
  };

  const handleSubmit = () => {
    if (!inputText.trim()) return;
    onSubmit(inputText);
  };

  const handleSwitchToVoice = () => {
    setShowTextInput(false);
    setInputText("");
  };

  return (
    <div className="screen1-container">
      {/* <p className="screen1-brand">Kagua</p> */}
      <h1 className="screen1-title">What are you seeing in your field?</h1>
      <p className="screen1-subtitle">
        I'm here to help you compare advice and understand what is still uncertain.
      </p>

      {!showTextInput ? (
        /* ── Voice mode ── */
        <div className="screen1-voice-mode">
          <VoiceRecorder onTranscription={handleTranscription} />

          <div className="screen1-divider">
            <span>or</span>
          </div>

          <button
            className="screen1-type-instead-btn"
            onClick={() => setShowTextInput(true)}
          >
            <Keyboard size={16} strokeWidth={2} />
            Prefer to type instead
          </button>

          <div className="screen1-examples">
            <p className="screen1-examples-label">Others have asked about</p>
            {EXAMPLE_PROMPTS.map((example, index) => (
              <p key={index} className="screen1-example-item">"{example}"</p>
            ))}
          </div>
        </div>
      ) : (
        /* ── Text mode ── */
        <div className="screen1-text-mode">
          <div className="screen1-input-card">
            <button
              className="screen1-voice-switch-btn"
              onClick={handleSwitchToVoice}
            >
              <Mic size={15} strokeWidth={2} />
              Use voice instead
            </button>

            <div className="screen1-input-divider" />

            <textarea
              className="screen1-textarea"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe what you're seeing. If you've received advice from neighbours, agrovets, or others, include that too."
              rows={5}
              autoFocus
            />
          </div>

          <button
            className="screen1-submit-btn"
            onClick={handleSubmit}
            disabled={!inputText.trim()}
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

export default Screen1Input;