// pages/index.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { languageOptions, baseLanguageOptions } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  Square,
  RotateCcw,
  Volume2,
  Languages,
  Clock,
  Zap,
} from "lucide-react";

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

interface WindowWithWebkitAudioContext extends Window {
  webkitAudioContext?: typeof AudioContext;
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
        (window as WindowWithWebkitAudioContext).webkitAudioContext!)();
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

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        if (!isRealTimeMode) {
          // Process the complete recording for standard mode
          await processCompleteRecording();
        }
      };

      // Start recording
      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);

      // Start real-time processing if enabled
      if (isRealTimeMode) {
        realtimeIntervalRef.current = setInterval(processRealtimeAudio, 2000);
      }
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Failed to start recording. Please check microphone permissions.");
    }
  };

  const processCompleteRecording = async (): Promise<void> => {
    if (audioChunksRef.current.length === 0) {
      console.warn("No audio data to process");
      return;
    }

    setIsProcessing(true);

    try {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm;codecs=opus",
      });

      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("targetLanguage", targetLanguage);
      formData.append("baseLanguage", baseLanguage || "auto");
      formData.append("isRealtime", "false");

      const res = await fetch("/api/voice", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data: TranslationResult = await res.json();
        setResult(data);
      } else {
        const errorData = await res.json();
        setResult({
          transcription: "",
          detectedLanguage: "",
          targetLanguage,
          wasTranslated: false,
          error: errorData.error || "Failed to process audio",
        });
      }
    } catch (error) {
      console.error("Error processing recording:", error);
      setResult({
        transcription: "",
        detectedLanguage: "",
        targetLanguage,
        wasTranslated: false,
        error: "Network error occurred while processing audio",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const stopRecording = (): void => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop real-time processing
      if (realtimeIntervalRef.current) {
        clearInterval(realtimeIntervalRef.current);
        realtimeIntervalRef.current = null;
      }

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    }
  };

  const clearResults = (): void => {
    setResult(null);
    setRealtimeTranslation(null);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const getLanguageName = (code: string): string => {
    const lang = languageOptions.find(
      (l: Language) => l.code === code || l.code === code?.split("-")[0]
    );
    return lang ? lang.name : code;
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              🎙️ Real-Time Translation
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Mode Selection */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex justify-center">
              <div className="bg-white/10 rounded-lg p-1 flex">
                <Button
                  onClick={() => setIsRealTimeMode(false)}
                  disabled={isRecording}
                  variant={!isRealTimeMode ? "default" : "ghost"}
                  className={`transition-all duration-200 ${
                    !isRealTimeMode
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Standard Mode
                </Button>
                <Button
                  onClick={() => setIsRealTimeMode(true)}
                  disabled={isRecording}
                  variant={isRealTimeMode ? "default" : "ghost"}
                  className={`transition-all duration-200 ${
                    isRealTimeMode
                      ? "bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Real-Time Mode
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language Selection */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/90">
                  <Languages className="w-4 h-4 inline mr-2" />
                  Translate From:
                </label>
                <select
                  value={baseLanguage}
                  onChange={(e) => setBaseLanguage(e.target.value)}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-white/50"
                  disabled={isRecording || isProcessing}
                >
                  {baseLanguageOptions.map((lang: Language) => (
                    <option
                      key={lang.code}
                      value={lang.code}
                      className="bg-black text-white"
                    >
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/90">
                  <Volume2 className="w-4 h-4 inline mr-2" />
                  Translate to:
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-white/50"
                  disabled={isRecording || isProcessing}
                >
                  {languageOptions.map((lang: Language) => (
                    <option
                      key={lang.code}
                      value={lang.code}
                      className="bg-black text-white"
                    >
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recording Controls */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  disabled={isProcessing}
                  size="lg"
                  className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 mr-2" />
                      Start Recording
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  size="lg"
                  className="px-8 py-4 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Square className="w-5 h-5 mr-2" />
                  Stop Recording
                </Button>
              )}

              {(result || realtimeTranslation) && (
                <Button
                  onClick={clearResults}
                  disabled={isRecording}
                  variant="outline"
                  className="ml-4 border-white/20 text-white hover:bg-white/10"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear Results
                </Button>
              )}

              {/* Recording Status */}
              {isRecording && (
                <div className="flex flex-col items-center space-y-4 mt-6">
                  <div className="flex items-center space-x-2 text-lg font-mono text-green-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>
                      {isRealTimeMode ? "🔴 LIVE" : "Recording"}:{" "}
                      {formatTime(recordingTime)}
                    </span>
                  </div>

                  {/* Audio Level Indicator */}
                  <div className="w-64 h-3 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-100 rounded-full"
                      style={{ width: `${Math.min(audioLevel, 100)}%` }}
                    ></div>
                  </div>

                  <div className="text-sm text-white/60">
                    {audioLevel > 10 ? "🎙️ Audio detected" : "🔇 Speak louder"}
                  </div>

                  {isRealTimeMode && (
                    <Badge
                      variant="secondary"
                      className="bg-green-500/20 text-green-400 border-green-500/30"
                    >
                      {isProcessing
                        ? "🔄 Processing..."
                        : "✓ Real-time translation active (updates every 2s)"}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Processing Status */}
        {isProcessing && !isRecording && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="inline-flex items-center px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-400 mr-3"></div>
                  <span className="text-yellow-400">Processing audio...</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Real-time Translation Display */}
        {isRealTimeMode &&
          realtimeTranslation &&
          !realtimeTranslation.error && (
            <Card className="bg-white/5 border-green-500/50 shadow-lg shadow-green-500/25">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-green-400 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                    Live Translation
                  </h2>
                  <Badge
                    variant="secondary"
                    className="bg-green-500/20 text-green-400 border-green-500/30"
                  >
                    Updating every 2s
                  </Badge>
                </div>

                <div className="border-b border-white/10 pb-4">
                  <h3 className="text-lg font-semibold mb-2 text-white/80">
                    Original (
                    {getLanguageName(realtimeTranslation.detectedLanguage)})
                  </h3>
                  <p className="text-white text-lg bg-white/5 p-4 rounded-lg border border-white/10 transition-all duration-300">
                    {realtimeTranslation.transcription}
                  </p>
                </div>

                {realtimeTranslation.wasTranslated && (
                  <div className="border-b border-white/10 pb-4">
                    <h3 className="text-lg font-semibold mb-2 text-white/80">
                      Translation (
                      {getLanguageName(realtimeTranslation.targetLanguage)})
                    </h3>
                    <p className="text-white text-lg bg-blue-500/10 p-4 rounded-lg border border-blue-500/20 transition-all duration-300">
                      {realtimeTranslation.translation}
                    </p>
                  </div>
                )}

                {!realtimeTranslation.wasTranslated && (
                  <div className="text-center text-white/60 py-4">
                    <p>✓ Already in target language - no translation needed</p>
                  </div>
                )}

                <div className="flex justify-between text-sm text-white/60 pt-4">
                  <span>
                    Detected:{" "}
                    {getLanguageName(realtimeTranslation.detectedLanguage)}
                  </span>
                  <span>
                    Target:{" "}
                    {getLanguageName(realtimeTranslation.targetLanguage)}
                  </span>
                  {realtimeTranslation.confidence && (
                    <span>
                      Confidence:{" "}
                      {Math.round(realtimeTranslation.confidence * 100)}%
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Standard Mode Results */}
        {result && !isRealTimeMode && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 space-y-4">
              {result.error ? (
                <div className="text-red-400 text-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                  <p className="text-lg font-semibold">❌ Error</p>
                  <p className="mt-2">{result.error}</p>
                </div>
              ) : (
                <>
                  <div className="border-b border-white/10 pb-4">
                    <h3 className="text-lg font-semibold mb-2 text-white/80">
                      Original ({getLanguageName(result.detectedLanguage)})
                    </h3>
                    <p className="text-white text-lg bg-white/5 p-4 rounded-lg border border-white/10">
                      {result.transcription}
                    </p>
                  </div>

                  {result.wasTranslated && (
                    <div className="border-b border-white/10 pb-4">
                      <h3 className="text-lg font-semibold mb-2 text-white/80">
                        Translation ({getLanguageName(result.targetLanguage)})
                      </h3>
                      <p className="text-white text-lg bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
                        {result.translation}
                      </p>
                    </div>
                  )}

                  {!result.wasTranslated && (
                    <div className="text-center text-white/60 py-4">
                      <p>
                        ✓ Already in target language - no translation needed
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between text-sm text-white/60 pt-4">
                    <span>
                      Detected: {getLanguageName(result.detectedLanguage)}
                    </span>
                    <span>
                      Target: {getLanguageName(result.targetLanguage)}
                    </span>
                    {result.confidence && (
                      <span>
                        Confidence: {Math.round(result.confidence * 100)}%
                      </span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="text-center text-white/60 text-sm space-y-2">
              <p>
                <strong>Standard Mode:</strong> Record, then get translation
                after stopping
              </p>
              <p>
                <strong>Real-Time Mode:</strong> Live translation updates every
                2 seconds
              </p>
              <p className="text-xs text-white/40">
                💡 Real-time mode works best with clear, continuous speech
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
