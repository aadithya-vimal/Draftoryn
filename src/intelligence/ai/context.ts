// Relevant context selection: the LLM receives normalized evidence slices,
// never raw everything. Bounded, provenance-identified, per-task.

import { evidenceEnvelope } from "./interface";
import type { AnalysisGraph } from "../analysis/graph";
import type { FindingCandidate } from "../schemas";

const MAX_EVIDENCE_PER_FINDING = 8;
const MAX_CHARS_PER_EVIDENCE = 3000;

export interface FindingContext {
  candidate: FindingCandidate;
  envelope: string;
  evidenceIds: string[];
  truncated: boolean;
}

export function selectFindingContext(graph: AnalysisGraph, candidateId: string): FindingContext {
  const candidate = graph.candidates.find((c) => c.id === candidateId);
  if (!candidate) throw new Error(`Unknown candidate: ${candidateId}`);
  const records = candidate.evidenceIds
    .map((id) => graph.evidence.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => !!e)
    .slice(0, MAX_EVIDENCE_PER_FINDING);
  const truncated = candidate.evidenceIds.length > records.length;
  const envelope = [
    `FINDING-CANDIDATE id="${candidate.id}" title="${candidate.title}" severity="${candidate.severity}" basis="${candidate.severityBasis}"`,
    `AFFECTED-ASSETS: ${candidate.affectedAssets.join(", ") || "(none recorded)"}`,
    ...records.map((e) => evidenceEnvelope(e.id, e.content.slice(0, MAX_CHARS_PER_EVIDENCE))),
  ].join("\n\n");
  return { candidate, envelope, evidenceIds: records.map((e) => e.id), truncated };
}

export function selectReportContext(graph: AnalysisGraph): string {
  const lines = [
    `ANALYSIS id="${graph.analysisId}" files=${graph.artifacts.length} assets=${graph.assets.length} candidates=${graph.candidates.length}`,
    `ASSETS: ${graph.assets.map((a) => a.canonicalIdentifier).join("; ").slice(0, 2000)}`,
    `CANDIDATES: ${graph.candidates.map((c) => `${c.id}|${c.severity}|${c.title}`).join("; ").slice(0, 3000)}`,
    `CONFLICTS-OPEN: ${graph.conflicts.filter((c) => c.resolution === "open").length}`,
  ];
  return lines.join("\n");
}
