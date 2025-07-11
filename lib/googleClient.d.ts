declare module "@/lib/googleClient" {
  export const visionClient: {
    textDetection: (request: {
      image: { content: string };
    }) => Promise<unknown[]>;
  };
  export const speechClient: {
    recognize: (request: unknown) => Promise<unknown>;
    // Add other methods you use
  };
  export const translateClient: {
    translate: (request: unknown) => Promise<unknown>;
    // Add other methods you use
  };
}
