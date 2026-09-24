// Ingestion limits + media identification.
// File type is NEVER determined from extension alone: magic-byte/content
// signatures are verified first; the extension is only a tiebreak hint.

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
export const MAX_TEXT_CHARS = 2_000_000;
export const MAX_RECORDS_PER_FILE = 20_000;
export const MAX_EVIDENCE_PER_FILE = 2_000;

export interface MediaIdentification {
  mediaType: string;
  binary: boolean;
  archive: boolean;
  detail: string;
}

const MAGIC: Array<{ test: (b: Uint8Array) => boolean; mediaType: string; binary: boolean; detail: string }> = [
  { test: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46, mediaType: "application/pdf", binary: true, detail: "PDF magic %PDF" },
  { test: (b) => b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07), mediaType: "application/zip", binary: true, detail: "ZIP magic PK" },
  { test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47, mediaType: "image/png", binary: true, detail: "PNG magic" },
  { test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, mediaType: "image/jpeg", binary: true, detail: "JPEG magic" },
  { test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46, mediaType: "image/gif", binary: true, detail: "GIF magic" },
];

export function sniffBytes(bytes: Uint8Array): MediaIdentification | null {
  if (bytes.length < 4) return null;
  for (const m of MAGIC) {
    try {
      if (m.test(bytes)) {
        return { mediaType: m.mediaType, binary: m.binary, archive: m.mediaType === "application/zip", detail: m.detail };
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function sniffText(head: string): MediaIdentification | null {
  const t = head.trimStart();
  if (t.startsWith("<nmaprun")) return { mediaType: "application/xml", binary: false, archive: false, detail: "canonical Nmap XML root" };
  if (t.startsWith("<NessusClientData")) return { mediaType: "application/xml", binary: false, archive: false, detail: "canonical Nessus root" };
  if (t.startsWith("<issues") && t.includes("burp")) return { mediaType: "application/xml", binary: false, archive: false, detail: "Burp Suite export" };
  if (t.startsWith("{") || t.startsWith("[")) return { mediaType: "application/json", binary: false, archive: false, detail: "JSON leading token" };
  if (t.startsWith("<?xml") || t.startsWith("<")) return { mediaType: "application/xml", binary: false, archive: false, detail: "XML leading token" };
  return null;
}

export function extensionHint(filename: string): string {
  const m = filename.toLowerCase().match(/\.([a-z0-9]{1,5})$/);
  return m?.[1] ?? "";
}
