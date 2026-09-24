import { describe, expect, it } from "vitest";
import { buildVisionCall, describeImage, supportsVision } from "../src/intelligence/ai/vision";
import { assistFinding, draftExecutiveSummary } from "../src/intelligence/ai/assist";
import type { AnalysisGraph } from "../src/intelligence/analysis/graph";

function graph(): AnalysisGraph {
  return {
    analysisId: "an_ai",
    createdAt: "2026-01-01T00:00:00.000Z",
    artifacts: [],
    evidence: [
      {
        id: "ev_1", sourceArtifactId: "art_1", sourceLocation: "line[0]", evidenceType: "scanner_finding",
        title: "IDOR on /api/user/123", content: "GET /api/user/123 accessible as user 456", structuredData: {},
        extractedAt: "2026-01-01T00:00:00.000Z", confidence: "high", sensitivity: "internal",
        redactionState: "original", evidenceLevel: "L1_observed",
      },
    ],
    assets: [],
    observations: [],
    candidates: [
      {
        id: "fc_1", canonicalFingerprint: "fp", title: "IDOR", description: "d",
        affectedAssets: ["api.example.com"], evidenceIds: ["ev_1"], severity: "high",
        severityBasis: "manual", cwe: [], cve: [],
        taxonomyMappings: { cwe: [], cve: [], owaspWstg: [], nistRefs: [], attck: [], ccm: [] },
        confidence: "high", evidenceLevel: "L1_observed", status: "proposed", contradictions: [],
      },
    ],
    conflicts: [],
    completeness: [],
    summary: { filesAnalyzed: 1, filesFailed: 0, duplicateFiles: 0, assetsIdentified: 1, observationsExtracted: 1, candidatesProposed: 1, duplicatesMerged: 0, conflictsOpen: 0, missingItems: 0, standardsMapped: [] },
    fileChecksums: {},
  };
}

const creds = { provider: "openai" as const, model: "gpt-4o-mini", apiKey: "sk-test" };

describe("AI assist + vision (offline)", () => {
  it("builds provider vision calls with injection-resistant framing", () => {
    expect(supportsVision("openai")).toBe(true);
    expect(supportsVision("groq")).toBe(false);
    const base = { model: "gpt-4o-mini", apiKey: "k", imageBase64: "aGVsbG8=", mediaType: "image/png", evidenceId: "ev_1", filename: "shot.png" };
    const oai = buildVisionCall({ ...base, provider: "openai" });
    expect(JSON.stringify(oai.body)).toContain("UNTRUSTED-EVIDENCE");
    expect(JSON.stringify(oai.body)).toContain("data:image/png;base64");
    const ant = buildVisionCall({ ...base, provider: "anthropic", model: "claude-3-5-sonnet-20241022" });
    expect(JSON.stringify(ant.body)).toContain("base64");
    const gem = buildVisionCall({ ...base, provider: "gemini", model: "gemini-1.5-flash" });
    expect(JSON.stringify(gem.body)).toContain("inlineData");
    expect(() => buildVisionCall({ ...base, provider: "groq" })).toThrow();
    expect(() => buildVisionCall({ ...base, provider: "openai", model: "bad model!" })).toThrow();
  });

  it("parses vision descriptions and rejects malformed output", async () => {
    const okFetch = (async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ description: "Login form visible", visibleText: "Sign in", confidence: "high" }) } }] }) })) as unknown as typeof fetch;
    const d = await describeImage({ provider: "openai", model: "gpt-4o-mini", apiKey: "k", imageBase64: "aGVsbG8=", mediaType: "image/png", evidenceId: "ev_1", filename: "s.png" }, okFetch);
    expect(d.description).toContain("Login form");
    expect(d.confidence).toBe("high");

    const badFetch = (async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "not json at all {{{" } }] }) })) as unknown as typeof fetch;
    await expect(describeImage({ provider: "openai", model: "m", apiKey: "k", imageBase64: "aGVsbG8=", mediaType: "image/png", evidenceId: "e", filename: "s.png" }, badFetch)).rejects.toThrow();

    const errFetch = (async () => ({ ok: false, status: 429, json: async () => ({}) })) as unknown as typeof fetch;
    await expect(describeImage({ provider: "openai", model: "m", apiKey: "k", imageBase64: "aGVsbG8=", mediaType: "image/png", evidenceId: "e", filename: "s.png" }, errFetch)).rejects.toThrow();
  });

  it("validates AI finding drafts against evidence", async () => {
    const g = graph();
    const good = async () => JSON.stringify({
      title: "Broken Object Level Authorization", severity: "high", description: "desc",
      impact: "Cross-account access.", evidenceIds: ["ev_1"], reproduction: ["step"],
      remediation: ["Enforce checks."], references: [], confidence: "high", verificationState: "confirmed",
    });
    const draft = await assistFinding(g, "fc_1", creds, good);
    expect(draft.evidenceIds).toEqual(["ev_1"]);
    expect(draft.verificationState).toBe("confirmed");

    const badEv = async () => JSON.stringify({ title: "X", severity: "high", description: "d", impact: "i", evidenceIds: ["ev_forged"], remediation: ["fix"] });
    await expect(assistFinding(g, "fc_1", creds, badEv)).rejects.toThrow();

    const noRem = async () => JSON.stringify({ title: "X", severity: "high", description: "d", impact: "i", evidenceIds: ["ev_1"], remediation: [] });
    await expect(assistFinding(g, "fc_1", creds, noRem)).rejects.toThrow();

    const garbageSev = async () => JSON.stringify({ title: "X", severity: "cosmic", description: "d", impact: "i", evidenceIds: ["ev_1"], remediation: ["fix"] });
    expect((await assistFinding(g, "fc_1", creds, garbageSev)).severity).toBe("high");
  });

  it("drafts executive summaries and rejects empties", async () => {
    const g = graph();
    expect(await draftExecutiveSummary(g, creds, async () => JSON.stringify({ summary: "One high finding." }))).toContain("One high");
    await expect(draftExecutiveSummary(g, creds, async () => JSON.stringify({ summary: "  " }))).rejects.toThrow();
  });
});
