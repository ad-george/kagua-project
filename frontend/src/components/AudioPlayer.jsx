import { useState } from "react";
import "./AudioPlayer.css";

function AudioPlayer({ text }) {
  const [audioURL, setAudioURL] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleListen = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/test-tts?text=${encodeURIComponent(text)}`
      );
      if (!response.ok) throw new Error("TTS request failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioURL(url);
    } catch (err) {
      setError("Could not play audio right now.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="audio-player">
      {!audioURL && (
        <button
          className="audio-player-btn"
          onClick={handleListen}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Listen"}
        </button>
      )}
      {audioURL && <audio controls autoPlay src={audioURL} />}
      {error && <p className="audio-player-error">{error}</p>}
    </div>
  );
}

export default AudioPlayer;