import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { analyzeArtifacts } from "../../src/intelligence/analysis/index";
import { acceptCandidate, confirmCandidate } from "../../src/intelligence/review/actions";
import { buildReport } from "../../src/intelligence/reporting/synthesize";
import { exportIntelligenceReport } from "../../src/intelligence/exporting/index";
import { reportToGeneratedDocument } from "../../src/intelligence/exporting/bridge";
import { toSemanticReport } from "../../src/intelligence/exporting/semantic";

const FIX = join(process.cwd(), "tests", "fixtures");
const load = (name: string) => {
  const text = readFileSync(join(FIX, name), "utf8");
  return { filename: name, mediaType: "text/plain", text, size: text.length };
};

describe("canonical report exports", () => {
  it("renders semantic JSON/XML/YAML plus prose formats with provenance", async () => {
    const graph = analyzeArtifacts("an_exp", [load("zap.json")]);
    const c = graph.candidates[0]!;
    acceptCandidate(graph, c.id);
    const asseted = c.affectedAssets.length > 0 ? c : { ...c, affectedAssets: ["https://api.example.com"] };
    if (c.affectedAssets.length === 0) {
      const idx = graph.candidates.findIndex((x) => x.id === c.id);
      graph.candidates[idx] = asseted;
    }
    const confirmed = [
      confirmCandidate(graph, c.id, {
        impact: "Cross-account record access indicates confidentiality impact.",
        remediation: ["Enforce object-level authorization."],
      }, "F-001"),
    ];
    const report = buildReport(graph, confirmed, { client: "Example Corp", assessmentName: "API Review" });

    const sem = toSemanticReport(report);
    expect(sem.findings.length).toBe(1);
    expect(sem.evidence.length).toBeGreaterThan(0);
    expect(sem.standardsMappings.length).toBe(1);
    expect(typeof sem.findings[0]!.description).toBe("string");

    const md = await exportIntelligenceReport(report, "markdown");
    expect(md.mimeType).toBe("text/markdown");
    expect(String(md.data)).toContain("F-001");

    const json = await exportIntelligenceReport(report, "json");
    const parsed = JSON.parse(String(json.data)) as { findings: unknown[]; evidence: unknown[] };
    expect(parsed.findings.length).toBe(1);
    expect(parsed.evidence.length).toBeGreaterThan(0);

    const xml = await exportIntelligenceReport(report, "xml");
    expect(String(xml.data)).toContain("<intelligenceReport>");
    expect(String(xml.data)).toContain("F-001");

    const yaml = await exportIntelligenceReport(report, "yaml");
    expect(String(yaml.data)).toContain("F-001");

    const html = await exportIntelligenceReport(report, "html");
    expect(String(html.data)).toContain("F-001");

    // Bridge produces a first-class editable document.
    const doc = reportToGeneratedDocument(report);
    expect(doc.sections.length).toBe(report.sections.length);
    expect(doc.model.findings[0]!.id).toBe("F-001");
  });
});
