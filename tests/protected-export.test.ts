import { describe, expect, it } from "vitest";
import { ZipReader, Uint8ArrayReader, Uint8ArrayWriter } from "@zip.js/zip.js";
import { getDefinition } from "../src/engine/definitions/catalog";
import { generateDocument } from "../src/engine/generate";
import { exportDocument } from "../src/engine/exports";
import {
  MIN_EXPORT_PASSWORD_LENGTH,
  createPasswordZip,
  exportProtectedZip,
  passwordProtectionNote,
  validateExportPassword,
} from "../src/lib/protectedExport";

const PASSWORD = "correct-horse-123";

/** Independent oracle: read our archives with the reference ZIP implementation. */
async function oracleExtract(zipBytes: Uint8Array, filename: string, password: string): Promise<Uint8Array> {
  const reader = new ZipReader(new Uint8ArrayReader(zipBytes));
  try {
    const entries = await reader.getEntries();
    const entry = entries.find((e) => e.filename === filename);
    if (!entry || !("getData" in entry)) throw new Error("entry missing");
    return await (entry as { getData: (w: unknown, o: unknown) => Promise<Uint8Array> }).getData(
      new Uint8ArrayWriter(),
      { password },
    );
  } finally {
    await reader.close();
  }
}

async function oracleEntries(zipBytes: Uint8Array): Promise<{ filename: string; encrypted: boolean }[]> {
  const reader = new ZipReader(new Uint8ArrayReader(zipBytes));
  try {
    const entries = await reader.getEntries();
    return entries.map((e) => ({ filename: e.filename, encrypted: Boolean((e as { encrypted?: boolean }).encrypted) }));
  } finally {
    await reader.close();
  }
}

describe("export password validation", () => {
  it("rejects empty passwords", () => {
    expect(validateExportPassword("", "").ok).toBe(false);
  });

  it(`rejects passwords shorter than ${MIN_EXPORT_PASSWORD_LENGTH} characters`, () => {
    const short = "a".repeat(MIN_EXPORT_PASSWORD_LENGTH - 1);
    const res = validateExportPassword(short, short);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/at least/);
  });

  it("accepts a password at the minimum length", () => {
    const min = "a".repeat(MIN_EXPORT_PASSWORD_LENGTH);
    expect(validateExportPassword(min, min).ok).toBe(true);
  });

  it("rejects mismatched confirmation", () => {
    const res = validateExportPassword(PASSWORD, `${PASSWORD}-different`);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/match/);
  });
});

describe("password protection notes", () => {
  it("tells pdf/docx users that native open-passwords are unavailable", () => {
    for (const format of ["pdf", "docx"] as const) {
      const note = passwordProtectionNote(format);
      expect(note).toMatch(/AES-256/);
      expect(note).toMatch(/ZIP/);
      expect(note).toMatch(/isn't supported|aren't supported/);
    }
  });

  it("describes the ZIP container for text formats", () => {
    expect(passwordProtectionNote("markdown")).toMatch(/AES-256/);
  });
});

describe("protected export round-trip (verified by reference ZIP reader)", () => {
  const gen = generateDocument(getDefinition("pentest_report")!, { clientName: "Acme Corp" });

  it("packs a markdown export into an encrypted archive that unlocks with the password", async () => {
    // NOTE: every export embeds a fresh `generatedAt` timestamp, so the test
    // asserts on stable content markers rather than byte equality.
    const prot = await exportProtectedZip(gen, "markdown", PASSWORD);

    expect(prot.mimeType).toBe("application/zip");
    expect(prot.filename).toMatch(/-protected\.zip$/);
    expect(prot.innerFilename).toMatch(/\.md$/);

    const entries = await oracleEntries(prot.data);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.filename).toBe(prot.innerFilename);
    expect(entries[0]!.encrypted).toBe(true);

    const extracted = await oracleExtract(prot.data, prot.innerFilename, PASSWORD);
    const text = new TextDecoder().decode(extracted);
    expect(text).toContain("Penetration Testing Report");
    expect(text).toContain("Acme Corp");
  });

  it("packs a pdf export (binary path) and rejects wrong passwords", async () => {
    const original = await exportDocument(gen, "pdf");
    expect(original.data).toBeInstanceOf(Uint8Array);

    const prot = await exportProtectedZip(gen, "pdf", PASSWORD);
    const extracted = await oracleExtract(prot.data, prot.innerFilename, PASSWORD);
    expect(extracted[0]).toBe(0x25); // %PDF magic preserved
    expect(extracted.length).toBe((original.data as Uint8Array).length);

    await expect(oracleExtract(prot.data, prot.innerFilename, "wrong-password-1")).rejects.toThrow();
  });

  it("produces archives with unique salts per export", async () => {
    const a = await createPasswordZip("doc.md", new TextEncoder().encode("same-bytes"), PASSWORD);
    const b = await createPasswordZip("doc.md", new TextEncoder().encode("same-bytes"), PASSWORD);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
    expect(new TextDecoder().decode(await oracleExtract(a, "doc.md", PASSWORD))).toBe("same-bytes");
    expect(new TextDecoder().decode(await oracleExtract(b, "doc.md", PASSWORD))).toBe("same-bytes");
  });

  it("refuses to build an archive with an invalid password", async () => {
    await expect(exportProtectedZip(gen, "json", "short")).rejects.toThrow();
  });
});
