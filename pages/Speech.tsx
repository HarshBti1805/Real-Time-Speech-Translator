"use client";
import VoiceRecording from "@/components/VoiceRecording";
import FileUpload from "@/components/FileUpload";

export default function Speech() {
  return (
    <div>
      <FileUpload />
      <VoiceRecording />
    </div>
  );
}
