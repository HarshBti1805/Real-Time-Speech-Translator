"use client";
import { useState, useRef } from "react";
import {
  FileText,
  Copy,
  RotateCcw,
  Download,
  Languages,
  Brain,
  Key,
  AlertCircle,
  Upload,
  Zap,
  Globe,
  X,
  FileDown,
  FileType,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PDFResult {
  originalText: string;
  summary: string;
  keyPoints: string[];
  fileName: string;
  fileSize: number;
  processedAt: string;
  metadata?: {
    pages?: number;
    textLength?: number;
    extractionMethod?: string;
  };
  translation?: {
    targetLanguage: string;
    translatedText: string;
    translatedSummary: string;
    translatedKeyPoints: string[];
  };
  translationError?: string;
}

// Enhanced text parsing function
const parseAndFormatText = (text: string) => {
  if (!text) return text;

  return (
    text
      // Format headers (lines that start with numbers or capital letters and end with colon)
      .replace(
        /^(\d+\.?\s*[A-Z][^:\n]*):?\s*$/gm,
        '<div class="text-lg font-semibold text-blue-400 mt-6 mb-3 border-l-4 border-blue-500 pl-4">$1</div>'
      )

      // Format section headers (ALL CAPS lines)
      .replace(
        /^([A-Z\s]{5,}):?\s*$/gm,
        '<div class="text-md font-bold text-purple-400 mt-5 mb-2 uppercase tracking-wide">$1</div>'
      )

      // Format bullet points
      .replace(
        /^[•·*-]\s*(.+)$/gm,
        '<div class="flex items-start gap-2 my-1"><span class="text-emerald-400 mt-1">•</span><span>$1</span></div>'
      )

      // Format numbered lists
      .replace(
        /^(\d+\.)\s*(.+)$/gm,
        '<div class="flex items-start gap-2 my-1"><span class="text-blue-400 font-semibold min-w-6">$1</span><span>$2</span></div>'
      )

      // Format amounts/prices (with currency symbols)
      .replace(
        /(\$[\d,]+\.?\d*|\£[\d,]+\.?\d*|€[\d,]+\.?\d*|₹[\d,]+\.?\d*)/g,
        '<span class="text-green-400 font-semibold bg-green-400/10 px-1 rounded">$1</span>'
      )

      // Format dates (various formats)
      .replace(
        /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g,
        '<span class="text-orange-400 font-mono bg-orange-400/10 px-1 rounded">$1</span>'
      )

      // Format email addresses
      .replace(
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
        '<span class="text-cyan-400 font-mono bg-cyan-400/10 px-1 rounded">$1</span>'
      )

      // Format phone numbers
      .replace(
        /(\+?[\d\s\(\)\-]{10,})/g,
        '<span class="text-indigo-400 font-mono bg-indigo-400/10 px-1 rounded">$1</span>'
      )

      // Format percentages
      .replace(
        /(\d+\.?\d*%)/g,
        '<span class="text-yellow-400 font-semibold bg-yellow-400/10 px-1 rounded">$1</span>'
      )

      // Format important keywords
      .replace(
        /\b(TOTAL|SUBTOTAL|TAX|INVOICE|PAYMENT|DUE|BALANCE|AMOUNT|QUANTITY|QTY)\b/gi,
        '<span class="text-red-400 font-bold bg-red-400/10 px-1 rounded uppercase">$1</span>'
      )

      // Format line breaks
      .replace(/\n/g, "<br/>")

      // Clean up excessive breaks
      .replace(/(<br\/>){3,}/g, "<br/><br/>")
  );
};

export default function PDFProcessor() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<PDFResult | null>(null);
  const [targetLanguage, setTargetLanguage] = useState("es"); // Default to Spanish
  const [includeTranslation, setIncludeTranslation] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const languages = [
    { code: "es", name: "Spanish", flag: "🇪🇸", region: "Europe" },
    { code: "fr", name: "French", flag: "🇫🇷", region: "Europe" },
    { code: "de", name: "German", flag: "🇩🇪", region: "Europe" },
    { code: "it", name: "Italian", flag: "🇮🇹", region: "Europe" },
    { code: "pt", name: "Portuguese", flag: "🇵🇹", region: "Europe" },
    { code: "ru", name: "Russian", flag: "🇷🇺", region: "Europe" },
    { code: "zh", name: "Chinese", flag: "🇨🇳", region: "Asia" },
    { code: "ja", name: "Japanese", flag: "🇯🇵", region: "Asia" },
    { code: "ko", name: "Korean", flag: "🇰🇷", region: "Asia" },
    { code: "ar", name: "Arabic", flag: "🇸🇦", region: "Middle East" },
    { code: "hi", name: "Hindi", flag: "🇮🇳", region: "Asia" },
    { code: "nl", name: "Dutch", flag: "🇳🇱", region: "Europe" },
    { code: "sv", name: "Swedish", flag: "🇸🇪", region: "Europe" },
    { code: "no", name: "Norwegian", flag: "🇳🇴", region: "Europe" },
    { code: "da", name: "Danish", flag: "🇩🇰", region: "Europe" },
    { code: "fi", name: "Finnish", flag: "🇫🇮", region: "Europe" },
    { code: "pl", name: "Polish", flag: "🇵🇱", region: "Europe" },
    { code: "tr", name: "Turkish", flag: "🇹🇷", region: "Europe" },
    { code: "he", name: "Hebrew", flag: "🇮🇱", region: "Middle East" },
    { code: "th", name: "Thai", flag: "🇹🇭", region: "Asia" },
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        setPdfFile(file);
        setResult(null);
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setResult(null); // Clear previous results
    }
  };

  const handleUpload = async () => {
    if (!pdfFile) return;

    setIsProcessing(true);
    setUploadProgress(0);

    // Animate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 85) {
          clearInterval(progressInterval);
          return 85;
        }
        return prev + Math.random() * 15;
      });
    }, 300);

    const formData = new FormData();
    formData.append("pdf", pdfFile);
    formData.append("targetLanguage", targetLanguage);
    formData.append("includeTranslation", includeTranslation.toString());

    try {
      // Use Flask server for PDF processing
      const pdfurl = "https://chatbot-tts-server.onrender.com/pdf";
      const res = await fetch(pdfurl, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));

        // Handle specific PDF processing errors
        if (errorData.errorType === "SCANNED_DOCUMENT") {
          throw new Error(
            `${errorData.error}\n\n💡 Suggestion: ${errorData.suggestion}`
          );
        }

        throw new Error(
          errorData.error || `HTTP ${res.status}: ${res.statusText}`
        );
      }

      const data = await res.json();
      setResult(data);
      setUploadProgress(100);

      // Save to transcription history after a delay (like in Translate.tsx)
      setTimeout(() => {
        fetch("/api/transcription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inputType: "pdf",
            inputValue: pdfFile?.name || data.fileName || "PDF Document",
            outputValue:
              data.translation?.translatedSummary ||
              data.summary ||
              "PDF Analysis",
          }),
        })
          .then((response) => {
            if (response.ok) {
              console.log("PDF analysis saved to transcription history");
            } else {
              console.error(
                "Failed to save PDF analysis to transcription history"
              );
            }
          })
          .catch((error) => {
            console.error("Failed to save to transcription history:", error);
          });
      }, 1000);
    } catch (error) {
      console.error("PDF processing error:", error);
      alert(error instanceof Error ? error.message : "Failed to process PDF");
    } finally {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (error) {
      console.error("Failed to copy text to clipboard:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  };

  const downloadAsText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsDoc = (content: string, filename: string) => {
    // Create HTML content for DOC format
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>${filename}</title>
        </head>
        <body>
          <div style='font-family: Arial, sans-serif; line-height: 1.6;'>
            ${content.replace(/\n/g, "<br>")}
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.replace(".txt", ".doc");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsPDF = async (content: string, filename: string) => {
    try {
      // Create a print-friendly HTML document that can be saved as PDF
      const htmlContent = `
        <html>
          <head>
            <title>${filename}</title>
            <style>
              @page { margin: 1in; }
              body { 
                font-family: 'Times New Roman', serif; 
                line-height: 1.6; 
                margin: 0; 
                padding: 20px;
                font-size: 12pt;
                color: #000;
                background: white;
              }
              h1, h2, h3 { color: #333; }
              @media print {
                body { margin: 0; }
                * { -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <div>${content.replace(/\n/g, "<br>")}</div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 1000);
              };
            </script>
          </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank", "width=800,height=600");

      if (printWindow) {
        printWindow.onload = function () {
          printWindow.print();
          setTimeout(() => {
            printWindow.close();
            URL.revokeObjectURL(url);
          }, 1000);
        };
      } else {
        // Fallback if popup is blocked
        const a = document.createElement("a");
        a.href = url;
        a.download = filename.replace(".txt", ".html");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("PDF generation failed:", error);
      // Fallback to text download if PDF generation fails
      downloadAsText(content, filename);
    }
  };

  const downloadInMultipleFormats = (content: string, baseFilename: string) => {
    // Download as TXT
    downloadAsText(content, `${baseFilename}.txt`);

    // Download as DOC
    downloadAsDoc(content, `${baseFilename}.doc`);

    // Download as PDF
    downloadAsPDF(content, `${baseFilename}.pdf`);
  };

  const clearResults = () => {
    setResult(null);
    setPdfFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
    <div className="space-y-6">
      {/* Features Overview */}
      <Card className="bg-background/50 border border-border backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="space-y-3">
              <div className="w-12 h-12 mx-auto bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-foreground">PDF Upload</h3>
              <p className="text-sm text-muted-foreground">
                Upload PDF documents up to 25MB for intelligent text extraction
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 mx-auto bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-foreground">AI Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Advanced AI-powered text extraction and intelligent
                summarization
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 mx-auto bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                <Languages className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-foreground">Translation</h3>
              <p className="text-sm text-muted-foreground">
                Multi-language translation with download and copy functionality
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language Selection */}
      <Card className="bg-background/50 border border-border backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-foreground flex items-center">
                <Globe className="w-4 h-4 mr-2 text-emerald-500" />
                Translation Language
              </label>
              <div className="h-[52px]">
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full h-full p-3 border border-border rounded-lg bg-background text-foreground backdrop-blur-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                  {languages.map((lang) => (
                    <option
                      key={lang.code}
                      value={lang.code}
                      className="bg-background text-foreground"
                    >
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-foreground flex items-center">
                <Languages className="w-4 h-4 mr-2 text-emerald-500" />
                Translation Options
              </label>
              <div className="flex items-center p-3 bg-background rounded-lg border border-border backdrop-blur-sm h-[52px]">
                <div className="relative cursor-pointer translate-y-[3px]">
                  <input
                    type="checkbox"
                    checked={includeTranslation}
                    onChange={(e) => setIncludeTranslation(e.target.checked)}
                    className="w-5 cursor-pointer h-5 rounded border-2 border-border bg-transparent text-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 focus:ring-offset-background transition-all duration-200 checked:bg-emerald-500 checked:border-emerald-500"
                  />
                  {includeTranslation && (
                    <div className="absolute cursor-pointer inset-0 flex items-center justify-center pointer-events-none">
                      <svg
                        className="w-3 h-3 cursor-pointer text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <span className="ml-3 text-sm text-muted-foreground">
                  Enable AI-powered translation
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <div className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Drag & Drop Zone */}
        <Card className="bg-background/50 border border-border backdrop-blur-sm">
          <CardContent className="p-6">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
                dragActive
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-border hover:border-emerald-400 hover:bg-muted/50"
              }`}
            >
              {pdfFile ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="p-4 bg-emerald-500/20 rounded-full border border-emerald-500/30">
                      <FileText className="w-8 h-8 text-emerald-500" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">
                      {pdfFile.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatFileSize(pdfFile.size)} • PDF Document
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="flex items-center gap-1 text-emerald-500">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="text-sm font-medium">
                        Ready to process
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearResults();
                    }}
                    variant="outline"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/30"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove PDF
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="p-6 bg-emerald-500/20 rounded-full border border-emerald-500/30">
                      <Upload className="w-10 h-10 text-emerald-500" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      Drop your PDF file here
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      or click to browse files
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span>Max size: 25MB</span>
                      <span>•</span>
                      <span>PDF format only</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Process Button */}
        <Card className="bg-background/50 border border-border backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <Button
                onClick={handleUpload}
                disabled={!pdfFile || isProcessing}
                size="lg"
                className="px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Processing PDF... ({Math.round(uploadProgress)}%)
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5 mr-3" />
                    Analyze PDF Document
                  </>
                )}
              </Button>

              {!pdfFile && (
                <p className="text-sm text-muted-foreground text-center">
                  Upload a PDF file to start analysis
                </p>
              )}

              {/* Progress Bar */}
              {isProcessing && (
                <div className="w-full max-w-4xl">
                  <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></div>
                      <span className="font-medium">
                        Processing PDF Document
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Progress
                      </span>
                      <span className="font-bold text-lg text-emerald-500">
                        {Math.round(uploadProgress)}%
                      </span>
                    </div>
                  </div>

                  {/* Main Progress Bar */}
                  <div className="w-full bg-muted/50 rounded-2xl h-6 overflow-hidden border border-border backdrop-blur-sm shadow-xl">
                    <div
                      className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 h-6 rounded-2xl transition-all duration-500 ease-out shadow-lg relative"
                      style={{ width: `${uploadProgress}%` }}
                    >
                      {/* Animated overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-white/10 to-transparent rounded-2xl animate-pulse"></div>

                      {/* Progress indicator dots */}
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                        <div
                          className="w-1 h-1 bg-white/80 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="w-1 h-1 bg-white/80 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></div>
                        <div
                          className="w-1 h-1 bg-white/80 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Status Messages */}
                  <div className="flex justify-center mt-4">
                    <div className="bg-muted/50 px-6 py-3 rounded-xl border border-border backdrop-blur-sm">
                      <span className="text-sm text-foreground font-medium">
                        {uploadProgress < 20 &&
                          "🔄 Initializing PDF processing..."}
                        {uploadProgress >= 20 &&
                          uploadProgress < 40 &&
                          "📄 Extracting text content from PDF..."}
                        {uploadProgress >= 40 &&
                          uploadProgress < 60 &&
                          "🤖 Analyzing content with AI..."}
                        {uploadProgress >= 60 &&
                          uploadProgress < 80 &&
                          "📝 Generating summary and key points..."}
                        {uploadProgress >= 80 &&
                          uploadProgress < 95 &&
                          "🌐 Processing translation..."}
                        {uploadProgress >= 95 && "✨ Finalizing results..."}
                      </span>
                    </div>
                  </div>

                  {/* Progress Steps */}
                  <div className="flex justify-center mt-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex items-center gap-2 ${
                          uploadProgress >= 20
                            ? "text-emerald-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            uploadProgress >= 20 ? "bg-emerald-500" : "bg-muted"
                          }`}
                        ></div>
                        <span className="text-xs">Extract</span>
                      </div>
                      <div
                        className={`flex items-center gap-2 ${
                          uploadProgress >= 40
                            ? "text-emerald-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            uploadProgress >= 40 ? "bg-emerald-500" : "bg-muted"
                          }`}
                        ></div>
                        <span className="text-xs">Analyze</span>
                      </div>
                      <div
                        className={`flex items-center gap-2 ${
                          uploadProgress >= 60
                            ? "text-emerald-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            uploadProgress >= 60 ? "bg-emerald-500" : "bg-muted"
                          }`}
                        ></div>
                        <span className="text-xs">Summarize</span>
                      </div>
                      <div
                        className={`flex items-center gap-2 ${
                          uploadProgress >= 80
                            ? "text-emerald-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            uploadProgress >= 80 ? "bg-emerald-500" : "bg-muted"
                          }`}
                        ></div>
                        <span className="text-xs">Translate</span>
                      </div>
                      <div
                        className={`flex items-center gap-2 ${
                          uploadProgress >= 95
                            ? "text-emerald-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            uploadProgress >= 95 ? "bg-emerald-500" : "bg-muted"
                          }`}
                        ></div>
                        <span className="text-xs">Complete</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          {/* AI Summary */}
          <Card className="bg-background/50 border border-border backdrop-blur-sm shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                    <Brain className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-foreground">
                      AI Summary
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Intelligent analysis of the document content
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => copyToClipboard(result.summary)}
                    variant="outline"
                    size="sm"
                    className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30 cursor-pointer"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                  <div className="relative group">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                      <svg
                        className="w-4 h-4 ml-1 transition-transform group-hover:rotate-180"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </Button>
                    <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-1">
                        <button
                          onClick={() =>
                            downloadAsText(
                              result.summary,
                              `${result.fileName}_summary.txt`
                            )
                          }
                          className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2 cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                          Download as TXT
                        </button>
                        <button
                          onClick={() =>
                            downloadAsDoc(
                              result.summary,
                              `${result.fileName}_summary.doc`
                            )
                          }
                          className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                        >
                          <FileType className="w-4 h-4" />
                          Download as DOC
                        </button>
                        <button
                          onClick={() =>
                            downloadAsPDF(
                              result.summary,
                              `${result.fileName}_summary.pdf`
                            )
                          }
                          className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          Download as PDF
                        </button>
                        <div className="border-t border-border my-1"></div>
                        <button
                          onClick={() =>
                            downloadInMultipleFormats(
                              result.summary,
                              `${result.fileName}_summary`
                            )
                          }
                          className="w-full px-4 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 font-medium flex items-center gap-2"
                        >
                          <FileDown className="w-4 h-4" />
                          Download All Formats
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-6 rounded-xl border border-border backdrop-blur-sm">
                <div
                  className="text-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: parseAndFormatText(result.summary),
                  }}
                />
              </div>
              {result.metadata && (
                <div className="flex items-center gap-6 mt-4 p-3 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium">
                      {result.metadata?.pages || 0} pages
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium">
                      {result.metadata?.textLength || 0} characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="w-4 h-4" />
                    <span className="font-medium">
                      {result.metadata?.extractionMethod || "Unknown"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Key Points */}
          <Card className="bg-background/50 border border-border backdrop-blur-sm shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                    <Key className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-foreground">
                      Key Points
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Essential insights and important information
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => copyToClipboard(result.keyPoints.join("\n"))}
                    variant="outline"
                    size="sm"
                    className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30 cursor-pointer"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                  <div className="relative group">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                      <svg
                        className="w-4 h-4 ml-1 transition-transform group-hover:rotate-180"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </Button>
                    <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-1">
                        <button
                          onClick={() =>
                            downloadAsText(
                              result.keyPoints.join("\n"),
                              `${result.fileName}_keypoints.txt`
                            )
                          }
                          className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Download as TXT
                        </button>
                        <button
                          onClick={() =>
                            downloadAsDoc(
                              result.keyPoints.join("\n"),
                              `${result.fileName}_keypoints.doc`
                            )
                          }
                          className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                        >
                          <FileType className="w-4 h-4" />
                          Download as DOC
                        </button>
                        <button
                          onClick={() =>
                            downloadAsPDF(
                              result.keyPoints.join("\n"),
                              `${result.fileName}_keypoints.pdf`
                            )
                          }
                          className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          Download as PDF
                        </button>
                        <div className="border-t border-border my-1"></div>
                        <button
                          onClick={() =>
                            downloadInMultipleFormats(
                              result.keyPoints.join("\n"),
                              `${result.fileName}_keypoints`
                            )
                          }
                          className="w-full px-4 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 font-medium flex items-center gap-2"
                        >
                          <FileDown className="w-4 h-4" />
                          Download All Formats
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-6 rounded-xl border border-border backdrop-blur-sm">
                <div className="space-y-4">
                  {result.keyPoints.map((point, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 group hover:bg-white/20 dark:hover:bg-white/10 p-4 rounded-lg transition-all duration-200 border border-transparent hover:border-emerald-500/30"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center mt-0.5 shadow-sm">
                        <span className="text-white font-bold text-sm">
                          {index + 1}
                        </span>
                      </div>
                      <div
                        className="text-foreground leading-relaxed flex-1"
                        dangerouslySetInnerHTML={{
                          __html: parseAndFormatText(point),
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Translation Results */}
          {result.translation && (
            <Card className="bg-background/50 border border-border backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                    <Languages className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-foreground">
                      Translation (
                      {
                        languages.find(
                          (l) => l.code === result.translation?.targetLanguage
                        )?.flag
                      }{" "}
                      {
                        languages.find(
                          (l) => l.code === result.translation?.targetLanguage
                        )?.name
                      }
                      )
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      AI-powered translation with high accuracy
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Translated Summary */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <Brain className="w-4 h-4 text-emerald-500" />
                      Translated Summary
                    </h4>
                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          copyToClipboard(
                            result.translation?.translatedSummary || ""
                          )
                        }
                        variant="outline"
                        size="sm"
                        className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30 cursor-pointer"
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                      <div className="relative group">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                          <svg
                            className="w-4 h-4 ml-1 transition-transform group-hover:rotate-180"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </Button>
                        <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                          <div className="py-1">
                            <button
                              onClick={() =>
                                downloadAsText(
                                  result.translation?.translatedSummary || "",
                                  `${result.fileName}_translated_summary.txt`
                                )
                              }
                              className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2 cursor-pointer"
                            >
                              <FileText className="w-4 h-4" />
                              Download as TXT
                            </button>
                            <button
                              onClick={() =>
                                downloadAsDoc(
                                  result.translation?.translatedSummary || "",
                                  `${result.fileName}_translated_summary.doc`
                                )
                              }
                              className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2 cursor-pointer"
                            >
                              <FileType className="w-4 h-4" />
                              Download as DOC
                            </button>
                            <button
                              onClick={() =>
                                downloadAsPDF(
                                  result.translation?.translatedSummary || "",
                                  `${result.fileName}_translated_summary.pdf`
                                )
                              }
                              className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2 cursor-pointer"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                              Download as PDF
                            </button>
                            <div className="border-t border-border my-1"></div>
                            <button
                              onClick={() =>
                                downloadInMultipleFormats(
                                  result.translation?.translatedSummary || "",
                                  `${result.fileName}_translated_summary`
                                )
                              }
                              className="w-full px-4 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 font-medium flex items-center gap-2 cursor-pointer"
                            >
                              <FileDown className="w-4 h-4" />
                              Download All Formats
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-lg border border-border backdrop-blur-sm">
                    <div
                      className="text-foreground leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: parseAndFormatText(
                          result.translation.translatedSummary
                        ),
                      }}
                    />
                  </div>
                </div>

                {/* Translated Key Points */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <Key className="w-4 h-4 text-emerald-500" />
                      Translated Key Points
                    </h4>
                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          copyToClipboard(
                            result.translation!.translatedKeyPoints.join("\n")
                          )
                        }
                        variant="outline"
                        size="sm"
                        className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30"
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </Button>
                      <div className="relative group">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                          <svg
                            className="w-4 h-4 ml-1 transition-transform group-hover:rotate-180"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </Button>
                        <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                          <div className="py-1">
                            <button
                              onClick={() =>
                                downloadAsText(
                                  result.translation!.translatedKeyPoints.join(
                                    "\n"
                                  ),
                                  `${result.fileName}_translated_keypoints.txt`
                                )
                              }
                              className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              Download as TXT
                            </button>
                            <button
                              onClick={() =>
                                downloadAsDoc(
                                  result.translation!.translatedKeyPoints.join(
                                    "\n"
                                  ),
                                  `${result.fileName}_translated_keypoints.doc`
                                )
                              }
                              className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                            >
                              <FileType className="w-4 h-4" />
                              Download as DOC
                            </button>
                            <button
                              onClick={() =>
                                downloadAsPDF(
                                  result.translation!.translatedKeyPoints.join(
                                    "\n"
                                  ),
                                  `${result.fileName}_translated_keypoints.pdf`
                                )
                              }
                              className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                              Download as PDF
                            </button>
                            <div className="border-t border-border my-1"></div>
                            <button
                              onClick={() =>
                                downloadInMultipleFormats(
                                  result.translation!.translatedKeyPoints.join(
                                    "\n"
                                  ),
                                  `${result.fileName}_translated_keypoints`
                                )
                              }
                              className="w-full px-4 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 font-medium flex items-center gap-2"
                            >
                              <FileDown className="w-4 h-4" />
                              Download All Formats
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-lg border border-border backdrop-blur-sm">
                    <div className="space-y-3">
                      {result.translation!.translatedKeyPoints.map(
                        (point, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 group hover:bg-white/20 dark:hover:bg-white/10 p-3 rounded-lg transition-colors"
                          >
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center mt-0.5">
                              <span className="text-white font-semibold text-sm">
                                {index + 1}
                              </span>
                            </div>
                            <div
                              className="text-foreground leading-relaxed flex-1"
                              dangerouslySetInnerHTML={{
                                __html: parseAndFormatText(point),
                              }}
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Download Full Translation */}
                <div className="flex justify-center">
                  <div className="relative group">
                    <Button
                      variant="outline"
                      className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30 px-6 py-2"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Full Translation
                      <svg
                        className="w-4 h-4 ml-1 transition-transform group-hover:rotate-180"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </Button>
                    <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-1">
                        <button
                          onClick={() =>
                            downloadAsText(
                              result.translation!.translatedText,
                              `${result.fileName}_translated.txt`
                            )
                          }
                          className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Download as TXT
                        </button>
                        <button
                          onClick={() =>
                            downloadAsDoc(
                              result.translation!.translatedText,
                              `${result.fileName}_translated.doc`
                            )
                          }
                          className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                        >
                          <FileType className="w-4 h-4" />
                          Download as DOC
                        </button>
                        <button
                          onClick={() =>
                            downloadAsPDF(
                              result.translation!.translatedText,
                              `${result.fileName}_translated.pdf`
                            )
                          }
                          className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          Download as HTML
                        </button>
                        <div className="border-t border-border my-1"></div>
                        <button
                          onClick={() =>
                            downloadInMultipleFormats(
                              result.translation!.translatedText,
                              `${result.fileName}_translated`
                            )
                          }
                          className="w-full px-4 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 font-medium flex items-center gap-2"
                        >
                          <FileDown className="w-4 h-4" />
                          Download All Formats
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Translation Error */}
          {result.translationError && (
            <Card className="bg-background/50 border border-red-500/30 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <div>
                    <span className="font-semibold text-red-400">
                      Translation Warning:
                    </span>
                    <span className="text-foreground ml-2">
                      {result.translationError}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Clear Results */}
          <div className="flex justify-center pt-6">
            <Button
              onClick={clearResults}
              variant="outline"
              className="bg-gradient-to-r cursor-pointer from-emerald-400 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:via-emerald-600 hover:to-emerald-700 text-white border-0 px-8 py-3 font-mono hover:text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <RotateCcw className="w-5 h-5 mr-3" />
              Process New Document
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
