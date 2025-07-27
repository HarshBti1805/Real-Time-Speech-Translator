import { useState, useEffect } from "react";

export function useTranslatePiP() {
  const [isPipSupported, setIsPipSupported] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [currentTranslation, setCurrentTranslation] = useState({
    original: "How are you?",
    translated: "Hola, ¿cómo estás?",
    fromLang: "English",
    toLang: "Spanish",
  });

  useEffect(() => {
    setIsPipSupported(
      typeof window !== "undefined" && "documentPictureInPicture" in window
    );
  }, []);

  // openPictureInPicture function is defined below and uses the above state
  async function openPictureInPicture() {
    try {
      if (!isPipSupported) {
        alert("Picture-in-Picture is not supported in this browser");
        return;
      }
      if (pipWindow && !(pipWindow as Window & { closed?: boolean }).closed) {
        pipWindow.close();
        return;
      }
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
        width: 950,
        height: 150,
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
          .pip-original {
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
            scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
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
            scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
          }
          body.light .pip-translated {
            color: #2563eb;
            background: #e0e7ff;
            border: 1px solid #c7d2fe;
          }
                    .pip-translated::-webkit-scrollbar {
            width: 8px;
            background: var(--scrollbar-track);
            border-radius: 6px;
          }
          body.light .pip-translated::-webkit-scrollbar {
            width: 8px;
            background: var(--scrollbar-track);
            border-radius: 6px;
          }
          .pip-translated::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 6px;
            border: 1px solid var(--scrollbar-track);
            transition: all 0.3s ease;
          }
          .pip-translated::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
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
          .pip-tts-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(90deg, #6366f1 0%, #a21caf 100%);
            border: none;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            margin-left: 6px;
            cursor: pointer;
            transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
            box-shadow: 0 2px 8px #6366f133;
            color: #fff;
            position: relative;
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
                <option value="ar">Arabic</option>
                <option value="hi">Hindi</option>
                <option value="tr">Turkish</option>
                <option value="nl">Dutch</option>
                <option value="el">Greek</option>
                <option value="he">Hebrew</option>
                <option value="pl">Polish</option>
                <option value="sv">Swedish</option>
                <option value="th">Thai</option>
                <option value="vi">Vietnamese</option>
                <option value="id">Indonesian</option>
                <option value="uk">Ukrainian</option>
                <option value="cs">Czech</option>
                <option value="fi">Finnish</option>
                <option value="hu">Hungarian</option>
                <option value="ro">Romanian</option>
                <option value="sk">Slovak</option>
                <option value="bg">Bulgarian</option>
                <option value="hr">Croatian</option>
                <option value="da">Danish</option>
                <option value="no">Norwegian</option>
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
                <option value="ar">Arabic</option>
                <option value="hi">Hindi</option>
                <option value="tr">Turkish</option>
                <option value="nl">Dutch</option>
                <option value="el">Greek</option>
                <option value="he">Hebrew</option>
                <option value="pl">Polish</option>
                <option value="sv">Swedish</option>
                <option value="th">Thai</option>
                <option value="vi">Vietnamese</option>
                <option value="id">Indonesian</option>
                <option value="uk">Ukrainian</option>
                <option value="cs">Czech</option>
                <option value="fi">Finnish</option>
                <option value="hu">Hungarian</option>
                <option value="ro">Romanian</option>
                <option value="sk">Slovak</option>
                <option value="bg">Bulgarian</option>
                <option value="hr">Croatian</option>
                <option value="da">Danish</option>
                <option value="no">Norwegian</option>
              </select>
              <span class="pip-translated" id="translatedText">${currentTranslation.translated}</span>
            </div>
          </div>
          <div class="pip-row" style="justify-content: center;">
            <div id="pip-lower-row" class="pip-quick" style="margin: 0 auto; display: flex; justify-content: center; align-items: center; gap: 10px;">
              <button class="pip-theme" id="themeBtn" title="Toggle dark/light mode">🌙</button>
              <button class="pip-tts-btn" id="ttsOriginalBtn" title="Listen to original">
                <svg viewBox="2 2 21 21" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
                <span class="pip-tts-tooltip">Listen to original</span>
              </button>

              <button class="pip-copy" id="copySourceBtn" title="Copy source">📋</button>
              <input type="text" id="quickInput" placeholder="Type to translate...">
              <button class="pip-copy" id="copyBtn" title="Copy translation">📋</button>
              <button class="pip-tts-btn" id="ttsTranslatedBtn" title="Listen to translation">
                <svg viewBox="2 2 21 21" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
                <span class="pip-tts-tooltip">Listen to translation</span>
              </button>
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
      // --- TTS logic for PiP window (improved, robust, TTSListenButton-style) ---
      // State for TTS audio and playback
      let ttsAudioOriginal: HTMLAudioElement | null = null;
      let ttsAudioTranslated: HTMLAudioElement | null = null;
      let ttsUrlOriginal: string | null = null;
      let ttsUrlTranslated: string | null = null;
      let ttsStateOriginal: "playing" | "paused" | "stopped" | "loading" =
        "stopped";
      let ttsStateTranslated: "playing" | "paused" | "stopped" | "loading" =
        "stopped";
      let ttsTextOriginal: string | null = null;
      let ttsLangOriginal: string | null = null;
      let ttsTextTranslated: string | null = null;
      let ttsLangTranslated: string | null = null;

      // Language code to TTS config mapping (copied from TTSListenButton)
      function getTTSVoiceConfig(langCode: string) {
        const voiceMap: {
          [key: string]: { languageCode: string; voiceName: string };
        } = {
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

      // Helper: set button icon and tooltip
      function setTTSBtnState(
        btn: HTMLElement,
        state: "playing" | "paused" | "stopped" | "loading"
      ) {
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

      // Helper: fetch TTS audio URL
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

      // Helper: stop and cleanup audio
      function stopAndCleanupAudio(which: "original" | "translated") {
        if (which === "original") {
          if (ttsAudioOriginal) {
            ttsAudioOriginal.pause();
            ttsAudioOriginal.currentTime = 0;
            ttsAudioOriginal = null;
          }
          if (ttsUrlOriginal) {
            URL.revokeObjectURL(ttsUrlOriginal);
            ttsUrlOriginal = null;
          }
          ttsStateOriginal = "stopped";
        } else {
          if (ttsAudioTranslated) {
            ttsAudioTranslated.pause();
            ttsAudioTranslated.currentTime = 0;
            ttsAudioTranslated = null;
          }
          if (ttsUrlTranslated) {
            URL.revokeObjectURL(ttsUrlTranslated);
            ttsUrlTranslated = null;
          }
          ttsStateTranslated = "stopped";
        }
      }

      // Main handler for TTS button
      async function handleTTSBtn(which: "original" | "translated") {
        let btn: HTMLElement | null,
          text: string,
          lang: string,
          ttsAudio: HTMLAudioElement | null,
          ttsUrl: string | null,
          ttsState: typeof ttsStateOriginal,
          ttsText: string | null,
          ttsLang: string | null;
        if (which === "original") {
          btn = pipDocument.getElementById("ttsOriginalBtn");
          text = (
            pipDocument.getElementById("originalText")?.textContent || ""
          ).trim();
          lang =
            (pipDocument.getElementById("fromLang") as HTMLSelectElement)
              ?.value || "en";
          ttsAudio = ttsAudioOriginal;
          ttsUrl = ttsUrlOriginal;
          ttsState = ttsStateOriginal;
          ttsText = ttsTextOriginal;
          ttsLang = ttsLangOriginal;
        } else {
          btn = pipDocument.getElementById("ttsTranslatedBtn");
          text = (
            pipDocument.getElementById("translatedText")?.textContent || ""
          ).trim();
          lang =
            (pipDocument.getElementById("toLang") as HTMLSelectElement)
              ?.value || "es";
          ttsAudio = ttsAudioTranslated;
          ttsUrl = ttsUrlTranslated;
          ttsState = ttsStateTranslated;
          ttsText = ttsTextTranslated;
          ttsLang = ttsLangTranslated;
        }
        if (!btn || !text) return;
        // If loading, ignore
        if (ttsState === "loading") return;
        // If playing, pause
        if (ttsAudio && ttsState === "playing") {
          ttsAudio.pause();
          if (which === "original") ttsStateOriginal = "paused";
          else ttsStateTranslated = "paused";
          setTTSBtnState(btn, "paused");
          return;
        }
        // If paused, resume
        if (ttsAudio && ttsState === "paused") {
          ttsAudio.play();
          if (which === "original") ttsStateOriginal = "playing";
          else ttsStateTranslated = "playing";
          setTTSBtnState(btn, "playing");
          return;
        }
        // If text/lang changed or stopped, fetch new audio
        setTTSBtnState(btn, "loading");
        if (which === "original") ttsStateOriginal = "loading";
        else ttsStateTranslated = "loading";
        // Always stop previous audio and cleanup
        stopAndCleanupAudio(which);
        try {
          const url =
            !ttsUrl || ttsText !== text || ttsLang !== lang
              ? await fetchTTSUrl(text, lang)
              : ttsUrl;
          const audio = new newPipWindow.window.Audio(url);
          // Attach event listeners to keep button state in sync
          audio.onended = () => {
            setTTSBtnState(btn!, "stopped");
            if (which === "original") ttsStateOriginal = "stopped";
            else ttsStateTranslated = "stopped";
          };
          audio.onpause = () => {
            setTTSBtnState(btn!, "paused");
            if (which === "original") ttsStateOriginal = "paused";
            else ttsStateTranslated = "paused";
          };
          audio.onplay = () => {
            setTTSBtnState(btn!, "playing");
            if (which === "original") ttsStateOriginal = "playing";
            else ttsStateTranslated = "playing";
          };
          if (which === "original") {
            ttsAudioOriginal = audio;
            ttsUrlOriginal = url;
            ttsTextOriginal = text;
            ttsLangOriginal = lang;
            ttsStateOriginal = "playing";
          } else {
            ttsAudioTranslated = audio;
            ttsUrlTranslated = url;
            ttsTextTranslated = text;
            ttsLangTranslated = lang;
            ttsStateTranslated = "playing";
          }
          audio.play();
          setTTSBtnState(btn, "playing");
        } catch (e) {
          setTTSBtnState(btn, "stopped");
          if (which === "original") ttsStateOriginal = "stopped";
          else ttsStateTranslated = "stopped";
          const errMsg =
            typeof e === "object" && e && "message" in e
              ? (e as { message: string }).message
              : "Unknown error";
          alert("TTS failed: " + errMsg);
        }
      }

      // Listen button for original text
      const ttsOriginalBtn = pipDocument.getElementById("ttsOriginalBtn");
      if (ttsOriginalBtn) {
        setTTSBtnState(ttsOriginalBtn, "stopped");
        ttsOriginalBtn.addEventListener("click", function () {
          handleTTSBtn("original");
        });
      }
      // Listen button for translated text
      const ttsTranslatedBtn = pipDocument.getElementById("ttsTranslatedBtn");
      if (ttsTranslatedBtn) {
        setTTSBtnState(ttsTranslatedBtn, "stopped");
        ttsTranslatedBtn.addEventListener("click", function () {
          handleTTSBtn("translated");
        });
      }
      // Reset TTS state on text/lang change (quick input, swap, clear, etc)
      const quickInput = pipDocument.getElementById(
        "quickInput"
      ) as HTMLInputElement | null;
      if (quickInput) {
        quickInput.addEventListener("input", () => {
          stopAndCleanupAudio("original");
          stopAndCleanupAudio("translated");
          if (ttsOriginalBtn) setTTSBtnState(ttsOriginalBtn, "stopped");
          if (ttsTranslatedBtn) setTTSBtnState(ttsTranslatedBtn, "stopped");
        });
      }
      const fromLangSel = pipDocument.getElementById(
        "fromLang"
      ) as HTMLSelectElement | null;
      const toLangSel = pipDocument.getElementById(
        "toLang"
      ) as HTMLSelectElement | null;
      if (fromLangSel) {
        fromLangSel.addEventListener("change", () => {
          stopAndCleanupAudio("original");
          stopAndCleanupAudio("translated");
          if (ttsOriginalBtn) setTTSBtnState(ttsOriginalBtn, "stopped");
          if (ttsTranslatedBtn) setTTSBtnState(ttsTranslatedBtn, "stopped");
        });
      }
      if (toLangSel) {
        toLangSel.addEventListener("change", () => {
          stopAndCleanupAudio("original");
          stopAndCleanupAudio("translated");
          if (ttsOriginalBtn) setTTSBtnState(ttsOriginalBtn, "stopped");
          if (ttsTranslatedBtn) setTTSBtnState(ttsTranslatedBtn, "stopped");
        });
      }
      // Also reset on clear
      const clearBtn = pipDocument.getElementById("clearBtn");
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          stopAndCleanupAudio("original");
          stopAndCleanupAudio("translated");
          if (ttsOriginalBtn) setTTSBtnState(ttsOriginalBtn, "stopped");
          if (ttsTranslatedBtn) setTTSBtnState(ttsTranslatedBtn, "stopped");
        });
      }
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
  }

  return {
    isPipSupported,
    pipWindow,
    currentTranslation,
    setCurrentTranslation,
    openPictureInPicture,
  };
}
