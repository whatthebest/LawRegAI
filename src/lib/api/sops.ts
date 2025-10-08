// src/lib/api/sops.ts
import type { SOP, SopStatusAction, SopStatusEvent } from '@/lib/types';

export type SopStatus = 'Approved' | 'In Review' | 'Draft' | 'Archived';

const allowedActions: SopStatusAction[] = ['submitted', 'approved', 'rejected', 'returned', 'updated'];

// If your backend might send seconds, this handles both seconds & ms & strings.
const toIso = (v: any): string | undefined => {
  if (v == null) return undefined;
  if (typeof v === 'number') {
    const ms = v < 1e12 ? v * 1000 : v; // seconds vs ms
    return new Date(ms).toISOString();
  }
  return new Date(v).toISOString();
};

const safeString = (value: any): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.normalize('NFC').trim();
  return trimmed.length ? trimmed : undefined;
};

const normalizeEmail = (value: any): string | undefined => {
  const trimmed = safeString(value);
  return trimmed ? trimmed.toLowerCase() : undefined;
};

const coerceHistory = (history: any): SopStatusEvent[] | undefined => {
  if (!Array.isArray(history)) return undefined;

  const events: SopStatusEvent[] = history
    .map((entry: any) => {
      const statusRaw = safeString(entry?.status);
      const decidedAt = toIso(entry?.decidedAt ?? entry?.timestamp ?? entry?.at ?? entry?.date);
      if (!statusRaw || !decidedAt) return undefined;

      const decidedBy = safeString(entry?.decidedBy ?? entry?.actorName ?? entry?.by);
      const decidedByEmail = normalizeEmail(entry?.decidedByEmail ?? entry?.actorEmail ?? entry?.email);
      const comment = safeString(entry?.comment ?? entry?.note ?? entry?.remarks);
      const previousStatusRaw = safeString(entry?.previousStatus);
      const actionRaw = safeString(entry?.action)?.toLowerCase();
      const action = allowedActions.includes(actionRaw as SopStatusAction)
        ? (actionRaw as SopStatusAction)
        : undefined;

      return {
        status: statusRaw as SopStatus,
        decidedAt,
        ...(decidedBy ? { decidedBy } : {}),
        ...(decidedByEmail ? { decidedByEmail } : {}),
        ...(comment ? { comment } : {}),
        ...(action ? { action } : {}),
        ...(previousStatusRaw ? { previousStatus: previousStatusRaw as SopStatus } : {}),
      } satisfies SopStatusEvent;
    })
    .filter((event): event is SopStatusEvent => Boolean(event));

  if (!events.length) return undefined;

  events.sort((a, b) => new Date(a.decidedAt).getTime() - new Date(b.decidedAt).getTime());
  return events;
};

const normalizeSopRecord = (sop: any): SOP => {
  const submittedByRaw = [
    sop.submittedBy,
    sop.createdBy,
    sop.owner,
    sop.responsiblePerson,
  ].find((value) => typeof value === 'string' && value.trim().length > 0);
  const submittedBy = safeString(submittedByRaw);

  const submittedByEmail =
    normalizeEmail(sop.submittedByEmail) ||
    normalizeEmail(sop.submitterEmail) ||
    normalizeEmail(sop.ownerEmail);

  const submitterUid =
    safeString(sop.submitterUid) ||
    safeString(sop.submitterUID) ||
    safeString(sop.creatorUid) ||
    safeString(sop.uid);

  const managerEmail =
    normalizeEmail(sop.managerEmail) ||
    normalizeEmail(sop.manager_email);

  const managerName =
    safeString(sop.managerName) ||
    safeString(sop.manager_name);

  const managerComment = safeString(sop.managerComment ?? sop.manager_comment ?? sop.lastManagerComment);
  const statusHistory = coerceHistory(sop.statusHistory);

  const normalized: SOP = {
    ...sop,
    id: sop.id ?? sop.sopId ?? sop.key,
    sopId: sop.sopId ?? sop.id ?? sop.key,
    createdAt: toIso(sop.createdAt)!,
    updatedAt: toIso(sop.updatedAt ?? sop.modifiedAt ?? sop.updated_on) ?? toIso(sop.createdAt)!,
    managerComment: managerComment ?? null,
    ...(submittedBy ? { submittedBy } : {}),
    ...(submittedByEmail ? { submittedByEmail } : {}),
    ...(submitterUid ? { submitterUid } : {}),
    ...(managerEmail ? { managerEmail } : {}),
    ...(managerName ? { managerName } : {}),
    ...(statusHistory ? { statusHistory } : {}),
  };

  return normalized;
};

// Helper to add a timeout to fetch requests.
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 10_000
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchSopsByStatus(status: SopStatus): Promise<SOP[]> {
  const res = await fetchWithTimeout(`/api/sops?status=${encodeURIComponent(status)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  const list = await res.json();

  return (Array.isArray(list) ? list : []).map(normalizeSopRecord);
}

export async function patchSopStatus(
  sopIdOrKey: string,
  nextStatus: 'Approved' | 'Draft',
  comment?: string
): Promise<SOP> {
  const res = await fetchWithTimeout(`/api/sops/${encodeURIComponent(sopIdOrKey)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ status: nextStatus, comment }),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  const updated = await res.json();

  return normalizeSopRecord(updated);
}


