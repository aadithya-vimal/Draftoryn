// Neon persistence for document intelligence. Every query is owner-scoped
// (WHERE owner_id = actor); foreign ids surface as null/404, never leak.
// Mirrors the conventions of server/neon.ts.

import { neon } from "@neondatabase/serverless";
import type { AnalysisGraph } from "../src/intelligence/analysis/graph";

let _sql: ((query: string, params?: unknown[]) => Promise<unknown[]>) | null = null;

function client(): (query: string, params?: unknown[]) => Promise<unknown[]> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is not configured on the server.");
  if (!_sql) _sql = neon(dbUrl) as unknown as (query: string, params?: unknown[]) => Promise<unknown[]>;
  return _sql;
}

function newId(prefix: string, length = 10): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  const cryptoObj = (globalThis as unknown as { crypto?: { getRandomValues?: (a: Uint8Array) => void } }).crypto;
  if (cryptoObj?.getRandomValues) cryptoObj.getRandomValues(bytes);
  else for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  let suffix = "";
  for (const b of bytes) suffix += alphabet[(b as number) % alphabet.length];
  return `${prefix}_${suffix}`;
}

export function resetIntelligenceClient(): void {
  _sql = null;
}

/** Shared query client for sibling server modules (storage fallback). */
export function intelSql(): (query: string, params?: unknown[]) => Promise<unknown[]> {
  return client();
}

async function ownedAnalysisId(ownerId: string, analysisId: string): Promise<boolean> {
  const sql = client();
  const rows = (await sql("SELECT id FROM analysis_projects WHERE owner_id = $1 AND id = $2", [ownerId, analysisId])) as Array<{ id: string }>;
  return !!rows[0];
}

export interface AnalysisRow {
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

export async function createAnalysis(
  ownerId: string,
  input: { name: string; reportType?: string; workspaceId?: string; engagement?: Record<string, unknown> },
): Promise<AnalysisRow> {
  const sql = client();
  const id = newId("an");
  const rows = (await sql(
    `INSERT INTO analysis_projects (id, owner_id, workspace_id, name, report_type, engagement, status)
     VALUES ($1,$2,$3,$4,$5,$6,'draft') RETURNING *`,
    [id, ownerId, input.workspaceId ?? null, input.name.slice(0, 200), (input.reportType ?? "pentest_report").slice(0, 80), JSON.stringify(input.engagement ?? {})],
  )) as AnalysisRow[];
  return rows[0]!;
}

export async function listAnalyses(ownerId: string, limit = 50): Promise<AnalysisRow[]> {
  const sql = client();
  const safe = Math.min(Math.max(limit, 1), 50);
  return (await sql(`SELECT * FROM analysis_projects WHERE owner_id = $1 ORDER BY updated_at DESC LIMIT $2`, [ownerId, safe])) as AnalysisRow[];
}

export async function getAnalysis(ownerId: string, analysisId: string): Promise<AnalysisRow | null> {
  const sql = client();
  const rows = (await sql(`SELECT * FROM analysis_projects WHERE owner_id = $1 AND id = $2`, [ownerId, analysisId])) as AnalysisRow[];
  return rows[0] ?? null;
}

export async function deleteAnalysis(ownerId: string, analysisId: string): Promise<void> {
  const sql = client();
  // Storage blobs are removed by the route layer (needs provider); rows cascade.
  await sql(`DELETE FROM analysis_projects WHERE owner_id = $1 AND id = $2`, [ownerId, analysisId]);
}

export async function saveAnalysisGraph(ownerId: string, graph: AnalysisGraph): Promise<void> {
  const sql = client();
  if (!(await ownedAnalysisId(ownerId, graph.analysisId))) throw new Error("Analysis not found.");
  const aid = graph.analysisId;
  await sql(`DELETE FROM analysis_conflicts WHERE owner_id=$1 AND analysis_id=$2`, [ownerId, aid]);
  await sql(`DELETE FROM finding_candidates WHERE owner_id=$1 AND analysis_id=$2`, [ownerId, aid]);
  await sql(`DELETE FROM analysis_observations WHERE owner_id=$1 AND analysis_id=$2`, [ownerId, aid]);
  await sql(`DELETE FROM analysis_assets WHERE owner_id=$1 AND analysis_id=$2`, [ownerId, aid]);
  await sql(`DELETE FROM evidence_items WHERE owner_id=$1 AND analysis_id=$2`, [ownerId, aid]);

  const checksumOf = (artifactId: string): string => {
    for (const [checksum, id] of Object.entries(graph.fileChecksums)) {
      if (id === artifactId) return checksum;
    }
    return "";
  };
  for (const a of graph.artifacts) {
    await sql(
      `INSERT INTO source_artifacts (id, analysis_id, owner_id, filename, media_type, size_bytes, checksum, artifact_type, parser, parser_version, status, classification)
       VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,$9,'parsed',$10)
       ON CONFLICT (id) DO UPDATE SET status='parsed', classification=$10`,
      [a.artifactId, aid, ownerId, a.filename, "application/octet-stream", checksumOf(a.artifactId), a.artifactType, a.parserId, a.parserVersion, JSON.stringify(a.classification)],
    );
  }
  for (const e of graph.evidence) {
    await sql(
      `INSERT INTO evidence_items (id, analysis_id, owner_id, source_artifact_id, source_location, evidence_type, title, content, structured_data, confidence, sensitivity, redaction_state, evidence_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING`,
      [e.id, aid, ownerId, e.sourceArtifactId, e.sourceLocation, e.evidenceType, e.title, e.content.slice(0, 20000), JSON.stringify(e.structuredData), e.confidence, e.sensitivity, e.redactionState, e.evidenceLevel],
    );
  }
  for (const a of graph.assets) {
    await sql(
      `INSERT INTO analysis_assets (id, analysis_id, owner_id, canonical_identifier, type, hostname, ip, url, application, environment, ownership, source_evidence_ids)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
      [a.id, aid, ownerId, a.canonicalIdentifier, a.type, a.hostname ?? null, a.ip ?? null, a.url ?? null, a.application ?? null, a.environment ?? null, a.ownership, JSON.stringify(a.sourceEvidenceIds)],
    );
  }
  for (const o of graph.observations) {
    await sql(
      `INSERT INTO analysis_observations (id, analysis_id, owner_id, asset_id, category, description, observed_value, source_evidence_ids, confidence, validated)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
      [o.id, aid, ownerId, o.assetId ?? null, o.category, o.description.slice(0, 5000), o.observedValue ?? null, JSON.stringify(o.sourceEvidenceIds), o.confidence, o.validated],
    );
  }
  for (const c of graph.candidates) {
    await sql(
      `INSERT INTO finding_candidates (id, analysis_id, owner_id, canonical_fingerprint, title, description, affected_assets, evidence_ids, severity, severity_basis, cvss, cwe, cve, taxonomy_mappings, confidence, evidence_level, status, duplicate_of, contradictions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) ON CONFLICT (id) DO NOTHING`,
      [c.id, aid, ownerId, c.canonicalFingerprint, c.title, c.description.slice(0, 10000), JSON.stringify(c.affectedAssets), JSON.stringify(c.evidenceIds), c.severity, c.severityBasis.slice(0, 1000), c.cvss ? JSON.stringify(c.cvss) : null, JSON.stringify(c.cwe), JSON.stringify(c.cve), JSON.stringify(c.taxonomyMappings), c.confidence, c.evidenceLevel, c.status, c.duplicateOf ?? null, JSON.stringify(c.contradictions)],
    );
  }
  for (const c of graph.conflicts) {
    await sql(
      `INSERT INTO analysis_conflicts (id, analysis_id, owner_id, kind, summary, evidence_ids, resolution)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [c.id, aid, ownerId, c.kind, c.summary.slice(0, 1000), JSON.stringify(c.evidenceIds), c.resolution],
    );
  }
  await sql(`UPDATE analysis_projects SET status='analyzed', updated_at=now() WHERE owner_id=$1 AND id=$2`, [ownerId, aid]);
}

export async function updateCandidate(
  ownerId: string,
  analysisId: string,
  candidateId: string,
  patch: { status?: string; title?: string; description?: string; severity?: string; duplicateOf?: string | null; evidenceIds?: string[]; affectedAssets?: string[] },
): Promise<void> {
  const sql = client();
  if (!(await ownedAnalysisId(ownerId, analysisId))) throw new Error("Analysis not found.");
  const sets: string[] = ["updated_at=now()"];
  const params: unknown[] = [];
  const push = (col: string, val: unknown) => {
    params.push(val);
    sets.push(`${col}=$${params.length + 2}`);
  };
  if (patch.status !== undefined) push("status", patch.status.slice(0, 24));
  if (patch.title !== undefined) push("title", patch.title.slice(0, 300));
  if (patch.description !== undefined) push("description", patch.description.slice(0, 10000));
  if (patch.severity !== undefined) push("severity", patch.severity.slice(0, 24));
  if (patch.duplicateOf !== undefined) push("duplicate_of", patch.duplicateOf);
  if (patch.evidenceIds !== undefined) push("evidence_ids", JSON.stringify(patch.evidenceIds));
  if (patch.affectedAssets !== undefined) push("affected_assets", JSON.stringify(patch.affectedAssets));
  await sql(
    `UPDATE finding_candidates SET ${sets.join(", ")} WHERE owner_id=$1 AND analysis_id=$2 AND id=$${params.length + 3}`,
    [ownerId, analysisId, ...params, candidateId],
  );
}

export async function saveConfirmedFinding(
  ownerId: string,
  analysisId: string,
  f: { id: string; findingCandidateId: string; reference: string; title: string; severity: string; affectedAssets: string[]; description: string; impact: string; evidence: string[]; reproduction: string[]; remediation: string[]; references: string[]; confidence: string; verificationState: string; cvss?: unknown; taxonomyMappings: unknown },
): Promise<void> {
  const sql = client();
  if (!(await ownedAnalysisId(ownerId, analysisId))) throw new Error("Analysis not found.");
  await sql(
    `INSERT INTO confirmed_findings (id, analysis_id, owner_id, finding_candidate_id, reference, title, severity, affected_assets, description, impact, evidence, reproduction, remediation, refs, confidence, verification_state, cvss, taxonomy_mappings)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     ON CONFLICT (id) DO UPDATE SET title=$6, severity=$7, impact=$10, remediation=$13, verification_state=$16`,
    [f.id, analysisId, ownerId, f.findingCandidateId, f.reference, f.title, f.severity, JSON.stringify(f.affectedAssets), f.description, f.impact, JSON.stringify(f.evidence), JSON.stringify(f.reproduction), JSON.stringify(f.remediation), JSON.stringify(f.references), f.confidence, f.verificationState, f.cvss ? JSON.stringify(f.cvss) : null, JSON.stringify(f.taxonomyMappings)],
  );
}

export async function saveReport(
  ownerId: string,
  analysisId: string,
  report: { id: string; type: string; status: string; view: string; data: unknown; qualityScore?: number; qualityFailures: string[]; documentId?: string },
): Promise<{ id: string; version: number }> {
  const sql = client();
  if (!(await ownedAnalysisId(ownerId, analysisId))) throw new Error("Analysis not found.");
  const existing = (await sql(`SELECT COALESCE(MAX(version),0) AS v FROM intelligence_reports WHERE owner_id=$1 AND analysis_id=$2`, [ownerId, analysisId])) as Array<{ v: number }>;
  const version = (existing[0]?.v ?? 0) + 1;
  await sql(
    `INSERT INTO intelligence_reports (id, analysis_id, owner_id, type, status, view, version, data, quality_score, quality_failures, document_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [report.id, analysisId, ownerId, report.type, report.status, report.view, version, JSON.stringify(report.data), report.qualityScore ?? null, JSON.stringify(report.qualityFailures), report.documentId ?? null],
  );
  return { id: report.id, version };
}

export async function listReports(ownerId: string, analysisId: string): Promise<Array<{ id: string; type: string; status: string; view: string; version: number; generated_at: string }>> {
  const sql = client();
  if (!(await ownedAnalysisId(ownerId, analysisId))) throw new Error("Analysis not found.");
  return (await sql(
    `SELECT id, type, status, view, version, generated_at FROM intelligence_reports WHERE owner_id=$1 AND analysis_id=$2 ORDER BY version DESC`,
    [ownerId, analysisId],
  )) as Array<{ id: string; type: string; status: string; view: string; version: number; generated_at: string }>;
}

export async function getReportData(ownerId: string, analysisId: string, reportId: string): Promise<Record<string, unknown> | null> {
  const sql = client();
  if (!(await ownedAnalysisId(ownerId, analysisId))) return null;
  const rows = (await sql(`SELECT data FROM intelligence_reports WHERE owner_id=$1 AND analysis_id=$2 AND id=$3`, [ownerId, analysisId, reportId])) as Array<{ data: Record<string, unknown> }>;
  return rows[0]?.data ?? null;
}

export async function insertArtifactRow(
  ownerId: string,
  analysisId: string,
  input: { filename: string; mediaType: string; size: number; checksum: string; storageKey: string },
): Promise<{ id: string; duplicate: boolean }> {
  const sql = client();
  if (!(await ownedAnalysisId(ownerId, analysisId))) throw new Error("Analysis not found.");
  const existing = (await sql(
    `SELECT sa.id FROM source_artifacts sa JOIN analysis_projects ap ON ap.id = sa.analysis_id
     WHERE ap.owner_id = $1 AND sa.analysis_id = $2 AND sa.checksum = $3`,
    [ownerId, analysisId, input.checksum],
  )) as Array<{ id: string }>;
  if (existing[0]) return { id: existing[0].id, duplicate: true };
  const id = newId("art");
  await sql(
    `INSERT INTO source_artifacts (id, analysis_id, owner_id, filename, media_type, size_bytes, checksum, artifact_type, parser, parser_version, storage_key, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'unknown','generic','1.0.0',$8,'uploaded')`,
    [id, analysisId, ownerId, input.filename.slice(0, 255), input.mediaType.slice(0, 127), input.size, input.checksum, input.storageKey],
  );
  return { id, duplicate: false };
}

export async function listArtifactRows(ownerId: string, analysisId: string): Promise<Array<{ id: string; filename: string; media_type: string; size_bytes: number; checksum: string; artifact_type: string; parser: string; status: string; storage_key: string | null }>> {
  const sql = client();
  if (!(await ownedAnalysisId(ownerId, analysisId))) throw new Error("Analysis not found.");
  return (await sql(
    `SELECT id, filename, media_type, size_bytes, checksum, artifact_type, parser, status, storage_key FROM source_artifacts WHERE owner_id=$1 AND analysis_id=$2 ORDER BY uploaded_at ASC`,
    [ownerId, analysisId],
  )) as Array<{ id: string; filename: string; media_type: string; size_bytes: number; checksum: string; artifact_type: string; parser: string; status: string; storage_key: string | null }>;
}

export async function listEvidenceRows(ownerId: string, analysisId: string, limit = 200): Promise<unknown[]> {
  const sql = client();
  if (!(await ownedAnalysisId(ownerId, analysisId))) throw new Error("Analysis not found.");
  const safe = Math.min(Math.max(limit, 1), 500);
  return (await sql(`SELECT id, source_artifact_id, source_location, evidence_type, title, confidence, evidence_level FROM evidence_items WHERE owner_id=$1 AND analysis_id=$2 ORDER BY id ASC LIMIT $3`, [ownerId, analysisId, safe])) as unknown[];
}

export async function listCandidateRows(ownerId: string, analysisId: string): Promise<unknown[]> {
  const sql = client();
  if (!(await ownedAnalysisId(ownerId, analysisId))) throw new Error("Analysis not found.");
  return (await sql(
    `SELECT id, title, severity, severity_basis, confidence, evidence_level, status, duplicate_of, cwe, taxonomy_mappings, evidence_ids, affected_assets, description FROM finding_candidates WHERE owner_id=$1 AND analysis_id=$2 ORDER BY severity DESC, id ASC`,
    [ownerId, analysisId],
  )) as unknown[];
}

export async function listConflictRows(ownerId: string, analysisId: string): Promise<unknown[]> {
  const sql = client();
  if (!(await ownedAnalysisId(ownerId, analysisId))) throw new Error("Analysis not found.");
  return (await sql(`SELECT id, kind, summary, evidence_ids, resolution FROM analysis_conflicts WHERE owner_id=$1 AND analysis_id=$2 ORDER BY id ASC`, [ownerId, analysisId])) as unknown[];
}

export async function listConfirmedRows(ownerId: string, analysisId: string): Promise<unknown[]> {
  const sql = client();
  if (!(await ownedAnalysisId(ownerId, analysisId))) throw new Error("Analysis not found.");
  return (await sql(`SELECT * FROM confirmed_findings WHERE owner_id=$1 AND analysis_id=$2 ORDER BY reference ASC`, [ownerId, analysisId])) as unknown[];
}

export async function getCandidateRow(ownerId: string, analysisId: string, candidateId: string): Promise<Record<string, unknown> | null> {
  const sql = client();
  if (!(await ownedAnalysisId(ownerId, analysisId))) return null;
  const rows = (await sql(`SELECT * FROM finding_candidates WHERE owner_id=$1 AND analysis_id=$2 AND id=$3`, [ownerId, analysisId, candidateId])) as Array<Record<string, unknown>>;
  return rows[0] ?? null;
}

export async function createJobRow(ownerId: string, analysisId: string | null, kind: string): Promise<{ id: string; status: string }> {
  const sql = client();
  const id = newId("job");
  await sql(`INSERT INTO intelligence_jobs (id, analysis_id, owner_id, kind, status) VALUES ($1,$2,$3,$4,'queued')`, [id, analysisId, ownerId, kind.slice(0, 40)]);
  await sql(`INSERT INTO intelligence_job_events (id, job_id, owner_id, status, detail) VALUES ($1,$2,$3,'queued','created')`, [newId("jev"), id, ownerId]);
  return { id, status: "queued" };
}

export async function updateJobRow(ownerId: string, jobId: string, status: string, error?: string): Promise<void> {
  const sql = client();
  await sql(`UPDATE intelligence_jobs SET status=$1, error=$2, updated_at=now() WHERE owner_id=$3 AND id=$4`, [status.slice(0, 24), error?.slice(0, 1000) ?? null, ownerId, jobId]);
  await sql(`INSERT INTO intelligence_job_events (id, job_id, owner_id, status, detail) VALUES ($1,$2,$3,$4,$5)`, [newId("jev"), jobId, ownerId, status.slice(0, 24), (error ?? "").slice(0, 500)]);
}

export async function getJobRow(ownerId: string, jobId: string): Promise<{ id: string; status: string; kind: string; analysis_id: string | null; error: string | null } | null> {
  const sql = client();
  const rows = (await sql(`SELECT id, status, kind, analysis_id, error FROM intelligence_jobs WHERE owner_id=$1 AND id=$2`, [ownerId, jobId])) as Array<{ id: string; status: string; kind: string; analysis_id: string | null; error: string | null }>;
  return rows[0] ?? null;
}
