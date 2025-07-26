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
  // Volume2,
  Copy,
  Check,
  Loader2,
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
  onerror: (() => void) | null;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const context = {
        currentMode,
        currentTranslation,
        sourceLanguage,
        targetLanguage,
      };

      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: content,
          context,
          conversationHistory: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
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
                    : "pb-3 pt-4 px-6 border-b border-border/50"
                } bg-white/80 dark:bg-black/90 backdrop-blur-xl relative z-10`}
              >
                <div
                  className={`flex items-center justify-between ${
                    isMinimized ? "py-2 px-1" : "px-0"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    {!isMinimized && (
                      <div>
                        <CardTitle className="text-sm font-jetbrains-mono">
                          TranslateHub Assistant
                        </CardTitle>
                        {/* <div className="flex items-center space-x-1 mt-1">
                          <Badge
                            variant="outline"
                            className="text-xs py-0 px-2 h-5"
                          >
                            {getModeIcon()}
                            <span className="ml-1">{getModeLabel()}</span>
                          </Badge>
                        </div> */}
                      </div>
                    )}
                    {isMinimized && (
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-base font-jetbrains-mono">
                          TranslateHub AI
                        </CardTitle>
                        <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsMinimized(!isMinimized)}
                      className="h-8 w-8 hover:bg-purple-500/20 transition-colors"
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
                      className="h-8 w-8 hover:bg-red-500/20 transition-colors"
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
                            className={`max-w-[80%] rounded-lg p-3 backdrop-blur-sm border shadow-lg ${
                              message.role === "user"
                                ? "bg-gradient-to-r from-blue-500/90 to-purple-500/90 text-white border-white/10"
                                : "bg-gradient-to-br from-gray-50/95 via-white/90 to-blue-50/80 dark:from-gray-800/90 dark:via-gray-700/80 dark:to-gray-900/90 text-foreground border-gray-200/30 dark:border-gray-600/30 shadow-blue-100/50 dark:shadow-purple-900/20"
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
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        copyMessage(message.content, message.id)
                                      }
                                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      {copiedMessageId === message.id ? (
                                        <Check className="w-3 h-3" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-gradient-to-br from-gray-50/95 via-white/90 to-blue-50/80 dark:from-gray-800/90 dark:via-gray-700/80 dark:to-gray-900/90 text-foreground rounded-lg p-3 max-w-[80%] backdrop-blur-sm border border-gray-200/30 dark:border-gray-600/30 shadow-lg shadow-blue-100/50 dark:shadow-purple-900/20">
                            <div className="flex items-center space-x-2">
                              <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <Loader2 className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400" />
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
                    <div className="px-4 py-2 border-t border-border/50 bg-white/60 dark:bg-black/60 backdrop-blur-sm relative z-10">
                      <div className="flex flex-wrap gap-1">
                        {getQuickActions()
                          .slice(0, 2)
                          .map((action, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              onClick={() => sendMessage(action)}
                              className="text-xs h-7 px-2 font-medium tracking-wide hover:font-semibold transition-all"
                            >
                              {action.length > 30
                                ? `${action.slice(0, 30)}...`
                                : action}
                            </Button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Input */}
                  <div className="p-4 border-t border-border/50 bg-white/80 dark:bg-black/90 backdrop-blur-xl relative z-10">
                    <div className="flex items-end space-x-2">
                      <div className="flex-1 relative">
                        <textarea
                          ref={inputRef}
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Ask me anything about translations..."
                          className="w-full resize-none rounded-lg border border-white/20 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-3 py-2 text-sm font-medium tracking-wide focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-purple-500/50 focus:border-blue-500/50 dark:focus:border-purple-500/50 transition-all duration-200 max-h-20 shadow-sm [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                          rows={1}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={startVoiceInput}
                          disabled={isLoading || isListening}
                          className="h-10 w-10"
                        >
                          {isListening ? (
                            <MicOff className="w-4 h-4 text-red-500" />
                          ) : (
                            <Mic className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          onClick={() => sendMessage(inputMessage)}
                          disabled={!inputMessage.trim() || isLoading}
                          className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                          size="icon"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground font-light italic tracking-wide">
                        Press Enter to send, Shift+Enter for new line
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearChat}
                        className="text-xs h-6 px-2 font-medium tracking-wide hover:font-semibold transition-all"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Clear
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
