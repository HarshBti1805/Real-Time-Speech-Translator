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

// Helper function to properly format private key
const formatPrivateKey = (key) => {
  if (!key) return null;

  // Remove any extra quotes and whitespace
  let formattedKey = key.trim();

  // Handle different possible formats
  if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
    formattedKey = formattedKey.slice(1, -1);
  }

  // Replace literal \n with actual newlines
  formattedKey = formattedKey.replace(/\\n/g, "\n");

  // Ensure proper PEM format
  if (!formattedKey.startsWith("-----BEGIN PRIVATE KEY-----")) {
    formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
  }

  // Fix any spacing issues
  formattedKey = formattedKey
    .replace(/-----BEGIN PRIVATE KEY-----\s*/g, "-----BEGIN PRIVATE KEY-----\n")
    .replace(/\s*-----END PRIVATE KEY-----/g, "\n-----END PRIVATE KEY-----");

  return formattedKey;
};

// Validate and format credentials
const getCredentials = () => {
  // Option 1: Use complete JSON credentials (recommended)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      const parsed = JSON.parse(
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
      );
      // Still format the private key within the JSON
      if (parsed.private_key) {
        parsed.private_key = formatPrivateKey(parsed.private_key);
      }
      return parsed;
    } catch (error) {
      console.error(
        "Error parsing GOOGLE_APPLICATION_CREDENTIALS_JSON:",
        error
      );
    }
  }

  // Option 2: Individual environment variables
  const privateKey = formatPrivateKey(process.env.GOOGLE_CLOUD_PRIVATE_KEY);

  if (!privateKey) {
    throw new Error("Private key is missing or invalid");
  }

  return {
    type: "service_account",
    project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
    private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
    private_key: privateKey,
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(
      process.env.GOOGLE_CLOUD_CLIENT_EMAIL
    )}`,
    universe_domain: "googleapis.com",
  };
};

let speechClient, translateClient, visionClient;

try {
  const credentials = getCredentials();

  const config = {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    credentials,
  };

  speechClient = new SpeechClient(config);
  translateClient = new Translate(config);
  visionClient = new ImageAnnotatorClient(config);
} catch (error) {
  console.error("Failed to initialize Google Cloud clients:", error);
  throw error;
}

export { speechClient, translateClient, visionClient };
