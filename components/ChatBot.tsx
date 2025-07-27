"use client";

import React, { useState, useRef, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  X,
  Send,
  Mic,
  MicOff,
  Sparkles,
  Bot,
  User,
  Minimize2,
  Maximize2,
  RotateCcw,
  Copy,
  Check,
  Loader2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";

// Enhanced markdown parser for chat messages
const parseMarkdown = (text: string) => {
  return (
    text
      // ### Headings
      .replace(
        /^###\s+(.+)$/gm,
        '<h3 class="font-bold text-purple-600 dark:text-purple-400 mt-3 mb-2 text-lg border-l-4 border-purple-500 pl-3 bg-purple-50/50 dark:bg-purple-900/20 py-1 rounded-r">$1</h3>'
      )
      // Numbered sections with bold titles: 1. **Title:**
      .replace(
        /^(\d+)\.\s?\*\*(.*?)\*\*$/gm,
        '<div class="font-semibold text-blue-600 dark:text-blue-400 mt-2 mb-1 text-base">$1. $2</div>'
      )
      // Bold text: **text**
      .replace(
        /\*\*(.*?)\*\*/g,
        '<strong class="font-semibold text-gray-800 dark:text-gray-200">$1</strong>'
      )
      // Italic text: *text*
      .replace(
        /(?<!\*)\*([^*]+)\*(?!\*)/g,
        '<em class="italic text-gray-600 dark:text-gray-400">$1</em>'
      )
      // Code blocks: `code`
      .replace(
        /`([^`]+)`/g,
        '<code class="bg-blue-50 dark:bg-gray-800 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono text-xs border border-blue-200 dark:border-gray-700">$1</code>'
      )
      // Bullet points: - text
      .replace(
        /^[\s]*-\s+(.+)$/gm,
        '<div class="flex items-start ml-4 my-0.5"><span class="text-blue-600 dark:text-blue-400 mr-2 mt-0.5 font-bold">•</span><span class="text-gray-700 dark:text-gray-300">$1</span></div>'
      )
      // Line breaks
      .replace(/\n\n/g, '<div class="my-1"></div>')
      .replace(/\n/g, "<br>")
  );
};

// Speech Recognition API types
interface SpeechRecognitionResult {
  [index: number]: {
    transcript: string;
    confidence: number;
  };
  length: number;
  isFinal: boolean;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionEventResult extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionAPI {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventResult) => void) | null;
  onerror: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognitionAPI;
  }
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  metadata?: {
    confidence?: number;
    processingTime?: number;
    suggestions?: string[];
  };
}

interface ChatBotProps {
  currentMode: string;
  currentTranslation?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
}

const ChatBot = memo(function ChatBot({
  currentMode,
  currentTranslation,
  sourceLanguage,
  targetLanguage,
}: ChatBotProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Voice mode states
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingMessageId, setCurrentSpeakingMessageId] = useState<
    string | null
  >(null);
  const [voiceError, setVoiceError] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionAPI | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Quick action suggestions based on current mode
  const getQuickActions = () => {
    const baseActions = [
      "How can I improve my translation accuracy?",
      "Explain the cultural context of this phrase",
      "What are alternative ways to say this?",
      "Help me with pronunciation",
    ];

    switch (currentMode) {
      case "main":
        return [
          "How do I optimize voice recording quality?",
          "Why isn't my audio being translated correctly?",
          "Can you help with real-time conversation tips?",
          ...baseActions,
        ];
      case "translate":
        return [
          "How can I make this translation more formal?",
          "What's the difference between these language variants?",
          "Help me improve this text's style",
          ...baseActions,
        ];
      case "speech":
        return [
          "What audio formats work best?",
          "How can I improve transcription accuracy?",
          "Help with file processing issues",
          ...baseActions,
        ];
      default:
        return baseActions;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Hello ${
          session?.user?.name || "there"
        }! 👋 I'm your TranslateHub Assistant. I'm here to help you with translations, language learning, and navigating the app. What can I help you with today?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, session?.user?.name]);

  // Language detection and voice mapping
  const detectLanguageAndVoice = (text: string, context: string) => {
    const lowerText = text.toLowerCase();
    const lowerContext = context.toLowerCase();

    // Language detection patterns
    const languagePatterns = {
      hindi: {
        keywords: [
          "hindi",
          "हिंदी",
          "devanagari",
          "translate to hindi",
          "in hindi",
        ],
        languageCode: "hi-IN",
        voiceName: "hi-IN-Wavenet-A",
      },
      spanish: {
        keywords: [
          "spanish",
          "español",
          "translate to spanish",
          "in spanish",
          "es-",
        ],
        languageCode: "es-ES",
        voiceName: "es-ES-Wavenet-B",
      },
      french: {
        keywords: [
          "french",
          "français",
          "translate to french",
          "in french",
          "fr-",
        ],
        languageCode: "fr-FR",
        voiceName: "fr-FR-Wavenet-A",
      },
      german: {
        keywords: [
          "german",
          "deutsch",
          "translate to german",
          "in german",
          "de-",
        ],
        languageCode: "de-DE",
        voiceName: "de-DE-Wavenet-B",
      },
      japanese: {
        keywords: [
          "japanese",
          "日本語",
          "translate to japanese",
          "in japanese",
          "ja-",
        ],
        languageCode: "ja-JP",
        voiceName: "ja-JP-Wavenet-A",
      },
      chinese: {
        keywords: [
          "chinese",
          "中文",
          "mandarin",
          "translate to chinese",
          "in chinese",
          "zh-",
        ],
        languageCode: "zh-CN",
        voiceName: "zh-CN-Wavenet-A",
      },
      arabic: {
        keywords: [
          "arabic",
          "العربية",
          "translate to arabic",
          "in arabic",
          "ar-",
        ],
        languageCode: "ar-XA",
        voiceName: "ar-XA-Wavenet-A",
      },
      italian: {
        keywords: [
          "italian",
          "italiano",
          "translate to italian",
          "in italian",
          "it-",
        ],
        languageCode: "it-IT",
        voiceName: "it-IT-Wavenet-A",
      },
      portuguese: {
        keywords: [
          "portuguese",
          "português",
          "translate to portuguese",
          "in portuguese",
          "pt-",
        ],
        languageCode: "pt-BR",
        voiceName: "pt-BR-Wavenet-A",
      },
      russian: {
        keywords: [
          "russian",
          "русский",
          "translate to russian",
          "in russian",
          "ru-",
        ],
        languageCode: "ru-RU",
        voiceName: "ru-RU-Wavenet-A",
      },
      korean: {
        keywords: [
          "korean",
          "한국어",
          "translate to korean",
          "in korean",
          "ko-",
        ],
        languageCode: "ko-KR",
        voiceName: "ko-KR-Wavenet-A",
      },
    };

    // Check if the text contains language-specific characters
    const hasHindiChars = /[\u0900-\u097F]/.test(text);
    const hasChineseChars = /[\u4e00-\u9fff]/.test(text);
    const hasArabicChars = /[\u0600-\u06FF]/.test(text);
    const hasJapaneseChars = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
    const hasKoreanChars = /[\uAC00-\uD7AF]/.test(text);

    if (hasHindiChars) return languagePatterns.hindi;
    if (hasChineseChars) return languagePatterns.chinese;
    if (hasArabicChars) return languagePatterns.arabic;
    if (hasJapaneseChars) return languagePatterns.japanese;
    if (hasKoreanChars) return languagePatterns.korean;

    // Check context and text for language keywords
    const combinedText = `${lowerContext} ${lowerText}`;

    for (const [lang, config] of Object.entries(languagePatterns)) {
      for (const keyword of config.keywords) {
        if (combinedText.includes(keyword)) {
          console.log(`🌍 Detected language: ${lang} (keyword: "${keyword}")`);
          return config;
        }
      }
    }

    // Default to English
    return {
      languageCode: "en-US",
      voiceName: "en-US-Wavenet-D",
    };
  };

  // Stop TTS playback
  const stopTTS = () => {
    console.log("🛑 Stopping TTS playback");
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  };

  // Enhanced TTS Function with smart language detection
  const speakText = async (
    text: string,
    userMessage?: string,
    messageId?: string
  ) => {
    console.log("🔊 speakText function called!");
    console.log("📝 Text to speak:", text.substring(0, 100) + "...");
    console.log("🔄 Currently speaking:", isSpeaking);
    console.log("🎙️ Voice mode state:", isVoiceMode);

    if (!text.trim()) {
      console.log("❌ No text provided to speak");
      return;
    }

    if (isSpeaking) {
      console.log("⏭️ Already speaking, skipping...");
      return;
    }

    console.log("🎯 Setting isSpeaking to true");
    setIsSpeaking(true);
    setCurrentSpeakingMessageId(messageId || null);
    setVoiceError("");

    try {
      // Smart language and voice detection
      const context =
        userMessage || messages[messages.length - 1]?.content || "";
      const voiceConfig = detectLanguageAndVoice(text, context);

      console.log("🌍 Voice configuration:", voiceConfig);
      console.log("🗣️ Language code:", voiceConfig.languageCode);
      console.log("🎭 Voice name:", voiceConfig.voiceName);

      const ttsUrl = "https://chatbot-tts-server.onrender.com/tts";

      console.log("🏠 Connecting to deployed Flask server:", ttsUrl);
      console.log("📤 Request payload:", {
        text: text.substring(0, 50) + "...",
        languageCode: voiceConfig.languageCode,
        voiceName: voiceConfig.voiceName,
      });

      const requestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/mpeg, audio/*",
        },
        body: JSON.stringify({
          text: text,
          languageCode: voiceConfig.languageCode,
          voiceName: voiceConfig.voiceName,
        }),
      };

      console.log("📡 Making fetch request...");
      const response = await fetch(ttsUrl, requestOptions);

      console.log("📥 Response received!");
      console.log(
        "🌐 Flask response status:",
        response.status,
        response.statusText
      );
      console.log(
        "📋 Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
        } catch {
          errorText = "Unable to read error response";
        }
        console.error("❌ Flask TTS Error Response:", errorText);
        throw new Error(
          `Flask TTS Error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      console.log("✅ Response OK, reading audio blob...");
      const audioBlob = await response.blob();
      console.log("📦 Flask audio blob:", {
        size: audioBlob.size + " bytes",
        type: audioBlob.type,
      });

      if (audioBlob.size === 0) {
        throw new Error("Flask returned empty audio blob");
      }

      console.log("🔗 Creating audio URL...");
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log("🔗 Audio URL created:", audioUrl.substring(0, 50) + "...");

      // Clean up previous audio
      if (audioRef.current) {
        console.log("🧹 Cleaning up previous audio");
        audioRef.current.pause();
        audioRef.current = null;
      }

      console.log("🎵 Creating new Audio object...");
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Set up audio event handlers
      audio.onloadstart = () => {
        console.log("📥 Audio loading started");
      };

      audio.onloadeddata = () => {
        console.log("✅ Audio data loaded successfully");
      };

      audio.oncanplay = () => {
        console.log("▶️ Audio ready to play");
      };

      audio.onended = () => {
        console.log("🏁 Audio playback ended");
        setIsSpeaking(false);
        setCurrentSpeakingMessageId(null);
        URL.revokeObjectURL(audioUrl);
        if (isVoiceMode && !isListening) {
          console.log("🔄 Restarting listening after TTS...");
          setTimeout(() => {
            if (isVoiceMode && !isSpeaking) {
              startContinuousListening();
            }
          }, 500);
        }
      };

      audio.onerror = (audioError) => {
        console.error("❌ Audio playback error:", audioError);
        console.error("❌ Audio error details:", {
          error: audioError,
          audioSrc: audio.src,
          readyState: audio.readyState,
          networkState: audio.networkState,
        });
        setIsSpeaking(false);
        setVoiceError("Audio playback failed");
        URL.revokeObjectURL(audioUrl);
        if (isVoiceMode && !isListening) {
          setTimeout(() => {
            if (isVoiceMode && !isSpeaking) {
              startContinuousListening();
            }
          }, 1000);
        }
      };

      audio.onplay = () => {
        console.log("▶️ Audio playback started");
      };

      console.log("🎵 Attempting to play audio...");

      // Try to play the audio
      try {
        await audio.play();
        console.log("✅ TTS audio playing successfully!");
      } catch (playError) {
        console.error("❌ Audio play() failed:", playError);

        // Check if it's an autoplay policy issue
        if (
          playError instanceof Error &&
          playError.name === "NotAllowedError"
        ) {
          setVoiceError(
            "Audio blocked by browser. Please interact with the page first."
          );
          console.log("🚫 Autoplay blocked - user interaction required");
        } else {
          throw playError;
        }
      }
    } catch (error) {
      console.error("❌ TTS Error:", error);

      // More detailed error information
      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.error("🌐 Network error - Flask server may not be running");
        setVoiceError(
          "Cannot connect to TTS server. Please check your internet connection."
        );
      } else if (error instanceof Error) {
        console.error("❌ Error details:", error.message, error.stack);
        setVoiceError(error.message);
      } else {
        setVoiceError("Unknown TTS error occurred");
      }

      setIsSpeaking(false);
      if (isVoiceMode && !isListening) {
        setTimeout(() => {
          if (isVoiceMode && !isSpeaking) {
            startContinuousListening();
          }
        }, 1000);
      }
    }
  };

  // Continuous Speech Recognition
  const startContinuousListening = () => {
    if (!("webkitSpeechRecognition" in window)) {
      setVoiceError("Speech recognition not supported in this browser");
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceError("");
      setInterimTranscript("");

      // Stop any ongoing TTS when user starts speaking
      if (isSpeaking) {
        console.log("🛑 User started speaking - stopping TTS");
        stopTTS();
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
      // Restart if voice mode is still on and not currently speaking
      if (isVoiceMode && !isSpeaking) {
        setTimeout(() => {
          if (isVoiceMode && !isSpeaking) {
            startContinuousListening();
          }
        }, 100);
      }
    };

    recognition.onresult = (event: SpeechRecognitionEventResult) => {
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
        console.log(
          "🎙️ Speech recognition sending message with voice mode:",
          isVoiceMode
        );
        sendMessage(finalTranscript.trim(), true); // Force voice mode true since this comes from speech recognition
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event);
      setVoiceError("Speech recognition error occurred");
      setIsListening(false);
      setInterimTranscript("");

      // Try to restart after a brief delay if voice mode is still on
      if (isVoiceMode) {
        setTimeout(() => {
          if (isVoiceMode && !isSpeaking) {
            startContinuousListening();
          }
        }, 1000);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript("");
  };

  const toggleVoiceMode = () => {
    console.log("🎛️ toggleVoiceMode called, current state:", isVoiceMode);

    if (isVoiceMode) {
      // Turn off voice mode
      console.log("❌ Turning OFF voice mode");
      setIsVoiceMode(false);
      stopListening();
      if (audioRef.current) {
        audioRef.current.pause();
        setIsSpeaking(false);
      }
    } else {
      // Turn on voice mode
      console.log("✅ Turning ON voice mode");
      setIsVoiceMode(true);
      startContinuousListening();
    }

    // Log the new state after a brief delay to ensure state update
    setTimeout(() => {
      console.log("🎛️ Voice mode state after toggle:", !isVoiceMode);
    }, 100);
  };

  // Enhanced sendMessage with TTS response for voice mode
  const sendMessage = async (content: string, forceVoiceMode?: boolean) => {
    if (!content.trim() || isLoading) return;

    // Capture voice mode state at the time of sending
    const currentVoiceMode =
      forceVoiceMode !== undefined ? forceVoiceMode : isVoiceMode;

    console.log("📤 sendMessage called with:");
    console.log("🎙️ Voice mode state (current):", isVoiceMode);
    console.log("🎙️ Voice mode state (captured):", currentVoiceMode);
    console.log("💬 Message:", content.substring(0, 50) + "...");

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    // Stop listening temporarily while processing
    if (currentVoiceMode && isListening) {
      console.log("⏸️ Stopping listening during processing");
      stopListening();
    }

    try {
      const context = {
        currentMode,
        currentTranslation,
        sourceLanguage,
        targetLanguage,
        isVoiceMode: currentVoiceMode,
      };

      // Include the current user message in conversation history for better context
      const fullConversationHistory = [
        ...messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: userMessage.role,
          content: userMessage.content,
        },
      ];

      console.log("Sending to chatbot API:", {
        message: content,
        context,
        conversationHistory: fullConversationHistory,
      });

      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: content,
          context,
          conversationHistory: fullConversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Speak the response if voice mode is active
      console.log("🎙️ Checking voice mode for TTS:");
      console.log("  - isVoiceMode (current state):", isVoiceMode);
      console.log("  - currentVoiceMode (captured):", currentVoiceMode);

      if (currentVoiceMode) {
        console.log("🎤 Voice mode is ACTIVE! Starting TTS...");
        console.log(
          "🗣️ AI Response to speak:",
          data.response.substring(0, 100) + "..."
        );
        console.log("🌐 Target language:", targetLanguage || "en");
        console.log("📱 Current mode:", currentMode);

        try {
          console.log("🔊 Calling speakText function...");
          await speakText(data.response, content);
          console.log("✅ speakText completed successfully");
        } catch (ttsError) {
          console.error("❌ TTS Error in voice mode:", ttsError);
          setVoiceError(
            "Failed to speak response: " +
              (ttsError instanceof Error ? ttsError.message : "Unknown error")
          );
          // Also show the error visually
          alert(
            "TTS Error: " +
              (ttsError instanceof Error ? ttsError.message : "Unknown error")
          );
        }
      } else {
        console.log("🔇 Voice mode is OFF - no audio response");
        console.log("  (This might be due to React state timing)");
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I apologize, but I'm having trouble responding right now. Please try again in a moment, or check your connection.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);

      // Speak error message if voice mode is active
      if (currentVoiceMode) {
        await speakText(
          "I'm having trouble responding right now. Please try again.",
          content
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputMessage);
    }
  };

  // Legacy single voice input (for when not in voice mode)
  const startVoiceInput = () => {
    if ("webkitSpeechRecognition" in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);

      recognition.onresult = (event: SpeechRecognitionEventResult) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.start();
    }
  };

  const copyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setInputMessage("");
  };

  // const getModeIcon = () => {
  //   switch (currentMode) {
  //     case "main":
  //       return <Volume2 className="w-3 h-3" />;
  //     case "translate":
  //       return <MessageCircle className="w-3 h-3" />;
  //     case "speech":
  //       return <Mic className="w-3 h-3" />;
  //     default:
  //       return <Bot className="w-3 h-3" />;
  //   }
  // };

  // const getModeLabel = () => {
  //   switch (currentMode) {
  //     case "main":
  //       return "Audio Translator";
  //     case "translate":
  //       return "Text Translator";
  //     case "speech":
  //       return "File to Text";
  //     default:
  //       return "General";
  //   }
  // };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{
              scale: 1,
              opacity: 1,
              y: 0,
              transition: {
                type: "spring",
                stiffness: 300,
                damping: 20,
              },
            }}
            exit={{
              scale: 0,
              opacity: 0,
              y: 20,
              transition: { duration: 0.2 },
            }}
            whileHover={{
              scale: 1.05,
              transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 20px rgba(59, 130, 246, 0.3)",
                  "0 0 30px rgba(147, 51, 234, 0.4)",
                  "0 0 20px rgba(59, 130, 246, 0.3)",
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="rounded-full"
            >
              <Button
                onClick={() => setIsOpen(true)}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 shadow-2xl text-white border-0 transition-all duration-300 relative overflow-hidden group"
                size="icon"
              >
                {/* Animated background */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-100"
                  animate={{
                    background: [
                      "linear-gradient(45deg, rgb(59, 130, 246), rgb(147, 51, 234), rgb(236, 72, 153))",
                      "linear-gradient(90deg, rgb(147, 51, 234), rgb(236, 72, 153), rgb(59, 130, 246))",
                      "linear-gradient(135deg, rgb(236, 72, 153), rgb(59, 130, 246), rgb(147, 51, 234))",
                      "linear-gradient(45deg, rgb(59, 130, 246), rgb(147, 51, 234), rgb(236, 72, 153))",
                    ],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />

                {/* Icon with pulse animation */}
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="relative z-10"
                >
                  <MessageCircle className="w-7 h-7" />
                </motion.div>

                {/* Sparkles with staggered animation */}
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute -top-1 -right-1 z-20"
                >
                  <Sparkles className="w-4 h-4 text-yellow-300 drop-shadow-lg" />
                </motion.div>

                {/* Secondary sparkle */}
                <motion.div
                  animate={{
                    scale: [1, 0.8, 1],
                    opacity: [1, 0.5, 1],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1,
                  }}
                  className="absolute -bottom-1 -left-1 z-20"
                >
                  <Sparkles className="w-3 h-3 text-blue-200 drop-shadow-lg" />
                </motion.div>
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Dialog */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{
              scale: 0.9,
              opacity: 0,
              y: 40,
              rotateX: -15,
            }}
            animate={{
              scale: 1,
              opacity: 1,
              y: 0,
              rotateX: 0,
              transition: {
                type: "spring",
                stiffness: 300,
                damping: 25,
                duration: 0.4,
              },
            }}
            exit={{
              scale: 0.9,
              opacity: 0,
              y: 40,
              rotateX: -15,
              transition: { duration: 0.3 },
            }}
            whileHover={{
              scale: 1.01,
              transition: { duration: 0.2 },
            }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex justify-center sm:justify-end w-full sm:w-auto"
            style={{ perspective: "1000px" }}
          >
            <Card
              className={`${
                isMinimized
                  ? "w-96 h-20 max-w-[calc(100vw-3rem)] mx-auto sm:mx-0"
                  : "w-[calc(100vw-2rem)] max-w-[480px] sm:w-[480px] h-[calc(100vh-8rem)] max-h-[650px] sm:h-[650px] mx-auto sm:mx-0"
              } shadow-2xl shadow-blue-500/10 dark:shadow-purple-500/20 border border-white/10 dark:border-gray-800/50 bg-transparent backdrop-blur-xl transition-all duration-500 ease-out overflow-hidden relative ring-1 ring-white/20 dark:ring-gray-800/30`}
            >
              {/* Enhanced sophisticated gradient background - always visible */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-950 dark:via-black dark:to-gray-900 rounded-lg" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(59,130,246,0.08),transparent_60%)] dark:bg-[radial-gradient(circle_at_30%_40%,rgba(59,130,246,0.12),transparent_60%)] rounded-lg" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(99,102,241,0.06),transparent_60%)] dark:bg-[radial-gradient(circle_at_70%_20%,rgba(147,51,234,0.12),transparent_60%)] rounded-lg" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(168,85,247,0.05),transparent_60%)] dark:bg-[radial-gradient(circle_at_20%_80%,rgba(236,72,153,0.10),transparent_60%)] rounded-lg" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.03),transparent_70%)] dark:bg-[radial-gradient(circle_at_80%_80%,rgba(245,101,101,0.08),transparent_70%)] rounded-lg" />
              <div
                className={`absolute inset-0 rounded-lg ${
                  isMinimized
                    ? "bg-gradient-to-r from-blue-500/10 via-purple-500/15 to-pink-500/10 dark:from-blue-500/20 dark:via-purple-500/25 dark:to-pink-500/20"
                    : "bg-gradient-to-t from-transparent via-transparent to-blue-100/30 dark:to-white/5"
                }`}
              />

              {/* Header with glassmorphism effect */}
              <CardHeader
                className={`${
                  isMinimized
                    ? "pb-2 pt-3 px-4 border-b-0"
                    : "pb-4 pt-4 px-6 border-b border-border/30"
                } bg-white/95 dark:bg-black/95 backdrop-blur-xl relative z-10`}
              >
                <div
                  className={`flex items-center justify-between ${
                    isMinimized ? "py-1 px-1" : "px-0"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    {!isMinimized && (
                      <div>
                        <CardTitle className="text-base font-jetbrains-mono font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                          TranslateHub AI
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Smart multilingual assistant
                        </p>
                      </div>
                    )}
                    {isMinimized && (
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-base font-jetbrains-mono font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                          TranslateHub AI
                        </CardTitle>
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{
                            duration: 8,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          <Sparkles className="w-4 h-4 text-purple-400" />
                        </motion.div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsMinimized(!isMinimized)}
                      className="h-8 w-8 rounded-lg hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-200"
                    >
                      {isMinimized ? (
                        <Maximize2 className="w-4 h-4" />
                      ) : (
                        <Minimize2 className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      className="h-8 w-8 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-all duration-200"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {!isMinimized && (
                <>
                  {/* Messages */}
                  <CardContent className="p-0 flex-1 overflow-hidden relative z-10 bg-white/30 dark:bg-black/30 backdrop-blur-sm">
                    <div className="h-[450px] sm:h-[450px] overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.role === "user"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl p-4 backdrop-blur-sm border shadow-lg group ${
                              message.role === "user"
                                ? "bg-gradient-to-r from-blue-500/95 to-purple-500/95 text-white border-white/20 shadow-blue-500/20"
                                : "bg-gradient-to-br from-white/95 via-gray-50/90 to-blue-50/80 dark:from-gray-800/95 dark:via-gray-700/85 dark:to-gray-900/90 text-foreground border-gray-200/40 dark:border-gray-600/40 shadow-gray-100/50 dark:shadow-purple-900/15"
                            }`}
                          >
                            <div className="flex items-start space-x-2">
                              {message.role === "assistant" && (
                                <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              )}
                              {message.role === "user" && (
                                <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="flex-1">
                                <div
                                  className="text-sm leading-normal space-y-0.5 antialiased font-medium [&_h3]:rounded [&_h3]:shadow-sm [&_code]:shadow-sm"
                                  dangerouslySetInnerHTML={{
                                    __html: parseMarkdown(message.content),
                                  }}
                                />
                                <div className="flex items-center justify-between mt-2">
                                  <span
                                    className={`text-xs font-light tracking-wider ${
                                      message.role === "user"
                                        ? "text-white/70"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {message.timestamp.toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  {message.role === "assistant" && (
                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          // Find the most recent user message before this AI response for context
                                          const messageIndex =
                                            messages.indexOf(message);
                                          const contextMessage = messages
                                            .slice(0, messageIndex)
                                            .reverse()
                                            .find((m) => m.role === "user");
                                          speakText(
                                            message.content,
                                            contextMessage?.content || "",
                                            message.id
                                          );
                                        }}
                                        disabled={isSpeaking}
                                        className="h-6 w-6 hover:bg-blue-500/20 hover:text-blue-600"
                                        title="Listen to this response"
                                      >
                                        {currentSpeakingMessageId ===
                                        message.id ? (
                                          <Volume2 className="w-3 h-3 text-blue-500" />
                                        ) : (
                                          <Volume2 className="w-3 h-3" />
                                        )}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          copyMessage(
                                            message.content,
                                            message.id
                                          )
                                        }
                                        className="h-6 w-6 hover:bg-gray-500/20"
                                        title="Copy message"
                                      >
                                        {copiedMessageId === message.id ? (
                                          <Check className="w-3 h-3" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-gradient-to-br from-white/95 via-gray-50/90 to-blue-50/80 dark:from-gray-800/95 dark:via-gray-700/85 dark:to-gray-900/90 text-foreground rounded-2xl p-4 max-w-[85%] backdrop-blur-sm border border-gray-200/40 dark:border-gray-600/40 shadow-lg shadow-gray-100/50 dark:shadow-purple-900/15">
                            <div className="flex items-center space-x-3">
                              <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              <Loader2 className="w-5 h-5 animate-spin text-purple-600 dark:text-purple-400" />
                              <span className="text-sm font-medium tracking-wide">
                                Thinking...
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </CardContent>

                  {/* Quick Actions */}
                  {messages.length <= 1 && (
                    <div className="px-6 py-3 border-t border-border/30 bg-white/80 dark:bg-black/80 backdrop-blur-sm relative z-10">
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Quick Actions
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {getQuickActions()
                            .slice(0, 2)
                            .map((action, index) => (
                              <Button
                                key={index}
                                variant="ghost"
                                size="sm"
                                onClick={() => sendMessage(action)}
                                className="text-xs h-8 px-3 rounded-lg font-medium tracking-wide bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-800/30 dark:hover:to-purple-800/30 border border-blue-200/50 dark:border-blue-700/30 transition-all duration-200"
                              >
                                {action.length > 28
                                  ? `${action.slice(0, 28)}...`
                                  : action}
                              </Button>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Voice Mode Status Bar */}
                  {isVoiceMode && (
                    <div className="px-4 py-2 border-t border-border/50 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 backdrop-blur-sm relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            {isListening ? (
                              <>
                                <motion.div
                                  animate={{ scale: [1, 1.3, 1] }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                  className="w-2 h-2 bg-red-500 rounded-full shadow-sm"
                                />
                                <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                  Listening
                                </span>
                              </>
                            ) : isSpeaking ? (
                              <>
                                <motion.div
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{
                                    duration: 0.8,
                                    repeat: Infinity,
                                  }}
                                  className="w-2 h-2 bg-blue-500 rounded-full shadow-sm"
                                />
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                  Speaking
                                </span>
                              </>
                            ) : (
                              <>
                                <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm" />
                                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                  Ready
                                </span>
                              </>
                            )}
                          </div>
                          {interimTranscript && (
                            <div className="flex items-center space-x-1 bg-white/50 dark:bg-gray-800/50 rounded-full px-2 py-1">
                              <span className="text-xs text-muted-foreground italic max-w-48 truncate">
                                &ldquo;{interimTranscript}&rdquo;
                              </span>
                            </div>
                          )}
                        </div>
                        {voiceError && (
                          <div className="flex items-center space-x-1 text-orange-500 text-xs bg-orange-50 dark:bg-orange-900/20 rounded-full px-2 py-1">
                            <VolumeX className="w-3 h-3" />
                            <span className="max-w-32 truncate">
                              {voiceError}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Input */}
                  <div className="p-4 border-t border-border/50 bg-white/90 dark:bg-black/95 backdrop-blur-xl relative z-10">
                    <div className="flex items-end space-x-3">
                      <div className="flex-1 relative">
                        <textarea
                          ref={inputRef}
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder={
                            isVoiceMode
                              ? "🎙️ Speak to chat..."
                              : "Ask about translations, languages..."
                          }
                          className="w-full resize-none rounded-xl border border-white/30 dark:border-gray-600/40 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-3 text-sm font-medium tracking-wide placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:focus:ring-purple-500/40 focus:border-blue-500/40 dark:focus:border-purple-500/40 transition-all duration-300 max-h-24 shadow-lg shadow-black/5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                          rows={1}
                          disabled={isLoading || isVoiceMode}
                        />
                        {isLoading && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {/* Voice Mode Toggle */}
                        <Button
                          variant={isVoiceMode ? "default" : "ghost"}
                          size="icon"
                          onClick={toggleVoiceMode}
                          disabled={isLoading}
                          className={`h-11 w-11 rounded-xl transition-all duration-300 ${
                            isVoiceMode
                              ? "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg shadow-red-500/25"
                              : "hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 border border-transparent hover:border-blue-500/20"
                          }`}
                          title={
                            isVoiceMode ? "Stop voice mode" : "Start voice mode"
                          }
                        >
                          {isVoiceMode ? (
                            <motion.div
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              <MicOff className="w-5 h-5" />
                            </motion.div>
                          ) : (
                            <Mic className="w-5 h-5" />
                          )}
                        </Button>

                        {/* Traditional single voice input (only when not in voice mode) */}
                        {!isVoiceMode && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={startVoiceInput}
                            disabled={isLoading || isListening}
                            className="h-11 w-11 rounded-xl hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 border border-transparent hover:border-purple-500/20 transition-all duration-300"
                            title="Single voice input"
                          >
                            {isListening ? (
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                              >
                                <Volume2 className="w-5 h-5 text-red-500" />
                              </motion.div>
                            ) : (
                              <Volume2 className="w-5 h-5" />
                            )}
                          </Button>
                        )}

                        <Button
                          onClick={() => sendMessage(inputMessage)}
                          disabled={
                            !inputMessage.trim() || isLoading || isVoiceMode
                          }
                          className="h-11 w-11 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
                          size="icon"
                        >
                          <Send className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center space-x-2">
                        {messages.length > 1 &&
                          messages[messages.length - 1]?.role ===
                            "assistant" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const lastAIMessage =
                                  messages[messages.length - 1];
                                const contextMessage = messages
                                  .slice(0, -1)
                                  .reverse()
                                  .find((m) => m.role === "user");
                                speakText(
                                  lastAIMessage.content,
                                  contextMessage?.content || ""
                                );
                              }}
                              disabled={isSpeaking}
                              className="text-xs h-6 px-2 font-medium tracking-wide hover:font-semibold transition-all hover:bg-blue-500/10 hover:text-blue-500"
                            >
                              {isSpeaking ? (
                                <Volume2 className="w-3 h-3 mr-1 text-blue-500" />
                              ) : (
                                <Volume2 className="w-3 h-3 mr-1" />
                              )}
                              Replay
                            </Button>
                          )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearChat}
                        className="text-xs h-6 px-2 font-medium tracking-wide hover:font-semibold transition-all hover:bg-red-500/10 hover:text-red-500"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Clear Chat
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

export default ChatBot;
