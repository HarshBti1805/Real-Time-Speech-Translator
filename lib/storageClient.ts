// lib/storageClient.ts
import { Storage } from "@google-cloud/storage";

// Create credentials object
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

// Storage-specific configuration with proper API endpoint
const storageConfig = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials,
  apiEndpoint: "https://storage.googleapis.com",
};

// Initialize storage client
export const storageClient = new Storage(storageConfig);
