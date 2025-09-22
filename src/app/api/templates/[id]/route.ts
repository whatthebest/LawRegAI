// app/api/templates/[id]/route.ts
import { NextResponse } from "next/server";
import { cert, getApps, initializeApp, getApp, type App } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

const fieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(["Text", "Number", "Checklist", "Person"]),
});

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
    fields: Array.isArray(payload.fields) ? payload.fields : [],
    relevantSopId: payload?.relevantSopId,
    createdAt: createdAtIso,
    ...(updatedAtIso ? { updatedAt: updatedAtIso } : {}),
  };
}

async function resolveTemplateKey(decodedId: string): Promise<string | null> {
  const db = getDatabase(getFirebaseAdminApp());

  const direct = await db.ref(`templates/${decodedId}`).get();
  if (direct.exists()) {
    return decodedId;
  }

  const byTemplateId = await db
    .ref("templates")
    .orderByChild("templateId")
    .equalTo(decodedId)
    .limitToFirst(1)
    .get();
  if (byTemplateId.exists()) {
    const [key] = Object.keys(byTemplateId.val());
    return key;
  }

  const byId = await db
    .ref("templates")
    .orderByChild("id")
    .equalTo(decodedId)
    .limitToFirst(1)
    .get();
  if (byId.exists()) {
    const [key] = Object.keys(byId.val());
    return key;
  }

  return null;
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    let decodedId: string;
    try {
      decodedId = decodeURIComponent(rawId);
    } catch {
      return NextResponse.json({ error: "invalid_template_id" }, { status: 400 });
    }

    const key = await resolveTemplateKey(decodedId);
    if (!key) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const db = getDatabase(getFirebaseAdminApp());
    const snap = await db.ref(`templates/${key}`).get();
    if (!snap.exists()) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json(
      { template: normalizeTemplate(key, snap.val()) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    const message = error?.message ?? "unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    let decodedId: string;
    try {
      decodedId = decodeURIComponent(rawId);
    } catch {
      return NextResponse.json({ error: "invalid_template_id" }, { status: 400 });
    }

    const key = await resolveTemplateKey(decodedId);
    if (!key) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const raw = await req.json().catch(() => ({}));
    const payload = sanitize(raw) ?? {};
    
    const updates: Record<string, any> = {};
    if (typeof payload?.title === "string") updates.title = payload.title.trim();
    if (typeof payload?.description === "string") updates.description = payload.description.trim();
    if (Array.isArray(payload.fields)) {
        const parsed = z.array(fieldSchema).safeParse(payload.fields);
        if (parsed.success) {
            updates.fields = parsed.data;
        }
    }
    if (typeof payload?.relevantSopId === 'string') {
        updates.relevantSopId = payload.relevantSopId;
    }


    const validUpdates = Object.entries(updates).filter(([k, value]) => {
      if (k === 'fields') return Array.isArray(value) && value.length > 0;
      return typeof value === "string" && value.length > 0
    });
    const prepared = Object.fromEntries(validUpdates);

    if (!Object.keys(prepared).length) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const db = getDatabase(getFirebaseAdminApp());
    const now = Date.now();

    await db.ref(`templates/${key}`).update({ ...prepared, updatedAt: now });

    const snap = await db.ref(`templates/${key}`).get();
    if (!snap.exists()) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: "Template updated successfully",
        template: normalizeTemplate(key, snap.val()),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    const message = error?.message ?? "unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
