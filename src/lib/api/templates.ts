// src/lib/api/templates.ts
import type { DocumentTemplate, TemplateField } from "@/lib/types";

export interface TemplatePayload {
  title: string;
  description: string;
  fields: TemplateField[];
}

export type TemplateRecord = DocumentTemplate & {
  templateId: string;
  key?: string;
  templateIndex?: number;
  updatedAt?: string;
};

const toIso = (value: any): string | undefined => {
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
};

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 10_000
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeTemplate(data: any): TemplateRecord {
  const id = data?.id ?? data?.templateId ?? data?.key;
  const templateId = data?.templateId ?? id;
  const createdAt = toIso(data?.createdAt) ?? new Date().toISOString();
  const updatedAt = toIso(data?.updatedAt);

  return {
    id: String(id ?? ""),
    templateId: String(templateId ?? ""),
    title: String(data?.title ?? ""),
    description: String(data?.description ?? ""),
    fields: Array.isArray(data?.fields) ? data.fields : [],
    createdAt,
    ...(updatedAt ? { updatedAt } : {}),
    ...(typeof data?.templateIndex === "number" ? { templateIndex: data.templateIndex } : {}),
    ...(data?.key ? { key: String(data.key) } : {}),
  };
}

export async function fetchTemplates(): Promise<TemplateRecord[]> {
  const res = await fetchWithTimeout("/api/templates", {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error((await res.text().catch(() => res.statusText)) || res.statusText);
  }

  const payload = await res.json();
  const list = Array.isArray(payload) ? payload : [];

  return list.map((entry) => normalizeTemplate(entry));
}

export async function createTemplate(body: TemplatePayload): Promise<TemplateRecord> {
  const res = await fetchWithTimeout("/api/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error((await res.text().catch(() => res.statusText)) || res.statusText);
  }

  const payload = await res.json();
  const template = payload?.template ?? payload;

  return normalizeTemplate(template);
}

export async function updateTemplate(id: string, body: Partial<TemplatePayload>): Promise<TemplateRecord> {
  const res = await fetchWithTimeout(`/api/templates/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error((await res.text().catch(() => res.statusText)) || res.statusText);
  }

  const payload = await res.json();
  const template = payload?.template ?? payload;

  return normalizeTemplate(template);
}
