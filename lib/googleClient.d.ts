declare module "@/lib/googleClient" {
  interface SpeechRecognitionResult {
    alternatives?: Array<{
      transcript?: string;
      confidence?: number;
    }>;
  }

  interface SpeechRecognitionResponse {
    results?: SpeechRecognitionResult[];
  }

  export const visionClient: {
    textDetection: (request: {
      image: { content: string };
    }) => Promise<unknown[]>;
  };
  export const speechClient: {
    recognize: (request: {
      audio: { content: string };
      config: Record<string, unknown>;
    }) => Promise<[SpeechRecognitionResponse]>;
  };
  export const translateClient: {
    translate: (request: unknown) => Promise<unknown>;
    // Add other methods you use
  };
}
