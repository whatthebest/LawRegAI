// src/lib/urls.ts

/**
 * Safely decodes a URI component value without corrupting literal percent signs.
 * When decoding would change the canonical encoding (e.g. malformed sequences),
 * the original value is returned unchanged.
 */
export function safeDecodeURIComponent(value: string): string {
    try {
      const decoded = decodeURIComponent(value);
      const normalizedOriginal = value.replace(/%[0-9a-fA-F]{2}/g, (match) => match.toUpperCase());
  
      return encodeURIComponent(decoded) === normalizedOriginal ? decoded : value;
    } catch {
      return value;
    }
  }