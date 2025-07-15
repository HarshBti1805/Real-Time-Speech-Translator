import { useState } from "react";
import { Volume2, VolumeX, Loader2 } from "lucide-react";

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

  const handleListen = async () => {
    if (!text || isPlaying) return;
    setIsPlaying(true);
    setTtsError("");
    try {
      const voiceConfig = getTTSVoiceConfig(languageCode);
      const res = await fetch("https://flask-tts-server.onrender.com/tts", {
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
      const audio = new Audio(url);
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setIsPlaying(false);
        setTtsError("Failed to play audio");
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch (error: unknown) {
      setIsPlaying(false);
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
    }
  };

  if (!ttsSupported) return null;

  return (
    <div
      className={`relative inline-block ${className || ""}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={handleListen}
        disabled={isPlaying || disabled}
        aria-label="Listen to text"
        className={`rounded-full cursor-pointer p-1.5 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500  shadow-md hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 focus:outline-none focus:ring-3 focus:ring-blue-400 transition-all duration-200 flex items-center justify-center text-white ${
          isPlaying ? "animate-pulse" : ""
        } ${disabled ? "opacity-60 cursor-not-allowed" : "hover:scale-110"}`}
        tabIndex={0}
        type="button"
      >
        {isPlaying ? (
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </button>
      {/* Tooltip */}
      {showTooltip && !isPlaying && (
        <span className="absolute left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded bg-background text-xs text-muted-foreground opacity-90 border border-border shadow-lg z-10 whitespace-nowrap">
          Listen
        </span>
      )}
      {/* Error message */}
      {ttsError && (
        <div className="flex items-center mt-2 text-orange-400 text-xs">
          <VolumeX className="w-4 h-4 mr-1" />
          <span>{ttsError}</span>
        </div>
      )}
    </div>
  );
}
