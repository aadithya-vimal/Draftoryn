import { exportDocument } from "../engine/exports";
import type { ExportFormat, GeneratedDocument } from "../engine/types";

export const MIN_EXPORT_PASSWORD_LENGTH = 8;

// WinZIP AES layout constants
const AES_SALT_LENGTH = 16; // AES-256
const AES_VERIFY_LENGTH = 2;
const AES_AUTH_LENGTH = 10;
const AES_STRENGTH = 3; // 3 = AES-256
const PBKDF2_ITERATIONS = 1000;
const ZIP_METHOD_STORED = 0;
const ZIP_METHOD_AES = 99;

export interface PasswordCheck {
  ok: boolean;
  error?: string;
}

export function validateExportPassword(password: string, confirm: string): PasswordCheck {
  if (!password) {
    return { ok: false, error: "Enter a password to protect this export." };
  }
  if (password.length < MIN_EXPORT_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_EXPORT_PASSWORD_LENGTH} characters.`,
    };
  }
  if (password !== confirm) {
    return { ok: false, error: "Passwords do not match." };
  }
  return { ok: true };
}

/**
 * Per-format explainer shown in the export dialog.
 *
 * Neither pdf-lib nor the docx generator supports native open-password
 * encryption, so protected exports are delivered as an AES-256 encrypted ZIP
 * container holding the exported file — for every format.
 */
export function passwordProtectionNote(format: ExportFormat): string {
  if (format === "pdf" || format === "docx") {
    return (
      `Native ${format.toUpperCase()} open-passwords aren't supported by the export engine, ` +
      `so a protected export downloads as a password-protected ZIP (AES-256) containing your ` +
      `${format.toUpperCase()} file. Open it with any AES-256 capable ZIP tool (e.g. 7-Zip, WinRAR).`
    );
  }
  return (
    `Protected exports download as a password-protected ZIP (AES-256) containing your ` +
    `${format.toUpperCase()} file. Open it with any AES-256 capable ZIP tool (e.g. 7-Zip, WinRAR).`
  );
}

export interface ProtectedExportResult {
  /** e.g. `client-title-protected.zip` */
  filename: string;
  mimeType: "application/zip";
  data: Uint8Array;
  /** The exported file stored inside the archive. */
  innerFilename: string;
}

// ---------------------------------------------------------------------------
// Minimal WinZIP-AES writer (zero dependencies, Metro-safe).
//
// PDF/DOCX generators in this stack cannot apply native open-passwords, and
// the available ZIP libraries cannot be bundled by Metro, so protection is
// implemented directly per the WinZIP AE specification: PBKDF2-HMAC-SHA1 key
// derivation (1000 iterations), AES-CTR encryption with a little-endian
// counter starting at 1, and an HMAC-SHA1 authentication code truncated to
// 10 bytes — all via WebCrypto, framed as a standard AES-encrypted
// (method 99, strength 3) ZIP entry with stored compression. The result opens
// in any AES-256 capable ZIP tool.
// ---------------------------------------------------------------------------

type AnySubtle = {
  importKey: (...args: never[]) => Promise<never>;
  deriveBits: (...args: never[]) => Promise<ArrayBuffer>;
  encrypt: (...args: never[]) => Promise<ArrayBuffer>;
  sign: (...args: never[]) => Promise<ArrayBuffer>;
};

function webSubtle(): AnySubtle {
  const subtle = (globalThis as unknown as { crypto?: { subtle?: AnySubtle } }).crypto?.subtle;
  if (!subtle) {
    throw new Error(
      "Password-protected export needs WebCrypto, which this device runtime does not provide. Please export from the web app instead.",
    );
  }
  return subtle;
}

function randomSalt(length: number): Uint8Array {
  const cryptoObj = (globalThis as unknown as { crypto?: { getRandomValues?: (a: Uint8Array) => void } }).crypto;
  const salt = new Uint8Array(length);
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(salt);
    return salt;
  }
  for (let i = 0; i < length; i += 1) salt[i] = Math.floor(Math.random() * 256);
  return salt;
}

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const b of data) crc = CRC_TABLE[(crc ^ b) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { time: number; date: number } {
  const time =
    ((date.getHours() & 31) << 11) | ((date.getMinutes() & 63) << 5) | (Math.floor(date.getSeconds() / 2) & 31);
  const day = Math.max(1, Math.min(31, date.getDate()));
  const month = date.getMonth() + 1;
  const year = Math.max(1980, date.getFullYear()) - 1980;
  return { time, date: ((year & 127) << 9) | ((month & 15) << 5) | (day & 31) };
}

function aesExtraField(): Uint8Array {
  // 0x9901 WinZIP AES extra: vendor version AE-1, vendor "AE", strength, method.
  const extra = new Uint8Array(11);
  const view = new DataView(extra.buffer);
  view.setUint16(0, 0x9901, true);
  view.setUint16(2, 7, true);
  view.setUint16(4, 0x0001, true); // AE-1
  extra[6] = 0x41; // 'A'
  extra[7] = 0x45; // 'E'
  extra[8] = AES_STRENGTH;
  view.setUint16(9, ZIP_METHOD_STORED, true); // actual compression: stored
  return extra;
}

/**
 * Encrypts raw bytes per the WinZIP AES-256 scheme and frames them as a
 * single-entry ZIP archive. Returns the complete `.zip` file bytes.
 */
export async function createPasswordZip(entryName: string, plaintext: Uint8Array, password: string): Promise<Uint8Array> {
  const check = validateExportPassword(password, password);
  if (!check.ok) throw new Error(check.error ?? "Invalid export password.");

  const subtle = webSubtle();
  const subtleAny = subtle as unknown as {
    importKey: (format: string, key: Uint8Array, alg: unknown, extractable: boolean, usages: string[]) => Promise<unknown>;
    deriveBits: (alg: unknown, key: unknown, length: number) => Promise<ArrayBuffer>;
    encrypt: (alg: unknown, key: unknown, data: Uint8Array) => Promise<ArrayBuffer>;
    sign: (alg: unknown, key: unknown, data: Uint8Array) => Promise<ArrayBuffer>;
  };

  const salt = randomSalt(AES_SALT_LENGTH);
  const passwordBytes = new TextEncoder().encode(password);
  const baseKey = await subtleAny.importKey("raw", passwordBytes, "PBKDF2", false, ["deriveBits"]);
  const derived = new Uint8Array(
    await subtleAny.deriveBits(
      { name: "PBKDF2", hash: "SHA-1", salt, iterations: PBKDF2_ITERATIONS },
      baseKey,
      (32 + 32 + AES_VERIFY_LENGTH) * 8,
    ),
  );
  const encKeyBytes = derived.slice(0, 32);
  const authKeyBytes = derived.slice(32, 64);
  const verify = derived.slice(64, 66);

  // WinZIP AES-CTR uses a 128-bit little-endian counter starting at 1, which
  // WebCrypto's big-endian counter cannot express in a single call — so each
  // 16-byte block is keyed individually (one block per call observes no
  // increment, making `length` irrelevant).
  const encKey = await subtleAny.importKey("raw", encKeyBytes, "AES-CTR", false, ["encrypt"]);
  const zeroBlock = new Uint8Array(16);
  const blockCount = Math.ceil(plaintext.length / 16);
  const ciphertext = new Uint8Array(plaintext.length);
  for (let block = 0; block < blockCount; block += 1) {
    const counter = new Uint8Array(16);
    let value = block + 1;
    for (let b = 0; b < 16 && value > 0; b += 1) {
      counter[b] = value % 256;
      value = Math.floor(value / 256);
    }
    const keystream = new Uint8Array(
      await subtleAny.encrypt({ name: "AES-CTR", counter, length: 64 }, encKey, zeroBlock),
    );
    const offset = block * 16;
    const end = Math.min(offset + 16, plaintext.length);
    for (let i = offset; i < end; i += 1) {
      ciphertext[i] = plaintext[i]! ^ keystream[i - offset]!;
    }
  }

  const authKey = await subtleAny.importKey("raw", authKeyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const authFull = new Uint8Array(await subtleAny.sign({ name: "HMAC" }, authKey, ciphertext));
  const authCode = authFull.slice(0, AES_AUTH_LENGTH);

  const nameBytes = new TextEncoder().encode(entryName);
  const extra = aesExtraField();
  const payloadLength = AES_SALT_LENGTH + AES_VERIFY_LENGTH + ciphertext.length + AES_AUTH_LENGTH;
  const crc = crc32(plaintext);
  const { time, date } = dosDateTime(new Date());

  const localHeaderLength = 30 + nameBytes.length + extra.length;
  const centralHeaderLength = 46 + nameBytes.length + extra.length;
  const totalLength = localHeaderLength + payloadLength + centralHeaderLength + 22;
  const out = new Uint8Array(totalLength);
  const view = new DataView(out.buffer);
  let o = 0;

  // Local file header
  view.setUint32(o, 0x04034b50, true); o += 4;
  view.setUint16(o, 51, true); o += 2; // version needed (AES)
  view.setUint16(o, 0x0801, true); o += 2; // encrypted + UTF-8 names
  view.setUint16(o, ZIP_METHOD_AES, true); o += 2;
  view.setUint16(o, time, true); o += 2;
  view.setUint16(o, date, true); o += 2;
  view.setUint32(o, crc, true); o += 4;
  view.setUint32(o, payloadLength, true); o += 4;
  view.setUint32(o, plaintext.length, true); o += 4;
  view.setUint16(o, nameBytes.length, true); o += 2;
  view.setUint16(o, extra.length, true); o += 2;
  out.set(nameBytes, o); o += nameBytes.length;
  out.set(extra, o); o += extra.length;

  // AES payload: salt + verification value + ciphertext + auth code
  out.set(salt, o); o += salt.length;
  out.set(verify, o); o += verify.length;
  out.set(ciphertext, o); o += ciphertext.length;
  out.set(authCode, o); o += authCode.length;

  const centralOffset = o;
  // Central directory header
  view.setUint32(o, 0x02014b50, true); o += 4;
  view.setUint16(o, 63, true); o += 2; // version made by
  view.setUint16(o, 51, true); o += 2;
  view.setUint16(o, 0x0801, true); o += 2;
  view.setUint16(o, ZIP_METHOD_AES, true); o += 2;
  view.setUint16(o, time, true); o += 2;
  view.setUint16(o, date, true); o += 2;
  view.setUint32(o, crc, true); o += 4;
  view.setUint32(o, payloadLength, true); o += 4;
  view.setUint32(o, plaintext.length, true); o += 4;
  view.setUint16(o, nameBytes.length, true); o += 2;
  view.setUint16(o, extra.length, true); o += 2;
  view.setUint16(o, 0, true); o += 2; // comment length
  view.setUint16(o, 0, true); o += 2; // disk number
  view.setUint16(o, 0, true); o += 2; // internal attrs
  view.setUint32(o, 0, true); o += 4; // external attrs
  view.setUint32(o, 0, true); o += 4; // local header offset
  out.set(nameBytes, o); o += nameBytes.length;
  out.set(extra, o); o += extra.length;

  // End of central directory
  const centralSize = o - centralOffset;
  view.setUint32(o, 0x06054b50, true); o += 4;
  view.setUint16(o, 0, true); o += 2;
  view.setUint16(o, 0, true); o += 2;
  view.setUint16(o, 1, true); o += 2;
  view.setUint16(o, 1, true); o += 2;
  view.setUint32(o, centralSize, true); o += 4;
  view.setUint32(o, centralOffset, true); o += 4;
  view.setUint16(o, 0, true); o += 2;

  return out;
}

/**
 * Generates the requested export and packs it into a password-protected
 * (AES-256) ZIP archive. The password is used only for local encryption and
 * is never transmitted, stored, or logged anywhere.
 */
export async function exportProtectedZip(
  doc: GeneratedDocument,
  format: ExportFormat,
  password: string,
): Promise<ProtectedExportResult> {
  const check = validateExportPassword(password, password);
  if (!check.ok) {
    throw new Error(check.error ?? "Invalid export password.");
  }
  const result = await exportDocument(doc, format);
  const bytes =
    result.data instanceof Uint8Array ? result.data : new TextEncoder().encode(result.data);
  const data = await createPasswordZip(result.filename, bytes, password);

  const base = result.filename.replace(/\.[^.]+$/, "") || "document";
  return {
    filename: `${base}-protected.zip`,
    mimeType: "application/zip",
    data,
    innerFilename: result.filename,
  };
}
