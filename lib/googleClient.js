// import speech from "@google-cloud/speech";
// import { Translate } from "@google-cloud/translate/build/src/v2";
// import { ImageAnnotatorClient } from "@google-cloud/vision";

// // Create full credentials object
// const credentials = {
//   type: "service_account",
//   project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
//   private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
//   private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, "\n"),
//   client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
//   client_id: process.env.GOOGLE_CLIENT_ID,
//   auth_uri: process.env.GOOGLE_AUTH_URI,
//   token_uri: process.env.GOOGLE_TOKEN_URI,
//   auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_x509_CERT_URL,
//   client_x509_cert_url: process.env.GOOGLE_CLIENT_x509_CERT_URL,
//   universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
// };

// // Configuration object
// const config = {
//   projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
//   credentials,
// };

// // Initialize clients with explicit credentials
// const speechClient = new speech.SpeechClient(config);
// const translateClient = new Translate(config);
// const visionClient = new ImageAnnotatorClient(config);

// export { speechClient, translateClient, visionClient };

import { SpeechClient } from "@google-cloud/speech";
import { Translate } from "@google-cloud/translate/build/src/v2";
import { ImageAnnotatorClient } from "@google-cloud/vision";

// Validate required environment variables
const requiredEnvVars = [
  "GOOGLE_CLOUD_PROJECT_ID",
  "GOOGLE_CLOUD_PRIVATE_KEY_ID",
  "GOOGLE_CLOUD_PRIVATE_KEY",
  "GOOGLE_CLOUD_CLIENT_EMAIL",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Create credentials object with proper validation
const credentials = {
  type: "service_account",
  project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
  private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID || "",
  auth_uri:
    process.env.GOOGLE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
  token_uri:
    process.env.GOOGLE_TOKEN_URI || "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url:
    process.env.GOOGLE_AUTH_PROVIDER_x509_CERT_URL ||
    "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    process.env.GOOGLE_CLIENT_x509_CERT_URL ||
    `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(
      process.env.GOOGLE_CLOUD_CLIENT_EMAIL
    )}`,
  universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN || "googleapis.com",
};

// Configuration object
const config = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials,
};

// Initialize clients with error handling
let speechClient, translateClient, visionClient;

try {
  speechClient = new SpeechClient(config);
  translateClient = new Translate(config);
  visionClient = new ImageAnnotatorClient(config);
} catch (error) {
  console.error("Failed to initialize Google Cloud clients:", error);
  throw error;
}

export { speechClient, translateClient, visionClient };
