"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Camera,
  Zap,
  Upload,
  Monitor,
  FileText,
  Languages,
  Brain,
} from "lucide-react";
import VoiceRecording from "@/components/VoiceRecording";

interface VoiceRecordingPageProps {
  onTabChange?: (tab: "visual" | "pdf") => void;
  initialTab?: "visual" | "pdf";
}

export default function VoiceRecordingPage({
  onTabChange,
  initialTab = "visual",
}: VoiceRecordingPageProps) {
  const [activeTab, setActiveTab] = useState<"visual" | "pdf">(initialTab);

  // Update parent component when tab changes
  const handleTabChange = (tab: "visual" | "pdf") => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Update activeTab when initialTab prop changes
  useEffect(() => {
    console.log(`VoiceRecordingPage: Setting activeTab to ${initialTab}`);
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Voice & Visual Recognition Section */}
        <VoiceRecording onTabChange={handleTabChange} />

        {/* Instructions for Visual Text Recognition - Only show when visual tab is active */}
        {activeTab === "visual" && (
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <h3 className="font-medium text-foreground/90 mb-4 flex items-center">
                <Zap className="w-4 h-4 mr-2" />
                How to use Visual Text Recognition:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center">
                    <Upload className="w-4 h-4 mr-2 text-blue-400" />
                    Image Upload & Camera
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      Upload images containing text for OCR processing
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      Use camera to capture photos with text instantly
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      Supports JPG, PNG, GIF, and other image formats
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      Get instant text extraction with high accuracy
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center">
                    <Monitor className="w-4 h-4 mr-2 text-purple-400" />
                    Screen Capture & Snipping
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start">
                      <span className="text-purple-400 mr-2">•</span>
                      Take screenshots for automatic text extraction
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-400 mr-2">•</span>
                      Crop specific regions with the snipping tool
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-400 mr-2">•</span>
                      Choose between rectangular and circular crop shapes
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-400 mr-2">•</span>
                      Perfect for extracting text from documents or websites
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
                <div className="flex items-start">
                  <Camera className="w-5 h-5 text-purple-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">
                      Advanced OCR Technology
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Our advanced Optical Character Recognition (OCR)
                      technology can extract text from images, screenshots, and
                      camera captures with high accuracy. Perfect for digitizing
                      documents, extracting text from photos, or capturing
                      information from screens.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
                        OCR
                      </span>
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
                        Multi-Language
                      </span>
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
                        High Accuracy
                      </span>
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
                        Real-time
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions for PDF Processing - Only show when PDF tab is active */}
        {activeTab === "pdf" && (
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <h3 className="font-medium text-foreground/90 mb-4 flex items-center">
                <Zap className="w-4 h-4 mr-2" />
                How to use PDF Processing:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-emerald-400" />
                    PDF Upload & Analysis
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start">
                      <span className="text-emerald-400 mr-2">•</span>
                      Upload PDF documents up to 25MB in size
                    </li>
                    <li className="flex items-start">
                      <span className="text-emerald-400 mr-2">•</span>
                      Extract text content using advanced AI technology
                    </li>
                    <li className="flex items-start">
                      <span className="text-emerald-400 mr-2">•</span>
                      Generate intelligent summaries and key points
                    </li>
                    <li className="flex items-start">
                      <span className="text-emerald-400 mr-2">•</span>
                      Process both text-based and scanned PDFs
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center">
                    <Languages className="w-4 h-4 mr-2 text-purple-400" />
                    Translation & Export
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start">
                      <span className="text-purple-400 mr-2">•</span>
                      Translate content to 20+ languages instantly
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-400 mr-2">•</span>
                      Download results as text files for offline use
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-400 mr-2">•</span>
                      Copy content to clipboard with one click
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-400 mr-2">•</span>
                      Perfect for research, documentation, and analysis
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
                <div className="flex items-start">
                  <Brain className="w-5 h-5 text-emerald-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">
                      Advanced AI Processing
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Our advanced AI technology uses PyPDF2 and pdfplumber
                      libraries to extract text with high accuracy. For scanned
                      documents, the system will guide you to use our Visual
                      Text Recognition feature for optimal results.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                        AI Analysis
                      </span>
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                        Multi-Language
                      </span>
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                        High Accuracy
                      </span>
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                        Fast Processing
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
