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
  FileAudio,
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
    <div className="space-y-8">
      {/* Enhanced Header Card */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30 border-2 border-blue-200/60 dark:border-blue-700/60 shadow-2xl">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 dark:from-blue-400/10 dark:to-indigo-400/10"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-400/20 to-transparent rounded-full blur-2xl"></div>

        <CardHeader className="relative text-center pb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
              <Music className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Audio File Transcription
          </CardTitle>
          <p className="text-lg text-blue-700 dark:text-blue-300 max-w-2xl mx-auto leading-relaxed">
            Transform your audio files into accurate text transcriptions with
            AI-powered speech recognition technology.
          </p>
        </CardHeader>
      </Card>

      {/* Enhanced Drag & Drop Zone */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-blue-200/60 dark:border-blue-700/60 shadow-xl">
        <CardContent className="p-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-3 border-dashed rounded-2xl p-12 text-center transition-all duration-500 ${
              isDragOver
                ? "border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 scale-105 shadow-2xl"
                : "border-blue-300 dark:border-blue-600 hover:border-blue-400 dark:hover:border-blue-500 hover:scale-[1.02] shadow-lg hover:shadow-xl"
            }`}
          >
            {/* Background Effects */}
            {isDragOver && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl animate-pulse"></div>
            )}

            {audioFile ? (
              <div className="relative space-y-6">
                <div className="flex items-center justify-center">
                  <div className="p-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-xl">
                    <FileAudio className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {audioFile.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-700/50 px-4 py-2 rounded-lg">
                    {formatFileSize(audioFile.size)} • {fileType.toUpperCase()}
                  </p>
                </div>
                <Button
                  onClick={clearFile}
                  variant="outline"
                  size="sm"
                  className="bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove File
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="p-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl shadow-2xl transform hover:scale-110 transition-transform duration-300">
                    <Upload className="w-12 h-12 text-white" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Drop your audio file here
                  </h3>
                  <p className="text-lg text-slate-500 dark:text-slate-400">
                    or click to browse files
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full border border-blue-200 dark:border-blue-700">
                      MP3
                    </span>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full border border-blue-200 dark:border-blue-700">
                      WAV
                    </span>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full border border-blue-200 dark:border-blue-700">
                      M4A
                    </span>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full border border-blue-200 dark:border-blue-700">
                      FLAC
                    </span>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full border border-blue-200 dark:border-blue-700">
                      OGG
                    </span>
                  </div>
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
        </CardContent>
      </Card>

      {/* Enhanced File Type Display */}
      {audioFile && (
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-blue-200/60 dark:border-blue-700/60 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <Music className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    File Type
                  </p>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {fileType.toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-lg">
                <span className="text-sm font-bold text-white">Audio File</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Progress Bar */}
      {isProcessing && (
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-blue-200/60 dark:border-blue-700/60 shadow-xl">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-blue-700 dark:text-blue-300 flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                  Processing audio...
                </span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full">
                  {uploadProgress}%
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out shadow-lg"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Transcribe Button */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-blue-200/60 dark:border-blue-700/60 shadow-xl">
        <CardContent className="p-6">
          <Button
            disabled={!audioFile || isProcessing}
            onClick={() => audioFile && handleUpload(audioFile)}
            className="w-full h-16 cursor-pointer font-bold bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 text-white text-xl transition-all duration-300 shadow-2xl hover:shadow-3xl disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-4"></div>
                Processing Audio...
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6 mr-4" />
                Transcribe Audio File
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Enhanced Result */}
      {transcription && (
        <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/30 dark:via-emerald-900/30 dark:to-teal-900/30 border-2 border-green-200/60 dark:border-green-700/60 shadow-2xl">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 dark:from-green-400/10 dark:to-emerald-400/10"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/20 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-400/20 to-transparent rounded-full blur-2xl"></div>

          <CardHeader className="relative">
            <CardTitle className="text-2xl font-bold text-green-800 dark:text-green-200 flex items-center">
              <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl mr-4 shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              Transcription Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-6">
            {/* Enhanced Transcription Display */}
            <div className="bg-white/90 dark:bg-slate-800/90 p-6 rounded-2xl border border-green-200/60 dark:border-green-700/60 shadow-lg">
              <p className="whitespace-pre-wrap text-slate-800 dark:text-slate-200 leading-relaxed text-lg">
                {transcription}
              </p>
            </div>

            {/* Enhanced Action Buttons */}
            <div className="space-y-4">
              {/* Copy Button */}
              <Button
                onClick={copyToClipboard}
                variant="outline"
                className={`w-full h-14 border-2 text-lg font-semibold transition-all duration-300 ${
                  copySuccess
                    ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 shadow-lg"
                    : "border-green-300 dark:border-green-600 hover:border-green-400 dark:hover:border-green-500 hover:shadow-lg"
                }`}
              >
                {copySuccess ? (
                  <>
                    <CheckCircle className="w-6 h-6 mr-3" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-6 h-6 mr-3" />
                    Copy to Clipboard
                  </>
                )}
              </Button>

              {/* Enhanced Download Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={downloadAsText}
                  variant="outline"
                  className="h-14 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-300 dark:hover:bg-green-900/20 transition-all duration-300 font-semibold"
                >
                  <FileDown className="w-5 h-5 mr-2" />
                  TXT
                </Button>
                <Button
                  onClick={downloadAsPDF}
                  variant="outline"
                  className="h-14 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/20 transition-all duration-300 font-semibold"
                >
                  <FileDown className="w-5 h-5 mr-2" />
                  HTML
                </Button>
                <Button
                  onClick={downloadAsDoc}
                  variant="outline"
                  className="h-14 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900/20 transition-all duration-300 font-semibold"
                >
                  <FileDown className="w-5 h-5 mr-2" />
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
