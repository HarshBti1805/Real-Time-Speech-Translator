// pages/index.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { languageOptions, baseLanguageOptions } from "@/lib/data";

// Type definitions
interface TranslationResult {
  transcription: string;
  translation?: string;
  detectedLanguage: string;
  targetLanguage: string;
  wasTranslated: boolean;
  confidence?: number;
  error?: string;
}

interface Language {
  code: string;
  name: string;
}

// Custom error types for better type safety

interface TimeoutError extends Error {
  name: "TimeoutError";
}

export default function MainPage() {
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [baseLanguage, setBaseLanguage] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [targetLanguage, setTargetLanguage] = useState<string>("en");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isRealTimeMode, setIsRealTimeMode] = useState<boolean>(false);
  const [realtimeTranslation, setRealtimeTranslation] =
    useState<TranslationResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const realtimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunkCounterRef = useRef<number>(0);

  // Audio level monitoring
  useEffect(() => {
    let animationFrame: number | undefined;

    if (isRecording && analyzerRef.current) {
      const updateAudioLevel = () => {
        const analyzer = analyzerRef.current;
        if (!analyzer) return;
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteFrequencyData(dataArray);

        const average =
          dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setAudioLevel(average);

        if (isRecording) {
          animationFrame = requestAnimationFrame(updateAudioLevel);
        }
      };

      updateAudioLevel();
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isRecording]);

  // Timer for recording duration
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setRecordingTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  // Real-time processing
  const processRealtimeAudio = async (): Promise<void> => {
    if (
      !isRealTimeMode ||
      !mediaRecorderRef.current ||
      audioChunksRef.current.length === 0
    ) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create blob from only the last few chunks to keep audio short
      const recentChunks = audioChunksRef.current.slice(-3); // Only last 3 chunks (~6 seconds max)
      const audioBlob = new Blob(recentChunks, {
        type: "audio/webm;codecs=opus",
      });

      // Check blob size - limit to ~500KB to avoid "sync input too long" error
      const maxSizeKB = 500;
      const maxSizeBytes = maxSizeKB * 1024;

      if (audioBlob.size === 0) {
        console.warn("No audio data available for real-time processing");
        setIsProcessing(false);
        return;
      }

      if (audioBlob.size > maxSizeBytes) {
        console.warn(
          `Audio chunk too large (${Math.round(
            audioBlob.size / 1024
          )}KB), skipping...`
        );
        setIsProcessing(false);
        return;
      }

      const formData = new FormData();
      formData.append(
        "audio",
        audioBlob,
        `realtime_${chunkCounterRef.current}.webm`
      );
      formData.append("targetLanguage", targetLanguage);
      formData.append("baseLanguage", baseLanguage || "auto");
      formData.append("isRealtime", "true");
      formData.append("maxRetries", "2"); // Limit retries to avoid resource exhaustion

      console.log(
        "Processing real-time chunk:",
        chunkCounterRef.current,
        "Size:",
        Math.round(audioBlob.size / 1024) + "KB"
      );

      const res = await fetch("/api/voice", {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(15000), // 15 second timeout
      });

      if (res.ok) {
        const data: TranslationResult = await res.json();

        if (data.transcription && data.transcription.trim()) {
          // Update the single real-time translation instead of adding to array
          setRealtimeTranslation(data);
        } else if (data.error) {
          console.warn("API returned error:", data.error);
          // Don't show error to user for real-time mode, just log it
        }
      } else {
        console.error("Real-time API error:", res.status);
        // Don't show error to user unless it's critical
      }
    } catch (error: unknown) {
      function isTimeoutError(e: unknown): e is TimeoutError {
        return (
          typeof e === "object" &&
          e !== null &&
          "name" in e &&
          typeof (e as { name: unknown }).name === "string" &&
          (e as { name: string }).name === "TimeoutError"
        );
      }
      if (isTimeoutError(error)) {
        console.error("Real-time processing timeout");
      } else {
        console.error("Real-time processing error:", error);
      }
    } finally {
      setIsProcessing(false);
      chunkCounterRef.current++;

      // Clear old chunks to prevent memory buildup
      if (audioChunksRef.current.length > 10) {
        audioChunksRef.current = audioChunksRef.current.slice(-5);
      }
    }
  };

  const startRecording = async (): Promise<void> => {
    try {
      console.log("Starting recording...");

      // Reset previous results
      setResult(null);
      setRealtimeTranslation(null);
      chunkCounterRef.current = 0;

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });

      console.log("Microphone access granted");
      streamRef.current = stream;
      audioChunksRef.current = [];

      // Set up audio level monitoring
      audioContextRef.current = new (window.AudioContext ||
        (window as AudioContext & { webkitAudioContext?: AudioContext })
          .webkitAudioContext)();
      analyzerRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyzerRef.current);
      analyzerRef.current.fftSize = 256;

      // Check if MediaRecorder supports the preferred format
      let options: MediaRecorderOptions = {
        mimeType: "audio/webm;codecs=opus",
      };
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        console.log("WebM Opus not supported, trying alternatives...");
        options = { mimeType: "audio/webm" };
        if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
          console.log("WebM not supported, using default format");
          options = {};
        }
      }

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      console.log("MediaRecorder created with options:", options);

      mediaRecorderRef.current.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log("Recording stopped");

        if (!isRealTimeMode) {
          // Process final audio for non-realtime mode
          console.log("Processing final audio...");
          setIsProcessing(true);

          const audioBlob = new Blob(audioChunksRef.current, {
            type: options.mimeType || "audio/webm",
          });

          if (audioBlob.size === 0) {
            console.error("Audio blob is empty");
            setResult({
              error: "No audio data captured. Please try again.",
              transcription: "",
              detectedLanguage: "",
              targetLanguage: targetLanguage,
              wasTranslated: false,
            });
            setIsProcessing(false);
            return;
          }

          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");
          formData.append("targetLanguage", targetLanguage);
          formData.append("baseLanguage", baseLanguage || "auto");

          try {
            const res = await fetch("/api/voice", {
              method: "POST",
              body: formData,
            });

            const data: TranslationResult = await res.json();
            if (res.ok) {
              setResult(data);
            } else {
              setResult({
                error: data.error || "Unknown error occurred",
                transcription: "",
                detectedLanguage: "",
                targetLanguage: targetLanguage,
                wasTranslated: false,
              });
            }
          } catch (error: unknown) {
            console.error("Network Error:", error);
            setResult({
              error: "Network error occurred. Please check your connection.",
              transcription: "",
              detectedLanguage: "",
              targetLanguage: targetLanguage,
              wasTranslated: false,
            });
          } finally {
            setIsProcessing(false);
          }
        }
      };

      mediaRecorderRef.current.onerror = (event: Event) => {
        // MediaRecorderErrorEvent is not available in all TS libs, so cast to unknown and use type guard
        const err = (event as unknown as { error?: Error }).error;
        console.error("MediaRecorder error:", err);
        setResult({
          error: "Recording error occurred",
          transcription: "",
          detectedLanguage: "",
          targetLanguage: targetLanguage,
          wasTranslated: false,
        });
        setIsRecording(false);
        setIsProcessing(false);
      };

      // Start recording with optimized time slices
      const recordingInterval = isRealTimeMode ? 1500 : 1000; // 1.5s for real-time to keep chunks small
      mediaRecorderRef.current.start(recordingInterval);
      setIsRecording(true);

      // Set up real-time processing interval (every 3 seconds to avoid overwhelming the API)
      if (isRealTimeMode) {
        realtimeIntervalRef.current = setInterval(processRealtimeAudio, 3000);
      }

      console.log(
        "Recording started",
        isRealTimeMode ? "(Real-time mode)" : "(Standard mode)"
      );
    } catch (error: unknown) {
      console.error("Recording Error:", error);
      let errorMessage = "Could not access microphone.";

      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          errorMessage =
            "Microphone access denied. Please allow microphone access and try again.";
        } else if (error.name === "NotFoundError") {
          errorMessage =
            "No microphone found. Please check your audio devices.";
        } else if (error.name === "NotReadableError") {
          errorMessage = "Microphone is being used by another application.";
        }
      }

      alert(errorMessage);
      setResult({
        error: errorMessage,
        transcription: "",
        detectedLanguage: "",
        targetLanguage: targetLanguage,
        wasTranslated: false,
      });
    }
  };

  const stopRecording = (): void => {
    console.log("Stopping recording...");

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    // Clear real-time interval
    if (realtimeIntervalRef.current) {
      clearInterval(realtimeIntervalRef.current);
      realtimeIntervalRef.current = null;
    }

    // Stop all tracks to release the microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log("Track stopped:", track.kind);
      });
      streamRef.current = null;
    }

    // Clean up audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyzerRef.current = null;
    setAudioLevel(0);
  };

  const clearResults = (): void => {
    setResult(null);
    setRealtimeTranslation(null);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getLanguageName = (code: string): string => {
    const lang = languageOptions.find(
      (l: Language) => l.code === code || l.code === code?.split("-")[0]
    );
    return lang ? lang.name : code;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          🎙️ Real-Time Translation
        </h1>

        {/* Mode Selection */}
        <div className="mb-6 flex justify-center">
          <div className="bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setIsRealTimeMode(false)}
              disabled={isRecording}
              className={`px-4 py-2 rounded-md transition-colors ${
                !isRealTimeMode
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Standard Mode
            </button>
            <button
              onClick={() => setIsRealTimeMode(true)}
              disabled={isRecording}
              className={`px-4 py-2 rounded-md transition-colors ${
                isRealTimeMode
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Real-Time Mode
            </button>
          </div>
        </div>

        {/* Language Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Translate From:
            </label>
            <select
              value={baseLanguage}
              onChange={(e) => setBaseLanguage(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isRecording || isProcessing}
            >
              {baseLanguageOptions.map((lang: Language) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Translate to:
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isRecording || isProcessing}
            >
              {languageOptions.map((lang: Language) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Recording Controls */}
        <div className="text-center mb-8">
          <div className="space-y-4">
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={isProcessing}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
              >
                {isProcessing ? "Processing..." : "🎤 Start Recording"}
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                🛑 Stop Recording
              </button>
            )}

            {(result || realtimeTranslation) && (
              <button
                onClick={clearResults}
                disabled={isRecording}
                className="ml-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white rounded-lg transition-colors"
              >
                Clear Results
              </button>
            )}
          </div>

          {/* Recording Status */}
          {isRecording && (
            <div className="flex flex-col items-center space-y-2 mt-4">
              <div className="text-lg font-mono text-green-400">
                {isRealTimeMode ? "🔴 LIVE" : "Recording"}:{" "}
                {formatTime(recordingTime)}
              </div>

              {/* Audio Level Indicator */}
              <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-100"
                  style={{ width: `${Math.min(audioLevel, 100)}%` }}
                ></div>
              </div>

              <div className="text-sm text-gray-400">
                {audioLevel > 10 ? "🎙️ Audio detected" : "🔇 Speak louder"}
              </div>

              {isRealTimeMode && (
                <div className="text-sm text-yellow-400">
                  {isProcessing
                    ? "🔄 Processing..."
                    : "✓ Real-time translation active (updates every 2s)"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Processing Status */}
        {isProcessing && !isRecording && (
          <div className="text-center mb-6">
            <div className="inline-flex items-center px-4 py-2 bg-yellow-600 rounded-lg">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing audio...
            </div>
          </div>
        )}

        {/* Real-time Translation Display */}
        {isRealTimeMode &&
          realtimeTranslation &&
          !realtimeTranslation.error && (
            <div className="mb-6 bg-gray-800 rounded-lg p-6 space-y-4 border-2 border-green-500">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-green-400">
                  🔴 Live Translation
                </h2>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-400">
                    Updating every 2s
                  </span>
                </div>
              </div>

              <div className="border-b border-gray-700 pb-4">
                <h3 className="text-lg font-semibold mb-2 text-gray-300">
                  Original (
                  {getLanguageName(realtimeTranslation.detectedLanguage)})
                </h3>
                <p className="text-white text-lg bg-gray-700 p-3 rounded transition-all duration-300">
                  {realtimeTranslation.transcription}
                </p>
              </div>

              {realtimeTranslation.wasTranslated && (
                <div className="border-b border-gray-700 pb-4">
                  <h3 className="text-lg font-semibold mb-2 text-gray-300">
                    Translation (
                    {getLanguageName(realtimeTranslation.targetLanguage)})
                  </h3>
                  <p className="text-white text-lg bg-blue-900/30 p-3 rounded transition-all duration-300">
                    {realtimeTranslation.translation}
                  </p>
                </div>
              )}

              {!realtimeTranslation.wasTranslated && (
                <div className="text-center text-gray-400 py-4">
                  <p>✓ Already in target language - no translation needed</p>
                </div>
              )}

              <div className="flex justify-between text-sm text-gray-400 pt-4">
                <span>
                  Detected:{" "}
                  {getLanguageName(realtimeTranslation.detectedLanguage)}
                </span>
                <span>
                  Target: {getLanguageName(realtimeTranslation.targetLanguage)}
                </span>
                {realtimeTranslation.confidence && (
                  <span>
                    Confidence:{" "}
                    {Math.round(realtimeTranslation.confidence * 100)}%
                  </span>
                )}
              </div>
            </div>
          )}

        {/* Standard Mode Results */}
        {result && !isRealTimeMode && (
          <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            {result.error ? (
              <div className="text-red-400 text-center p-4 bg-red-900/20 rounded-lg">
                <p className="text-lg font-semibold">❌ Error</p>
                <p className="mt-2">{result.error}</p>
              </div>
            ) : (
              <>
                <div className="border-b border-gray-700 pb-4">
                  <h3 className="text-lg font-semibold mb-2 text-gray-300">
                    Original ({getLanguageName(result.detectedLanguage)})
                  </h3>
                  <p className="text-white text-lg bg-gray-700 p-3 rounded">
                    {result.transcription}
                  </p>
                </div>

                {result.wasTranslated && (
                  <div className="border-b border-gray-700 pb-4">
                    <h3 className="text-lg font-semibold mb-2 text-gray-300">
                      Translation ({getLanguageName(result.targetLanguage)})
                    </h3>
                    <p className="text-white text-lg bg-blue-900/30 p-3 rounded">
                      {result.translation}
                    </p>
                  </div>
                )}

                {!result.wasTranslated && (
                  <div className="text-center text-gray-400 py-4">
                    <p>✓ Already in target language - no translation needed</p>
                  </div>
                )}

                <div className="flex justify-between text-sm text-gray-400 pt-4">
                  <span>
                    Detected: {getLanguageName(result.detectedLanguage)}
                  </span>
                  <span>Target: {getLanguageName(result.targetLanguage)}</span>
                  {result.confidence && (
                    <span>
                      Confidence: {Math.round(result.confidence * 100)}%
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 text-center text-gray-400 text-sm space-y-2">
          <p>
            <strong>Standard Mode:</strong> Record, then get translation after
            stopping
          </p>
          <p>
            <strong>Real-Time Mode:</strong> Live translation updates every 2
            seconds
          </p>
          <p className="text-xs">
            💡 Real-time mode works best with clear, continuous speech
          </p>
        </div>
      </div>
    </div>
  );
}
