import { useState, useEffect } from "react";

const languageOptions = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "tr", name: "Turkish" },
  { code: "nl", name: "Dutch" },
  { code: "el", name: "Greek" },
  { code: "he", name: "Hebrew" },
  { code: "pl", name: "Polish" },
  { code: "sv", name: "Swedish" },
  { code: "th", name: "Thai" },
  { code: "vi", name: "Vietnamese" },
  { code: "id", name: "Indonesian" },
  { code: "uk", name: "Ukrainian" },
  { code: "cs", name: "Czech" },
  { code: "fi", name: "Finnish" },
  { code: "hu", name: "Hungarian" },
  { code: "ro", name: "Romanian" },
  { code: "sk", name: "Slovak" },
  { code: "bg", name: "Bulgarian" },
  { code: "hr", name: "Croatian" },
  { code: "da", name: "Danish" },
  { code: "no", name: "Norwegian" },
  { code: "bn", name: "Bengali" },
  { code: "pa", name: "Punjabi" },
  { code: "gu", name: "Gujarati" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "ml", name: "Malayalam" },
  { code: "mr", name: "Marathi" },
  { code: "ur", name: "Urdu" },
  { code: "uz", name: "Uzbek" },
];

type PiPWindow = Window & { closed?: boolean };
type DocumentPiP = typeof window & {
  documentPictureInPicture: {
    requestWindow: (options: {
      width: number;
      height: number;
    }) => Promise<Window>;
  };
};

export function useHomePiP() {
  const [isPipSupported, setIsPipSupported] = useState(false);
  const [pipWindow, setPipWindow] = useState<PiPWindow | null>(null);

  useEffect(() => {
    setIsPipSupported(
      typeof window !== "undefined" && "documentPictureInPicture" in window
    );
  }, []);

  async function openHomePiP() {
    try {
      if (!isPipSupported) {
        alert("Picture-in-Picture is not supported in this browser");
        return;
      }
      if (pipWindow && pipWindow.closed === false) {
        pipWindow.close();
        return;
      }
      const newPipWindow = await (
        window as unknown as DocumentPiP
      ).documentPictureInPicture.requestWindow({ width: 800, height: 196 });
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
            border-radius: 10px;
            box-shadow: 0 4px 16px 0 rgba(64,0,128,0.18);
            padding: 14px 32px;
            min-height: 60px;
            margin: 8px;
            gap: 5px;
            min-width: 0;
            border: 1.5px solid #363646;
            font-family: 'JetBrains Mono', sans-serif;
            max-width: 900px;
            width: 100%;
          }
          body.light .pip-bar {
            background: linear-gradient(135deg, #f8fafc 60%, #e0e7ff 100%);
            color: #222;
            border: 1.5px solid #e5e7eb;
            box-shadow: 0 4px 16px 0 rgba(64,0,128,0.08);
          }
          .pip-row {
            display: flex;
            align-items: center;
            gap: 24px;
            width: 100%;
            padding: 0;
            margin: 0;
            font-family: 'JetBrains Mono', sans-serif;
          }
          .pip-col {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .pip-title {
            font-size: 1em;
            font-weight: bold;
            margin-bottom: 4px;
            letter-spacing: 0.3px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .pip-modes {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 4px;
            gap: 26px;
          }
          .pip-mode-btn {
            font-family: 'JetBrains Mono', sans-serif;
            padding: 4px 12px;
            border-radius: 8px;
            border: none;
            font-weight: 600;
            cursor: pointer;
            font-size: 0.9em;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: background 0.2s, color 0.2s;
            box-shadow: 0 1px 4px #6366f122;
            border: 1px solid transparent;
            transition: background 0.18s, color 0.18s, box-shadow 0.18s, border 0.18s, transform 0.12s;
          }
          .pip-mode-btn.active {
            background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%);
            color: #fff;
            box-shadow: 0 2px 8px #6366f144;
            border: 1px solid #6366f1;
            transform: scale(1.02);
          }
          .pip-mode-btn.realtime-active {
            background: linear-gradient(90deg, #22c55e 0%, #3b82f6 100%);
            color: #fff;
            box-shadow: 0 2px 8px #22c55e44;
            border: 1px solid #22c55e;
            transform: scale(1.02);
          }
          .pip-mode-btn:not(.active) {
            background: #232334;
            color: #a5b4fc;
            border: 1px solid #363646;
          }
          .pip-mode-btn:not(.active):hover {
            box-shadow: 0 1px 6px #6366f133;
            transform: scale(1.01);
          }
          .pip-mode-btn[title] {
            position: relative;
          }
          .pip-mode-btn[title]:hover::after {
            content: attr(title);
            position: absolute;
            left: 50%;
            top: 110%;
            transform: translateX(-50%);
            background: #232334;
            color: #fff;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.8em;
            white-space: nowrap;
            z-index: 10;
            box-shadow: 0 1px 4px #23233444;
          }
          .pip-controls {
            display: flex;
            align-items : center;
            justify-content: center;
            gap: 24px;
          }
          .pip-select {
            border-radius: 6px;
            padding: 4px 10px;
            font-size: 0.9em;
            background: linear-gradient(135deg, #232334 60%, #363646 100%);
            color: #fff;
            border: 1.5px solid #6366f1;
            min-width: 100px;
            font-family: 'JetBrains Mono', sans-serif;
            font-weight: 600;
            box-shadow: 0 1px 4px #6366f122;
            border: 1.5px solid #6366f1;
            transition: border 0.18s, box-shadow 0.18s, background 0.18s, color 0.18s;
            outline: none;
            margin: 0 0px;
            background-color: #232334;
            color-scheme: dark;
            font-smooth: always;
            -webkit-font-smoothing: antialiased;
          }
          .pip-select option {
            background: #232334;
            color: #fff;
          }
          .pip-select:focus {
            border: 1.5px solid #a21caf;
            box-shadow: 0 0 0 1.5px #a21caf44;
            background: linear-gradient(135deg, #232334 60%, #6366f1 100%);
          }
          .pip-select:hover {
            border: 1.5px solid #818cf8;
          }
          body.light .pip-select {
            background: linear-gradient(135deg, #ffffff 60%, #f8fafc 100%);
            color: #1f2937;
            border: 1.5px solid #d1d5db;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
            background-color: #ffffff;
            color-scheme: light;
          }
          body.light .pip-select option {
            background: #ffffff;
            color: #1f2937;
          }
          body.light .pip-select:focus {
            border: 1.5px solid #6366f1;
            box-shadow: 0 0 0 1.5px rgba(99, 102, 241, 0.2);
            background: linear-gradient(135deg, #f8fafc 60%, #e0e7ff 100%);
          }
          body.light .pip-select:hover {
            border: 1.5px solid #6366f1;
            background: linear-gradient(135deg, #f8fafc 60%, #f1f5f9 100%);
          }
          .pip-record-controls {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
          }
          .pip-btn {
            padding: 6px 16px;
            min-height: 24px;
            font-size: 0.95em;
            border-radius: 8px;
            border: none;
            font-family : 'Product Sans';
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s, color 0.2s;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 1px 5px #23233422;
            border: 1px solid transparent;
            transition: background 0.18s, color 0.18s, box-shadow 0.18s, border 0.18s, transform 0.12s;
          }
          .pip-btn:active {
            transform: scale(0.97);
            box-shadow: 0 1px 2px #23233433;
          }
          .pip-btn.pip-record {
            background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
            color: #fff;
            box-shadow: 0 1px 4px #22c55e33;
            border: 1px solid #22c55e;
          }
          .pip-btn.pip-stop {
            background: linear-gradient(90deg, #ef4444 0%, #a21caf 100%);
            color: #fff;
            box-shadow: 0 1px 4px #ef444433;
            border: 1px solid #ef4444;
          }
          .pip-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .pip-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #ef4444;
            margin-right: 4px;
            animation: pip-pulse 1s infinite alternate;
            display: inline-block;
          }
          @keyframes pip-pulse { 0% { box-shadow: 0 0 0 0 #ef444488; } 100% { box-shadow: 0 0 0 4px #ef444400; } }
          .pip-timer {
            font-size: 0.95em;
            color: #a5b4fc;
            margin-left: 2px;
            font-family: inherit;
          }
          .pip-label {
            font-size: 0.95em;
            color: #a5b4fc;
            margin-bottom: 1px;
            margin-top: 5px;
            font-weight: 500;
          }
          .pip-result, .pip-translation {
            border-radius: 18px;
            padding: 80px 28px 40px 28px;
            display: flex;
            align-items: flex-start;
            color: #fff;
            overflow: visible;
            margin-bottom: 2px;
            font-size: 1.05em;
            min-height: 56px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            box-shadow: 0 1px 6px #23233422;
            background: linear-gradient(90deg, #232334 60%, #363646 100%);
            transition: background 0.18s, box-shadow 0.18s, border 0.18s;
          }
          .pip-result {
            background: linear-gradient(90deg, #232334 60%, #363646 100%);
            color: #fff;
            border: 1px solid #363646;
          }
          .pip-translation {
            background: linear-gradient(90deg, #2563eb33 60%, #a5b4fc33 100%);
            color: #22d3ee;
            border: 1px solid #2563eb44;
          }
          body.light .pip-result {
            background: linear-gradient(90deg, #ffffff 60%, #f8fafc 100%);
            color: #1f2937;
            border: 1px solid #e5e7eb;
          }
          body.light .pip-translation {
            background: linear-gradient(90deg, #dbeafe 60%, #bfdbfe 100%);
            color: #1e40af;
            border: 1px solid #93c5fd;
          }
          .pip-copy-btn {
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
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .pip-copy-btn:hover {
            background: linear-gradient(90deg, #818cf8 0%, #c026d3 100%);
            transform: scale(1.04);
            box-shadow: 0 4px 18px #818cf888;
          }
          .pip-copy-btn:active {
            transform: scale(0.97);
          }
          .pip-footer {
            font-size: 0.75em;
            color: #888;
            margin-top: 8px;
            text-align: center;
          }
          .pip-footer .pip-help {
            margin-left: 3px;
            cursor: pointer;
            color: #6366f1;
          }
          #pip-translations { 
            display : flex;
            align-items : center;
            justify-content : center;
            gap : 32px;
            margin-bottom: 10px;
          }
          .pip-footer .pip-help:hover::after {
            content: 'Standard: Record then translate. Real-Time: Live updates.';
            position: absolute;
            left: 50%;
            top: 120%;
            transform: translateX(-50%);
            background: #232334;
            color: #fff;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.8em;
            white-space: nowrap;
            z-index: 10;
            box-shadow: 0 1px 4px #23233444;
          }
          @media (max-width: 480px) { .pip-bar { padding: 4px 1px; } .pip-title { font-size: 0.9em; } }
          .pip-theme {
            font-size: 1.05em;
            padding: 10px 18px;
            background: none;
            border: none;
            color: #a5b4fc;
            cursor: pointer;
            border-radius: 16px;
            transition: background 0.2s, color 0.2s;
            box-shadow: 0 1px 2px #6366f122;
            border: 1px solid transparent;
            transition: background 0.18s, color 0.18s, box-shadow 0.18s, border 0.18s, transform 0.12s;
          }
          .pip-theme:hover {
            background: #23233444;
            color: #fff;
            border: 1px solid #6366f1;
            transform: scale(1.04) rotate(-8deg);
          }
          body.light .pip-theme {
            background: #e0e7ff;
            color: #222;
          }
          .pip-clear {
            font-size: 1.05em;
            padding: 10px 18px;
            background: none;
            border: none;
            color: #a5b4fc;
            cursor: pointer;
            border-radius: 16px;
            transition: background 0.2s, color 0.2s;
            box-shadow: 0 1px 2px #6366f122;
            border: 1px solid transparent;
            margin-left: 1px;
          }
          .pip-clear:hover {
            background: #23233444;
            color: #fff;
            border: 1px solid #6366f1;
            transform: scale(1.04) rotate(-8deg);
          }
          body.light .pip-clear {
            background: #e0e7ff;
            color: #222;
          }
          .pip-result,
          .pip-translation {
            flex: 1 1 0;
            min-width: 140px;
            min-height: 40px;
            max-width: 52%;
            background: rgba(35, 35, 52, 0.85); /* fallback for .pip-result */
            border: 1px solid #363646;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            box-sizing: border-box;
            margin-bottom: 0;
            overflow-x: auto;
            word-break: break-word;
            white-space: nowrap;
            max-height: 48px;
            font-size: 0.95em;
            padding: 8px 16px 8px 16px;
            scrollbar-width: thin;
            scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
            text-align: center;
          }
          .pip-result::-webkit-scrollbar, .pip-translation::-webkit-scrollbar {
            display: none;
          }
          .pip-result::-webkit-scrollbar-thumb, .pip-translation::-webkit-scrollbar-thumb {
            display: none;
          }
          .pip-result::-webkit-scrollbar-track, .pip-translation::-webkit-scrollbar-track {
            display: none;
          }
          .pip-result::-webkit-scrollbar-vertical, .pip-translation::-webkit-scrollbar-vertical {
            display: none;
          }
          #origVal, #transVal {
            display: block;
            width: 100%;
            text-align: left;
            line-height: 1.4;
            white-space: nowrap;
            min-width: max-content;
            padding-left: 0;
          }

          .pip-translation {
            background: linear-gradient(90deg, #2563eb22 60%, #a5b4fc22 100%);
            border: 1px solid #2563eb44;
          }
          .pip-result, .pip-translation {
            overflow-y: hidden;
            overflow-x: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .pip-swap-btn {
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
          .pip-swap-btn:hover {
            background: linear-gradient(135deg, #818cf8 0%, #c026d3 100%);
            transform: scale(1.12) rotate(90deg);
            box-shadow: 0 4px 18px #818cf888;
          }
          .pip-swap-btn:active {
            transform: scale(0.98) rotate(180deg);
          }
          .pip-swap-btn svg {
            width: 26px;
            height: 26px;
            pointer-events: none;
          }
          body.light .pip-swap-btn {
            background: linear-gradient(135deg, #a5b4fc 0%, #818cf8 100%);
            color: #222;
            box-shadow: 0 2px 12px #a5b4fc55;
          }
          body.light .pip-swap-btn:hover {
            background: linear-gradient(135deg, #6366f1 0%, #c026d3 100%);
            color: #fff;
            box-shadow: 0 4px 18px #818cf888;
          }
          .pip-tts-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(90deg, #6366f1 0%, #a21caf 100%);
            border: none;
            border-radius: 8px;
            padding: 6px 12px;
            margin-left: 6px;
            cursor: pointer;
            transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
            box-shadow: 0 2px 8px #6366f133;
            color: #fff;
            position: relative;
            font-family: 'JetBrains Mono', sans-serif;
            font-weight: 600;
          }
          .pip-tts-btn:hover {
            background: linear-gradient(90deg, #818cf8 0%, #c026d3 100%);
            transform: scale(1.08);
            box-shadow: 0 4px 18px #818cf888;
          }
          .pip-tts-btn svg {
            width: 22px;
            height: 22px;
            pointer-events: none;
          }
          .pip-tts-tooltip {
            visibility: hidden;
            opacity: 0;
            background: #232334;
            color: #fff;
            text-align: center;
            border-radius: 6px;
            padding: 4px 10px;
            position: absolute;
            z-index: 10;
            bottom: 120%;
            left: 50%;
            transform: translateX(-50%);
            font-size: 13px;
            white-space: nowrap;
            transition: opacity 0.2s;
            pointer-events: none;
          }
          .pip-tts-btn:hover .pip-tts-tooltip {
            visibility: visible;
            opacity: 1;
          }
          body.light .pip-tts-btn {
            background: linear-gradient(90deg, #818cf8 0%, #c026d3 100%);
            color: #fff;
          }
          body.light .pip-tts-tooltip {
            background: #e0e7ff;
            color: #222;
          }
        </style>
      `;
      pipDocument.body.innerHTML = `
      <div class="pip-bar">
        <div class="pip-modes">
          <button class="pip-mode-btn active" id="stdBtn" title="Standard: Record then translate"><span id="clockIcon"></span> Standard</button>
          <button class="pip-theme" id="themeBtn" title="Toggle dark/light mode">🌙</button>
          <button class="pip-clear" id="clearBtn" title="Clear all">🧹</button>
          <button class="pip-mode-btn" id="rtBtn" title="Real-Time: Live updates">⚡ Real-Time</button>
        </div>
        <div id="pip-translations">
          <div class="pip-result" id="origText">
            <span id="origVal">Original</span>
          </div>
          <button class="pip-swap-btn" id="swapBtn" title="Swap languages" style="align-self: center; margin: 0 12px;">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 1.5em; height: 1.5em;">
              <path d="M7 10h18M7 10l4-4M7 10l4 4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M25 22H7m18 0l-4-4m4 4l-4 4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div class="pip-translation" id="transText">
            <span id="transVal">Translation</span>
          </div>
        </div>
        <div class="pip-controls">
          <select class="pip-select" id="fromLang">
            ${languageOptions
              .map((l) => `<option value="${l.code}">${l.name}</option>`)
              .join("")}
          </select>
          <button class="pip-copy-btn" id="copyOrig" title="Copy Original">📋</button>
          <button class="pip-tts-btn" id="ttsOrigBtn" title="Listen to original">
            <svg viewBox="2 2 21 21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
            <span class="pip-tts-tooltip">Listen to original</span>
          </button>
          <button class="pip-btn pip-record" id="recordBtn">
            <span id="recIcon">▶</span> 
            <span id="recText">Play</span>
          </button>
          <button class="pip-tts-btn" id="ttsTransBtn" title="Listen to translation">
            <svg viewBox="2 2 21 21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
            <span class="pip-tts-tooltip">Listen to translation</span>
          </button>
          <button class="pip-copy-btn" id="copyTrans" title="Copy Translation">📋</button>
          <select class="pip-select" id="toLang">
            ${languageOptions
              .map((l) => `<option value="${l.code}">${l.name}</option>`)
              .join("")}
          </select>
        </div>
      </div>`;
      // --- PiP logic ---
      let isRealTime = false;
      let isRecording = false;
      let mediaRecorder: MediaRecorder | null = null;
      let audioChunks: Blob[] = [];
      let realtimeInterval: ReturnType<typeof setInterval> | null = null;
      let timerInterval: ReturnType<typeof setInterval> | null = null;
      let recSeconds = 0;
      const fromLangSel = pipDocument.getElementById(
        "fromLang"
      ) as HTMLSelectElement;
      const toLangSel = pipDocument.getElementById(
        "toLang"
      ) as HTMLSelectElement;
      const stdBtn = pipDocument.getElementById("stdBtn") as HTMLButtonElement;
      const rtBtn = pipDocument.getElementById("rtBtn") as HTMLButtonElement;
      const recordBtn = pipDocument.getElementById(
        "recordBtn"
      ) as HTMLButtonElement;
      const origVal = pipDocument.getElementById("origVal") as HTMLElement;
      const transVal = pipDocument.getElementById("transVal") as HTMLElement;
      const copyOrig = pipDocument.getElementById(
        "copyOrig"
      ) as HTMLButtonElement;
      const copyTrans = pipDocument.getElementById(
        "copyTrans"
      ) as HTMLButtonElement;
      const recIcon = pipDocument.getElementById("recIcon") as HTMLElement;
      const recText = pipDocument.getElementById("recText") as HTMLElement;
      const clearBtn = pipDocument.getElementById(
        "clearBtn"
      ) as HTMLButtonElement;
      function setMode(real: boolean, clearText: boolean = true) {
        isRealTime = real;
        stdBtn.classList.toggle("active", !real);
        rtBtn.classList.toggle("active", real);
        rtBtn.classList.toggle("realtime-active", real);
        if (clearText) {
          origVal.textContent = "";
          transVal.textContent = "";
        }
      }
      stdBtn.onclick = () => setMode(false);
      rtBtn.onclick = () => setMode(true);
      fromLangSel.onchange = () => setMode(isRealTime, false);
      toLangSel.onchange = async () => {
        setMode(isRealTime, false);
        // Retranslate if there's existing translation text
        if (
          origVal.textContent &&
          origVal.textContent !== "Original" &&
          origVal.textContent.trim() !== ""
        ) {
          try {
            const requestBody = {
              text: origVal.textContent,
              targetLang: toLangSel.value,
              sourceLang: fromLangSel.value || undefined,
              autoDetect: !fromLangSel.value || fromLangSel.value === "auto",
            };

            const res = await fetch("/api/translate", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(requestBody),
            });
            const data = await res.json();
            if (res.ok) {
              transVal.textContent = data.translatedText || "";
            }
          } catch (error) {
            console.error("Retranslation failed:", error);
          }
        }
      };
      function formatTime(sec: number) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m.toString().padStart(2, "0")}:${s
          .toString()
          .padStart(2, "0")}`;
      }
      async function processAudio(blob: Blob, real: boolean) {
        const formData = new FormData();
        formData.append(
          "audio",
          blob,
          real ? "realtime.webm" : "recording.webm"
        );
        formData.append("targetLanguage", toLangSel.value);
        formData.append("baseLanguage", fromLangSel.value || "auto");
        formData.append("isRealtime", real ? "true" : "false");
        try {
          const res = await fetch("/api/voice", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (res.ok) {
            origVal.textContent = data.transcription || "";
            transVal.textContent = data.translation || "";
          } else {
            origVal.textContent = "";
            transVal.textContent = "";
          }
        } catch {
          origVal.textContent = "";
          transVal.textContent = "Network error";
        }
      }
      recordBtn.onclick = async () => {
        if (!isRecording) {
          // Start recording
          origVal.textContent = "";
          transVal.textContent = "";
          audioChunks = [];
          recSeconds = 0;
          recIcon.textContent = "■";
          recText.textContent = formatTime(recSeconds);
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
            });
            mediaRecorder = new MediaRecorder(stream, {
              mimeType: "audio/webm;codecs=opus",
            });
            mediaRecorder.ondataavailable = (e: BlobEvent) => {
              if (e.data.size > 0) audioChunks.push(e.data);
            };
            mediaRecorder.onstop = async () => {
              if (!isRealTime && mediaRecorder) {
                const audioBlob = new Blob(audioChunks, {
                  type: "audio/webm;codecs=opus",
                });
                await processAudio(audioBlob, false);
              }
              stream
                .getTracks()
                .forEach((track: MediaStreamTrack) => track.stop());
              isRecording = false;
              recIcon.textContent = "▶";
              recText.textContent = "Play";
              if (timerInterval) clearInterval(timerInterval);
              if (realtimeInterval) clearInterval(realtimeInterval);
            };
            mediaRecorder.start(2000);
            isRecording = true;
            timerInterval = setInterval(() => {
              recSeconds++;
              recText.textContent = formatTime(recSeconds);
            }, 1000);
            if (isRealTime) {
              realtimeInterval = setInterval(async () => {
                if (audioChunks.length === 0) return;
                const recentChunks = audioChunks.slice(-5);
                const audioBlob = new Blob(recentChunks, {
                  type: "audio/webm;codecs=opus",
                });
                await processAudio(audioBlob, true);
                if (audioChunks.length > 5) audioChunks = audioChunks.slice(-5);
              }, 4000);
            }
          } catch {
            transVal.textContent = "Microphone error";
            isRecording = false;
            recIcon.textContent = "▶";
            recText.textContent = "Play";
            if (timerInterval) clearInterval(timerInterval);
            if (realtimeInterval) clearInterval(realtimeInterval);
          }
        } else {
          // Stop recording
          if (mediaRecorder) mediaRecorder.stop();
          if (realtimeInterval) {
            clearInterval(realtimeInterval);
            realtimeInterval = null;
          }
          if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
          }
          isRecording = false;
          recIcon.textContent = "▶";
          recText.textContent = "Play";
        }
      };
      copyOrig.onclick = async () => {
        try {
          await newPipWindow.navigator.clipboard.writeText(
            origVal.textContent || ""
          );
          copyOrig.textContent = "✅";
          setTimeout(() => (copyOrig.textContent = "📋"), 1000);
        } catch {
          copyOrig.textContent = "❌";
          setTimeout(() => (copyOrig.textContent = "📋"), 1000);
        }
      };
      copyTrans.onclick = async () => {
        try {
          await newPipWindow.navigator.clipboard.writeText(
            transVal.textContent || ""
          );
          copyTrans.textContent = "✅";
          setTimeout(() => (copyTrans.textContent = "📋"), 1000);
        } catch {
          copyTrans.textContent = "❌";
          setTimeout(() => (copyTrans.textContent = "📋"), 1000);
        }
      };
      clearBtn.onclick = () => {
        origVal.textContent = "";
        transVal.textContent = "";
      };
      newPipWindow.addEventListener("beforeunload", () => {
        setPipWindow(null);
        if (realtimeInterval) clearInterval(realtimeInterval);
        if (timerInterval) clearInterval(timerInterval);
      });
      setMode(false);
      setPipWindow(newPipWindow as PiPWindow);

      // Theme toggle
      let isLight = false;
      const themeBtn = pipDocument.getElementById(
        "themeBtn"
      ) as HTMLButtonElement;
      if (themeBtn) {
        themeBtn.onclick = () => {
          isLight = !isLight;
          pipDocument.body.classList.toggle("light", isLight);
          themeBtn.textContent = isLight ? "☀️" : "🌙";
        };
      }

      // Swap button logic
      const swapBtn = pipDocument.getElementById(
        "swapBtn"
      ) as HTMLButtonElement;
      if (swapBtn) {
        swapBtn.onclick = async () => {
          console.log("Swap button clicked");

          // Store current values
          const fromVal = fromLangSel.value;
          const toVal = toLangSel.value;
          const origText = origVal.textContent?.trim();
          const transText = transVal.textContent?.trim();

          console.log("Before swap:", {
            fromLang: fromVal,
            toLang: toVal,
            origText: origText,
            transText: transText,
          });

          // Swap language selections
          fromLangSel.value = toVal;
          toLangSel.value = fromVal;

          // Check if we have meaningful content to work with
          const hasOrigText =
            origText && origText !== "Original" && origText.length > 0;
          const hasTransText =
            transText && transText !== "Translation" && transText.length > 0;

          console.log("Content check:", { hasOrigText, hasTransText });

          if (hasOrigText && hasTransText) {
            // Both texts exist - swap them
            console.log("Swapping both texts");
            origVal.textContent = transText;
            transVal.textContent = origText;
          } else if (hasOrigText && !hasTransText) {
            // Only original text exists - translate to new target language
            console.log("Translating original text to new target language");
            try {
              const requestBody = {
                text: origText,
                targetLang: toLangSel.value, // This is now the new target language
                sourceLang: fromLangSel.value || undefined, // This is now the new source language
                autoDetect: !fromLangSel.value || fromLangSel.value === "auto",
              };

              console.log("Translation request:", requestBody);

              const res = await fetch("/api/translate", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
              });
              const data = await res.json();
              if (res.ok) {
                transVal.textContent = data.translatedText || "";
                console.log("Translation successful:", data.translatedText);
              } else {
                console.error("Translation failed:", data);
              }
            } catch (error) {
              console.error("Translation after swap failed:", error);
            }
          } else if (!hasOrigText && hasTransText) {
            // Only translation text exists - move it to original
            console.log("Moving translation text to original");
            origVal.textContent = transText;
            transVal.textContent = "";
          }

          console.log("After swap:", {
            fromLang: fromLangSel.value,
            toLang: toLangSel.value,
            origText: origVal.textContent,
            transText: transVal.textContent,
          });
        };
      }

      // Insert Clock SVG into the Standard button
      const clockIcon = pipDocument.getElementById("clockIcon");
      if (clockIcon) {
        clockIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" style="width: 1.1em; height: 1.1em; margin-right: 0.5em; vertical-align: middle;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`;
      }

      // --- TTS logic for PiP window (mirroring TranslatePiP) ---
      let ttsAudioOrig: HTMLAudioElement | null = null;
      let ttsAudioTrans: HTMLAudioElement | null = null;
      let ttsUrlOrig: string | null = null;
      let ttsUrlTrans: string | null = null;
      type TTSState = "stopped" | "playing" | "paused" | "loading";
      let ttsStateOrig: TTSState = "stopped";
      let ttsStateTrans: TTSState = "stopped";
      let ttsTextOrig: string | null = null;
      let ttsLangOrig: string | null = null;
      let ttsTextTrans: string | null = null;
      let ttsLangTrans: string | null = null;

      function getTTSVoiceConfig(langCode: string): {
        languageCode: string;
        voiceName: string;
      } {
        const voiceMap: Record<
          string,
          { languageCode: string; voiceName: string }
        > = {
          en: { languageCode: "en-US", voiceName: "en-US-Wavenet-D" },
          hi: { languageCode: "hi-IN", voiceName: "hi-IN-Wavenet-A" },
          es: { languageCode: "es-ES", voiceName: "es-ES-Wavenet-B" },
          fr: { languageCode: "fr-FR", voiceName: "fr-FR-Wavenet-B" },
          de: { languageCode: "de-DE", voiceName: "de-DE-Wavenet-B" },
          it: { languageCode: "it-IT", voiceName: "it-IT-Wavenet-B" },
          pt: { languageCode: "pt-PT", voiceName: "pt-PT-Wavenet-B" },
          ru: { languageCode: "ru-RU", voiceName: "ru-RU-Wavenet-B" },
          ja: { languageCode: "ja-JP", voiceName: "ja-JP-Wavenet-B" },
          ko: { languageCode: "ko-KR", voiceName: "ko-KR-Wavenet-B" },
          "zh-CN": { languageCode: "cmn-CN", voiceName: "cmn-CN-Wavenet-B" },
          "zh-TW": { languageCode: "cmn-TW", voiceName: "cmn-TW-Wavenet-A" },
          ar: { languageCode: "ar-XA", voiceName: "ar-XA-Wavenet-B" },
          bn: { languageCode: "bn-IN", voiceName: "bn-IN-Standard-A" },
          pa: { languageCode: "pa-IN", voiceName: "pa-IN-Standard-A" },
          gu: { languageCode: "gu-IN", voiceName: "gu-IN-Standard-A" },
          ta: { languageCode: "ta-IN", voiceName: "ta-IN-Wavenet-A" },
          te: { languageCode: "te-IN", voiceName: "te-IN-Standard-A" },
          ml: { languageCode: "ml-IN", voiceName: "ml-IN-Standard-A" },
          mr: { languageCode: "mr-IN", voiceName: "mr-IN-Standard-A" },
          ur: { languageCode: "ur-IN", voiceName: "ur-IN-Standard-A" },
          tr: { languageCode: "tr-TR", voiceName: "tr-TR-Wavenet-B" },
          vi: { languageCode: "vi-VN", voiceName: "vi-VN-Wavenet-B" },
          id: { languageCode: "id-ID", voiceName: "id-ID-Wavenet-B" },
          th: { languageCode: "th-TH", voiceName: "th-TH-Wavenet-B" },
          pl: { languageCode: "pl-PL", voiceName: "pl-PL-Wavenet-B" },
          uk: { languageCode: "uk-UA", voiceName: "uk-UA-Wavenet-B" },
          ro: { languageCode: "ro-RO", voiceName: "ro-RO-Wavenet-B" },
          nl: { languageCode: "nl-NL", voiceName: "nl-NL-Wavenet-B" },
          sv: { languageCode: "sv-SE", voiceName: "sv-SE-Wavenet-B" },
          fi: { languageCode: "fi-FI", voiceName: "fi-FI-Wavenet-B" },
          no: { languageCode: "nb-NO", voiceName: "nb-NO-Wavenet-B" },
          da: { languageCode: "da-DK", voiceName: "da-DK-Wavenet-B" },
          cs: { languageCode: "cs-CZ", voiceName: "cs-CZ-Wavenet-B" },
          el: { languageCode: "el-GR", voiceName: "el-GR-Wavenet-B" },
          he: { languageCode: "he-IL", voiceName: "he-IL-Wavenet-B" },
          hu: { languageCode: "hu-HU", voiceName: "hu-HU-Wavenet-B" },
          uz: { languageCode: "uz-UZ", voiceName: "uz-UZ-Standard-A" },
        };
        return (
          voiceMap[langCode] || {
            languageCode: "en-US",
            voiceName: "en-US-Wavenet-D",
          }
        );
      }

      async function fetchTTSUrl(
        text: string,
        langCode: string
      ): Promise<string> {
        const config = getTTSVoiceConfig(langCode);
        const res = await fetch("https://flask-tts-server.onrender.com/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            languageCode: config.languageCode,
            voiceName: config.voiceName,
          }),
        });
        if (!res.ok) throw new Error("TTS API error");
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      }

      function setTTSBtnState(btn: HTMLElement | null, state: TTSState): void {
        if (!btn) return;
        if (state === "loading") {
          btn.innerHTML = `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" stroke-opacity=".3"/><path d="M12 2a10 10 0 0 1 10 10" class="animate-spin"/></svg><span class="pip-tts-tooltip">Loading...</span>`;
        } else if (state === "playing") {
          btn.innerHTML = `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg><span class="pip-tts-tooltip">Pause</span>`;
        } else if (state === "paused") {
          btn.innerHTML = `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg><span class="pip-tts-tooltip">Resume</span>`;
        } else {
          btn.innerHTML = `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg><span class="pip-tts-tooltip">Listen</span>`;
        }
      }

      async function handleTTSBtn(which: "orig" | "trans"): Promise<void> {
        let btn: HTMLElement | null,
          text: string,
          lang: string,
          ttsAudio: HTMLAudioElement | null,
          ttsUrl: string | null,
          ttsState: TTSState,
          ttsText: string | null,
          ttsLang: string | null;
        if (which === "orig") {
          btn = pipDocument.getElementById("ttsOrigBtn");
          text = origVal.textContent?.trim() || "";
          lang = fromLangSel.value || "en";
          ttsAudio = ttsAudioOrig;
          ttsUrl = ttsUrlOrig;
          ttsState = ttsStateOrig;
          ttsText = ttsTextOrig;
          ttsLang = ttsLangOrig;
        } else {
          btn = pipDocument.getElementById("ttsTransBtn");
          text = transVal.textContent?.trim() || "";
          lang = toLangSel.value || "en";
          ttsAudio = ttsAudioTrans;
          ttsUrl = ttsUrlTrans;
          ttsState = ttsStateTrans;
          ttsText = ttsTextTrans;
          ttsLang = ttsLangTrans;
        }
        if (!btn || !text) return;
        if (ttsState === "loading") return;
        if (ttsAudio && ttsState === "playing") {
          ttsAudio.pause();
          if (which === "orig") ttsStateOrig = "paused";
          else ttsStateTrans = "paused";
          setTTSBtnState(btn, "paused");
          return;
        }
        if (ttsAudio && ttsState === "paused") {
          ttsAudio.play();
          if (which === "orig") ttsStateOrig = "playing";
          else ttsStateTrans = "playing";
          setTTSBtnState(btn, "playing");
          return;
        }
        setTTSBtnState(btn, "loading");
        if (which === "orig") ttsStateOrig = "loading";
        else ttsStateTrans = "loading";
        if (ttsAudioOrig) {
          ttsAudioOrig.pause();
          ttsAudioOrig = null;
        }
        if (ttsAudioTrans) {
          ttsAudioTrans.pause();
          ttsAudioTrans = null;
        }
        try {
          const url =
            !ttsUrl || ttsText !== text || ttsLang !== lang
              ? await fetchTTSUrl(text, lang)
              : ttsUrl;
          const audio = new newPipWindow.window.Audio(url);
          audio.onended = () => {
            setTTSBtnState(btn, "stopped");
            if (which === "orig") ttsStateOrig = "stopped";
            else ttsStateTrans = "stopped";
          };
          audio.onpause = () => {
            setTTSBtnState(btn, "paused");
            if (which === "orig") ttsStateOrig = "paused";
            else ttsStateTrans = "paused";
          };
          audio.onplay = () => {
            setTTSBtnState(btn, "playing");
            if (which === "orig") ttsStateOrig = "playing";
            else ttsStateTrans = "playing";
          };
          if (which === "orig") {
            ttsAudioOrig = audio;
            ttsUrlOrig = url;
            ttsTextOrig = text;
            ttsLangOrig = lang;
            ttsStateOrig = "playing";
          } else {
            ttsAudioTrans = audio;
            ttsUrlTrans = url;
            ttsTextTrans = text;
            ttsLangTrans = lang;
            ttsStateTrans = "playing";
          }
          audio.play();
          setTTSBtnState(btn, "playing");
        } catch (e) {
          setTTSBtnState(btn, "stopped");
          if (which === "orig") ttsStateOrig = "stopped";
          else ttsStateTrans = "stopped";
          let msg = "Unknown error";
          if (e instanceof Error) msg = e.message;
          alert("TTS failed: " + msg);
        }
      }

      const ttsOrigBtn = pipDocument.getElementById("ttsOrigBtn");
      if (ttsOrigBtn) {
        setTTSBtnState(ttsOrigBtn, "stopped");
        ttsOrigBtn.addEventListener("click", function () {
          handleTTSBtn("orig");
        });
      }
      const ttsTransBtn = pipDocument.getElementById("ttsTransBtn");
      if (ttsTransBtn) {
        setTTSBtnState(ttsTransBtn, "stopped");
        ttsTransBtn.addEventListener("click", function () {
          handleTTSBtn("trans");
        });
      }
    } catch (error: unknown) {
      alert("Failed to open PiP: " + ((error as Error)?.message || error));
    }
  }
  return { isPipSupported, pipWindow, openHomePiP };
}
