"use client";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Upload,
  Copy,
  FileText,
  CheckCircle,
  FileDown,
  X,
  Music,
  Sparkles,
} from "lucide-react";

export default function FileUpload() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<string>("mp3");
  const [transcription, setTranscription] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = async (fileToSend: File) => {
    setIsProcessing(true);
    setUploadProgress(0);
    console.log("[FileUpload] handleUpload called with file:", fileToSend);
    const formData = new FormData();
    formData.append("audio", fileToSend);
    formData.append("fileType", fileType);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const res = await fetch("/api/file", {
        method: "POST",
        body: formData,
      });
      console.log("[FileUpload] /api/file response status:", res.status);
      const data = await res.json();
      console.log("[FileUpload] /api/file response data:", data);
      setTranscription(data.transcription || "Failed to recognize speech.");
      setUploadProgress(100);

      // Save to transcription history
      fetch("/api/transcription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputType: "file",
          inputValue: fileToSend.name,
          outputValue: data.transcription,
        }),
      })
        .then((res) => {
          console.log(
            "[FileUpload] /api/transcription response status:",
            res.status
          );
          return res.json();
        })
        .then((data) => {
          console.log("[FileUpload] /api/transcription response data:", data);
        })
        .catch((err) => {
          console.error("[FileUpload] /api/transcription error:", err);
        });
    } catch (error) {
      console.error("[FileUpload] Upload error:", error);
      setTranscription("Error processing file.");
    } finally {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find((file) => file.type.startsWith("audio/"));
    if (audioFile) {
      setAudioFile(audioFile);
      const ext = audioFile.name.split(".").pop()?.toLowerCase();
      if (ext) setFileType(ext);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAudioFile(file);
    console.log("[FileUpload] File selected:", file);
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext) setFileType(ext);
      console.log("[FileUpload] Detected file extension:", ext);
    }
  };

  const clearFile = () => {
    setAudioFile(null);
    setFileType("mp3");
    setTranscription("");
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-xl">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4"></div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
              isDragOver
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500"
            }`}
          >
            {audioFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <Music className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {audioFile.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {formatFileSize(audioFile.size)} • {fileType.toUpperCase()}
                  </p>
                </div>
                <Button
                  onClick={clearFile}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove File
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <Upload className="w-8 h-8 text-slate-600 dark:text-slate-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Drop your audio file here
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    or click to browse files
                  </p>
                </div>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* File Type Display */}
          {audioFile && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    File Type
                  </p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {fileType.toUpperCase()}
                  </p>
                </div>
                <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Audio File
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  Processing...
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  {uploadProgress}%
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Transcribe Button */}
          <Button
            disabled={!audioFile || isProcessing}
            onClick={() => audioFile && handleUpload(audioFile)}
            className="w-full h-10 cursor-pointer font-mono bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Processing Audio...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-3" />
                Transcribe Audio File
              </>
            )}
          </Button>

          {/* Supported Formats */}
          <div className="text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Supported formats: MP3, WAV, M4A, FLAC, OGG
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {transcription && (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-green-800 dark:text-green-200 flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              Transcription Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-green-200 dark:border-green-700 shadow-sm">
              <p className="whitespace-pre-wrap text-slate-800 dark:text-slate-200 leading-relaxed text-lg">
                {transcription}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              {/* Copy Button */}
              <Button
                onClick={copyToClipboard}
                variant="outline"
                className={`w-full h-12 border-2 text-lg font-medium transition-all duration-300 ${
                  copySuccess
                    ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                    : "border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500"
                }`}
              >
                {copySuccess ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-3" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5 mr-3" />
                    Copy to Clipboard
                  </>
                )}
              </Button>

              {/* Download Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  onClick={downloadAsText}
                  variant="outline"
                  className="h-12 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-300 dark:hover:bg-green-900/20 transition-all duration-300"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  TXT
                </Button>
                <Button
                  onClick={downloadAsPDF}
                  variant="outline"
                  className="h-12 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/20 transition-all duration-300"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  HTML
                </Button>
                <Button
                  onClick={downloadAsDoc}
                  variant="outline"
                  className="h-12 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900/20 transition-all duration-300"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  DOC
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
