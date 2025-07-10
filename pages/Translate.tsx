"use client";
import { useState, useEffect, useCallback } from "react";
import { languageOptions } from "@/lib/data";
import { baseLanguageOptions } from "@/lib/data";

export default function Translate() {
  const [text, setText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto"); // Default to auto-detect
  const [targetLang, setTargetLang] = useState("en");
  const [translatedText, setTranslatedText] = useState("");
  const [detectedLang, setDetectedLang] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState("");

  // Auto-detect and translate function
  const translateText = useCallback(async (inputText, target, source) => {
    if (!inputText.trim()) {
      setTranslatedText("");
      setDetectedLang("");
      setError("");
      return;
    }

    setIsTranslating(true);
    setError("");

    try {
      // Determine if we should auto-detect based on source language selection
      const shouldAutoDetect = source === "auto" || source === "";

      const res = await fetch("http://localhost:3000/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          targetLang: target,
          sourceLang: shouldAutoDetect ? null : source, // Send null for auto-detect
          autoDetect: shouldAutoDetect,
        }),
      });

      const data = await res.json();

      console.log(data);

      if (res.ok) {
        setTranslatedText(data.translatedText);
        setDetectedLang(data.detectedLang || "");
        setConfidence(data.confidence || 0);
        setError("");
      } else {
        setError(data.error || "Translation failed");
        setTranslatedText("");
        setDetectedLang("");
        setConfidence(0);
      }
    } catch (error) {
      setError(`Network error: ${error.message}`);
      setTranslatedText("");
      setDetectedLang("");
      setConfidence(0);
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Debounce effect for real-time translation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (text.trim() && targetLang) {
        translateText(text, targetLang, sourceLang);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [text, targetLang, sourceLang, translateText]);

  // Swap source and target languages
  const swapLanguages = () => {
    // Only swap if we have a detected language or explicit source language
    if (sourceLang === "auto" && detectedLang) {
      // If auto-detecting, use the detected language as new target
      setTargetLang(detectedLang);
      setSourceLang(targetLang);
    } else if (sourceLang !== "auto") {
      // Normal swap when source is explicitly set
      const newTarget = sourceLang;
      const newSource = targetLang;
      setSourceLang(newSource);
      setTargetLang(newTarget);
    }

    // Swap the text content
    setText(translatedText);
    setTranslatedText(text);

    // Clear detection info since we're changing languages
    setDetectedLang("");
    setConfidence(0);
    setError("");
  };

  // Clear all fields
  const clearAll = () => {
    setText("");
    setTranslatedText("");
    setDetectedLang("");
    setConfidence(0);
    setError("");
  };

  // Get language name from code
  const getLanguageName = (code) => {
    const lang = languageOptions.find((l) => l.code === code);
    return lang ? lang.name : code;
  };

  // Character and word count utilities
  const getCharacterCount = (text) => text.length;
  const getWordCount = (text) => {
    return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto bg-white p-6 shadow-lg rounded-lg">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-black">
            🌐 Auto-Detect Translation
          </h1>
          <button
            onClick={clearAll}
            className="px-4 text-black py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
          >
            Clear All
          </button>
        </div>

        {/* Input Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-black">
              Enter text in any language:
            </label>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>📝 {getCharacterCount(text)} characters</span>
              <span>📄 {getWordCount(text)} words</span>
            </div>
          </div>
          <textarea
            className="w-full border text-black border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
            placeholder="Type or paste text here - language will be automatically detected!"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {/* Character limit warning */}
          {getCharacterCount(text) > 5000 && (
            <div className="mt-2 text-sm text-orange-600 flex items-center">
              <span className="mr-1">⚠️</span>
              Large text may take longer to translate and could exceed API
              limits
            </div>
          )}
        </div>

        {/* Language Selection with Swap */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            {/* Source Language */}
            <div className="flex-1">
              <label className="block text-black text-sm font-medium mb-2">
                Translate From:
              </label>
              <select
                className="w-full border text-black border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
              >
                {baseLanguageOptions.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <div className="flex flex-col items-center justify-end pb-3">
              <button
                onClick={swapLanguages}
                disabled={
                  !translatedText || (sourceLang === "auto" && !detectedLang)
                }
                className="p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full transition-colors shadow-md hover:shadow-lg"
                title="Swap languages"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
              </button>
            </div>

            {/* Target Language */}
            <div className="flex-1">
              <label className="block text-black text-sm font-medium mb-2">
                Translate to:
              </label>
              <select
                className="w-full border text-black border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
              >
                {languageOptions.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isTranslating && (
          <div className="mb-4 p-3 text-black bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-blue-700">
                {sourceLang === "auto"
                  ? "Detecting language and translating..."
                  : "Translating..."}
              </span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 text-black bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <span className="text-red-600 mr-2">⚠️</span>
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Detected Language with Enhanced Confidence Score */}
        {detectedLang &&
          !error &&
          (sourceLang === "auto" || sourceLang === "") && (
            <div className="mb-4 p-4 text-black bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-blue-800">
                    <strong>Detected Language:</strong>{" "}
                    {getLanguageName(detectedLang)}
                  </span>
                </div>
                {confidence > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-medium text-blue-700">
                        {Math.round(confidence * 100)}% confidence
                      </span>
                      <div className="w-24 h-2 bg-blue-200 rounded-full mt-1">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            confidence >= 0.8
                              ? "bg-green-500"
                              : confidence >= 0.6
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${confidence * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-xs">
                      {confidence >= 0.8 && (
                        <span className="text-green-600">🟢 High</span>
                      )}
                      {confidence >= 0.6 && confidence < 0.8 && (
                        <span className="text-yellow-600">🟡 Medium</span>
                      )}
                      {confidence < 0.6 && (
                        <span className="text-red-600">🔴 Low</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Translation Result */}
        {translatedText && !error && (
          <div className="p-4 text-black bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-start justify-between mb-2">
              <strong className="text-green-800">Translation:</strong>
              <button
                onClick={() => navigator.clipboard.writeText(translatedText)}
                className="text-xs bg-green-100 hover:bg-green-200 px-2 py-1 rounded transition-colors"
                title="Copy to clipboard"
              >
                📋 Copy
              </button>
            </div>
            <p className="text-gray-800 text-lg leading-relaxed">
              {translatedText}
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-3 text-black bg-gray-50 rounded-md">
          <h3 className="font-medium text-gray-700 mb-2">How to use:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Type or paste text in any language</li>
            <li>
              • Select source language (choose "Auto-detect" for automatic
              detection)
            </li>
            <li>• Select your target language from the dropdown</li>
            <li>
              • Use the swap button (🔄) to quickly reverse translation
              direction
            </li>
            <li>• Translation happens automatically as you type</li>
            <li>
              • Confidence score shows detection accuracy (🟢 High, 🟡 Medium,
              🔴 Low)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
