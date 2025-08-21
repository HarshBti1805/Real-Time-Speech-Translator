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
  Monitor,
  Headphones,
} from "lucide-react";
import { TTSListenButton } from "@/components/ui/TTSListenButton";
import { CustomAudioPlayer } from "@/components/ui/CustomAudioPlayer";
import { motion, AnimatePresence } from "framer-motion";
import { useAutoAnimate } from "@formkit/auto-animate/react";

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

interface MainPageProps {
  initialMode?: "standard" | "realtime";
}

export default function MainPage({ initialMode }: MainPageProps = {}) {
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [baseLanguage, setBaseLanguage] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [targetLanguage, setTargetLanguage] = useState<string>("en");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isRealTimeMode, setIsRealTimeMode] = useState<boolean>(
    initialMode === "realtime"
  );
  const [audioSource, setAudioSource] = useState<"microphone" | "system">(
    "microphone"
  );
  const [isSystemAudioSupported, setIsSystemAudioSupported] =
    useState<boolean>(false);

  // Update isRealTimeMode when initialMode prop changes
  useEffect(() => {
    console.log(
      `MainPage: Setting isRealTimeMode to ${initialMode === "realtime"}`
    );
    setIsRealTimeMode(initialMode === "realtime");
  }, [initialMode]);

  // Check if system audio capture is supported
  useEffect(() => {
    const checkSystemAudioSupport = async () => {
      try {
        // Simple check if getDisplayMedia is available
        if (
          navigator.mediaDevices &&
          navigator.mediaDevices.getDisplayMedia &&
          typeof navigator.mediaDevices.getDisplayMedia === "function"
        ) {
          setIsSystemAudioSupported(true);
          console.log("System audio capture API available");
        } else {
          setIsSystemAudioSupported(false);
          console.log("getDisplayMedia not available");
        }
      } catch (error) {
        console.log("System audio not supported:", error);
        setIsSystemAudioSupported(false);
      }
    };

    checkSystemAudioSupport();
  }, []);
  const [realtimeTranslation, setRealtimeTranslation] =
    useState<TranslationResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null); // For playback
  const [lastAudioBlob, setLastAudioBlob] = useState<Blob | null>(null); // Store last audio for retranslation

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

      let stream: MediaStream;

      if (audioSource === "system") {
        // Capture system audio (Zoom, Google Meet, etc.)
        try {
          // Show user guidance before starting capture
          const userConfirmed = confirm(
            "🎯 System Audio Capture Setup:\n\n" +
              "BEFORE clicking OK, make sure you have:\n" +
              "• An active Zoom/Meet call, or\n" +
              "• Music/video playing, or\n" +
              "• Any audio source active\n\n" +
              "Then click OK to start the capture process."
          );

          if (!userConfirmed) {
            console.log("User cancelled system audio capture");
            return;
          }

          // Show step-by-step guidance
          alert(
            "📋 Next Steps:\n\n" +
              "1. A popup will appear asking what to share\n" +
              "2. Choose 'Share system audio' (recommended)\n" +
              "3. OR select a specific tab/window with audio\n" +
              "4. Make sure the audio is playing and not muted\n\n" +
              "Click OK to continue..."
          );

          // Try different approaches for system audio capture
          let displayStream: MediaStream;

          try {
            // First try: Standard audio constraints
            displayStream = await navigator.mediaDevices.getDisplayMedia({
              video: false,
              audio: true,
            });
          } catch (error1) {
            console.log(
              "Standard audio constraints failed, trying alternative approach:",
              error1
            );

            try {
              // Second try: No audio constraints (let browser choose)
              displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: false,
                audio: {},
              });
            } catch (error2) {
              console.log(
                "Alternative audio constraints failed, trying video with audio:",
                error2
              );

              try {
                // Third try: Video with audio (some browsers require this)
                displayStream = await navigator.mediaDevices.getDisplayMedia({
                  video: true,
                  audio: true,
                });
              } catch (error3) {
                console.log(
                  "Video with audio failed, trying minimal constraints:",
                  error3
                );

                try {
                  // Fourth try: Minimal constraints
                  displayStream = await navigator.mediaDevices.getDisplayMedia(
                    {}
                  );
                } catch (error4) {
                  console.log(
                    "All getDisplayMedia attempts failed, trying alternative methods:",
                    error4
                  );

                  // Fifth try: Check if we can use getUserMedia with system audio
                  try {
                    // Some browsers support system audio through getUserMedia
                    const systemAudioStream =
                      await navigator.mediaDevices.getUserMedia({
                        audio: {
                          echoCancellation: false,
                          noiseSuppression: false,
                          autoGainControl: false,
                          // Try to get system audio if available
                          ...(navigator.mediaDevices.enumerateDevices &&
                            typeof navigator.mediaDevices.enumerateDevices ===
                              "function" && {
                              deviceId: "system-audio", // This might work in some browsers
                            }),
                        },
                      });

                    // If we get here, we have some kind of audio stream
                    stream = systemAudioStream;
                    console.log("Using alternative audio capture method");

                    // Show success message
                    alert(
                      "✅ Alternative audio capture started!\n\n" +
                        "Using fallback method for system audio.\n" +
                        "You should now see audio levels when there's sound.\n" +
                        "If you don't see audio levels:\n" +
                        "• Make sure audio is playing in the selected source\n" +
                        "• Check that the audio isn't muted\n" +
                        "• Try speaking or playing music to test"
                    );

                    // Skip the rest of the function since we have a stream
                    streamRef.current = stream;
                    audioChunksRef.current = [];

                    // Set up audio level monitoring
                    audioContextRef.current = new (window.AudioContext ||
                      (window as WindowWithWebkitAudioContext)
                        .webkitAudioContext!)();
                    analyzerRef.current =
                      audioContextRef.current.createAnalyser();
                    const source =
                      audioContextRef.current.createMediaStreamSource(stream);

                    source.connect(analyzerRef.current);
                    analyzerRef.current.fftSize = 256;

                    // Check if MediaRecorder supports the preferred format
                    let options: MediaRecorderOptions = {
                      mimeType: "audio/webm;codecs=opus",
                    };
                    if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
                      console.log(
                        "WebM Opus not supported, trying alternatives..."
                      );
                      options = { mimeType: "audio/webm" };
                      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
                        console.log("WebM not supported, using default format");
                        options = {};
                      }
                    }

                    mediaRecorderRef.current = new MediaRecorder(
                      stream,
                      options
                    );

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
                      realtimeIntervalRef.current = setInterval(
                        processRealtimeAudio,
                        4000
                      );
                    }

                    return; // Exit early since we've set up everything
                  } catch (error5) {
                    console.log("Alternative methods also failed:", error5);
                    throw new Error(
                      "All system audio capture methods failed. Please use Microphone mode instead."
                    );
                  }
                }
              }
            }
          }

          // Extract audio tracks from the display stream
          const audioTracks = displayStream.getAudioTracks();
          if (audioTracks.length === 0) {
            // If no audio tracks, try to get any tracks and check if they have audio
            const allTracks = displayStream.getTracks();
            const hasAudio = allTracks.some((track) => track.kind === "audio");

            if (!hasAudio) {
              throw new Error("No audio track found in system capture");
            }

            // Create a new stream with all tracks (including video if present)
            stream = displayStream;
            console.log("Using display stream with mixed tracks");
          } else {
            // Create audio-only stream
            stream = new MediaStream(audioTracks);
            console.log("System audio capture started successfully");
          }

          // Show success message with next steps
          alert(
            "✅ System audio capture started!\n\n" +
              "You should now see audio levels when there's sound.\n" +
              "If you don't see audio levels:\n" +
              "• Make sure audio is playing in the selected source\n" +
              "• Check that the audio isn't muted\n" +
              "• Try speaking or playing music to test"
          );
        } catch (error) {
          console.error("Failed to capture system audio:", error);

          let errorMessage = "Failed to capture system audio.\n\n";

          if (error instanceof Error) {
            if (error.name === "NotAllowedError") {
              errorMessage +=
                "Permission denied. Please allow access when prompted.";
            } else if (error.name === "NotFoundError") {
              errorMessage +=
                "No audio source found. Please make sure to:\n" +
                "• Select 'Share system audio' or a specific tab/window\n" +
                "• Choose a tab that has active audio (like Zoom, Google Meet)\n" +
                "• Make sure the audio is playing/active";
            } else if (error.name === "NotSupportedError") {
              errorMessage +=
                "Your browser doesn't support system audio capture.";
            } else {
              errorMessage += `Error: ${error.message}`;
            }
          } else {
            errorMessage += "Unknown error occurred. Please try again.";
          }

          errorMessage +=
            "\n\nTip: Try selecting 'Share system audio' instead of a specific tab.";

          alert(errorMessage);
          return;
        }
      } else {
        // Capture microphone audio
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 48000,
          },
        });
        console.log("Microphone access granted");
      }

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
      const errorMessage =
        audioSource === "system"
          ? "Failed to start system audio recording. Please make sure to select a tab/window with audio."
          : "Failed to start recording. Please check microphone permissions.";
      alert(errorMessage);
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

  const [animationRef] = useAutoAnimate();

  return (
    <motion.div
      className="p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-6xl mx-auto space-y-6" ref={animationRef}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="bg-card/50 border-border backdrop-blur-sm shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent flex items-center justify-center">
                <motion.div
                  className="flex items-center gap-3"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    animate={{ rotate: isRecording ? 360 : 0 }}
                    transition={{
                      duration: 2,
                      repeat: isRecording ? Infinity : 0,
                      ease: "linear",
                    }}
                  >
                    <Mic className="w-10 h-10 text-blue-400" />
                  </motion.div>
                </motion.div>
                <span className="ml-4">Voice Translation Hub</span>
              </CardTitle>
              <motion.p
                className="text-muted-foreground text-l mt-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Speak naturally and get instant translations with real-time
                processing and high-accuracy speech recognition
              </motion.p>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Mode Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="bg-card/50 border-border backdrop-blur-sm shadow-lg">
            <CardContent className="p-6">
              <div className="flex justify-center">
                <div className="bg-muted/50 rounded-lg p-1 flex backdrop-blur-sm border border-border/50">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={() => setIsRealTimeMode(false)}
                      disabled={isRecording}
                      variant={!isRealTimeMode ? "default" : "ghost"}
                      className={`transition-all duration-300 ${
                        !isRealTimeMode
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      }`}
                    >
                      <motion.div
                        animate={{
                          rotate: !isRealTimeMode ? [0, 5, -5, 0] : 0,
                        }}
                        transition={{
                          duration: 2,
                          repeat: !isRealTimeMode ? Infinity : 0,
                        }}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                      </motion.div>
                      Standard Mode
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={() => setIsRealTimeMode(true)}
                      disabled={isRecording}
                      variant={isRealTimeMode ? "default" : "ghost"}
                      className={`transition-all duration-300 ${
                        isRealTimeMode
                          ? "bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg shadow-green-500/25"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      }`}
                    >
                      <motion.div
                        animate={{
                          scale: isRealTimeMode ? [1, 1.2, 1] : 1,
                          rotate: isRealTimeMode ? [0, 10, -10, 0] : 0,
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: isRealTimeMode ? Infinity : 0,
                        }}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                      </motion.div>
                      Real-Time Mode
                    </Button>
                  </motion.div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Language Selection */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
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
          </CardContent>
        </Card>

        {/* Audio Source Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="bg-card/50 border-border backdrop-blur-sm shadow-lg">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center mb-4">
                  <Headphones className="w-5 h-5 text-blue-400 mr-2" />
                  <h3 className="text-lg font-semibold text-foreground">
                    Audio Source
                  </h3>
                </div>

                <div className="flex justify-center">
                  <div className="bg-muted/50 rounded-lg p-1 flex backdrop-blur-sm border border-border/50">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        onClick={() => setAudioSource("microphone")}
                        disabled={isRecording}
                        variant={
                          audioSource === "microphone" ? "default" : "ghost"
                        }
                        className={`transition-all duration-300 ${
                          audioSource === "microphone"
                            ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        }`}
                      >
                        <motion.div
                          animate={{
                            scale:
                              audioSource === "microphone" ? [1, 1.1, 1] : 1,
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: audioSource === "microphone" ? Infinity : 0,
                          }}
                        >
                          <Mic className="w-4 h-4 mr-2" />
                        </motion.div>
                        Microphone
                      </Button>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        onClick={() => setAudioSource("system")}
                        disabled={isRecording || !isSystemAudioSupported}
                        variant={audioSource === "system" ? "default" : "ghost"}
                        className={`transition-all duration-300 ${
                          audioSource === "system"
                            ? "bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg shadow-green-500/25"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        } ${
                          !isSystemAudioSupported
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <motion.div
                          animate={{
                            scale: audioSource === "system" ? [1, 1.1, 1] : 1,
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: audioSource === "system" ? Infinity : 0,
                          }}
                        >
                          <Monitor className="w-4 h-4 mr-2" />
                        </motion.div>
                        System Audio
                      </Button>
                    </motion.div>
                  </div>
                </div>

                {audioSource === "system" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-muted-foreground bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 max-w-md mx-auto"
                  >
                    <div className="flex items-center justify-center mb-2">
                      <Monitor className="w-4 h-4 text-blue-400 mr-2" />
                      <span className="font-medium text-blue-300">
                        System Audio Mode
                      </span>
                    </div>
                    <p className="text-xs mb-2">
                      Select a tab or window with audio (Zoom, Google Meet,
                      etc.) when prompted. Works with both Standard and
                      Real-Time modes.
                    </p>
                    <div className="text-xs bg-blue-500/20 p-2 rounded border border-blue-500/30">
                      <strong>💡 Pro Tip:</strong> Choose &quot;Share system
                      audio&quot; for best results, or select a specific tab
                      that has active audio playing.
                    </div>
                    <Button
                      onClick={() => {
                        alert(
                          "🔧 System Audio Troubleshooting:\n\n" +
                            "1. Make sure you have an active audio source (Zoom call, music playing, etc.)\n" +
                            "2. When prompted, choose 'Share system audio' for best results\n" +
                            "3. If that doesn't work, try selecting a specific tab with audio\n" +
                            "4. Make sure the audio is actually playing (not muted)\n" +
                            "5. Try refreshing the page if you encounter issues\n\n" +
                            "💡 Tip: Start a Zoom call or play some music first, then try capturing."
                        );
                      }}
                      variant="outline"
                      size="sm"
                      className="mt-2 text-xs border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
                    >
                      🔧 Need Help?
                    </Button>

                    <Button
                      onClick={async () => {
                        try {
                          alert(
                            "🧪 Testing System Audio Capture:\n\n" +
                              "1. Click OK to continue\n" +
                              "2. A browser popup will appear\n" +
                              "3. Look for 'Share system audio' option\n" +
                              "4. If you see it, click Cancel to test\n" +
                              "5. If you don't see it, your browser may not support it\n\n" +
                              "This is just a test - no actual recording will start."
                          );

                          // Try different approaches for testing
                          let testStream: MediaStream;

                          try {
                            // First try: Standard audio constraints
                            testStream =
                              await navigator.mediaDevices.getDisplayMedia({
                                video: false,
                                audio: true,
                              });
                          } catch (error1) {
                            console.log(
                              "Standard test failed, trying alternative:",
                              error1
                            );

                            try {
                              // Second try: No audio constraints
                              testStream =
                                await navigator.mediaDevices.getDisplayMedia({
                                  video: false,
                                  audio: {},
                                });
                            } catch (error2) {
                              console.log(
                                "Alternative test failed, trying video with audio:",
                                error2
                              );

                              try {
                                // Third try: Video with audio
                                testStream =
                                  await navigator.mediaDevices.getDisplayMedia({
                                    video: true,
                                    audio: true,
                                  });
                              } catch (error3) {
                                console.log(
                                  "Video with audio test failed, trying minimal:",
                                  error3
                                );

                                // Fourth try: Minimal constraints
                                testStream =
                                  await navigator.mediaDevices.getDisplayMedia(
                                    {}
                                  );
                              }
                            }
                          }

                          // Stop the test stream immediately
                          testStream
                            .getTracks()
                            .forEach((track) => track.stop());

                          alert(
                            "✅ Test Successful!\n\n" +
                              "Your browser supports system audio capture.\n" +
                              "You should have seen options like:\n" +
                              "• Share system audio\n" +
                              "• Select specific tabs/windows\n\n" +
                              "Now try the actual recording feature!"
                          );
                        } catch (error) {
                          console.error("Test failed:", error);
                          let errorMsg = "❌ Test Failed\n\n";

                          if (error instanceof Error) {
                            if (error.name === "NotAllowedError") {
                              errorMsg +=
                                "Permission denied. This is normal for a test.\n\n";
                              errorMsg +=
                                "Your browser supports system audio capture!\n";
                              errorMsg +=
                                "Try the actual recording feature now.";
                            } else if (error.name === "NotFoundError") {
                              errorMsg +=
                                "No audio source found. This is normal for a test.\n\n";
                              errorMsg +=
                                "Your browser supports system audio capture!\n";
                              errorMsg +=
                                "Try the actual recording feature with active audio.";
                            } else if (error.name === "NotSupportedError") {
                              errorMsg +=
                                "Not supported error. This might be a browser limitation.\n\n";
                              errorMsg +=
                                "Try updating your browser or use Microphone mode instead.";
                            } else {
                              errorMsg += `Error: ${error.message}\n\n`;
                              errorMsg +=
                                "This might be a browser compatibility issue.\n";
                              errorMsg +=
                                "Try updating your browser or use Microphone mode.";
                            }
                          } else {
                            errorMsg += "Unknown error occurred.\n";
                            errorMsg +=
                              "Try updating your browser or use Microphone mode.";
                          }

                          alert(errorMsg);
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="mt-2 ml-2 text-xs border-green-500/30 text-green-300 hover:bg-green-500/20"
                    >
                      🧪 Test Feature
                    </Button>
                  </motion.div>
                )}

                {!isSystemAudioSupported && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-muted-foreground bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 max-w-md mx-auto"
                  >
                    <div className="flex items-center justify-center mb-2">
                      <span className="text-yellow-400">⚠️</span>
                      <span className="font-medium text-yellow-300 ml-2">
                        System Audio Not Supported
                      </span>
                    </div>
                    <p className="text-xs">
                      Your browser doesn&apos;t support system audio capture.
                      Use microphone mode instead.
                    </p>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recording Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card className="bg-card/50 border-border backdrop-blur-sm shadow-lg">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <AnimatePresence mode="wait">
                  {!isRecording ? (
                    <motion.div
                      key="start-recording"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          onClick={startRecording}
                          disabled={isProcessing}
                          size="lg"
                          className="px-12 py-6 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-semibold transition-all duration-300 shadow-2xl hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                        >
                          {isProcessing ? (
                            <motion.div
                              className="flex items-center"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              <motion.div
                                className="rounded-full h-6 w-6 border-b-2 border-white mr-3"
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                              />
                              Processing...
                            </motion.div>
                          ) : (
                            <motion.div
                              className="flex items-center"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              <motion.div
                                animate={{
                                  scale: [1, 1.1, 1],
                                  rotate: [0, 5, -5, 0],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                              >
                                <Mic className="w-6 h-6 mr-3" />
                              </motion.div>
                              Start Recording
                            </motion.div>
                          )}
                        </Button>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="stop-recording"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        animate={{
                          boxShadow: [
                            "0 0 0 0 rgba(239, 68, 68, 0.7)",
                            "0 0 0 10px rgba(239, 68, 68, 0)",
                            "0 0 0 0 rgba(239, 68, 68, 0)",
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Button
                          onClick={stopRecording}
                          size="lg"
                          className="px-12 py-6 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold transition-all duration-300 shadow-2xl hover:shadow-red-500/25 text-lg"
                        >
                          <motion.div
                            animate={{ scale: [1, 0.9, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            <Square className="w-6 h-6 mr-3" />
                          </motion.div>
                          Stop Recording
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {(result || realtimeTranslation) && (
                  <Button
                    onClick={clearResults}
                    disabled={isRecording}
                    variant="outline"
                    className="ml-4 border-border text-foreground hover:bg-accent"
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
                    <div className="w-64 h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-100 rounded-full"
                        style={{ width: `${Math.min(audioLevel, 100)}%` }}
                      ></div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {audioLevel > 10
                        ? "🎙️ Audio detected"
                        : "🔇 Speak louder"}
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
        </motion.div>

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

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          <Card className="bg-gradient-to-br from-card/50 to-muted/20 border-border/50 backdrop-blur-sm shadow-lg">
            <CardContent className="p-6">
              <motion.div
                className="text-center text-muted-foreground text-sm space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2, staggerChildren: 0.1 }}
                >
                  <motion.div
                    className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20"
                    whileHover={{
                      scale: 1.02,
                      backgroundColor: "rgba(59, 130, 246, 0.15)",
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-center mb-2">
                      <Clock className="w-5 h-5 text-blue-400" />
                    </div>
                    <h4 className="font-semibold text-blue-300 mb-1">
                      Standard Mode
                    </h4>
                    <p className="text-xs">
                      Record, then get translation after stopping
                    </p>
                  </motion.div>

                  <motion.div
                    className="p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                    whileHover={{
                      scale: 1.02,
                      backgroundColor: "rgba(34, 197, 94, 0.15)",
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-center mb-2">
                      <Zap className="w-5 h-5 text-green-400" />
                    </div>
                    <h4 className="font-semibold text-green-300 mb-1">
                      Real-Time Mode
                    </h4>
                    <p className="text-xs">
                      Live translation updates every 2 seconds
                    </p>
                  </motion.div>
                </motion.div>

                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3, staggerChildren: 0.1 }}
                >
                  <motion.div
                    className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20"
                    whileHover={{
                      scale: 1.02,
                      backgroundColor: "rgba(147, 51, 234, 0.15)",
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-center mb-2">
                      <Mic className="w-5 h-5 text-purple-400" />
                    </div>
                    <h4 className="font-semibold text-purple-300 mb-1">
                      Microphone
                    </h4>
                    <p className="text-xs">
                      Direct voice input from your microphone
                    </p>
                  </motion.div>

                  <motion.div
                    className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                    whileHover={{
                      scale: 1.02,
                      backgroundColor: "rgba(16, 185, 129, 0.15)",
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-center mb-2">
                      <Monitor className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h4 className="font-semibold text-emerald-300 mb-1">
                      System Audio
                    </h4>
                    <p className="text-xs">
                      Capture audio from Zoom, Google Meet, etc.
                    </p>
                  </motion.div>
                </motion.div>

                <motion.div
                  className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70 bg-accent/30 rounded-full px-4 py-2 max-w-fit mx-auto"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.4 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    💡
                  </motion.div>
                  <span>
                    {isRealTimeMode
                      ? "Real-time mode works best with clear, continuous speech"
                      : "Choose your preferred mode and start translating"}
                  </span>
                </motion.div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
