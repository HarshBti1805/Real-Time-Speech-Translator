import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SpeechClient } from "@google-cloud/speech";

// Initialize Gemini AI for translation
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Initialize Google Speech client for transcription
let speechClient: SpeechClient;

try {
  if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
    throw new Error("GOOGLE_CLOUD_PROJECT_ID is not set");
  }
  if (!process.env.GOOGLE_CLOUD_CLIENT_EMAIL) {
    throw new Error("GOOGLE_CLOUD_CLIENT_EMAIL is not set");
  }
  if (!process.env.GOOGLE_CLOUD_PRIVATE_KEY) {
    throw new Error("GOOGLE_CLOUD_PRIVATE_KEY is not set");
  }

  const credentials = {
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY.replace(/\\n/g, "\n"),
  };

  speechClient = new SpeechClient({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    credentials: credentials,
  });

  console.log("Google Speech client initialized successfully");
} catch (initError) {
  console.error("Failed to initialize Google Speech client:", initError);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const sourceLanguage = (formData.get("sourceLanguage") as string) || "auto";
    const targetLanguage = (formData.get("targetLanguage") as string) || "en";
    const isRealtime = formData.get("isRealtime") === "true";

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    if (!speechClient) {
      return NextResponse.json(
        { error: "Speech recognition service not available" },
        { status: 503 }
      );
    }

    // Convert audio file to base64 for Google Speech API
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBytes = Buffer.from(arrayBuffer).toString("base64");

    try {
      // Step 1: Transcribe audio using Google Speech-to-Text
      const languageCode =
        sourceLanguage === "auto" ? "en-US" : `${sourceLanguage}-US`;

      const speechConfig = {
        encoding: "WEBM_OPUS" as const,
        sampleRateHertz: 48000,
        languageCode: languageCode,
        enableAutomaticPunctuation: true,
        model: "latest_short",
      };

      const [response] = await speechClient.recognize({
        audio: { content: audioBytes },
        config: speechConfig,
      });

      const transcription =
        response.results
          ?.map((result) => result.alternatives?.[0]?.transcript)
          .filter(Boolean)
          .join(" ") || "";

      if (!transcription.trim()) {
        return NextResponse.json(
          { error: "No speech detected in audio" },
          { status: 400 }
        );
      }

      // Step 2: Detect language if auto mode using Gemini
      let detectedLanguage = sourceLanguage;
      if (sourceLanguage === "auto") {
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const languageDetectionPrompt = `What language is this text written in? Respond with only the two-letter language code (e.g., 'en', 'es', 'fr', 'de', etc.). Text: "${transcription}"`;

          const languageResult = await model.generateContent(
            languageDetectionPrompt
          );
          detectedLanguage = languageResult.response
            .text()
            .trim()
            .toLowerCase();
        } catch (error) {
          console.log("Language detection failed, defaulting to 'en':", error);
          detectedLanguage = "en";
        }
      }

      // Step 3: Translate if needed using Gemini
      let translation = transcription;
      let wasTranslated = false;

      if (detectedLanguage !== targetLanguage) {
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const translationPrompt = `Translate the following text from ${detectedLanguage} to ${targetLanguage}. Provide only the translation, no explanations or additional text: "${transcription}"`;

          const translationResult = await model.generateContent(
            translationPrompt
          );
          translation = translationResult.response.text().trim();
          wasTranslated = true;
        } catch (error) {
          console.log("Translation failed, using original text:", error);
          translation = transcription;
        }
      }

      return NextResponse.json({
        transcription,
        translation,
        detectedLanguage,
        targetLanguage,
        wasTranslated,
        confidence: response.results?.[0]?.alternatives?.[0]?.confidence || 0.8,
        isRealtime,
      });
    } catch (speechError) {
      console.error("Speech recognition error:", speechError);
      return NextResponse.json(
        { error: "Failed to process audio with speech recognition" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Real-time API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
