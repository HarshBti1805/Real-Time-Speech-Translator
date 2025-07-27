import { NextRequest, NextResponse } from "next/server";
import { storageClient } from "@/lib/storageClient";
import { speechClient, translateClient } from "@/lib/googleClient";

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

// Define proper types for Google Speech API response
interface SpeechWord {
  word?: string;
  startTime?: {
    seconds?: string;
    nanos?: number;
  };
  endTime?: {
    seconds?: string;
    nanos?: number;
  };
}

interface SpeechAlternative {
  transcript?: string;
  confidence?: number;
  words?: SpeechWord[];
}

interface SpeechResult {
  alternatives?: SpeechAlternative[];
}

// Type for speech client with longRunningRecognize method
interface ExtendedSpeechClient {
  recognize: (request: unknown) => Promise<unknown>;
  longRunningRecognize: (request: unknown) => Promise<unknown>;
}

const videoEncodingMap: Record<string, AudioEncoding | undefined> = {
  mp4: "MP3",
  webm: "WEBM_OPUS",
  avi: "MP3",
  mov: "MP3",
  mkv: "MP3",
};

// Extract audio from video using local FFmpeg server
async function extractAudioFromVideo(
  buffer: Buffer,
  format: string
): Promise<Buffer> {
  console.log(
    `[API/video] Extracting audio from ${format} video using local FFmpeg server`
  );

  try {
    //
    // Use local FFmpeg server
    const res = await fetch(
      "https://ffmpeg-server-ervj.onrender.com/extract-audio",
      {
        method: "POST",
        headers: {
          "Content-Type": `video/${format}`,
        },
        body: new Uint8Array(buffer),
      }
    );

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ error: res.statusText }));
      throw new Error(
        `Audio extraction failed: ${errorData.error || res.statusText}`
      );
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer());
    console.log(
      `[API/video] Audio extraction successful, size: ${audioBuffer.length} bytes`
    );

    // Validate that we got actual audio data
    if (audioBuffer.length < 100) {
      throw new Error("Extracted audio is too small, likely invalid");
    }

    return audioBuffer;
  } catch (error) {
    console.error("[API/video] Audio extraction error:", error);

    // If local server fails, provide helpful error
    if (error instanceof Error && error.message.includes("fetch")) {
      throw new Error(
        "FFmpeg server is not running. Please start the FFmpeg server at http://localhost:5000"
      );
    }

    throw new Error(
      `Unable to extract audio from video: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Upload audio to Google Cloud Storage
async function uploadAudioToStorage(
  audioBuffer: Buffer,
  fileName: string
): Promise<string> {
  console.log("[API/video] Uploading audio to Google Cloud Storage...");

  try {
    // Use a simple bucket name without creating it
    const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || "";

    // Create a unique filename
    const timestamp = Date.now();
    const uniqueFileName = `audio_${timestamp}_${fileName.replace(
      /[^a-zA-Z0-9.-]/g,
      "_"
    )}.mp3`;

    // Get bucket (don't create, just use existing or fail)
    const bucket = storageClient.bucket(bucketName);

    // Upload file directly (this will fail if bucket doesn't exist)
    const file = bucket.file(uniqueFileName);
    await file.save(audioBuffer, {
      metadata: {
        contentType: "audio/mpeg",
      },
    });

    const gcsUri = `gs://${bucketName}/${uniqueFileName}`;
    console.log(`[API/video] Audio uploaded to: ${gcsUri}`);

    return gcsUri;
  } catch (error) {
    console.error("[API/video] Storage upload error:", error);

    // Check if it's a bucket not found error
    if (error instanceof Error && error.message.includes("Not Found")) {
      throw new Error(
        `Google Cloud Storage bucket not found. Please create bucket 'speech-translator-466118-speech-audio' in your Google Cloud Console or enable the Storage API.`
      );
    }

    throw new Error(
      `Failed to upload audio to storage: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Process long audio using longRunningRecognize
async function processLongAudio(
  gcsUri: string,
  language: string,
  fileExtension: string
): Promise<SpeechResult[]> {
  console.log("[API/video] Processing long audio with longRunningRecognize...");

  try {
    const request = {
      audio: {
        uri: gcsUri,
      },
      config: {
        encoding: videoEncodingMap[fileExtension] || "MP3",
        sampleRateHertz: 16000,
        languageCode: language,
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
        enableWordConfidence: true,
      },
    };

    // Start long running recognition
    const operation = await (
      speechClient as ExtendedSpeechClient
    ).longRunningRecognize(request);
    const [operationResult] = operation as [
      { name: string; promise: () => Promise<[{ results: SpeechResult[] }]> }
    ];
    console.log(
      `[API/video] Long running operation started: ${operationResult.name}`
    );

    // Wait for operation to complete
    const [response] = await operationResult.promise();
    console.log("[API/video] Long running operation completed");

    return response.results || [];
  } catch (error) {
    console.error("[API/video] Long running recognize error:", error);
    throw new Error(
      `Long running recognition failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Clean up storage file
async function cleanupStorageFile(gcsUri: string): Promise<void> {
  try {
    const bucketName = gcsUri.replace("gs://", "").split("/")[0];
    const fileName = gcsUri.replace(`gs://${bucketName}/`, "");

    const bucket = storageClient.bucket(bucketName);
    const file = bucket.file(fileName);

    await file.delete();
    console.log(`[API/video] Cleaned up storage file: ${gcsUri}`);
  } catch (error) {
    console.error("[API/video] Cleanup error:", error);
    // Don't throw error for cleanup failures
  }
}

// Translate subtitles to target language
async function translateSubtitles(
  subtitles: Array<{ start: number; end: number; text: string }>,
  targetLanguage: string,
  sourceLanguage: string = "en"
): Promise<Array<{ start: number; end: number; text: string }>> {
  // If target language is English or same as source, return as-is
  if (targetLanguage === "en" || targetLanguage === sourceLanguage) {
    return subtitles;
  }

  console.log(
    `[API/video] Translating subtitles from ${sourceLanguage} to ${targetLanguage}`
  );

  try {
    // Extract all text for batch translation
    const texts = subtitles.map((subtitle) => subtitle.text);

    // Translate all texts in a batch
    const [translations] = await translateClient.translate(
      texts,
      targetLanguage
    );

    // Create new subtitles array with translated text
    const translatedSubtitles = subtitles.map((subtitle, index) => ({
      start: subtitle.start,
      end: subtitle.end,
      text: Array.isArray(translations) ? translations[index] : translations,
    }));

    console.log(
      `[API/video] Translation completed: ${translatedSubtitles.length} subtitles translated`
    );
    return translatedSubtitles;
  } catch (error) {
    console.error("[API/video] Translation error:", error);
    console.log("[API/video] Falling back to original subtitles");
    return subtitles; // Return original subtitles if translation fails
  }
}

export async function POST(req: NextRequest) {
  console.log("[API/video] POST called");

  try {
    const formData = await req.formData();
    const file = formData.get("video") as File;
    const sourceLanguage =
      (formData.get("sourceLanguage") as string) || "en-US"; // Language of the audio/speech
    const targetLanguage =
      (formData.get("targetLanguage") as string) || sourceLanguage; // Language for subtitles

    console.log("[API/video] Received file:", file?.name);
    console.log("[API/video] Source Language (Speech):", sourceLanguage);
    console.log("[API/video] Target Language (Subtitles):", targetLanguage);

    if (!file) {
      return NextResponse.json(
        { error: "No video file provided" },
        { status: 400 }
      );
    }

    // Get file extension
    const fileExtension = file.name.toLowerCase().split(".").pop() || "";

    if (!videoEncodingMap[fileExtension]) {
      return NextResponse.json(
        { error: `Unsupported video format: ${fileExtension}` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract audio from video
    console.log("[API/video] Extracting audio from video...");
    let audioBuffer: Buffer;

    try {
      audioBuffer = await extractAudioFromVideo(buffer, fileExtension);
      console.log("[API/video] Audio extraction completed");
    } catch (audioError) {
      console.error("[API/video] Audio extraction failed:", audioError);
      // Provide mock subtitles with clear indication
      const videoDuration = Math.min(30, Math.max(5, buffer.length / 100000));
      const mockSubtitles = generateMockSubtitles(
        videoDuration,
        sourceLanguage.split("-")[0] // Extract language code for mock subtitles
      );

      return NextResponse.json({
        success: true,
        subtitles: mockSubtitles,
        totalSegments: mockSubtitles.length,
        language: sourceLanguage,
        isMockData: true,
        message:
          "Audio extraction failed. Showing sample subtitles for demonstration.",
        videoInfo: {
          name: file.name,
          size: file.size,
          format: fileExtension.toUpperCase(),
          estimatedDuration: videoDuration,
        },
      });
    }

    // Process audio with Google Speech API
    console.log("[API/video] Processing audio with Google Speech API...");

    // Check audio duration and use appropriate method
    const audioDuration = audioBuffer.length / (16000 * 2); // 16kHz, 16-bit = 2 bytes per sample
    const isLongAudio = audioDuration > 60; // Longer than 1 minute

    console.log(
      `[API/video] Audio duration: ${audioDuration.toFixed(2)} seconds`
    );

    let response: { results: SpeechResult[] };
    let gcsUri: string | null = null;

    if (isLongAudio) {
      // For audio longer than 1 minute, use longRunningRecognize with storage
      console.log("[API/video] Using longRunningRecognize for long audio...");

      try {
        // Upload audio to Google Cloud Storage
        gcsUri = await uploadAudioToStorage(audioBuffer, file.name);

        // Process with longRunningRecognize
        const results = await processLongAudio(
          gcsUri,
          sourceLanguage,
          fileExtension
        );
        response = { results };

        console.log(
          `[API/video] Long running recognize completed with ${results.length} results`
        );
      } catch (longRunningError) {
        console.error(
          "[API/video] Long running recognize failed:",
          longRunningError
        );

        // Return error instead of falling back to chunking
        throw new Error(
          `Long running recognition failed. Please ensure Google Cloud Storage API is enabled: ${
            longRunningError instanceof Error
              ? longRunningError.message
              : "Unknown error"
          }`
        );
      } finally {
        // Clean up storage file if it was uploaded
        if (gcsUri) {
          await cleanupStorageFile(gcsUri);
        }
      }
    } else {
      // For audio up to 1 minute, use regular recognize
      console.log("[API/video] Using regular recognize for short audio...");

      const request = {
        audio: {
          content: audioBuffer.toString("base64"),
        },
        config: {
          encoding: videoEncodingMap[fileExtension] || "MP3",
          sampleRateHertz: 16000,
          languageCode: sourceLanguage,
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: true,
          enableWordConfidence: true,
        },
      };

      const recognizeResponse = await (
        speechClient as unknown as ExtendedSpeechClient
      ).recognize(request);
      const [recognizeResult] = recognizeResponse as [
        { results: SpeechResult[] }
      ];
      response = recognizeResult;
    }

    console.log("[API/video] Google Speech API response received");

    try {
      if (!response.results || response.results.length === 0) {
        // Return a helpful message instead of throwing an error
        return NextResponse.json({
          success: false,
          error:
            "No speech detected in the video. Please ensure the video contains clear speech audio.",
          subtitles: [],
          totalSegments: 0,
          language: sourceLanguage,
          videoInfo: {
            name: file.name,
            size: file.size,
            format: fileExtension.toUpperCase(),
            estimatedDuration: 0,
          },
        });
      }

      // Process results into subtitles
      const subtitles: Array<{ start: number; end: number; text: string }> = [];

      console.log(
        `[API/video] Processing ${response.results.length} results into subtitles`
      );
      console.log(`[API/video] First result:`, response.results[0]);
      console.log(
        `[API/video] Last result:`,
        response.results[response.results.length - 1]
      );

      response.results.forEach((result: SpeechResult, resultIndex: number) => {
        if (result.alternatives && result.alternatives[0]) {
          const alternative = result.alternatives[0];

          if (alternative.words && alternative.words.length > 0) {
            console.log(
              `[API/video] Result ${resultIndex} has ${alternative.words.length} words`
            );
            console.log(
              `[API/video] First word time: ${alternative.words[0]?.startTime?.seconds}s`
            );
            console.log(
              `[API/video] Last word time: ${
                alternative.words[alternative.words.length - 1]?.endTime
                  ?.seconds
              }s`
            );

            // Group words into subtitle segments
            interface SegmentType {
              start: number;
              end: number;
              words: string[];
            }
            let currentSegment: SegmentType | null = null;

            alternative.words.forEach((word: SpeechWord) => {
              if (word.startTime && word.endTime) {
                const startTime =
                  parseFloat(word.startTime.seconds || "0") +
                  (word.startTime.nanos || 0) / 1000000000;
                const endTime =
                  parseFloat(word.endTime.seconds || "0") +
                  (word.endTime.nanos || 0) / 1000000000;

                if (!currentSegment) {
                  currentSegment = {
                    start: startTime,
                    end: endTime,
                    words: [word.word || ""],
                  };
                } else {
                  // Check if we should start a new segment (max 3 seconds or sentence end)
                  const segmentDuration = endTime - currentSegment.start;
                  if (
                    segmentDuration > 3 ||
                    word.word?.includes(".") ||
                    word.word?.includes("!") ||
                    word.word?.includes("?")
                  ) {
                    // Finalize current segment
                    subtitles.push({
                      start: currentSegment.start,
                      end: currentSegment.end,
                      text: currentSegment.words.join(" ").trim(),
                    });

                    // Start new segment
                    currentSegment = {
                      start: startTime,
                      end: endTime,
                      words: [word.word || ""],
                    };
                  } else {
                    // Add to current segment
                    currentSegment.words.push(word.word || "");
                    currentSegment.end = endTime;
                  }
                }
              }
            });

            // Add the last segment if it exists
            if (
              currentSegment &&
              (currentSegment as unknown as SegmentType).words &&
              (currentSegment as unknown as SegmentType).words.length > 0
            ) {
              const segment = currentSegment as unknown as SegmentType;
              subtitles.push({
                start: segment.start,
                end: segment.end,
                text: segment.words.join(" ").trim(),
              });
            }
          }
        }
      });

      console.log("[API/video] Generated subtitles:", subtitles.length);
      console.log("[API/video] First subtitle:", subtitles[0]);
      console.log(
        "[API/video] Last subtitle:",
        subtitles[subtitles.length - 1]
      );

      // Translate subtitles if needed
      const sourceLang = sourceLanguage.split("-")[0]; // Extract language code (e.g., "en" from "en-US")
      const targetLang = targetLanguage.split("-")[0]; // Extract target language code
      const finalSubtitles = await translateSubtitles(
        subtitles,
        targetLang,
        sourceLang
      );

      return NextResponse.json({
        success: true,
        subtitles: finalSubtitles,
        totalSegments: finalSubtitles.length,
        language: targetLanguage,
        videoInfo: {
          name: file.name,
          size: file.size,
          format: fileExtension.toUpperCase(),
          estimatedDuration:
            finalSubtitles.length > 0
              ? finalSubtitles[finalSubtitles.length - 1].end
              : 0,
        },
      });
    } catch (speechError) {
      console.error("[API/video] Google Speech API error:", speechError);
      throw new Error(
        `Speech recognition failed: ${
          speechError instanceof Error ? speechError.message : "Unknown error"
        }`
      );
    }
  } catch (error) {
    console.error("[API/video] Error:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Video processing failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Video processing failed" },
      { status: 500 }
    );
  }
}

// Generate mock subtitles for demonstration when audio extraction fails
function generateMockSubtitles(
  duration: number,
  language: string
): Array<{ start: number; end: number; text: string }> {
  const subtitles: Array<{ start: number; end: number; text: string }> = [];

  // Language-specific content
  const contentMap: Record<string, string[]> = {
    en: [
      "Hello and welcome to this video presentation.",
      "Today we'll be discussing important topics.",
      "Let me show you how this works in practice.",
      "As you can see, the results are quite impressive.",
      "This demonstrates the power of modern technology.",
      "Thank you for watching this demonstration.",
      "I hope you found this information helpful.",
      "Please feel free to ask any questions.",
      "We'll continue with more details shortly.",
      "This concludes our presentation for today.",
    ],
    es: [
      "Hola y bienvenidos a esta presentación de video.",
      "Hoy discutiremos temas importantes.",
      "Déjame mostrarte cómo funciona esto en la práctica.",
      "Como puedes ver, los resultados son bastante impresionantes.",
      "Esto demuestra el poder de la tecnología moderna.",
      "Gracias por ver esta demostración.",
      "Espero que hayas encontrado esta información útil.",
      "Por favor, no dudes en hacer cualquier pregunta.",
      "Continuaremos con más detalles pronto.",
      "Esto concluye nuestra presentación de hoy.",
    ],
    fr: [
      "Bonjour et bienvenue à cette présentation vidéo.",
      "Aujourd'hui, nous discuterons de sujets importants.",
      "Laissez-moi vous montrer comment cela fonctionne en pratique.",
      "Comme vous pouvez le voir, les résultats sont assez impressionnants.",
      "Cela démontre la puissance de la technologie moderne.",
      "Merci d'avoir regardé cette démonstration.",
      "J'espère que vous avez trouvé ces informations utiles.",
      "N'hésitez pas à poser des questions.",
      "Nous continuerons avec plus de détails bientôt.",
      "Cela conclut notre présentation pour aujourd'hui.",
    ],
    de: [
      "Hallo und willkommen zu dieser Video-Präsentation.",
      "Heute werden wir wichtige Themen besprechen.",
      "Lassen Sie mich zeigen, wie das in der Praxis funktioniert.",
      "Wie Sie sehen können, sind die Ergebnisse ziemlich beeindruckend.",
      "Dies zeigt die Macht der modernen Technologie.",
      "Vielen Dank, dass Sie sich diese Demonstration angesehen haben.",
      "Ich hoffe, Sie fanden diese Informationen hilfreich.",
      "Bitte zögern Sie nicht, Fragen zu stellen.",
      "Wir werden in Kürze mit weiteren Details fortfahren.",
      "Dies schließt unsere heutige Präsentation ab.",
    ],
    it: [
      "Ciao e benvenuti a questa presentazione video.",
      "Oggi discuteremo argomenti importanti.",
      "Lascia che ti mostri come funziona in pratica.",
      "Come puoi vedere, i risultati sono piuttosto impressionanti.",
      "Questo dimostra il potere della tecnologia moderna.",
      "Grazie per aver guardato questa dimostrazione.",
      "Spero che abbiate trovato utili queste informazioni.",
      "Per favore, sentitevi liberi di fare qualsiasi domanda.",
      "Continueremo con maggiori dettagli a breve.",
      "Questo conclude la nostra presentazione di oggi.",
    ],
    pt: [
      "Olá e bem-vindos a esta apresentação em vídeo.",
      "Hoje vamos discutir tópicos importantes.",
      "Deixe-me mostrar como isso funciona na prática.",
      "Como você pode ver, os resultados são bastante impressionantes.",
      "Isso demonstra o poder da tecnologia moderna.",
      "Obrigado por assistir esta demonstração.",
      "Espero que tenham achado essas informações úteis.",
      "Por favor, sintam-se à vontade para fazer perguntas.",
      "Continuaremos com mais detalhes em breve.",
      "Isso conclui nossa apresentação de hoje.",
    ],
    ru: [
      "Привет и добро пожаловать на эту видео-презентацию.",
      "Сегодня мы обсудим важные темы.",
      "Позвольте мне показать, как это работает на практике.",
      "Как видите, результаты довольно впечатляющие.",
      "Это демонстрирует силу современных технологий.",
      "Спасибо за просмотр этой демонстрации.",
      "Надеюсь, вы нашли эту информацию полезной.",
      "Пожалуйста, не стесняйтесь задавать любые вопросы.",
      "Мы продолжим с дополнительными деталями вскоре.",
      "Это завершает нашу сегодняшнюю презентацию.",
    ],
    ja: [
      "こんにちは、このビデオプレゼンテーションへようこそ。",
      "今日は重要なトピックについて話し合います。",
      "実際にどのように機能するかお見せしましょう。",
      "ご覧のとおり、結果は非常に印象的です。",
      "これは現代技術の力を示しています。",
      "このデモンストレーションをご覧いただき、ありがとうございます。",
      "この情報が役立つことを願っています。",
      "ご質問がございましたら、お気軽にお聞きください。",
      "すぐに詳細を続けます。",
      "これで今日のプレゼンテーションを終了します。",
    ],
    zh: [
      "你好，欢迎观看这个视频演示。",
      "今天我们将讨论重要的主题。",
      "让我向您展示这在实践中是如何运作的。",
      "如您所见，结果相当令人印象深刻。",
      "这展示了现代技术的力量。",
      "感谢您观看这次演示。",
      "我希望您觉得这些信息有用。",
      "请随时提出任何问题。",
      "我们很快会继续更多详细信息。",
      "这结束了我们今天的演示。",
    ],
    ar: [
      "مرحباً وأهلاً بكم في هذا العرض التقديمي بالفيديو.",
      "اليوم سنناقش مواضيع مهمة.",
      "دعني أوضح لك كيف يعمل هذا في الممارسة العملية.",
      "كما ترون، النتائج مثيرة للإعجاب تماماً.",
      "هذا يدل على قوة التكنولوجيا الحديثة.",
      "شكراً لمشاهدة هذا العرض التوضيحي.",
      "أتمنى أن تجدوا هذه المعلومات مفيدة.",
      "يرجى عدم التردد في طرح أي أسئلة.",
      "سنواصل بمزيد من التفاصيل قريباً.",
      "هذا يختتم عرضنا التقديمي لليوم.",
    ],
    hi: [
      "नमस्ते और इस वीडियो प्रेजेंटेशन में आपका स्वागत है।",
      "आज हम महत्वपूर्ण विषयों पर चर्चा करेंगे।",
      "मुझे आपको दिखाने दें कि यह व्यवहार में कैसे काम करता है।",
      "जैसा कि आप देख सकते हैं, परिणाम काफी प्रभावशाली हैं।",
      "यह आधुनिक तकनीक की शक्ति को प्रदर्शित करता है।",
      "इस प्रदर्शन को देखने के लिए धन्यवाद।",
      "मुझे आशा है कि आपको यह जानकारी उपयोगी लगी होगी।",
      "कृपया कोई भी प्रश्न पूछने में संकोच न करें।",
      "हम जल्द ही अधिक विवरण के साथ जारी रखेंगे।",
      "यह आज हमारे प्रेजेंटेशन का समापन करता है।",
    ],
    tr: [
      "Merhaba ve bu video sunumuna hoş geldiniz.",
      "Bugün önemli konuları tartışacağız.",
      "Bunun pratikte nasıl çalıştığını size göstereyim.",
      "Gördüğünüz gibi, sonuçlar oldukça etkileyici.",
      "Bu modern teknolojinin gücünü gösteriyor.",
      "Bu gösterimi izlediğiniz için teşekkürler.",
      "Bu bilgilerin faydalı olduğunu umuyorum.",
      "Lütfen herhangi bir soru sormaktan çekinmeyin.",
      "Yakında daha fazla detayla devam edeceğiz.",
      "Bu bugünkü sunumumuzu sonlandırıyor.",
    ],
    nl: [
      "Hallo en welkom bij deze video-presentatie.",
      "Vandaag bespreken we belangrijke onderwerpen.",
      "Laat me u laten zien hoe dit in de praktijk werkt.",
      "Zoals u kunt zien, zijn de resultaten behoorlijk indrukwekkend.",
      "Dit toont de kracht van moderne technologie.",
      "Bedankt voor het bekijken van deze demonstratie.",
      "Ik hoop dat u deze informatie nuttig vond.",
      "Aarzel niet om vragen te stellen.",
      "We gaan binnenkort verder met meer details.",
      "Dit sluit onze presentatie van vandaag af.",
    ],
    pl: [
      "Witamy w tej prezentacji wideo.",
      "Dziś omówimy ważne tematy.",
      "Pozwól mi pokazać, jak to działa w praktyce.",
      "Jak widać, wyniki są dość imponujące.",
      "To pokazuje moc nowoczesnej technologii.",
      "Dziękujemy za obejrzenie tej demonstracji.",
      "Mam nadzieję, że te informacje były pomocne.",
      "Nie wahaj się zadawać pytań.",
      "Wkrótce kontynuujemy z większą ilością szczegółów.",
      "To kończy naszą dzisiejszą prezentację.",
    ],
    sv: [
      "Hej och välkommen till denna videopresentation.",
      "Idag diskuterar vi viktiga ämnen.",
      "Låt mig visa dig hur detta fungerar i praktiken.",
      "Som du kan se är resultaten ganska imponerande.",
      "Detta visar kraften i modern teknologi.",
      "Tack för att du tittade på denna demonstration.",
      "Jag hoppas att du fann denna information användbar.",
      "Tveka inte att ställa frågor.",
      "Vi fortsätter snart med mer detaljer.",
      "Detta avslutar vår presentation för idag.",
    ],
    da: [
      "Hej og velkommen til denne videopræsentation.",
      "I dag diskuterer vi vigtige emner.",
      "Lad mig vise dig, hvordan dette fungerer i praksis.",
      "Som du kan se, er resultaterne ret imponerende.",
      "Dette viser kraften i moderne teknologi.",
      "Tak for at se denne demonstration.",
      "Jeg håber, du fandt disse oplysninger nyttige.",
      "Tøv ikke med at stille spørgsmål.",
      "Vi fortsætter snart med flere detaljer.",
      "Dette afslutter vores præsentation for i dag.",
    ],
    no: [
      "Hei og velkommen til denne videopresentasjonen.",
      "I dag diskuterer vi viktige emner.",
      "La meg vise deg hvordan dette fungerer i praksis.",
      "Som du kan se, er resultatene ganske imponerende.",
      "Dette viser kraften i moderne teknologi.",
      "Takk for at du så denne demonstrasjonen.",
      "Jeg håper du fant denne informasjonen nyttig.",
      "Ikke nøl med å stille spørsmål.",
      "Vi fortsetter snart med flere detaljer.",
      "Dette avslutter vår presentasjon for i dag.",
    ],
    fi: [
      "Hei ja tervetuloa tähän videopresentaatioon.",
      "Tänään keskustelemme tärkeistä aiheista.",
      "Annan sinun nähdä, miten tämä toimii käytännössä.",
      "Kuten näet, tulokset ovat melko vaikuttavia.",
      "Tämä osoittaa modernin teknologian voiman.",
      "Kiitos, että katsoit tämän demonstraation.",
      "Toivon, että löysit nämä tiedot hyödyllisiksi.",
      "Älä epäröi esittää kysymyksiä.",
      "Jatkamme pian lisätiedoilla.",
      "Tämä päättää tämän päivän esityksemme.",
    ],
    cs: [
      "Ahoj a vítejte na této video prezentaci.",
      "Dnes budeme diskutovat o důležitých tématech.",
      "Dovolte mi ukázat, jak to funguje v praxi.",
      "Jak vidíte, výsledky jsou docela působivé.",
      "Toto ukazuje sílu moderní technologie.",
      "Děkujeme za sledování této demonstrace.",
      "Doufám, že jste tyto informace našli užitečné.",
      "Neváhejte klást otázky.",
      "Brzy budeme pokračovat s dalšími detaily.",
      "Tímto končí naše dnešní prezentace.",
    ],
    hu: [
      "Üdvözlöm és köszönöm, hogy megnézte ezt a videóprezentációt.",
      "Ma fontos témákat fogunk megbeszélni.",
      "Hagyja, hogy megmutassam, hogyan működik ez a gyakorlatban.",
      "Amint láthatja, az eredmények meglehetősen lenyűgözőek.",
      "Ez mutatja a modern technológia erejét.",
      "Köszönjük, hogy megnézte ezt a bemutatót.",
      "Remélem, hasznosnak találta ezeket az információkat.",
      "Ne habozzon kérdéseket feltenni.",
      "Hamarosan folytatjuk további részletekkel.",
      "Ezzel befejezzük a mai prezentációt.",
    ],
    ro: [
      "Bună și bine ați venit la această prezentare video.",
      "Astăzi vom discuta subiecte importante.",
      "Permiteți-mi să vă arăt cum funcționează acest lucru în practică.",
      "După cum puteți vedea, rezultatele sunt destul de impresionante.",
      "Aceasta demonstrează puterea tehnologiei moderne.",
      "Vă mulțumim pentru că ați urmărit această demonstrație.",
      "Sper că ați găsit aceste informații utile.",
      "Nu ezitați să puneți întrebări.",
      "Vom continua în curând cu mai multe detalii.",
      "Aceasta încheie prezentarea noastră de astăzi.",
    ],
    bg: [
      "Здравейте и добре дошли в тази видео презентация.",
      "Днес ще обсъдим важни теми.",
      "Позволете ми да ви покажа как работи това на практика.",
      "Както можете да видите, резултатите са доста впечатляващи.",
      "Това показва силата на модерната технология.",
      "Благодарим ви, че гледахте тази демонстрация.",
      "Надявам се, че намерихте тази информация за полезна.",
      "Не се колебайте да задавате въпроси.",
      "Скоро ще продължим с повече подробности.",
      "Това завършва нашата днешна презентация.",
    ],
    hr: [
      "Pozdrav i dobrodošli na ovu video prezentaciju.",
      "Danas ćemo raspravljati o važnim temama.",
      "Dopustite mi da vam pokažem kako ovo funkcionira u praksi.",
      "Kao što možete vidjeti, rezultati su prilično impresivni.",
      "Ovo pokazuje snagu moderne tehnologije.",
      "Hvala vam što ste gledali ovu demonstraciju.",
      "Nadam se da ste ove informacije smatrali korisnima.",
      "Ne ustručavajte se postavljati pitanja.",
      "Uskoro ćemo nastaviti s više detalja.",
      "Ovo završava našu današnju prezentaciju.",
    ],
    sk: [
      "Ahoj a vitajte na tejto video prezentácii.",
      "Dnes budeme diskutovať o dôležitých témach.",
      "Dovoľte mi ukázať, ako to funguje v praxi.",
      "Ako vidíte, výsledky sú celkom pôsobivé.",
      "Toto ukazuje silu modernej technológie.",
      "Ďakujeme za sledovanie tejto demonštrácie.",
      "Dúfam, že ste tieto informácie považovali za užitočné.",
      "Neváhajte klásť otázky.",
      "Čoskoro budeme pokračovať s ďalšími detailmi.",
      "Týmto končí naša dnešná prezentácia.",
    ],
    el: [
      "Γεια σας και καλώς ήρθατε σε αυτή την παρουσίαση βίντεο.",
      "Σήμερα θα συζητήσουμε σημαντικά θέματα.",
      "Επιτρέψτε μου να σας δείξω πώς λειτουργεί αυτό στην πράξη.",
      "Όπως μπορείτε να δείτε, τα αποτελέσματα είναι αρκετά εντυπωσιακά.",
      "Αυτό δείχνει τη δύναμη της μοντέρνας τεχνολογίας.",
      "Ευχαριστούμε που παρακολουθήσατε αυτή την επίδειξη.",
      "Ελπίζω ότι βρήκατε αυτές τις πληροφορίες χρήσιμες.",
      "Μη διστάσετε να κάνετε ερωτήσεις.",
      "Σύντομα θα συνεχίσουμε με περισσότερες λεπτομέρειες.",
      "Αυτό ολοκληρώνει την παρουσίασή μας για σήμερα.",
    ],
    he: [
      "שלום וברוכים הבאים למצגת הווידאו הזו.",
      "היום נדון בנושאים חשובים.",
      "תן לי להראות לך איך זה עובד בפועל.",
      "כפי שאתה יכול לראות, התוצאות די מרשימות.",
      "זה מראה את הכוח של הטכנולוגיה המודרנית.",
      "תודה שצפית בהדגמה זו.",
      "אני מקווה שמצאת מידע זה שימושי.",
      "אל תהסס לשאול שאלות.",
      "בקרוב נמשיך עם פרטים נוספים.",
      "זה מסיים את המצגת שלנו להיום.",
    ],
    th: [
      "สวัสดีและยินดีต้อนรับสู่การนำเสนอวิดีโอนี้",
      "วันนี้เราจะพูดคุยเกี่ยวกับหัวข้อสำคัญ",
      "ให้ฉันแสดงให้คุณเห็นว่านี่ทำงานอย่างไรในทางปฏิบัติ",
      "อย่างที่คุณเห็น ผลลัพธ์ค่อนข้างน่าประทับใจ",
      "นี่แสดงให้เห็นถึงพลังของเทคโนโลยีสมัยใหม่",
      "ขอบคุณที่ดูการสาธิตนี้",
      "ฉันหวังว่าคุณจะพบข้อมูลนี้เป็นประโยชน์",
      "อย่าลังเลที่จะถามคำถาม",
      "เราจะดำเนินการต่อด้วยรายละเอียดเพิ่มเติมในไม่ช้า",
      "นี่เป็นการสรุปการนำเสนอของเราในวันนี้",
    ],
    vi: [
      "Xin chào và chào mừng đến với bài thuyết trình video này.",
      "Hôm nay chúng ta sẽ thảo luận về các chủ đề quan trọng.",
      "Hãy để tôi cho bạn thấy cách điều này hoạt động trong thực tế.",
      "Như bạn có thể thấy, kết quả khá ấn tượng.",
      "Điều này thể hiện sức mạnh của công nghệ hiện đại.",
      "Cảm ơn bạn đã xem cuộc trình diễn này.",
      "Tôi hy vọng bạn thấy thông tin này hữu ích.",
      "Đừng ngần ngại đặt câu hỏi.",
      "Chúng ta sẽ tiếp tục với nhiều chi tiết hơn sớm.",
      "Điều này kết thúc bài thuyết trình của chúng ta hôm nay.",
    ],
    id: [
      "Halo dan selamat datang di presentasi video ini.",
      "Hari ini kita akan membahas topik-topik penting.",
      "Biarkan saya tunjukkan bagaimana ini bekerja dalam praktik.",
      "Seperti yang Anda lihat, hasilnya cukup mengesankan.",
      "Ini menunjukkan kekuatan teknologi modern.",
      "Terima kasih telah menonton demonstrasi ini.",
      "Saya berharap Anda menemukan informasi ini berguna.",
      "Jangan ragu untuk mengajukan pertanyaan.",
      "Kami akan segera melanjutkan dengan detail lebih lanjut.",
      "Ini mengakhiri presentasi kami hari ini.",
    ],
    uk: [
      "Привіт і ласкаво просимо до цієї відео-презентації.",
      "Сьогодні ми обговоримо важливі теми.",
      "Дозвольте мені показати, як це працює на практиці.",
      "Як ви можете бачити, результати досить вражаючі.",
      "Це демонструє силу сучасної технології.",
      "Дякуємо за перегляд цієї демонстрації.",
      "Сподіваюся, ви знайшли цю інформацію корисною.",
      "Не соромтеся задавати питання.",
      "Ми незабаром продовжимо з більш детальною інформацією.",
      "Це завершує нашу сьогоднішню презентацію.",
    ],
  };

  const content = contentMap[language] || contentMap.en;
  const segmentDuration = duration / content.length;

  content.forEach((text, index) => {
    const start = index * segmentDuration;
    const end = Math.min((index + 1) * segmentDuration, duration);

    subtitles.push({
      start: Math.max(0, start),
      end: Math.max(start + 1, end),
      text: text.trim(),
    });
  });

  return subtitles;
}
