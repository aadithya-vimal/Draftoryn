// Completeness analyzer: what is present / partial / missing for a report.
// Also used for non-report documents (scope docs, SOWs, RoEs, policies).

import type { AnalysisGraph, CompletenessItem } from "./graph";

function item(key: string, label: string, status: CompletenessItem["status"], detail: string): CompletenessItem {
  return { key, label, status, detail };
}

export function analyzeCompleteness(graph: AnalysisGraph, reportType = "pentest_report"): CompletenessItem[] {
  const has = (pred: (s: string) => boolean): boolean => graph.evidence.some((e) => pred(`${e.title} ${e.content}`.toLowerCase()));
  const hasType = (t: string): boolean => graph.evidence.some((e) => e.evidenceType === t);
  const findings = graph.candidates.length;
  const withEvidence = graph.candidates.filter((c) => c.evidenceIds.length > 0).length;
  const withCwe = graph.candidates.filter((c) => c.cwe.length > 0).length;
  const withCvss = graph.candidates.filter((c) => c.cvss?.fullyDetermined).length;

  const items: CompletenessItem[] = [
    item("exec_summary", "Executive summary inputs", has((s) => s.includes("objective") || s.includes("executive")) ? "present" : "missing", "Objectives/business context"),
    item("scope", "Scope", hasType("scope_statement") ? "present" : graph.assets.length > 0 ? "partial" : "missing", `${graph.assets.length} assets, scope statements ${hasType("scope_statement") ? "present" : "absent"}`),
    item("methodology", "Methodology", has((s) => s.includes("wstg") || s.includes("ptes") || s.includes("methodolog")) ? "present" : graph.artifacts.length > 1 ? "partial" : "missing", "WSTG/PTES references or multi-source coverage"),
    item("findings", "Findings", findings > 0 ? "present" : "missing", `${findings} candidates`),
    item("evidence", "Evidence", withEvidence === findings && findings > 0 ? "present" : withEvidence > 0 ? "partial" : "missing", `${withEvidence}/${findings} findings with evidence`),
    item("remediation", "Remediation", has((s) => s.includes("remediat") || s.includes("fix") || s.includes("solution")) ? "partial" : "missing", "Present only after AI synthesis or manual entry"),
    item("retest", "Retest status", /retest|rescan|re-test/i.test(reportType) || has((s) => s.includes("retest")) ? "present" : "missing", "Prior-report comparison"),
    item("cvss", "CVSS", withCvss === findings && findings > 0 ? "present" : withCvss > 0 ? "partial" : "missing", `${withCvss}/${findings} fully determined`),
    item("wstg", "WSTG references", graph.candidates.some((c) => (c.taxonomyMappings.owaspWstg ?? []).length > 0) ? "partial" : "missing", "Mapped deterministically where patterns match"),
    item("assets", "Asset inventory", graph.assets.length > 5 ? "present" : graph.assets.length > 0 ? "partial" : "missing", `${graph.assets.length} assets`),
  ];
  return items;
}
