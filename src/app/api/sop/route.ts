// /app/api/sop/route.ts
import { NextResponse } from 'next/server';
import { cert, getApps, initializeApp, getApp, App } from 'firebase-admin/app';
import { getDatabase, type DataSnapshot } from 'firebase-admin/database';

export const runtime = 'nodejs'; // ensure Node (not Edge)

function getFirebaseAdminApp(): App {
  if (getApps().length) return getApp();

  const projectId = process.env.FIREBASE_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');
  const databaseURL = process.env.FIREBASE_DATABASE_URL!;

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    databaseURL,
  });
}

/** GET: preview next SOP id for the form (non-atomic) */
export async function GET() {
  const app = getFirebaseAdminApp();
  const db = getDatabase(app);

  const snap = await db.ref('meta/sopCounter').get();
  const nextIndex = (snap.val() || 0) + 1;
  const nextSopId = `sop-${String(nextIndex).padStart(3, '0')}`;

  return NextResponse.json({ nextSopId, nextIndex });
}

/** POST: create SOP and atomically assign next id */
export async function POST(req: Request) {
  try {
    const sopData = await req.json();

    const app = getFirebaseAdminApp();
    const db = getDatabase(app);

    // Atomically increment counter and get new value
    const counterRef = db.ref('meta/sopCounter');
    const newIndex: number = await new Promise((resolve, reject) => {
      counterRef.transaction(
        (cur) => (cur || 0) + 1,
        (error: unknown, committed: boolean, snapshot?: DataSnapshot | null) => {
          if (error) return reject(error);
          if (!committed || !snapshot) {
            return reject(new Error('Counter transaction not committed'));
          }
          const val = snapshot.val();
          if (typeof val !== 'number') {
            return reject(new Error('Invalid counter value'));
          }
          resolve(val);
        },
        false
      );
    });

    const sopId = `sop-${String(newIndex).padStart(3, '0')}`;

    const newRef = db.ref('sops').push();
    await newRef.set({
      ...sopData,
      sopId,
      sopIndex: newIndex,
      createdAt: Date.now(),
    });

    return NextResponse.json(
      { message: 'SOP created successfully', sopId, sopIndex: newIndex, key: newRef.key },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API /api/sop] Write failed:', error?.code, error?.message, error);
    return NextResponse.json(
      { error: error?.message || 'An error occurred while creating the SOP' },
      { status: 500 }
    );
  }
}
