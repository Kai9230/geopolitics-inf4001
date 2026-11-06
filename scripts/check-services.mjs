// Read-only diagnostics. Never prints keys, tokens, email addresses or provider messages.
import fs from "node:fs";
import { createPrivateKey } from "node:crypto";
import { cert, initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
const required = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
const missing = required.filter(name => !process.env[name]?.trim());
if (missing.length) {
  console.error("Missing server settings:", missing.join(", "));
  process.exitCode = 1;
} else if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== process.env.FIREBASE_PROJECT_ID) {
  console.error("FAIL: browser and server Firebase project IDs differ.");
  process.exitCode = 1;
} else {
  let app;
  let stage = "private-key-format";
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
    createPrivateKey(privateKey);
    console.log("PASS: private key parses locally.");
    app = initializeApp({ credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }) }, "geopolitics-read-only-check");
    stage = "server-credential";
    await app.options.credential.getAccessToken();
    console.log("PASS: Firebase server credential obtains an access token.");
    stage = "authentication-permission";
    await getAuth(app).listUsers(1);
    console.log("PASS: Firebase Authentication is reachable with server permissions.");
    stage = "firestore-connection";
    await getFirestore(app).collection("campaigns").limit(1).get();
    console.log("PASS: Firestore is reachable. No documents changed.");
  } catch (error) {
    const raw = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
    const code = /^[a-z0-9_/-]{1,90}$/i.test(raw) ? raw : "unknown";
    console.error(`FAIL: ${stage}; code=${code}`);
    console.error("Check that the service account belongs to this project and its key is active; also check your connection and computer clock.");
    process.exitCode = 1;
  } finally {
    if (app) await deleteApp(app);
  }
}
console.log(process.env.GROQ_API_KEY?.trim()
  ? "AI key is present. A real battle showing an AI-labelled report is still required."
  : "AI key is missing. Set GROQ_API_KEY on the server for the required LLM commentary.");
