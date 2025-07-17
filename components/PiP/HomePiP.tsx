import { useState, useEffect } from "react";

const languageOptions = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "hi", name: "Hindi" },
  { code: "de", name: "German" },
  { code: "zh", name: "Chinese" },
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
      ).documentPictureInPicture.requestWindow({ width: 440, height: 520 });
      const pipDocument = newPipWindow.document;
      pipDocument.head.innerHTML = `
        <style>
          body { font-family: 'JetBrains Mono', 'Segoe UI', Arial, sans-serif; background: #18181b; color: #fff; margin: 0; }
          body.light { background: #f8fafc; color: #222; }
          .pip-wrap { padding: 18px 16px 10px 16px; min-width: 0; max-width: 400px; margin: 0 auto; }
          .pip-title { font-size: 1.3em; font-weight: bold; margin-bottom: 10px; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px; }
          .pip-modes { display: flex; gap: 8px; margin-bottom: 12px; justify-content: center; }
          .pip-mode-btn { padding: 7px 18px; border-radius: 999px; border: none; font-weight: 600; cursor: pointer; font-size: 1em; display: flex; align-items: center; gap: 6px; transition: background 0.2s, color 0.2s; }
          .pip-mode-btn.active { background: linear-gradient(90deg, #6366f1 0%, #a21caf 100%); color: #fff; box-shadow: 0 2px 8px #6366f144; }
          .pip-mode-btn:not(.active) { background: #232334; color: #a5b4fc; border: 1.5px solid #363646; }
          .pip-mode-btn[title] { position: relative; }
          .pip-mode-btn[title]:hover::after { content: attr(title); position: absolute; left: 50%; top: 110%; transform: translateX(-50%); background: #232334; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 0.9em; white-space: nowrap; z-index: 10; box-shadow: 0 2px 8px #23233444; }
          .pip-controls { margin-bottom: 12px; display: flex; gap: 8px; justify-content: center; }
          .pip-select { border-radius: 8px; padding: 7px 12px; font-size: 1em; background: #232334; color: #fff; border: 1.5px solid #363646; min-width: 110px; }
          body.light .pip-select { background: #f3f4f6; color: #222; border: 1.5px solid #a5b4fc; }
          .pip-record-controls { margin-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 10px; }
          .pip-btn { padding: 8px 18px; border-radius: 999px; border: none; font-weight: 600; cursor: pointer; font-size: 1em; transition: background 0.2s, color 0.2s; display: flex; align-items: center; gap: 7px; }
          .pip-btn.pip-record { background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%); color: #fff; box-shadow: 0 2px 8px #22c55e33; }
          .pip-btn.pip-stop { background: linear-gradient(90deg, #ef4444 0%, #a21caf 100%); color: #fff; box-shadow: 0 2px 8px #ef444433; }
          .pip-btn:disabled { opacity: 0.6; cursor: not-allowed; }
          .pip-indicator { width: 12px; height: 12px; border-radius: 50%; background: #ef4444; margin-right: 7px; animation: pip-pulse 1s infinite alternate; display: inline-block; }
          @keyframes pip-pulse { 0% { box-shadow: 0 0 0 0 #ef444488; } 100% { box-shadow: 0 0 0 6px #ef444400; } }
          .pip-timer { font-size: 1em; color: #a5b4fc; margin-left: 4px; font-family: inherit; }
          .pip-label { font-size: 1em; color: #a5b4fc; margin-bottom: 2px; margin-top: 10px; font-weight: 500; }
          .pip-result, .pip-translation { border-radius: 10px; padding: 10px 12px; margin-bottom: 6px; font-size: 1.08em; min-height: 32px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
          .pip-result { background: linear-gradient(90deg, #232334 60%, #363646 100%); color: #fff; border: 1.5px solid #363646; }
          .pip-translation { background: linear-gradient(90deg, #2563eb22 60%, #a5b4fc22 100%); color: #22d3ee; border: 1.5px solid #2563eb44; }
          .pip-copy-btn { background: none; border: none; color: #a5b4fc; cursor: pointer; font-size: 1.1em; margin-left: 4px; transition: color 0.2s; }
          .pip-copy-btn:hover { color: #6366f1; }
          .pip-footer { font-size: 0.92em; color: #888; margin-top: 16px; text-align: center; }
          .pip-footer .pip-help { margin-left: 6px; cursor: pointer; color: #6366f1; }
          .pip-footer .pip-help:hover::after { content: 'Standard: Record then translate. Real-Time: Live updates.'; position: absolute; left: 50%; top: 120%; transform: translateX(-50%); background: #232334; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 0.9em; white-space: nowrap; z-index: 10; box-shadow: 0 2px 8px #23233444; }
          @media (max-width: 480px) { .pip-wrap { padding: 8px 2px; } .pip-title { font-size: 1.1em; } }
        </style>
      `;
      pipDocument.body.innerHTML = `<div class=\"pip-wrap\">
        <div class=\"pip-title\"><span>🎙️</span> Audio Translation</div>
        <div class=\"pip-modes\">
          <button class=\"pip-mode-btn active\" id=\"stdBtn\" title=\"Standard: Record then translate\">⏱️ Standard</button>
          <button class=\"pip-mode-btn\" id=\"rtBtn\" title=\"Real-Time: Live updates\">⚡ Real-Time</button>
        </div>
        <div class=\"pip-controls\">
          <select class=\"pip-select\" id=\"fromLang\">
            ${languageOptions
              .map((l) => `<option value=\"${l.code}\">${l.name}</option>`)
              .join("")}
          </select>
          <select class=\"pip-select\" id=\"toLang\">
            ${languageOptions
              .map((l) => `<option value=\"${l.code}\">${l.name}</option>`)
              .join("")}
          </select>
        </div>
        <div class=\"pip-record-controls\">
          <button class=\"pip-btn pip-record\" id=\"recordBtn\"><span id=\"recIcon\">●</span> Start Recording</button>
          <button class=\"pip-btn pip-stop\" id=\"stopBtn\" style=\"display:none;\"><span>■</span> Stop</button>
          <span class=\"pip-timer\" id=\"timer\"></span>
        </div>
        <div class=\"pip-label\">Original <span id=\"fromLangLabel\"></span></div>
        <div class=\"pip-result\" id=\"origText\"><span id=\"origVal\"></span><button class=\"pip-copy-btn\" id=\"copyOrig\" title=\"Copy\">📋</button></div>
        <div class=\"pip-label\">Translation <span id=\"toLangLabel\"></span></div>
        <div class=\"pip-translation\" id=\"transText\"><span id=\"transVal\"></span><button class=\"pip-copy-btn\" id=\"copyTrans\" title=\"Copy\">📋</button></div>
        <div class=\"pip-footer\">Standard: Record then translate. Real-Time: Live updates.<span class=\"pip-help\" title=\"Help\">❓</span></div>
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
      const stopBtn = pipDocument.getElementById(
        "stopBtn"
      ) as HTMLButtonElement;
      //   const origText = pipDocument.getElementById("origText") as HTMLElement;
      //   const transText = pipDocument.getElementById("transText") as HTMLElement;
      const origVal = pipDocument.getElementById("origVal") as HTMLElement;
      const transVal = pipDocument.getElementById("transVal") as HTMLElement;
      const copyOrig = pipDocument.getElementById(
        "copyOrig"
      ) as HTMLButtonElement;
      const copyTrans = pipDocument.getElementById(
        "copyTrans"
      ) as HTMLButtonElement;
      const modeDesc = pipDocument.querySelector(".pip-footer") as HTMLElement;
      const timerEl = pipDocument.getElementById("timer") as HTMLElement;
      const recIcon = pipDocument.getElementById("recIcon") as HTMLElement;
      const fromLangLabel = pipDocument.getElementById(
        "fromLangLabel"
      ) as HTMLElement;
      const toLangLabel = pipDocument.getElementById(
        "toLangLabel"
      ) as HTMLElement;
      function setMode(real: boolean) {
        isRealTime = real;
        stdBtn.classList.toggle("active", !real);
        rtBtn.classList.toggle("active", real);
        modeDesc.textContent = real
          ? "Real-Time: Live translation updates every 2 seconds. <span class='pip-help' title='Help'>❓</span>"
          : "Standard: Record then translate. <span class='pip-help' title='Help'>❓</span>";
        origVal.textContent = "";
        transVal.textContent = "";
        timerEl.textContent = "";
        fromLangLabel.textContent = fromLangSel.selectedOptions[0].text
          ? `(${fromLangSel.selectedOptions[0].text})`
          : "";
        toLangLabel.textContent = toLangSel.selectedOptions[0].text
          ? `(${toLangSel.selectedOptions[0].text})`
          : "";
      }
      stdBtn.onclick = () => setMode(false);
      rtBtn.onclick = () => setMode(true);
      fromLangSel.onchange = () => setMode(isRealTime);
      toLangSel.onchange = () => setMode(isRealTime);
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
            transVal.textContent = data.error || "Error";
          }
        } catch {
          origVal.textContent = "";
          transVal.textContent = "Network error";
        }
      }
      recordBtn.onclick = async () => {
        if (isRecording) return;
        origVal.textContent = "";
        transVal.textContent = "";
        audioChunks = [];
        recSeconds = 0;
        timerEl.textContent = "00:00";
        recIcon.innerHTML = '<span class="pip-indicator"></span>';
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
            recordBtn.style.display = "";
            stopBtn.style.display = "none";
            timerEl.textContent = "";
            recIcon.innerHTML = "●";
            if (timerInterval) clearInterval(timerInterval);
          };
          mediaRecorder.start(2000);
          isRecording = true;
          recordBtn.style.display = "none";
          stopBtn.style.display = "";
          timerInterval = setInterval(() => {
            recSeconds++;
            timerEl.textContent = formatTime(recSeconds);
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
        }
      };
      stopBtn.onclick = () => {
        if (!isRecording) return;
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
        recordBtn.style.display = "";
        stopBtn.style.display = "none";
        timerEl.textContent = "";
        recIcon.innerHTML = "●";
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
      newPipWindow.addEventListener("beforeunload", () => {
        setPipWindow(null);
        if (realtimeInterval) clearInterval(realtimeInterval);
        if (timerInterval) clearInterval(timerInterval);
      });
      setMode(false);
      setPipWindow(newPipWindow as PiPWindow);
    } catch (error: unknown) {
      alert("Failed to open PiP: " + ((error as Error)?.message || error));
    }
  }
  return { isPipSupported, pipWindow, openHomePiP };
}
