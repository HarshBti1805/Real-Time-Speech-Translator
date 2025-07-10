import fs from "fs";
import speech from "@google-cloud/speech";
import { Translate } from "@google-cloud/translate/build/src/v2";
import { ImageAnnotatorClient } from "@google-cloud/vision";

const credsPath = "/tmp/gcloud-credentials.json";

if (!fs.existsSync(credsPath)) {
  const base64Creds = process.env.GOOGLE_CREDENTIALS_B64;
  if (base64Creds) {
    const decoded = Buffer.from(base64Creds, "base64").toString("utf8");
    fs.writeFileSync(credsPath, decoded);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credsPath;
  } else {
    // Local fallback
    process.env.GOOGLE_APPLICATION_CREDENTIALS =
      process.env.GOOGLE_APPLICATION_CREDENTIALS || "./gcloud-credentials.json";
  }
}

// ✅ Set env var BEFORE initializing
const speechClient = new speech.SpeechClient();
const translateClient = new Translate();
const visionClient = new ImageAnnotatorClient();

export { speechClient, translateClient, visionClient };
