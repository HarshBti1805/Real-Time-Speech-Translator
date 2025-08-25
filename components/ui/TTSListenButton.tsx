import React, { useState, useRef } from "react";
import { Volume2, VolumeX, Loader2, Pause, Play } from "lucide-react";

interface TTSListenButtonProps {
  text: string;
  languageCode: string;
  disabled?: boolean;
  className?: string;
}

// Map language codes to TTS-compatible voice names
const getTTSVoiceConfig = (langCode: string) => {
  const voiceMap: {
    [key: string]: { languageCode: string; voiceName: string };
  } = {
    en: { languageCode: "en-US", voiceName: "en-US-Wavenet-D" },
    hi: { languageCode: "hi-IN", voiceName: "hi-IN-Wavenet-A" },
    es: { languageCode: "es-ES", voiceName: "es-ES-Wavenet-B" },
    fr: { languageCode: "fr-FR", voiceName: "fr-FR-Wavenet-B" },
    de: { languageCode: "de-DE", voiceName: "de-DE-Wavenet-B" },
    it: { languageCode: "it-IT", voiceName: "it-IT-Wavenet-B" },
    pt: { languageCode: "pt-PT", voiceName: "pt-PT-Wavenet-B" },
    ru: { languageCode: "ru-RU", voiceName: "ru-RU-Wavenet-B" },
    ja: { languageCode: "ja-JP", voiceName: "ja-JP-Wavenet-B" },
    ko: { languageCode: "ko-KR", voiceName: "ko-KR-Wavenet-B" },
    "zh-CN": { languageCode: "cmn-CN", voiceName: "cmn-CN-Wavenet-B" },
    "zh-TW": { languageCode: "cmn-TW", voiceName: "cmn-TW-Wavenet-A" },
    ar: { languageCode: "ar-XA", voiceName: "ar-XA-Wavenet-B" },
    bn: { languageCode: "bn-IN", voiceName: "bn-IN-Standard-A" },
    pa: { languageCode: "pa-IN", voiceName: "pa-IN-Standard-A" },
    gu: { languageCode: "gu-IN", voiceName: "gu-IN-Standard-A" },
    ta: { languageCode: "ta-IN", voiceName: "ta-IN-Wavenet-A" },
    te: { languageCode: "te-IN", voiceName: "te-IN-Standard-A" },
    ml: { languageCode: "ml-IN", voiceName: "ml-IN-Standard-A" },
    mr: { languageCode: "mr-IN", voiceName: "mr-IN-Standard-A" },
    ur: { languageCode: "ur-IN", voiceName: "ur-IN-Standard-A" },
    tr: { languageCode: "tr-TR", voiceName: "tr-TR-Wavenet-B" },
    vi: { languageCode: "vi-VN", voiceName: "vi-VN-Wavenet-B" },
    id: { languageCode: "id-ID", voiceName: "id-ID-Wavenet-B" },
    th: { languageCode: "th-TH", voiceName: "th-TH-Wavenet-B" },
    pl: { languageCode: "pl-PL", voiceName: "pl-PL-Wavenet-B" },
    uk: { languageCode: "uk-UA", voiceName: "uk-UA-Wavenet-B" },
    ro: { languageCode: "ro-RO", voiceName: "ro-RO-Wavenet-B" },
    nl: { languageCode: "nl-NL", voiceName: "nl-NL-Wavenet-B" },
    sv: { languageCode: "sv-SE", voiceName: "sv-SE-Wavenet-B" },
    fi: { languageCode: "fi-FI", voiceName: "fi-FI-Wavenet-B" },
    no: { languageCode: "nb-NO", voiceName: "nb-NO-Wavenet-B" },
    da: { languageCode: "da-DK", voiceName: "da-DK-Wavenet-B" },
    cs: { languageCode: "cs-CZ", voiceName: "cs-CZ-Wavenet-B" },
    el: { languageCode: "el-GR", voiceName: "el-GR-Wavenet-B" },
    he: { languageCode: "he-IL", voiceName: "he-IL-Wavenet-B" },
    hu: { languageCode: "hu-HU", voiceName: "hu-HU-Wavenet-B" },
    uz: { languageCode: "uz-UZ", voiceName: "uz-UZ-Standard-A" },
  };
  return (
    voiceMap[langCode] || {
      languageCode: "en-US",
      voiceName: "en-US-Wavenet-D",
    }
  );
};

export function TTSListenButton({
  text,
  languageCode,
  disabled,
  className,
}: TTSListenButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsError, setTtsError] = useState("");
  const [ttsSupported, setTtsSupported] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showVolume, setShowVolume] = useState(false);

  const fetchAudio = async () => {
    setIsLoading(true);
    setTtsError("");
    try {
      const voiceConfig = getTTSVoiceConfig(languageCode);
      const res = await fetch("http://52.66.135.144:8000/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          languageCode: voiceConfig.languageCode,
          voiceName: voiceConfig.voiceName,
        }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`TTS API Error: ${errorText}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setIsLoading(false);
      return url;
    } catch (error: unknown) {
      setIsLoading(false);
      if (error instanceof Error) {
        if (
          error.message.includes("UNIMPLEMENTED") ||
          error.message.includes("503")
        ) {
          setTtsError(
            "TTS service is currently unavailable. Please try again later."
          );
          setTtsSupported(false);
        } else if (
          error.message.includes("403") ||
          error.message.includes("PERMISSION_DENIED")
        ) {
          setTtsError(
            "TTS permission denied. Please check your API configuration."
          );
          setTtsSupported(false);
        } else {
          setTtsError(`TTS Error: ${error.message}`);
        }
      } else {
        setTtsError("Unknown TTS error occurred");
      }
      return null;
    }
  };

  const handlePlay = async () => {
    if (!text || isPlaying || isLoading) return;
    setTtsError("");
    let url = audioUrl;
    if (!url) {
      url = await fetchAudio();
      if (!url) return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    const audio = new Audio(url);
    audio.volume = volume;
    audio.onended = () => {
      setIsPlaying(false);
    };
    audio.onerror = () => {
      setIsPlaying(false);
      setTtsError("Failed to play audio");
    };
    audioRef.current = audio;
    setIsPlaying(true);
    await audio.play();
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleToggle = async () => {
    if (isPlaying) {
      handlePause();
    } else {
      await handlePlay();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Cleanup audio on unmount or when text/language changes
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
    };
    // eslint-disable-next-line
  }, [text, languageCode]);

  if (!ttsSupported) return null;

  return (
    <div
      className={`relative inline-flex items-center gap-2 ${className || ""}`}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Play/Pause Button */}
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="relative"
      >
        <button
          onClick={handleToggle}
          disabled={disabled || isLoading}
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
          className={`rounded-full cursor-pointer p-1.5 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-md hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 focus:outline-none focus:ring-3 focus:ring-blue-400 transition-all duration-200 flex items-center justify-center text-white ${
            isPlaying ? "animate-pulse" : ""
          } ${disabled ? "opacity-60 cursor-not-allowed" : "hover:scale-110"}`}
          tabIndex={0}
          type="button"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white" />
          )}
        </button>
        {/* Tooltip */}
        {showTooltip && !isPlaying && !isLoading && (
          <span className="absolute left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded bg-background text-xs text-muted-foreground opacity-90 border border-border shadow-lg z-10 whitespace-nowrap">
            {isPlaying ? "Pause" : "Listen"}
          </span>
        )}
      </div>
      {/* Volume Icon and Popover */}
      <div className="relative">
        <button
          type="button"
          aria-label="Adjust volume"
          className={`rounded-full cursor-pointer p-1.5 bg-muted hover:bg-accent border border-border transition-colors duration-200 flex items-center justify-center ${
            showVolume ? "ring-2 ring-blue-400" : ""
          }`}
          onClick={() => setShowVolume((v) => !v)}
          tabIndex={0}
        >
          <Volume2 className="w-5 h-5 text-muted-foreground" />
        </button>
        {/* Volume Slider Popover */}
        {showVolume && (
          <div
            className="absolute left-1/2 -translate-x-1/2 mt-2 px-3 py-2 rounded-lg bg-background border border-border shadow-xl z-20 flex flex-col items-center min-w-[120px]"
            onMouseLeave={() => setShowVolume(false)}
          >
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={handleVolumeChange}
              className="w-24 accent-blue-500"
              aria-label="Volume control"
            />
            <span className="mt-1 text-xs text-muted-foreground">
              {Math.round(volume * 100)}%
            </span>
          </div>
        )}
      </div>
      {/* Error message */}
      {ttsError && (
        <div className="flex items-center ml-2 text-orange-400 text-xs">
          <VolumeX className="w-4 h-4 mr-1" />
          <span>{ttsError}</span>
        </div>
      )}
    </div>
  );
}
