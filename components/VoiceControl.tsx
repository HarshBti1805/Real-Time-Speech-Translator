"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Type definitions for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void)
    | null;
  onerror:
    | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void)
    | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface VoiceControlProps {
  onNavigate: (section: string, tab?: string) => void;
  isActive: boolean;
  onToggle: () => void;
  // New system control props
  onToggleSidebar?: () => void;
  onToggleTheme?: () => void;
  onToggleChatbot?: () => void;
  onMinimizeChatbot?: () => void;
  onCloseChatbot?: () => void;
  // State props for better control
  sidebarOpen?: boolean;
  theme?: string;
  chatbotOpen?: boolean;
  chatbotMinimized?: boolean;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export default function VoiceControl({
  onNavigate,
  isActive,
  onToggle,
  onToggleSidebar,
  onToggleTheme,
  onToggleChatbot,
  onMinimizeChatbot,
}: VoiceControlProps) {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const retryCountRef = useRef(0);

  // Voice commands mapping - expanded with system controls
  const voiceCommands = {
    // Navigation commands
    "audio translator": "main",
    audio: "main",
    "speech translator": "main",
    "text translator": "translate",
    text: "translate",
    "file upload": "fileupload",
    upload: "fileupload",
    "media upload": "fileupload",
    ocr: "voicerecording",
    "visual ocr": "voicerecording",
    camera: "voicerecording",
    dashboard: "dashboard",
    analytics: "dashboard",
    stats: "dashboard",

    // System control commands
    "open sidebar": "toggle_sidebar",
    "close sidebar": "toggle_sidebar",
    "toggle sidebar": "toggle_sidebar",
    sidebar: "toggle_sidebar",
    "show sidebar": "toggle_sidebar",
    "hide sidebar": "toggle_sidebar",
    "close the sidebar": "toggle_sidebar",
    "close the sidebars": "toggle_sidebar",
    "open the sidebar": "toggle_sidebar",
    "show the sidebar": "toggle_sidebar",
    "hide the sidebar": "toggle_sidebar",

    "dark mode": "toggle_theme",
    "light mode": "toggle_theme",
    "toggle theme": "toggle_theme",
    "switch theme": "toggle_theme",
    "change theme": "toggle_theme",
    "switch to dark mode": "toggle_theme",
    "switch to light mode": "toggle_theme",
    "change to dark mode": "toggle_theme",
    "change to light mode": "toggle_theme",
    dark: "toggle_theme",
    light: "toggle_theme",
    "dark theme": "toggle_theme",
    "light theme": "toggle_theme",
    "go dark": "toggle_theme",
    "go light": "toggle_theme",
    "set dark mode": "toggle_theme",
    "set light mode": "toggle_theme",
    "enable dark mode": "toggle_theme",
    "enable light mode": "toggle_theme",
    "turn on dark mode": "toggle_theme",
    "turn on light mode": "toggle_theme",
    "turn off dark mode": "toggle_theme",
    "turn off light mode": "toggle_theme",

    "open chatbot": "toggle_chatbot",
    "close chatbot": "toggle_chatbot",
    "toggle chatbot": "toggle_chatbot",
    "show chatbot": "toggle_chatbot",
    "hide chatbot": "toggle_chatbot",
    "open ai": "toggle_chatbot",
    "close ai": "toggle_chatbot",
    "ai assistant": "toggle_chatbot",
    "chat assistant": "toggle_chatbot",
    "open the chatbot": "toggle_chatbot",
    "close the chatbot": "toggle_chatbot",
    "show the chatbot": "toggle_chatbot",
    "hide the chatbot": "toggle_chatbot",
    "open the ai": "toggle_chatbot",
    "close the ai": "toggle_chatbot",

    "minimize chatbot": "minimize_chatbot",
    "minimize ai": "minimize_chatbot",
    "minimize assistant": "minimize_chatbot",
    "collapse chatbot": "minimize_chatbot",
    "collapse ai": "minimize_chatbot",
    "minimize the chatbot": "minimize_chatbot",
    "minimize the ai": "minimize_chatbot",

    "maximize chatbot": "maximize_chatbot",
    "maximize ai": "maximize_chatbot",
    "expand chatbot": "maximize_chatbot",
    "expand ai": "maximize_chatbot",
    "full chatbot": "maximize_chatbot",
    "full ai": "maximize_chatbot",
    "maximize the chatbot": "maximize_chatbot",
    "maximize the ai": "maximize_chatbot",
  };

  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window)) {
      setError("Speech recognition not supported in this browser");
      return;
    }

    // Create new recognition instance
    const recognition = new (
      window as unknown as {
        webkitSpeechRecognition: new () => SpeechRecognition;
      }
    ).webkitSpeechRecognition();

    recognition.continuous = true; // Back to true for continuous listening
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setError("");
      setInterimTranscript("");
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");

      // Don't auto-restart - let user control it
      // This should prevent the aborted errors
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimText += transcript;
        }
      }

      setInterimTranscript(interimText);

      if (finalTranscript.trim()) {
        setInterimTranscript("");
        processVoiceCommand(finalTranscript.trim().toLowerCase());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorType = (event as unknown as { error?: string }).error;

      // Don't log aborted errors - they're normal
      if (errorType !== "aborted") {
        console.error("Speech recognition error:", errorType);
      }

      // For aborted errors, just stop silently
      if (errorType === "aborted") {
        setIsListening(false);
        setInterimTranscript("");
        return;
      }

      // Handle other errors
      let errorMessage = "Speech recognition error occurred";

      switch (errorType) {
        case "not-allowed":
          errorMessage =
            "Microphone access denied. Please allow microphone permissions.";
          break;
        case "no-speech":
          errorMessage = "No speech detected. Please try speaking again.";
          break;
        case "audio-capture":
          errorMessage = "Audio capture failed. Please check your microphone.";
          break;
        case "network":
          errorMessage =
            "Network error. Please check your internet connection.";
          break;
        case "service-not-allowed":
          errorMessage = "Speech recognition service not allowed.";
          break;
        case "bad-grammar":
          errorMessage = "Speech recognition grammar error.";
          break;
        case "language-not-supported":
          errorMessage = "Language not supported. Please try English.";
          break;
        default:
          errorMessage = `Speech recognition error: ${errorType}`;
      }

      setError(errorMessage);
      setIsListening(false);
      setInterimTranscript("");
    };

    try {
      recognition.start();
      console.log("Speech recognition started successfully");
    } catch (err) {
      console.error("Error starting speech recognition:", err);
      setError("Failed to start speech recognition");
    }
  }, [isActive, error]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.log("Error stopping recognition:", err);
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript("");
    retryCountRef.current = 0; // Reset retry counter when stopping
  }, []);

  const processVoiceCommand = async (command: string) => {
    console.log("Processing voice command:", command);
    setIsProcessing(true);

    // Normalize the command for better matching
    const normalizedCommand = command.toLowerCase().trim();
    console.log("Normalized command:", normalizedCommand);

    try {
      // First check for system control commands (these should take priority)
      for (const [phrase, section] of Object.entries(voiceCommands)) {
        const phraseLower = phrase.toLowerCase();
        const isMatch =
          normalizedCommand.includes(phraseLower) ||
          phraseLower.includes(normalizedCommand);

        if (isMatch) {
          console.log(
            `Voice command matched: "${phrase}" -> ${section} (phrase: "${phraseLower}", command: "${normalizedCommand}")`
          );

          // Special debugging for light mode commands
          if (
            phraseLower.includes("light") ||
            normalizedCommand.includes("light")
          ) {
            console.log("🔍 Light mode command detected!");
          }

          // Handle system control commands first
          if (section.startsWith("toggle_")) {
            console.log(`Executing system control: ${section}`);
            handleSystemControl(section);
            return;
          }
        }
      }

      console.log(
        "No system control commands matched, trying AI navigation..."
      );

      // If no system control commands matched, try AI-powered navigation
      const response = await fetch("/api/voice-navigation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ voiceCommand: command }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("AI navigation result:", result);

        if (result.success && result.section) {
          console.log(
            `AI navigation: "${command}" -> ${result.section}${
              result.tab ? ` (tab: ${result.tab})` : ""
            } (confidence: ${result.confidence})`
          );
          console.log(`Reasoning: ${result.reasoning}`);

          // Navigate to the suggested section and tab
          onNavigate(result.section, result.tab);
          return;
        }
      }

      // Fallback to keyword matching for navigation commands only
      console.log("AI navigation failed, falling back to keyword matching");

      // Check for exact matches for navigation commands
      for (const [phrase, section] of Object.entries(voiceCommands)) {
        const phraseLower = phrase.toLowerCase();
        const isMatch =
          normalizedCommand.includes(phraseLower) ||
          phraseLower.includes(normalizedCommand);

        if (isMatch) {
          console.log(`Voice command matched: "${phrase}" -> ${section}`);

          // Only handle navigation commands here (system controls already handled above)
          if (!section.startsWith("toggle_")) {
            onNavigate(section);
            return;
          }
        }
      }

      console.log("No voice command matched:", command);
    } catch (error) {
      console.error("Error processing voice command:", error);

      // Fallback to keyword matching on error
      for (const [phrase, section] of Object.entries(voiceCommands)) {
        const phraseLower = phrase.toLowerCase();
        const isMatch =
          normalizedCommand.includes(phraseLower) ||
          phraseLower.includes(normalizedCommand);

        if (isMatch) {
          console.log(`Fallback match: "${phrase}" -> ${section}`);

          // Handle system control commands
          if (section.startsWith("toggle_")) {
            handleSystemControl(section);
            return;
          }

          // Handle navigation commands
          onNavigate(section);
          return;
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle system control commands
  const handleSystemControl = (action: string) => {
    console.log(`Executing system control: ${action}`);

    switch (action) {
      case "toggle_sidebar":
        if (onToggleSidebar) {
          console.log("Toggling sidebar");
          onToggleSidebar();
        }
        break;

      case "toggle_theme":
        if (onToggleTheme) {
          console.log("Toggling theme - executing theme toggle function");
          console.log(
            "Current theme state should be toggled from current value"
          );
          onToggleTheme();
          console.log("Theme toggle function executed successfully");
        } else {
          console.error("Theme toggle function not provided");
        }
        break;

      case "toggle_chatbot":
        if (onToggleChatbot) {
          console.log("Toggling chatbot");
          onToggleChatbot();
        }
        break;

      case "minimize_chatbot":
        if (onMinimizeChatbot) {
          console.log("Minimizing chatbot");
          onMinimizeChatbot();
        }
        break;

      case "maximize_chatbot":
        if (onMinimizeChatbot) {
          console.log("Maximizing chatbot (calling minimize to toggle)");
          onMinimizeChatbot();
        }
        break;

      default:
        console.log(`Unknown system control action: ${action}`);
    }
  };

  useEffect(() => {
    if (isActive) {
      startListening();
    } else {
      stopListening();
    }

    return () => {
      stopListening();
    };
  }, [isActive, startListening, stopListening]);

  const handleToggle = () => {
    onToggle();
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleToggle}
              variant="outline"
              size="icon"
              className={`relative h-10 w-10 lg:h-12 lg:w-12 transition-all duration-300 ml-1 lg:ml-2 group cursor-pointer ${
                isActive
                  ? "bg-gradient-to-br from-red-500 to-red-600 border-red-400 text-white hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:scale-105"
                  : "bg-gradient-to-br from-purple-500 to-pink-500 border-purple-400 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105"
              }`}
            >
              {isActive ? (
                <VolumeX className="w-5 h-5 lg:w-6 lg:h-6 transition-transform group-hover:scale-110" />
              ) : (
                <Volume2 className="w-5 h-5 lg:w-6 lg:h-6 transition-transform group-hover:scale-110" />
              )}
              {isListening && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
              )}
              {isProcessing && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full animate-spin shadow-lg shadow-blue-400/50" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="max-w-sm p-3 bg-white border border-gray-200 shadow-xl rounded-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 duration-200"
          >
            <div className="space-y-3">
              {/* Status Section */}
              <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isActive ? "bg-red-500 animate-pulse" : "bg-gray-300"
                  }`}
                ></div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    Voice Control {isActive ? "Active" : "Inactive"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {isActive
                      ? "Listening for commands..."
                      : "Click to activate"}
                  </div>
                </div>
              </div>

              {/* Quick Commands */}
              <div>
                <div className="text-xs font-medium text-gray-700 mb-2">
                  Quick Commands:
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span className="text-gray-600">Go home</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-gray-600">Translate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    <span className="text-gray-600">Upload</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span className="text-gray-600">Camera</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    <span className="text-gray-600">Dashboard</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                    <span className="text-gray-600">Stats</span>
                  </div>
                </div>
              </div>

              {/* System Controls */}
              <div>
                <div className="text-xs font-medium text-gray-700 mb-2">
                  System Controls:
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                    <span className="text-gray-600">Toggle sidebar</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    <span className="text-gray-600">Dark/Light mode</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-lime-500 rounded-full"></span>
                    <span className="text-gray-600">Open AI assistant</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span className="text-gray-600">Minimize AI</span>
                  </div>
                </div>
              </div>

              {/* Tab Commands */}
              <div>
                <div className="text-xs font-medium text-gray-700 mb-2">
                  Tab Commands:
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    <span className="text-gray-600">Standard mode</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                    <span className="text-gray-600">Real time mode</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    <span className="text-gray-600">Audio upload</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-violet-500 rounded-full"></span>
                    <span className="text-gray-600">Video upload</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                    <span className="text-gray-600">Visual OCR</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
                    <span className="text-gray-600">PDF processing</span>
                  </div>
                </div>
              </div>

              {/* AI Info */}
              <div className="pt-2 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  💡 Speak naturally - AI understands your intent!
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {interimTranscript && (
        <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground max-w-48 truncate bg-gray-50 px-3 py-1.5 rounded-full border">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>&ldquo;{interimTranscript}&rdquo;</span>
        </div>
      )}

      {/* {error && (
        <div className="hidden lg:flex items-center gap-2 text-xs text-red-600 max-w-48 truncate bg-red-50 px-3 py-1.5 rounded-full border border-red-200">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span>{error}</span>
        </div>
      )} */}
    </div>
  );
}
