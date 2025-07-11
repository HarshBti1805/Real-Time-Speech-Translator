declare module "@/lib/googleClient" {
  export const visionClient: {
    textDetection: (request: { image: { content: string } }) => Promise<any[]>;
  };
  export const speechClient: any; // (or a more specific type if you know it)
  export const translateClient: any; // (or a more specific type if you know it)
}
