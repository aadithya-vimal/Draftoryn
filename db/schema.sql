-- ===========================================================================
-- Draftoryn Relational PostgreSQL Schema (Neon Database)
-- Authoritative schema for production multi-tenant cybersecurity document studio
-- ===========================================================================

-- 0. Schema Migration Tracking Table
CREATE TABLE IF NOT EXISTS _migrations (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1. Users Table (Synchronized with Clerk Authentication)
CREATE TABLE IF NOT EXISTS users (
  id                    TEXT PRIMARY KEY,
  email                 TEXT,
  name                  TEXT,
  avatar_url            TEXT,
  role                  TEXT NOT NULL DEFAULT 'security_professional',
  onboarding_completed  BOOLEAN NOT NULL DEFAULT false,
  onboarding_step       INTEGER NOT NULL DEFAULT 1,
  onboarding_data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- 2. Workspaces Table
CREATE TABLE IF NOT EXISTS workspaces (
  id          TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT true,
  settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_owner_slug ON workspaces (owner_id, slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces (owner_id);

-- 3. User Settings Table (Persisted Preferences & Organization Profiles)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id                 TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_export_format   TEXT NOT NULL DEFAULT 'pdf',
  compact_lists           BOOLEAN NOT NULL DEFAULT false,
  theme_mode              TEXT NOT NULL DEFAULT 'dark',
  session_timeout_minutes INTEGER NOT NULL DEFAULT 15,
  tester_profile          JSONB NOT NULL DEFAULT '{}'::jsonb,
  client_profile          JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS theme_mode TEXT NOT NULL DEFAULT 'dark';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS session_timeout_minutes INTEGER NOT NULL DEFAULT 15;

-- 4. Documents Table (Core Cybersecurity Document Store)
CREATE TABLE IF NOT EXISTS documents (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  owner_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  definition_id TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'offensive_security',
  title         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft',
  source_data   JSONB NOT NULL DEFAULT '{}'::jsonb,
  data          JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was previously created with minimal schema
ALTER TABLE documents ADD COLUMN IF NOT EXISTS workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'offensive_security';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_data JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents (owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_workspace ON documents (workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner_updated ON documents (owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_definition ON documents (definition_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents (category);

-- 5. Document Versions Table (Revision Snapshots & History)
CREATE TABLE IF NOT EXISTS document_versions (
  id              TEXT PRIMARY KEY,
  document_id     TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  owner_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version_number  INTEGER NOT NULL,
  title           TEXT NOT NULL,
  data            JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_versions_num ON document_versions (document_id, version_number);
CREATE INDEX IF NOT EXISTS idx_doc_versions_created ON document_versions (document_id, created_at DESC);

-- 6. Document Exports Table (Audit Log of Generated Deliverables)
CREATE TABLE IF NOT EXISTS document_exports (
  id            TEXT PRIMARY KEY,
  document_id   TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  owner_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  format        TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_exports_doc ON document_exports (document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_exports_owner ON document_exports (owner_id, created_at DESC);
