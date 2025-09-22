// app/api/templates/route.ts
import { NextResponse } from "next/server";
import { cert, getApps, initializeApp, getApp, type App } from "firebase-admin/app";
import { getDatabase, type DataSnapshot } from "firebase-admin/database";
import { getSessionUser } from "@/lib/auth-server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const fieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(["Text", "Number", "Checklist", "Person"]),
});

function getFirebaseAdminApp(): App {
  if (getApps().length) return getApp();

  const projectId = process.env.FIREBASE_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
  const pk = process.env.FIREBASE_PRIVATE_KEY!;
  const databaseURL = process.env.FIREBASE_DATABASE_URL!;

  const privateKey = pk.replace(/\\n/g, "\n");

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    databaseURL,
  });
}

function toIso(value: any): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return undefined;
}

function sanitize(value: any): any {
  if (value === undefined) return undefined;
  if (typeof value === "number" && Number.isNaN(value)) return undefined;

  if (Array.isArray(value)) {
    return value.map(sanitize).filter((entry) => entry !== undefined);
  }
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      const sanitized = sanitize(val);
      if (sanitized !== undefined) out[key] = sanitized;
    }
    return out;
  }
  return value;
}

function normalizeTemplate(key: string, payload: any) {
  const createdAtIso = toIso(payload?.createdAt) ?? new Date().toISOString();
  const updatedAtIso = toIso(payload?.updatedAt);
  const templateId = payload?.templateId ?? payload?.id ?? key;

  return {
    key,
    id: templateId,
    templateId,
    templateIndex: typeof payload?.templateIndex === "number" ? payload.templateIndex : undefined,
    title: String(payload?.title ?? ""),
    description: String(payload?.description ?? ""),
    fields: Array.isArray(payload?.fields) ? payload.fields : [],
    relevantSopId: payload?.relevantSopId,
    createdAt: createdAtIso,
    ...(updatedAtIso ? { updatedAt: updatedAtIso } : {}),
  };
}

async function getHighestIndex(): Promise<number> {
  const db = getDatabase(getFirebaseAdminApp());
  try {
    const snap = await db.ref("templates").orderByChild("templateIndex").limitToLast(1).get();
    if (!snap.exists()) return 0;
    let max = 0;
    snap.forEach((child) => {
      const idx = child.child("templateIndex").val();
      if (typeof idx === "number" && idx > max) max = idx;
    });
    return max;
  } catch {
    return 0;
  }
}

function withTimeout<T>(promise: Promise<T>, ms = 9000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Upstream timeout")), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function GET() {
  try {
    const db = getDatabase(getFirebaseAdminApp());
    const snap = await withTimeout(db.ref("templates").get());

    const templates: any[] = [];
    if (snap.exists()) {
      const val = snap.val() as Record<string, any>;
      for (const [key, entry] of Object.entries(val)) {
        templates.push(normalizeTemplate(key, entry));
      }
    }

    return NextResponse.json(templates, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    const message = error?.message ?? "Internal error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  try {
    const db = getDatabase(getFirebaseAdminApp());

    const raw = await req.json();
    const payload = sanitize(raw) ?? {};

    const title = typeof payload?.title === "string" ? payload.title.trim() : "";
    const description = typeof payload?.description === "string" ? payload.description.trim() : "";
    const fields = Array.isArray(payload.fields) ? payload.fields : [];
    const relevantSopId = payload?.relevantSopId;
    
    const parsedFields = z.array(fieldSchema).safeParse(fields);

    if (!title || !description || !parsedFields.success) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const highest = await getHighestIndex();
    const counterRef = db.ref("meta/templateCounter");

    const newIndex: number = await new Promise((resolve, reject) => {
      counterRef.transaction(
        (current) => {
          const base = typeof current === "number" ? current : highest;
          return base + 1;
        },
        (error: unknown, committed: boolean, snapshot?: DataSnapshot | null) => {
          if (error) return reject(error);
          if (!committed || !snapshot) return reject(new Error("Counter transaction not committed"));
          const val = snapshot.val();
          if (typeof val !== "number") return reject(new Error("Invalid counter value"));
          resolve(val);
        },
        false
      );
    });

    const templateId = `tpl-${String(newIndex).padStart(3, "0")}`;
    const now = Date.now();
    const newRef = db.ref("templates").push();

    const sessionUser = await getSessionUser().catch(() => null);

    const record = {
      title,
      description,
      fields: parsedFields.data,
      templateId,
      templateIndex: newIndex,
      createdAt: now,
      updatedAt: now,
      relevantSopId: relevantSopId || undefined,
      ...(sessionUser?.email ? { createdBy: sessionUser.email } : {}),
    };

    await newRef.set(record);

    return NextResponse.json(
      {
        message: "Template created successfully",
        template: normalizeTemplate(newRef.key!, record),
      },
      { status: 201 }
    );
  } catch (error: any) {
    const message = error?.message ?? String(error);
    console.error("[POST /api/templates] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
