"use client";
import { useState, useCallback, useEffect } from "react";
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
  FileText,
  Sparkles,
  X,
  Music,
} from "lucide-react";
import FileUpload from "@/components/FileUpload";

interface FileUploadPageProps {
  onFileTypeChange?: (type: "audio" | "video" | null) => void;
  initialTab?: "audio" | "video";
}

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
  const [showPreview, setShowPreview] = useState(false);

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
    setShowPreview(false);
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
      {/* Enhanced Header Card */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-900/30 dark:via-indigo-900/30 dark:to-blue-900/30 border-2 border-purple-200/60 dark:border-purple-700/60 shadow-2xl">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 dark:from-purple-400/10 dark:to-indigo-400/10"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-indigo-400/20 to-transparent rounded-full blur-2xl"></div>

        <CardHeader className="relative text-center pb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl shadow-lg">
              <Video className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent mb-3">
            Video Subtitle Generation
          </CardTitle>
          <p className="text-lg text-purple-700 dark:text-purple-300 max-w-2xl mx-auto leading-relaxed">
            Transform your videos with AI-powered subtitle generation. Perfect
            timing, multiple languages, and professional SRT output.
          </p>
        </CardHeader>
      </Card>

      {/* Language Selection with Enhanced Design */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-purple-200/60 dark:border-purple-700/60 shadow-xl">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Source Language */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              <div className="relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-6 rounded-2xl border-2 border-purple-200/60 dark:border-purple-700/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-purple-300 dark:hover:border-purple-600 group-hover:scale-[1.02]">
                <label className="block text-sm font-bold text-purple-700 dark:text-purple-300 mb-4 flex items-center">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl mr-3 shadow-lg">
                    <Globe className="w-4 h-4 text-white" />
                  </div>
                  Source Language (Speech)
                </label>
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  className="w-full p-4 border-2 border-purple-200 dark:border-purple-600 rounded-xl bg-white/70 dark:bg-slate-700/70 text-slate-900 dark:text-slate-100 font-medium transition-all duration-300 focus:border-purple-400 dark:focus:border-purple-500 focus:ring-4 focus:ring-purple-200/50 dark:focus:ring-purple-800/50 focus:outline-none hover:border-purple-300 dark:hover:border-purple-500 shadow-inner"
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
            </div>

            {/* Target Language */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              <div className="relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-6 rounded-2xl border-2 border-indigo-200/60 dark:border-indigo-700/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-indigo-300 dark:hover:border-indigo-600 group-hover:scale-[1.02]">
                <label className="block text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-4 flex items-center">
                  <div className="p-2 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl mr-3 shadow-lg">
                    <Globe className="w-4 h-4 text-white" />
                  </div>
                  Target Language (Subtitles)
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full p-4 border-2 border-indigo-200 dark:border-indigo-600 rounded-xl bg-white/70 dark:bg-slate-700/70 text-slate-900 dark:text-slate-100 font-medium transition-all duration-300 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200/50 dark:focus:ring-indigo-800/50 focus:outline-none hover:border-indigo-300 dark:hover:border-indigo-500 shadow-inner"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Drag & Drop Zone */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-purple-200/60 dark:border-purple-700/60 shadow-xl">
        <CardContent className="p-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-3 border-dashed rounded-2xl p-12 text-center transition-all duration-500 ${
              isDragOver
                ? "border-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 scale-105 shadow-2xl"
                : "border-purple-300 dark:border-purple-600 hover:border-purple-400 dark:hover:border-purple-500 hover:scale-[1.02] shadow-lg hover:shadow-xl"
            }`}
          >
            {/* Background Effects */}
            {isDragOver && (
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-2xl animate-pulse"></div>
            )}

            {videoFile ? (
              <div className="relative space-y-6">
                <div className="flex items-center justify-center">
                  <div className="p-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl shadow-xl">
                    <Video className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {videoFile.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-700/50 px-4 py-2 rounded-lg">
                    {formatFileSize(videoFile.size)} •{" "}
                    {videoFile.type.split("/")[1].toUpperCase()}
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => setShowPreview(!showPreview)}
                    variant="outline"
                    size="sm"
                    className="bg-white/80 dark:bg-slate-700/80 hover:bg-white dark:hover:bg-slate-700 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300"
                  >
                    {showPreview ? "Hide" : "Show"} Preview
                  </Button>
                  <Button
                    onClick={clearVideo}
                    variant="outline"
                    size="sm"
                    className="bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="p-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-3xl shadow-2xl transform hover:scale-110 transition-transform duration-300">
                    <Upload className="w-12 h-12 text-white" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Drop your video file here
                  </h3>
                  <p className="text-lg text-slate-500 dark:text-slate-400">
                    or click to browse files
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-full border border-purple-200 dark:border-purple-700">
                      MP4
                    </span>
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-full border border-purple-200 dark:border-purple-700">
                      AVI
                    </span>
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-full border border-purple-200 dark:border-purple-700">
                      MOV
                    </span>
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-full border border-purple-200 dark:border-purple-700">
                      MKV
                    </span>
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-full border border-purple-200 dark:border-purple-700">
                      WebM
                    </span>
                  </div>
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
        </CardContent>
      </Card>

      {/* Enhanced Video Preview */}
      {videoPreview && showPreview && (
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-purple-200/60 dark:border-purple-700/60 shadow-xl">
          <CardContent className="p-6">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
                <Video className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                Video Preview
              </h3>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black">
                <video
                  src={videoPreview}
                  controls
                  className="w-full max-h-80 rounded-2xl"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Progress Bar */}
      {isProcessing && (
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-purple-200/60 dark:border-purple-700/60 shadow-xl">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-purple-700 dark:text-purple-300 flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600 mr-3"></div>
                  Generating subtitles...
                </span>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-4 py-2 rounded-full">
                  {uploadProgress}%
                </span>
              </div>
              <div className="w-full bg-purple-200 dark:bg-purple-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out shadow-lg"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Generate Button */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-purple-200/60 dark:border-purple-700/60 shadow-xl">
        <CardContent className="p-6">
          <Button
            disabled={!videoFile || isProcessing}
            onClick={() => videoFile && handleUpload(videoFile)}
            className="w-full h-16 cursor-pointer font-bold bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-600 hover:from-purple-600 hover:via-indigo-600 hover:to-blue-700 text-white text-xl transition-all duration-300 shadow-2xl hover:shadow-3xl disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-4"></div>
                Processing Video...
              </>
            ) : (
              <>
                <Video className="w-6 h-6 mr-4" />
                Generate Subtitles
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Enhanced Subtitles Result */}
      {subtitles.length > 0 && (
        <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/30 dark:via-emerald-900/30 dark:to-teal-900/30 border-2 border-green-200/60 dark:border-green-700/60 shadow-2xl">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 dark:from-green-400/10 dark:to-emerald-400/10"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/20 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-400/20 to-transparent rounded-full blur-2xl"></div>

          <CardHeader className="relative">
            <CardTitle className="text-2xl font-bold text-green-800 dark:text-green-200 flex items-center">
              <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl mr-4 shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              Generated Subtitles (
              {languages.find((l) => l.code === targetLanguage)?.name})
              {isMockData && (
                <span className="ml-4 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm rounded-full border border-yellow-300 dark:border-yellow-600">
                  Demo Mode
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-6">
            {/* Enhanced Subtitles Timeline */}
            <div className="bg-white/90 dark:bg-slate-800/90 p-6 rounded-2xl border border-green-200/60 dark:border-green-700/60 shadow-lg max-h-80 overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                {subtitles.map((subtitle, index) => (
                  <div
                    key={index}
                    className="group p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200/60 dark:border-green-700/60 hover:border-green-300 dark:hover:border-green-600 transition-all duration-300 hover:shadow-md"
                  >
                    <div className="flex items-center text-sm text-green-600 dark:text-green-400 mb-2 font-medium">
                      <Clock className="w-4 h-4 mr-2" />
                      {formatTime(subtitle.start)} → {formatTime(subtitle.end)}
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed text-lg">
                      {subtitle.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Enhanced Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Copy Button */}
              <Button
                onClick={copySubtitlesToClipboard}
                variant="outline"
                className={`h-14 border-2 text-lg font-semibold transition-all duration-300 ${
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
                    Copy All Text
                  </>
                )}
              </Button>

              {/* Download SRT Button */}
              <Button
                onClick={downloadSRT}
                className="h-14 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 hover:from-green-600 hover:via-emerald-600 hover:to-teal-700 text-white font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl rounded-xl transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Download className="w-6 h-6 mr-3" />
                Download SRT File ({targetLanguage.toUpperCase()})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function FileUploadPage({
  onFileTypeChange,
  initialTab = "audio",
}: FileUploadPageProps) {
  const [activeTab, setActiveTab] = useState<"audio" | "video">(initialTab);

  // Call onFileTypeChange when tab changes
  const handleTabChange = (tab: "audio" | "video") => {
    setActiveTab(tab);
    onFileTypeChange?.(tab);
  };

  // Set initial file type when component mounts
  useEffect(() => {
    onFileTypeChange?.("audio");
  }, [onFileTypeChange]);

  // Update activeTab when initialTab prop changes
  useEffect(() => {
    console.log(`FileUploadPage: Setting activeTab to ${initialTab}`);
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Enhanced Main Title Card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900/30 dark:via-blue-900/30 dark:to-purple-900/30 border-2 border-slate-200/60 dark:border-slate-700/60 shadow-2xl">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-emerald-500/5 dark:from-blue-400/10 dark:via-purple-400/10 dark:to-emerald-400/10"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-400/20 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-400/20 to-transparent rounded-full blur-2xl"></div>

          <CardHeader className="relative text-center">
            <div className="flex gap-5 items-center justify-center mb-6">
              <div className="p-6 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-3xl shadow-2xl">
                <FileAudio className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent">
                Media Processing Hub
              </CardTitle>
            </div>
            <p className="text-l text-slate-700 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Upload audio files for AI transcription or video files for
              intelligent subtitle generation with professional-grade results
            </p>
          </CardHeader>
        </Card>

        {/* Enhanced Tab Navigation */}
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200/60 dark:border-slate-700/60 shadow-xl">
          <CardContent className="p-0">
            <div className="flex">
              <button
                onClick={() => handleTabChange("audio")}
                className={`flex-1 flex items-center justify-center p-6 font-bold text-lg transition-all duration-300 ${
                  activeTab === "audio"
                    ? "border-b-4 border-blue-500 text-blue-600 bg-gradient-to-b from-blue-50 to-transparent dark:from-blue-900/30 dark:to-transparent shadow-lg"
                    : "text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                }`}
              >
                <Music className="w-6 h-6 mr-3" />
                Audio Transcription
              </button>
              <button
                onClick={() => handleTabChange("video")}
                className={`flex-1 flex items-center justify-center p-6 font-bold text-lg transition-all duration-300 ${
                  activeTab === "video"
                    ? "border-b-4 border-purple-500 text-purple-600 bg-gradient-to-b from-purple-50 to-transparent dark:from-purple-900/30 dark:to-transparent shadow-lg"
                    : "text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                }`}
              >
                <Video className="w-6 h-6 mr-3" />
                Video Subtitles
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        {activeTab === "audio" ? (
          <>
            {/* Enhanced Features Overview for Audio */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-blue-200/60 dark:border-blue-700/60 shadow-xl">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                  <div className="group space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                      File Upload
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Upload audio files in various formats for accurate
                      transcription with drag-and-drop support
                    </p>
                  </div>

                  <div className="group space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                      AI Processing
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Advanced AI-powered speech recognition with high accuracy
                      and real-time processing
                    </p>
                  </div>

                  <div className="group space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                      <FileText className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                      Export Options
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Download results in TXT, HTML, or DOC formats for your
                      professional needs
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audio File Upload Section */}
            <FileUpload />

            {/* Enhanced Instructions for Audio */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-blue-200/60 dark:border-blue-700/60 shadow-xl">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center">
                  <Zap className="w-6 h-6 mr-3 text-blue-500" />
                  How to use Audio File Transcription:
                </h3>
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border border-blue-200/60 dark:border-blue-700/60">
                    <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center mb-4">
                      <FileAudio className="w-5 h-5 mr-3 text-blue-500" />
                      Audio File Processing
                    </h4>
                    <ul className="text-base text-slate-700 dark:text-slate-300 space-y-3">
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-3 text-lg">•</span>
                        Drag and drop your audio file or click to browse
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-3 text-lg">•</span>
                        Supported formats: MP3, WAV, M4A, FLAC, OGG
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-3 text-lg">•</span>
                        Click &quot;Transcribe Audio File&quot; to start
                        processing
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-3 text-lg">•</span>
                        Download results as TXT, HTML, or DOC formats
                      </li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl border border-green-200/60 dark:border-green-700/60">
                    <div className="flex items-start">
                      <Upload className="w-6 h-6 text-green-500 mr-4 mt-1 flex-shrink-0" />
                      <div className="space-y-3">
                        <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                          File Upload Support
                        </h4>
                        <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                          Supports various audio formats with automatic language
                          detection. Upload your audio files and get accurate
                          transcriptions powered by advanced AI technology.
                        </p>
                        <div className="flex flex-wrap gap-3 mt-4">
                          <span className="px-4 py-2 bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-semibold rounded-full border border-blue-300 dark:border-blue-600">
                            MP3
                          </span>
                          <span className="px-4 py-2 bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-semibold rounded-full border border-blue-300 dark:border-blue-600">
                            WAV
                          </span>
                          <span className="px-4 py-2 bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-semibold rounded-full border border-blue-300 dark:border-blue-600">
                            M4A
                          </span>
                          <span className="px-4 py-2 bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-semibold rounded-full border border-blue-300 dark:border-blue-600">
                            FLAC
                          </span>
                          <span className="px-4 py-2 bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-semibold rounded-full border border-blue-300 dark:border-blue-600">
                            OGG
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Enhanced Features Overview for Video */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-purple-200/60 dark:border-purple-700/60 shadow-xl">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                  <div className="group space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                      <Video className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                      Video Upload
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Upload video files for automatic subtitle generation with
                      preview support
                    </p>
                  </div>

                  <div className="group space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                      <Clock className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                      Time Sync
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Perfect timing synchronization for professional subtitles
                      with frame accuracy
                    </p>
                  </div>

                  <div className="group space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                      <Globe className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                      Multi-Language
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Generate subtitles in multiple languages with professional
                      SRT download
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Video Upload Section */}
            <VideoUpload />

            {/* Enhanced Instructions for Video */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-purple-200/60 dark:border-purple-700/60 shadow-xl">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center">
                  <Zap className="w-6 h-6 mr-3 text-purple-500" />
                  How to use Video Subtitle Generation:
                </h3>
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border border-purple-200/60 dark:border-purple-700/60">
                    <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center mb-4">
                      <Video className="w-5 h-5 mr-3 text-purple-500" />
                      Video Subtitle Process
                    </h4>
                    <ul className="text-base text-slate-700 dark:text-slate-300 space-y-3">
                      <li className="flex items-start">
                        <span className="text-purple-500 mr-3 text-lg">•</span>
                        Select your preferred subtitle language from the
                        dropdown
                      </li>
                      <li className="flex items-start">
                        <span className="text-purple-500 mr-3 text-lg">•</span>
                        Drag and drop your video file or click to browse
                      </li>
                      <li className="flex items-start">
                        <span className="text-purple-500 mr-3 text-lg">•</span>
                        Preview your video before processing
                      </li>
                      <li className="flex items-start">
                        <span className="text-purple-500 mr-3 text-lg">•</span>
                        Download SRT files compatible with all video players
                      </li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl border border-green-200/60 dark:border-green-700/60">
                    <div className="flex items-start">
                      <Video className="w-6 h-6 text-green-500 mr-4 mt-1 flex-shrink-0" />
                      <div className="space-y-3">
                        <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                          Professional Subtitle Generation
                        </h4>
                        <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                          Our advanced AI technology generates
                          professional-quality subtitles with perfect timing.
                          Support for multiple video formats and languages with
                          industry-standard SRT output.
                        </p>
                        <div className="flex flex-wrap gap-3 mt-4">
                          <span className="px-4 py-2 bg-purple-500/20 text-purple-600 dark:text-purple-400 text-sm font-semibold rounded-full border border-purple-300 dark:border-purple-600">
                            MP4
                          </span>
                          <span className="px-4 py-2 bg-purple-500/20 text-purple-600 dark:text-purple-400 text-sm font-semibold rounded-full border border-purple-300 dark:border-purple-600">
                            AVI
                          </span>
                          <span className="px-4 py-2 bg-purple-500/20 text-purple-600 dark:text-purple-400 text-sm font-semibold rounded-full border border-purple-300 dark:border-purple-600">
                            MOV
                          </span>
                          <span className="px-4 py-2 bg-purple-500/20 text-purple-600 dark:text-purple-400 text-sm font-semibold rounded-full border border-purple-300 dark:border-purple-600">
                            MKV
                          </span>
                          <span className="px-4 py-2 bg-purple-500/20 text-purple-600 dark:text-purple-400 text-sm font-semibold rounded-full border border-purple-300 dark:border-purple-600">
                            WebM
                          </span>
                        </div>
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
