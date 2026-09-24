// Human-in-the-loop review actions. Pure functions: graph in, graph out.
// ACCEPT / EDIT / REJECT / MERGE / SPLIT / MARK UNVERIFIED.

import { cyrb53 } from "../utils";
import type { ConfirmedFinding, FindingCandidate } from "../schemas";
import type { AnalysisGraph } from "../analysis/graph";

function findCandidate(graph: AnalysisGraph, id: string): FindingCandidate {
  const c = graph.candidates.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown finding candidate: ${id}`);
  return c;
}

export function acceptCandidate(graph: AnalysisGraph, id: string): AnalysisGraph {
  findCandidate(graph, id).status = "accepted";
  return graph;
}

export function rejectCandidate(graph: AnalysisGraph, id: string): AnalysisGraph {
  findCandidate(graph, id).status = "rejected";
  return graph;
}

export function markUnverified(graph: AnalysisGraph, id: string): AnalysisGraph {
  findCandidate(graph, id).status = "unverified";
  return graph;
}

export function editCandidate(
  graph: AnalysisGraph,
  id: string,
  patch: Partial<Pick<FindingCandidate, "title" | "description" | "severity" | "confidence" | "cwe" | "cve">>,
): AnalysisGraph {
  const c = findCandidate(graph, id);
  if (patch.title !== undefined) c.title = patch.title.slice(0, 300);
  if (patch.description !== undefined) c.description = patch.description.slice(0, 10000);
  if (patch.severity !== undefined) {
    c.severity = patch.severity;
    c.severityBasis = `analyst-adjusted (${c.severityBasis.slice(0, 400)})`;
  }
  if (patch.confidence !== undefined) c.confidence = patch.confidence;
  if (patch.cwe !== undefined) c.cwe = patch.cwe;
  if (patch.cve !== undefined) c.cve = patch.cve;
  return graph;
}

export function mergeCandidates(graph: AnalysisGraph, ids: string[], primaryId: string): AnalysisGraph {
  const primary = findCandidate(graph, primaryId);
  for (const id of ids) {
    if (id === primaryId) continue;
    const other = findCandidate(graph, id);
    other.status = "merged";
    other.duplicateOf = primaryId;
    primary.evidenceIds = [...new Set([...primary.evidenceIds, ...other.evidenceIds])];
    primary.affectedAssets = [...new Set([...primary.affectedAssets, ...other.affectedAssets])];
  }
  return graph;
}

export function splitCandidate(
  graph: AnalysisGraph,
  id: string,
  parts: Array<{ title: string; evidenceIds: string[] }>,
): AnalysisGraph {
  const c = findCandidate(graph, id);
  if (parts.length < 2) throw new Error("Split requires at least two parts.");
  c.status = "split";
  for (const part of parts) {
    const unknown = part.evidenceIds.filter((e) => !c.evidenceIds.includes(e));
    if (unknown.length > 0) throw new Error(`Split references unevidenced records: ${unknown.join(",")}`);
    const nid = `fc_${cyrb53(`${graph.analysisId}|${c.id}|${part.title}`).slice(0, 12)}`;
    graph.candidates.push({
      ...c,
      id: nid,
      title: part.title.slice(0, 300),
      evidenceIds: part.evidenceIds,
      status: "proposed",
      duplicateOf: undefined,
    });
  }
  return graph;
}

export interface ConfirmOverrides {
  impact: string;
  remediation: string[];
  reproduction?: string[];
  references?: string[];
  verificationState?: ConfirmedFinding["verificationState"];
}

/** Promote an accepted candidate. Remediation must be supplied by human or
 *  evidenced AI synthesis — never invented here (throws when absent). */
export function confirmCandidate(
  graph: AnalysisGraph,
  id: string,
  overrides: ConfirmOverrides,
  reference: string,
): ConfirmedFinding {
  const c = findCandidate(graph, id);
  if (c.status === "rejected" || c.status === "merged") {
    throw new Error(`Cannot confirm a ${c.status} candidate.`);
  }
  if (!overrides.impact.trim()) throw new Error("Impact is required to confirm a finding.");
  if (overrides.remediation.length === 0) throw new Error("At least one remediation step is required.");
  if (c.affectedAssets.length === 0) throw new Error("Affected asset is required to confirm a finding.");
  return {
    id: `f_${cyrb53(`${graph.analysisId}|${c.id}`).slice(0, 12)}`,
    findingCandidateId: c.id,
    reference,
    title: c.title,
    severity: c.severity,
    affectedAssets: c.affectedAssets,
    description: c.description,
    impact: overrides.impact,
    evidence: c.evidenceIds,
    reproduction: overrides.reproduction ?? [],
    remediation: overrides.remediation,
    references: overrides.references ?? [],
    confidence: c.confidence,
    verificationState: overrides.verificationState ?? (c.evidenceLevel === "L1_observed" ? "confirmed" : "needs-review"),
    cvss: c.cvss,
    taxonomyMappings: c.taxonomyMappings,
  };
}
