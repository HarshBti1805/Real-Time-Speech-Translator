"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Camera,
  Zap,
  Upload,
  Monitor,
  Image as LucideImage,
} from "lucide-react";
import VoiceRecording from "@/components/VoiceRecording";

export default function VoiceRecordingPage() {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Main Title Card */}
        <Card className="bg-card border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center justify-center">
              <Camera className="w-8 h-8 mr-3" />
              Visual Text Recognition
            </CardTitle>
            <p className="text-muted-foreground text-lg mt-2">
              Extract text from images, screenshots, and camera captures with
              advanced OCR technology
            </p>
          </CardHeader>
        </Card>

        {/* Features Overview */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
              <div className="space-y-3">
                <div className="w-12 h-12 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground">Image Upload</h3>
                <p className="text-sm text-muted-foreground">
                  Upload images from your device for text extraction
                </p>
              </div>

              <div className="space-y-3">
                <div className="w-12 h-12 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground">
                  Camera Capture
                </h3>
                <p className="text-sm text-muted-foreground">
                  Take photos directly with your camera for instant OCR
                </p>
              </div>

              <div className="space-y-3">
                <div className="w-12 h-12 mx-auto bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                  <Monitor className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground">
                  Screen Capture
                </h3>
                <p className="text-sm text-muted-foreground">
                  Capture your entire screen and extract visible text
                </p>
              </div>

              <div className="space-y-3">
                <div className="w-12 h-12 mx-auto bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                  <LucideImage className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground">Snip Tool</h3>
                <p className="text-sm text-muted-foreground">
                  Crop specific regions from your screen for targeted OCR
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voice & Visual Recognition Section */}
        <VoiceRecording />

        {/* Instructions */}
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
                    Our advanced Optical Character Recognition (OCR) technology
                    can extract text from images, screenshots, and camera
                    captures with high accuracy. Perfect for digitizing
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
      </div>
    </div>
  );
}
