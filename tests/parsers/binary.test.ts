import { describe, expect, it } from "vitest";
import { deflateSync, strToU8, zipSync } from "fflate";
import { parseArtifact } from "../../src/intelligence/parsers/index";
import { extractDocxText } from "../../src/intelligence/parsers/docx";
import { extractPdfText } from "../../src/intelligence/parsers/pdf";

function makeDocx(paragraphs: string[], extraEntries: Record<string, Uint8Array> = {}): Uint8Array {
  const body = paragraphs.map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join("");
  return zipSync({
    "[Content_Types].xml": strToU8(`<Types/>`),
    "word/document.xml": strToU8(`<w:document><w:body>${body}</w:body></w:document>`),
    ...extraEntries,
  });
}

function makePdf(texts: string[], encrypt = false): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [enc.encode("%PDF-1.4\n")];
  if (encrypt) parts.push(enc.encode("/Encrypt << /Filter /Standard >>\n"));
  parts.push(enc.encode("/Type /Page /Type /Page\n"));
  texts.forEach((t) => {
    const stream = deflateSync(enc.encode(`(${t}) Tj`));
    const head = enc.encode(`<</Length ${stream.length} /Filter /FlateDecode>>stream\n`);
    const tail = enc.encode("\nendstream\n");
    const both = new Uint8Array(head.length + stream.length + tail.length);
    both.set(head, 0);
    both.set(stream, head.length);
    both.set(tail, head.length + stream.length);
    parts.push(both);
  });
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

describe("binary parsers", () => {
  it("extracts docx text and scope statements", () => {
    const bytes = makeDocx(["In-scope: api.example.com, 192.0.2.10", "Out-of-scope: staging.example.com"]);
    expect(extractDocxText(bytes).text).toContain("In-scope: api.example.com");
    const { result, parserId } = parseArtifact({ filename: "scope.docx", mediaType: "application/octet-stream", text: "", size: bytes.length, bytes });
    expect(parserId).toBe("docx");
    expect(result.classification.label).toContain("scope");
    expect(result.evidence.some((e) => e.evidenceType === "scope_statement")).toBe(true);
    const again = parseArtifact({ filename: "scope.docx", mediaType: "application/octet-stream", text: "", size: bytes.length, bytes });
    expect(JSON.stringify(again.result)).toBe(JSON.stringify(result));
  });

  it("ignores traversal-named zip entries and rejects bombs", () => {
    const bytes = makeDocx(["hello"], { "../../evil.xml": strToU8("x"), "word/document.xml.bak": strToU8("y") });
    expect(extractDocxText(bytes).text).toContain("hello");

    const bombDoc = strToU8(`<w:document><w:p><w:t>${"\0".repeat(2 * 1024 * 1024)}</w:t></w:p></w:document>`);
    const bomb = zipSync({ "[Content_Types].xml": strToU8("<Types/>"), "word/document.xml": bombDoc });
    const { result } = parseArtifact({ filename: "bomb.docx", mediaType: "application/octet-stream", text: "", size: bomb.length, bytes: bomb });
    expect(result.evidence.length).toBe(0);
    expect(result.warnings.join(" ").toLowerCase()).toContain("bomb");
  });

  it("extracts pdf text from flate streams", () => {
    const bytes = makePdf(["Executive Summary", "Finding F-001 IDOR validated"]);
    expect(extractPdfText(bytes).text).toContain("Executive Summary");
    const { result, parserId } = parseArtifact({ filename: "report.pdf", mediaType: "application/pdf", text: "", size: bytes.length, bytes });
    expect(parserId).toBe("pdf");
    expect(result.classification.label).toContain("Prior assessment report");
  });

  it("rejects encrypted pdfs safely", () => {
    const bytes = makePdf(["secret"], true);
    const { result } = parseArtifact({ filename: "enc.pdf", mediaType: "application/pdf", text: "", size: bytes.length, bytes });
    expect(result.evidence.length).toBe(0);
    expect(result.warnings.join(" ").toLowerCase()).toContain("encrypt");
  });

  it("registers images as metadata-only evidence", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 1, 0, 0, 0, 0, 200]);
    const { result, parserId } = parseArtifact({ filename: "shot.png", mediaType: "image/png", text: "", size: png.length, bytes: png });
    expect(parserId).toBe("image");
    expect(result.evidence[0]!.evidenceType).toBe("screenshot");
    expect(result.classification.reviewRecommended).toBe(true);
  });
});
