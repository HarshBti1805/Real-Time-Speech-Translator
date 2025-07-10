// app/api/speech/route.ts
import { NextRequest, NextResponse } from "next/server";
import { speechClient } from "@/lib/googleClient";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function GET() {
  return NextResponse.json({ message: "Speech API is ready" });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("audio") as File;

  if (!file) {
    return NextResponse.json(
      { error: "No audio file uploaded" },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const audioBytes = buffer.toString("base64");

    const [response] = await speechClient.recognize({
      audio: { content: audioBytes },
      config: {
        encoding: "WEBM_OPUS", // ✅ Correct for MediaRecorder output
        languageCode: "en-US",
        enableAutomaticPunctuation: true,
      },
    });

    const transcription = response.results
      ?.map((result) => result.alternatives?.[0]?.transcript)
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
