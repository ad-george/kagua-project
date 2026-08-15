import { Mic } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import "./VoiceRecorder.css";

function VoiceRecorder({ onTranscription, onExpandedChange }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState(null);
  const [transcriptionFailed, setTranscriptionFailed] = useState(false);
  const [failureReason, setFailureReason] = useState(null);
  const lastBlobRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  // Any state beyond the idle "start recording" circle needs real width
  // (status strip, or the playback card with its label/helper/audio
  // player/two buttons). Let the parent know so it can widen this
  // card's layout instead of leaving it cramped in a half column.
  useEffect(() => {
    const needsMoreRoom =
      isRecording || Boolean(audioURL) || isTranscribing || transcriptionFailed;
    if (onExpandedChange) onExpandedChange(needsMoreRoom);
  }, [isRecording, audioURL, isTranscribing, transcriptionFailed, onExpandedChange]);

  const startRecording = async () => {
    setError(null);
    setAudioURL(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        // Stop mic tracks so browser mic indicator goes away
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setError("Microphone access was denied. Please allow it in your browser settings.");
      } else {
        setError("Could not access your microphone. Please try again.");
      }
      console.error(err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSend = async () => {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    lastBlobRef.current = blob;
    await sendToBackend(blob);
  };

  const handleReRecord = () => {
    setAudioURL(null);
    setError(null);
    setTranscriptionFailed(false);
    setFailureReason(null);
  };

  const handleRetryTranscription = async () => {
    if (lastBlobRef.current) {
      setTranscriptionFailed(false);
      setFailureReason(null);
      await sendToBackend(lastBlobRef.current);
    }
  };

  const sendToBackend = async (blob, attempt = 1) => {
    setIsTranscribing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");

      const response = await fetch("/api/test-stt", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Transcription request failed");

      const data = await response.json();
      const transcription = data.transcription || "";

      // Backend signals STT failure with a sentinel prefix rather than
      // an HTTP error, so we can show a specific message per failure type
      if (transcription.startsWith("__STT_ERROR__")) {
        const reason = transcription.replace("__STT_ERROR__", "");
        setTranscriptionFailed(true);
        setFailureReason(reason); // "quota" | "unclear" | "failed"
        return;
      }

      if (onTranscription) onTranscription(transcription);
    } catch (err) {
      console.error(err);
      if (attempt < 2) {
        // Auto-retry once silently before showing the error
        setIsTranscribing(false);
        await sendToBackend(blob, attempt + 1);
      } else {
        setError(null); // clear so the retry UI renders instead
        setTranscriptionFailed(true);
      }
    } finally {
      if (attempt >= 2) setIsTranscribing(false);
    }
  };

  // ── Transcription failed — show retry options ──
  if (transcriptionFailed) {
    const isQuota = failureReason === "quota";
    const isUnclear = failureReason === "unclear";
    return (
      <div className="voice-recorder">
        <div className="voice-recorder-playback-card">
          <p className="voice-recorder-playback-label">
            {isQuota ? "Voice service unavailable" : "Could not understand recording"}
          </p>
          <p className="voice-recorder-playback-helper">
            {isQuota
              ? "Voice recording is not available right now. Please type what you see in your field instead."
              : isUnclear
              ? "The recording was too short or unclear. Try again or type instead."
              : "We couldn't convert your recording. Try again or type instead."}
          </p>
          <div className="voice-recorder-playback-actions">
            {!isQuota && (
              <button className="btn btn-secondary voice-recorder-rerecord-btn" onClick={handleReRecord}>
                Record again
              </button>
            )}
            {!isQuota && (
              <button className="btn btn-primary voice-recorder-send-btn" onClick={handleRetryTranscription}>
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Transcribing ──
  if (isTranscribing) {
    return (
      <div className="voice-recorder">
        <div className="voice-recorder-transcribing">
          <span className="voice-recorder-spinner" />
          <span>Transcribing your recording…</span>
        </div>
      </div>
    );
  }

  // ── Playback + confirm ──
  if (audioURL) {
    return (
      <div className="voice-recorder">
        <div className="voice-recorder-playback-card">
          <p className="voice-recorder-playback-label">Listen to check your recording</p>
          <p className="voice-recorder-playback-helper">
            This will turn your audio into text so you can review it before continuing.
          </p>
          <audio className="voice-recorder-playback" controls src={audioURL} />
          <div className="voice-recorder-playback-actions">
            <button className="btn btn-secondary voice-recorder-rerecord-btn" onClick={handleReRecord}>
              Record again
            </button>
            <button className="btn btn-primary voice-recorder-send-btn" onClick={handleSend}>
              Use this recording
            </button>
          </div>
        </div>
        {error && <p className="voice-recorder-error">{error}</p>}
      </div>
    );
  }

  // ── Default: ready to record ──
  // Idle state uses its own circular icon + label treatment (below) rather
  // than the flat rectangular .btn.btn-primary shape used for form submits
  // elsewhere — this is the screen's one focal action, so it's built to
  // look and feel distinct, closer to a real voice-recorder button.
  return (
    <div className="voice-recorder">
      {!isRecording ? (
        <button className="voice-recorder-btn" onClick={startRecording}>
          <span className="voice-recorder-btn-icon">
            <Mic size={28} strokeWidth={2} />
          </span>
          <span className="voice-recorder-btn-label">Start recording</span>
        </button>
      ) : (
        <div className="voice-recorder-active">
          <div className="voice-recorder-indicator">
            <span className="voice-recorder-pulse" />
            <span className="voice-recorder-recording-label">Recording…</span>
          </div>
          <button className="voice-recorder-stop-btn" onClick={stopRecording}>
            Stop
          </button>
        </div>
      )}
      {error && <p className="voice-recorder-error">{error}</p>}
    </div>
  );
}

export default VoiceRecorder;