"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { languages } from "@/lib/languages";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TTSListenButton } from "@/components/ui/TTSListenButton";

interface TranslationResult {
  transcription: string;
  translation: string;
  detectedLanguage: string;
  targetLanguage: string;
  wasTranslated: boolean;
  confidence: number;
  isRealtime: boolean;
}

interface StreamEvent {
  type: string;
  data?: TranslationResult;
  message?: string;
  timestamp?: string;
}

export default function RealTimePage() {
  const { data: session, status } = useSession();
  const [isRecording, setIsRecording] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [currentTranscription, setCurrentTranscription] = useState("");
  const [currentTranslation, setCurrentTranslation] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [streamHistory, setStreamHistory] = useState<TranslationResult[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      redirect("/login");
    }
  }, [session, status]);

  // Initialize real-time stream connection
  useEffect(() => {
    if (!session) return;

    const initializeStream = () => {
      const eventSource = new EventSource("/api/realtime/stream");
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnectionStatus("connected");
        setErrorMessage("");
      };

      eventSource.onmessage = (event) => {
        try {
          const data: StreamEvent = JSON.parse(event.data);

          if (data.type === "connected") {
            console.log("Real-time stream connected:", data.message);
          } else if (data.type === "translation_update") {
            const result = data.data as TranslationResult;
            setCurrentTranscription(result.transcription);
            setCurrentTranslation(result.translation);

            // Add to history if not realtime (final result)
            if (!result.isRealtime) {
              setStreamHistory((prev) => [result, ...prev.slice(0, 9)]); // Keep last 10
            }
          }
        } catch (error) {
          console.error("Error parsing stream data:", error);
        }
      };

      eventSource.onerror = () => {
        setConnectionStatus("error");
        setErrorMessage("Connection lost. Reconnecting...");
        setTimeout(initializeStream, 3000);
      };
    };

    initializeStream();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [session]);

  // Audio level monitoring
  const initializeAudioMonitoring = (stream: MediaStream) => {
    audioContextRef.current = new AudioContext();
    analyserRef.current = audioContextRef.current.createAnalyser();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    source.connect(analyserRef.current);

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const updateAudioLevel = () => {
      if (analyserRef.current && isRecording) {
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average);
        requestAnimationFrame(updateAudioLevel);
      }
    };

    updateAudioLevel();
  };

  // Start recording
  const startRecording = async () => {
    try {
      setErrorMessage("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Initialize audio monitoring
      initializeAudioMonitoring(stream);

      // Configure MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        // Process final recording
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm;codecs=opus",
          });
          await processAudioChunk(audioBlob, false);
        }
        cleanup();
      };

      // Start recording with 1-second chunks for real-time processing
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Start real-time processing every 2 seconds
      processingIntervalRef.current = setInterval(async () => {
        if (audioChunksRef.current.length > 0) {
          // Process recent chunks for real-time feedback
          const recentChunks = audioChunksRef.current.slice(-2);
          const audioBlob = new Blob(recentChunks, {
            type: "audio/webm;codecs=opus",
          });
          await processAudioChunk(audioBlob, true);
        }
      }, 2000);
    } catch (error) {
      console.error("Error starting recording:", error);
      setErrorMessage("Failed to access microphone. Please check permissions.");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    cleanup();
  };

  // Cleanup function
  const cleanup = () => {
    setIsRecording(false);
    setAudioLevel(0);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  // Process audio chunk
  const processAudioChunk = async (audioBlob: Blob, isRealtime: boolean) => {
    if (!audioBlob.size) return;

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append(
        "audio",
        audioBlob,
        isRealtime ? "realtime.webm" : "final.webm"
      );
      formData.append("sourceLanguage", sourceLanguage);
      formData.append("targetLanguage", targetLanguage);
      formData.append("isRealtime", isRealtime.toString());

      const response = await fetch("/api/realtime", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result: TranslationResult = await response.json();

        setCurrentTranscription(result.transcription);
        setCurrentTranslation(result.translation);

        // Add to history if this is a final result
        if (!isRealtime) {
          setStreamHistory((prev) => [result, ...prev.slice(0, 9)]);
        }
      } else {
        const error = await response.json();
        if (!isRealtime) {
          // Only show errors for final processing
          setErrorMessage(error.error || "Processing failed");
        }
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      if (!isRealtime) {
        setErrorMessage("Network error occurred");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get language name by code
  const getLanguageName = (code: string) => {
    if (code === "auto") return "Auto-detect";
    const lang = languages.find((l) => l.code === code);
    return lang ? lang.name : code.toUpperCase();
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Real-Time Audio Translator
          </h1>
          <p className="text-lg text-gray-600">
            Powered by Gemini AI for instant voice translation
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div
              className={`w-3 h-3 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-green-500"
                  : connectionStatus === "error"
                  ? "bg-red-500"
                  : "bg-yellow-500"
              }`}
            ></div>
            <span className="text-sm text-gray-600">
              {connectionStatus === "connected"
                ? "Connected"
                : connectionStatus === "error"
                ? "Connection Error"
                : "Connecting..."}
            </span>
          </div>
        </div>

        {/* Language Selection */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Language Settings</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Source Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From (Source Language)
              </label>
              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isRecording}
              >
                <option value="auto">Auto-detect</option>
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To (Target Language)
              </label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isRecording}
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Recording Controls */}
        <Card className="p-6 mb-6">
          <div className="text-center">
            <div className="mb-4">
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                size="lg"
                className={`w-32 h-32 rounded-full text-2xl font-bold ${
                  isRecording
                    ? "bg-red-500 hover:bg-red-600 animate-pulse"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
                disabled={isProcessing}
              >
                {isRecording ? "⏹️" : "🎙️"}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-4 mb-4">
              <Badge variant={isRecording ? "destructive" : "secondary"}>
                {isRecording ? "Recording" : "Ready"}
              </Badge>
              {isRecording && (
                <span className="text-lg font-mono">
                  {formatTime(recordingTime)}
                </span>
              )}
              {isProcessing && <Badge variant="outline">Processing...</Badge>}
            </div>

            {/* Audio Level Indicator */}
            {isRecording && (
              <div className="w-full max-w-md mx-auto mb-4">
                <div className="text-sm text-gray-600 mb-2">Audio Level</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="text-red-600 text-sm mt-2">{errorMessage}</div>
            )}
          </div>
        </Card>

        {/* Real-time Results */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Transcription */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Original ({getLanguageName(sourceLanguage)})
              </h3>
              {currentTranscription && (
                <TTSListenButton
                  text={currentTranscription}
                  languageCode={
                    sourceLanguage === "auto" ? "en" : sourceLanguage
                  }
                />
              )}
            </div>
            <div className="min-h-[120px] p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              {currentTranscription ? (
                <p className="text-gray-900 leading-relaxed">
                  {currentTranscription}
                </p>
              ) : (
                <p className="text-gray-500 italic">
                  {isRecording
                    ? "Listening..."
                    : "Start recording to see transcription"}
                </p>
              )}
            </div>
          </Card>

          {/* Translation */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Translation ({getLanguageName(targetLanguage)})
              </h3>
              {currentTranslation && (
                <TTSListenButton
                  text={currentTranslation}
                  languageCode={targetLanguage}
                />
              )}
            </div>
            <div className="min-h-[120px] p-4 bg-blue-50 rounded-lg border-2 border-dashed border-blue-300">
              {currentTranslation ? (
                <p className="text-gray-900 leading-relaxed">
                  {currentTranslation}
                </p>
              ) : (
                <p className="text-gray-500 italic">
                  {isRecording
                    ? "Translating..."
                    : "Translation will appear here"}
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Translation History */}
        {streamHistory.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Translations</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {streamHistory.map((result, index) => (
                <div
                  key={index}
                  className="border-l-4 border-blue-500 pl-4 py-2"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">
                        Original ({getLanguageName(result.detectedLanguage)})
                      </div>
                      <p className="text-gray-900">{result.transcription}</p>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">
                        Translation ({getLanguageName(result.targetLanguage)})
                      </div>
                      <p className="text-gray-900">{result.translation}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge variant="outline" className="text-xs">
                      Confidence: {Math.round(result.confidence * 100)}%
                    </Badge>
                    {result.wasTranslated && (
                      <Badge variant="secondary" className="text-xs">
                        Translated
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
