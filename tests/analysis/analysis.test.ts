import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { analyzeArtifacts, sha256Hex } from "../../src/intelligence/analysis/index";
import { redactText } from "../../src/intelligence/analysis/redact";

const FIX = join(process.cwd(), "tests", "fixtures");
const load = (name: string) => {
  const text = readFileSync(join(FIX, name), "utf8");
  return { filename: name, mediaType: "text/plain", text, size: text.length };
};

describe("analysis pipeline", () => {
  it("correlates nmap+burp+nuclei+notes into one evidence graph (scenario A)", () => {
    const now = "2026-01-01T00:00:00.000Z";
    const graph = analyzeArtifacts("an_test", [load("nmap.xml"), load("burp.xml"), load("nuclei.jsonl"), load("notes.md")], "pentest_report", { now });
    expect(graph.summary.filesAnalyzed).toBe(4);
    expect(graph.assets.length).toBeGreaterThan(0);
    expect(graph.observations.length).toBeGreaterThan(0);
    expect(graph.candidates.length).toBeGreaterThan(0);
    // Every candidate cites evidence.
    for (const c of graph.candidates) expect(c.evidenceIds.length).toBeGreaterThan(0);
    // Deterministic rerun (fixed clock).
    const again = analyzeArtifacts("an_test", [load("nmap.xml"), load("burp.xml"), load("nuclei.jsonl"), load("notes.md")], "pentest_report", { now });
    expect(JSON.stringify(again)).toBe(JSON.stringify(graph));
  });

  it("merges duplicate scanner results into one candidate (scenario B)", () => {
    const graph = analyzeArtifacts("an_dup", [load("nessus-min.nessus")]);
    const ssl = graph.candidates.filter((c) => c.title.includes("SSL Certificate"));
    expect(ssl.length).toBe(1);
    // Parser-level dedup collapsed the identical plugin+host+port rows.
    expect(graph.evidence.length).toBe(2);
  });

  it("detects duplicate files by checksum", () => {
    const graph = analyzeArtifacts("an_files", [load("nmap.xml"), load("nmap.xml")]);
    expect(graph.summary.duplicateFiles).toBe(1);
    expect(graph.summary.filesAnalyzed).toBe(1);
  });

  it("surfaces scope conflicts (scenario D)", () => {
    const graph = analyzeArtifacts("an_scope", [load("notes.md"), load("nmap.xml")]);
    // notes.md excludes staging.example.com only; craft direct conflict:
    // api.example.com is scanned (nmap asset) yet declared out-of-scope.
    const conflicted = analyzeArtifacts("an_scope2", [
      load("nmap.xml"),
      { filename: "evil-scope.txt", mediaType: "text/plain", text: "Out-of-scope: api.example.com\nTarget: api.example.com port 443 open", size: 80 },
    ]);
    expect(conflicted.conflicts.some((c) => c.kind === "scope")).toBe(true);
    expect(graph.completeness.length).toBeGreaterThan(0);
  });

  it("redacts secrets while preserving originals", () => {
    const r = redactText("api_key = AKIAIOSFODNN7EXAMPLE and password: s3cret! mail a@b.com JWT eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJVadQssw5c");
    expect(r.hits).toBeGreaterThanOrEqual(3);
    expect(r.redacted).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(r.types).toContain("aws_key");
  });

  it("computes sha256 checksums", async () => {
    const h = await sha256Hex("hello");
    expect(h).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });
});
