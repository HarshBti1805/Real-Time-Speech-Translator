"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Upload,
  Copy,
  FileText,
  FileAudio,
  CheckCircle,
  FileDown,
} from "lucide-react";

export default function FileUpload() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<string>("mp3");
  const [transcription, setTranscription] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpload = async (fileToSend: File) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append("audio", fileToSend);
    formData.append("fileType", fileType);

    try {
      const res = await fetch("/api/file", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log(data);
      setTranscription(data.transcription || "Failed to recognize speech.");
      // Save to transcription history
      fetch("/api/transcription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputType: "file",
          inputValue: fileToSend.name,
          outputValue: data.transcription,
        }),
      });
    } catch (error) {
      console.error("Upload error:", error);
      setTranscription("Error processing file.");
    } finally {
      setIsProcessing(false);
    }
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
            body { font-family: 'Product Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; letter-spacing: 0.025em; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; letter-spacing: 0.05em; }
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
            body { font-family: 'Product Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; letter-spacing: 0.025em; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; letter-spacing: 0.05em; }
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
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center">
            <FileAudio className="w-5 h-5 mr-2" />
            Speech to Text (Auto Language)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground/90">
              Select Audio File:
            </label>
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
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-muted file:text-foreground hover:file:bg-accent file:cursor-pointer"
            />
          </div>

          {/* Selected file type input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground/90">
              Detected File Type:
            </label>
            <input
              type="text"
              value={fileType}
              readOnly
              className="w-full bg-muted border border-border rounded-lg p-3 text-foreground"
            />
          </div>

          {/* Transcribe uploaded file */}
          <Button
            disabled={!audioFile || isProcessing}
            onClick={() => audioFile && handleUpload(audioFile)}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Transcribe Uploaded File
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {transcription && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Transcription Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg border border-border">
              <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                {transcription}
              </p>
            </div>

            {/* Copy to clipboard button */}
            <Button
              onClick={copyToClipboard}
              variant="outline"
              className={`border-border text-foreground hover:bg-accent flex items-center gap-2 ${
                copySuccess ? "border-green-500/30 text-green-400" : ""
              }`}
            >
              {copySuccess ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>

            {/* Download buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={downloadAsText}
                variant="outline"
                className="border-green-500/30 text-green-400 hover:bg-green-500/20 flex items-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                Download as TXT
              </Button>
              <Button
                onClick={downloadAsPDF}
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/20 flex items-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                Download as HTML
              </Button>
              <Button
                onClick={downloadAsDoc}
                variant="outline"
                className="border-blue-500/30 text-blue-400 hover:bg-blue-500/20 flex items-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                Download as DOC
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
