import { NextRequest, NextResponse } from "next/server";
import { Translate } from "@google-cloud/translate/build/src/v2";

let translate: Translate;

try {
  // Validate required environment variables
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

  translate = new Translate({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    credentials: credentials,
  });

  console.log("Google Translate client initialized successfully");
} catch (initError) {
  console.error("Failed to initialize Google Translate client:", initError);
}

export async function POST(req: NextRequest) {
  try {
    if (!translate) {
      console.error("Google Translate client not initialized");
      return NextResponse.json(
        { error: "Translation service not available" },
        { status: 503 }
      );
    }

    const { text, targetLang, sourceLang, autoDetect } = await req.json();

    // Debug logging
    console.log("Translation request:", {
      text,
      targetLang,
      sourceLang,
      autoDetect,
    });

    if (!text || !targetLang) {
      return NextResponse.json(
        { error: "Text and target language are required" },
        { status: 400 }
      );
    }

    if (autoDetect || !sourceLang) {
      // Auto-detect language and translate
      console.log("Attempting auto-detect translation...");
      const [translation, metadata] = await translate.translate(
        text,
        targetLang
      );

      console.log("Translation successful:", { translation, metadata });
      const detectedLang =
        metadata.data.translations[0].detectedSourceLanguage || "unknown";

      // Calculate confidence based on text length and detection certainty
      // Google doesn't provide confidence directly, so we estimate it
      let confidence = 0;
      if (detectedLang && detectedLang !== "unknown") {
        // Base confidence on text length and detection success
        const textLength = text.length;
        if (textLength > 100) confidence = 0.9;
        else if (textLength > 50) confidence = 0.8;
        else if (textLength > 20) confidence = 0.7;
        else confidence = 0.6;

        // Adjust based on detection certainty (if language is common)
        const commonLanguages = [
          "en",
          "es",
          "fr",
          "de",
          "it",
          "pt",
          "ru",
          "zh",
          "ja",
          "ko",
        ];
        if (commonLanguages.includes(detectedLang)) {
          confidence = Math.min(confidence + 0.1, 1.0);
        }
      }

      return NextResponse.json({
        translatedText: translation,
        detectedLang: detectedLang,
        confidence: confidence,
      });
    } else {
      // Regular translation with specified source language
      console.log(
        `Attempting translation from ${sourceLang} to ${targetLang}...`
      );

      const [translation] = await translate.translate(text, {
        from: sourceLang,
        to: targetLang,
      });

      console.log("Translation successful:", { translation });

      return NextResponse.json({
        translatedText: translation,
        // Don't include detectedLang when source is explicitly specified
      });
    }
  } catch (error) {
    console.error("Translation error:", error);

    let errorMessage = "Translation failed";
    // Safely extract error details if possible
    if (typeof error === "object" && error !== null) {
      const err = error as { message?: string; code?: string; stack?: string };
      if (err.message) console.error("Error details:", err.message);
      if (err.code) console.error("Error code:", err.code);
      if (err.stack) console.error("Error stack:", err.stack);
    }

    // Safely check error properties since 'error' is of type 'unknown'
    const err = error as { message?: string; code?: string };
    if (err.code === "ENOTFOUND") {
      errorMessage = "Network error: Cannot reach Google Translate API";
    } else if (err.code === "ENOENT") {
      errorMessage = "Authentication error: Service account key file not found";
    } else if (err.message?.includes("authentication")) {
      errorMessage = "Authentication error: Invalid credentials";
    } else if (err.message?.includes("quota")) {
      errorMessage = "API quota exceeded";
    } else if (err.message?.includes("permission")) {
      errorMessage = "Permission denied: Check API permissions";
    } else if (err.message) {
      errorMessage = `Translation failed: ${err.message}`;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
