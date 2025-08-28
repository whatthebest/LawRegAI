// app/create-sop/page.tsx
import CreateSopForm from "./CreateSopForm";
import { cert, getApps, initializeApp, getApp, type App } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs"; // ensure firebase-admin runs on Node, not Edge

function getFirebaseAdminApp(): App {
  if (getApps().length) return getApp();
  const projectId = process.env.FIREBASE_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const databaseURL = process.env.FIREBASE_DATABASE_URL!;
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), databaseURL });
}

async function getNextSopId(): Promise<string> {
  try {
    const db = getDatabase(getFirebaseAdminApp());

    // read highest sopIndex
    const highestSnap = await db.ref("sops").orderByChild("sopIndex").limitToLast(1).get();
    let highest = 0;
    if (highestSnap.exists()) {
      highestSnap.forEach((ch) => {
        const idx = ch.child("sopIndex").val();
        if (typeof idx === "number" && idx > highest) highest = idx;
      });
    }

    // read counter (in case it’s ahead)
    const counterSnap = await db.ref("meta/sopCounter").get();
    const counter = typeof counterSnap.val() === "number" ? counterSnap.val() : 0;

    const nextIndex = Math.max(highest, counter) + 1;
    return `sop-${String(nextIndex).padStart(3, "0")}`;
  } catch (e) {
    console.warn("[create-sop] SSR compute failed:", e);
    return "sop-001";
  }
}

export default async function Page() {
  const initialSopId = await getNextSopId(); // should be sop-002 given your DB screenshot
  return <CreateSopForm initialSopId={initialSopId} />;
}
