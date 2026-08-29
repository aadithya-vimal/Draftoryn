-- ============================================================================
-- Row-Level Security for Draftoryn.
-- Every private document is isolated to its owner. Authorization is enforced at
-- the database layer via the app.user_id session setting, which the
-- application sets after authenticating the request (or which Neon Auth sets
-- from the user JWT on the authenticated pooler).
-- ============================================================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documents_owner_select ON documents;
CREATE POLICY documents_owner_select ON documents
  FOR SELECT
  USING (owner_id = current_setting('app.user_id', true));

DROP POLICY IF EXISTS documents_owner_insert ON documents;
CREATE POLICY documents_owner_insert ON documents
  FOR INSERT
  WITH CHECK (owner_id = current_setting('app.user_id', true));

DROP POLICY IF EXISTS documents_owner_update ON documents;
CREATE POLICY documents_owner_update ON documents
  FOR UPDATE
  USING (owner_id = current_setting('app.user_id', true))
  WITH CHECK (owner_id = current_setting('app.user_id', true));

DROP POLICY IF EXISTS documents_owner_delete ON documents;
CREATE POLICY documents_owner_delete ON documents
  FOR DELETE
  USING (owner_id = current_setting('app.user_id', true));

DROP POLICY IF EXISTS users_self ON users;
CREATE POLICY users_self ON users
  USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));
