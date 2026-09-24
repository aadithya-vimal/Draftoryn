// Analysis graph: the normalized, correlated evidence model built from
// parsed artifacts. Everything downstream (review, AI, reports) reads this.

import type { AnalysisConflict, Asset, EvidenceItem, FindingCandidate, Observation } from "../schemas";
import type { ParserClassification } from "../parsers/types";

export interface AnalyzedArtifact {
  artifactId: string;
  filename: string;
  artifactType: string;
  parserId: string;
  parserVersion: string;
  classification: ParserClassification;
  warnings: string[];
}

export interface CompletenessItem {
  key: string;
  label: string;
  status: "present" | "partial" | "missing";
  detail: string;
}

export interface AnalysisSummary {
  filesAnalyzed: number;
  filesFailed: number;
  duplicateFiles: number;
  assetsIdentified: number;
  observationsExtracted: number;
  candidatesProposed: number;
  duplicatesMerged: number;
  conflictsOpen: number;
  missingItems: number;
  standardsMapped: string[];
}

export interface AnalysisGraph {
  analysisId: string;
  createdAt: string;
  artifacts: AnalyzedArtifact[];
  evidence: EvidenceItem[];
  assets: Asset[];
  observations: Observation[];
  candidates: FindingCandidate[];
  conflicts: AnalysisConflict[];
  completeness: CompletenessItem[];
  summary: AnalysisSummary;
  /** checksum → artifactId for duplicate-file detection. */
  fileChecksums: Record<string, string>;
}
