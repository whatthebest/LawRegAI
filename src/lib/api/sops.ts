// src/lib/api/sops.ts
import type { SOP } from '@/lib/types';

export type SopStatus = 'Approved' | 'In Review' | 'Draft' | 'Archived';

// If your backend might send seconds, this handles both seconds & ms & strings.
const toIso = (v: any): string | undefined => {
  if (v == null) return undefined;
  if (typeof v === 'number') {
    const ms = v < 1e12 ? v * 1000 : v;   // seconds vs ms
    return new Date(ms).toISOString();
  }
  // string or Date-like
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

  return (Array.isArray(list) ? list : []).map((sop: any): SOP => {
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

    return {
      ...sop,
      id: sop.id ?? sop.sopId ?? sop.key,
      sopId: sop.sopId ?? sop.id ?? sop.key,
      createdAt: toIso(sop.createdAt)!,         // SOP.createdAt is string in your types
      updatedAt: toIso(sop.updatedAt)!,         // SOP.updatedAt is string (required in your types)
      ...(submittedBy ? { submittedBy } : {}),
      ...(submittedByEmail ? { submittedByEmail } : {}),
      ...(submitterUid ? { submitterUid } : {}),
      ...(managerEmail ? { managerEmail } : {}),
      ...(managerName ? { managerName } : {}),
    };
  });
}

export async function patchSopStatus(
  sopIdOrKey: string,
  nextStatus: 'Approved' | 'Draft'
): Promise<SOP> {
  const res = await fetchWithTimeout(`/api/sops/${encodeURIComponent(sopIdOrKey)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ status: nextStatus }),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  const updated = await res.json();

  const submittedByRaw = [
    updated.submittedBy,
    updated.createdBy,
    updated.owner,
    updated.responsiblePerson,
  ].find((value) => typeof value === 'string' && value.trim().length > 0);
  const submittedBy = safeString(submittedByRaw);

  const submittedByEmail =
    normalizeEmail(updated.submittedByEmail) ||
    normalizeEmail(updated.submitterEmail) ||
    normalizeEmail(updated.ownerEmail);

  const submitterUid =
    safeString(updated.submitterUid) ||
    safeString(updated.submitterUID) ||
    safeString(updated.creatorUid) ||
    safeString(updated.uid);

  const managerEmail =
    normalizeEmail(updated.managerEmail) ||
    normalizeEmail(updated.manager_email);

  const managerName =
    safeString(updated.managerName) ||
    safeString(updated.manager_name);

  return {
    ...updated,
    id: updated.id ?? updated.sopId ?? updated.key,
    sopId: updated.sopId ?? updated.id ?? updated.key,
    createdAt: toIso(updated.createdAt)!,
    updatedAt: toIso(updated.updatedAt) ?? new Date().toISOString(),
    ...(submittedBy ? { submittedBy } : {}),
    ...(submittedByEmail ? { submittedByEmail } : {}),
    ...(submitterUid ? { submitterUid } : {}),
    ...(managerEmail ? { managerEmail } : {}),
    ...(managerName ? { managerName } : {}),
  };
}

