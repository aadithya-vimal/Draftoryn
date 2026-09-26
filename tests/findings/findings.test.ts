import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { analyzeArtifacts } from "../../src/intelligence/analysis/index";
import { acceptCandidate, confirmCandidate, mergeCandidates, rejectCandidate, splitCandidate, markUnverified } from "../../src/intelligence/review/actions";
import { runQualityGate } from "../../src/intelligence/quality/gate";
import { qualitativeForScore, validateCvssVector } from "../../src/intelligence/standards/cvss";
import { compareFindings, retestAnalysis, similarity } from "../../src/intelligence/retest/compare";

const FIX = join(process.cwd(), "tests", "fixtures");
const load = (name: string) => {
  const text = readFileSync(join(FIX, name), "utf8");
  return { filename: name, mediaType: "text/plain", text, size: text.length };
};

describe("findings review + quality + retest", () => {
  it("supports accept/edit/reject/merge/split/unverified", () => {
    const graph = analyzeArtifacts("an_rev", [load("nmap.xml"), load("nuclei.jsonl")]);
    const ids = graph.candidates.map((c) => c.id);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    acceptCandidate(graph, ids[0]!);
    expect(graph.candidates[0]!.status).toBe("accepted");
    rejectCandidate(graph, ids[1]!);
    expect(graph.candidates[1]!.status).toBe("rejected");
    markUnverified(graph, ids[0]!);
    expect(graph.candidates[0]!.status).toBe("unverified");

    const g2 = analyzeArtifacts("an_merge", [load("nmap.xml"), load("nuclei.jsonl")]);
    const [a, b] = g2.candidates.map((c) => c.id);
    mergeCandidates(g2, [a!, b!], a!);
    expect(g2.candidates.find((c) => c.id === b)!.status).toBe("merged");
    expect(g2.candidates.find((c) => c.id === a)!.evidenceIds.length).toBeGreaterThan(0);

    const g3 = analyzeArtifacts("an_split", [load("nuclei.jsonl")]);
    const target = g3.candidates[0]!;
    const before = g3.candidates.length;
    splitCandidate(g3, target.id, [
      { title: "Part one", evidenceIds: target.evidenceIds.slice(0, 1) },
      { title: "Part two", evidenceIds: target.evidenceIds.slice(0, 1) },
    ]);
    expect(g3.candidates.length).toBe(before + 2);
    expect(() =>
      splitCandidate(g3, target.id, [{ title: "Bad", evidenceIds: ["nope"] }, { title: "Bad2", evidenceIds: target.evidenceIds.slice(0, 1) }]),
    ).toThrow();
  });

  it("refuses confirmation without remediation/impact/asset", () => {
    const graph = analyzeArtifacts("an_conf", [load("zap.json")]);
    const id = graph.candidates[0]!.id;
    expect(() => confirmCandidate(graph, id, { impact: "", remediation: [] }, "F-001")).toThrow();
    expect(() => confirmCandidate(graph, id, { impact: "x".repeat(50), remediation: [] }, "F-001")).toThrow();
  });

  it("quality gate fails zero-evidence findings and flags placeholders", () => {
    const graph = analyzeArtifacts("an_q", [load("zap.json")]);
    const confirmed = confirmCandidate(graph, graph.candidates[0]!.id, {
      impact: "Attackers could read records they should not see.",
      remediation: ["Enforce server-side authorization checks."],
    }, "F-001");
    const res = runQualityGate([confirmed], graph);
    expect(res.failures.length).toBe(0);
    expect(res.score).toBeGreaterThan(0.7);

    const bad = { ...confirmed, title: "[MISSING]", evidence: [] as string[] };
    const res2 = runQualityGate([bad], graph);
    expect(res2.failures.some((f) => f.includes("evidence"))).toBe(true);
    expect(res2.failures.some((f) => f.includes("title"))).toBe(true);
  });

  it("validates CVSS vectors and bands", () => {
    expect(validateCvssVector("CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N", 9.3).valid).toBe(true);
    expect(validateCvssVector("CVSS:4.0/AV:N/AC:L").valid).toBe(false);
    expect(validateCvssVector("garbage").valid).toBe(false);
    expect(qualitativeForScore(9.3)).toBe("Critical");
    expect(qualitativeForScore(0)).toBe("None");
  });

  it("compares documents and retests without exact wording (scenario E)", () => {
    const prior = [
      { reference: "F-001", title: "Insecure Direct Object Reference on user API", severity: "high" },
      { reference: "F-002", title: "TLS certificate trust failure", severity: "medium" },
    ];
    expect(similarity("Insecure Direct Object Reference on user API", "IDOR — insecure direct object reference in users endpoint")).toBeGreaterThan(0.3);
    const graph = analyzeArtifacts("an_retest", [load("zap.json"), load("nuclei.jsonl")]);
    const diff = compareFindings(prior, graph.candidates);
    expect(diff.stillOpen.length + diff.removed.length).toBe(2);
    const verdicts = retestAnalysis(prior, graph.candidates, false);
    // Absent findings without retest evidence → inconclusive, never remediated.
    for (const v of verdicts.filter((x) => x.status === "inconclusive")) {
      expect(v.status).not.toBe("remediated");
    }
  });
});
