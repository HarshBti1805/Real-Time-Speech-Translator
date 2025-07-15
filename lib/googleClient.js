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
// const visionClient = new ImageAnnotatorClient({
//   client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
//   private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, "\n"),
// });

// export { speechClient, translateClient, visionClient };

// // import speech from "@google-cloud/speech";
// // import { Translate } from "@google-cloud/translate/build/src/v2";
// // import { ImageAnnotatorClient } from "@google-cloud/vision";

// // // Create full credentials object
// // const credentials = {
// //   type: "service_account",
// //   project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
// //   private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
// //   private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, "\n"),
// //   client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
// //   client_id: process.env.GOOGLE_CLIENT_ID,
// //   auth_uri:
// //     process.env.GOOGLE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
// //   token_uri:
// //     process.env.GOOGLE_TOKEN_URI || "https://oauth2.googleapis.com/token",
// //   auth_provider_x509_cert_url:
// //     process.env.GOOGLE_AUTH_PROVIDER_x509_CERT_URL ||
// //     "https://www.googleapis.com/oauth2/v1/certs",
// //   client_x509_cert_url: process.env.GOOGLE_CLIENT_x509_CERT_URL,
// //   universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN || "googleapis.com",
// // };

// // // Alternative configuration for different clients
// // const restConfig = {
// //   projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
// //   credentials,
// //   fallback: true, // Use REST instead of gRPC
// // };

// // // Initialize clients with REST fallback
// // const speechClient = new speech.SpeechClient(restConfig);
// // const translateClient = new Translate(restConfig);
// // const visionClient = new ImageAnnotatorClient(restConfig);

// // export { speechClient, translateClient, visionClient };

// lib/googleClient.ts
import speech from "@google-cloud/speech";
import { Translate } from "@google-cloud/translate/build/src/v2";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import textToSpeech from "@google-cloud/text-to-speech";

// Create full credentials object
const credentials = {
  type: "service_account",
  project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
  private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: process.env.GOOGLE_AUTH_URI,
  token_uri: process.env.GOOGLE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_x509_CERT_URL,
  client_x509_cert_url: process.env.GOOGLE_CLIENT_x509_CERT_URL,
  universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
};

// Configuration object - consistent for all clients
const config = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials,
  fallback: true,
  apiEndpoint: "texttospeech.googleapis.com", // <-- FIXED
};

// Validate required environment variables
const requiredEnvVars = [
  "GOOGLE_CLOUD_PROJECT_ID",
  "GOOGLE_CLOUD_PRIVATE_KEY",
  "GOOGLE_CLOUD_CLIENT_EMAIL",
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  console.error("Missing required environment variables:", missingEnvVars);
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
}

// Initialize clients with consistent configuration
let speechClient;
let translateClient;
let visionClient;
let ttsClient;

try {
  speechClient = new speech.SpeechClient(config);
  translateClient = new Translate(config);
  visionClient = new ImageAnnotatorClient({
    credentials: {
      client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  });
  // console.log("TTS config:", config);
  ttsClient = new textToSpeech.TextToSpeechClient(config);
  console.log("Google Cloud clients initialized successfully");
} catch (error) {
  console.error("Failed to initialize Google Cloud clients:", error);
  throw error;
}

export { speechClient, translateClient, visionClient, ttsClient };
