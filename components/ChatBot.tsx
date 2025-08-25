"use client";

import React, { useState, useRef, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Pause,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";

// Function to strip markdown syntax for TTS
const stripMarkdown = (text: string) => {
  return (
    text
      // Remove headings
      .replace(/^#{1,6}\s+(.+)$/gm, "$1")
      // Remove numbered sections with bold titles: 1. **Title:**
      .replace(/^(\d+)\.\s?\*\*(.*?)\*\*:?/gm, "$1. $2.")
      // Remove bold text: **text** -> text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      // Remove italic text: *text* -> text
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
      // Remove code blocks: `code` -> code
      .replace(/`([^`]+)`/g, "$1")
      // Remove bullet points markers: - text -> text
      .replace(/^[\s]*-\s+(.+)$/gm, "$1")
      // Clean up extra line breaks
      .replace(/\n\n+/g, "\n")
      .replace(/\n/g, " ")
      // Clean up extra spaces
      .replace(/\s+/g, " ")
      .trim()
  );
};

// Enhanced markdown parser for chat messages
const parseMarkdown = (text: string) => {
  return (
    text
      // ### Headings
      .replace(
        /^###\s+(.+)$/gm,
        '<h3 class="font-bold text-purple-600 dark:text-purple-400 mt-3 mb-2 text-lg border-l-4 border-purple-500 pl-3 bg-purple-50/50 dark:bg-purple-900/20 py-1 rounded-r break-words">$1</h3>'
      )
      // Numbered sections with bold titles: 1. **Title:**
      .replace(
        /^(\d+)\.\s?\*\*(.*?)\*\*$/gm,
        '<div class="font-semibold text-blue-600 dark:text-blue-400 mt-2 mb-1 text-base break-words">$1. $2</div>'
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
        '<div class="flex items-start ml-4 my-0.5"><span class="text-blue-600 dark:text-blue-400 mr-2 mt-0.5 font-bold flex-shrink-0">•</span><span class="text-gray-700 dark:text-gray-300 break-words flex-1">$1</span></div>'
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
  // External state control props
  isOpen?: boolean;
  isMinimized?: boolean;
  onToggle?: () => void;
  onMinimize?: () => void;
}

// Conversation mode presets
const conversationModes = [
  {
    id: "general",
    name: "General Chat",
    description: "Natural conversation in any language",
    icon: "💬",
    systemPrompt:
      "You are a helpful conversational AI. Be natural, engaging, and adapt to the user's language.",
  },
  {
    id: "language-practice",
    name: "Language Practice",
    description: "Practice speaking in a target language",
    icon: "🎯",
    systemPrompt:
      "You are a language practice partner. Help the user practice by having natural conversations, gently correcting mistakes, and providing helpful feedback.",
  },
  {
    id: "cultural-guide",
    name: "Cultural Guide",
    description: "Learn about cultures and customs",
    icon: "🌍",
    systemPrompt:
      "You are a cultural guide. Share insights about cultures, customs, traditions, and help users understand cultural contexts.",
  },
  {
    id: "translation-helper",
    name: "Translation Helper",
    description: "Get help with translations and meanings",
    icon: "📝",
    systemPrompt:
      "You are a translation expert. Help users understand translations, provide alternatives, explain nuances, and suggest better phrasing.",
  },
  {
    id: "pronunciation-coach",
    name: "Pronunciation Coach",
    description: "Focus on pronunciation and speaking",
    icon: "🗣️",
    systemPrompt:
      "You are a pronunciation coach. Focus on helping users improve their pronunciation, speaking clarity, and oral communication skills.",
  },
];

const ChatBot = memo(function ChatBot({
  currentMode,
  currentTranslation,
  sourceLanguage,
  targetLanguage,
  isOpen: externalIsOpen,
  isMinimized: externalIsMinimized,
  onToggle: externalOnToggle,
  onMinimize: externalOnMinimize,
}: ChatBotProps) {
  const { data: session } = useSession();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [internalIsMinimized, setInternalIsMinimized] = useState(false);

  // Use external state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const isMinimized =
    externalIsMinimized !== undefined
      ? externalIsMinimized
      : internalIsMinimized;

  const setIsOpen = externalOnToggle || setInternalIsOpen;
  const setIsMinimized = externalOnMinimize || setInternalIsMinimized;
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

  // Enhanced conversation features
  const [conversationMode, setConversationMode] = useState("general");
  const [conversationLanguage, setConversationLanguage] = useState("auto");
  const [isPushToTalk, setIsPushToTalk] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionAPI | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Quick action suggestions based on current mode
  // const getQuickActions = () => {
  //   const baseActions = [
  //     "How can I improve my translation accuracy?",
  //     "Explain the cultural context of this phrase",
  //     "What are alternative ways to say this?",
  //     "Help me with pronunciation",
  //   ];

  //   switch (currentMode) {
  //     case "main":
  //       return [
  //         "How do I optimize voice recording quality?",
  //         "Why isn't my audio being translated correctly?",
  //         "Can you help with real-time conversation tips?",
  //         ...baseActions,
  //       ];
  //     case "translate":
  //       return [
  //         "How can I make this translation more formal?",
  //         "What's the difference between these language variants?",
  //         "Help me improve this text's style",
  //         ...baseActions,
  //       ];
  //     case "speech":
  //       return [
  //         "What audio formats work best?",
  //         "How can I improve transcription accuracy?",
  //         "Help with file processing issues",
  //         ...baseActions,
  //       ];
  //     default:
  //       return baseActions;
  //   }
  // };

  const scrollToBottom = () => {
    if (messages.length === 1) {
      // For welcome message, scroll to top to ensure it's visible
      const messagesContainer = messagesEndRef.current?.parentElement;
      if (messagesContainer) {
        messagesContainer.scrollTop = 0;
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    // Small delay to ensure DOM is updated
    setTimeout(() => {
      scrollToBottom();
    }, 50);
  }, [messages]);

  // This welcome message logic is now handled in the state consistency useEffect below

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
    setCurrentSpeakingMessageId(null);
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

      const ttsUrl = "http://3.109.5.241:8000/tts";

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

  // Enhanced sendMessage with conversation mode context
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
      const selectedMode = conversationModes.find(
        (m) => m.id === conversationMode
      );
      const context = {
        currentMode,
        currentTranslation,
        sourceLanguage,
        targetLanguage,
        isVoiceMode: currentVoiceMode,
        conversationMode: conversationMode,
        conversationLanguage: conversationLanguage,
        systemPrompt: selectedMode?.systemPrompt,
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
          await speakText(stripMarkdown(data.response), content);
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
    // Reset all chat-related states but keep the dialog open
    setIsLoading(false);
    setIsListening(false);
    setCopiedMessageId(null);
    setVoiceError("");
    setInterimTranscript("");
    setInputMessage("");

    // Create the welcome message immediately
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: `Hi ${session?.user?.name || "there"}! 👋 How can I help?`,
      timestamp: new Date(),
    };

    // Set the welcome message directly - this ensures we always have content
    setMessages([welcomeMessage]);

    // Ensure the chat stays open and functional after clearing
    if (!isOpen) {
      setIsOpen(true);
    }
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

  // Ensure chat state consistency and proper initialization
  useEffect(() => {
    // If chat is open but somehow got into an invalid state, reset it
    if (isOpen && isMinimized === undefined) {
      setIsMinimized(false);
    }

    // Ensure we have a welcome message when chat opens
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Hi ${session?.user?.name || "there"}! 👋 How can I help?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [
    isOpen,
    isMinimized,
    messages.length,
    session?.user?.name,
    conversationMode,
  ]);

  return (
    <>
      {/* Custom CSS for scrollbar hiding */}
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: {
                type: "spring",
                stiffness: 300,
                damping: 20,
              },
            }}
            exit={{
              opacity: 0,
              y: 20,
              transition: { duration: 0.2 },
            }}
            className="fixed bottom-6 right-6 z-50"
          >
            <div className="rounded-full">
              <Button
                onClick={() => {
                  setIsOpen(true);
                  setIsMinimized(false);
                  // Ensure we have a welcome message
                  if (messages.length === 0) {
                    const welcomeMessage: Message = {
                      id: Date.now().toString(),
                      role: "assistant",
                      content: `Hi ${
                        session?.user?.name || "there"
                      }! 👋 How can I help?`,
                      timestamp: new Date(),
                    };
                    setMessages([welcomeMessage]);
                  }
                }}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 shadow-2xl text-white border-0 transition-all duration-300 relative overflow-hidden group"
                size="icon"
              >
                {/* Static background */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-100" />

                {/* Icon with pulse animation */}
                <div className="relative z-10">
                  <MessageCircle className="w-7 h-7" />
                </div>

                {/* Sparkles with staggered animation */}
                <div className="absolute -top-1 -right-1 z-20">
                  <Sparkles className="w-4 h-4 text-yellow-300 drop-shadow-lg" />
                </div>

                {/* Secondary sparkle */}
                <div className="absolute -bottom-1 -left-1 z-20">
                  <Sparkles className="w-3 h-3 text-blue-200 drop-shadow-lg" />
                </div>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Dialog */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            key="chat-dialog"
            initial={{
              scale: 0.95,
              opacity: 0,
              y: 20,
            }}
            animate={{
              scale: 1,
              opacity: 1,
              y: 0,
              transition: {
                type: "spring",
                stiffness: 300,
                damping: 25,
                duration: 0.3,
              },
            }}
            exit={{
              scale: 0.95,
              opacity: 0,
              y: 20,
              transition: { duration: 0.2 },
            }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex justify-center sm:justify-end w-full sm:w-auto"
          >
            <Card
              className={`${
                isMinimized
                  ? "w-96 h-20 max-w-[calc(100vw-3rem)] mx-auto sm:mx-0"
                  : "w-[calc(100vw-2rem)] max-w-[480px] sm:w-[480px] h-[calc(100vh-8rem)] max-h-[600px] sm:h-[600px] mx-auto sm:mx-0"
              } shadow-2xl shadow-blue-500/20 dark:shadow-purple-500/30 border border-white/20 dark:border-gray-800/60 bg-white/95 dark:bg-gray-950/95 transition-all duration-500 ease-out overflow-hidden relative ring-1 ring-white/30 dark:ring-gray-700/50 flex flex-col`}
            >
              {/* Modern gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-gray-950/80 dark:via-black/60 dark:to-gray-900/80 rounded-lg" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(59,130,246,0.1),transparent_60%)] dark:bg-[radial-gradient(circle_at_30%_40%,rgba(59,130,246,0.15),transparent_60%)] rounded-lg" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(147,51,234,0.08),transparent_60%)] dark:bg-[radial-gradient(circle_at_70%_20%,rgba(147,51,234,0.12),transparent_60%)] rounded-lg" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(236,72,153,0.06),transparent_60%)] dark:bg-[radial-gradient(circle_at_20%_80%,rgba(236,72,153,0.10),transparent_60%)] rounded-lg" />

              {/* Header with modern glassmorphism */}
              <CardHeader
                className={`${
                  isMinimized
                    ? "pb-2 pt-3 px-4 border-b-0"
                    : "pb-3 pt-3 px-4 border-b border-white/20 dark:border-gray-700/50"
                } bg-white/90 dark:bg-gray-900/90 relative z-20 !block !visible !opacity-100 flex-shrink-0`}
                style={
                  {
                    display: "block",
                    visibility: "visible",
                    opacity: 1,
                    position: "relative",
                    minHeight: "fit-content",
                  } as React.CSSProperties
                }
              >
                <div
                  className={`flex items-center justify-between ${
                    isMinimized ? "py-1 px-1" : "px-0"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400" />
                      <Bot className="w-4 h-4 text-white relative z-10" />
                    </div>
                    {!isMinimized && (
                      <div>
                        <CardTitle className="text-base font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                          TranslateHub AI
                        </CardTitle>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 font-medium">
                          {
                            conversationModes.find(
                              (m) => m.id === conversationMode
                            )?.name
                          }
                        </p>
                      </div>
                    )}
                    {isMinimized && (
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-base font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                          TranslateHub AI
                        </CardTitle>
                        <Sparkles className="w-4 h-4 text-purple-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newMinimizedState = !isMinimized;
                        setIsMinimized(newMinimizedState);
                        // Ensure the chat stays open when toggling minimize
                        if (!isOpen) {
                          setIsOpen(true);
                        }
                      }}
                      className="h-7 w-7 rounded-lg hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-200"
                    >
                      {isMinimized ? (
                        <Maximize2 className="w-3 h-3" />
                      ) : (
                        <Minimize2 className="w-3 h-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        // Ensure proper cleanup when closing
                        setIsOpen(false);
                        setIsMinimized(false);
                        // Reset voice mode if active
                        if (isVoiceMode) {
                          setIsVoiceMode(false);
                          stopListening();
                          if (audioRef.current) {
                            audioRef.current.pause();
                            setIsSpeaking(false);
                          }
                        }
                      }}
                      className="h-7 w-7 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-all duration-200"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {!isMinimized && (
                <>
                  {/* Modern Conversation Mode Selector */}
                  <div className="px-4 py-3 border-b border-white/20 dark:border-gray-700/50 bg-gradient-to-r from-white/90 via-blue-50/30 to-purple-50/30 dark:from-gray-900/90 dark:via-blue-900/20 dark:to-purple-900/20 relative z-10">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Mode
                      </h4>
                      <div className="flex items-center space-x-3">
                        <div className="relative group">
                          <Select
                            value={conversationMode}
                            onValueChange={setConversationMode}
                          >
                            <SelectTrigger className="w-[180px] font-mono bg-gradient-to-r from-white to-blue-50/40 dark:from-gray-800 dark:to-blue-900/20 border border-gray-200/80 dark:border-gray-600/80 rounded-xl focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 transition-all duration-300 shadow-lg hover:shadow-xl group-hover:border-blue-400/80 dark:group-hover:border-blue-500/80 hover:from-blue-50/30 hover:to-blue-100/50 dark:hover:from-gray-700 dark:hover:to-blue-900/30">
                              <SelectValue placeholder="Select Mode" />
                            </SelectTrigger>
                            <SelectContent className="bg-white/95 dark:bg-gray-800/95 border border-gray-200/50 dark:border-gray-600/50 shadow-xl">
                              <SelectGroup>
                                {conversationModes.map((mode) => (
                                  <SelectItem
                                    key={mode.id}
                                    value={mode.id}
                                    className="font-mono text-sm hover:bg-blue-100/50 dark:hover:bg-blue-900/30 focus:bg-blue-100/50 dark:focus:bg-blue-900/30"
                                  >
                                    {mode.icon} {mode.name}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="relative group">
                          <Select
                            value={conversationLanguage}
                            onValueChange={setConversationLanguage}
                          >
                            <SelectTrigger className="w-[180px] font-mono bg-gradient-to-r from-white to-purple-50/40 dark:from-gray-800 dark:to-purple-900/20 border border-gray-200/80 dark:border-gray-600/80 rounded-xl focus:ring-2 focus:ring-purple-500/60 focus:border-purple-500/60 transition-all duration-300 shadow-lg hover:shadow-xl group-hover:border-purple-400/80 dark:group-hover:border-purple-500/80 hover:from-purple-50/30 hover:to-purple-100/50 dark:hover:from-gray-700 dark:hover:to-purple-900/30">
                              <SelectValue placeholder="Select Language" />
                            </SelectTrigger>
                            <SelectContent className="bg-white/95 dark:bg-gray-800/95 border border-gray-200/50 dark:border-gray-600/50 shadow-xl">
                              <SelectGroup>
                                <SelectItem
                                  value="auto"
                                  className="font-mono text-sm hover:bg-purple-100/50 dark:hover:bg-purple-900/30 focus:bg-purple-100/50 dark:focus:bg-purple-900/30"
                                >
                                  🌐 Auto-detect
                                </SelectItem>
                                <SelectItem
                                  value="en"
                                  className="font-mono text-sm hover:bg-purple-100/50 dark:hover:bg-purple-900/30 focus:bg-purple-100/50 dark:focus:bg-purple-900/30"
                                >
                                  🇺🇸 English
                                </SelectItem>
                                <SelectItem
                                  value="es"
                                  className="font-mono text-sm hover:bg-purple-100/50 dark:hover:bg-purple-900/30 focus:bg-purple-100/50 dark:focus:bg-purple-900/30"
                                >
                                  🇪🇸 Español
                                </SelectItem>
                                <SelectItem
                                  value="fr"
                                  className="font-mono text-sm hover:bg-purple-100/50 dark:hover:bg-purple-900/30 focus:bg-purple-100/50 dark:focus:bg-purple-900/30"
                                >
                                  🇫🇷 Français
                                </SelectItem>
                                <SelectItem
                                  value="de"
                                  className="font-mono text-sm hover:bg-purple-100/50 dark:hover:bg-purple-900/30 focus:bg-purple-100/50 dark:focus:bg-purple-900/30"
                                >
                                  🇩🇪 Deutsch
                                </SelectItem>
                                <SelectItem
                                  value="it"
                                  className="font-mono text-sm hover:bg-purple-100/50 dark:hover:bg-purple-900/30 focus:bg-purple-100/50 dark:focus:bg-purple-900/30"
                                >
                                  🇮🇹 Italiano
                                </SelectItem>
                                <SelectItem
                                  value="pt"
                                  className="font-mono text-sm hover:bg-purple-100/50 dark:hover:bg-purple-900/30 focus:bg-purple-100/50 dark:focus:bg-purple-900/30"
                                >
                                  🇵🇹 Português
                                </SelectItem>
                                <SelectItem
                                  value="ja"
                                  className="font-mono text-sm hover:bg-purple-100/50 dark:hover:bg-purple-900/30 focus:bg-purple-100/50 dark:focus:bg-purple-900/30"
                                >
                                  🇯🇵 日本語
                                </SelectItem>
                                <SelectItem
                                  value="ko"
                                  className="font-mono text-sm hover:bg-purple-100/50 dark:hover:bg-purple-900/30 focus:bg-purple-100/50 dark:focus:bg-purple-900/30"
                                >
                                  🇰🇷 한국어
                                </SelectItem>
                                <SelectItem
                                  value="zh"
                                  className="font-mono text-sm hover:bg-purple-100/50 dark:hover:bg-purple-900/30 focus:bg-purple-100/50 dark:focus:bg-purple-900/30"
                                >
                                  🇨🇳 中文
                                </SelectItem>
                                <SelectItem
                                  value="hi"
                                  className="font-mono text-sm hover:bg-purple-100/50 dark:hover:bg-purple-900/30 focus:bg-purple-100/50 dark:focus:bg-purple-900/30"
                                >
                                  🇮🇳 हिंदी
                                </SelectItem>
                                <SelectItem
                                  value="ar"
                                  className="font-mono text-sm hover:bg-purple-100/50 dark:hover:bg-purple-900/30 focus:bg-purple-100/50 dark:focus:bg-purple-900/30"
                                >
                                  🇸🇦 العربية
                                </SelectItem>
                                <SelectItem
                                  value="ru"
                                  className="font-mono text-sm hover:bg-purple-100/50 dark:hover:bg-purple-900/30 focus:bg-purple-100/50 dark:focus:bg-purple-900/30"
                                >
                                  🇷🇺 Русский
                                </SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modern Messages Container */}
                  <CardContent className="p-0 flex-1 overflow-hidden relative z-10 bg-gradient-to-b from-transparent to-blue-50/20 dark:to-gray-900/20">
                    <div className="h-[280px] sm:h-[280px] overflow-y-auto overflow-x-hidden pt-4 pb-3 px-3 space-y-3 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-400/50 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600/50 dark:[&::-webkit-scrollbar-thumb:hover]:bg-gray-500/50">
                      {messages.map((message, index) => {
                        return (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                            className={`flex w-full ${
                              message.role === "user"
                                ? "justify-end"
                                : "justify-start"
                            } ${index === 0 ? "mt-2" : ""}`}
                          >
                            <div
                              className={`max-w-[70%] sm:max-w-[75%] min-w-0 rounded-2xl p-3 border shadow-xl group ${
                                message.role === "user"
                                  ? "bg-gradient-to-br from-blue-500/95 to-purple-600/95 text-white border-white/30 shadow-blue-500/25"
                                  : "bg-white/95 dark:bg-gray-800/95 text-gray-900 dark:text-gray-100 border-gray-200/50 dark:border-gray-600/50 shadow-gray-200/50 dark:shadow-gray-800/50"
                              } ${
                                index === 0 && message.role === "assistant"
                                  ? "!bg-blue-50/95 dark:!bg-blue-900/30 border-blue-300/50 dark:border-blue-600/50"
                                  : ""
                              }`}
                            >
                              <div className="flex items-start space-x-2 w-full max-w-full">
                                {message.role === "assistant" && (
                                  <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <Bot className="w-2.5 h-2.5 text-white" />
                                  </div>
                                )}
                                {message.role === "user" && (
                                  <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <User className="w-2.5 h-2.5 text-white" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div
                                    className="text-sm leading-relaxed space-y-1 antialiased font-medium break-words overflow-wrap-anywhere hyphens-auto max-w-full overflow-hidden [&_h3]:rounded-lg [&_h3]:shadow-sm [&_code]:shadow-sm [&_div]:break-words [&_span]:break-words"
                                    dangerouslySetInnerHTML={{
                                      __html: parseMarkdown(
                                        message.content || "No content"
                                      ),
                                    }}
                                  />
                                  <div className="flex items-center justify-between mt-2">
                                    <span
                                      className={`text-xs font-medium tracking-wider ${
                                        message.role === "user"
                                          ? "text-white/80"
                                          : "text-gray-500 dark:text-gray-400"
                                      }`}
                                    >
                                      {message.timestamp.toLocaleTimeString(
                                        [],
                                        {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        }
                                      )}
                                    </span>
                                    {message.role === "assistant" && (
                                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            if (
                                              currentSpeakingMessageId ===
                                                message.id &&
                                              isSpeaking
                                            ) {
                                              // Stop the current audio
                                              stopTTS();
                                            } else {
                                              // Find the most recent user message before this AI response for context
                                              const messageIndex =
                                                messages.indexOf(message);
                                              const contextMessage = messages
                                                .slice(0, messageIndex)
                                                .reverse()
                                                .find((m) => m.role === "user");
                                              speakText(
                                                stripMarkdown(message.content),
                                                contextMessage?.content || "",
                                                message.id
                                              );
                                            }
                                          }}
                                          className="h-6 w-6 rounded-full hover:bg-blue-500/20 hover:text-blue-600 transition-all duration-200"
                                          title={
                                            currentSpeakingMessageId ===
                                              message.id && isSpeaking
                                              ? "Stop audio"
                                              : "Listen to this response"
                                          }
                                        >
                                          {currentSpeakingMessageId ===
                                            message.id && isSpeaking ? (
                                            <Pause className="w-2.5 h-2.5 text-red-500" />
                                          ) : (
                                            <Volume2 className="w-2.5 h-2.5" />
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
                                          className="h-6 w-6 rounded-full hover:bg-gray-500/20 transition-all duration-200"
                                          title="Copy message"
                                        >
                                          {copiedMessageId === message.id ? (
                                            <Check className="w-2.5 h-2.5" />
                                          ) : (
                                            <Copy className="w-2.5 h-2.5" />
                                          )}
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                      {isLoading && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex justify-start"
                        >
                          <div className="bg-white/95 dark:bg-gray-800/95 text-gray-900 dark:text-gray-100 rounded-2xl p-3 max-w-[85%] border border-gray-200/50 dark:border-gray-600/50 shadow-xl shadow-gray-200/50 dark:shadow-gray-800/50">
                            <div className="flex items-center space-x-3">
                              <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-sm">
                                <Bot className="w-2.5 h-2.5 text-white" />
                              </div>
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                              <span className="text-sm font-semibold tracking-wide">
                                Thinking...
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </CardContent>

                  {/* Modern Quick Actions */}
                  {/* {messages.length <= 1 && (
                    <div className="px-4 py-3 border-t border-white/20 dark:border-gray-700/50 bg-white/90 dark:bg-gray-900/90 relative z-10">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {getQuickActions()
                            .slice(0, 2)
                            .map((action, index) => (
                              <motion.div
                                key={index}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => sendMessage(action)}
                                  className="text-xs h-7 px-3 rounded-lg font-semibold tracking-wide bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 border border-gray-200/50 dark:border-gray-600/50 transition-all duration-200"
                                >
                                  {action.length > 25
                                    ? `${action.slice(0, 25)}...`
                                    : action}
                                </Button>
                              </motion.div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )} */}

                  {/* Modern Voice Mode Status Bar */}
                  {isVoiceMode && (
                    <div className="px-4 py-3 border-t border-white/20 dark:border-gray-700/50 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            {isListening ? (
                              <>
                                <motion.div
                                  animate={{ opacity: [1, 0.7, 1] }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                  className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm"
                                />
                                <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                                  Listening
                                </span>
                              </>
                            ) : isSpeaking ? (
                              <>
                                <motion.div
                                  animate={{ opacity: [1, 0.7, 1] }}
                                  transition={{
                                    duration: 0.8,
                                    repeat: Infinity,
                                  }}
                                  className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm"
                                />
                                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                  Speaking
                                </span>
                              </>
                            ) : (
                              <>
                                <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-sm" />
                                <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                                  Ready
                                </span>
                              </>
                            )}
                          </div>
                          {interimTranscript && (
                            <div className="flex items-center space-x-2 bg-white/80 dark:bg-gray-800/80 rounded-full px-2 py-1 border border-gray-200/50 dark:border-gray-600/50">
                              <span className="text-xs text-gray-600 dark:text-gray-400 italic max-w-48 truncate">
                                &ldquo;{interimTranscript}&rdquo;
                              </span>
                            </div>
                          )}
                        </div>
                        {voiceError && (
                          <div className="flex items-center space-x-2 text-orange-500 text-xs bg-orange-50 dark:bg-orange-900/20 rounded-full px-2 py-1 border border-orange-200/50 dark:border-orange-700/50">
                            <VolumeX className="w-3 h-3" />
                            <span className="max-w-32 truncate font-medium">
                              {voiceError}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Voice Mode Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant={isPushToTalk ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setIsPushToTalk(!isPushToTalk)}
                            className="text-xs h-6 px-2 rounded-lg font-semibold transition-all duration-200"
                            title="Toggle push-to-talk mode"
                          >
                            {isPushToTalk ? "Push to Talk" : "Continuous"}
                          </Button>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          {conversationLanguage === "auto"
                            ? "Auto-detect"
                            : conversationLanguage.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Modern Input */}
                  <div className="p-4 border-t border-white/20 dark:border-gray-700/50 bg-white/95 dark:bg-gray-900/95 relative z-10">
                    <div className="flex justify-center items-center space-x-2">
                      <div className="flex-1 translate-y-[3px] relative">
                        <textarea
                          ref={inputRef}
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder={
                            isVoiceMode
                              ? isPushToTalk
                                ? "Hold space or mic to speak..."
                                : "Speak to chat..."
                              : "Ask about translations, languages..."
                          }
                          className="w-full resize-none rounded-xl border border-gray-200/50 dark:border-gray-600/50 bg-white/90 dark:bg-gray-800/90 px-3 py-2 text-sm font-medium tracking-wide placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 max-h-20 shadow-lg shadow-gray-200/50 dark:shadow-gray-800/50 scrollbar-hide"
                          rows={1}
                          disabled={isLoading || (isVoiceMode && !isPushToTalk)}
                        />
                        {isLoading && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-1.5">
                        {/* Modern Voice Mode Toggle */}
                        <Button
                          variant={isVoiceMode ? "default" : "ghost"}
                          size="icon"
                          onClick={toggleVoiceMode}
                          disabled={isLoading}
                          className={`h-10 w-10 cursor-pointer rounded-xl transition-all duration-300 ${
                            isVoiceMode
                              ? "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg shadow-red-500/25"
                              : "hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200/50 dark:border-gray-600/50"
                          }`}
                          title={
                            isVoiceMode ? "Stop voice mode" : "Start voice mode"
                          }
                        >
                          {isVoiceMode ? (
                            <MicOff className="w-4 h-4" />
                          ) : (
                            <Mic className="w-4 h-4" />
                          )}
                        </Button>

                        {/* Traditional single voice input (only when not in voice mode) */}
                        {!isVoiceMode && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={startVoiceInput}
                            disabled={isLoading || isListening}
                            className="h-10 w-10 cursor-pointer rounded-xl hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 border border-gray-200/50 dark:border-gray-600/50 transition-all duration-300"
                            title="Single voice input"
                          >
                            {isListening ? (
                              <motion.div
                                animate={{ opacity: [1, 0.7, 1] }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                              >
                                <Volume2 className="w-4 h-4 text-red-500" />
                              </motion.div>
                            ) : (
                              <Volume2 className="w-4 h-4" />
                            )}
                          </Button>
                        )}

                        <Button
                          onClick={() => sendMessage(inputMessage)}
                          disabled={
                            !inputMessage.trim() ||
                            isLoading ||
                            (isVoiceMode && !isPushToTalk)
                          }
                          className="h-10 w-10 cursor-pointer rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
                          size="icon"
                        >
                          <Send className="w-4 h-4" />
                        </Button>

                        {/* Clear Chat Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={clearChat}
                          className="h-10 w-10 cursor-pointer rounded-xl hover:bg-red-500/10 hover:text-red-500 border border-gray-200/50 dark:border-gray-600/50 transition-all duration-300"
                          title="Clear chat"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center ">
                      <div className="flex items-center space-x-2">
                        {messages.length > 1 &&
                          messages[messages.length - 1]?.role ===
                            "assistant" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (isSpeaking) {
                                  // Stop the current audio
                                  stopTTS();
                                } else {
                                  const lastAIMessage =
                                    messages[messages.length - 1];
                                  const contextMessage = messages
                                    .slice(0, -1)
                                    .reverse()
                                    .find((m) => m.role === "user");
                                  speakText(
                                    stripMarkdown(lastAIMessage.content),
                                    contextMessage?.content || "",
                                    lastAIMessage.id
                                  );
                                }
                              }}
                              className="text-xs h-6 px-2 font-semibold tracking-wide hover:font-bold transition-all hover:bg-blue-500/10 hover:text-blue-500 rounded-lg"
                            >
                              {isSpeaking ? (
                                <Pause className="w-3 h-3 mr-1 text-red-500" />
                              ) : (
                                <Volume2 className="w-3 h-3 mr-1" />
                              )}
                              {isSpeaking ? "Stop" : "Replay"}
                            </Button>
                          )}
                      </div>
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
