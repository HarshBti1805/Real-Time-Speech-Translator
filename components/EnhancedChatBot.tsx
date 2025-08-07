"use client";

import React, { lazy, Suspense, useCallback, useMemo } from "react";
import { Loader2 } from "lucide-react";

// Lazy load the ChatBot component for better performance
const ChatBot = lazy(() => import("./ChatBot"));

interface EnhancedChatBotProps {
  currentMode: string;
  currentTranslation?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  // Chatbot state control props
  isOpen?: boolean;
  isMinimized?: boolean;
  onToggle?: () => void;
  onMinimize?: () => void;
}

// Loading fallback component
const ChatBotFallback = () => (
  <div className="fixed bottom-6 right-6 z-50">
    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 shadow-2xl flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-white animate-spin" />
    </div>
  </div>
);

export default function EnhancedChatBot(props: EnhancedChatBotProps) {
  // Memoize the props to prevent unnecessary re-renders
  const memoizedProps = useMemo(
    () => ({
      currentMode: props.currentMode,
      currentTranslation: props.currentTranslation,
      sourceLanguage: props.sourceLanguage,
      targetLanguage: props.targetLanguage,
      isOpen: props.isOpen,
      isMinimized: props.isMinimized,
      onToggle: props.onToggle,
      onMinimize: props.onMinimize,
    }),
    [
      props.currentMode,
      props.currentTranslation,
      props.sourceLanguage,
      props.targetLanguage,
      props.isOpen,
      props.isMinimized,
      props.onToggle,
      props.onMinimize,
    ]
  );

  // Preload the ChatBot component when hovering over the trigger area
  const handlePreload = useCallback(() => {
    import("./ChatBot");
  }, []);

  return (
    <>
      {/* Preload trigger area */}
      <div
        className="fixed bottom-0 right-0 w-32 h-32 z-40 pointer-events-none"
        onMouseEnter={handlePreload}
      />

      <Suspense fallback={<ChatBotFallback />}>
        <ChatBot {...memoizedProps} />
      </Suspense>
    </>
  );
}
