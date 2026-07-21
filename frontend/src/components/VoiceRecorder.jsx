import { useState, useRef } from "react";
import "./VoiceRecorder.css";

function VoiceRecorder({ onTranscription }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

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
    await sendToBackend(blob);
  };

  const handleReRecord = () => {
    setAudioURL(null);
    setError(null);
  };

  const sendToBackend = async (blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");

      const response = await fetch("/api/test-stt", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Transcription request failed");

      const data = await response.json();
      if (onTranscription) onTranscription(data.transcription);
    } catch (err) {
      setError("Could not transcribe your recording. Please try again or type instead.");
      console.error(err);
    } finally {
      setIsTranscribing(false);
    }
  };

  // ── Transcribing ──
  if (isTranscribing) {
    return (
      <div className="voice-recorder">
        <div className="voice-recorder-transcribing">
          <span className="voice-recorder-spinner" />
          <span>Reading your recording…</span>
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
          <audio className="voice-recorder-playback" controls src={audioURL} />
          <div className="voice-recorder-playback-actions">
            <button className="voice-recorder-rerecord-btn" onClick={handleReRecord}>
              Record again
            </button>
            <button className="voice-recorder-send-btn" onClick={handleSend}>
              Use this recording
            </button>
          </div>
        </div>
        {error && <p className="voice-recorder-error">{error}</p>}
      </div>
    );
  }

  // ── Default: ready to record ──
  return (
    <div className="voice-recorder">
      {!isRecording ? (
        <button className="voice-recorder-btn" onClick={startRecording}>
          <span className="voice-recorder-mic-icon">🎙</span>
          Start Recording
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