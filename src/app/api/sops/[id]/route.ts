// app/api/sops/[id]/route.ts
import { NextResponse } from "next/server";
import { getDatabase } from "firebase-admin/database";
import { cert, getApps, initializeApp, getApp, type App } from "firebase-admin/app";
import { requireSession, requireAdminLike } from "@/lib/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const allowedHistoryActions = new Set(["submitted", "approved", "rejected", "returned", "updated"]);

/* ---------- Firebase Admin singleton (same as /api/sops/route.ts) ---------- */
function getFirebaseAdminApp(): App {
  if (getApps().length) return getApp();
  const projectId = process.env.FIREBASE_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
  const pk = process.env.FIREBASE_PRIVATE_KEY!;
  const databaseURL = process.env.FIREBASE_DATABASE_URL!;
  const privateKey = pk.replace(/\\n/g, "\n");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), databaseURL });
}

const safeString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.normalize("NFC").trim();
  return trimmed.length ? trimmed : undefined;
};

const normalizeEmail = (value: unknown): string | undefined => {
  const trimmed = safeString(value);
  return trimmed ? trimmed.toLowerCase() : undefined;
};

const toIso = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

/** Normalize steps to an array. If steps is an object, convert entries to an array and preserve a stable id. */
function normalizeSteps(steps: any): any[] {
  if (Array.isArray(steps)) return steps;
  if (steps && typeof steps === "object") {
    return Object.entries(steps).map(([k, v]: [string, any]) => {
      const obj = v ?? {};
      const id = obj.id ?? obj.stepId ?? k;
      return { id, ...obj };
    });
  }
  return [];
}

const cleanHistoryEntryForStore = (entry: any) => {
  const out: Record<string, any> = {};
  const status = safeString(entry?.status);
  if (status) out.status = status;
  const decidedAt = entry?.decidedAt;
  if (typeof decidedAt === "number" || typeof decidedAt === "string") out.decidedAt = decidedAt;
  const decidedBy = safeString(entry?.decidedBy);
  if (decidedBy) out.decidedBy = decidedBy;
  const decidedByEmail = normalizeEmail(entry?.decidedByEmail);
  if (decidedByEmail) out.decidedByEmail = decidedByEmail;
  const comment = safeString(entry?.comment);
  if (comment) out.comment = comment;
  const action = safeString(entry?.action)?.toLowerCase();
  if (action && allowedHistoryActions.has(action)) out.action = action;
  const previousStatus = safeString(entry?.previousStatus);
  if (previousStatus) out.previousStatus = previousStatus;
  return out;
};

const normalizeHistoryForResponse = (history: any): any[] | undefined => {
  if (!Array.isArray(history)) return undefined;
  const events = history
    .map((entry: any) => {
      const status = safeString(entry?.status);
      const decidedAtIso = toIso(entry?.decidedAt ?? entry?.timestamp ?? entry?.at ?? entry?.date);
      if (!status || !decidedAtIso) return undefined;
      const decidedBy = safeString(entry?.decidedBy);
      const decidedByEmail = normalizeEmail(entry?.decidedByEmail ?? entry?.actorEmail ?? entry?.email);
      const comment = safeString(entry?.comment ?? entry?.note ?? entry?.remarks);
      const action = safeString(entry?.action)?.toLowerCase();
      const previousStatus = safeString(entry?.previousStatus);
      const response: Record<string, any> = {
        status,
        decidedAt: decidedAtIso,
      };
      if (decidedBy) response.decidedBy = decidedBy;
      if (decidedByEmail) response.decidedByEmail = decidedByEmail;
      if (comment) response.comment = comment;
      if (action && allowedHistoryActions.has(action)) response.action = action;
      if (previousStatus) response.previousStatus = previousStatus;
      return response;
    })
    .filter(Boolean) as Array<Record<string, any>>;

  if (!events.length) return undefined;
  events.sort((a, b) => new Date(a.decidedAt).getTime() - new Date(b.decidedAt).getTime());
  return events;
};

const buildSopResponse = (raw: any, key?: string) => {
  const submittedByRaw = [
    raw?.submittedBy,
    raw?.createdBy,
    raw?.owner,
    raw?.responsiblePerson,
  ].find((value) => typeof value === 'string' && value.trim().length > 0);
  const submittedBy = safeString(submittedByRaw);

  const submittedByEmail =
    normalizeEmail(raw?.submittedByEmail) ||
    normalizeEmail(raw?.submitterEmail) ||
    normalizeEmail(raw?.ownerEmail);

  const submitterUid =
    safeString(raw?.submitterUid) ||
    safeString(raw?.submitterUID) ||
    safeString(raw?.creatorUid) ||
    safeString(raw?.uid);

  const managerEmail =
    normalizeEmail(raw?.managerEmail) ||
    normalizeEmail(raw?.manager_email);

  const managerName =
    safeString(raw?.managerName) ||
    safeString(raw?.manager_name);

  const managerComment = safeString(raw?.managerComment ?? raw?.manager_comment ?? raw?.lastManagerComment);
  const statusHistory = normalizeHistoryForResponse(raw?.statusHistory);

  return {
    key,
    ...raw,
    id: raw?.sopId ?? raw?.id ?? key,
    sopId: raw?.sopId ?? raw?.id ?? key,
    title: String(raw?.title ?? ''),
    steps: normalizeSteps(raw?.steps),
    createdAt: toIso(raw?.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(raw?.updatedAt) ?? new Date().toISOString(),
    managerComment: managerComment ?? null,
    ...(submittedBy ? { submittedBy } : {}),
    ...(submittedByEmail ? { submittedByEmail } : {}),
    ...(submitterUid ? { submitterUid } : {}),
    ...(managerEmail ? { managerEmail } : {}),
    ...(managerName ? { managerName } : {}),
    ...(statusHistory ? { statusHistory } : {}),
  };
};

/* ---------- GET: get one SOP by id or key ---------- */
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const db = getDatabase(getFirebaseAdminApp());

    const direct = await db.ref(`sops/${id}`).get();
    if (direct.exists()) {
      const v = direct.val();
      return NextResponse.json(buildSopResponse(v, id), { headers: { "Cache-Control": "no-store" } });
    }

    const bySopId = await db.ref("sops").orderByChild("sopId").equalTo(id).get();
    if (bySopId.exists()) {
      const [key, v] = Object.entries(bySopId.val())[0] as [string, any];
      return NextResponse.json(buildSopResponse(v, key), { headers: { "Cache-Control": "no-store" } });
    }

    const byId = await db.ref("sops").orderByChild("id").equalTo(id).get();
    if (byId.exists()) {
      const [key, v] = Object.entries(byId.val())[0] as [string, any];
      return NextResponse.json(buildSopResponse(v, key), { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ error: "not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "unexpected error" }, { status: 500 });
  }
}

/* ---------- PATCH: update status of a SOP ---------- */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await requireSession();
    const authz = await requireAdminLike(decoded);
    if (!authz.ok) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const status: any = body?.status;
    if (status !== "Approved" && status !== "Draft") {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }

    const comment = safeString(body?.comment);
    const actorEmail = normalizeEmail((decoded as any)?.email);
    const actorName = safeString((decoded as any)?.name ?? (decoded as any)?.displayName ?? (decoded as any)?.email);

    const db = getDatabase(getFirebaseAdminApp());
    const now = Date.now();

    const updateAndReturn = async (key: string) => {
      const ref = db.ref(`sops/${key}`);
      const currentSnap = await ref.get();
      if (!currentSnap.exists()) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      const current = currentSnap.val() ?? {};
      const existingHistory = Array.isArray(current.statusHistory)
        ? current.statusHistory
        : [];

      const eventForStore = cleanHistoryEntryForStore({
        status,
        decidedAt: now,
        decidedBy: actorName ?? safeString(current.managerName),
        decidedByEmail: actorEmail ?? normalizeEmail(current.managerEmail),
        comment,
        action: status === "Approved" ? "approved" : "rejected",
        previousStatus: safeString(current.status),
      });

      const historyForStore = [...existingHistory.map(cleanHistoryEntryForStore), eventForStore].filter(
        (entry) => Object.keys(entry).length > 0
      );

      await ref.update({
        status,
        updatedAt: now,
        managerComment: comment ?? null,
        statusHistory: historyForStore,
      });

      const updatedSnap = await ref.get();
      const updatedValue = updatedSnap.val();
      return NextResponse.json(buildSopResponse(updatedValue, key), {
        headers: { "Cache-Control": "no-store" },
      });
    };

    const direct = await db.ref(`sops/${id}`).get();
    if (direct.exists()) {
      return updateAndReturn(id);
    }

    const bySopId = await db
      .ref("sops")
      .orderByChild("sopId")
      .equalTo(id)
      .limitToFirst(1)
      .get();
    if (bySopId.exists()) {
      const [key] = Object.keys(bySopId.val());
      return updateAndReturn(key);
    }

    const byId = await db
      .ref("sops")
      .orderByChild("id")
      .equalTo(id)
      .limitToFirst(1)
      .get();
    if (byId.exists()) {
      const [key] = Object.keys(byId.val());
      return updateAndReturn(key);
    }

    return NextResponse.json({ error: "not_found" }, { status: 404 });
  } catch (err: any) {
    if (err?.message === "NO_SESSION") {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: err?.message || "unexpected error" },
      { status: 500 }
    );
  }
}

