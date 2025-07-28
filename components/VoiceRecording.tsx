"use client";
import { useState, useRef } from "react";
import {
  Upload,
  Monitor,
  RotateCcw,
  FileText,
  Copy,
  Camera,
  BookOpen,
  Eye,
  Scissors,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";
import Cropper, { Area } from "react-easy-crop";
import NextImage from "next/image";
import PDFProcessor from "./PDFProcessor";

interface VoiceRecordingProps {
  onTabChange?: (tab: "visual" | "pdf") => void;
}

export default function VoiceRecording({ onTabChange }: VoiceRecordingProps) {
  // Tab state for choosing between Visual OCR and PDF Processing
  const [activeTab, setActiveTab] = useState<"visual" | "pdf">("visual");

  // Notify parent component when tab changes
  const handleTabChange = (tab: "visual" | "pdf") => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Image/text recognition state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Processing states
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

  // Video refs
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);

  // --- SNIPPING TOOL LOGIC ---
  const startSnipping = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();

      video.addEventListener("loadedmetadata", () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const dataUrl = canvas.toDataURL("image/png");
          setScreenshotDataUrl(dataUrl);
          setSnippingModalOpen(true);

          // Stop the stream
          stream.getTracks().forEach((track) => track.stop());
        }
      });
    } catch (error) {
      console.error("Error accessing screen:", error);
      alert(
        "Screen capture failed. Please make sure you've granted permission to access your screen."
      );
    }
  };

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleSnippingCapture = async () => {
    if (!screenshotDataUrl || !croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(
        screenshotDataUrl,
        croppedAreaPixels
      );
      if (croppedImage) {
        const file = dataURLtoFile(croppedImage, "screenshot.png");
        await handleImageUpload(file);
      }
      setSnippingModalOpen(false);
      setScreenshotDataUrl(null);
      setCroppedAreaPixels(null);
    } catch (error) {
      console.error("Error processing cropped image:", error);
    }
  };

  // Helper function to create cropped image
  const getCroppedImg = (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      const image = new Image();
      image.addEventListener("load", () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(null);
          return;
        }

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

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
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          } else {
            resolve(null);
          }
        }, "image/png");
      });
      image.src = imageSrc;
    });
  };

  // Helper function to convert dataURL to File
  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // --- MAIN FUNCTIONS ---
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    await processImageWithAI(file);
  };

  const processImageWithAI = async (file: File) => {
    setProcessingImage(true);
    setExtractedText("");

    try {
      const base64 = await fileToBase64(file);

      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.text) {
        setExtractedText(data.text);
      } else {
        throw new Error(data.error || "Failed to extract text");
      }
    } catch (error) {
      console.error("Error processing image:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to process image. Please try again."
      );
    } finally {
      setProcessingImage(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          // Remove the data:image/...;base64, prefix
          const base64 = reader.result.split(",")[1];
          resolve(base64);
        } else {
          reject(new Error("Failed to convert file to base64"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const takeScreenshot = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();

      video.addEventListener("loadedmetadata", () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.drawImage(video, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const file = new File([blob], "screenshot.png", {
                  type: "image/png",
                });
                handleImageUpload(file);
              }
            },
            "image/png",
            0.95
          );
        }

        stream.getTracks().forEach((track) => track.stop());
      });
    } catch (error) {
      console.error("Error taking screenshot:", error);
      alert(
        "Screenshot failed. Please make sure you've granted permission to access your screen."
      );
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }

      setCameraModalOpen(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert(
        "Camera access denied. Please check your browser permissions and try again."
      );
    }
  };

  const clearResults = () => {
    setImagePreview(null);
    setExtractedText("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Main Title Card */}
      <Card className="bg-card/50 border-border backdrop-blur-sm shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent flex items-center justify-center">
            <div className="flex items-center gap-3">
              <Eye className="w-10 h-10 text-blue-400" />
            </div>
            <span className="ml-4">Document Intelligence Hub</span>
          </CardTitle>
          <p className="text-muted-foreground text-l mt-3">
            Choose your preferred method to extract and analyze text from images
            or PDF documents
          </p>
        </CardHeader>
      </Card>

      {/* Tab Navigation */}
      <Card className="bg-card/50 border-border backdrop-blur-sm shadow-xl">
        <CardContent className="p-0">
          <div className="flex border-b border-border">
            <button
              onClick={() => handleTabChange("visual")}
              className={`flex-1 flex items-center justify-center p-6 font-medium transition-all duration-300 ${
                activeTab === "visual"
                  ? "border-b-2 border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Eye className="w-6 h-6 mr-3" />
              <div className="text-left">
                <div className="font-semibold text-lg">
                  Visual Text Recognition
                </div>
                <div className="text-sm opacity-75">
                  Extract text from images and screenshots
                </div>
              </div>
            </button>
            <button
              onClick={() => handleTabChange("pdf")}
              className={`flex-1 flex items-center justify-center p-6 font-medium transition-all duration-300 ${
                activeTab === "pdf"
                  ? "border-b-2 border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-50/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <BookOpen className="w-6 h-6 mr-3" />
              <div className="text-left">
                <div className="font-semibold text-lg">
                  PDF Document Processing
                </div>
                <div className="text-sm opacity-75">
                  Analyze and summarize PDF documents
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      {activeTab === "pdf" ? (
        // PDF Processing Section
        <div className="space-y-6">
          <PDFProcessor />
        </div>
      ) : (
        // Visual Text Recognition Section
        <div className="space-y-6">
          {/* Features Overview for Visual Text Recognition */}
          <Card className="bg-card/50 border-border backdrop-blur-sm shadow-xl">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
                <div className="space-y-3">
                  <div className="w-12 h-12 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground">
                    Image Upload
                  </h3>
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
                    <Scissors className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground">Snip Tool</h3>
                  <p className="text-sm text-muted-foreground">
                    Crop specific regions from your screen for targeted OCR
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-blue-500/20 backdrop-blur-sm shadow-xl">
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    e.target.files?.[0] && handleImageUpload(e.target.files[0])
                  }
                  className="hidden"
                />

                {/* Upload Image Button */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processingImage}
                    variant="outline"
                    className="relative border-2 border-blue-500/30 cursor-pointer text-blue-400 hover:bg-blue-500/10 flex flex-col items-center gap-4 h-32 w-full justify-center text-lg font-jetbrains-mono transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-blue-400 rounded-2xl backdrop-blur-sm"
                  >
                    <Upload className="w-8 h-8" />
                    <span className="font-jetbrains-mono font-semibold text-center">
                      Upload Image
                    </span>
                  </Button>
                </div>

                {/* Camera Capture Button */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                  <Button
                    onClick={startCamera}
                    disabled={processingImage}
                    variant="outline"
                    className="relative border-2 border-green-500/30 cursor-pointer text-green-400 hover:bg-green-500/10 flex flex-col items-center gap-4 h-32 w-full justify-center text-lg font-jetbrains-mono transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-green-400 rounded-2xl backdrop-blur-sm"
                  >
                    <Camera className="w-8 h-8" />
                    <span className="font-jetbrains-mono font-semibold text-center">
                      Camera Capture
                    </span>
                  </Button>
                </div>

                {/* Screenshot Button */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                  <Button
                    onClick={takeScreenshot}
                    disabled={processingImage}
                    variant="outline"
                    className="relative border-2 border-purple-500/30 cursor-pointer text-purple-400 hover:bg-purple-500/10 flex flex-col items-center gap-4 h-32 w-full justify-center text-lg font-jetbrains-mono transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-purple-400 rounded-2xl backdrop-blur-sm"
                  >
                    <Monitor className="w-8 h-8" />
                    <span className="font-jetbrains-mono font-semibold text-center">
                      Take Screenshot
                    </span>
                  </Button>
                </div>

                {/* Snipping Tool Button */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                  <Button
                    onClick={startSnipping}
                    disabled={processingImage}
                    variant="outline"
                    className="relative border-2 border-orange-500/30 cursor-pointer text-orange-400 hover:bg-orange-500/10 flex flex-col items-center gap-4 h-32 w-full justify-center text-lg font-jetbrains-mono transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-orange-400 rounded-2xl backdrop-blur-sm"
                  >
                    <Scissors className="w-8 h-8" />
                    <span className="font-jetbrains-mono font-semibold text-center">
                      Snipping Tool
                    </span>
                  </Button>
                </div>
              </div>

              {/* Processing Status */}
              {processingImage && (
                <div className="flex items-center justify-center p-8 bg-muted/50 border border-border/50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                    <span className="text-lg font-semibold text-foreground">
                      Processing image with AI...
                    </span>
                  </div>
                </div>
              )}

              {/* Image Preview */}
              {imagePreview && (
                <div className="mt-6 p-6 bg-muted/50 border border-border/50 rounded-xl">
                  <h3 className="font-semibold mb-4 text-foreground/90 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-blue-400" />
                    Selected Image Preview
                  </h3>
                  <div className="flex justify-center">
                    <NextImage
                      src={imagePreview}
                      alt="Selected image preview"
                      className="max-w-full max-h-80 rounded-xl border border-border/50 shadow-lg"
                      width={512}
                      height={320}
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          {extractedText && (
            <Card className="bg-card/50 border-green-500/20 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-green-500/20">
                      <FileText className="w-5 h-5 text-green-400" />
                    </div>
                    <CardTitle className="text-xl font-semibold text-foreground">
                      Extracted Results
                    </CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={clearResults}
                      variant="outline"
                      className="border-border cursor-pointer text-foreground hover:bg-accent transition-all duration-300"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Clear
                    </Button>
                    <Button
                      onClick={() => copyToClipboard(extractedText)}
                      variant="outline"
                      className="border-border cursor-pointer text-foreground hover:bg-accent transition-all duration-300"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Text
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-6 rounded-xl border border-border/50 overflow-x-auto">
                  <pre className="text-foreground whitespace-pre-wrap font-mono text-sm leading-relaxed">
                    {extractedText}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Snipping Modal */}
      {snippingModalOpen && screenshotDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-card/95 border border-border/50 rounded-2xl shadow-2xl p-6 relative w-full max-w-4xl mx-4 h-[80vh] flex flex-col">
            <button
              onClick={() => {
                setSnippingModalOpen(false);
                setScreenshotDataUrl(null);
              }}
              className="absolute top-4 right-4 text-foreground hover:text-red-500 transition-colors duration-300 p-2 rounded-full hover:bg-red-500/10 z-10"
              aria-label="Close snipping modal"
            >
              ×
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-full bg-orange-500/20">
                <Scissors className="w-5 h-5 text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Crop Screenshot
              </h3>
            </div>

            <div className="flex-1 relative rounded-xl overflow-hidden border border-border/50">
              <Cropper
                image={screenshotDataUrl}
                crop={crop}
                zoom={zoom}
                aspect={undefined}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                cropShape={cropShape}
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="cropShape"
                    value="rect"
                    checked={cropShape === "rect"}
                    onChange={(e) =>
                      setCropShape(e.target.value as "rect" | "round")
                    }
                  />
                  Rectangle
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="cropShape"
                    value="round"
                    checked={cropShape === "round"}
                    onChange={(e) =>
                      setCropShape(e.target.value as "rect" | "round")
                    }
                  />
                  Circle
                </label>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setSnippingModalOpen(false);
                    setScreenshotDataUrl(null);
                  }}
                  variant="outline"
                  className="border-border text-foreground hover:bg-accent"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSnippingCapture}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold px-6 transition-all duration-300"
                >
                  Extract Text
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {cameraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-card/95 border border-border/50 rounded-2xl shadow-2xl p-8 relative w-full max-w-md mx-4 flex flex-col items-center">
            <button
              onClick={() => {
                if (cameraStream) {
                  cameraStream.getTracks().forEach((track) => track.stop());
                  setCameraStream(null);
                }
                setCameraModalOpen(false);
              }}
              className="absolute top-4 right-4 text-foreground hover:text-red-500 transition-colors duration-300 p-2 rounded-full hover:bg-red-500/10"
              aria-label="Close camera modal"
            >
              ×
            </button>
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 rounded-full bg-green-500/20">
                <Camera className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Camera Capture
              </h3>
            </div>
            <video
              ref={cameraVideoRef}
              className="w-full rounded-xl border border-border/50 mb-6 shadow-lg"
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
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105 flex items-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Capture Photo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
