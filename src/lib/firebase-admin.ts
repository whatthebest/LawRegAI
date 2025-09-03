// src/lib/firebase-admin.ts
import { cert, getApps, initializeApp, getApp, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

export function getFirebaseAdminApp(): App {
  if (getApps().length) return getApp();
  const projectId = process.env.FIREBASE_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const databaseURL = process.env.FIREBASE_DATABASE_URL!;
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), databaseURL });
}

export const adminAuth = () => getAuth(getFirebaseAdminApp());
export const adminDb = () => getDatabase(getFirebaseAdminApp());
