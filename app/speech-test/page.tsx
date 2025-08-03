"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export default function SpeechTestPage() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [browserSupport, setBrowserSupport] = useState<string>("");
  const [microphonePermission, setMicrophonePermission] = useState<string>("");

  useEffect(() => {
    // Check browser support
    if ("webkitSpeechRecognition" in window) {
      setBrowserSupport("webkitSpeechRecognition");
    } else if ("SpeechRecognition" in window) {
      setBrowserSupport("SpeechRecognition");
    } else {
      setBrowserSupport("Not supported");
    }

    // Check microphone permission
    checkMicrophonePermission();
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        setMicrophonePermission("Granted");
        stream.getTracks().forEach((track) => track.stop());
      } else {
        setMicrophonePermission("getUserMedia not supported");
      }
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === "NotAllowedError") {
        setMicrophonePermission("Denied");
      } else if (error.name === "NotFoundError") {
        setMicrophonePermission("No microphone found");
      } else {
        setMicrophonePermission(`Error: ${error.name}`);
      }
    }
  };

  const startListening = () => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      setError("Speech recognition not supported");
      return;
    }

    setError("");
    setTranscript("");

    // Try different speech recognition APIs
    let recognition: SpeechRecognition;

    if ("webkitSpeechRecognition" in window) {
      recognition = new (
        window as unknown as {
          webkitSpeechRecognition: new () => SpeechRecognition;
        }
      ).webkitSpeechRecognition();
    } else if ("SpeechRecognition" in window) {
      recognition = new (
        window as unknown as {
          SpeechRecognition: new () => SpeechRecognition;
        }
      ).SpeechRecognition();
    }

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setError("");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
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

      setTranscript((prev) => prev + finalTranscript + " " + interimText);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event);
      let errorMessage = "Speech recognition error occurred";

      if (event.error) {
        switch (event.error) {
          case "not-allowed":
            errorMessage =
              "Microphone access denied. Please allow microphone permissions.";
            break;
          case "no-speech":
            errorMessage = "No speech detected. Please try speaking again.";
            break;
          case "audio-capture":
            errorMessage =
              "Audio capture failed. Please check your microphone.";
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
            errorMessage = `Speech recognition error: ${event.error}`;
        }
      }

      setError(errorMessage);
      setIsListening(false);
    };

    recognition.start();
  };

  const stopListening = () => {
    setIsListening(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Speech Recognition Test</h1>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Browser Support</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={
                browserSupport.includes("Not supported")
                  ? "destructive"
                  : "default"
              }
            >
              {browserSupport}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Microphone Permission</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={
                microphonePermission === "Granted"
                  ? "default"
                  : microphonePermission === "Denied"
                  ? "destructive"
                  : "secondary"
              }
            >
              {microphonePermission}
            </Badge>
            <Button
              onClick={checkMicrophonePermission}
              variant="outline"
              size="sm"
              className="ml-2"
            >
              Recheck
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Speech Recognition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={startListening}
                disabled={isListening}
                className="bg-green-600 hover:bg-green-700"
              >
                Start Listening
              </Button>
              <Button
                onClick={stopListening}
                disabled={!isListening}
                variant="destructive"
              >
                Stop Listening
              </Button>
            </div>

            {isListening && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-muted-foreground">
                  Listening...
                </span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {transcript && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm font-medium mb-2">Transcript:</p>
                <p className="text-sm">{transcript}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              <li>
                • Make sure you're using a supported browser (Chrome, Edge,
                Safari)
              </li>
              <li>• Allow microphone permissions when prompted</li>
              <li>• Check that your microphone is working and not muted</li>
              <li>• Ensure you have a stable internet connection</li>
              <li>• Try refreshing the page if permissions are stuck</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
