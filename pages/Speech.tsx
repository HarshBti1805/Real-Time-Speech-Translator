"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, FileAudio, Zap, Upload, Camera } from "lucide-react";
import VoiceRecording from "@/components/VoiceRecording";
import FileUpload from "@/components/FileUpload";

export default function Speech() {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Main Title Card */}
        <Card className="bg-card border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center justify-center">
              <Mic className="w-8 h-8 mr-3" />
              Audio Recognition Hub
            </CardTitle>
            <p className="text-muted-foreground text-lg mt-2">
              Transform speech to text with advanced audio processing and visual
              recognition
            </p>
          </CardHeader>
        </Card>

        {/* Features Overview */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="space-y-3">
                <div className="w-12 h-12 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground">
                  Live Recording
                </h3>
                <p className="text-sm text-muted-foreground">
                  Record audio directly from your microphone with real-time
                  processing
                </p>
              </div>

              <div className="space-y-3">
                <div className="w-12 h-12 mx-auto bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <FileAudio className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground">File Upload</h3>
                <p className="text-sm text-muted-foreground">
                  Upload audio files in various formats for transcription
                </p>
              </div>

              <div className="space-y-3">
                <div className="w-12 h-12 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground">
                  Visual Recognition
                </h3>
                <p className="text-sm text-muted-foreground">
                  Extract text from images, screenshots, and camera captures
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Upload Section */}
        <FileUpload />

        {/* Voice & Visual Recognition Section */}
        <VoiceRecording />

        {/* Instructions */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <h3 className="font-medium text-foreground/90 mb-4 flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              How to use Speech Recognition:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center">
                  <Mic className="w-4 h-4 mr-2 text-blue-400" />
                  Voice Recording
                </h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    Click &quot;Start Recording&quot; to begin voice capture
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    Speak clearly into your microphone
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    Click &quot;Stop Recording&quot; when finished
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    Get instant transcription with high accuracy
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center">
                  <Camera className="w-4 h-4 mr-2 text-purple-400" />
                  Visual Recognition
                </h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    Upload images containing text for OCR processing
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    Use camera to capture photos with text instantly
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    Take screenshots for automatic text extraction
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    Crop specific regions with the snipping tool
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
              <div className="flex items-start">
                <Upload className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">
                    File Upload Support
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Supports various audio formats including MP3, WAV, M4A,
                    FLAC, and more. Upload your audio files and get accurate
                    transcriptions with automatic language detection.
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
      </div>
    </div>
  );
}
