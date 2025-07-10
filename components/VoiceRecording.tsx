"use client";
import { useState, useRef } from "react";
import {
  Camera,
  Upload,
  Mic,
  Square,
  Play,
  Image,
  Monitor,
} from "lucide-react";

export default function VoiceRecording() {
  // Voice recording state
  const [transcription, setTranscription] = useState("");
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // Image/text recognition state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
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
      const res = await fetch("http://localhost:3000/api/speech", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log(data);
      setTranscription(data.transcription || "Failed to recognize speech.");
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
      const res = await fetch("http://localhost:3000/api/ocr", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log(data);
      setExtractedText(data.text || "No text found in image.");
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
      setSelectedImage(file);
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
              setSelectedImage(file);
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
        video: { mediaSource: "screen" },
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
              setSelectedImage(file);
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
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Voice & Visual Recognition System
        </h1>
        <p className="text-gray-600">
          Record audio, upload images, capture photos, or take screenshots for
          text recognition
        </p>
      </div>

      {/* Voice Recording Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Voice Recording
        </h2>

        <button
          onClick={handleRecord}
          disabled={processingAudio}
          className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            recording
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-green-600 hover:bg-green-700 text-white"
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
        </button>

        {processingAudio && (
          <div className="mt-4 text-blue-600">Processing audio...</div>
        )}
      </div>

      {/* Image Recognition Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Image className="w-5 h-5" />
          Image Text Recognition
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={processingImage}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Image
          </button>

          <button
            onClick={cameraActive ? stopCamera : startCamera}
            disabled={processingImage}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              cameraActive
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-purple-600 hover:bg-purple-700 text-white"
            }`}
          >
            <Camera className="w-4 h-4" />
            {cameraActive ? "Stop Camera" : "Start Camera"}
          </button>

          {cameraActive && (
            <button
              onClick={capturePhoto}
              disabled={processingImage}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Camera className="w-4 h-4" />
              Capture Photo
            </button>
          )}

          <button
            onClick={captureScreenshot}
            disabled={processingImage}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Monitor className="w-4 h-4" />
            Screen Capture
          </button>
        </div>

        {/* Camera Preview */}
        {cameraActive && (
          <div className="mb-4">
            <video
              ref={videoRef}
              className="w-full max-w-md mx-auto rounded-lg"
              autoPlay
              playsInline
              muted
            />
          </div>
        )}

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />

        {processingImage && (
          <div className="mt-4 text-blue-600">Processing image...</div>
        )}

        {/* Image Preview */}
        {imagePreview && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Selected Image:</h3>
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-full max-h-64 rounded-lg border"
            />
          </div>
        )}
      </div>

      {/* Results Section */}
      {(transcription || extractedText) && (
        <div className="bg-gray-50 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Results</h2>
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Clear Results
            </button>
          </div>

          {transcription && (
            <div className="mb-4">
              <h3 className="font-semibold text-green-700 mb-2">
                Voice Transcription:
              </h3>
              <div className="bg-white p-4 rounded-lg border">
                <p className="text-gray-800">{transcription}</p>
              </div>
            </div>
          )}

          {extractedText && (
            <div>
              <h3 className="font-semibold text-blue-700 mb-2">
                Extracted Text from Image:
              </h3>
              <div className="bg-white p-4 rounded-lg border">
                <p className="text-gray-800 whitespace-pre-wrap">
                  {extractedText}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
