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
import { TTSListenButton } from "@/components/ui/TTSListenButton";
import { CustomAudioPlayer } from "@/components/ui/CustomAudioPlayer";

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

// Add conversation message interface
interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  audioUrl?: string | null;
}

// Custom error types for better type safety

interface TimeoutError extends Error {
  name: "TimeoutError";
}

interface WindowWithWebkitAudioContext extends Window {
  webkitAudioContext?: typeof AudioContext;
}

// IMPROVEMENT OF REAL TIME AUDIO TRANSTALION

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
  const [audioUrl, setAudioUrl] = useState<string | null>(null); // For playback
  const [lastAudioBlob, setLastAudioBlob] = useState<Blob | null>(null); // Store last audio for retranslation

  // Conversation mode state
  const [isConversationMode, setIsConversationMode] = useState<boolean>(false);
  const [conversationMessages, setConversationMessages] = useState<
    ConversationMessage[]
  >([]);
  const [conversationLanguage, setConversationLanguage] =
    useState<string>("en");
  const [isConversationPlaying, setIsConversationPlaying] =
    useState<boolean>(false);
  const [currentPlayingMessageId, setCurrentPlayingMessageId] = useState<
    string | null
  >(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const realtimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunkCounterRef = useRef<number>(0);

  // Clean up audio URL on unmount or when new audio is set
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

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

  const isRealtimeRequestInProgress = useRef(false);

  // Real-time processing
  const processRealtimeAudio = async (): Promise<void> => {
    if (
      !isRealTimeMode ||
      !mediaRecorderRef.current ||
      audioChunksRef.current.length === 0 ||
      isRealtimeRequestInProgress.current
    ) {
      return;
    }

    isRealtimeRequestInProgress.current = true;
    setIsProcessing(true);

    try {
      // Create blob from only the last few chunks to keep audio short
      const recentChunks = audioChunksRef.current.slice(-5); // Only last 5 chunks (~10 seconds max)
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

      // Set audio URL for playback (revoke previous)
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(URL.createObjectURL(audioBlob));

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
      isRealtimeRequestInProgress.current = false;
      chunkCounterRef.current++;

      // Trim to last 5 chunks only
      if (audioChunksRef.current.length > 5) {
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
      mediaRecorderRef.current.start(2000); // Collect data every 2 seconds
      setIsRecording(true);

      // Start real-time processing if enabled
      if (isRealTimeMode) {
        realtimeIntervalRef.current = setInterval(processRealtimeAudio, 4000); // Increased to 4 seconds for stability
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

      setLastAudioBlob(audioBlob); // Store the blob for retranslation
      console.log("[DEBUG] lastAudioBlob set:", audioBlob);

      // Set audio URL for playback (revoke previous)
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(URL.createObjectURL(audioBlob));

      // Handle conversation mode
      if (isConversationMode) {
        await processConversationRecording(audioBlob);
        return;
      }

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
        // Save to transcription history
        fetch("/api/transcription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inputType: "audio",
            inputValue: "recording.webm",
            outputValue: data.translation || data.transcription,
          }),
        });
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

  // Process conversation recording
  const processConversationRecording = async (
    audioBlob: Blob
  ): Promise<void> => {
    try {
      // Step 1: Transcribe user audio
      const formData = new FormData();
      formData.append("audio", audioBlob, "conversation.webm");
      formData.append("targetLanguage", conversationLanguage);
      formData.append("baseLanguage", conversationLanguage);
      formData.append("isRealtime", "false");

      const transcriptionRes = await fetch("/api/voice", {
        method: "POST",
        body: formData,
      });

      if (!transcriptionRes.ok) {
        throw new Error("Failed to transcribe audio");
      }

      const transcriptionData = await transcriptionRes.json();
      const userMessage = transcriptionData.transcription;

      if (!userMessage?.trim()) {
        console.warn("No speech detected");
        return;
      }

      // Add user message to conversation
      const userConversationMessage: ConversationMessage = {
        id: Date.now().toString(),
        role: "user",
        content: userMessage,
        timestamp: new Date(),
        audioUrl: URL.createObjectURL(audioBlob),
      };

      setConversationMessages((prev) => [...prev, userConversationMessage]);

      // Step 2: Get AI response
      const chatbotRes = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          context: {
            currentMode: "conversation",
            sourceLanguage: conversationLanguage,
            targetLanguage: conversationLanguage,
          },
          conversationHistory: conversationMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      if (!chatbotRes.ok) {
        throw new Error("Failed to get AI response");
      }

      const chatbotData = await chatbotRes.json();
      const aiResponse = chatbotData.response;

      // Step 3: Convert AI response to speech
      const aiAudioUrl = await generateAISpeech(aiResponse);

      // Add AI message to conversation
      const aiConversationMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
        audioUrl: aiAudioUrl || undefined,
      };

      setConversationMessages((prev) => [...prev, aiConversationMessage]);

      // Step 4: Auto-play AI response
      if (aiAudioUrl) {
        await playAIResponse(aiAudioUrl, aiConversationMessage.id);
      }
    } catch (error) {
      console.error("Error processing conversation:", error);
      // Add error message to conversation
      const errorMessage: ConversationMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Sorry, I couldn't process that. Please try again.",
        timestamp: new Date(),
      };
      setConversationMessages((prev) => [...prev, errorMessage]);
    }
  };

  // Generate AI speech using TTS
  const generateAISpeech = async (text: string): Promise<string | null> => {
    try {
      const ttsRes = await fetch(
        "https://chatbot-tts-server.onrender.com/tts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            languageCode:
              conversationLanguage === "en"
                ? "en-US"
                : conversationLanguage === "es"
                ? "es-ES"
                : conversationLanguage === "fr"
                ? "fr-FR"
                : conversationLanguage === "de"
                ? "de-DE"
                : conversationLanguage === "it"
                ? "it-IT"
                : conversationLanguage === "pt"
                ? "pt-BR"
                : conversationLanguage === "ja"
                ? "ja-JP"
                : conversationLanguage === "ko"
                ? "ko-KR"
                : conversationLanguage === "zh"
                ? "zh-CN"
                : "en-US",
            voiceName:
              conversationLanguage === "en"
                ? "en-US-Neural2-D"
                : conversationLanguage === "es"
                ? "es-ES-Neural2-B"
                : conversationLanguage === "fr"
                ? "fr-FR-Neural2-B"
                : conversationLanguage === "de"
                ? "de-DE-Neural2-B"
                : conversationLanguage === "it"
                ? "it-IT-Neural2-A"
                : conversationLanguage === "pt"
                ? "pt-BR-Neural2-A"
                : conversationLanguage === "ja"
                ? "ja-JP-Neural2-B"
                : conversationLanguage === "ko"
                ? "ko-KR-Neural2-A"
                : conversationLanguage === "zh"
                ? "zh-CN-Neural2-A"
                : "en-US-Neural2-D",
          }),
        }
      );

      if (ttsRes.ok) {
        const audioBlob = await ttsRes.blob();
        return URL.createObjectURL(audioBlob);
      }
      return null;
    } catch (error) {
      console.error("Error generating AI speech:", error);
      return null;
    }
  };

  // Play AI response audio
  const playAIResponse = async (
    audioUrl: string,
    messageId: string
  ): Promise<void> => {
    try {
      setIsConversationPlaying(true);
      setCurrentPlayingMessageId(messageId);

      const audio = new Audio(audioUrl);
      audio.onended = () => {
        setIsConversationPlaying(false);
        setCurrentPlayingMessageId(null);
      };
      audio.onerror = () => {
        setIsConversationPlaying(false);
        setCurrentPlayingMessageId(null);
      };

      await audio.play();
    } catch (error) {
      console.error("Error playing AI response:", error);
      setIsConversationPlaying(false);
      setCurrentPlayingMessageId(null);
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

  // Retranslate audio when targetLanguage changes (Standard Mode only)
  useEffect(() => {
    const retranslateAudioWithNewTargetLanguage = async () => {
      console.log("[DEBUG] Retranslate useEffect triggered", {
        lastAudioBlob,
        result,
        isRealTimeMode,
        isRecording,
        targetLanguage,
      });
      if (!lastAudioBlob || !result || isRealTimeMode || isRecording) return;
      setIsProcessing(true);
      try {
        const formData = new FormData();
        formData.append("audio", lastAudioBlob, "recording.webm");
        formData.append("targetLanguage", targetLanguage);
        formData.append("baseLanguage", baseLanguage || "auto");
        formData.append("isRealtime", "false");

        const res = await fetch("/api/voice", {
          method: "POST",
          body: formData,
        });
        console.log("[DEBUG] /api/voice response status:", res.status);

        if (res.ok) {
          const data: TranslationResult = await res.json();
          console.log("[DEBUG] /api/voice response data:", data);
          setResult(data);
          // Save to transcription history
          fetch("/api/transcription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              inputType: "audio",
              inputValue: "recording.webm",
              outputValue: data.translation || data.transcription,
            }),
          });
        } else {
          const errorData = await res.json();
          console.log("[DEBUG] /api/voice error data:", errorData);
          setResult({
            transcription: "",
            detectedLanguage: "",
            targetLanguage,
            wasTranslated: false,
            error: errorData.error || "Failed to process audio",
          });
        }
      } catch (error) {
        console.error("Error re-translating audio:", error);
        setResult({
          transcription: "",
          detectedLanguage: "",
          targetLanguage,
          wasTranslated: false,
          error: "Network error occurred while re-translating audio",
        });
      } finally {
        setIsProcessing(false);
      }
    };
    retranslateAudioWithNewTargetLanguage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLanguage]);

  const clearResults = (): void => {
    setResult(null);
    setRealtimeTranslation(null);
    setLastAudioBlob(null); // Clear last audio blob as well
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    // Clear conversation messages if in conversation mode
    if (isConversationMode) {
      conversationMessages.forEach((msg) => {
        if (msg.audioUrl) {
          URL.revokeObjectURL(msg.audioUrl);
        }
      });
      setConversationMessages([]);
    }
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
        <Card className="bg-card/50 border-border backdrop-blur-sm shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent flex items-center justify-center">
              <div className="flex items-center gap-3">
                <Mic className="w-10 h-10 text-blue-400" />
              </div>
              <span className="ml-4">Voice Translation Hub</span>
            </CardTitle>
            <p className="text-muted-foreground text-l mt-3">
              Speak naturally and get instant translations with real-time
              processing and high-accuracy speech recognition
            </p>
          </CardHeader>
        </Card>

        {/* Mode Selection */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex justify-center">
              <div className="bg-muted rounded-lg p-1 flex">
                <Button
                  onClick={() => {
                    setIsRealTimeMode(false);
                    setIsConversationMode(false);
                  }}
                  disabled={isRecording}
                  variant={
                    !isRealTimeMode && !isConversationMode ? "default" : "ghost"
                  }
                  className={`transition-all duration-200 ${
                    !isRealTimeMode && !isConversationMode
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Standard Mode
                </Button>
                <Button
                  onClick={() => {
                    setIsRealTimeMode(true);
                    setIsConversationMode(false);
                  }}
                  disabled={isRecording}
                  variant={
                    isRealTimeMode && !isConversationMode ? "default" : "ghost"
                  }
                  className={`transition-all duration-200 ${
                    isRealTimeMode && !isConversationMode
                      ? "bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Real-Time Mode
                </Button>
                <Button
                  onClick={() => {
                    setIsRealTimeMode(false);
                    setIsConversationMode(true);
                  }}
                  disabled={isRecording}
                  variant={isConversationMode ? "default" : "ghost"}
                  className={`transition-all duration-200 ${
                    isConversationMode
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  Conversation Mode
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language Selection */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            {isConversationMode ? (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Conversation Language
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Choose one language for both you and the AI
                  </p>
                </div>
                <div className="max-w-md mx-auto">
                  <select
                    value={conversationLanguage}
                    onChange={(e) => setConversationLanguage(e.target.value)}
                    className="w-full p-3 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-foreground placeholder-muted-foreground"
                    disabled={isRecording || isProcessing}
                  >
                    {languageOptions.map((lang: Language) => (
                      <option
                        key={lang.code}
                        value={lang.code}
                        className="bg-background text-foreground"
                      >
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground/90">
                    <Languages className="w-4 h-4 inline mr-2" />
                    Translate From:
                  </label>
                  <select
                    value={baseLanguage}
                    onChange={(e) => setBaseLanguage(e.target.value)}
                    className="w-full p-3 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-foreground placeholder-muted-foreground"
                    disabled={isRecording || isProcessing}
                  >
                    {baseLanguageOptions.map((lang: Language) => (
                      <option
                        key={lang.code}
                        value={lang.code}
                        className="bg-background text-foreground"
                      >
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground/90">
                    <Volume2 className="w-4 h-4 inline mr-2" />
                    Translate to:
                  </label>
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="w-full p-3 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-foreground placeholder-muted-foreground"
                    disabled={isRecording || isProcessing}
                  >
                    {languageOptions.map((lang: Language) => (
                      <option
                        key={lang.code}
                        value={lang.code}
                        className="bg-background text-foreground"
                      >
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recording Controls */}
        <Card className="bg-card border-border">
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

              {(result ||
                realtimeTranslation ||
                conversationMessages.length > 0) && (
                <Button
                  onClick={clearResults}
                  disabled={isRecording}
                  variant="outline"
                  className="ml-4 border-border text-foreground hover:bg-accent"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {isConversationMode ? "Clear Conversation" : "Clear Results"}
                </Button>
              )}

              {/* Recording Status */}
              {isRecording && (
                <div className="flex flex-col items-center space-y-4 mt-6">
                  <div className="flex items-center space-x-2 text-lg font-mono text-green-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>
                      {isRealTimeMode
                        ? "🔴 LIVE"
                        : isConversationMode
                        ? "💬 Listening"
                        : "Recording"}
                      : {formatTime(recordingTime)}
                    </span>
                  </div>

                  {/* Audio Level Indicator */}
                  <div className="w-64 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-100 rounded-full"
                      style={{ width: `${Math.min(audioLevel, 100)}%` }}
                    ></div>
                  </div>

                  <div className="text-sm text-muted-foreground">
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

                  {isConversationMode && (
                    <Badge
                      variant="secondary"
                      className="bg-purple-500/20 text-purple-400 border-purple-500/30"
                    >
                      {isProcessing
                        ? "🔄 Processing conversation..."
                        : isConversationPlaying
                        ? "🔊 AI speaking..."
                        : "💬 Conversation mode active"}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Processing Status */}
        {/* {isProcessing && !isRecording && (
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="inline-flex items-center px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-400 mr-3"></div>
                  <span className="text-yellow-400">Processing audio...</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )} */}

        {/* Real-time Translation Display */}
        {isRealTimeMode &&
          realtimeTranslation &&
          !realtimeTranslation.error && (
            <Card className="bg-card border-green-500/50 shadow-lg shadow-green-500/25">
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

                <div className="border-b border-border pb-4">
                  <h3 className="text-lg font-semibold mb-2 text-foreground/80">
                    Original (
                    {getLanguageName(realtimeTranslation.detectedLanguage)})
                  </h3>
                  <div className="text-foreground text-lg bg-muted p-4 rounded-lg border border-border transition-all duration-300 flex items-center justify-between gap-4">
                    <span>{realtimeTranslation.transcription}</span>
                    {realtimeTranslation.transcription && (
                      <TTSListenButton
                        key={
                          realtimeTranslation.transcription +
                          realtimeTranslation.detectedLanguage
                        }
                        text={realtimeTranslation.transcription}
                        languageCode={realtimeTranslation.detectedLanguage}
                      />
                    )}
                  </div>
                </div>

                {realtimeTranslation.wasTranslated && (
                  <div className="border-b border-border pb-4">
                    <h3 className="text-lg font-semibold mb-2 text-foreground/80">
                      Translation (
                      {getLanguageName(realtimeTranslation.targetLanguage)})
                    </h3>
                    <div className="text-foreground text-lg bg-blue-500/10 p-4 rounded-lg border border-blue-500/20 transition-all duration-300 flex items-center justify-between gap-4">
                      <span>{realtimeTranslation.translation}</span>
                      {realtimeTranslation.translation && (
                        <TTSListenButton
                          key={
                            realtimeTranslation.translation +
                            realtimeTranslation.targetLanguage
                          }
                          text={realtimeTranslation.translation}
                          languageCode={realtimeTranslation.targetLanguage}
                        />
                      )}
                    </div>
                  </div>
                )}

                {!realtimeTranslation.wasTranslated && (
                  <div className="text-center text-muted-foreground py-4">
                    <p>✓ Already in target language - no translation needed</p>
                  </div>
                )}

                <div className="flex justify-between text-sm text-muted-foreground pt-4">
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
                {/* Audio Player */}
                {audioUrl && !isRecording && (
                  <div className="pt-4">
                    <audio controls src={audioUrl} className="w-full" />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        {/* Standard Mode Results */}
        {result && !isRealTimeMode && (
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              {result.error ? (
                <div className="text-red-400 text-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                  <p className="text-lg font-semibold">❌ Error</p>
                  <p className="mt-2">{result.error}</p>
                </div>
              ) : (
                <>
                  <div className="border-b border-border pb-4">
                    <h3 className="text-lg font-semibold mb-2 text-foreground/80">
                      Original ({getLanguageName(result.detectedLanguage)})
                    </h3>
                    <div className="text-foreground text-lg bg-muted p-4 rounded-lg border border-border flex items-center justify-between gap-4">
                      <span>{result.transcription}</span>
                      {result.transcription && (
                        <TTSListenButton
                          key={result.transcription + result.detectedLanguage}
                          text={result.transcription}
                          languageCode={result.detectedLanguage}
                        />
                      )}
                    </div>
                  </div>

                  {result.wasTranslated && (
                    <div className="border-b border-border pb-4">
                      <h3 className="text-lg font-semibold mb-2 text-foreground/80">
                        Translation ({getLanguageName(result.targetLanguage)})
                      </h3>
                      <div className="text-foreground text-lg bg-blue-500/10 p-4 rounded-lg border border-blue-500/20 flex items-center justify-between gap-4">
                        <span>{result.translation}</span>
                        {result.translation && (
                          <TTSListenButton
                            key={result.translation + result.targetLanguage}
                            text={result.translation}
                            languageCode={result.targetLanguage}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {!result.wasTranslated && (
                    <div className="text-center text-muted-foreground py-4">
                      <p>
                        ✓ Already in target language - no translation needed
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between text-sm text-muted-foreground pt-4">
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
              {/* Audio Player */}
              {audioUrl && !isRecording && (
                <CustomAudioPlayer
                  audioUrl={audioUrl}
                  isRecording={isRecording}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Conversation Mode Display */}
        {isConversationMode && conversationMessages.length > 0 && (
          <Card className="bg-card border-purple-500/50 shadow-lg shadow-purple-500/25">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-purple-400 flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse mr-2"></div>
                  Conversation History
                </h2>
                <Badge
                  variant="secondary"
                  className="bg-purple-500/20 text-purple-400 border-purple-500/30"
                >
                  {conversationMessages.length} messages
                </Badge>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {conversationMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                        message.role === "user"
                          ? "bg-blue-500/20 text-blue-100 border border-blue-500/30"
                          : "bg-purple-500/20 text-purple-100 border border-purple-500/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm">{message.content}</p>
                        {message.audioUrl && (
                          <Button
                            onClick={() =>
                              playAIResponse(message.audioUrl!, message.id)
                            }
                            disabled={
                              isConversationPlaying &&
                              currentPlayingMessageId !== message.id
                            }
                            size="sm"
                            variant="ghost"
                            className="flex-shrink-0 p-1 h-6 w-6"
                          >
                            {isConversationPlaying &&
                            currentPlayingMessageId === message.id ? (
                              <div className="w-3 h-3 animate-pulse bg-current rounded-full" />
                            ) : (
                              <Volume2 className="w-3 h-3" />
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {message.role === "user" ? "You" : "AI"} •{" "}
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {isProcessing && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400 mr-2"></div>
                    <span className="text-purple-400 text-sm">
                      AI is thinking...
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground text-sm space-y-2">
              <p>
                <strong>Standard Mode:</strong> Record, then get translation
                after stopping
              </p>
              <p>
                <strong>Real-Time Mode:</strong> Live translation updates every
                2 seconds
              </p>
              <p>
                <strong>Conversation Mode:</strong> Have full conversations with
                AI in your chosen language
              </p>
              <p className="text-xs text-muted-foreground/70">
                💡 In conversation mode, speak naturally and the AI will respond
                with voice
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
