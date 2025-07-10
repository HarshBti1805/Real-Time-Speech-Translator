// lib/googleClient.js
import speech from "@google-cloud/speech";
import { Translate } from "@google-cloud/translate/build/src/v2";
import { ImageAnnotatorClient } from "@google-cloud/vision";

// Load credentials from environment
process.env.GOOGLE_APPLICATION_CREDENTIALS =
  process.env.GOOGLE_APPLICATION_CREDENTIALS || "./gcloud-credentials.json";

const speechClient = new speech.SpeechClient();
const translateClient = new Translate();
const visionClient = new ImageAnnotatorClient(); // It will auto-pick from env

export { speechClient, translateClient, visionClient };
