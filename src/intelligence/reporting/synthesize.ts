// Deterministic report synthesis: AnalysisGraph + confirmed findings +
// engagement answers → validated IntelligenceReport. No AI required; the AI
// layer may refine individual sections through evidence-scoped prompts.

import { cyrb53 } from "../utils";
import type { AnalysisGraph } from "../analysis/graph";
import type { ConfirmedFinding, IntelligenceReport, ReportSection, ReportView } from "../schemas";
import { REPORT_SCHEMA_VERSION } from "../schemas";
import { runQualityGate } from "../quality/gate";

export interface EngagementAnswers {
  client?: string;
  assessmentName?: string;
  scope?: string[];
  methodology?: string[];
  objectives?: string;
  limitations?: string[];
  testingWindow?: string;
  /** Analyst-approved narrative prepended to the executive summary. */
  executiveNotes?: string;
}

export function severityDistribution(findings: ConfirmedFinding[]): Record<string, number> {
  const dist: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 };
  for (const f of findings) dist[f.severity] = (dist[f.severity] ?? 0) + 1;
  return dist;
}

function findingBody(f: ConfirmedFinding): string {
  return [
    `## ${f.reference} — ${f.title} [${f.severity.toUpperCase()}]`,
    ``,
    `**Affected:** ${f.affectedAssets.join(", ")}`,
    `**Confidence:** ${f.confidence} · **Verification:** ${f.verificationState}`,
    ...(f.taxonomyMappings.cwe?.length ? [`**Mappings:** ${f.taxonomyMappings.cwe.join(", ")}${(f.taxonomyMappings.owaspWstg ?? []).length ? ` · ${(f.taxonomyMappings.owaspWstg ?? []).join(", ")}` : ""}`] : []),
    ``,
    `### Description`,
    f.description,
    ``,
    `### Impact`,
    f.impact,
    ...(f.reproduction.length ? [``, `### Reproduction`, ...f.reproduction.map((r) => `- ${r}`)] : []),
    ``,
    `### Remediation`,
    ...f.remediation.map((r) => `- ${r}`),
    ``,
    `**Evidence:** ${f.evidence.join(", ")}`,
    ...(f.references.length ? [`**References:** ${f.references.join(", ")}`] : []),
  ].join("\n");
}

export function buildReport(
  graph: AnalysisGraph,
  findings: ConfirmedFinding[],
  answers: EngagementAnswers,
  view: ReportView = "full",
  reportType = "pentest_report",
): IntelligenceReport {
  const now = new Date().toISOString();
  const dist = severityDistribution(findings);
  const sections: ReportSection[] = [];
  const client = answers.client ?? "Client";
  const scope = answers.scope ?? graph.assets.map((a) => a.canonicalIdentifier).slice(0, 100);
  const methodology = answers.methodology ?? [...new Set(graph.artifacts.map((a) => a.classification.label))];

  sections.push({
    id: "doc_control",
    title: "Document Control",
    optional: false,
    body: [`Title: ${answers.assessmentName ?? reportType}`, `Client: ${client}`, `Generated: ${now}`, `Classification: Confidential`, `Source analysis: ${graph.analysisId}`].join("\n"),
    evidenceIds: [],
    view: "shared",
  });

  sections.push({
    id: "exec_summary",
    title: "Executive Summary",
    optional: false,
    body: [
      ...(answers.executiveNotes ? [answers.executiveNotes] : []),
      `${findings.length} finding(s) confirmed from ${graph.evidence.length} evidence records across ${graph.artifacts.length} artifact(s).`,
      `Severity distribution: ${Object.entries(dist).filter(([, n]) => n > 0).map(([s, n]) => `${s} ${n}`).join(", ") || "none"}.`,
      ...(answers.objectives ? [`Objective: ${answers.objectives}`] : []),
      `Open conflicts requiring review: ${graph.conflicts.filter((c) => c.resolution === "open").length}.`,
    ].join("\n"),
    evidenceIds: findings.flatMap((f) => f.evidence).slice(0, 50),
    view: "executive",
  });

  sections.push({
    id: "scope_methodology",
    title: "Scope and Methodology",
    optional: false,
    body: [`Scope: ${scope.join("; ") || "not recorded"}`, `Methodology: ${methodology.join("; ") || "not recorded"}`, ...(answers.limitations?.length ? [`Limitations: ${answers.limitations.join("; ")}`] : []), ...(answers.testingWindow ? [`Testing window: ${answers.testingWindow}`] : [])].join("\n"),
    evidenceIds: [],
    view: "shared",
  });

  sections.push({
    id: "risk_profile",
    title: "Risk Profile",
    optional: false,
    body: [`Critical: ${dist["critical"]} · High: ${dist["high"]} · Medium: ${dist["medium"]} · Low: ${dist["low"]} · Informational: ${dist["informational"]}`].join("\n"),
    evidenceIds: [],
    view: "shared",
  });

  if (findings.length > 0) {
    sections.push({
      id: "findings",
      title: "Detailed Findings",
      optional: false,
      body: findings.map(findingBody).join("\n\n---\n\n"),
      evidenceIds: findings.flatMap((f) => f.evidence),
      view: "technical",
    });
    sections.push({
      id: "remediation_roadmap",
      title: "Remediation Roadmap",
      optional: false,
      body: [...findings].sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3, informational: 4 } as Record<string, number>)[a.severity]! - ({ critical: 0, high: 1, medium: 2, low: 3, informational: 4 } as Record<string, number>)[b.severity]!).map((f) => `- [${f.severity}] ${f.reference} ${f.title}: ${f.remediation[0]}`).join("\n"),
      evidenceIds: findings.flatMap((f) => f.evidence),
      view: "shared",
    });
  }

  sections.push({
    id: "appendix_evidence",
    title: "Appendix: Evidence Index",
    optional: false,
    body: graph.evidence.map((e) => `- ${e.id} · ${e.evidenceType} · ${e.title} (source: ${e.sourceArtifactId} @ ${e.sourceLocation})`).join("\n") || "No evidence records.",
    evidenceIds: graph.evidence.map((e) => e.id).slice(0, 500),
    view: "appendix",
  });

  const quality = runQualityGate(findings, graph);
  const report: IntelligenceReport = {
    id: `rep_${cyrb53(`${graph.analysisId}|${reportType}|${findings.map((f) => f.id).join(",")}`).slice(0, 12)}`,
    type: reportType,
    sourceAnalysisId: graph.analysisId,
    status: quality.failures.length === 0 ? "validated" : "in_review",
    generatedAt: now,
    schemaVersion: REPORT_SCHEMA_VERSION,
    view,
    engagement: { client, assessmentName: answers.assessmentName, scope, methodology },
    findings,
    sections,
    provenance: graph.evidence.map((e) => ({ sourceArtifactId: e.sourceArtifactId, location: e.sourceLocation, evidenceLevel: e.evidenceLevel })),
    qualityScore: quality.score,
    qualityFailures: quality.failures,
    version: 1,
  };
  return report;
}
