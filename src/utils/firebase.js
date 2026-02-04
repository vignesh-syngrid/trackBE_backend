import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import admin from "firebase-admin";

dotenv.config();

let initialized = false;

export function initFirebase() {
  if (initialized) return initialized;

  // Read optional storage bucket
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  // Try to load a service account first if any related env is present.
  // This allows preferring service-account.json over placeholder env values.
  let serviceAccount = null;
  const inlineJSON = process.env.FIREBASE_SERVICE_ACCOUNT;
  const credsPath = process.env.FIREBASE_CREDENTIALS_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;

  // JSON from env (raw or base64)
  if (inlineJSON) {
    try {
      serviceAccount = JSON.parse(inlineJSON);
    } catch (_) {
      try {
        const decoded = Buffer.from(inlineJSON, "base64").toString("utf8");
        serviceAccount = JSON.parse(decoded);
      } catch (_) {
        serviceAccount = null;
      }
    }
  }
  // File path to JSON
  if (!serviceAccount && credsPath) {
    try {
      const full = path.resolve(process.cwd(), credsPath);
      const raw = fs.readFileSync(full, "utf8");
      serviceAccount = JSON.parse(raw);
    } catch (_) {
      serviceAccount = null;
    }
  }

  // Build credential fields
  let projectId = process.env.FIREBASE_PROJECT_ID || undefined;
  let clientEmail = process.env.FIREBASE_CLIENT_EMAIL || undefined;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || undefined;

  // Treat common placeholder values as missing
  const isPlaceholder = (v) => typeof v === "string" && /your_firebase_(client_email|private_key)/i.test(v);
  if (isPlaceholder(clientEmail)) clientEmail = undefined;
  if (isPlaceholder(privateKey)) privateKey = undefined;

  // Prefer service account when available
  if (serviceAccount) {
    projectId = serviceAccount.project_id || projectId;
    clientEmail = serviceAccount.client_email || clientEmail;
    privateKey = serviceAccount.private_key || privateKey;
  }

  // Handle newline-escaped private keys from env files
  if (privateKey && privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  // Validate we have what we need
  if (!projectId || !clientEmail || !privateKey) {
    initialized = false;
    return initialized;
  }

  try {
    const initOptions = {
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    };
    if (storageBucket) initOptions.storageBucket = storageBucket;
    admin.initializeApp(initOptions);
    initialized = true;
  } catch (e) {
    // If already initialized or failed, set flag accordingly
    if (e?.message?.includes("already exists")) initialized = true;
    else initialized = false;
  }
  return initialized;
}

export function isFirebaseReady() {
  return initialized;
}

export async function verifyIdToken(idToken) {
  if (!initialized) initFirebase();
  if (!initialized) throw new Error("Firebase not configured on server");
  const decoded = await admin.auth().verifyIdToken(idToken);
  return decoded;
}
