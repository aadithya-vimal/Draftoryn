import { clientHttp } from "./client";
import type { AppUser } from "../auth/clerk";

export interface AnalysisProject {
  id: string;
  owner_id: string;
  workspace_id: string | null;
  name: string;
  report_type: string;
  engagement: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ArtifactRow {
  id: string;
  filename: string;
  media_type: string;
  size_bytes: number;
  checksum: string;
  artifact_type: string;
  parser: string;
  status: string;
  storage_key: string | null;
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

export interface CandidateRow {
  id: string;
  title: string;
  severity: string;
  severity_basis: string;
  confidence: string;
  evidence_level: string;
  status: string;
  duplicate_of: string | null;
  cwe: string;
  taxonomy_mappings: string;
  evidence_ids?: string;
  affected_assets?: string;
  description?: string;
}

export interface EvidenceRow {
  id: string;
  source_artifact_id: string;
  source_location: string;
  evidence_type: string;
  title: string;
  confidence: string;
  evidence_level: string;
}

export interface ConflictRow {
  id: string;
  kind: string;
  summary: string;
  evidence_ids: string;
  resolution: string;
}

export interface ReportMeta {
  id: string;
  type: string;
  status: string;
  view: string;
  version: number;
  generated_at: string;
}

const enc = encodeURIComponent;

export async function listAnalyses(user: AppUser): Promise<AnalysisProject[]> {
  return clientHttp<AnalysisProject[]>("/api/analyses", { method: "GET" }, user);
}

export async function createAnalysis(
  user: AppUser,
  input: { name: string; reportType?: string; engagement?: Record<string, unknown> },
): Promise<AnalysisProject> {
  return clientHttp<AnalysisProject>("/api/analyses", { method: "POST", body: JSON.stringify(input) }, user);
}

export async function deleteAnalysis(user: AppUser, id: string): Promise<void> {
  await clientHttp(`/api/analyses/${enc(id)}`, { method: "DELETE" }, user);
}

export async function listArtifacts(user: AppUser, analysisId: string): Promise<ArtifactRow[]> {
  return clientHttp<ArtifactRow[]>(`/api/analyses/${enc(analysisId)}/artifacts`, { method: "GET" }, user);
}

export async function uploadArtifact(
  user: AppUser,
  analysisId: string,
  input: { filename: string; mediaType: string; content: string },
): Promise<{ id: string; duplicate: boolean; checksum: string }> {
  return clientHttp(`/api/analyses/${enc(analysisId)}/artifacts`, { method: "POST", body: JSON.stringify(input) }, user);
}

export async function runAnalysis(user: AppUser, analysisId: string): Promise<{ jobId: string; summary: AnalysisSummary }> {
  return clientHttp(`/api/analyses/${enc(analysisId)}/run`, { method: "POST" }, user);
}

export async function getJob(user: AppUser, jobId: string): Promise<{ id: string; status: string; error: string | null }> {
  return clientHttp(`/api/jobs/${enc(jobId)}`, { method: "GET" }, user);
}

export async function listEvidence(user: AppUser, analysisId: string): Promise<EvidenceRow[]> {
  return clientHttp<EvidenceRow[]>(`/api/analyses/${enc(analysisId)}/evidence`, { method: "GET" }, user);
}

export async function listFindings(
  user: AppUser,
  analysisId: string,
): Promise<{ candidates: CandidateRow[]; confirmed: Array<Record<string, unknown>> }> {
  return clientHttp(`/api/analyses/${enc(analysisId)}/findings`, { method: "GET" }, user);
}

export async function listConflicts(user: AppUser, analysisId: string): Promise<ConflictRow[]> {
  return clientHttp<ConflictRow[]>(`/api/analyses/${enc(analysisId)}/conflicts`, { method: "GET" }, user);
}

export async function findingAction(
  user: AppUser,
  analysisId: string,
  findingId: string,
  body: Record<string, unknown>,
): Promise<void> {
  await clientHttp(`/api/analyses/${enc(analysisId)}/findings/${enc(findingId)}`, { method: "PATCH", body: JSON.stringify(body) }, user);
}

export async function listReports(user: AppUser, analysisId: string): Promise<ReportMeta[]> {
  return clientHttp<ReportMeta[]>(`/api/analyses/${enc(analysisId)}/reports`, { method: "GET" }, user);
}

export async function generateReport(
  user: AppUser,
  analysisId: string,
  input: { view?: string; engagement?: Record<string, unknown> },
): Promise<{ id: string; version: number; report: Record<string, unknown> }> {
  return clientHttp(`/api/analyses/${enc(analysisId)}/reports`, { method: "POST", body: JSON.stringify(input) }, user);
}
