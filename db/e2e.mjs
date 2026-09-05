import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = neon(connectionString);

async function runE2eTest() {
  console.log("=== Testing Neon PostgreSQL Data Persistence End-to-End ===");
  const testUserId = "user_test_e2e_" + Date.now();
  const testDocId = "doc_test_e2e_" + Date.now();

  try {
    // 1. Create User
    console.log("1. Creating User in users table...");
    await sql(
      `INSERT INTO users (id, email, name, avatar_url, role, onboarding_completed, onboarding_step, onboarding_data, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'security_professional', false, 1, '{}'::jsonb, now(), now())`,
      [testUserId, `${testUserId}@example.com`, "Test E2E User", "https://example.com/avatar.png"]
    );
    const userRes = await sql(`SELECT * FROM users WHERE id = $1`, [testUserId]);
    if (userRes.length === 0 || userRes[0].email !== `${testUserId}@example.com`) {
      throw new Error("User creation verification failed");
    }
    console.log("   ✓ User created and verified:", userRes[0].id);

    // 2. Default Workspace
    console.log("2. Creating Workspace in workspaces table...");
    const wsId = "ws_" + testUserId;
    await sql(
      `INSERT INTO workspaces (id, owner_id, name, slug, is_default, settings, created_at, updated_at)
       VALUES ($1, $2, 'Primary Workspace', 'primary', true, '{}'::jsonb, now(), now())`,
      [wsId, testUserId]
    );
    const wsRes = await sql(`SELECT * FROM workspaces WHERE owner_id = $1`, [testUserId]);
    if (wsRes.length === 0 || wsRes[0].name !== "Primary Workspace") {
      throw new Error("Workspace creation verification failed");
    }
    console.log("   ✓ Workspace created and verified:", wsRes[0].id);

    // 3. User Settings
    console.log("3. Creating & Updating User Settings in user_settings table...");
    await sql(
      `INSERT INTO user_settings (user_id, default_export_format, compact_lists, tester_profile, client_profile, updated_at)
       VALUES ($1, 'markdown', false, '{"fullName":"Alice Tester"}'::jsonb, '{"companyName":"Acme Corp"}'::jsonb, now())`,
      [testUserId]
    );
    const settingsRes = await sql(`SELECT * FROM user_settings WHERE user_id = $1`, [testUserId]);
    if (settingsRes.length === 0 || settingsRes[0].default_export_format !== "markdown") {
      throw new Error("User settings verification failed");
    }
    console.log("   ✓ User settings persisted:", settingsRes[0].default_export_format);

    // 4. Update Onboarding
    console.log("4. Updating Onboarding status...");
    await sql(
      `UPDATE users SET onboarding_completed = true, onboarding_step = 2, onboarding_data = '{"role":"offensive_security"}'::jsonb, updated_at = now()
       WHERE id = $1`,
      [testUserId]
    );
    const updatedUser = await sql(`SELECT onboarding_completed, onboarding_data FROM users WHERE id = $1`, [testUserId]);
    if (!updatedUser[0].onboarding_completed) {
      throw new Error("Onboarding status update failed");
    }
    console.log("   ✓ Onboarding updated successfully:", updatedUser[0].onboarding_completed);

    // 5. Create Document
    console.log("5. Inserting Document in documents table...");
    await sql(
      `INSERT INTO documents (id, workspace_id, owner_id, definition_id, category, title, status, source_data, data, created_at, updated_at)
       VALUES ($1, $2, $3, 'pentest_agreement', 'offensive_security', 'Acme Pentest Agreement', 'ready', '{"company":"Acme"}'::jsonb, '{"sections":[]}'::jsonb, now(), now())`,
      [testDocId, wsId, testUserId]
    );
    const docRes = await sql(`SELECT * FROM documents WHERE id = $1`, [testDocId]);
    if (docRes.length === 0 || docRes[0].title !== "Acme Pentest Agreement") {
      throw new Error("Document creation verification failed");
    }
    console.log("   ✓ Document persisted and retrieved:", docRes[0].id, docRes[0].title);

    // 6. Insert Version Snapshot
    console.log("6. Inserting Version in document_versions table...");
    const verId = "ver_" + testDocId + "_1";
    await sql(
      `INSERT INTO document_versions (id, document_id, owner_id, version_number, title, data, created_at)
       VALUES ($1, $2, $3, 1, 'Initial Draft', '{"sections":[]}'::jsonb, now())`,
      [verId, testDocId, testUserId]
    );
    const verRes = await sql(`SELECT * FROM document_versions WHERE document_id = $1`, [testDocId]);
    if (verRes.length === 0 || verRes[0].version_number !== 1) {
      throw new Error("Document version verification failed");
    }
    console.log("   ✓ Version snapshot persisted and retrieved:", verRes[0].id, verRes[0].version_number);

    // 7. Deliverable Export Audit Log
    console.log("7. Logging Deliverable Export in document_exports table...");
    const exportId = "exp_" + Date.now();
    await sql(
      `INSERT INTO document_exports (id, document_id, owner_id, format, created_at)
       VALUES ($1, $2, $3, 'pdf', now())`,
      [exportId, testDocId, testUserId]
    );
    const exportRes = await sql(`SELECT * FROM document_exports WHERE document_id = $1`, [testDocId]);
    if (exportRes.length === 0 || exportRes[0].format !== "pdf") {
      throw new Error("Document export log verification failed");
    }
    console.log("   ✓ Export audit log persisted and retrieved:", exportRes[0].id, exportRes[0].format);

    // 8. Clean up test records
    console.log("8. Cleaning up test records...");
    await sql(`DELETE FROM document_exports WHERE owner_id = $1`, [testUserId]);
    await sql(`DELETE FROM document_versions WHERE owner_id = $1`, [testUserId]);
    await sql(`DELETE FROM documents WHERE owner_id = $1`, [testUserId]);
    await sql(`DELETE FROM user_settings WHERE user_id = $1`, [testUserId]);
    await sql(`DELETE FROM workspaces WHERE owner_id = $1`, [testUserId]);
    await sql(`DELETE FROM users WHERE id = $1`, [testUserId]);
    console.log("   ✓ Cleanup completed successfully.");

    console.log("\n>>> ALL NEON DATA PERSISTENCE TESTS PASSED! <<<");
  } catch (error) {
    console.error("E2E Test Error:", error);
    try {
      await sql(`DELETE FROM document_exports WHERE owner_id = $1`, [testUserId]);
      await sql(`DELETE FROM document_versions WHERE owner_id = $1`, [testUserId]);
      await sql(`DELETE FROM documents WHERE owner_id = $1`, [testUserId]);
      await sql(`DELETE FROM user_settings WHERE user_id = $1`, [testUserId]);
      await sql(`DELETE FROM workspaces WHERE owner_id = $1`, [testUserId]);
      await sql(`DELETE FROM users WHERE id = $1`, [testUserId]);
    } catch {}
    process.exit(1);
  }
}

runE2eTest();
