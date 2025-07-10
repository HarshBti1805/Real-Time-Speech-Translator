import { NextRequest, NextResponse } from "next/server";
import { speechClient } from "@/lib/googleClient";

export const config = {
  api: {
    bodyParser: false,
  },
};

const fileEncodingMap: Record<string, string | undefined> = {
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

// 🔁 Convert WAV to Mono using external Node server
async function convertWavToMono(buffer: Buffer): Promise<Buffer> {
  const res = await fetch("http://localhost:5000/convert", {
    method: "POST",
    headers: {
      "Content-Type": "audio/wav",
    },
    body: buffer,
  });

  if (!res.ok) {
    throw new Error(`WAV conversion failed: ${res.statusText}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

// 🔁 Convert OGG (possibly Vorbis) to Opus using external Node server
async function convertOggToOpus(buffer: Buffer): Promise<Buffer> {
  const res = await fetch("http://localhost:5000/convert-to-opus", {
    method: "POST",
    headers: {
      "Content-Type": "audio/ogg",
    },
    body: buffer,
  });

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
      buffer = await convertWavToMono(buffer);
    } else if (fileType === "ogg") {
      buffer = await convertOggToOpus(buffer);
    }
  } catch (err: any) {
    console.error("Conversion error:", err);
    return NextResponse.json(
      { error: "Audio conversion failed", details: err.message },
      { status: 500 }
    );
  }

  const audioBytes = buffer.toString("base64");

  const config: any = {
    languageCode: "en-US",
    alternativeLanguageCodes: ["hi-IN", "es-ES", "fr-FR"],
    enableAutomaticPunctuation: true,
  };

  if (encoding) config.encoding = encoding;
  if (sampleRate) config.sampleRateHertz = sampleRate;

  try {
    const [response] = await speechClient.recognize({
      audio: { content: audioBytes },
      config,
    });

    const transcription = response.results
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
