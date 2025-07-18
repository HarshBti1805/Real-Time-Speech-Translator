"use client";
import { useState, useRef } from "react";
import {
  Camera,
  Upload,
  Square,
  Play,
  Image as LucideImage,
  Monitor,
  RotateCcw,
  FileText,
  Volume2,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";
import Cropper, { Area } from "react-easy-crop";
import NextImage from "next/image";

export default function VoiceRecording() {
  // Voice recording state
  const [transcription, setTranscription] = useState("");
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // Image/text recognition state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Processing states
  const [processingAudio, setProcessingAudio] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);

  // Camera modal state
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // --- SNIPPING TOOL STATE ---
  const [snippingModalOpen, setSnippingModalOpen] = useState(false);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(
    null
  );
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropShape, setCropShape] = useState<"rect" | "round">("rect");

  // --- SNIPPING TOOL LOGIC ---
  const startSnipping = async () => {
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
          const dataUrl = canvas.toDataURL("image/png");
          setScreenshotDataUrl(dataUrl);
          setSnippingModalOpen(true);
          setCrop({ x: 0, y: 0 });
          setZoom(1);
          setCroppedAreaPixels(null);
        }
        stream.getTracks().forEach((track) => track.stop());
      };
    } catch (error: unknown) {
      // Gracefully handle user cancellation
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as { name?: string }).name &&
        ((error as { name: string }).name === "NotAllowedError" ||
          (error as { name: string }).name === "AbortError")
      ) {
        // User cancelled screen capture, do nothing
        return;
      }
      console.error("Failed to start snipping tool:", error);
      alert("Failed to start snipping tool. Please check permissions.");
    }
  };

  const onCropComplete = (_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCancelSnip = () => {
    setSnippingModalOpen(false);
    setScreenshotDataUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  async function getCroppedImg(
    imageSrc: string,
    pixelCrop: Area
  ): Promise<Blob | null> {
    return new Promise((resolve) => {
      const image = new window.Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(
          image,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          pixelCrop.width,
          pixelCrop.height
        );
        canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/png");
      };
      image.src = imageSrc;
    });
  }

  const handleConfirmSnip = async () => {
    if (!screenshotDataUrl || !croppedAreaPixels) return;
    const blob = await getCroppedImg(screenshotDataUrl, croppedAreaPixels);
    if (blob) {
      const file = new File([blob], "snip.png", { type: "image/png" });
      await handleImageUpload(file);
    }
    setSnippingModalOpen(false);
    setScreenshotDataUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  React.useEffect(() => {
    if (!snippingModalOpen) return;
    const handleMouseUp = () => {
      // No longer needed as isSelecting is removed
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [snippingModalOpen]);

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
      } catch (error: unknown) {
        // Gracefully handle user cancellation
        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          (error as { name?: string }).name &&
          ((error as { name: string }).name === "NotAllowedError" ||
            (error as { name: string }).name === "AbortError")
        ) {
          // User cancelled mic access, do nothing
          return;
        }
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

  // Refactored startCamera to open modal and start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);
      setCameraModalOpen(true);
    } catch (error: unknown) {
      // Gracefully handle user cancellation
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as { name?: string }).name &&
        ((error as { name: string }).name === "NotAllowedError" ||
          (error as { name: string }).name === "AbortError")
      ) {
        // User cancelled camera access, do nothing
        return;
      }
      console.error("Failed to access camera:", error);
      alert("Failed to access camera. Please check permissions.");
    }
  };

  // Attach stream to video element when modal opens
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  React.useEffect(() => {
    if (cameraModalOpen && cameraVideoRef.current && cameraStream) {
      cameraVideoRef.current.srcObject = cameraStream;
      cameraVideoRef.current.play();
    }
    // Clean up on unmount
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraModalOpen, cameraStream]);

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
    } catch (error: unknown) {
      // Gracefully handle user cancellation
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as { name?: string }).name &&
        ((error as { name: string }).name === "NotAllowedError" ||
          (error as { name: string }).name === "AbortError")
      ) {
        // User cancelled screen capture, do nothing
        return;
      }
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
            <LucideImage className="w-5 h-5" />
            Image Text Recognition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-10 items-center justify-center">
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
              className="border-2 border-blue-500/30 cursor-pointer text-blue-400 hover:bg-blue-500/10 flex flex-col items-center gap-2 h-32 w-60 justify-center text-lg font-jetbrains-mono transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-blue-400 rounded-xl backdrop-blur-sm p-4"
            >
              <Upload className="w-8 h-8 mb-1" />
              <span className="font-jetbrains-mono font-semibold">
                Upload Image
              </span>
              <span className="text-xs text-muted-foreground font-product-sans mt-1 text-center text-wrap  max-w-[13rem] break-words block leading-relaxed">
                Select an image file from your device for text extraction.
              </span>
            </Button>

            <Button
              onClick={startCamera}
              disabled={processingImage}
              variant="outline"
              className="border-2 border-purple-500/30 cursor-pointer text-purple-400 hover:bg-purple-500/10 flex flex-col items-center gap-2 h-32 w-60 justify-center text-lg font-jetbrains-mono transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-purple-400 rounded-xl backdrop-blur-sm p-4"
            >
              <Camera className="w-8 h-8 mb-1" />
              <span className="font-jetbrains-mono font-semibold">
                Start Camera
              </span>
              <span className="text-xs text-muted-foreground font-product-sans mt-1 text-center text-wrap max-w-[13rem] break-words block leading-relaxed">
                Use your camera to take a photo and extract text instantly.
              </span>
            </Button>

            <Button
              onClick={captureScreenshot}
              disabled={processingImage}
              variant="outline"
              className="border-2 border-orange-500/30 cursor-pointer text-orange-400 hover:bg-orange-500/10 flex flex-col items-center gap-2 h-32 w-60 justify-center text-lg font-jetbrains-mono transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-orange-400 rounded-xl backdrop-blur-sm p-4"
            >
              <Monitor className="w-8 h-8 mb-1" />
              <span className="font-jetbrains-mono font-semibold">
                Screen Capture
              </span>
              <div className="text-xs text-muted-foreground font-product-sans mt-1 text-center text-wrap  max-w-[13rem] break-words block leading-relaxed">
                Capture your screen and extract any visible text from it.
              </div>
            </Button>

            <Button
              onClick={startSnipping}
              disabled={processingImage}
              variant="outline"
              className="border-2 border-pink-500/30 cursor-pointer text-pink-400 hover:bg-pink-500/10 flex flex-col items-center gap-2 h-32 w-60 justify-center text-lg font-jetbrains-mono transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-pink-400 rounded-xl backdrop-blur-sm p-4"
            >
              <LucideImage className="w-8 h-8 mb-1" />
              <span className="font-jetbrains-mono font-semibold">
                Snip Image
              </span>
              <span className="text-xs text-muted-foreground font-product-sans mt-1 text-center text-wrap  max-w-[13rem] break-words block leading-relaxed">
                Crop a region of your screen to extract text from just that
                area.
              </span>
            </Button>
          </div>

          {/* Snipping Tool Modal */}
          {snippingModalOpen && screenshotDataUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
              <div className="relative bg-card p-6 rounded-lg shadow-lg flex flex-col items-center">
                <div
                  style={{
                    position: "relative",
                    width: "80vw",
                    height: "60vh",
                    background: "#222",
                  }}
                >
                  <Cropper
                    image={screenshotDataUrl}
                    crop={crop}
                    zoom={zoom}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                    cropShape={cropShape}
                    showGrid={true}
                  />
                </div>
                <div className="flex gap-2 mb-2">
                  <Button
                    onClick={() => setCropShape("rect")}
                    variant={cropShape === "rect" ? "default" : "outline"}
                  >
                    Rectangle
                  </Button>
                  <Button
                    onClick={() => setCropShape("round")}
                    variant={cropShape === "round" ? "default" : "outline"}
                  >
                    Circle
                  </Button>
                </div>
                <div className="flex gap-2 mt-4 justify-center">
                  <Button onClick={handleConfirmSnip} variant="outline">
                    Confirm Snip
                  </Button>
                  <Button onClick={handleCancelSnip} variant="outline">
                    Cancel
                  </Button>
                </div>
              </div>
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
              <NextImage
                src={imagePreview}
                alt="Selected image preview"
                className="max-w-full max-h-64 rounded-lg border border-border"
                width={512}
                height={256}
                style={{ objectFit: "contain" }}
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
                <div className="bg-muted p-4 rounded-lg border border-border overflow-x-auto">
                  <pre className="text-foreground whitespace-pre-wrap font-mono text-sm leading-relaxed">
                    {extractedText}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {cameraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-card border-border rounded-lg shadow-lg p-6 relative w-full max-w-md mx-auto flex flex-col items-center">
            <button
              onClick={() => {
                if (cameraStream) {
                  cameraStream.getTracks().forEach((track) => track.stop());
                  setCameraStream(null);
                }
                setCameraModalOpen(false);
              }}
              className="absolute top-2 right-2 text-foreground hover:text-red-500"
              aria-label="Close camera modal"
            >
              ×
            </button>
            <video
              ref={cameraVideoRef}
              className="w-full rounded-lg border border-border mb-4"
              autoPlay
              playsInline
              muted
            />
            <Button
              onClick={async () => {
                if (cameraVideoRef.current) {
                  const video = cameraVideoRef.current;
                  const canvas = document.createElement("canvas");
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                  const context = canvas.getContext("2d");
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
                if (cameraStream) {
                  cameraStream.getTracks().forEach((track) => track.stop());
                  setCameraStream(null);
                }
                setCameraModalOpen(false);
              }}
              className="border-green-500/30 text-green-400 hover:bg-green-500/20 flex items-center gap-2 mt-2"
              variant="outline"
            >
              Capture Photo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
