"use client";
import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileAudio,
  Zap,
  Upload,
  Video,
  Download,
  Globe,
  Clock,
  Copy,
  CheckCircle,
  X,
  Music,
} from "lucide-react";
import FileUpload from "@/components/FileUpload";

// Video Upload Component
function VideoUpload() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<
    Array<{ start: number; end: number; text: string }>
  >([]);
  const [sourceLanguage, setSourceLanguage] = useState("en-US");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isMockData, setIsMockData] = useState(false);

  const languages = [
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
    { code: "pl", name: "Polish" },
    { code: "sv", name: "Swedish" },
    { code: "da", name: "Danish" },
    { code: "no", name: "Norwegian" },
    { code: "fi", name: "Finnish" },
    { code: "cs", name: "Czech" },
    { code: "hu", name: "Hungarian" },
    { code: "ro", name: "Romanian" },
    { code: "bg", name: "Bulgarian" },
    { code: "hr", name: "Croatian" },
    { code: "sk", name: "Slovak" },
    { code: "el", name: "Greek" },
    { code: "he", name: "Hebrew" },
    { code: "th", name: "Thai" },
    { code: "vi", name: "Vietnamese" },
    { code: "id", name: "Indonesian" },
    { code: "uk", name: "Ukrainian" },
    { code: "bn", name: "Bengali" },
    { code: "pa", name: "Punjabi" },
    { code: "gu", name: "Gujarati" },
    { code: "ta", name: "Tamil" },
    { code: "te", name: "Telugu" },
    { code: "ml", name: "Malayalam" },
    { code: "mr", name: "Marathi" },
    { code: "ur", name: "Urdu" },
    { code: "uz", name: "Uzbek" },
    { code: "kk", name: "Kazakh" },
    { code: "ky", name: "Kyrgyz" },
    { code: "mn", name: "Mongolian" },
    { code: "ne", name: "Nepali" },
    { code: "si", name: "Sinhala" },
    { code: "my", name: "Myanmar" },
    { code: "km", name: "Khmer" },
    { code: "lo", name: "Lao" },
    { code: "ka", name: "Georgian" },
    { code: "am", name: "Amharic" },
    { code: "sw", name: "Swahili" },
    { code: "zu", name: "Zulu" },
    { code: "af", name: "Afrikaans" },
    { code: "is", name: "Icelandic" },
    { code: "mt", name: "Maltese" },
    { code: "sq", name: "Albanian" },
    { code: "mk", name: "Macedonian" },
    { code: "bs", name: "Bosnian" },
    { code: "sr", name: "Serbian" },
    { code: "sl", name: "Slovenian" },
    { code: "et", name: "Estonian" },
    { code: "lv", name: "Latvian" },
    { code: "lt", name: "Lithuanian" },
  ];

  const handleUpload = async (fileToSend: File) => {
    setIsProcessing(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("video", fileToSend);
    formData.append("sourceLanguage", sourceLanguage);
    formData.append("targetLanguage", targetLanguage);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 15;
      });
    }, 500);

    try {
      console.log("[VideoUpload] Sending video to API...");

      const res = await fetch("/api/video", {
        method: "POST",
        body: formData,
      });

      console.log("[VideoUpload] API response status:", res.status);

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(
          errorData.error || `HTTP ${res.status}: ${res.statusText}`
        );
      }

      const data = await res.json();
      console.log("[VideoUpload] API response data:", data);

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.success === false) {
        // Handle case where no speech was detected
        setSubtitles([]);
        setUploadProgress(100);
        setIsMockData(false);
        throw new Error(data.error || "No speech detected in the video");
      }

      if (data.subtitles && Array.isArray(data.subtitles)) {
        setSubtitles(data.subtitles);
        setUploadProgress(100);
        setIsMockData(data.isMockData || false);

        // Only save to transcription history if it's real data, not mock
        if (!data.isMockData) {
          fetch("/api/transcription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              inputType: "video",
              inputValue: fileToSend.name,
              outputValue: data.subtitles
                .map((s: { text: string }) => s.text)
                .join(" "),
            }),
          }).catch(console.error);
        }
      } else {
        throw new Error("Invalid response format from API");
      }
    } catch (error) {
      console.error("[VideoUpload] Upload error:", error);
      // Show error to user
      alert(error instanceof Error ? error.message : "Failed to process video");
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
    const videoFile = files.find((file) => file.type.startsWith("video/"));
    if (videoFile) {
      setVideoFile(videoFile);
      const url = URL.createObjectURL(videoFile);
      setVideoPreview(url);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    }
  };

  const clearVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setSubtitles([]);
    setIsMockData(false);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
  };

  const generateSRT = () => {
    let srtContent = "";
    subtitles.forEach((subtitle, index) => {
      const startTime = formatTime(subtitle.start);
      const endTime = formatTime(subtitle.end);
      srtContent += `${index + 1}\n${startTime} --> ${endTime}\n${
        subtitle.text
      }\n\n`;
    });
    return srtContent;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms
      .toString()
      .padStart(3, "0")}`;
  };

  const downloadSRT = () => {
    const srtContent = generateSRT();
    const blob = new Blob([srtContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subtitles_${targetLanguage}_${new Date()
      .toISOString()
      .slice(0, 10)}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copySubtitlesToClipboard = async () => {
    const text = subtitles.map((s) => s.text).join(" ");
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
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
      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-2 border-purple-200 dark:border-purple-700 shadow-xl">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl font-bold text-purple-800 dark:text-purple-200 flex items-center justify-center">
            <Video className="w-6 h-6 mr-3" />
            Video Subtitle Generation
          </CardTitle>
          <p className="text-purple-600 dark:text-purple-300">
            Upload videos and generate subtitles with perfect timing in multiple
            languages
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Language Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
              <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                <Globe className="w-4 h-4 inline mr-2" />
                Source Language (Speech)
              </label>
              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                className="w-full p-2 border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="es-ES">Spanish</option>
                <option value="fr-FR">French</option>
                <option value="de-DE">German</option>
                <option value="it-IT">Italian</option>
                <option value="pt-PT">Portuguese</option>
                <option value="ru-RU">Russian</option>
                <option value="ja-JP">Japanese</option>
                <option value="ko-KR">Korean</option>
                <option value="zh-CN">Chinese (Simplified)</option>
                <option value="ar-SA">Arabic</option>
                <option value="hi-IN">Hindi</option>
                <option value="tr-TR">Turkish</option>
                <option value="nl-NL">Dutch</option>
                <option value="pl-PL">Polish</option>
                <option value="sv-SE">Swedish</option>
                <option value="da-DK">Danish</option>
                <option value="no-NO">Norwegian</option>
                <option value="fi-FI">Finnish</option>
                <option value="cs-CZ">Czech</option>
                <option value="hu-HU">Hungarian</option>
                <option value="ro-RO">Romanian</option>
                <option value="bg-BG">Bulgarian</option>
                <option value="hr-HR">Croatian</option>
                <option value="sk-SK">Slovak</option>
                <option value="el-GR">Greek</option>
                <option value="he-IL">Hebrew</option>
                <option value="th-TH">Thai</option>
                <option value="vi-VN">Vietnamese</option>
                <option value="id-ID">Indonesian</option>
                <option value="uk-UA">Ukrainian</option>
                <option value="bn-BD">Bengali</option>
                <option value="pa-IN">Punjabi</option>
                <option value="gu-IN">Gujarati</option>
                <option value="ta-IN">Tamil</option>
                <option value="te-IN">Telugu</option>
                <option value="ml-IN">Malayalam</option>
                <option value="mr-IN">Marathi</option>
                <option value="ur-PK">Urdu</option>
                <option value="uz-UZ">Uzbek</option>
                <option value="kk-KZ">Kazakh</option>
                <option value="ky-KG">Kyrgyz</option>
                <option value="mn-MN">Mongolian</option>
                <option value="ne-NP">Nepali</option>
                <option value="si-LK">Sinhala</option>
                <option value="my-MM">Myanmar</option>
                <option value="km-KH">Khmer</option>
                <option value="lo-LA">Lao</option>
                <option value="ka-GE">Georgian</option>
                <option value="am-ET">Amharic</option>
                <option value="sw-TZ">Swahili</option>
                <option value="zu-ZA">Zulu</option>
                <option value="af-ZA">Afrikaans</option>
                <option value="is-IS">Icelandic</option>
                <option value="mt-MT">Maltese</option>
                <option value="sq-AL">Albanian</option>
                <option value="mk-MK">Macedonian</option>
                <option value="bs-BA">Bosnian</option>
                <option value="sr-RS">Serbian</option>
                <option value="sl-SI">Slovenian</option>
                <option value="et-EE">Estonian</option>
                <option value="lv-LV">Latvian</option>
                <option value="lt-LT">Lithuanian</option>
              </select>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
              <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                <Globe className="w-4 h-4 inline mr-2" />
                Target Language (Subtitles)
              </label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full p-2 border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
              isDragOver
                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                : "border-purple-300 dark:border-purple-600 hover:border-purple-400 dark:hover:border-purple-500"
            }`}
          >
            {videoFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <Video className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {videoFile.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {formatFileSize(videoFile.size)} •{" "}
                    {videoFile.type.split("/")[1].toUpperCase()}
                  </p>
                </div>
                <Button
                  onClick={clearVideo}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove Video
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-purple-100 dark:bg-purple-800 rounded-full">
                    <Upload className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Drop your video file here
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    or click to browse files
                  </p>
                </div>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Video Preview */}
          {videoPreview && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
              <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-3">
                Video Preview
              </h3>
              <video
                src={videoPreview}
                controls
                className="w-full max-h-64 rounded-lg bg-black"
              />
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-purple-600 dark:text-purple-400">
                  Generating subtitles...
                </span>
                <span className="text-purple-600 dark:text-purple-400">
                  {uploadProgress}%
                </span>
              </div>
              <div className="w-full bg-purple-200 dark:bg-purple-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Generate Subtitles Button */}
          <Button
            disabled={!videoFile || isProcessing}
            onClick={() => videoFile && handleUpload(videoFile)}
            className="w-full h-12 cursor-pointer font-mono bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Processing Video...
              </>
            ) : (
              <>
                <Video className="w-5 h-5 mr-3" />
                Generate Subtitles
              </>
            )}
          </Button>

          {/* Supported Formats */}
          <div className="text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Supported formats: MP4, AVI, MOV, MKV, WebM
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Subtitles Result */}
      {subtitles.length > 0 && (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-green-800 dark:text-green-200 flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              Generated Subtitles (
              {languages.find((l) => l.code === targetLanguage)?.name})
              {isMockData && (
                <span className="ml-3 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm rounded-full">
                  Demo Mode
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Subtitles Timeline */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-green-200 dark:border-green-700 shadow-sm max-h-64 overflow-y-auto">
              {subtitles.map((subtitle, index) => (
                <div
                  key={index}
                  className="border-b border-green-100 dark:border-green-800 last:border-b-0 py-3"
                >
                  <div className="flex items-center text-sm text-green-600 dark:text-green-400 mb-1">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatTime(subtitle.start)} → {formatTime(subtitle.end)}
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                    {subtitle.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              {/* Copy Button */}
              <Button
                onClick={copySubtitlesToClipboard}
                variant="outline"
                className={`w-full h-12 border-2 text-lg font-medium transition-all duration-300 ${
                  copySuccess
                    ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                    : "border-green-300 dark:border-green-600 hover:border-green-400 dark:hover:border-green-500"
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
                    Copy All Text
                  </>
                )}
              </Button>

              {/* Download SRT Button */}
              <Button
                onClick={downloadSRT}
                className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl"
              >
                <Download className="w-5 h-5 mr-3" />
                Download SRT File ({targetLanguage.toUpperCase()})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function FileUploadPage() {
  const [activeTab, setActiveTab] = useState<"audio" | "video">("audio");

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Main Title Card */}
        <Card className="bg-card border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center justify-center">
              <div className="flex items-center">
                <FileAudio className="w-8 h-8 mr-2" />
                <Video className="w-8 h-8 mr-3" />
              </div>
              Media File Processing Hub
            </CardTitle>
            <p className="text-muted-foreground text-lg mt-2">
              Upload audio files for transcription or video files for subtitle
              generation
            </p>
          </CardHeader>
        </Card>

        {/* Tab Navigation */}
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("audio")}
                className={`flex-1 flex items-center justify-center p-4 font-medium transition-colors ${
                  activeTab === "audio"
                    ? "border-b-2 border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Music className="w-5 h-5 mr-2" />
                Audio Transcription
              </button>
              <button
                onClick={() => setActiveTab("video")}
                className={`flex-1 flex items-center justify-center p-4 font-medium transition-colors ${
                  activeTab === "video"
                    ? "border-b-2 border-purple-500 text-purple-600 bg-purple-50 dark:bg-purple-900/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Video className="w-5 h-5 mr-2" />
                Video Subtitles
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        {activeTab === "audio" ? (
          <>
            {/* Features Overview for Audio */}
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
                  <div className="space-y-3">
                    <div className="w-12 h-12 mx-auto bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                      <FileAudio className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground">
                      File Upload
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Upload audio files in various formats for accurate
                      transcription
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="w-12 h-12 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground">
                      AI Processing
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Advanced AI-powered speech recognition with high accuracy
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audio File Upload Section */}
            <FileUpload />

            {/* Instructions for Audio */}
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <h3 className="font-medium text-foreground/90 mb-4 flex items-center">
                  <Zap className="w-4 h-4 mr-2" />
                  How to use Audio File Transcription:
                </h3>
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center">
                    <FileAudio className="w-4 h-4 mr-2 text-blue-400" />
                    Audio File Processing
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      Drag and drop your audio file or click to browse
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      Supported formats: MP3, WAV, M4A, FLAC, OGG
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      Click &quot;Transcribe Audio File&quot; to start
                      processing
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      Download results as TXT, HTML, or DOC formats
                    </li>
                  </ul>
                </div>

                <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
                  <div className="flex items-start">
                    <Upload className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <h4 className="font-semibold text-foreground">
                        File Upload Support
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Supports various audio formats with automatic language
                        detection. Upload your audio files and get accurate
                        transcriptions powered by advanced AI.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                          MP3
                        </span>
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                          WAV
                        </span>
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                          M4A
                        </span>
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                          FLAC
                        </span>
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                          OGG
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Features Overview for Video */}
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                  <div className="space-y-3">
                    <div className="w-12 h-12 mx-auto bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <Video className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground">
                      Video Upload
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Upload video files for automatic subtitle generation
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="w-12 h-12 mx-auto bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground">Time Sync</h3>
                    <p className="text-sm text-muted-foreground">
                      Perfect timing synchronization for professional subtitles
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="w-12 h-12 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Globe className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground">
                      Multi-Language
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Generate subtitles in multiple languages with SRT download
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Video Upload Section */}
            <VideoUpload />

            {/* Instructions for Video */}
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <h3 className="font-medium text-foreground/90 mb-4 flex items-center">
                  <Zap className="w-4 h-4 mr-2" />
                  How to use Video Subtitle Generation:
                </h3>
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center">
                    <Video className="w-4 h-4 mr-2 text-purple-400" />
                    Video Subtitle Process
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start">
                      <span className="text-purple-400 mr-2">•</span>
                      Select your preferred subtitle language from the dropdown
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-400 mr-2">•</span>
                      Drag and drop your video file or click to browse
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-400 mr-2">•</span>
                      Preview your video before processing
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-400 mr-2">•</span>
                      Download SRT files compatible with all video players
                    </li>
                  </ul>
                </div>

                <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
                  <div className="flex items-start">
                    <Video className="w-5 h-5 text-purple-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <h4 className="font-semibold text-foreground">
                        Professional Subtitle Generation
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Our advanced AI technology generates
                        professional-quality subtitles with perfect timing.
                        Support for multiple video formats and languages with
                        industry-standard SRT output.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
                          MP4
                        </span>
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
                          AVI
                        </span>
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
                          MOV
                        </span>
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
                          MKV
                        </span>
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
                          WebM
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
