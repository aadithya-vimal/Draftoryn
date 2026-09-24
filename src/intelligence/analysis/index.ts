// Pipeline entrypoint: files in → correlated AnalysisGraph out.
// Pure + deterministic: no network, no AI, no logging of content.

import { cyrb53 } from "../utils";
import { MAX_TOTAL_BYTES } from "../ingestion/identify";
import { parseArtifact, type ParserInput } from "../parsers/index";
import { normalizeArtifact } from "./normalize";
import { extractCandidates, mergeAssets } from "./correlate";
import { detectConflicts } from "./conflicts";
import { analyzeCompleteness } from "./completeness";
import type { AnalysisGraph } from "./graph";

export interface AnalysisFile {
  filename: string;
  mediaType: string;
  text: string;
  size: number;
  checksum: string;
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Deterministic fallback (non-crypto): still stable for tests/offline.
  return cyrb53(text) + cyrb53(text, 7) + cyrb53(text, 13) + cyrb53(text, 29);
}

export function analyzeArtifacts(
  analysisId: string,
  files: Array<Omit<AnalysisFile, "checksum"> & { checksum?: string }>,
  reportType = "pentest_report",
  opts: { now?: string } = {},
): AnalysisGraph {
  const total = files.reduce((n, f) => n + f.size, 0);
  if (total > MAX_TOTAL_BYTES) {
    throw new Error(`Aggregate upload exceeds ${MAX_TOTAL_BYTES} bytes.`);
  }

  const now = opts.now ?? new Date().toISOString();
  const graph: AnalysisGraph = {
    analysisId,
    createdAt: now,
    artifacts: [],
    evidence: [],
    assets: [],
    observations: [],
    candidates: [],
    conflicts: [],
    completeness: [],
    summary: {
      filesAnalyzed: 0, filesFailed: 0, duplicateFiles: 0, assetsIdentified: 0,
      observationsExtracted: 0, candidatesProposed: 0, duplicatesMerged: 0,
      conflictsOpen: 0, missingItems: 0, standardsMapped: [],
    },
    fileChecksums: {},
  };

  const assetBuckets: AnalysisGraph["assets"][] = [];
  let duplicatesMerged = 0;

  for (const f of files) {
    const checksum = f.checksum ?? cyrb53(f.text);
    if (graph.fileChecksums[checksum]) {
      graph.summary.duplicateFiles++;
      continue;
    }
    const input: ParserInput = { filename: f.filename, mediaType: f.mediaType, text: f.text, size: f.size };
    const { result, parserId, parserVersion } = parseArtifact(input);
    const failed = result.classification.label === "Unparseable artifact";
    const norm = normalizeArtifact(analysisId, f.filename, checksum, f.mediaType, f.size, result, parserId, parserVersion, now);
    graph.fileChecksums[checksum] = norm.artifact.artifactId;
    graph.artifacts.push(norm.artifact);
    graph.evidence.push(...norm.evidence);
    graph.observations.push(...norm.observations);
    assetBuckets.push(norm.assets);
    if (failed) graph.summary.filesFailed++;
    else graph.summary.filesAnalyzed++;
  }

  graph.assets = mergeAssets(assetBuckets);
  // Re-link evidence to merged assets.
  for (const a of graph.assets) {
    const hay = (id: string): boolean => graph.evidence.some((e) => e.id === id);
    a.sourceEvidenceIds = a.sourceEvidenceIds.filter(hay);
    for (const e of graph.evidence) {
      const text = `${e.title} ${JSON.stringify(e.structuredData)}`.toLowerCase();
      if (a.canonicalIdentifier.length >= 4 && text.includes(a.canonicalIdentifier) && !a.sourceEvidenceIds.includes(e.id)) {
        a.sourceEvidenceIds.push(e.id);
      }
    }
  }

  const { candidates, duplicatesMerged: merged } = extractCandidates(analysisId, graph.evidence, graph.assets);
  duplicatesMerged = merged;
  graph.candidates = candidates;
  graph.conflicts = detectConflicts(analysisId, graph.evidence, graph.assets, candidates);
  graph.completeness = analyzeCompleteness(graph, reportType);

  const standards = new Set<string>();
  for (const c of candidates) {
    if (c.cwe.length > 0) standards.add("CWE");
    if ((c.taxonomyMappings.owaspWstg ?? []).length > 0) standards.add("WSTG");
    if ((c.taxonomyMappings.nistRefs ?? []).length > 0) standards.add("NIST");
    if ((c.taxonomyMappings.attck ?? []).length > 0) standards.add("ATT&CK");
    if (c.cvss) standards.add("CVSS");
  }

  graph.summary = {
    filesAnalyzed: graph.summary.filesAnalyzed,
    filesFailed: graph.summary.filesFailed,
    duplicateFiles: graph.summary.duplicateFiles,
    assetsIdentified: graph.assets.length,
    observationsExtracted: graph.observations.length,
    candidatesProposed: candidates.length,
    duplicatesMerged,
    conflictsOpen: graph.conflicts.filter((c) => c.resolution === "open").length,
    missingItems: graph.completeness.filter((c) => c.status === "missing").length,
    standardsMapped: [...standards].sort(),
  };

  // Deterministic ordering for stable output.
  graph.evidence.sort((a, b) => a.id.localeCompare(b.id));
  graph.assets.sort((a, b) => a.id.localeCompare(b.id));
  graph.observations.sort((a, b) => a.id.localeCompare(b.id));

  return graph;
}
