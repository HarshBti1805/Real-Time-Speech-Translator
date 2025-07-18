// app/api/voice/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { speechClient, translateClient } from "@/lib/googleClient";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let filePath = "";

  try {
    const formData = await req.formData();
    const file = formData.get("audio") as File;
    const targetLanguage = (formData.get("targetLanguage") as string) || "en";
    const baseLanguage = (formData.get("baseLanguage") as string) || "auto";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Audio file too large" },
        { status: 400 }
      );
    }

    console.log(
      "Processing audio file:",
      file.name,
      "Size:",
      file.size,
      "Type:",
      file.type,
      "Target language:",
      targetLanguage,
      "Base language:",
      baseLanguage
    );

    // Check if file is too small (likely no audio)
    if (file.size < 500) {
      return NextResponse.json(
        { error: "Audio file too small - please record longer audio" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create unique filename to avoid conflicts
    const timestamp = Date.now();
    const uniqueFileName = `audio_${timestamp}.webm`;
    const uploadsDir = "/tmp";
    filePath = path.join(uploadsDir, uniqueFileName);

    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);

    const audio = {
      content: buffer.toString("base64"),
    };

    let bestTranscription = "";
    let bestConfidence = 0;
    let detectedLanguage = "";

    if (baseLanguage === "auto") {
      console.log("Auto-detecting language with optimized strategy...");

      // Strategy 1: Start with most common languages based on your user base
      const primaryLanguages = [
        { code: "en-US", name: "English" },
        { code: "hi-IN", name: "Hindi" },
        { code: "es-ES", name: "Spanish" },
        { code: "fr-FR", name: "French" },
        { code: "pa-IN", name: "Punjabi" },
      ];

      // Strategy 2: Secondary languages to try if primary fails
      const secondaryLanguages = [
        { code: "de-DE", name: "German" },
        { code: "gu-IN", name: "Gujarati" },
        { code: "bn-IN", name: "Bengali" },
        { code: "ta-IN", name: "Tamil" },
        { code: "te-IN", name: "Telugu" },
        { code: "ml-IN", name: "Malayalam" },
        { code: "mr-IN", name: "Marathi" },
        { code: "it-IT", name: "Italian" },
        { code: "pt-BR", name: "Portuguese" },
        { code: "ru-RU", name: "Russian" },
        { code: "ja-JP", name: "Japanese" },
        { code: "ko-KR", name: "Korean" },
        { code: "zh-CN", name: "Chinese" },
        { code: "ar-SA", name: "Arabic" },
      ];

      // Strategy 3: Early termination threshold
      const CONFIDENCE_THRESHOLD = 0.8; // Stop if we get high confidence
      const MIN_QUALITY_THRESHOLD = 0.3; // Minimum quality to consider

      const results = [];
      let foundHighConfidence = false;

      // Helper function to try language detection
      async function tryLanguageDetection(
        langConfig: { code: string; name: string },
        audio: { content: string }
      ) {
        const config = {
          encoding: "WEBM_OPUS" as const,
          sampleRateHertz: 48000,
          languageCode: langConfig.code,
          enableAutomaticPunctuation: true,
          enableWordConfidence: true,
          model: "latest_short", // Use shorter model for faster processing
          useEnhanced: false, // Disable enhanced model for speed
        };

        try {
          console.log(`Trying ${langConfig.name} (${langConfig.code})`);
          const [response] = await speechClient.recognize({ audio, config });

          if (
            response.results &&
            response.results[0]?.alternatives &&
            response.results[0].alternatives[0]?.transcript
          ) {
            const transcript = response.results
              .map((r) => r.alternatives?.[0]?.transcript)
              .filter(Boolean)
              .join(" ");

            const confidence =
              response.results[0].alternatives[0].confidence || 0;

            // Only consider results with meaningful content
            if (transcript.trim().length > 0) {
              const qualityScore =
                confidence * Math.min(transcript.trim().length / 10, 1);

              console.log(
                `${
                  langConfig.name
                }: "${transcript}" (confidence: ${confidence.toFixed(
                  3
                )}, quality: ${qualityScore.toFixed(3)})`
              );

              return {
                language: langConfig.code,
                languageName: langConfig.name,
                transcript,
                confidence,
                qualityScore,
              };
            }
          }
          return null;
        } catch (err) {
          if (err instanceof Error) {
            console.log(`Error with ${langConfig.name}:`, err.message);
          } else {
            console.log(`Error with ${langConfig.name}:`, err);
          }
          return null;
        }
      }

      // Try primary languages first
      console.log("Trying primary languages...");
      for (const langConfig of primaryLanguages) {
        if (foundHighConfidence) break;

        const result = await tryLanguageDetection(langConfig, audio);
        if (result && result.qualityScore > MIN_QUALITY_THRESHOLD) {
          results.push(result);

          // Early termination if we find high confidence
          if (result.confidence > CONFIDENCE_THRESHOLD) {
            console.log(
              `High confidence found for ${
                langConfig.name
              } (${result.confidence.toFixed(3)}), stopping search`
            );
            foundHighConfidence = true;
            break;
          }
        }
      }

      // Only try secondary languages if no high confidence match found
      if (!foundHighConfidence && results.length === 0) {
        console.log("No good primary matches, trying secondary languages...");
        for (const langConfig of secondaryLanguages) {
          const result = await tryLanguageDetection(langConfig, audio);
          if (result && result.qualityScore > MIN_QUALITY_THRESHOLD) {
            results.push(result);

            // Early termination for secondary languages too
            if (result.confidence > CONFIDENCE_THRESHOLD) {
              console.log(
                `High confidence found for ${
                  langConfig.name
                } (${result.confidence.toFixed(3)}), stopping search`
              );
              break;
            }
          }

          // Limit secondary language attempts
          if (results.length >= 3) break;
        }
      }

      // Sort by quality score (confidence * length factor) and pick the best
      results.sort((a, b) => b.qualityScore - a.qualityScore);

      if (results.length > 0) {
        const bestResult = results[0];
        bestTranscription = bestResult.transcript;
        bestConfidence = bestResult.confidence;
        detectedLanguage = bestResult.language;

        console.log(
          `Best detection: ${
            bestResult.languageName
          } with quality score ${bestResult.qualityScore.toFixed(3)}`
        );
        console.log(`Final transcription: "${bestTranscription}"`);

        // Log top 3 results for debugging
        console.log("Top 3 results:");
        results.slice(0, 3).forEach((result, idx) => {
          console.log(
            `${idx + 1}. ${result.languageName}: "${
              result.transcript
            }" (quality: ${result.qualityScore.toFixed(3)})`
          );
        });
      } else {
        console.log("No valid transcription found in any language");
      }
    } else {
      // Direct transcription mode - use the specified base language
      console.log(`Using specified base language: ${baseLanguage}`);

      const languageCodeMap: { [key: string]: string } = {
        en: "en-US",
        hi: "hi-IN",
        pa: "pa-IN",
        mr: "mr-IN",
        fr: "fr-FR",
        es: "es-ES",
        ta: "ta-IN",
        gu: "gu-IN",
        bn: "bn-IN",
        te: "te-IN",
        ml: "ml-IN",
        kn: "kn-IN",
        or: "or-IN",
        de: "de-DE",
        it: "it-IT",
        pt: "pt-BR",
        ru: "ru-RU",
        ja: "ja-JP",
        ko: "ko-KR",
        zh: "zh-CN",
        ar: "ar-SA",
        th: "th-TH",
        vi: "vi-VN",
        id: "id-ID",
        ms: "ms-MY",
        tl: "tl-PH",
        sw: "sw-KE",
        tr: "tr-TR",
        nl: "nl-NL",
        sv: "sv-SE",
        no: "no-NO",
        da: "da-DK",
        fi: "fi-FI",
      };

      const fullLanguageCode =
        languageCodeMap[baseLanguage] || `${baseLanguage}-US`;
      detectedLanguage = fullLanguageCode;

      const config = {
        encoding: "WEBM_OPUS" as const,
        sampleRateHertz: 48000,
        languageCode: fullLanguageCode,
        enableAutomaticPunctuation: true,
        enableWordConfidence: true,
        model: "latest_long",
        useEnhanced: true,
      };

      try {
        const [response] = await speechClient.recognize({ audio, config });
        if (
          response.results &&
          response.results[0]?.alternatives &&
          response.results[0].alternatives[0]?.transcript
        ) {
          bestTranscription = response.results
            .map((r) => r.alternatives?.[0]?.transcript)
            .filter(Boolean)
            .join(" ");
          bestConfidence = response.results[0].alternatives[0].confidence || 0;
        }
      } catch (err) {
        console.error(`Error with specified language ${fullLanguageCode}:`);

        // Clean up file before returning error
        if (filePath && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        let errorMessage = "Speech recognition failed.";
        if (
          err &&
          typeof err === "object" &&
          "message" in err &&
          typeof err.message === "string"
        ) {
          errorMessage = `Speech recognition failed for language ${baseLanguage}: ${err.message}`;
        } else {
          errorMessage = `Speech recognition failed for language ${baseLanguage}.`;
        }
        return NextResponse.json(
          {
            error: errorMessage,
          },
          { status: 400 }
        );
      }
    }

    if (!bestTranscription.trim()) {
      console.log("No transcription found");

      // Clean up file before returning error
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return NextResponse.json(
        {
          error:
            "No speech could be transcribed from the audio. Please speak more clearly or check your microphone.",
        },
        { status: 400 }
      );
    }

    // Extract the base language code (e.g., "en" from "en-US")
    const detectedBaseLanguage =
      baseLanguage === "auto" ? detectedLanguage.split("-")[0] : baseLanguage;

    let translation = bestTranscription;
    const translatedFrom = detectedBaseLanguage;

    // Only translate if the detected language is different from target language
    if (detectedBaseLanguage !== targetLanguage) {
      try {
        console.log(
          `Translating from ${detectedBaseLanguage} to ${targetLanguage}`
        );
        console.log(`Text to translate: "${bestTranscription}"`);

        const [translatedText] = await translateClient.translate(
          bestTranscription,
          targetLanguage
        );
        translation = Array.isArray(translatedText)
          ? translatedText[0]
          : translatedText;
        console.log(`Translation result: "${translation}"`);
      } catch (translateError) {
        console.error("Translation Error:", translateError);
        translation = bestTranscription;
      }
    }

    // Clean up file after processing
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const result = {
      transcription: bestTranscription,
      translation,
      detectedLanguage,
      targetLanguage,
      translatedFrom,
      wasTranslated: detectedBaseLanguage !== targetLanguage,
      confidence: bestConfidence,
    };

    console.log("Final result:", result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing audio:", error);

    // Clean up file if it exists
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return NextResponse.json(
      { error: "Internal server error processing audio" },
      { status: 500 }
    );
  }
}
