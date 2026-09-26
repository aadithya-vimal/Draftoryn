// DOCX parser: unzip (in-memory only, entry-capped) + word/document.xml text.
// No paths are ever written — entries are read by exact name, so zip-slip
// style traversal is structurally impossible here.

import { unzipSync } from "fflate";
import type { Parser, ParseResult, RawEvidence } from "./types";
import { scopeStatements } from "./generic";
import { truncate } from "../utils";

const MAX_ENTRIES = 300;
const MAX_ENTRY_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

function isZip(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07);
}

function xmlToText(xml: string): string {
  return xml
    .replace(/<\/w:p[^>]*>/gi, "\n")
    .replace(/<\/w:tr[^>]*>/gi, "\n")
    .replace(/<w:tab[^>]*\/>/gi, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractDocxText(bytes: Uint8Array): { text: string; warnings: string[] } {
  const warnings: string[] = [];
  if (!isZip(bytes)) throw new Error("Not a ZIP/OOXML container.");
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes, {
      filter: (file) => {
        if (file.name.endsWith("/")) return false;
        if (file.originalSize !== undefined && file.originalSize > MAX_ENTRY_BYTES) return false;
        return /^(word\/document\.xml|word\/header[0-9]*\.xml|word\/footer[0-9]*\.xml|word\/comments\.xml|docProps\/core\.xml)$/.test(file.name);
      },
    });
  } catch (e) {
    throw new Error(`DOCX decompression failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  const names = Object.keys(entries);
  if (names.length > MAX_ENTRIES) throw new Error("DOCX entry cap exceeded.");
  let total = 0;
  for (const n of names) total += entries[n]!.length;
  if (total > MAX_TOTAL_BYTES) throw new Error("DOCX uncompressed size cap exceeded.");
  // Decompression-bomb guard: reported vs actual size sanity.
  if (bytes.length > 0 && total / bytes.length > 200 && total > 1024 * 1024) {
    throw new Error("DOCX compression ratio rejected (bomb protection).");
  }

  const doc = entries["word/document.xml"];
  if (!doc) throw new Error("word/document.xml missing — not a Word document.");
  const dec = new TextDecoder();
  const parts: string[] = [xmlToText(dec.decode(doc))];
  for (const n of names) {
    if (n === "word/document.xml" || n === "docProps/core.xml") continue;
    parts.push(xmlToText(dec.decode(entries[n]!)));
  }
  return { text: parts.join("\n\n").trim(), warnings };
}

export const docxParser: Parser = {
  id: "docx",
  version: "1.0.0",
  canHandle: (input) => {
    if (!input.bytes || !isZip(input.bytes)) return false;
    if (input.filename.toLowerCase().endsWith(".docx")) return true;
    // Sniff OOXML without trusting the extension alone.
    try {
      const entries = unzipSync(input.bytes, { filter: (f) => f.name === "[Content_Types].xml" });
      return Object.keys(entries).length > 0;
    } catch {
      return false;
    }
  },
  parse: (input): ParseResult => {
    if (!input.bytes) {
      return { artifactType: "docx", evidence: [], assets: [], observations: [], warnings: ["DOCX bytes unavailable."], classification: { label: "Word document (unparsed)", confidence: 0.3, basis: "bytes missing", reviewRecommended: true } };
    }
    let text = "";
    const warnings: string[] = [];
    try {
      const out = extractDocxText(input.bytes);
      text = out.text;
      warnings.push(...out.warnings);
    } catch (e) {
      return { artifactType: "docx", evidence: [], assets: [], observations: [], warnings: [`DOCX rejected safely: ${e instanceof Error ? e.message : String(e)}`], classification: { label: "Unreadable Word document", confidence: 0.25, basis: "safe rejection", reviewRecommended: true } };
    }
    const evidence: RawEvidence[] = [];
    for (let i = 0; i < text.length && evidence.length < 50; i += 4000) {
      evidence.push({
        evidenceType: "document_section",
        title: `Document excerpt ${evidence.length + 1}`,
        content: text.slice(i, i + 4000),
        structuredData: { chunk: evidence.length, totalChars: text.length },
        sourceLocation: `document.xml#chunk[${evidence.length}]`,
        confidence: "medium",
        evidenceLevel: "L1_observed",
      });
    }
    const scope = scopeStatements(text);
    evidence.push(...scope.slice(0, 100));
    const scopeLike = scope.length > 0 || /statement of work|\bsow\b|scope of work|rules of engagement|authorization/i.test(text);
    return {
      artifactType: "docx",
      evidence,
      assets: [],
      observations: scope.slice(0, 50).map((s) => ({ category: "scope_fact" as const, description: s.content, confidence: "medium" as const })),
      warnings,
      classification: {
        label: scopeLike ? "Client scope / engagement document (Word)" : "Word document",
        confidence: scopeLike ? 0.72 : 0.6,
        basis: "OOXML text extraction + content heuristics",
        reviewRecommended: true,
      },
    };
  },
};

export function docxBytesToText(bytes: Uint8Array): string {
  return truncate(extractDocxText(bytes).text, 200000);
}
