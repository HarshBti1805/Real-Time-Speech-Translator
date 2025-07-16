"use client";
import MainPage from "@/pages/Home";
import Speech from "@/pages/Speech";
import Translate from "@/pages/Translate";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import {
  Moon,
  Sun,
  Mic,
  FileText,
  Languages,
  Volume2,
  Sparkles,
  Menu,
  X as CloseIcon,
  PictureInPicture,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TranscriptionHistorySidebar from "@/components/TranscriptionHistorySidebar";
import MiniBar from "@/components/MiniBar";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeComponent, setActiveComponent] = useState("main");
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") || "dark";
    }
    return "dark";
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showMiniBar, setShowMiniBar] = useState(false);
  const [isPipSupported, setIsPipSupported] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [currentTranslation, setCurrentTranslation] = useState({
    original: "Hello, how are you?",
    translated: "Hola, ¿cómo estás?",
    fromLang: "English",
    toLang: "Spanish",
  });

  useEffect(() => {
    setIsPipSupported(
      typeof window !== "undefined" && "documentPictureInPicture" in window
    );
  }, []);

  useEffect(() => {
    if (status === "loading") return; // Still loading
    if (!session) {
      router.push("/login");
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const openPictureInPicture = async () => {
    try {
      if (!isPipSupported) {
        alert("Picture-in-Picture is not supported in this browser");
        return;
      }
      if (pipWindow && !(pipWindow as Window & { closed?: boolean }).closed) {
        pipWindow.close();
        return;
      }
      // Document Picture-in-Picture API is not in the TS lib yet
      const newPipWindow = await (
        window as unknown as {
          documentPictureInPicture: {
            requestWindow: (options: {
              width: number;
              height: number;
            }) => Promise<Window>;
          };
        }
      ).documentPictureInPicture.requestWindow({
        width: 600,
        height: 115,
      });
      const pipDocument = newPipWindow.document;
      pipDocument.head.innerHTML = `
        <style>
          @font-face {
            font-family: 'Product Sans';
            src: url('/fonts/ProductSans-Regular.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
          }
          @font-face {
            font-family: 'JetBrains Mono';
            src: url('/fonts/JetBrainsMono-Regular.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
          }
          body {
            font-family: 'JetBrains Mono', BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0;
            padding: 0;
            background: #18181b;
            color: #fff;
            transition: background 0.2s, color 0.2s;
          }
          body.light {
            background: #f8fafc;
            color: #222;
          }
          .pip-bar {
            display: flex;
            flex-direction: column;
            justify-content: center;
            background: linear-gradient(135deg, #232329 60%, #3b2f5e 100%);
            color: #fff;
            border-radius: 18px;
            box-shadow: 0 6px 32px 0 rgba(64,0,128,0.22);
            padding: 16px 32px;
            min-height: 90px;
            margin: 8px;
            gap: 12px;
            min-width: 0;
            border: 2px solid #363646;
            font-family: 'JetBrains Mono', sans-serif;
          }
          body.light .pip-bar {
            background: linear-gradient(135deg, #f8fafc 60%, #e0e7ff 100%);
            color: #222;
            border: 2px solid #e5e7eb;
            box-shadow: 0 6px 32px 0 rgba(64,0,128,0.10);
          }
          .pip-row {
            display: flex;
            align-items: center;
            gap: 16px;
            width: 100%;
            padding: 0;
            margin: 0;
            font-family: 'JetBrains Mono', sans-serif;
          }
          .pip-col {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .pip-original, .pip-translated {
            font-size: 1.08em;
            font-weight: 600;
            margin: 0;
            width: 200px;
            height: 2.6em;
            overflow-x: auto;
            overflow-y: auto;
            text-overflow: ellipsis;
            white-space: normal;
            word-break: break-word;
            line-height: 1.3;
            font-family: 'Product Sans', sans-serif;
            border-radius: 8px;
            padding: 2px 6px;
            scrollbar-width: thin;
            scrollbar-color: #6366f1 #232329;
            background: none;
          }
          body.light .pip-original {
            color: #222;
            background: #f3f4f6;
          }
          .pip-translated {
            color: #a5e2ff;
            background: none;
            height: 2.6em;
            width: 200px;
            display: block;
            overflow-y: auto;
            overflow-x: hidden;
            white-space: pre-wrap;
            word-break: break-word;
            border-radius: 8px;
            padding: 2px 6px;
            scrollbar-width: thin;
            scrollbar-color: #6366f1 #232329;
          }
          body.light .pip-translated {
            color: #2563eb;
            background: #e0e7ff;
            border: 1px solid #c7d2fe;
          }
          .pip-translated::-webkit-scrollbar {
            width: 8px;
            background: #232329;
            border-radius: 6px;
          }
          body.light .pip-translated::-webkit-scrollbar {
            width: 8px;
            background: #232329;
            border-radius: 6px;
          }
          body.light .pip-translated::-webkit-scrollbar-thumb {
            background: #6366f1;
            border-radius: 6px;
          }
          body.light .pip-translated::-webkit-scrollbar-thumb:hover {
            background: #818cf8;
          }
          .pip-arrow {
            font-size: 1.1em;
            margin: 0 6px;
            opacity: 0.7;
          }
          .pip-quick {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            font-family: 'JetBrains Mono', sans-serif;
            margin-top: 4px;
          }
          .pip-quick input, .pip-quick select {
            border: none;
            border-radius: 8px;
            background: #232334;
            color: #fff;
            font-size: 15px;
            font-family: 'JetBrains Mono', sans-serif;
            box-shadow: 0 1px 4px #0002;
            padding: 7px 14px;
            transition: box-shadow 0.2s, outline 0.2s, background 0.2s;
            outline: 2px solid transparent;
          }
          body.light .pip-quick input, body.light .pip-quick select {
            background: #f3f4f6;
            color: #222;
            border: 1.5px solid #a5b4fc;
          }
          body.light .pip-quick input:focus, body.light .pip-quick select:focus {
            outline: 2px solid #6366f1;
            background: #e0e7ff;
            box-shadow: 0 2px 12px #6366f133;
          }
          .pip-quick input::placeholder {
            color: #aaa;
            font-family: 'JetBrains Mono', sans-serif;
            font-size: 13px;
          }
          body.light .pip-quick input::placeholder {
            color: #666;
          }
          .pip-quick select {
            min-width: 100px;
            background: linear-gradient(90deg, #232334 60%, #363646 100%);
            color: #fff;
            border: 1.5px solid #6366f1;
            font-size: 14px;
            font-family: 'JetBrains Mono', sans-serif;
          }
          .pip-quick button {
            background: linear-gradient(90deg, #6366f1 0%, #a21caf 100%);
            border: none;
            border-radius: 8px;
            padding: 6px 12px;
            cursor: pointer;
            font-size: 15px;
            color: #fff;
            font-family: 'JetBrains Mono', sans-serif;
            font-weight: 600;
            box-shadow: 0 2px 8px #6366f133;
            transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
          }
          body.light .pip-quick button {
            background: linear-gradient(90deg, #818cf8 0%, #c026d3 100%);
            color: #fff;
          }
          body.light .pip-quick button:hover {
            background: linear-gradient(90deg, #6366f1 0%, #a21caf 100%);
          }
          .pip-theme {
            margin-left: auto;
            font-size: 18px;
            padding: 6px 10px;
          }
          body.light .pip-theme {
            background: #e0e7ff;
            color: #222;
          }
          .pip-clear {
            background: linear-gradient(90deg, #ef4444 0%, #a21caf 100%);
          }
          body.light .pip-clear {
            background: linear-gradient(90deg, #f87171 0%, #c026d3 100%);
            color: #fff;
          }
          .pip-clear:hover {
            background: linear-gradient(90deg, #f87171 0%, #c026d3 100%);
          }
          .pip-swap {
            background: linear-gradient(135deg, #6366f1 0%, #a21caf 100%);
            border: none;
            border-radius: 50%;
            width: 44px;
            height: 44px;
            min-width: 44px;
            min-height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            color: #fff;
            box-shadow: 0 2px 12px #6366f155;
            transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
            cursor: pointer;
            margin: 0 10px;
            position: relative;
          }
          .pip-swap:hover {
            background: linear-gradient(135deg, #818cf8 0%, #c026d3 100%);
            transform: scale(1.12) rotate(90deg);
            box-shadow: 0 4px 18px #818cf888;
          }
          .pip-swap:active {
            transform: scale(0.98) rotate(180deg);
          }
          .pip-swap svg {
            width: 26px;
            height: 26px;
            pointer-events: none;
          }
          /* Custom select styles */
          .pip-col select {
            appearance: none;
            -webkit-appearance: none;
            -moz-appearance: none;
            background: linear-gradient(135deg, #232334 60%, #363646 100%);
            color: #fff;
            border: 2px solid #6366f1;
            border-radius: 10px;
            padding: 8px 36px 8px 14px;
            font-size: 16px;
            font-family: 'JetBrains Mono', sans-serif;
            font-weight: 600;
            box-shadow: 0 2px 8px #6366f122;
            transition: border 0.2s, box-shadow 0.2s;
            outline: none;
            position: relative;
            min-width: 120px;
            margin: 0 4px;
            background-color: #232334;
            color-scheme: dark;
          }
          .pip-col select option {
            background: #232334;
            color: #fff;
          }
          .pip-col select:focus {
            border: 2px solid #a21caf;
            box-shadow: 0 0 0 2px #a21caf44;
            background: linear-gradient(135deg, #232334 60%, #6366f1 100%);
          }
          .pip-col select:hover {
            border: 2px solid #818cf8;
          }
          .pip-col select::-ms-expand {
            display: none;
          }
          .pip-col {
            position: relative;
          }
          /* Custom dropdown arrow */
          .pip-col select::after {
            content: '';
            position: absolute;
            right: 18px;
            top: 50%;
            transform: translateY(-50%);
            width: 0;
            height: 0;
            border-left: 7px solid transparent;
            border-right: 7px solid transparent;
            border-top: 8px solid #6366f1;
            pointer-events: none;
          }
          /* Light mode overrides */
          body.light .pip-swap {
            background: linear-gradient(135deg, #a5b4fc 0%, #818cf8 100%);
            color: #222;
            box-shadow: 0 2px 12px #a5b4fc55;
          }
          body.light .pip-swap:hover {
            background: linear-gradient(135deg, #6366f1 0%, #c026d3 100%);
            color: #fff;
            box-shadow: 0 4px 18px #818cf888;
          }
          body.light .pip-col select {
            background: linear-gradient(135deg, #f3f4f6 60%, #e0e7ff 100%);
            color: #222;
            border: 2px solid #a5b4fc;
            box-shadow: 0 2px 8px #a5b4fc22;
            background-color: #f3f4f6;
            color-scheme: light;
          }
          body.light .pip-col select option {
            background: #f3f4f6;
            color: #222;
          }
          body.light .pip-col select:focus {
            border: 2px solid #6366f1;
            box-shadow: 0 0 0 2px #6366f144;
            background: linear-gradient(135deg, #e0e7ff 60%, #a5b4fc 100%);
          }
          body.light .pip-col select:hover {
            border: 2px solid #6366f1;
          }
          body.light .pip-col select::after {
            border-top: 8px solid #6366f1;
          }
          .pip-original, .pip-translated {
            scrollbar-width: none; /* Hide scrollbar for Firefox */
            -ms-overflow-style: none; /* Hide scrollbar for IE/Edge */
          }
          .pip-original::-webkit-scrollbar, .pip-translated::-webkit-scrollbar {
            display: none; /* Hide scrollbar for Chrome, Safari, Opera */
            width: 0 !important;
            background: transparent !important;
          }
        </style>
      `;
      pipDocument.body.innerHTML = `
        <div class="pip-bar">
          <div class="pip-row pip-top">
            <div class="pip-col">
              <span class="pip-original" id="originalText">${currentTranslation.original}</span>
              <select id="fromLang">
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="ru">Russian</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
              </select>
            </div>
            <button class="pip-swap" id="swapBtn" title="Swap languages">
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 10h18M7 10l4-4M7 10l4 4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M25 22H7m18 0l-4-4m4 4l-4 4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <div class="pip-col">
              <select id="toLang">
                <option value="es">Spanish</option>
                <option value="en">English</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="ru">Russian</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
              </select>
              <span class="pip-translated" id="translatedText">${currentTranslation.translated}</span>
            </div>
          </div>
          <div class="pip-row" style="justify-content: center;">
            <div id="pip-lower-row" class="pip-quick" style="margin: 0 auto; display: flex; justify-content: center; align-items: center; gap: 10px;">
              <button class="pip-theme" id="themeBtn" title="Toggle dark/light mode">🌙</button>
              <button class="pip-copy" id="copySourceBtn" title="Copy source">📋</button>
              <input type="text" id="quickInput" placeholder="Type to translate...">
              <button class="pip-copy" id="copyBtn" title="Copy translation">📋</button>
              <button class="pip-clear" id="clearBtn" title="Clear input">✖</button>
            </div>
            <div class="pip-status">
              <div class="pip-dot" id="statusDot"></div>
              <span id="statusText"></span>
            </div>
          </div>
        </div>
      `;
      // Set initial dropdown values
      (pipDocument.getElementById("fromLang") as HTMLSelectElement).value =
        "en";
      (pipDocument.getElementById("toLang") as HTMLSelectElement).value = "es";
      // Update language labels
      const updateLangLabels = () => {
        // No-op: function kept for compatibility, but no unused variables
      };
      updateLangLabels(); // Initialize labels
      (
        pipDocument.getElementById("fromLang") as HTMLSelectElement
      ).addEventListener("change", () => {
        updateLangLabels();
        const text = (
          pipDocument.getElementById("quickInput") as HTMLInputElement
        ).value;
        if (text.trim()) translateText(text);
      });
      (
        pipDocument.getElementById("toLang") as HTMLSelectElement
      ).addEventListener("change", () => {
        updateLangLabels();
        const text = (
          pipDocument.getElementById("quickInput") as HTMLInputElement
        ).value;
        if (text.trim()) translateText(text);
      });
      // Swap button
      (
        pipDocument.getElementById("swapBtn") as HTMLButtonElement
      ).addEventListener("click", () => {
        const fromSel = pipDocument.getElementById(
          "fromLang"
        ) as HTMLSelectElement;
        const toSel = pipDocument.getElementById("toLang") as HTMLSelectElement;
        const quickInput = pipDocument.getElementById(
          "quickInput"
        ) as HTMLInputElement;
        const originalText = pipDocument.getElementById(
          "originalText"
        ) as HTMLElement;
        const translatedText = pipDocument.getElementById(
          "translatedText"
        ) as HTMLElement;
        // Swap dropdown values
        const tmp = fromSel.value;
        fromSel.value = toSel.value;
        toSel.value = tmp;
        // Move translated text to input, clear output
        const prevTranslated = translatedText.textContent || "";
        quickInput.value = prevTranslated;
        originalText.textContent = prevTranslated;
        translatedText.textContent = "";
        setStatus("ready");
        if (prevTranslated.trim()) translateText(prevTranslated);
      });
      // Copy button for output
      (
        pipDocument.getElementById("copyBtn") as HTMLButtonElement
      ).addEventListener("click", async () => {
        const translated =
          (pipDocument.getElementById("translatedText") as HTMLElement)
            .textContent || "";
        try {
          await newPipWindow.navigator.clipboard.writeText(translated);
          setStatus("success");
          setTimeout(() => setStatus("ready"), 1000);
        } catch {
          setStatus("error");
        }
      });
      // Copy button for source
      (
        pipDocument.getElementById("copySourceBtn") as HTMLButtonElement
      ).addEventListener("click", async () => {
        const original =
          (pipDocument.getElementById("originalText") as HTMLElement)
            .textContent || "";
        try {
          await newPipWindow.navigator.clipboard.writeText(original);
          setStatus("success");
          setTimeout(() => setStatus("ready"), 1000);
        } catch {
          setStatus("error");
        }
      });
      // Clear button
      (
        pipDocument.getElementById("clearBtn") as HTMLButtonElement
      ).addEventListener("click", () => {
        (pipDocument.getElementById("quickInput") as HTMLInputElement).value =
          "";
        (
          pipDocument.getElementById("originalText") as HTMLElement
        ).textContent = "";
        (
          pipDocument.getElementById("translatedText") as HTMLElement
        ).textContent = "";
        setStatus("ready");
      });
      // Input event with debounce
      let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
      (
        pipDocument.getElementById("quickInput") as HTMLInputElement
      ).addEventListener("input", (e: Event) => {
        const target = e.target as HTMLInputElement;
        const text = target.value;
        if (debounceTimeout) clearTimeout(debounceTimeout);
        if (text.trim()) {
          debounceTimeout = setTimeout(() => {
            translateText(text);
          }, 500);
        } else {
          (
            pipDocument.getElementById("originalText") as HTMLElement
          ).textContent = "";
          (
            pipDocument.getElementById("translatedText") as HTMLElement
          ).textContent = "";
          setStatus("ready");
        }
      });
      // Theme toggle
      let isLight = false;
      (
        pipDocument.getElementById("themeBtn") as HTMLButtonElement
      ).addEventListener("click", () => {
        isLight = !isLight;
        pipDocument.body.classList.toggle("light", isLight);
        (
          pipDocument.getElementById("themeBtn") as HTMLButtonElement
        ).textContent = isLight ? "☀️" : "🌙";
      });
      // Status feedback
      function setStatus(type: "ready" | "translating" | "error" | "success") {
        const statusText = pipDocument.getElementById(
          "statusText"
        ) as HTMLElement;
        const statusDot = pipDocument.getElementById(
          "statusDot"
        ) as HTMLElement;
        statusText.textContent = ""; // Always clear status text
        statusDot.classList.remove("translating", "error", "success");
        if (type === "translating") statusDot.classList.add("translating");
        else if (type === "error") statusDot.classList.add("error");
        else if (type === "success") statusDot.classList.add("success");
        else statusDot.style.background = isLight ? "#22c55e" : "#4CAF50";
      }
      // Translation logic
      const translateText = async (text: string) => {
        setStatus("translating");
        const fromLang = (
          pipDocument.getElementById("fromLang") as HTMLSelectElement
        ).value;
        const toLang = (
          pipDocument.getElementById("toLang") as HTMLSelectElement
        ).value;
        try {
          const shouldAutoDetect = fromLang === "auto" || fromLang === "";
          const res = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              targetLang: toLang,
              sourceLang: shouldAutoDetect ? null : fromLang,
              autoDetect: shouldAutoDetect,
            }),
          });
          const data = await res.json();
          if (res.ok) {
            (
              pipDocument.getElementById("originalText") as HTMLElement
            ).textContent = text;
            (
              pipDocument.getElementById("translatedText") as HTMLElement
            ).textContent = data.translatedText;
            setStatus("success");
            setTimeout(() => setStatus("ready"), 1200);
            setCurrentTranslation({
              original: text,
              translated: data.translatedText,
              fromLang: (
                pipDocument.getElementById("fromLang") as HTMLSelectElement
              ).selectedOptions[0].text,
              toLang: (
                pipDocument.getElementById("toLang") as HTMLSelectElement
              ).selectedOptions[0].text,
            });
          } else {
            setStatus("error");
            (
              pipDocument.getElementById("translatedText") as HTMLElement
            ).textContent = "";
          }
        } catch (err) {
          setStatus("error");
          console.log(err);
          (
            pipDocument.getElementById("translatedText") as HTMLElement
          ).textContent = "";
        }
      };
      newPipWindow.addEventListener("beforeunload", () => {
        setPipWindow(null);
      });
      setPipWindow(newPipWindow);
    } catch (error: unknown) {
      if (typeof error === "object" && error && "message" in error) {
        alert("Error: " + (error as { message: string }).message);
      } else {
        alert("Unknown error");
      }
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to login
  }
  const userName = session.user?.name || "?";
  const userEmail = session.user?.email || "";
  const userImage = session.user?.image || null;
  const navItems = [
    {
      id: "main",
      label: "Audio Translator",
      icon: Volume2,
      description: "Translate speech in real-time",
      badge: "AI Powered",
    },
    {
      id: "translate",
      label: "Text Translator",
      icon: Languages,
      description: "Translate text between languages",
      badge: "Multi-Lang",
    },
    {
      id: "speech",
      label: "File to Text",
      icon: FileText,
      description: "Convert audio files to text",
      badge: "OCR Ready",
    },
  ];

  const renderActiveComponent = () => {
    switch (activeComponent) {
      case "main":
        return <MainPage />;
      case "translate":
        return <Translate />;
      case "speech":
        return <Speech />;
      default:
        return <MainPage />;
    }
  };

  const getSidebarHeight = () => {
    switch (activeComponent) {
      case "main":
        return "970px";
      case "translate":
        return "1187px";
      case "speech":
        return "1084px";
      default:
        return "100px";
    }
  };

  return (
    <>
      <MiniBar
        minimized={showMiniBar}
        setMinimized={setShowMiniBar}
        onSelect={(id) => {
          setActiveComponent(id);
        }}
      />
      <div className="overflow-hidden min-h-screen bg-background text-foreground transition-colors duration-300 flex">
        {/* Sidebar */}
        {sidebarOpen && (
          <TranscriptionHistorySidebar height={getSidebarHeight()} />
        )}
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-3">
                  {/* Sidebar toggle button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mr-2"
                    onClick={() => setSidebarOpen((open) => !open)}
                    aria-label={
                      sidebarOpen
                        ? "Close history sidebar"
                        : "Open history sidebar"
                    }
                  >
                    {sidebarOpen ? (
                      <CloseIcon className="w-5 h-5" />
                    ) : (
                      <Menu className="w-5 h-5" />
                    )}
                  </Button>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Mic className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <h1 className="text-2xl font-jetbrains-mono font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      TranslateHub
                    </h1>
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
                <div className="flex items-center justify-end w-full">
                  <div className="flex items-center bg-muted/60 border border-border rounded-xl px-4 py-2 shadow-sm gap-4">
                    {/* Avatar and user info */}
                    {userImage ? (
                      <img
                        className="h-8 w-8 rounded-full border border-border shadow"
                        src={userImage}
                        alt={userName}
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold border border-border shadow">
                        {userName[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="flex flex-col justify-center mr-2">
                      <span className="font-medium text-foreground leading-tight truncate max-w-[140px]">
                        {userName}
                      </span>
                      <span className="text-xs text-muted-foreground leading-tight truncate max-w-[140px]">
                        {userEmail}
                      </span>
                    </div>
                    {/* Sign Out button */}
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-indigo-600 text-sm font-medium rounded-lg text-indigo-700 bg-white hover:bg-indigo-50 hover:text-indigo-900 shadow transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      title="Sign out of your account"
                    >
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1"
                        />
                      </svg>
                      Sign Out
                    </button>
                    {/* Theme toggle */}
                    <Button
                      onClick={toggleTheme}
                      variant="ghost"
                      size="icon"
                      className="hover:bg-accent shadow-amber-50 shadow-2xl cursor-pointer transition-colors"
                      aria-label="Toggle theme"
                    >
                      {theme === "dark" ? (
                        <Sun className="w-5 h-5" />
                      ) : (
                        <Moon className="w-5 h-5" />
                      )}
                    </Button>
                    {/* PiP button at the end */}
                    {isPipSupported && (
                      <Button
                        onClick={openPictureInPicture}
                        variant="ghost"
                        size="icon"
                        className="hover:bg-accent shadow-amber-50 shadow-2xl cursor-pointer transition-colors ml-2"
                        title={
                          pipWindow &&
                          !(pipWindow as Window & { closed?: boolean }).closed
                            ? "Close Picture-in-Picture"
                            : "Open Picture-in-Picture"
                        }
                        aria-label={
                          pipWindow &&
                          !(pipWindow as Window & { closed?: boolean }).closed
                            ? "Close Picture-in-Picture"
                            : "Open Picture-in-Picture"
                        }
                      >
                        {pipWindow &&
                        !(pipWindow as Window & { closed?: boolean }).closed ? (
                          <Minimize2 className="w-5 h-5" />
                        ) : (
                          <PictureInPicture className="w-5 h-5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Navigation */}
          <nav className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex justify-center items-center mx-auto px-4">
              <div className="flex space-x-5 py-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeComponent === item.id;
                  return (
                    <Card
                      key={item.id}
                      className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                        isActive
                          ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50 shadow-lg shadow-blue-500/25"
                          : "bg-card border-border hover:bg-accent hover:border-accent-foreground/20"
                      }`}
                      onClick={() => setActiveComponent(item.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`p-2 rounded-lg ${
                              isActive
                                ? "bg-gradient-to-br from-blue-500 to-purple-500"
                                : "bg-muted"
                            }`}
                          >
                            <Icon
                              className={`w-5 h-5 ${
                                isActive
                                  ? "text-white"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3
                                className={`font-semibold text-xl font-jetbrains-mono ${
                                  isActive
                                    ? "text-foreground"
                                    : "text-foreground/90"
                                }`}
                              >
                                {item.label}
                              </h3>
                            </div>
                            <p
                              className={`text-sm mt-1 font-product-sans ${
                                isActive
                                  ? "text-foreground/80"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="container mx-auto px-4 py-8">
            <Card className="bg-card border-border shadow-2xl">
              <CardContent className="p-0">
                {renderActiveComponent()}
              </CardContent>
            </Card>
          </main>

          {/* Footer */}
          <footer className="border-t border-border bg-muted/50 mt-16">
            <div className="container mx-auto px-4 py-8">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <Mic className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    TranslateHub
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  © 2025 TranslateHub. Powered by cutting-edge AI translation
                  technology.
                </p>
                <div className="flex items-center justify-center space-x-4 mt-4">
                  <Badge
                    variant="outline"
                    className="text-muted-foreground border-border"
                  >
                    Real-time Translation
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-muted-foreground border-border"
                  >
                    Multi-language Support
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-muted-foreground border-border"
                  >
                    AI-Powered
                  </Badge>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
