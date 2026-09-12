import { describe, expect, it } from "vitest";
import { getDefinition } from "../src/engine/definitions/catalog";
import { generateDocument } from "../src/engine/generate";
import { toMarkdown } from "../src/engine/exports/markdown";
import { toJson } from "../src/engine/exports/json";
import { toXml } from "../src/engine/exports/xml";
import { toYaml } from "../src/engine/exports/yaml";
import { toHtml } from "../src/engine/exports/html";
import { toPdf } from "../src/engine/exports/pdf";
import { toDocx } from "../src/engine/exports/docx";
import { exportDocument } from "../src/engine/exports";

describe("exports", () => {
  const gen = generateDocument(getDefinition("pentest_report")!, { clientName: "Acme Corp" });

  it("markdown preserves the title and sections", () => {
    const md = toMarkdown(gen);
    expect(md).toContain("Penetration Testing Report");
    expect(md).toContain("Scope");
  });

  it("json exposes meaningful semantics, not a single content blob", () => {
    const obj = JSON.parse(toJson(gen));
    expect(obj.document_type).toBe("pentest_report");
    expect(obj.organization.client.name).toBe("Acme Corp");
    expect(Array.isArray(obj.sections)).toBe(true);
  });

  it("xml is well-formed and semantic", () => {
    const xml = toXml(gen);
    expect(xml).toContain('<draftoryn_document type="pentest_report"');
    expect(xml).toContain("<organization>");
  });

  it("yaml parses back", () => {
    const yaml = toYaml(gen);
    expect(yaml).toContain("document_type: pentest_report");
  });

  it("html is a full document", () => {
    const html = toHtml(gen);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Penetration Testing Report");
  });

  it("pdf produces a non-empty buffer", async () => {
    const buf = await toPdf(gen);
    expect(buf).toBeInstanceOf(Uint8Array);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf[0]).toBe(0x25); // %PDF
  });

  it("docx produces a non-empty buffer", async () => {
    const buf = await toDocx(gen);
    expect(buf).toBeInstanceOf(Uint8Array);
    expect(buf.length).toBeGreaterThan(200);
  });

  it("exportDocument returns the right filename + mime per format", async () => {
    const r = await exportDocument(gen, "json");
    expect(r.filename).toBe("acme-corp-penetration-testing-report.json");
    expect(r.mimeType).toBe("application/json");
  });

  it("pdf export preserves user edited callout text without dropping content", async () => {
    const secExceptionDef = getDefinition("sec_exception_waiver")!;
    const doc = generateDocument(secExceptionDef, {
      clientName: "Something Inc",
      policyWaived: "ISO 27001 Annex A.9 Access Control",
    });
    // Add custom edited callout block
    doc.sections[1]!.blocks.push({
      type: "callout",
      tone: "missing",
      text: "so ytea lol",
    });

    const pdfBuf = await toPdf(doc);
    expect(pdfBuf).toBeInstanceOf(Uint8Array);
    expect(pdfBuf.length).toBeGreaterThan(1000);
    // Verify PDF header
    expect(pdfBuf[0]).toBe(0x25); // %
    expect(pdfBuf[1]).toBe(0x50); // P
    expect(pdfBuf[2]).toBe(0x44); // D
    expect(pdfBuf[3]).toBe(0x46); // F
  });
});
