import "server-only";

import {
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export function getAdminServices() {
  const appName = "geopolitics-server";

  let app = getApps().find(
    (existing) => existing.name === appName,
  );

  if (!app) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !rawPrivateKey) {
      throw new Error(
        "The Firebase server environment is not configured.",
      );
    }

    const publicProjectId =
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (
      publicProjectId &&
      publicProjectId !== projectId
    ) {
      throw new Error(
        "The client and server Firebase project IDs do not match.",
      );
    }

    app = initializeApp(
      {
        credential: cert({
          projectId,
          clientEmail,
          privateKey: rawPrivateKey.replace(/\\n/g, "\n"),
        }),
      },
      appName,
    );
  }

  return {
    adminAuth: getAuth(app),
    adminDb: getFirestore(app),
  };
}