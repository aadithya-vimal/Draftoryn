-- Draftoryn document store.
-- Ownership is enforced two ways:
--   1. The application server always scopes every query with owner_id = $1
--      (a server-enforced database boundary, never a client-side filter).
--   2. When this table is accessed through Neon's RLS / Authenticated Postgres
--      (JWT auth), the policy below enforces ownership at the row level too.

CREATE TABLE IF NOT EXISTS documents (
  id            TEXT PRIMARY KEY,
  owner_id      TEXT NOT NULL,
  definition_id TEXT NOT NULL,
  title         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft',
  data          JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents (owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner_updated ON documents (owner_id, updated_at DESC);

-- Optional defense-in-depth for Neon RLS (JWT) connections:
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY owner_policy ON documents
--   FOR ALL
--   USING (owner_id = auth_user_id())
--   WITH CHECK (owner_id = auth_user_id());
