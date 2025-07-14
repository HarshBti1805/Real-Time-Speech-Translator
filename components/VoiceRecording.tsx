"use client";
import { useState, useRef } from "react";
import {
  Camera,
  Upload,
  Square,
  Play,
  Image,
  Monitor,
  RotateCcw,
  FileText,
  Volume2,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VoiceRecording() {
  // Voice recording state
  const [transcription, setTranscription] = useState("");
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // Image/text recognition state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Processing states
  const [processingAudio, setProcessingAudio] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);

  // Voice recording functions
  const handleAudioUpload = async (fileToSend: File) => {
    setProcessingAudio(true);
    const formData = new FormData();
    formData.append("audio", fileToSend);

    try {
      const res = await fetch("/api/speech", {
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
          inputType: "audio",
          inputValue: "mic-input.webm",
          outputValue: data.transcription,
        }),
      });
    } catch (error) {
      console.error("Audio processing error:", error);
      setTranscription("Error processing audio.");
    } finally {
      setProcessingAudio(false);
    }
  };

  const handleRecord = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        audioChunks.current = [];
        mediaRecorder.ondataavailable = (e) => {
          audioChunks.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks.current, {
            type: "audio/webm",
          });
          const audioFile = new File([audioBlob], "mic-input.webm", {
            type: "audio/webm",
          });
          await handleAudioUpload(audioFile);
        };

        mediaRecorder.start();
        setRecording(true);
      } catch (error) {
        console.error("Failed to access microphone:", error);
        alert("Failed to access microphone. Please check permissions.");
      }
    }
  };

  // Image processing functions
  const handleImageUpload = async (file: File) => {
    setProcessingImage(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Send to OCR API
      const res = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log(data);
      setExtractedText(data.text || "No text found in image.");
      // Save to transcription history
      fetch("/api/transcription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputType: "image",
          inputValue: file.name,
          outputValue: data.text,
        }),
      });
    } catch (error) {
      console.error("Image processing error:", error);
      setExtractedText("Error processing image.");
    } finally {
      setProcessingImage(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleImageUpload(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (error) {
      console.error("Failed to access camera:", error);
      alert("Failed to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (context) {
        context.drawImage(video, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], "camera-capture.jpg", {
                type: "image/jpeg",
              });
              handleImageUpload(file);
            }
          },
          "image/jpeg",
          0.8
        );
      }
    }
  };

  const captureScreenshot = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();

      video.onloadedmetadata = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");

        if (context) {
          context.drawImage(video, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], "screenshot.png", {
                type: "image/png",
              });
              handleImageUpload(file);
            }
          }, "image/png");
        }

        // Stop screen capture
        stream.getTracks().forEach((track) => track.stop());
      };
    } catch (error) {
      console.error("Failed to capture screenshot:", error);
      alert("Failed to capture screenshot. Please check permissions.");
    }
  };

  const clearResults = () => {
    setTranscription("");
    setExtractedText("");
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here if you have a toast system
      console.log("Text copied to clipboard");
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

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center justify-center">
            <FileText className="w-8 h-8 mr-3" />
            Voice & Visual Recognition System
          </CardTitle>
          <p className="text-muted-foreground">
            Record audio, upload images, capture photos, or take screenshots for
            text recognition
          </p>
        </CardHeader>
      </Card>

      {/* Voice Recording Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2 text-foreground">
            <Volume2 className="w-5 h-5" />
            Voice Recording
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleRecord}
            disabled={processingAudio}
            size="lg"
            className={`font-medium cursor-pointer transition-all duration-200 flex items-center gap-2 ${
              recording
                ? "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg"
                : "bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white shadow-lg"
            } ${processingAudio ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {recording ? (
              <>
                <Square className="w-4 h-4" />
                Stop Recording
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Recording
              </>
            )}
          </Button>

          {processingAudio && (
            <div className="flex items-center text-blue-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
              Processing audio...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Recognition Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2 text-foreground">
            <Image className="w-5 h-5" />
            Image Text Recognition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={processingImage}
              variant="outline"
              className="border-border cursor-pointer text-foreground hover:bg-accent flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Image
            </Button>

            <Button
              onClick={cameraActive ? stopCamera : startCamera}
              disabled={processingImage}
              variant="outline"
              className={`border-border cursor-pointer text-foreground hover:bg-accent flex items-center gap-2 ${
                cameraActive
                  ? "border-red-500/30 text-red-400 hover:bg-red-500/20"
                  : "border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
              }`}
            >
              <Camera className="w-4 h-4" />
              {cameraActive ? "Stop Camera" : "Start Camera"}
            </Button>

            {cameraActive && (
              <Button
                onClick={capturePhoto}
                disabled={processingImage}
                variant="outline"
                className="border-green-500/30 text-green-400 hover:bg-green-500/20 flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Capture Photo
              </Button>
            )}

            <Button
              onClick={captureScreenshot}
              disabled={processingImage}
              variant="outline"
              className="border-orange-500/30 cursor-pointer text-orange-400 hover:bg-orange-500/20 flex items-center gap-2"
            >
              <Monitor className="w-4 h-4" />
              Screen Capture
            </Button>
          </div>

          {/* Camera Preview */}
          {cameraActive && (
            <div className="mt-4">
              <video
                ref={videoRef}
                className="w-full max-w-md mx-auto rounded-lg border border-border"
                autoPlay
                playsInline
                muted
              />
            </div>
          )}

          {/* Hidden canvas for image processing */}
          <canvas ref={canvasRef} className="hidden" />

          {processingImage && (
            <div className="flex items-center text-blue-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
              Processing image...
            </div>
          )}

          {/* Image Preview */}
          {imagePreview && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2 text-foreground/90">
                Selected Image:
              </h3>
              <img
                src={imagePreview}
                alt="Selected image preview"
                className="max-w-full max-h-64 rounded-lg border border-border"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {(transcription || extractedText) && (
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-semibold text-foreground">
                Results
              </CardTitle>
              <Button
                onClick={clearResults}
                variant="outline"
                className="border-border cursor-pointer text-foreground hover:bg-accent"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear Results
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {transcription && (
              <div>
                <h3 className="font-semibold text-green-400 mb-2 flex items-center">
                  <Volume2 className="w-4 h-4 mr-2" />
                  Voice Transcription:
                </h3>
                <div className="bg-muted p-4 rounded-lg border border-border">
                  <p className="text-foreground">{transcription}</p>
                </div>
              </div>
            )}

            {extractedText && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-blue-400 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Extracted Text from Image:
                  </h3>
                  <Button
                    onClick={() => copyToClipboard(extractedText)}
                    variant="outline"
                    size="sm"
                    className="border-border cursor-pointer text-foreground hover:bg-accent flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                </div>
                <div className="bg-muted p-4 rounded-lg border border-border">
                  <p className="text-foreground whitespace-pre-wrap">
                    {extractedText}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
