import { useEffect, useRef, useState } from "react";
import {
  Mic,
  Pencil,
  Camera,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";

import VoiceRecorder from "../components/VoiceRecorder";
import "./Screen1Input.css";

function Screen1Input({
  onSubmit,
  onBack,
  onPhotoSubmit,
  startMode = "voice",
}) {
  const [showTextInput, setShowTextInput] = useState(startMode === "text");
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(
    startMode === "voice",
  );

  const [inputText, setInputText] = useState("");
  const [transcriptionNotice, setTranscriptionNotice] = useState("");
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [hasUsedVoice, setHasUsedVoice] = useState(false);

  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const photoInputRef = useRef(null);

  useEffect(() => {
    if (!transcriptionNotice) {
      setNoticeVisible(false);
      return undefined;
    }

    setNoticeVisible(true);

    const hideTimer = window.setTimeout(() => setNoticeVisible(false), 6000);

    const clearTimer = window.setTimeout(
      () => setTranscriptionNotice(""),
      6500,
    );

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(clearTimer);
    };
  }, [transcriptionNotice]);

  /* ─────────────────────────────────────────
     VOICE TRANSCRIPTION
  ───────────────────────────────────────── */

  const handleTranscription = (transcribedText) => {
    setInputText(transcribedText);
    setShowTextInput(true);
    setShowVoiceRecorder(false);
    setHasUsedVoice(true);

    setTranscriptionNotice(
      "Your recording has been converted into text. Review and edit it before continuing.",
    );
  };

  /* ─────────────────────────────────────────
     TEXT SUBMIT
  ───────────────────────────────────────── */

  const handleSubmit = () => {
    if (!inputText.trim()) return;

    onSubmit(inputText);
  };

  /* ─────────────────────────────────────────
     OPEN VOICE MODE
  ───────────────────────────────────────── */

  const handleChooseVoice = () => {
    setShowTextInput(false);
    setShowVoiceRecorder(true);
    setTranscriptionNotice("");
    setNoticeVisible(false);
  };

  /* ─────────────────────────────────────────
     OPEN TEXT MODE
  ───────────────────────────────────────── */

  const handleChooseText = () => {
    setShowVoiceRecorder(false);
    setShowTextInput(true);
    setTranscriptionNotice("");
    setNoticeVisible(false);
  };

  /* ─────────────────────────────────────────
     PHOTO
  ───────────────────────────────────────── */

  const handlePhotoClick = () => {
    if (photoInputRef.current) {
      photoInputRef.current.click();
    }
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setSelectedPhoto(file);

    /*
     * If the parent already provides an onPhotoSubmit handler,
     * send the selected image to it.
     *
     * This keeps the component compatible with your existing
     * onSubmit text flow.
     */
    if (onPhotoSubmit) {
      onPhotoSubmit(file);
    }
  };

  return (
    <div className="screen1-container">
      {/* ═══════════════════════════════════════
          GO BACK
      ═══════════════════════════════════════ */}

      <button type="button" className="screen1-back-button" onClick={onBack}>
        <ArrowLeft size={17} strokeWidth={2} />
        <span>Go back</span>
      </button>

      {/* ═══════════════════════════════════════
          PAGE HEADER
      ═══════════════════════════════════════ */}

      <div className="screen1-page-header">
        <h1 className="screen1-title">What are you seeing in your field?</h1>

        <p className="screen1-subtitle">
          Describe what you notice. Kagua helps you compare information and
          understand what is still uncertain.
        </p>
      </div>

      {/* ═══════════════════════════════════════
          INPUT OPTIONS
      ═══════════════════════════════════════ */}

      {!showTextInput ? (
        <div className="screen1-options">
          {/* ─────────────────────────────
              SPEAK CARD
          ───────────────────────────── */}

          <div
            className={`screen1-option-card ${
              showVoiceRecorder ? "screen1-option-card--active" : ""
            }`}
          >
            <div className="screen1-option-icon">
              <Mic size={30} strokeWidth={1.9} />
            </div>

            <h2>Speak</h2>

            <p>Tell Kagua what you're seeing in your field.</p>

            {!showVoiceRecorder ? (
              <button
                type="button"
                className="screen1-option-button"
                onClick={handleChooseVoice}
              >
                <Mic size={17} />
                Speak
              </button>
            ) : (
              <div className="screen1-recorder-wrapper">
                <VoiceRecorder onTranscription={handleTranscription} />
              </div>
            )}
          </div>

          {/* ─────────────────────────────
              TYPE CARD
          ───────────────────────────── */}

          <button
            type="button"
            className="screen1-option-card screen1-option-card--button"
            onClick={handleChooseText}
          >
            <div className="screen1-option-icon">
              <Pencil size={29} strokeWidth={1.9} />
            </div>

            <h2>Type</h2>

            <p>Describe what you're seeing in your own words.</p>

            <span className="screen1-option-button">
              <Pencil size={17} />
              Type
            </span>
          </button>

          {/* ═════════════════════════════
              PHOTO CARD
          ═════════════════════════════ */}

          <div className="screen1-photo-wrapper">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="screen1-photo-input"
              onChange={handlePhotoChange}
            />

            <button
              type="button"
              className={`screen1-photo-card ${
                selectedPhoto ? "screen1-photo-card--selected" : ""
              }`}
              onClick={handlePhotoClick}
            >
              <div className="screen1-photo-icon">
                {selectedPhoto ? (
                  <Check size={25} strokeWidth={2.3} />
                ) : (
                  <Camera size={27} strokeWidth={1.9} />
                )}
              </div>

              <div className="screen1-photo-content">
                <h2>
                  {selectedPhoto ? "Photo added" : "Add a photo of the issue"}
                </h2>

                <p>
                  {selectedPhoto
                    ? selectedPhoto.name
                    : "Take a photo or choose one from your device."}
                </p>
              </div>

              <ArrowRight
                className="screen1-photo-arrow"
                size={20}
                strokeWidth={2}
              />
            </button>
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════
           TEXT INPUT MODE
        ═══════════════════════════════════════ */

        <div className="screen1-text-mode">
          <div className="screen1-input-card">
            <div className="screen1-input-card-header">
              <div className="screen1-input-card-title">
                <Pencil size={18} />
                <span>Describe what you're seeing</span>
              </div>

              <button
                type="button"
                className="screen1-switch-option"
                onClick={handleChooseVoice}
              >
                <Mic size={15} strokeWidth={2} />
                Use voice instead
              </button>
            </div>

            {transcriptionNotice && (
              <div
                className={`screen1-transcription-notice ${
                  noticeVisible ? "is-visible" : "is-hidden"
                }`}
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
              rows={6}
              autoFocus
            />
          </div>

          <button
            className="btn btn-primary screen1-submit-btn"
            onClick={handleSubmit}
            disabled={!inputText.trim()}
          >
            Continue
            <ArrowRight size={17} />
          </button>

          {/* Back to input choices */}

          <button
            type="button"
            className="screen1-change-method"
            onClick={() => {
              setShowTextInput(false);
              setShowVoiceRecorder(false);
            }}
          >
            ← Choose another way to describe the issue
          </button>
        </div>
      )}
    </div>
  );
}

export default Screen1Input;
