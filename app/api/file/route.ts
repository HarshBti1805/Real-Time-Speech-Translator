import { NextRequest, NextResponse } from "next/server";
import { speechClient } from "@/lib/googleClient";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Define the allowed encoding types from Google Speech API
type AudioEncoding =
  | "MP3"
  | "WEBM_OPUS"
  | "OGG_OPUS"
  | "ENCODING_UNSPECIFIED"
  | "LINEAR16"
  | "FLAC"
  | "MULAW"
  | "AMR"
  | "AMR_WB"
  | "SPEEX_WITH_HEADER_BYTE";

const fileEncodingMap: Record<string, AudioEncoding | undefined> = {
  mp3: "MP3",
  webm: "WEBM_OPUS",
  ogg: "OGG_OPUS",
  wav: undefined, // Let Google auto-detect
};

const sampleRateMap: Record<string, number | undefined> = {
  mp3: 16000,
  webm: 48000,
  ogg: 48000,
  wav: undefined,
};

// Define proper types for the Google Speech-to-Text configuration
interface SpeechConfig {
  languageCode: string;
  alternativeLanguageCodes?: string[];
  enableAutomaticPunctuation?: boolean;
  encoding?: AudioEncoding;
  sampleRateHertz?: number;
}

// Define the expected response structure from Google Speech API
interface SpeechRecognitionResult {
  alternatives?: Array<{
    transcript?: string;
    confidence?: number;
  }>;
}

interface SpeechRecognitionResponse {
  results?: SpeechRecognitionResult[];
}

// 🔁 Convert WAV to Mono using external Node server
async function convertWavToMono(buffer: Buffer): Promise<Buffer> {
  const res = await fetch("https://ffmpeg-server-ervj.onrender.com/convert", {
    method: "POST",
    headers: {
      "Content-Type": "audio/wav",
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    throw new Error(`WAV conversion failed: ${res.statusText}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

// 🔁 Convert OGG (possibly Vorbis) to Opus using external Node server
async function convertOggToOpus(buffer: Buffer): Promise<Buffer> {
  const res = await fetch(
    "https://ffmpeg-server-ervj.onrender.com/convert-to-opus",
    {
      method: "POST",
      headers: {
        "Content-Type": "audio/ogg",
      },
      body: new Uint8Array(buffer),
    }
  );

  if (!res.ok) {
    throw new Error(`OGG conversion failed: ${res.statusText}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("audio") as File;
  const fileTypeRaw = formData.get("fileType");

  if (!file) {
    return NextResponse.json(
      { error: "No audio file uploaded" },
      { status: 400 }
    );
  }

  if (!fileTypeRaw || typeof fileTypeRaw !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid fileType" },
      { status: 400 }
    );
  }

  const fileType = fileTypeRaw.toLowerCase();
  const encoding = fileEncodingMap[fileType];
  const sampleRate = sampleRateMap[fileType];

  if (encoding === undefined && fileType !== "wav") {
    return NextResponse.json(
      { error: `Unsupported file type: ${fileType}` },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  let buffer = Buffer.from(arrayBuffer);

  try {
    if (fileType === "wav") {
      const convertedBuffer = await convertWavToMono(buffer);
      buffer = Buffer.from(convertedBuffer);
    } else if (fileType === "ogg") {
      const convertedBuffer = await convertOggToOpus(buffer);
      buffer = Buffer.from(convertedBuffer);
    }
  } catch (err) {
    console.error("Conversion error:", err);
    return NextResponse.json(
      { error: "Audio conversion failed" },
      { status: 500 }
    );
  }

  const audioBytes = buffer.toString("base64");

  // Use proper typing instead of 'any'
  const config: SpeechConfig = {
    languageCode: "en-US",
    alternativeLanguageCodes: ["hi-IN", "es-ES", "fr-FR"],
    enableAutomaticPunctuation: true,
  };

  if (encoding) config.encoding = encoding;
  if (sampleRate) config.sampleRateHertz = sampleRate;

  try {
    const response = await speechClient.recognize({
      audio: { content: audioBytes },
      config: config as unknown as Record<string, unknown>,
    });

    const speechResponse = response as [SpeechRecognitionResponse];

    const transcription = speechResponse[0].results
      ?.map((r) => r.alternatives?.[0]?.transcript)
      .join("\n");

    return NextResponse.json({ transcription });
  } catch (err) {
    console.error("Speech API error:", err);
    return NextResponse.json(
      { error: "Failed to process audio" },
      { status: 500 }
    );
  }
}
