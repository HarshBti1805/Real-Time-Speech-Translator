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

    // Alternative method signature if you're using options object
    // translate: (
    //   text: string | string[],
    //   options: {
    //     to: string;
    //     from?: string;
    //   }
    // ) => Promise<[TranslationResult] | [TranslationResult[]]>;
  };
}
