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

export async function fetchSopsByStatus(status: SopStatus): Promise<SOP[]> {
  const res = await fetch(`/api/sops?status=${encodeURIComponent(status)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  const list = await res.json();

  return (Array.isArray(list) ? list : []).map((sop: any): SOP => ({
    ...sop,
    id: sop.id ?? sop.sopId ?? sop.key,
    sopId: sop.sopId ?? sop.id ?? sop.key,
    createdAt: toIso(sop.createdAt)!,         // SOP.createdAt is string in your types
    updatedAt: toIso(sop.updatedAt)!,         // SOP.updatedAt is string (required in your types)
    submittedBy: sop.submittedBy ?? sop.createdBy ?? sop.owner, // keep if backend provides
  }));
}

export async function patchSopStatus(
  sopIdOrKey: string,
  nextStatus: 'Approved' | 'Draft'
): Promise<SOP> {
  const res = await fetch(`/api/sops/${encodeURIComponent(sopIdOrKey)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ status: nextStatus }),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  const updated = await res.json();

  return {
    ...updated,
    id: updated.id ?? updated.sopId ?? updated.key,
    sopId: updated.sopId ?? updated.id ?? updated.key,
    createdAt: toIso(updated.createdAt)!,
    updatedAt: toIso(updated.updatedAt) ?? new Date().toISOString(),
    submittedBy: updated.submittedBy ?? updated.createdBy ?? updated.owner,
  };
}

