import { useState, useRef } from "react";
import "./AudioPlayer.css";

const BASE_URL = "http://127.0.0.1:8002";

function AudioPlayer({ text, language = "english" }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  // Normalize language value to what the backend expects
  const getLangParam = () => {
    const l = (language || "english").toLowerCase();
    if (l === "kiswahili" || l === "swahili") return "kiswahili";
    if (l === "mixed") return "mixed";
    return "english";
  };

  // Browser speech synthesis fallback — used when backend TTS is unavailable
  const speakWithBrowser = () => {
    if (!("speechSynthesis" in window)) {
      setError("Your browser does not support text-to-speech.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;

    // Pick language for browser synthesis
    const lang = getLangParam();
    utterance.lang = lang === "kiswahili" ? "sw-KE" : "en-US";

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang.startsWith("en") && v.localService) ||
      voices.find((v) => v.name === "Google UK English Female") ||
      voices.find((v) => v.name.includes("Google") && v.lang.startsWith("en")) ||
      voices.find((v) => v.lang.startsWith("en"));

    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = (event) => {
      setIsPlaying(false);
      setError("Could not play audio right now.");
      console.error("Speech synthesis error:", event.error);
    };
    window.speechSynthesis.speak(utterance);
  };

  const handleListen = async () => {
    setError(null);

    // Stop any currently playing audio first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();

    setIsLoading(true);
    try {
      const lang = getLangParam();
      const response = await fetch(
        `${BASE_URL}/tts?text=${encodeURIComponent(text)}&language=${lang}`
      );

      if (!response.ok) throw new Error("TTS request failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => { setIsPlaying(true); setIsLoading(false); };
      audio.onended = () => { setIsPlaying(false); URL.revokeObjectURL(url); };
      audio.onerror = () => {
        setIsPlaying(false);
        setIsLoading(false);
        URL.revokeObjectURL(url);
        // Backend audio failed — fall back to browser synthesis silently
        speakWithBrowser();
      };

      await audio.play();
    } catch {
      setIsLoading(false);
      // Backend unreachable — fall back to browser synthesis
      speakWithBrowser();
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setIsLoading(false);
  };

  return (
    <div className="audio-player">
      {isLoading ? (
        <button className="audio-player-btn" disabled>
          Preparing audio…
        </button>
      ) : !isPlaying ? (
        <button className="audio-player-btn" onClick={handleListen}>
          Listen
        </button>
      ) : (
        <button
          className="audio-player-btn audio-player-btn-stop"
          onClick={handleStop}
        >
          Stop
        </button>
      )}
      {error && <p className="audio-player-error">{error}</p>}
    </div>
  );
}

export default AudioPlayer;
