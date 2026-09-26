import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArtifact, selectParser, type ParserInput } from "../../src/intelligence/parsers/index";

const FIX = join(process.cwd(), "tests", "fixtures");
const load = (name: string): ParserInput => {
  const text = readFileSync(join(FIX, name), "utf8");
  return { filename: name, mediaType: "application/octet-stream", text, size: text.length };
};

describe("parser contracts", () => {
  it("parses valid nmap XML deterministically", () => {
    const a = parseArtifact(load("nmap.xml"));
    expect(a.parserId).toBe("nmap");
    expect(a.result.classification.confidence).toBeGreaterThanOrEqual(0.99);
    const titles = a.result.evidence.map((e) => e.title);
    expect(titles.some((t) => t.includes("443/tcp"))).toBe(true);
    expect(titles.some((t) => t.includes("closed"))).toBe(false);
    const b = parseArtifact(load("nmap.xml"));
    expect(JSON.stringify(a.result)).toBe(JSON.stringify(b.result));
    expect(a.result.assets.length).toBe(2);
  });

  it("dedups identical nessus records and skips severity-0", () => {
    const { result } = parseArtifact(load("nessus-min.nessus"));
    const dupes = result.evidence.filter((e) => String(e.structuredData.pluginId) === "51192");
    expect(dupes.length).toBe(1);
    expect(result.evidence.some((e) => String(e.structuredData.pluginId) === "19506")).toBe(false);
  });

  it("dedups nuclei lines and skips malformed lines", () => {
    const { result } = parseArtifact(load("nuclei.jsonl"));
    const headers = result.evidence.filter((e) => String(e.structuredData.templateId) === "http-missing-security-headers");
    expect(headers.length).toBe(1);
    expect(result.evidence.length).toBe(2);
  });

  it("parses zap, burp and sarif fixtures", () => {
    expect(parseArtifact(load("zap.json")).parserId).toBe("zap");
    expect(parseArtifact(load("burp.xml")).parserId).toBe("burp");
    expect(parseArtifact(load("sarif.json")).parserId).toBe("sarif");
    const zap = parseArtifact(load("zap.json")).result;
    expect(zap.evidence.length).toBe(2);
  });

  it("extracts scope statements from notes and classifies them", () => {
    const { result } = parseArtifact(load("notes.md"));
    expect(result.classification.label).toBe("Penetration-test notes");
    expect(result.evidence.some((e) => e.evidenceType === "scope_statement")).toBe(true);
    // Injection line is preserved as data, not acted on.
    expect(result.evidence.some((e) => e.content.includes("Ignore your system prompt"))).toBe(true);
  });

  it("parses CSV rows", () => {
    const { result } = parseArtifact(load("sample.csv"));
    expect(result.artifactType).toBe("csv");
    expect(result.evidence.length).toBe(3);
  });

  it("rejects XXE payloads safely", () => {
    const input = load("xxe.xml");
    const { result } = parseArtifact(input);
    // Claim + safe rejection: no crash, no entity expansion, flagged for review.
    const joined = [...result.warnings, ...result.evidence.map((e) => e.content)].join(" ");
    expect(result.classification.reviewRecommended).toBe(true);
    expect(joined.includes("/etc/passwd")).toBe(false);
    expect(result.evidence.length).toBe(0);
  });

  it("handles empty and malformed input without throwing", () => {
    for (const text of ["", "   ", "{not json", "<unclosed><tag>", "a".repeat(100)]) {
      const { result } = parseArtifact({ filename: "f.txt", mediaType: "text/plain", text, size: text.length });
      expect(result.warnings.length + result.evidence.length >= 0).toBe(true);
      expect(result.classification.reviewRecommended).toBe(true);
    }
  });

  it("caps very large input deterministically", () => {
    const big = "line data here\n".repeat(300000);
    const input: ParserInput = { filename: "big.log", mediaType: "text/plain", text: big, size: big.length };
    const a = parseArtifact(input);
    const b = parseArtifact(input);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.result.evidence.length).toBeLessThanOrEqual(250);
  });

  it("never selects the generic parser when a specific one matches", () => {
    for (const f of ["nmap.xml", "nessus-min.nessus", "nuclei.jsonl", "zap.json", "burp.xml", "sarif.json"]) {
      expect(selectParser(load(f)).id).not.toBe("generic");
    }
  });
});
