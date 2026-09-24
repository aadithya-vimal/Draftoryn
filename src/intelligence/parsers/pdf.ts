// Minimal PDF text extractor: FlateDecode streams (via fflate) + Tj/TJ
// text-showing operators. No xref parsing, no JS, no actions executed.
// Encrypted or exotic-filter PDFs degrade to metadata-only with warnings.

import { inflateSync } from "fflate";
import type { Parser, ParseResult, RawEvidence } from "./types";
import { scopeStatements } from "./generic";

const MAX_STREAMS = 500;
const MAX_TEXT_CHARS = 200000;

function latin1(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return s;
}

function unescapeLiteral(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function hexToText(hex: string): string {
  const clean = hex.replace(/\s+/g, "");
  let out = "";
  for (let i = 0; i + 1 < clean.length; i += 2) {
    const code = parseInt(clean.slice(i, i + 2), 16);
    if (!Number.isNaN(code) && code >= 32 && code !== 127) out += String.fromCharCode(code);
    else if (!Number.isNaN(code) && (code === 10 || code === 13)) out += "\n";
  }
  return out;
}

function extractOpsText(stream: string): string {
  const parts: string[] = [];
  const litRe = /\((?:\\.|[^\\()])*\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = litRe.exec(stream)) !== null) {
    parts.push(unescapeLiteral(m[0].slice(1, m[0].lastIndexOf(")"))));
  }
  const hexRe = /<([0-9A-Fa-f\s]+)>\s*Tj/g;
  while ((m = hexRe.exec(stream)) !== null) parts.push(hexToText(m[1]!));
  const tjRe = /\[(.*?)\]\s*TJ/gs;
  while ((m = tjRe.exec(stream)) !== null) {
    const inner = m[1]!;
    const lit2 = inner.match(/\((?:\\.|[^\\()])*\)/g) ?? [];
    for (const l of lit2) parts.push(unescapeLiteral(l.slice(1, -1)));
    const hex2 = inner.match(/<([0-9A-Fa-f\s]+)>/g) ?? [];
    for (const h of hex2) parts.push(hexToText(h.slice(1, -1)));
  }
  return parts.join(" ");
}

/** Split raw PDF bytes into {dict, data} streams without trusting xref. */
function splitStreams(raw: string): Array<{ dict: string; start: number; end: number }> {
  const out: Array<{ dict: string; start: number; end: number }> = [];
  // Robust scan: find "stream" then "endstream" with dict from preceding bytes.
  let idx = 0;
  while (out.length < MAX_STREAMS) {
    const sIdx = raw.indexOf("stream", idx);
    if (sIdx === -1) break;
    // Avoid matching "endstream" itself.
    if (raw.slice(sIdx, sIdx + 9) === "endstream") {
      idx = sIdx + 9;
      continue;
    }
    let dataStart = sIdx + 6;
    if (raw[dataStart] === "\r" && raw[dataStart + 1] === "\n") dataStart += 2;
    else if (raw[dataStart] === "\n" || raw[dataStart] === "\r") dataStart += 1;
    const eIdx = raw.indexOf("endstream", dataStart);
    if (eIdx === -1) break;
    const dict = raw.slice(Math.max(0, sIdx - 600), sIdx);
    out.push({ dict, start: dataStart, end: eIdx });
    idx = eIdx + 9;
  }
  return out;
}

export function extractPdfText(bytes: Uint8Array): { text: string; pages: number; warnings: string[] } {
  const warnings: string[] = [];
  if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) {
    throw new Error("Not a PDF file.");
  }
  const raw = latin1(bytes);
  if (/\/Encrypt/i.test(raw.slice(0, 20000))) {
    throw new Error("Encrypted PDF — text extraction not supported.");
  }
  const pages = (raw.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  const streams = splitStreams(raw);
  const chunks: string[] = [];
  let skipped = 0;
  for (const s of streams) {
    const dict = s.dict;
    const data = bytes.slice(s.start, Math.min(s.end, s.start + 5 * 1024 * 1024));
    let text = "";
    try {
      if (/\/FlateDecode/.test(dict)) {
        text = extractOpsText(latin1(inflateSync(data)));
      } else if (/\/Filter/.test(dict)) {
        skipped++;
        continue;
      } else {
        text = extractOpsText(latin1(data));
      }
    } catch {
      skipped++;
      continue;
    }
    if (text.trim()) chunks.push(text);
    if (chunks.join(" ").length > MAX_TEXT_CHARS) {
      warnings.push("PDF text truncated at cap.");
      break;
    }
  }
  if (skipped > 0) warnings.push(`${skipped} stream(s) skipped (unsupported filter).`);
  const text = chunks.join("\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_TEXT_CHARS);
  return { text, pages, warnings };
}

export const pdfParser: Parser = {
  id: "pdf",
  version: "1.0.0",
  canHandle: (input) => !!input.bytes && input.bytes.length > 4 && input.bytes[0] === 0x25 && input.bytes[1] === 0x50 && input.bytes[2] === 0x44 && input.bytes[3] === 0x46,
  parse: (input): ParseResult => {
    if (!input.bytes) {
      return { artifactType: "pdf", evidence: [], assets: [], observations: [], warnings: ["PDF bytes unavailable."], classification: { label: "PDF document (unparsed)", confidence: 0.3, basis: "bytes missing", reviewRecommended: true } };
    }
    let text = "";
    let pages = 0;
    const warnings: string[] = [];
    try {
      const out = extractPdfText(input.bytes);
      text = out.text;
      pages = out.pages;
      warnings.push(...out.warnings);
    } catch (e) {
      return { artifactType: "pdf", evidence: [], assets: [], observations: [], warnings: [`PDF rejected safely: ${e instanceof Error ? e.message : String(e)}`], classification: { label: "Unreadable PDF", confidence: 0.25, basis: "safe rejection", reviewRecommended: true } };
    }
    const evidence: RawEvidence[] = [];
    for (let i = 0; i < text.length && evidence.length < 50; i += 4000) {
      evidence.push({
        evidenceType: "document_section",
        title: `PDF excerpt ${evidence.length + 1}`,
        content: text.slice(i, i + 4000),
        structuredData: { chunk: evidence.length, pages },
        sourceLocation: `content#chunk[${evidence.length}]`,
        confidence: "medium",
        evidenceLevel: "L1_observed",
      });
    }
    const scope = scopeStatements(text);
    evidence.push(...scope.slice(0, 100));
    const reportLike = /executive summary|methodology|findings|remediation|penetration test|assessment/i.test(text);
    return {
      artifactType: "pdf",
      evidence,
      assets: [],
      observations: scope.slice(0, 50).map((s) => ({ category: "scope_fact" as const, description: s.content, confidence: "medium" as const })),
      warnings,
      classification: {
        label: reportLike ? "Prior assessment report (PDF)" : "PDF document",
        confidence: reportLike ? 0.7 : 0.55,
        basis: "PDF text extraction + content heuristics",
        reviewRecommended: true,
      },
    };
  },
};
