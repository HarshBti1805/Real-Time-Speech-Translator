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
  console.log("[API/file] POST called");
  const formData = await req.formData();
  const file = formData.get("audio") as File;
  const fileTypeRaw = formData.get("fileType");
  console.log("[API/file] Received file:", file);
  console.log("[API/file] Received fileTypeRaw:", fileTypeRaw);

  if (!file) {
    console.error("[API/file] No audio file uploaded");
    return NextResponse.json(
      { error: "No audio file uploaded" },
      { status: 400 }
    );
  }

  if (!fileTypeRaw || typeof fileTypeRaw !== "string") {
    console.error("[API/file] Missing or invalid fileType");
    return NextResponse.json(
      { error: "Missing or invalid fileType" },
      { status: 400 }
    );
  }

  const fileType = fileTypeRaw.toLowerCase();
  const encoding = fileEncodingMap[fileType];
  const sampleRate = sampleRateMap[fileType];
  console.log(
    "[API/file] fileType:",
    fileType,
    "encoding:",
    encoding,
    "sampleRate:",
    sampleRate
  );

  if (encoding === undefined && fileType !== "wav") {
    console.error("[API/file] Unsupported file type:", fileType);
    return NextResponse.json(
      { error: `Unsupported file type: ${fileType}` },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  let buffer = Buffer.from(arrayBuffer);
  console.log("[API/file] Buffer length:", buffer.length);

  try {
    if (fileType === "wav") {
      console.log("[API/file] Converting WAV to mono");
      const convertedBuffer = await convertWavToMono(buffer);
      buffer = Buffer.from(convertedBuffer);
      console.log(
        "[API/file] WAV conversion complete, new buffer length:",
        buffer.length
      );
    } else if (fileType === "ogg") {
      console.log("[API/file] Converting OGG to Opus");
      const convertedBuffer = await convertOggToOpus(buffer);
      buffer = Buffer.from(convertedBuffer);
      console.log(
        "[API/file] OGG conversion complete, new buffer length:",
        buffer.length
      );
    }
  } catch (err) {
    console.error("[API/file] Conversion error:", err);
    return NextResponse.json(
      { error: "Audio conversion failed" },
      { status: 500 }
    );
  }

  const audioBytes = buffer.toString("base64");
  console.log("[API/file] audioBytes length:", audioBytes.length);

  const config: SpeechConfig = {
    languageCode: "en-US",
    alternativeLanguageCodes: ["hi-IN", "es-ES", "fr-FR"],
    enableAutomaticPunctuation: true,
  };

  if (encoding) config.encoding = encoding;
  if (sampleRate) config.sampleRateHertz = sampleRate;
  console.log("[API/file] Speech config:", config);

  try {
    const response = await speechClient.recognize({
      audio: { content: audioBytes },
      config: config as unknown as Record<string, unknown>,
    });
    console.log("[API/file] Google Speech API response:", response);

    const speechResponse = response as [SpeechRecognitionResponse];

    const transcription = speechResponse[0].results
      ?.map((r) => r.alternatives?.[0]?.transcript)
      .join("\n");
    console.log("[API/file] Final transcription:", transcription);

    return NextResponse.json({ transcription });
  } catch (err) {
    console.error("[API/file] Speech API error:", err);
    return NextResponse.json(
      { error: "Failed to process audio" },
      { status: 500 }
    );
  }
}
