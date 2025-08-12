"use client";
import { useState, useRef, useEffect, useCallback } from "react";
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
  Clipboard,
  Edit3,
  RotateCw,
  Sun,
  Palette,
  Move,
  Square,
  Download,
  Undo,
  Redo,
  Play,
  Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";
import Cropper, { Area } from "react-easy-crop";
import NextImage from "next/image";
import PDFProcessor from "./PDFProcessor";
import toast from "react-hot-toast";

interface VoiceRecordingProps {
  onTabChange?: (tab: "visual" | "pdf") => void;
}

export default function VoiceRecording({ onTabChange }: VoiceRecordingProps) {
  // Tab state for choosing between Visual OCR and PDF Processing
  const [activeTab, setActiveTab] = useState<"visual" | "pdf">("visual");

  // Browser environment check
  const [isBrowser, setIsBrowser] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(true);

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
  const [pastingImage, setPastingImage] = useState(false);

  // Camera modal state
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraSettings, setCameraSettings] = useState({
    mirrorPreview: true, // Mirror the preview like a selfie camera
    correctCapture: true, // Correct the captured image (un-mirror it)
  });

  // Real-time OCR state - separate from camera capture
  const [realtimeOCROpen, setRealtimeOCROpen] = useState(false);
  const [realtimeOCRStream, setRealtimeOCRStream] =
    useState<MediaStream | null>(null);
  const [realtimeOCR, setRealtimeOCR] = useState(false);
  const [realtimeText, setRealtimeText] = useState("");
  const [ocrInterval, setOcrInterval] = useState<NodeJS.Timeout | null>(null);
  const [isProcessingFrame, setIsProcessingFrame] = useState(false);

  // Enhanced OCR state
  const [ocrHistory, setOcrHistory] = useState<
    Array<{
      id: string;
      text: string;
      timestamp: Date;
      confidence: number;
      language: string;
    }>
  >([]);
  const [ocrSettings, setOcrSettings] = useState({
    captureInterval: 2000, // milliseconds
    confidenceThreshold: 0.7, // minimum confidence score
    enableLanguageDetection: true,
    enableTextHighlighting: true,
    captureMode: "continuous" as "continuous" | "manual" | "motion",
  });
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [detectedLanguage, setDetectedLanguage] = useState("");
  const [ocrStats, setOcrStats] = useState({
    totalCaptures: 0,
    successfulCaptures: 0,
    averageConfidence: 0,
    startTime: null as Date | null,
  });

  // --- SNIPPING TOOL STATE ---
  const [snippingModalOpen, setSnippingModalOpen] = useState(false);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(
    null
  );
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropShape, setCropShape] = useState<"rect" | "round">("rect");

  // --- IMAGE EDITOR STATE ---
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [editorSettings, setEditorSettings] = useState({
    brightness: 100,
    contrast: 100,
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
    filter: "none",
  });
  const [editorTool, setEditorTool] = useState<"move" | "crop">("move");
  const [editorHistory, setEditorHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Video refs
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const realtimeOCRVideoRef = useRef<HTMLVideoElement | null>(null);

  // Check browser environment and camera availability on mount
  useEffect(() => {
    setIsBrowser(true);

    // Check if camera is available
    if (navigator.mediaDevices) {
      // Check if any video devices are available
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoDevices = devices.filter(
            (device) => device.kind === "videoinput"
          );
          setCameraAvailable(videoDevices.length > 0);
          setCameraLoading(false);
        })
        .catch(() => {
          setCameraAvailable(false);
          setCameraLoading(false);
        });
    } else {
      setCameraAvailable(false);
      setCameraLoading(false);
    }
  }, []);

  // Error handling utility functions
  const setError = (type: string, message: string) => {
    // Show error as toast instead of modal
    toast.error(
      (t) => (
        <div className="flex flex-col space-y-3">
          <div className="flex items-center space-x-2">
            <span>❌ {getErrorTitle(type)}</span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {message}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      ),
      {
        duration: 8000,
        position: "top-center",
      }
    );
  };

  const getErrorTitle = (type: string): string => {
    switch (type) {
      case "camera":
        return "Camera Error";
      case "realtimeOCR":
        return "Real-time OCR Error";
      case "imageProcessing":
        return "Image Processing Error";
      case "screenCapture":
        return "Screen Capture Error";
      case "fileUpload":
        return "File Upload Error";
      case "network":
        return "Network Error";
      case "general":
        return "General Error";
      default:
        return "Error";
    }
  };

  const handleCameraError = (error: unknown, context: string) => {
    console.error(`Camera error in ${context}:`, error);

    let errorMessage = "An unexpected camera error occurred.";

    if (error instanceof DOMException) {
      switch (error.name) {
        case "NotAllowedError":
          errorMessage =
            "Camera access denied. Please allow camera permissions in your browser settings and try again.";
          break;
        case "NotFoundError":
          errorMessage =
            "No camera found on your device. Please connect a camera and try again.";
          break;
        case "NotReadableError":
          errorMessage =
            "Camera is already in use by another application. Please close other camera apps and try again.";
          break;
        case "OverconstrainedError":
          errorMessage =
            "Camera doesn't support the requested settings. Trying with default settings...";
          break;
        case "SecurityError":
          errorMessage =
            "Camera access blocked due to security restrictions. Please check your browser settings.";
          break;
        case "AbortError":
          errorMessage = "Camera access was aborted. Please try again.";
          break;
        default:
          errorMessage = `Camera error: ${error.message}`;
      }
    } else if (error instanceof Error) {
      // Handle specific error messages that might indicate device not found
      if (
        error.message.includes("request device not found") ||
        error.message.includes("device not found") ||
        error.message.includes("no device")
      ) {
        errorMessage =
          "No camera device found. Please ensure your camera is connected and not being used by another application.";
      } else if (error.message.includes("permission")) {
        errorMessage =
          "Camera permission denied. Please allow camera access in your browser settings.";
      } else if (error.message.includes("not supported")) {
        errorMessage =
          "Camera access not supported in this environment. Please use a modern browser.";
      } else {
        errorMessage = error.message;
      }
    }

    setError("camera", errorMessage);
  };

  const handleNetworkError = (error: unknown, context: string) => {
    console.error(`Network error in ${context}:`, error);

    let errorMessage = "A network error occurred.";

    if (error instanceof TypeError && error.message.includes("fetch")) {
      errorMessage =
        "Network connection failed. Please check your internet connection and try again.";
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    setError("network", errorMessage);
  };

  const handleImageProcessingError = (error: unknown, context: string) => {
    console.error(`Image processing error in ${context}:`, error);

    let errorMessage = "Failed to process image.";

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    setError("imageProcessing", errorMessage);
  };

  const handleScreenCaptureError = (error: unknown, action: string) => {
    console.error(`Screen capture error in ${action}:`, error);

    let errorMessage = "Failed to capture screen.";

    if (error instanceof DOMException) {
      switch (error.name) {
        case "NotAllowedError":
          errorMessage =
            "Screen capture permission denied. Please allow screen sharing and try again.";
          break;
        case "NotFoundError":
          errorMessage = "No screen or window found to capture.";
          break;
        case "NotReadableError":
          errorMessage =
            "Screen capture failed. The selected screen may be protected or in use.";
          break;
        default:
          errorMessage = `Screen capture error: ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    setError("screenCapture", errorMessage);
  };

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

          // Show success message
          toast.success(
            "Screen captured successfully! You can now crop and process the image.",
            {
              duration: 3000,
              position: "top-center",
            }
          );
        }
      });
    } catch (error) {
      handleScreenCaptureError(error, "Screen capture");
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
      handleImageProcessingError(error, "cropped image processing");
    }
  };

  // Helper function to create cropped image
  const getCroppedImg = (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.addEventListener("load", () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
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
              reader.onerror = () =>
                reject(new Error("Failed to read cropped image"));
              reader.readAsDataURL(blob);
            } else {
              reject(new Error("Failed to create blob from canvas"));
            }
          }, "image/png");
        } catch (error) {
          reject(error);
        }
      });

      image.addEventListener("error", () => {
        reject(new Error("Failed to load image for cropping"));
      });

      image.src = imageSrc;
    });
  };

  // Helper function to convert dataURL to File
  const dataURLtoFile = (dataurl: string, filename: string): File => {
    try {
      const arr = dataurl.split(",");
      const mimeMatch = arr[0].match(/:(.*?);/);
      if (!mimeMatch) {
        throw new Error("Invalid data URL format");
      }
      const mime = mimeMatch[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, { type: mime });
    } catch (error) {
      throw new Error(
        `Failed to convert data URL to file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  // Helper function to check clipboard support
  const isClipboardSupported = () => {
    return navigator.clipboard && navigator.clipboard.read;
  };

  // --- PASTE IMAGE FUNCTIONALITY ---
  const handlePasteImage = useCallback(async () => {
    setPastingImage(true);

    // Check if clipboard API is supported
    if (!isClipboardSupported()) {
      toast.error(
        (t) => (
          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-2">
              <span>❌ Clipboard API not supported</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Your browser doesn&apos;t support clipboard image access
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  startSnipping();
                }}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                📸 Take Screenshot
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        ),
        {
          duration: 10000,
          position: "top-center",
        }
      );
      return;
    }

    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (
          item.types.includes("image/png") ||
          item.types.includes("image/jpeg")
        ) {
          const blob = await item.getType(
            item.types.find((type) => type.startsWith("image/"))!
          );
          const file = new File([blob], "pasted-image.png", {
            type: blob.type,
          });

          // Convert to data URL for editor
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            setOriginalImage(dataUrl);
            setEditedImage(dataUrl);
            setImageEditorOpen(true);
          };
          reader.readAsDataURL(file);
          toast.success("Image pasted successfully! Opening editor...");
          setPastingImage(false);
          return;
        }
      }

      // No image found in clipboard - show toast with screenshot option
      toast.error(
        (t) => (
          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-2">
              <span>📋 No image found in clipboard</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Copy an image first, or take a screenshot instead
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  startSnipping();
                }}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                📸 Take Screenshot
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        ),
        {
          duration: 8000,
          position: "top-center",
        }
      );
      setPastingImage(false);
    } catch (error) {
      console.error("Error accessing clipboard:", error);

      // Handle different types of clipboard errors
      let errorMessage = "Failed to access clipboard.";
      const showScreenshotOption = true;

      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          errorMessage =
            "Clipboard permission denied. Please allow clipboard access.";
        } else if (error.name === "SecurityError") {
          errorMessage = "Clipboard access blocked for security reasons.";
        } else if (error.name === "NotSupportedError") {
          errorMessage = "Clipboard API not supported in this browser.";
        }
      }

      if (showScreenshotOption) {
        toast.error(
          (t) => (
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-2">
                <span>❌ {errorMessage}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Try taking a screenshot instead
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    startSnipping();
                  }}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                >
                  📸 Take Screenshot
                </button>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ),
          {
            duration: 10000,
            position: "top-center",
          }
        );
      } else {
        toast.error(errorMessage, {
          duration: 5000,
          position: "top-center",
        });
      }
    }

    setPastingImage(false);
  }, []);

  // Keyboard shortcuts for paste functionality
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+V or Cmd+V for paste
      if ((event.ctrlKey || event.metaKey) && event.key === "v") {
        event.preventDefault();
        toast.success("📋 Attempting to paste image from clipboard...", {
          duration: 2000,
          position: "top-center",
        });
        handlePasteImage();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handlePasteImage]);

  // --- IMAGE EDITOR FUNCTIONS ---
  const applyImageEdits = useCallback(
    (imageUrl: string, settings: typeof editorSettings) => {
      return new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;

          // Calculate rotated dimensions
          const angle = (settings.rotation * Math.PI) / 180;
          const cos = Math.abs(Math.cos(angle));
          const sin = Math.abs(Math.sin(angle));
          const newWidth = img.width * cos + img.height * sin;
          const newHeight = img.width * sin + img.height * cos;

          canvas.width = newWidth;
          canvas.height = newHeight;

          // Clear canvas
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Apply transformations
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(angle);
          ctx.scale(
            settings.flipHorizontal ? -1 : 1,
            settings.flipVertical ? -1 : 1
          );

          // Apply filters
          const brightness = settings.brightness / 100;
          const contrast = settings.contrast / 100;
          ctx.filter = `brightness(${brightness}) contrast(${contrast})`;

          // Apply color filters
          if (settings.filter !== "none") {
            switch (settings.filter) {
              case "grayscale":
                ctx.filter += " grayscale(100%)";
                break;
              case "sepia":
                ctx.filter += " sepia(100%)";
                break;
              case "blur":
                ctx.filter += " blur(2px)";
                break;
              case "vintage":
                ctx.filter += " sepia(50%) contrast(1.2) brightness(0.9)";
                break;
            }
          }

          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          ctx.restore();

          resolve(canvas.toDataURL());
        };
        img.src = imageUrl;
      });
    },
    []
  );

  const undoEdit = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setEditedImage(editorHistory[historyIndex - 1]);
    }
  }, [historyIndex, editorHistory]);

  const redoEdit = useCallback(() => {
    if (historyIndex < editorHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setEditedImage(editorHistory[historyIndex + 1]);
    }
  }, [historyIndex, editorHistory]);

  const resetEditor = useCallback(() => {
    setEditorSettings({
      brightness: 100,
      contrast: 100,
      rotation: 0,
      flipHorizontal: false,
      flipVertical: false,
      filter: "none",
    });
    setEditorTool("move");
    setEditorHistory([]);
    setHistoryIndex(-1);
    if (originalImage) {
      setEditedImage(originalImage);
    }
  }, [originalImage]);

  const downloadEditedImage = useCallback(() => {
    if (editedImage) {
      const link = document.createElement("a");
      link.download = "edited-image.png";
      link.href = editedImage;
      link.click();
    }
  }, [editedImage]);

  const processEditedImage = useCallback(async () => {
    if (editedImage) {
      const file = dataURLtoFile(editedImage, "edited-image.png");
      await handleImageUpload(file);
      setImageEditorOpen(false);
    }
  }, [editedImage]);

  // --- REAL-TIME OCR FUNCTIONS ---
  const startRealtimeOCRCamera = useCallback(async () => {
    try {
      // Try environment camera first, fallback to any available camera
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            aspectRatio: { ideal: 16 / 9 },
          },
        });
      } catch (envError) {
        console.log(
          "Environment camera not available, trying any camera:",
          envError
        );
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            aspectRatio: { ideal: 16 / 9 },
          },
        });
      }

      setRealtimeOCRStream(stream);
      setRealtimeOCROpen(true);
    } catch (error) {
      handleCameraError(error, "real-time OCR camera");
    }
  }, []);

  const startRealtimeOCR = useCallback(async () => {
    if (!realtimeOCRVideoRef.current) {
      setError("realtimeOCR", "Video element not ready. Please try again.");
      return;
    }

    setRealtimeOCR(true);

    // Initialize OCR stats
    if (!ocrStats.startTime) {
      setOcrStats((prev) => ({
        ...prev,
        startTime: new Date(),
        totalCaptures: 0,
        successfulCaptures: 0,
        averageConfidence: 0,
      }));
    }

    const video = realtimeOCRVideoRef.current;

    const processFrame = async () => {
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
        console.log("Video not ready:", {
          video: !!video,
          videoWidth: video?.videoWidth,
          videoHeight: video?.videoHeight,
        });
        return;
      }

      console.log("Processing frame:", {
        width: video.videoWidth,
        height: video.videoHeight,
      });

      setIsProcessingFrame(true);

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        if (cameraSettings.correctCapture && cameraSettings.mirrorPreview) {
          // Correct the mirroring for the captured frame
          ctx.save();
          ctx.scale(-1, 1); // Flip horizontally to correct mirroring
          ctx.drawImage(
            video,
            -video.videoWidth,
            0,
            video.videoWidth,
            video.videoHeight
          );
          ctx.restore();
        } else {
          // Draw normally without correction
          ctx.drawImage(video, 0, 0);
        }
        canvas.toBlob(
          async (blob) => {
            if (blob) {
              try {
                // Create a File object from the blob
                const file = new File([blob], "camera-frame.jpg", {
                  type: "image/jpeg",
                });

                console.log("Sending frame to OCR API, file size:", file.size);

                // Create FormData and append the file
                const formData = new FormData();
                formData.append("image", file);

                const response = await fetch("/api/ocr", {
                  method: "POST",
                  body: formData,
                  // Don't set Content-Type header - let browser set it with boundary for FormData
                });

                console.log("OCR API response status:", response.status);

                if (response.ok) {
                  const data = await response.json();
                  console.log("OCR API response data:", data);

                  if (data.success) {
                    if (data.text && data.text.trim()) {
                      // Update OCR stats
                      const confidence = data.confidence || 0.8;
                      const language = data.language || "en";

                      setCurrentConfidence(confidence);
                      setDetectedLanguage(language);

                      // Add to OCR history
                      const newOcrEntry = {
                        id: Date.now().toString(),
                        text: data.text,
                        timestamp: new Date(),
                        confidence,
                        language,
                      };

                      setOcrHistory((prev) => [
                        newOcrEntry,
                        ...prev.slice(0, 9),
                      ]); // Keep last 10 entries

                      // Update stats
                      setOcrStats((prev) => {
                        const newTotal = prev.totalCaptures + 1;
                        const newSuccessful = prev.successfulCaptures + 1;
                        const newAvgConfidence =
                          (prev.averageConfidence * (newTotal - 1) +
                            confidence) /
                          newTotal;

                        return {
                          ...prev,
                          totalCaptures: newTotal,
                          successfulCaptures: newSuccessful,
                          averageConfidence: newAvgConfidence,
                        };
                      });

                      // Only update realtime text if confidence meets threshold
                      if (confidence >= ocrSettings.confidenceThreshold) {
                        setRealtimeText(data.text);
                      }

                      console.log(
                        "OCR text extracted:",
                        data.text,
                        "Confidence:",
                        confidence
                      );
                    } else {
                      console.log("OCR successful but no text found");
                      setOcrStats((prev) => ({
                        ...prev,
                        totalCaptures: prev.totalCaptures + 1,
                      }));
                    }
                  } else {
                    console.error("OCR API returned error:", data.error);
                    setError(
                      "realtimeOCR",
                      `OCR processing failed: ${data.error || "Unknown error"}`
                    );
                    setOcrStats((prev) => ({
                      ...prev,
                      totalCaptures: prev.totalCaptures + 1,
                    }));
                  }
                } else {
                  const errorText = await response.text();
                  console.error(
                    "OCR API request failed:",
                    response.status,
                    errorText
                  );
                  setError(
                    "realtimeOCR",
                    `OCR API request failed: ${response.status} - ${errorText}`
                  );
                  setOcrStats((prev) => ({
                    ...prev,
                    totalCaptures: prev.totalCaptures + 1,
                  }));
                }
              } catch (error) {
                handleNetworkError(error, "real-time OCR");
                setOcrStats((prev) => ({
                  ...prev,
                  totalCaptures: prev.totalCaptures + 1,
                }));
              } finally {
                setIsProcessingFrame(false);
              }
            }
          },
          "image/jpeg",
          0.8
        );
      }
    };

    const interval = setInterval(processFrame, ocrSettings.captureInterval);
    setOcrInterval(interval);
  }, [
    cameraSettings.correctCapture,
    cameraSettings.mirrorPreview,
    ocrSettings.captureInterval,
    ocrSettings.confidenceThreshold,
  ]);

  const stopRealtimeOCR = useCallback(() => {
    setRealtimeOCR(false);
    setRealtimeText("");
    setIsProcessingFrame(false);
    if (ocrInterval) {
      clearInterval(ocrInterval);
      setOcrInterval(null);
    }
  }, [ocrInterval]);

  // Effect to apply image edits when settings change
  useEffect(() => {
    if (originalImage && imageEditorOpen) {
      applyImageEdits(originalImage, editorSettings).then((result) => {
        setEditedImage(result);
      });
    }
  }, [originalImage, editorSettings, imageEditorOpen, applyImageEdits]);

  // Effect to handle camera stream for photo capture
  useEffect(() => {
    if (cameraStream && cameraVideoRef.current) {
      const video = cameraVideoRef.current;
      video.srcObject = cameraStream;

      const handleLoadedMetadata = () => {
        video.play().catch((error) => {
          console.error("Error playing camera video:", error);
          handleCameraError(error, "video playback");
        });
      };

      video.addEventListener("loadedmetadata", handleLoadedMetadata);

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      };
    }
  }, [cameraStream]);

  // Effect to handle real-time OCR camera stream
  useEffect(() => {
    if (realtimeOCRStream && realtimeOCRVideoRef.current) {
      const video = realtimeOCRVideoRef.current;
      video.srcObject = realtimeOCRStream;

      const handleLoadedMetadata = () => {
        video
          .play()
          .then(() => {
            console.log("Real-time OCR video started playing");
            // Don't auto-start OCR - let user manually start it
          })
          .catch((error) => {
            console.error("Error playing real-time OCR video:", error);
            handleCameraError(error, "real-time OCR video playback");
          });
      };

      video.addEventListener("loadedmetadata", handleLoadedMetadata);

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      };
    }
  }, [realtimeOCRStream]);

  // Cleanup effect for camera stream and intervals
  useEffect(() => {
    return () => {
      if (ocrInterval) {
        clearInterval(ocrInterval);
      }
      // Cleanup camera streams on unmount
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      if (realtimeOCRStream) {
        realtimeOCRStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [ocrInterval, cameraStream, realtimeOCRStream]);

  // --- MAIN FUNCTIONS ---
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError(
        "fileUpload",
        "Please select a valid image file (JPEG, PNG, GIF, etc.)."
      );
      return;
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError(
        "fileUpload",
        "File size too large. Please select an image smaller than 10MB."
      );
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.onerror = () => {
        setError(
          "fileUpload",
          "Failed to read the image file. Please try again."
        );
      };
      reader.readAsDataURL(file);

      await processImageWithAI(file);
    } catch (error) {
      handleImageProcessingError(error, "file upload");
    }
  };

  const processImageWithAI = async (file: File) => {
    setProcessingImage(true);
    setExtractedText("");

    try {
      // Create FormData and append the file
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary for FormData
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
      handleImageProcessingError(error, "image processing");
    } finally {
      setProcessingImage(false);
    }
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

                // Show success message
                toast.success(
                  "Screenshot captured successfully! Processing image...",
                  {
                    duration: 3000,
                    position: "top-center",
                  }
                );
              }
            },
            "image/png",
            0.95
          );
        }

        stream.getTracks().forEach((track) => track.stop());
      });
    } catch (error) {
      handleScreenCaptureError(error, "Screenshot");
    }
  };

  const startCamera = async () => {
    try {
      // Check if we're in a browser environment and mediaDevices is available
      if (!isBrowser) {
        throw new Error(
          "Please wait for the page to fully load before accessing the camera."
        );
      }

      if (!navigator.mediaDevices) {
        throw new Error(
          "Camera access not supported in this environment. Please use a modern browser."
        );
      }

      // Check if camera is available
      if (!cameraAvailable) {
        throw new Error(
          "No camera devices found. Please ensure your camera is connected and not being used by another application."
        );
      }

      // Check if camera permissions are already granted
      const permissions = await navigator.permissions.query({
        name: "camera" as PermissionName,
      });
      if (permissions.state === "denied") {
        throw new Error(
          "Camera access denied. Please enable camera permissions in your browser settings."
        );
      }

      // Try environment camera first, fallback to any available camera
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            aspectRatio: { ideal: 16 / 9 },
          },
        });
      } catch (envError) {
        console.log(
          "Environment camera not available, trying any camera:",
          envError
        );

        // Try with minimal constraints first
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
        } catch {
          // If minimal constraints fail, try with specific dimensions
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 },
            },
          });
        }
      }

      setCameraStream(stream);
      setCameraModalOpen(true);
    } catch (error) {
      handleCameraError(error, "camera access");
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
      toast.success("Text copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy text to clipboard:", error);
      // Fallback for older browsers
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        toast.success("Text copied to clipboard!");
      } catch (fallbackError) {
        console.error("Fallback copy also failed:", fallbackError);
        setError(
          "general",
          "Failed to copy text to clipboard. Please try selecting and copying manually."
        );
      }
    }
  };

  // OCR utility functions
  const formatOCRText = (text: string, confidence: number): string => {
    // Add confidence indicator to text
    const confidenceEmoji =
      confidence >= 0.9 ? "🟢" : confidence >= 0.7 ? "🟡" : "🔴";
    return `${confidenceEmoji} ${text}`;
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return "text-green-500";
    if (confidence >= 0.7) return "text-yellow-500";
    return "text-red-500";
  };

  const exportOCRHistory = () => {
    if (ocrHistory.length === 0) return;

    const csvContent = [
      "Timestamp,Text,Confidence,Language",
      ...ocrHistory.map(
        (entry) =>
          `${entry.timestamp.toISOString()},"${entry.text.replace(
            /"/g,
            '""'
          )}",${entry.confidence},${entry.language}`
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ocr-history-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success("OCR history exported successfully!");
  };

  const clearOCRHistory = () => {
    setOcrHistory([]);
    toast.success("OCR history cleared!");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hero Section */}
      <Card className="bg-gradient-to-br from-background/80 to-background/40 border border-border backdrop-blur-sm shadow-xl">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="p-4 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-2xl shadow-lg">
              <Eye className="w-10 h-10 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent">
                Advanced OCR Intelligence Hub
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Professional-grade text extraction with AI-powered analysis
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tab Navigation */}
      <Card className="bg-gradient-to-br from-background/80 to-background/40 border border-border backdrop-blur-sm shadow-xl">
        <CardContent className="p-0">
          <div className="flex border-b border-border">
            <button
              onClick={() => handleTabChange("visual")}
              className={`flex-1 flex items-center justify-center p-8 font-medium transition-all duration-300 group ${
                activeTab === "visual"
                  ? "border-b-4 border-blue-500 text-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-indigo-50/50 dark:hover:from-blue-950/10 dark:hover:to-indigo-950/10"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-xl transition-all duration-300 ${
                    activeTab === "visual"
                      ? "bg-blue-500/20 border border-blue-500/30"
                      : "bg-muted/30 group-hover:bg-blue-500/10"
                  }`}
                >
                  <Eye
                    className={`w-6 h-6 ${
                      activeTab === "visual"
                        ? "text-blue-500"
                        : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div className="text-left">
                  <div className="font-bold text-lg">
                    Visual Text Recognition
                  </div>
                  <div className="text-sm opacity-75">
                    Extract text from images and screenshots
                  </div>
                </div>
              </div>
            </button>
            <button
              onClick={() => handleTabChange("pdf")}
              className={`flex-1 flex items-center justify-center p-8 font-medium transition-all duration-300 group ${
                activeTab === "pdf"
                  ? "border-b-4 border-emerald-500 text-emerald-600 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-gradient-to-br hover:from-emerald-50/50 hover:to-teal-50/50 dark:hover:from-emerald-950/10 dark:hover:to-teal-950/10"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-xl transition-all duration-300 ${
                    activeTab === "pdf"
                      ? "bg-emerald-500/20 border border-emerald-500/30"
                      : "bg-muted/30 group-hover:bg-emerald-500/10"
                  }`}
                >
                  <BookOpen
                    className={`w-6 h-6 ${
                      activeTab === "pdf"
                        ? "text-emerald-500"
                        : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div className="text-left">
                  <div className="font-bold text-lg">
                    PDF Document Processing
                  </div>
                  <div className="text-sm opacity-75">
                    Analyze and summarize PDF documents
                  </div>
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
          <Card className="bg-gradient-to-br from-background/80 to-background/40 border border-border backdrop-blur-sm shadow-xl">
            <CardHeader className="text-center pb-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full shadow-lg">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Visual OCR Capabilities
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Advanced text extraction with 6 powerful methods
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) =>
                  e.target.files?.[0] && handleImageUpload(e.target.files[0])
                }
                className="hidden"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Upload Image - Functional Card */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={processingImage}
                  className="group relative p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl border border-blue-500/30 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <div className="absolute top-4 right-4 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground mb-3 text-center">
                    Image Upload
                  </h3>
                  <p className="text-sm text-muted-foreground text-center leading-relaxed">
                    Upload images from your device with intelligent format
                    detection and processing
                  </p>
                  <div className="mt-4 flex justify-center">
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                  </div>
                </button>

                {/* Paste & Edit - Functional Card */}
                <button
                  onClick={handlePasteImage}
                  disabled={processingImage || pastingImage}
                  className="group relative p-6 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 rounded-xl border border-cyan-500/30 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <div className="absolute top-4 right-4 w-3 h-3 bg-cyan-500 rounded-full animate-pulse"></div>
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    {pastingImage ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    ) : (
                      <Clipboard className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-foreground mb-3 text-center">
                    Paste & Edit
                  </h3>
                  <p className="text-sm text-muted-foreground text-center leading-relaxed">
                    Paste images from clipboard and enhance with advanced
                    editing tools
                  </p>
                  <div className="mt-2 text-xs text-cyan-600 dark:text-cyan-400 text-center">
                    Press{" "}
                    {navigator.platform.includes("Mac") ? "⌘+V" : "Ctrl+V"} to
                    paste
                  </div>
                  <div className="mt-4 flex justify-center">
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                  </div>
                </button>

                {/* Photo Capture - Functional Card */}
                <button
                  onClick={startCamera}
                  disabled={
                    processingImage || !cameraAvailable || cameraLoading
                  }
                  className={`group relative p-6 rounded-xl border transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left ${
                    cameraLoading
                      ? "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-500/30"
                      : cameraAvailable
                      ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-500/30 hover:border-green-500/50"
                      : "bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20 border-gray-500/30"
                  }`}
                >
                  <div
                    className={`absolute top-4 right-4 w-3 h-3 rounded-full ${
                      cameraLoading
                        ? "bg-blue-500 animate-pulse"
                        : cameraAvailable
                        ? "bg-green-500 animate-pulse"
                        : "bg-gray-400"
                    }`}
                  ></div>
                  <div
                    className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300 ${
                      cameraLoading
                        ? "bg-gradient-to-r from-blue-500 to-indigo-500"
                        : cameraAvailable
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 group-hover:scale-110"
                        : "bg-gradient-to-r from-gray-400 to-slate-400"
                    }`}
                  >
                    {cameraLoading ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Camera className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-foreground mb-3 text-center">
                    {cameraLoading ? "Checking Camera..." : "Photo Capture"}
                  </h3>
                  <p className="text-sm text-muted-foreground text-center leading-relaxed">
                    {cameraLoading
                      ? "Detecting available camera devices..."
                      : cameraAvailable
                      ? "Take high-quality photos with your camera for precise OCR processing"
                      : "Camera not available. Please ensure your camera is connected and permissions are granted."}
                  </p>
                  <div className="mt-4 flex justify-center">
                    <div className="flex gap-1">
                      <div
                        className={`w-2 h-2 rounded-full animate-bounce ${
                          cameraLoading
                            ? "bg-blue-500"
                            : cameraAvailable
                            ? "bg-green-500"
                            : "bg-gray-400"
                        }`}
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className={`w-2 h-2 rounded-full animate-bounce ${
                          cameraLoading
                            ? "bg-blue-500"
                            : cameraAvailable
                            ? "bg-green-500"
                            : "bg-gray-400"
                        }`}
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className={`w-2 h-2 rounded-full animate-bounce ${
                          cameraLoading
                            ? "bg-blue-500"
                            : cameraAvailable
                            ? "bg-green-500"
                            : "bg-gray-400"
                        }`}
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                  </div>
                </button>

                {/* Live OCR Stream - Functional Card */}
                <button
                  onClick={startRealtimeOCRCamera}
                  disabled={processingImage}
                  className="group relative p-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-xl border border-emerald-500/30 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <div className="absolute top-4 right-4 w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground mb-3 text-center">
                    Live OCR Stream
                  </h3>
                  <p className="text-sm text-muted-foreground text-center leading-relaxed">
                    Real-time text detection and extraction from live camera
                    feed with AI-powered analysis
                  </p>

                  {/* Enhanced Features List */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                      <span>Confidence scoring & language detection</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                      <span>Adjustable capture intervals</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                      <span>OCR history & statistics</span>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-center">
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                  </div>
                </button>

                {/* Screen Capture - Functional Card */}
                <button
                  onClick={takeScreenshot}
                  disabled={processingImage}
                  className="group relative p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl border border-purple-500/30 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <div className="absolute top-4 right-4 w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Monitor className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground mb-3 text-center">
                    Screen Capture
                  </h3>
                  <p className="text-sm text-muted-foreground text-center leading-relaxed">
                    Capture your entire screen and extract all visible text
                    content
                  </p>
                  <div className="mt-4 flex justify-center">
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                  </div>
                </button>

                {/* Smart Snip Tool - Functional Card */}
                <button
                  onClick={startSnipping}
                  disabled={processingImage}
                  className="group relative p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 rounded-xl border border-orange-500/30 hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <div className="absolute top-4 right-4 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Scissors className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground mb-3 text-center">
                    Smart Snip Tool
                  </h3>
                  <p className="text-sm text-muted-foreground text-center leading-relaxed">
                    Crop specific regions from your screen for targeted OCR
                    analysis
                  </p>
                  <div className="mt-4 flex justify-center">
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                  </div>
                </button>
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
                toast("Screenshot cancelled. You can try again anytime.", {
                  duration: 3000,
                  position: "top-center",
                });
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
                    toast("Screenshot cancelled. You can try again anytime.", {
                      duration: 3000,
                      position: "top-center",
                    });
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

      {/* Simple Camera Modal */}
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

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-green-500/20">
                  <Camera className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  Photo Capture
                </h3>
              </div>

              {/* Camera Settings Toggle */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={cameraSettings.mirrorPreview}
                    onChange={(e) =>
                      setCameraSettings((prev) => ({
                        ...prev,
                        mirrorPreview: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded border-border"
                  />
                  Mirror Preview
                </label>
              </div>
            </div>

            <video
              ref={cameraVideoRef}
              className="w-full h-64 rounded-xl border border-border/50 mb-6 shadow-lg object-cover"
              autoPlay
              playsInline
              muted
              style={{
                transform: cameraSettings.mirrorPreview ? "scaleX(-1)" : "none",
              }}
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
                    if (
                      cameraSettings.correctCapture &&
                      cameraSettings.mirrorPreview
                    ) {
                      // Correct the mirroring for the captured image
                      context.save();
                      context.scale(-1, 1); // Flip horizontally to correct mirroring
                      context.drawImage(
                        video,
                        -video.videoWidth,
                        0,
                        video.videoWidth,
                        video.videoHeight
                      );
                      context.restore();
                    } else {
                      // Draw normally without correction
                      context.drawImage(video, 0, 0);
                    }

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
                      0.9
                    );
                  }
                }
                if (cameraStream) {
                  cameraStream.getTracks().forEach((track) => track.stop());
                  setCameraStream(null);
                }
                setCameraModalOpen(false);
              }}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 shadow-lg"
            >
              <Camera className="w-5 h-5" />
              Capture High-Quality Photo
            </Button>
          </div>
        </div>
      )}

      {/* Rich Image Editor Modal */}
      {imageEditorOpen && originalImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-card/95 border border-border/50 rounded-2xl shadow-2xl relative w-full max-w-7xl mx-4 h-[90vh] flex flex-col">
            <button
              onClick={() => {
                setImageEditorOpen(false);
                resetEditor();
              }}
              className="absolute top-4 right-4 text-foreground hover:text-red-500 transition-colors duration-300 p-2 rounded-full hover:bg-red-500/10 z-10"
              aria-label="Close image editor"
            >
              ×
            </button>

            {/* Editor Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-cyan-500/20">
                  <Edit3 className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  Advanced Image Editor
                </h3>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={undoEdit}
                  disabled={historyIndex <= 0}
                  variant="outline"
                  size="sm"
                >
                  <Undo className="w-4 h-4" />
                </Button>
                <Button
                  onClick={redoEdit}
                  disabled={historyIndex >= editorHistory.length - 1}
                  variant="outline"
                  size="sm"
                >
                  <Redo className="w-4 h-4" />
                </Button>
                <Button
                  onClick={downloadEditedImage}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button onClick={resetEditor} variant="outline" size="sm">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Editor Tools Panel */}
              <div className="w-80 bg-muted/30 border-r border-border/50 p-4 overflow-y-auto">
                <div className="space-y-6">
                  {/* Tool Selection */}
                  <div>
                    <h4 className="font-semibold mb-3 text-foreground">
                      Tools
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => setEditorTool("move")}
                        variant={editorTool === "move" ? "default" : "outline"}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Move className="w-4 h-4" />
                        Move
                      </Button>
                      <Button
                        onClick={() => setEditorTool("crop")}
                        variant={editorTool === "crop" ? "default" : "outline"}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Square className="w-4 h-4" />
                        Crop
                      </Button>
                    </div>
                  </div>

                  {/* Brightness & Contrast */}
                  <div>
                    <h4 className="font-semibold mb-3 text-foreground flex items-center gap-2">
                      <Sun className="w-4 h-4" />
                      Adjustments
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-muted-foreground">
                          Brightness: {editorSettings.brightness}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={editorSettings.brightness}
                          onChange={(e) =>
                            setEditorSettings((prev) => ({
                              ...prev,
                              brightness: parseInt(e.target.value),
                            }))
                          }
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">
                          Contrast: {editorSettings.contrast}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={editorSettings.contrast}
                          onChange={(e) =>
                            setEditorSettings((prev) => ({
                              ...prev,
                              contrast: parseInt(e.target.value),
                            }))
                          }
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rotation & Transform */}
                  <div>
                    <h4 className="font-semibold mb-3 text-foreground flex items-center gap-2">
                      <RotateCw className="w-4 h-4" />
                      Transform
                    </h4>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Button
                          onClick={() =>
                            setEditorSettings((prev) => ({
                              ...prev,
                              rotation: prev.rotation + 90,
                            }))
                          }
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <RotateCw className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() =>
                            setEditorSettings((prev) => ({
                              ...prev,
                              flipHorizontal: !prev.flipHorizontal,
                            }))
                          }
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          Flip H
                        </Button>
                        <Button
                          onClick={() =>
                            setEditorSettings((prev) => ({
                              ...prev,
                              flipVertical: !prev.flipVertical,
                            }))
                          }
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          Flip V
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Filters */}
                  <div>
                    <h4 className="font-semibold mb-3 text-foreground flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Filters
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {["none", "grayscale", "sepia", "blur", "vintage"].map(
                        (filter) => (
                          <Button
                            key={filter}
                            onClick={() =>
                              setEditorSettings((prev) => ({ ...prev, filter }))
                            }
                            variant={
                              editorSettings.filter === filter
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            className="capitalize"
                          >
                            {filter}
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Image Preview Area */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1 relative bg-background/50 rounded-lg m-4 overflow-hidden">
                  {editedImage && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <NextImage
                        src={editedImage}
                        alt="Edited image preview"
                        className="max-w-full max-h-full object-contain"
                        width={800}
                        height={600}
                        style={{ objectFit: "contain" }}
                      />
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="p-4 border-t border-border/50 flex gap-3 justify-end">
                  <Button
                    onClick={() => {
                      setImageEditorOpen(false);
                      resetEditor();
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={processEditedImage}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold px-6"
                  >
                    Extract Text from Edited Image
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time OCR Modal */}
      {realtimeOCROpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-card/95 border border-border/50 rounded-2xl shadow-2xl relative w-full max-w-7xl mx-4 h-[90vh] flex flex-col">
            <button
              onClick={() => {
                if (realtimeOCRStream) {
                  realtimeOCRStream
                    .getTracks()
                    .forEach((track) => track.stop());
                  setRealtimeOCRStream(null);
                }
                stopRealtimeOCR();
                setRealtimeOCROpen(false);
                // Reset OCR stats
                setOcrStats({
                  totalCaptures: 0,
                  successfulCaptures: 0,
                  averageConfidence: 0,
                  startTime: null,
                });
                setOcrHistory([]);
                setCurrentConfidence(0);
                setDetectedLanguage("");
              }}
              className="absolute top-4 right-4 text-foreground hover:text-red-500 transition-colors duration-300 p-2 rounded-full hover:bg-red-500/10 z-10"
              aria-label="Close real-time OCR modal"
            >
              ×
            </button>

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-emerald-500/20">
                  <Eye className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-foreground">
                    Live OCR Stream
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Real-time text detection from camera feed with AI-powered
                    analysis
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={realtimeOCR ? stopRealtimeOCR : startRealtimeOCR}
                  variant={realtimeOCR ? "outline" : "default"}
                  className={`${
                    realtimeOCR
                      ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                      : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg"
                  } font-semibold transition-all duration-300`}
                >
                  {realtimeOCR ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Stop OCR
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start OCR
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Video Section */}
              <div className="flex-1 p-6 flex flex-col">
                <div className="relative flex-1 bg-background/30 rounded-xl overflow-hidden border border-border/50">
                  <video
                    ref={realtimeOCRVideoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                    style={{
                      transform: cameraSettings.mirrorPreview
                        ? "scaleX(-1)"
                        : "none",
                    }}
                  />

                  {/* OCR Status Overlay */}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        realtimeOCR
                          ? "bg-green-500 animate-pulse"
                          : "bg-blue-500"
                      }`}
                    ></div>
                    <span
                      className={`text-sm font-medium px-3 py-1 rounded-full backdrop-blur-md ${
                        realtimeOCR
                          ? "bg-green-500/20 text-green-300 border border-green-500/30"
                          : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      }`}
                    >
                      {realtimeOCR ? "OCR Active" : "Camera Ready"}
                    </span>
                  </div>

                  {/* Manual Capture Button */}
                  {ocrSettings.captureMode === "manual" && (
                    <div className="absolute top-4 right-4">
                      <Button
                        onClick={() => {
                          if (realtimeOCRVideoRef.current) {
                            // Trigger manual capture
                            const video = realtimeOCRVideoRef.current;
                            const canvas = document.createElement("canvas");
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            const ctx = canvas.getContext("2d");

                            if (ctx) {
                              ctx.drawImage(video, 0, 0);
                              canvas.toBlob(
                                async (blob) => {
                                  if (blob) {
                                    const file = new File(
                                      [blob],
                                      "manual-capture.jpg",
                                      {
                                        type: "image/jpeg",
                                      }
                                    );

                                    // Process the manual capture
                                    try {
                                      const formData = new FormData();
                                      formData.append("image", file);

                                      const response = await fetch("/api/ocr", {
                                        method: "POST",
                                        body: formData,
                                      });

                                      if (response.ok) {
                                        const data = await response.json();
                                        if (data.success && data.text) {
                                          const confidence =
                                            data.confidence || 0.8;
                                          const language =
                                            data.language || "en";

                                          setCurrentConfidence(confidence);
                                          setDetectedLanguage(language);

                                          const newOcrEntry = {
                                            id: Date.now().toString(),
                                            text: data.text,
                                            timestamp: new Date(),
                                            confidence,
                                            language,
                                          };

                                          setOcrHistory((prev) => [
                                            newOcrEntry,
                                            ...prev.slice(0, 9),
                                          ]);

                                          if (
                                            confidence >=
                                            ocrSettings.confidenceThreshold
                                          ) {
                                            setRealtimeText(data.text);
                                          }

                                          toast.success(
                                            "Manual capture processed!"
                                          );
                                        }
                                      }
                                    } catch (error) {
                                      console.error(
                                        "Manual capture failed:",
                                        error
                                      );
                                      toast.error("Manual capture failed");
                                    }
                                  }
                                },
                                "image/jpeg",
                                0.9
                              );
                            }
                          }
                        }}
                        variant="default"
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg"
                      >
                        <Camera className="w-4 h-4 mr-1" />
                        Capture
                      </Button>
                    </div>
                  )}

                  {/* Processing Indicator */}
                  {isProcessingFrame && (
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                      <span className="text-sm font-medium px-3 py-1 rounded-full backdrop-blur-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Processing...
                      </span>
                    </div>
                  )}

                  {/* Confidence Indicator */}
                  {currentConfidence > 0 && (
                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md rounded-lg p-3 border border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        <span className="text-xs text-white font-medium">
                          Confidence
                        </span>
                      </div>
                      <div className="w-32 bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${currentConfidence * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-white mt-1 text-center">
                        {Math.round(currentConfidence * 100)}%
                      </div>
                    </div>
                  )}

                  {/* Language Indicator */}
                  {detectedLanguage && (
                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md rounded-lg p-2 border border-border/50">
                      <div className="text-xs text-white font-medium">
                        {detectedLanguage.toUpperCase()}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Camera is ready! Point at text and click &quot;Start
                    OCR&quot; to begin detection
                  </p>

                  {/* Camera Controls */}
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={cameraSettings.mirrorPreview}
                          onChange={(e) =>
                            setCameraSettings((prev) => ({
                              ...prev,
                              mirrorPreview: e.target.checked,
                            }))
                          }
                          className="w-3 h-3 rounded border-border"
                        />
                        Mirror Preview
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={cameraSettings.correctCapture}
                          onChange={(e) =>
                            setCameraSettings((prev) => ({
                              ...prev,
                              correctCapture: e.target.checked,
                            }))
                          }
                          className="w-3 h-3 rounded border-border"
                        />
                        Correct Capture
                      </label>
                    </div>
                  </div>

                  {/* OCR Mode Info */}
                  <div className="mt-3 p-2 bg-muted/30 rounded-lg border border-border/30">
                    <div className="text-xs text-muted-foreground">
                      <strong>Current Mode:</strong>{" "}
                      {ocrSettings.captureMode === "continuous"
                        ? "🔄 Continuous"
                        : ocrSettings.captureMode === "manual"
                        ? "👆 Manual"
                        : "📹 Motion"}
                      {ocrSettings.captureMode === "continuous" && (
                        <span>
                          {" "}
                          - Capturing every {ocrSettings.captureInterval / 1000}
                          s
                        </span>
                      )}
                      {ocrSettings.captureMode === "manual" && (
                        <span> - Click the Capture button to process text</span>
                      )}
                      {ocrSettings.captureMode === "motion" && (
                        <span> - Detecting motion for automatic capture</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Results Section */}
              <div className="w-96 bg-muted/20 border-l border-border/50 flex flex-col">
                {/* OCR Settings Panel */}
                <div className="p-4 border-b border-border/50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-full bg-purple-500/20">
                      <Edit3 className="w-4 h-4 text-purple-400" />
                    </div>
                    <h4 className="font-semibold text-foreground">
                      OCR Settings
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {/* Capture Mode Selection */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block">
                        Capture Mode
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {["continuous", "manual", "motion"].map((mode) => (
                          <Button
                            key={mode}
                            onClick={() =>
                              setOcrSettings((prev) => ({
                                ...prev,
                                captureMode: mode as
                                  | "continuous"
                                  | "manual"
                                  | "motion",
                              }))
                            }
                            variant={
                              ocrSettings.captureMode === mode
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            className="text-xs h-8"
                          >
                            {mode === "continuous"
                              ? "🔄"
                              : mode === "manual"
                              ? "👆"
                              : "📹"}
                            <span className="ml-1 capitalize">{mode}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">
                        Capture Interval: {ocrSettings.captureInterval}ms
                      </label>
                      <input
                        type="range"
                        min="1000"
                        max="5000"
                        step="500"
                        value={ocrSettings.captureInterval}
                        onChange={(e) =>
                          setOcrSettings((prev) => ({
                            ...prev,
                            captureInterval: parseInt(e.target.value),
                          }))
                        }
                        className="w-full"
                        disabled={ocrSettings.captureMode === "manual"}
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        {ocrSettings.captureMode === "manual"
                          ? "Manual capture mode"
                          : ocrSettings.captureMode === "motion"
                          ? "Motion-triggered capture"
                          : "Continuous capture every " +
                            ocrSettings.captureInterval / 1000 +
                            "s"}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">
                        Confidence Threshold:{" "}
                        {Math.round(ocrSettings.confidenceThreshold * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={ocrSettings.confidenceThreshold}
                        onChange={(e) =>
                          setOcrSettings((prev) => ({
                            ...prev,
                            confidenceThreshold: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        Only show text with confidence above{" "}
                        {Math.round(ocrSettings.confidenceThreshold * 100)}%
                      </div>
                    </div>

                    {/* Additional Settings */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={ocrSettings.enableLanguageDetection}
                          onChange={(e) =>
                            setOcrSettings((prev) => ({
                              ...prev,
                              enableLanguageDetection: e.target.checked,
                            }))
                          }
                          className="w-3 h-3 rounded border-border"
                        />
                        Enable language detection
                      </label>

                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={ocrSettings.enableTextHighlighting}
                          onChange={(e) =>
                            setOcrSettings((prev) => ({
                              ...prev,
                              enableTextHighlighting: e.target.checked,
                            }))
                          }
                          className="w-3 h-3 rounded border-border"
                        />
                        Enable text highlighting
                      </label>
                    </div>
                  </div>
                </div>

                {/* OCR Stats */}
                {ocrStats.startTime && (
                  <div className="p-4 border-b border-border/50 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-full bg-blue-500/20">
                        <FileText className="w-4 h-4 text-blue-400" />
                      </div>
                      <h4 className="font-semibold text-foreground">
                        OCR Statistics
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-background/50 rounded p-2 text-center">
                        <div className="font-bold text-blue-500">
                          {ocrStats.totalCaptures}
                        </div>
                        <div className="text-muted-foreground">Total</div>
                      </div>
                      <div className="bg-background/50 rounded p-2 text-center">
                        <div className="font-bold text-green-500">
                          {ocrStats.successfulCaptures}
                        </div>
                        <div className="text-muted-foreground">Success</div>
                      </div>
                      <div className="bg-background/50 rounded p-2 text-center">
                        <div className="font-bold text-purple-500">
                          {Math.round(ocrStats.averageConfidence * 100)}%
                        </div>
                        <div className="text-muted-foreground">
                          Avg Confidence
                        </div>
                      </div>
                      <div className="bg-background/50 rounded p-2 text-center">
                        <div className="font-bold text-orange-500">
                          {Math.round(
                            (Date.now() - ocrStats.startTime.getTime()) / 1000
                          )}
                          s
                        </div>
                        <div className="text-muted-foreground">Runtime</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detected Text */}
                <div className="p-4 border-b border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-full bg-blue-500/20">
                      <FileText className="w-4 h-4 text-blue-400" />
                    </div>
                    <h4 className="font-semibold text-foreground">
                      Detected Text
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Text will appear here as it&apos;s detected from the camera
                  </p>
                </div>

                <div className="flex-1 p-4 overflow-y-auto">
                  {realtimeText ? (
                    <div className="space-y-4">
                      <div className="bg-background/50 rounded-lg p-4 border border-border/50">
                        <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                          {realtimeText}
                        </pre>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => copyToClipboard(realtimeText)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Copy className="w-3 h-3 mr-2" />
                          Copy Text
                        </Button>
                        <Button
                          onClick={() => setRealtimeText("")}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <RotateCcw className="w-3 h-3 mr-2" />
                          Clear
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 bg-muted/50 rounded-full flex items-center justify-center">
                        <Eye className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {realtimeOCR ? (
                          <div className="space-y-2">
                            <div className="animate-pulse">
                              Scanning for text...
                            </div>
                            <div className="text-xs">
                              Point camera at readable text
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div>Ready to detect text</div>
                            <div className="text-xs">
                              Click &quot;Start OCR&quot; to begin
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* OCR History */}
                  {ocrHistory.length > 0 && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-full bg-green-500/20">
                            <RotateCcw className="w-4 h-4 text-green-400" />
                          </div>
                          <h5 className="font-semibold text-foreground text-sm">
                            Recent Detections ({ocrHistory.length})
                          </h5>
                        </div>

                        <div className="flex gap-1">
                          <Button
                            onClick={exportOCRHistory}
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={clearOCRHistory}
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs text-red-500 hover:text-red-600"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {ocrHistory.map((entry) => (
                          <div
                            key={entry.id}
                            className="bg-background/30 rounded p-2 border border-border/30 hover:bg-background/50 transition-colors cursor-pointer"
                            onClick={() => setRealtimeText(entry.text)}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted-foreground">
                                {entry.timestamp.toLocaleTimeString()}
                              </span>
                              <span
                                className={`text-xs font-medium ${getConfidenceColor(
                                  entry.confidence
                                )}`}
                              >
                                {Math.round(entry.confidence * 100)}%
                              </span>
                            </div>
                            <div className="text-xs text-foreground line-clamp-2">
                              {formatOCRText(entry.text, entry.confidence)}
                            </div>
                            <div className="text-xs text-blue-500 mt-1">
                              {entry.language.toUpperCase()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
