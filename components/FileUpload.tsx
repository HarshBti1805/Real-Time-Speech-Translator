"use client";
import { useState } from "react";

export default function FileUpload() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<string>("mp3");
  const [transcription, setTranscription] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  const handleUpload = async (fileToSend: File) => {
    const formData = new FormData();
    formData.append("audio", fileToSend);
    formData.append("fileType", fileType);

    const res = await fetch("http://localhost:3000/api/file", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    console.log(data);
    setTranscription(data.transcription || "Failed to recognize speech.");
  };

  const copyToClipboard = async () => {
    if (!transcription) return;

    try {
      await navigator.clipboard.writeText(transcription);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = transcription;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const downloadAsPDF = () => {
    if (!transcription) return;

    // Create a simple PDF using a data URL approach
    const pdfContent = `
      <html>
        <head>
          <title>Transcription</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .content { margin-top: 20px; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>Audio Transcription</h1>
          <div class="content">${transcription}</div>
        </body>
      </html>
    `;

    const blob = new Blob([pdfContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcription_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsDoc = () => {
    if (!transcription) return;

    const docContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>Transcription</title>
          <!--[if gte mso 9]>
            <xml>
              <w:WordDocument>
                <w:View>Print</w:View>
                <w:Zoom>90</w:Zoom>
                <w:DoNotPromptForConvert/>
                <w:DoNotShowInsertionsAndDeletions/>
              </w:WordDocument>
            </xml>
          <![endif]-->
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .content { margin-top: 20px; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>Audio Transcription</h1>
          <div class="content">${transcription}</div>
        </body>
      </html>
    `;

    const blob = new Blob([docContent], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcription_${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsText = () => {
    if (!transcription) return;

    const blob = new Blob([transcription], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcription_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Speech to Text (Auto Language)</h1>

      {/* File input */}
      <input
        type="file"
        accept="audio/*"
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          setAudioFile(file);
          if (file) {
            const ext = file.name.split(".").pop()?.toLowerCase();
            if (ext) setFileType(ext);
          }
        }}
        className="mb-4"
      />

      {/* Selected file type input */}
      <div>
        <label className="block mb-1 font-medium">Detected File Type:</label>
        <input
          type="text"
          value={fileType}
          readOnly
          className="border text-black p-2 mb-4 w-full bg-gray-100"
        />
      </div>

      {/* Transcribe uploaded file */}
      <button
        disabled={!audioFile}
        onClick={() => audioFile && handleUpload(audioFile)}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4 disabled:opacity-50"
      >
        Transcribe Uploaded File
      </button>

      {/* Result */}
      {transcription && (
        <div className="mt-4">
          <h2 className="font-semibold mb-2">Transcription:</h2>
          <div className="bg-gray-50 p-4 rounded border mb-4">
            <p className="whitespace-pre-wrap text-black">{transcription}</p>
          </div>

          {/* Copy to clipboard button */}
          <div className="mb-4">
            <button
              onClick={copyToClipboard}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                copySuccess
                  ? "bg-green-600 text-white"
                  : "bg-gray-600 text-white hover:bg-gray-700"
              }`}
            >
              {copySuccess ? "Copied!" : "Copy to Clipboard"}
            </button>
          </div>

          {/* Download buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={downloadAsText}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
            >
              Download as TXT
            </button>
            <button
              onClick={downloadAsPDF}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              Download as HTML
            </button>
            <button
              onClick={downloadAsDoc}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Download as DOC
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
