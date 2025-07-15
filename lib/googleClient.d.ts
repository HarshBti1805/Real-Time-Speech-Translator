// lib/googleClient.d.ts
declare module "@/lib/googleClient" {
  // Speech API types
  interface SpeechRecognitionResult {
    alternatives?: Array<{
      transcript?: string;
      confidence?: number;
    }>;
  }

  interface SpeechRecognitionResponse {
    results?: SpeechRecognitionResult[];
  }

  // Vision API types
  interface TextAnnotation {
    description?: string;
    boundingPoly?: {
      vertices?: Array<{ x?: number; y?: number }>;
    };
  }

  interface DetectedLanguage {
    languageCode?: string;
    confidence?: number;
  }

  interface TextProperty {
    detectedLanguages?: DetectedLanguage[];
  }

  interface Block {
    property?: TextProperty;
    boundingBox?: {
      vertices?: Array<{ x?: number; y?: number }>;
    };
  }

  interface Page {
    property?: TextProperty;
    width?: number;
    height?: number;
    blocks?: Block[];
    confidence?: number;
  }

  interface FullTextAnnotation {
    pages?: Page[];
    text?: string;
  }

  interface VisionResponse {
    textAnnotations?: TextAnnotation[];
    fullTextAnnotation?: FullTextAnnotation;
  }

  // Translation API types
  interface TranslationResult {
    translatedText: string;
    detectedSourceLanguage?: string;
  }

  // TTS API types - CORRECTED
  interface SynthesizeSpeechRequest {
    input: { text?: string; ssml?: string };
    voice: {
      languageCode: string;
      name?: string;
      ssmlGender?:
        | "MALE"
        | "FEMALE"
        | "NEUTRAL"
        | "SSML_VOICE_GENDER_UNSPECIFIED";
    };
    audioConfig: {
      audioEncoding: "LINEAR16" | "MP3" | "OGG_OPUS" | "MULAW" | "ALAW";
      speakingRate?: number;
      pitch?: number;
      volumeGainDb?: number;
      sampleRateHertz?: number;
      effectsProfileId?: string[];
    };
    enableTimePointing?: Array<"TIMEPOINT_TYPE_UNSPECIFIED" | "SSML_MARK">;
  }

  interface SynthesizeSpeechResponse {
    audioContent: Uint8Array | string; // Can be Uint8Array or base64 string depending on implementation
    timepoints?: Array<{
      markName?: string;
      timeSeconds?: number;
    }>;
    audioConfig?: {
      audioEncoding?: string;
      speakingRate?: number;
      pitch?: number;
      volumeGainDb?: number;
      sampleRateHertz?: number;
      effectsProfileId?: string[];
    };
  }

  export const visionClient: {
    textDetection: (request: {
      image: { content: string };
    }) => Promise<[VisionResponse]>;
  };

  export const speechClient: {
    recognize: (request: {
      audio: { content: string };
      config: Record<string, unknown>;
    }) => Promise<[SpeechRecognitionResponse]>;
  };

  export const translateClient: {
    translate: (
      text: string | string[],
      targetLanguage: string,
      sourceLanguage?: string
    ) => Promise<[string] | [string[]]>;
  };

  // CORRECTED: TTS client returns array with response as first element
  export const ttsClient: {
    synthesizeSpeech: (
      request: SynthesizeSpeechRequest
    ) => Promise<[SynthesizeSpeechResponse]>;
  };
}
