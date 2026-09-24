// Object-storage abstraction. Neon stores metadata/references only;
// bytes live behind a StorageProvider (never public, never path-derived).

import { sanitizeFilename } from "../utils";

export interface StoredObject {
  storageKey: string;
  size: number;
  checksum: string;
  mediaType: string;
}

export interface StorageProvider {
  readonly id: string;
  put(ownerId: string, analysisId: string, filename: string, bytes: Uint8Array, mediaType: string, checksum: string): Promise<StoredObject>;
  get(storageKey: string, ownerId: string): Promise<Uint8Array | null>;
  remove(storageKey: string, ownerId: string): Promise<void>;
}

function scopedKey(ownerId: string, analysisId: string, checksum: string, filename: string): string {
  const owner = ownerId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64) || "unknown";
  const analysis = analysisId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64) || "unknown";
  return `t/${owner}/${analysis}/${checksum.slice(0, 16)}/${sanitizeFilename(filename)}`;
}

/** Local/dev provider: memory-backed, same interface as production. */
export class LocalStorageProvider implements StorageProvider {
  readonly id = "local";
  private blobs = new Map<string, { ownerId: string; bytes: Uint8Array }>();

  async put(ownerId: string, analysisId: string, filename: string, bytes: Uint8Array, mediaType: string, checksum: string): Promise<StoredObject> {
    const storageKey = scopedKey(ownerId, analysisId, checksum, filename);
    this.blobs.set(storageKey, { ownerId, bytes: bytes.slice() });
    void mediaType;
    return { storageKey, size: bytes.length, checksum, mediaType };
  }

  async get(storageKey: string, ownerId: string): Promise<Uint8Array | null> {
    const hit = this.blobs.get(storageKey);
    if (!hit || hit.ownerId !== ownerId) return null;
    return hit.bytes.slice();
  }

  async remove(storageKey: string, ownerId: string): Promise<void> {
    const hit = this.blobs.get(storageKey);
    if (hit && hit.ownerId === ownerId) this.blobs.delete(storageKey);
  }
}

/**
 * Production provider: S3-compatible API (Cloudflare R2) over fetch.
 * Configured via R2_ENDPOINT + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY +
 * R2_BUCKET. Unsigned requests are never made; keys stay server-side.
 * NOTE: signing uses AWS Signature V4 implemented inline (no new deps).
 */
export class R2StorageProvider implements StorageProvider {
  readonly id = "r2";
  constructor(private readonly env: Record<string, string | undefined> = globalThis.process?.env ?? {}) {}

  configured(): boolean {
    return !!(this.env.R2_ENDPOINT && this.env.R2_ACCESS_KEY_ID && this.env.R2_SECRET_ACCESS_KEY && this.env.R2_BUCKET);
  }

  async put(ownerId: string, analysisId: string, filename: string, bytes: Uint8Array, mediaType: string, checksum: string): Promise<StoredObject> {
    if (!this.configured()) throw new Error("R2 storage is not configured on the server.");
    const storageKey = scopedKey(ownerId, analysisId, checksum, filename);
    await this.signedFetch("PUT", storageKey, bytes, mediaType);
    return { storageKey, size: bytes.length, checksum, mediaType };
  }

  async get(storageKey: string, ownerId: string): Promise<Uint8Array | null> {
    if (!this.configured()) throw new Error("R2 storage is not configured on the server.");
    void ownerId;
    const res = await this.signedFetch("GET", storageKey);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`R2 fetch failed (${res.status}).`);
    return new Uint8Array(await res.arrayBuffer());
  }

  async remove(storageKey: string, ownerId: string): Promise<void> {
    if (!this.configured()) return;
    void ownerId;
    await this.signedFetch("DELETE", storageKey);
  }

  private async signedFetch(method: string, key: string, body?: Uint8Array, contentType?: string): Promise<Response> {
    const endpoint = this.env.R2_ENDPOINT!.replace(/\/$/, "");
    const bucket = this.env.R2_BUCKET!;
    const url = `${endpoint}/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
    // Minimal SigV4 (PUT/GET/DELETE, unsigned payload for streaming safety).
    const accessKey = this.env.R2_ACCESS_KEY_ID!;
    const secretKey = this.env.R2_SECRET_ACCESS_KEY!;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const dateStamp = amzDate.slice(0, 8);
    const host = new URL(url).host;
    const payloadHash = "UNSIGNED-PAYLOAD";
    const headers: Record<string, string> = {
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    };
    if (contentType) headers["content-type"] = contentType;
    const signedHeaders = Object.keys(headers).sort().join(";");
    const canonical = [method, `/${bucket}/${key}`, "", Object.keys(headers).sort().map((k) => `${k}:${headers[k]}`).join("\n") + "\n", signedHeaders, payloadHash].join("\n");
    const te = new TextEncoder();
    const hashHex = async (data: Uint8Array | string): Promise<string> => {
      const bytes = typeof data === "string" ? te.encode(data) : data;
      const d = await globalThis.crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
      return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
    };
    const hmac = async (keyBytes: Uint8Array | string, msg: string): Promise<Uint8Array> => {
      const kb = typeof keyBytes === "string" ? te.encode(keyBytes) : keyBytes;
      const ck = await globalThis.crypto.subtle.importKey("raw", kb as unknown as ArrayBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      return new Uint8Array(await globalThis.crypto.subtle.sign("HMAC", ck, te.encode(msg)));
    };
    const scope = `${dateStamp}/auto/s3/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, await hashHex(canonical)].join("\n");
    const kDate = await hmac(`AWS4${secretKey}`, dateStamp);
    const kRegion = await hmac(kDate, "auto");
    const kService = await hmac(kRegion, "s3");
    const kSigning = await hmac(kService, "aws4_request");
    const sigBytes = await hmac(kSigning, stringToSign);
    const signature = [...sigBytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    const auth = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    return fetch(url, {
      method,
      headers: { ...headers, Authorization: auth },
      ...(body ? { body: body as unknown as ArrayBuffer } : {}),
    });
  }
}

export function defaultStorageProvider(env?: Record<string, string | undefined>): StorageProvider {
  const r2 = new R2StorageProvider(env);
  return r2.configured() ? r2 : new LocalStorageProvider();
}
