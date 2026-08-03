import { useEffect, useState } from "react";
import { Mic } from "lucide-react";
import VoiceRecorder from "../components/VoiceRecorder";
import "./Screen1Input.css";

// Example phrasings shown under the voice recorder, to give first-time
// users a sense of what "describing what you see" can sound like.
const EXAMPLE_PROMPTS = [
  "My maize leaves are turning yellow",
  "My neighbour says wait, the agrovet says spray",
  "My beans are wilting after heavy rain",
];

function Screen1Input({ onSubmit, startMode = "voice" }) {
  // Text mode is only entered explicitly (via "Prefer to type instead" or
  // being routed in with startMode="text"), or automatically once a voice
  // transcription comes back, so the person can review/edit it as text.
  const [showTextInput, setShowTextInput] = useState(startMode === "text");
  const [inputText, setInputText] = useState("");
  const [transcriptionNotice, setTranscriptionNotice] = useState("");
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [hasUsedVoice, setHasUsedVoice] = useState(false);

  useEffect(() => {
    if (!transcriptionNotice) {
      setNoticeVisible(false);
      return undefined;
    }

    setNoticeVisible(true);
    const hideTimer = window.setTimeout(() => setNoticeVisible(false), 6000);
    const clearTimer = window.setTimeout(() => setTranscriptionNotice(""), 6500);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(clearTimer);
    };
  }, [transcriptionNotice]);

  const handleTranscription = (transcribedText) => {
    setInputText(transcribedText);
    setShowTextInput(true);
    setHasUsedVoice(true);
    setTranscriptionNotice(
      "Your recording has been converted into text. Review and edit it before continuing."
    );
  };

  const handleSubmit = () => {
    if (!inputText.trim()) return;
    onSubmit(inputText);
  };

  const handleSwitchToVoice = () => {
    setShowTextInput(false);
    setInputText("");
    setTranscriptionNotice("");
    setNoticeVisible(false);
    setHasUsedVoice(false);
  };

  return (
    <div className="screen1-container">
      {/* ── Page header: title + explanation, always visible ── */}
      <div className="screen1-page-header">
        <h1 className="screen1-title">What are you seeing in your field?</h1>
        {/* Third-person, descriptive copy rather than first-person "I'm here to
            help you" — Kagua is positioned as a tool, not an assistant/chatbot. */}
        <p className="screen1-subtitle">
          Kagua helps you compare advice and understand what is still uncertain.
        </p>
      </div>

      {/* screen1-content--text drives centering in CSS when the examples
          box isn't rendered (text mode) — see Screen1Input.css */}
      <div
        className={`screen1-content ${
          showTextInput ? "screen1-content--text" : ""
        }`}
      >
        {!showTextInput && (
          <div className="screen1-examples">
            <p className="screen1-examples-label">Others have asked about</p>
            {EXAMPLE_PROMPTS.map((example, index) => (
              <p key={index} className="screen1-example-item">"{example}"</p>
            ))}
          </div>
        )}

        {/* ── The actual interaction ── */}
        <div className="screen1-main">
          {!showTextInput ? (
            /* ── Voice mode: recording is the primary action on this screen ── */
            <div className="screen1-voice-mode">
              <VoiceRecorder onTranscription={handleTranscription} />
              <div className="screen1-voice-alt">
                <span className="screen1-voice-alt-or">or</span>
                <button
                  className="screen1-type-instead-link"
                  onClick={() => setShowTextInput(true)}
                >
                  type instead
                </button>
              </div>
            </div>
          ) : (
            /* ── Text mode: same input card pattern used across the app's
                 forms (border, focus ring), with a toggle back to voice ── */
            <div className="screen1-text-mode">
              <div className="screen1-input-card">
                <button
                  className="screen1-voice-switch-btn"
                  onClick={handleSwitchToVoice}
                >
                  <Mic size={15} strokeWidth={2} />
                  {hasUsedVoice ? "Record again" : "Use voice instead"}
                </button>

                {transcriptionNotice && (
                  <div
                    className={`screen1-transcription-notice ${noticeVisible ? "is-visible" : "is-hidden"}`}
                    role="status"
                    aria-live="polite"
                  >
                    <span className="screen1-transcription-notice-icon">✓</span>
                    <span>{transcriptionNotice}</span>
                  </div>
                )}

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
                className="btn btn-primary screen1-submit-btn"
                onClick={handleSubmit}
                disabled={!inputText.trim()}
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Screen1Input;