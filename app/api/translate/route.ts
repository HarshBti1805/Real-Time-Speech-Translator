import { NextRequest, NextResponse } from "next/server";
import { Translate } from "@google-cloud/translate/build/src/v2";

let translate: Translate;

try {
  translate = new Translate({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
  });
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
    console.error("Error details:", error.message);
    console.error("Error code:", error.code);
    console.error("Error stack:", error.stack);
    let errorMessage = "Translation failed";

    if (error.code === "ENOTFOUND") {
      errorMessage = "Network error: Cannot reach Google Translate API";
    } else if (error.code === "ENOENT") {
      errorMessage = "Authentication error: Service account key file not found";
    } else if (error.message?.includes("authentication")) {
      errorMessage = "Authentication error: Invalid credentials";
    } else if (error.message?.includes("quota")) {
      errorMessage = "API quota exceeded";
    } else if (error.message?.includes("permission")) {
      errorMessage = "Permission denied: Check API permissions";
    } else if (error.message) {
      errorMessage = `Translation failed: ${error.message}`;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
