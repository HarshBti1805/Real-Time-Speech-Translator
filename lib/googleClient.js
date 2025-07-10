import speech from "@google-cloud/speech";
import { Translate } from "@google-cloud/translate/build/src/v2";
import { ImageAnnotatorClient } from "@google-cloud/vision";

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

// Configuration object
const config = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials,
};

// Initialize clients with explicit credentials
const speechClient = new speech.SpeechClient(config);
const translateClient = new Translate(config);
const visionClient = new ImageAnnotatorClient(config);

export { speechClient, translateClient, visionClient };
