-- ===========================================================================
-- Draftoryn Document Intelligence schema (Neon / PostgreSQL)
-- Applied after schema.sql. All rows tenant-isolated via owner_id.
-- Large binaries NEVER live here: only metadata + storage keys (see R2).
-- ===========================================================================

CREATE TABLE IF NOT EXISTS analysis_projects (
  id            TEXT PRIMARY KEY,
  owner_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id  TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  report_type   TEXT NOT NULL DEFAULT 'pentest_report',
  engagement    JSONB NOT NULL DEFAULT '{}'::jsonb,
  status        TEXT NOT NULL DEFAULT 'draft',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analysis_owner ON analysis_projects (owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS source_artifacts (
  id              TEXT PRIMARY KEY,
  analysis_id     TEXT NOT NULL REFERENCES analysis_projects(id) ON DELETE CASCADE,
  owner_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename        TEXT NOT NULL,
  media_type      TEXT NOT NULL,
  size_bytes      INTEGER NOT NULL DEFAULT 0,
  checksum        TEXT NOT NULL,
  artifact_type   TEXT NOT NULL DEFAULT 'unknown',
  parser          TEXT NOT NULL DEFAULT 'generic',
  parser_version  TEXT NOT NULL DEFAULT '1.0.0',
  storage_key     TEXT,
  status          TEXT NOT NULL DEFAULT 'queued',
  failure_reason  TEXT,
  classification  JSONB NOT NULL DEFAULT '{}'::jsonb,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_artifacts_analysis ON source_artifacts (analysis_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_owner ON source_artifacts (owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_artifacts_checksum ON source_artifacts (analysis_id, checksum);

CREATE TABLE IF NOT EXISTS evidence_items (
  id                  TEXT PRIMARY KEY,
  analysis_id         TEXT NOT NULL REFERENCES analysis_projects(id) ON DELETE CASCADE,
  owner_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_artifact_id  TEXT NOT NULL REFERENCES source_artifacts(id) ON DELETE CASCADE,
  source_location     TEXT NOT NULL DEFAULT '',
  evidence_type       TEXT NOT NULL,
  title               TEXT NOT NULL,
  content             TEXT NOT NULL DEFAULT '',
  structured_data     JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence          TEXT NOT NULL DEFAULT 'medium',
  sensitivity         TEXT NOT NULL DEFAULT 'internal',
  redaction_state     TEXT NOT NULL DEFAULT 'original',
  evidence_level      TEXT NOT NULL DEFAULT 'L1_observed',
  extracted_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evidence_analysis ON evidence_items (analysis_id);
CREATE INDEX IF NOT EXISTS idx_evidence_artifact ON evidence_items (source_artifact_id);

CREATE TABLE IF NOT EXISTS analysis_assets (
  id                    TEXT PRIMARY KEY,
  analysis_id           TEXT NOT NULL REFERENCES analysis_projects(id) ON DELETE CASCADE,
  owner_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  canonical_identifier  TEXT NOT NULL,
  type                  TEXT NOT NULL DEFAULT 'other',
  hostname              TEXT,
  ip                    TEXT,
  url                   TEXT,
  application           TEXT,
  environment           TEXT,
  ownership             TEXT NOT NULL DEFAULT 'unknown',
  source_evidence_ids   JSONB NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_assets_analysis ON analysis_assets (analysis_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_canon ON analysis_assets (analysis_id, canonical_identifier);

CREATE TABLE IF NOT EXISTS analysis_observations (
  id                  TEXT PRIMARY KEY,
  analysis_id         TEXT NOT NULL REFERENCES analysis_projects(id) ON DELETE CASCADE,
  owner_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_id            TEXT REFERENCES analysis_assets(id) ON DELETE SET NULL,
  category            TEXT NOT NULL,
  description         TEXT NOT NULL,
  observed_value      TEXT,
  source_evidence_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence          TEXT NOT NULL DEFAULT 'medium',
  validated           BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_obs_analysis ON analysis_observations (analysis_id);

CREATE TABLE IF NOT EXISTS finding_candidates (
  id                    TEXT PRIMARY KEY,
  analysis_id           TEXT NOT NULL REFERENCES analysis_projects(id) ON DELETE CASCADE,
  owner_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  canonical_fingerprint TEXT NOT NULL,
  title                 TEXT NOT NULL,
  description           TEXT NOT NULL DEFAULT '',
  affected_assets       JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_ids          JSONB NOT NULL DEFAULT '[]'::jsonb,
  severity              TEXT NOT NULL,
  severity_basis        TEXT NOT NULL DEFAULT '',
  cvss                  JSONB,
  cwe                   JSONB NOT NULL DEFAULT '[]'::jsonb,
  cve                   JSONB NOT NULL DEFAULT '[]'::jsonb,
  taxonomy_mappings     JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence            TEXT NOT NULL DEFAULT 'medium',
  evidence_level        TEXT NOT NULL DEFAULT 'L1_observed',
  status                TEXT NOT NULL DEFAULT 'proposed',
  duplicate_of          TEXT,
  contradictions        JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_candidates_analysis ON finding_candidates (analysis_id, status);

CREATE TABLE IF NOT EXISTS confirmed_findings (
  id                    TEXT PRIMARY KEY,
  analysis_id           TEXT NOT NULL REFERENCES analysis_projects(id) ON DELETE CASCADE,
  owner_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  finding_candidate_id  TEXT NOT NULL,
  reference             TEXT NOT NULL,
  title                 TEXT NOT NULL,
  severity              TEXT NOT NULL,
  affected_assets       JSONB NOT NULL DEFAULT '[]'::jsonb,
  description           TEXT NOT NULL DEFAULT '',
  impact                TEXT NOT NULL DEFAULT '',
  evidence              JSONB NOT NULL DEFAULT '[]'::jsonb,
  reproduction          JSONB NOT NULL DEFAULT '[]'::jsonb,
  remediation           JSONB NOT NULL DEFAULT '[]'::jsonb,
  refs                  JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence            TEXT NOT NULL DEFAULT 'medium',
  verification_state    TEXT NOT NULL DEFAULT 'needs-review',
  cvss                  JSONB,
  taxonomy_mappings     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_confirmed_analysis ON confirmed_findings (analysis_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_confirmed_ref ON confirmed_findings (analysis_id, reference);

CREATE TABLE IF NOT EXISTS analysis_conflicts (
  id            TEXT PRIMARY KEY,
  analysis_id   TEXT NOT NULL REFERENCES analysis_projects(id) ON DELETE CASCADE,
  owner_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,
  summary       TEXT NOT NULL,
  evidence_ids  JSONB NOT NULL DEFAULT '[]'::jsonb,
  resolution    TEXT NOT NULL DEFAULT 'open',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conflicts_analysis ON analysis_conflicts (analysis_id, resolution);

CREATE TABLE IF NOT EXISTS intelligence_reports (
  id                TEXT PRIMARY KEY,
  analysis_id       TEXT NOT NULL REFERENCES analysis_projects(id) ON DELETE CASCADE,
  owner_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft',
  view              TEXT NOT NULL DEFAULT 'full',
  version           INTEGER NOT NULL DEFAULT 1,
  supersedes        TEXT,
  document_id       TEXT REFERENCES documents(id) ON DELETE SET NULL,
  data              JSONB NOT NULL,
  quality_score     DOUBLE PRECISION,
  quality_failures  JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_analysis ON intelligence_reports (analysis_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_reports_owner ON intelligence_reports (owner_id, generated_at DESC);

CREATE TABLE IF NOT EXISTS intelligence_jobs (
  id            TEXT PRIMARY KEY,
  analysis_id   TEXT REFERENCES analysis_projects(id) ON DELETE CASCADE,
  owner_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'queued',
  progress      JSONB NOT NULL DEFAULT '{}'::jsonb,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jobs_owner ON intelligence_jobs (owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_analysis ON intelligence_jobs (analysis_id);

CREATE TABLE IF NOT EXISTS intelligence_job_events (
  id          TEXT PRIMARY KEY,
  job_id      TEXT NOT NULL REFERENCES intelligence_jobs(id) ON DELETE CASCADE,
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL,
  detail      TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_events_job ON intelligence_job_events (job_id, created_at ASC);

-- Durable small-blob fallback when R2 is unconfigured. Owner-scoped BYTEA
-- side table (NOT a JSONB document field); 10 MB per-file cap applies.
CREATE TABLE IF NOT EXISTS artifact_blobs (
  storage_key TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bytes       BYTEA NOT NULL,
  media_type  TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_blobs_owner ON artifact_blobs (owner_id);
