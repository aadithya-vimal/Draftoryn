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
});
