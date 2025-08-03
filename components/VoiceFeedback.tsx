"use client";
import { useEffect } from "react";

interface VoiceFeedbackProps {
  isActive: boolean;
  lastCommand?: string;
}

export default function VoiceFeedback({
  isActive,
  lastCommand,
}: VoiceFeedbackProps) {
  useEffect(() => {
    if (isActive && lastCommand) {
      // Create audio feedback for successful command recognition
      const audio = new Audio();
      audio.src =
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT";
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Fallback: use Web Speech API for text-to-speech
        if ("speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(
            `Navigating to ${lastCommand}`
          );
          utterance.volume = 0.5;
          utterance.rate = 1.2;
          speechSynthesis.speak(utterance);
        }
      });
    }
  }, [isActive, lastCommand]);

  return null; // This component doesn't render anything
}
