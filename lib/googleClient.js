import fs from "fs";
import path from "path";
import speech from "@google-cloud/speech";
import { Translate } from "@google-cloud/translate/build/src/v2";
import { ImageAnnotatorClient } from "@google-cloud/vision";

// Write credentials to /tmp if on Vercel
const credsPath = "/tmp/gcloud-credentials.json";

if (!fs.existsSync(credsPath)) {
  const base64Creds = process.env.GOOGLE_CREDENTIALS_B64;
  if (base64Creds) {
    const decoded = Buffer.from(base64Creds, "base64").toString("utf8");
    fs.writeFileSync(credsPath, decoded);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credsPath;
  } else {
    // fallback for local dev
    process.env.GOOGLE_APPLICATION_CREDENTIALS =
      process.env.GOOGLE_APPLICATION_CREDENTIALS || "./gcloud-credentials.json";
  }
}

// Initialize clients
const speechClient = new speech.SpeechClient();
const translateClient = new Translate();
const visionClient = new ImageAnnotatorClient();

export { speechClient, translateClient, visionClient };
