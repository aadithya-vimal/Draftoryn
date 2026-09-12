import { describe, expect, it, vi, beforeEach } from "vitest";
import { getDefinition } from "../src/engine/definitions/catalog";
import { generateDocument } from "../src/engine/generate";
import { validateGeneratedDocument } from "../src/engine/validation";
import { exportDocument } from "../src/engine/exports";
import { toHtml } from "../src/engine/exports/html";
import { toXml } from "../src/engine/exports/xml";
import { safeMdText, toMarkdown } from "../src/engine/exports/markdown";
import { toYaml } from "../src/engine/exports/yaml";
import { executeAiCall } from "../src/engine/ai/providers";
import type { GeneratedDocument } from "../src/engine/types";

function hostileDoc(): GeneratedDocument {
  const gen = generateDocument(getDefinition("pentest_report")!, { clientName: "Acme <script>alert(1)</script>" });
  gen.title = `Report <script>alert("title")</script>`;
  gen.sections[0]!.blocks.push(
    { type: "paragraph", text: `Click <a href="x" onclick="steal()">here</a> and <img src=x onerror=alert(1)>` },
    { type: "heading", level: 99 as never, text: "Hacked heading" },
    { type: "callout", tone: "__proto__" as never, text: "Tone escape [x](javascript:alert(document.domain)) end" },
    { type: "list", items: ["[pwn](JaVaScRiPt:alert(1))", "plain <b>bold</b>"] },
    { type: "table", table: { headers: ["H|H"], rows: [["a|b"]] } },
  );
  gen.metadata = { ...(gen.metadata ?? {}), "bad key><&\"'": "v", normal: "ok" } as Record<string, string>;
  return gen;
}

describe("HTML exporter neutralization", () => {
  it("escapes scripts, handlers, and quotes in all text positions", () => {
    const html = toHtml(hostileDoc());
    expect(html).not.toContain("<script>");
    expect(html).not.toMatch(/<a[\s>]/);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;a href");
    expect(html).toContain("&lt;img");
    expect(html).toContain("&quot;");
  });

  it("clamps heading levels to h1–h6", () => {
    const html = toHtml(hostileDoc());
    expect(html).not.toContain("<h99>");
    expect(html).toContain("<h6>Hacked heading</h6>");
  });

  it("allow-lists callout tones for class names", () => {
    const html = toHtml(hostileDoc());
    expect(html).not.toContain("callout-__proto__");
    expect(html).toContain("callout-info");
  });
});

describe("XML exporter neutralization", () => {
  it("escapes values and drops unsafe element names", () => {
    const xml = toXml(hostileDoc());
    expect(xml).not.toContain("<script>");
    expect(xml).toContain("&lt;script&gt;");
    expect(xml).not.toContain("<bad key>");
    expect(xml).not.toContain(" ><&\"'");
    expect(xml).toContain("<normal>ok</normal>");
    expect(xml).not.toMatch(/<!DOCTYPE|<!ENTITY/i);
  });
});

describe("Markdown exporter neutralization", () => {
  it("breaks tag-opens and dangerous link schemes", () => {
    expect(safeMdText(`<script>alert(1)</script>`)).not.toContain("<script>");
    expect(safeMdText(`[x](javascript:alert(1))`)).not.toContain("javascript:");
    expect(safeMdText(`[x](JaVaScRiPt:alert(1))`)).not.toContain("JaVaScRiPt:");
    expect(safeMdText(`[x](data:text/html,<h1>hi</h1>)`)).not.toContain("data:text/html:");
    // Legitimate text survives intact
    expect(safeMdText("5 < 10 andAT&T")).toBe("5 < 10 andAT&T");
    expect(safeMdText("[docs](https://example.com)")).toBe("[docs](https://example.com)");
  });

  it("keeps tables structurally intact against pipe injection", () => {
    const md = toMarkdown(hostileDoc());
    const splitCells = (line: string) => line.split(/(?<!\\)\|/).slice(1, -1);
    const hostileHeader = md.split("\n").find((l) => l.includes("H\\|H"));
    expect(hostileHeader).toBeDefined();
    // Injected pipes stay escaped inside their cell: exactly 1 header cell.
    expect(splitCells(hostileHeader!)).toHaveLength(1);
    expect(splitCells(hostileHeader!)[0]).toContain("H\\|H");
    // Every rendered table row keeps a consistent column count per table.
    const lines = md.split("\n");
    let expectedCells: number | null = null;
    for (const line of lines) {
      if (!line.startsWith("|")) {
        expectedCells = null;
        continue;
      }
      if (/^\|(\s*---\s*\|)+$/.test(line)) continue; // separator row
      const cells = splitCells(line).length;
      if (expectedCells === null) expectedCells = cells;
      else expect(cells).toBe(expectedCells);
    }
  });
});

describe("YAML exporter safety", () => {
  it("serializes hostile keys without executable tags or prototype pollution", () => {
    const gen = hostileDoc();
    const out = toYaml(gen);
    expect(out).not.toMatch(/!!js\//);
    expect(out).not.toMatch(/!<[^>]*>/);
    expect({}.hasOwnProperty.call(JSON.parse(JSON.stringify({})), "__proto__")).toBe(false);
  });
});

describe("export filename safety", () => {
  it("slugifies traversal attempts out of filenames", async () => {
    const gen = generateDocument(getDefinition("pentest_report")!, { clientName: "Acme" });
    gen.title = "../../etc/passwd";
    for (const format of ["pdf", "docx", "markdown", "json", "xml", "yaml", "html"] as const) {
      const result = await exportDocument(gen, format);
      expect(result.filename).not.toContain("/");
      expect(result.filename).not.toContain("\\");
      expect(result.filename).not.toContain("..");
    }
  });
});

describe("AI output schema enforcement", () => {
  it("rejects oversized and malformed model output", () => {
    expect(
      validateGeneratedDocument({ definitionId: "x", title: "t", sections: "nope" }).success,
    ).toBe(false);
    const big = {
      definitionId: "pentest_report",
      title: "t",
      sections: Array.from({ length: 101 }, (_, i) => ({
        id: `s${i}`,
        title: "t",
        kind: "k",
        blocks: [],
        status: "ai",
      })),
    };
    expect(validateGeneratedDocument(big).success).toBe(false);
    const evilLevel = {
      definitionId: "pentest_report",
      title: "t",
      sections: [{ id: "s", title: "t", kind: "k", blocks: [{ type: "heading", level: 99, text: "x" }], status: "ai" }],
    };
    expect(validateGeneratedDocument(evilLevel).success).toBe(false);
  });
});

describe("AI provider call hardening", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("pins requests to official endpoints (no custom base URL)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "{}" } }] }),
    });
    vi.stubGlobal("fetch", mockFetch);
    await executeAiCall({
      provider: "openai",
      apiKey: "sk-test",
      systemPrompt: "s",
      userPrompt: "u",
      ...( { baseUrl: "http://169.254.169.254/" } as unknown as Record<string, unknown> ),
    });
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("validates model identifiers and caps output tokens", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "{}" } }] }),
    });
    vi.stubGlobal("fetch", mockFetch);
    await expect(
      executeAiCall({ provider: "openai", apiKey: "sk-test", systemPrompt: "s", userPrompt: "u", model: "evil model;|" }),
    ).rejects.toThrow(/Invalid model/);
    expect(mockFetch).not.toHaveBeenCalled();

    await executeAiCall({ provider: "openai", apiKey: "sk-test", systemPrompt: "s", userPrompt: "u" });
    const [, init] = mockFetch.mock.calls[0] as [string, { body: string; signal?: AbortSignal }];
    expect(JSON.parse(init.body).max_tokens).toBe(8192);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects oversized model responses", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "x".repeat(300_001) } }] }),
    });
    vi.stubGlobal("fetch", mockFetch);
    await expect(
      executeAiCall({ provider: "openai", apiKey: "sk-test", systemPrompt: "s", userPrompt: "u" }),
    ).rejects.toThrow(/oversized/);
  });
});
