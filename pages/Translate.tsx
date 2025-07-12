"use client";
import { useState, useEffect, useCallback } from "react";
import { languageOptions } from "@/lib/data";
import { baseLanguageOptions } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Languages,
  RotateCcw,
  Copy,
  AlertTriangle,
  CheckCircle,
  ArrowRightLeft,
  FileText,
  Globe,
} from "lucide-react";

export default function Translate() {
  const [text, setText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto"); // Default to auto-detect
  const [targetLang, setTargetLang] = useState("en");
  const [translatedText, setTranslatedText] = useState("");
  const [detectedLang, setDetectedLang] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState("");

  const translateText = useCallback(
    async (inputText: string, target: string, source: string) => {
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

        const res = await fetch("/api/translate", {
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
        let message = "Network error";
        if (error instanceof Error) {
          message = `Network error: ${error.message}`;
        }
        setError(message);
        setTranslatedText("");
        setDetectedLang("");
        setConfidence(0);
      } finally {
        setIsTranslating(false);
      }
    },
    []
  );

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
  const getLanguageName = (code: string) => {
    const lang = languageOptions.find((l) => l.code === code);
    return lang ? lang.name : code;
  };

  // Character and word count utilities
  const getCharacterCount = (text: string): number => text.length;
  const getWordCount = (text: string): number => {
    return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-card border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center justify-center">
              <Globe className="w-8 h-8 mr-3" />
              Auto-Detect Translation
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Input Section */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-foreground/90 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Enter text in any language:
              </label>
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <span>📝 {getCharacterCount(text)} characters</span>
                <span>📄 {getWordCount(text)} words</span>
              </div>
            </div>
            <textarea
              className="w-full bg-muted border border-border rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-foreground placeholder-muted-foreground"
              rows={4}
              placeholder="Type or paste text here - language will be automatically detected!"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {/* Character limit warning */}
            {getCharacterCount(text) > 5000 && (
              <div className="mt-3 flex items-center text-sm text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Large text may take longer to translate and could exceed API
                limits
              </div>
            )}
          </CardContent>
        </Card>

        {/* Language Selection with Swap */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {/* Source Language */}
              <div className="flex-1 space-y-2">
                <label className="block text-foreground/90 text-sm font-medium flex items-center">
                  <Languages className="w-4 h-4 mr-2" />
                  Translate From:
                </label>
                <select
                  className="w-full bg-muted border border-border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-foreground"
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                >
                  {baseLanguageOptions.map((lang) => (
                    <option
                      key={lang.code}
                      value={lang.code}
                      className="bg-background text-foreground"
                    >
                      {lang.name} ({lang.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <div className="flex flex-col items-center justify-end pb-3">
                <Button
                  onClick={swapLanguages}
                  disabled={
                    !translatedText || (sourceLang === "auto" && !detectedLang)
                  }
                  variant="outline"
                  size="icon"
                  className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Swap languages"
                >
                  <ArrowRightLeft className="w-5 h-5" />
                </Button>
              </div>

              {/* Target Language */}
              <div className="flex-1 space-y-2">
                <label className="block text-foreground/90 text-sm font-medium flex items-center">
                  <Globe className="w-4 h-4 mr-2" />
                  Translate to:
                </label>
                <select
                  className="w-full bg-muted border border-border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-foreground"
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                >
                  {languageOptions.map((lang) => (
                    <option
                      key={lang.code}
                      value={lang.code}
                      className="bg-background text-foreground"
                    >
                      {lang.name} ({lang.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isTranslating && (
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400 mr-3"></div>
                <span className="text-blue-400">
                  {sourceLang === "auto"
                    ? "Detecting language and translating..."
                    : "Translating..."}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
                <span className="text-red-400">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detected Language with Enhanced Confidence Score */}
        {detectedLang &&
          !error &&
          (sourceLang === "auto" || sourceLang === "") && (
            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-blue-400 font-medium">
                      Detected Language: {getLanguageName(detectedLang)}
                    </span>
                  </div>
                  {confidence > 0 && (
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-medium text-blue-400">
                          {Math.round(confidence * 100)}% confidence
                        </span>
                        <div className="w-24 h-2 bg-blue-500/20 rounded-full mt-1">
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
                          <Badge
                            variant="secondary"
                            className="bg-green-500/20 text-green-400 border-green-500/30"
                          >
                            🟢 High
                          </Badge>
                        )}
                        {confidence >= 0.6 && confidence < 0.8 && (
                          <Badge
                            variant="secondary"
                            className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          >
                            🟡 Medium
                          </Badge>
                        )}
                        {confidence < 0.6 && (
                          <Badge
                            variant="secondary"
                            className="bg-red-500/20 text-red-400 border-red-500/30"
                          >
                            🔴 Low
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Translation Result */}
        {translatedText && !error && (
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                  <strong className="text-green-400">Translation:</strong>
                </div>
                <Button
                  onClick={() => copyToClipboard(translatedText)}
                  variant="outline"
                  size="sm"
                  className="border-green-500/30 cursor-pointer text-green-400 hover:bg-green-500/20"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
              <p className="text-foreground text-lg leading-relaxed bg-muted p-4 rounded-lg border border-border">
                {translatedText}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <h3 className="font-medium text-foreground/90 mb-4 flex items-center">
              <Languages className="w-4 h-4 mr-2" />
              How to use:
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                Type or paste text in any language
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                Select source language (choose `Auto-detect` for automatic
                detection)
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                Select your target language from the dropdown
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                Use the swap button to quickly reverse translation direction
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                Translation happens automatically as you type
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                Confidence score shows detection accuracy (🟢 High, 🟡 Medium,
                🔴 Low)
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Clear All Button */}
        <div className="text-center">
          <Button
            onClick={clearAll}
            variant="outline"
            className="border-border text-foreground hover:bg-accent"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>
    </div>
  );
}
