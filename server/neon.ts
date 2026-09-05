import { neon } from "@neondatabase/serverless";
import type { DocumentRecord, DocumentSummary } from "../src/repository/types";
import { getDefinition } from "../src/engine/definitions/catalog";

export interface DbUser {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  onboardingCompleted: boolean;
  onboardingStep: number;
  onboardingData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DbWorkspace {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  isDefault: boolean;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DbUserSettings {
  userId: string;
  defaultExportFormat: string;
  compactLists: boolean;
  themeMode: string;
  sessionTimeoutMinutes: number;
  testerProfile: Record<string, unknown>;
  clientProfile: Record<string, unknown>;
  aiSettings?: Record<string, unknown>;
  updatedAt: string;
}

export interface DbDocumentVersion {
  id: string;
  documentId: string;
  ownerId: string;
  versionNumber: number;
  title: string;
  data: unknown;
  createdAt: string;
}

export interface DbDocumentExport {
  id: string;
  documentId: string;
  ownerId: string;
  format: string;
  createdAt: string;
}

let _sql: ((query: string, params?: unknown[]) => Promise<unknown[]>) | null = null;

function client(): (query: string, params?: unknown[]) => Promise<unknown[]> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is not configured on the server.");
  if (!_sql) {
    _sql = neon(dbUrl) as unknown as (query: string, params?: unknown[]) => Promise<unknown[]>;
  }
  return _sql;
}

function toSummary(rec: DocumentRecord): DocumentSummary {
  const def = getDefinition(rec.definitionId);
  return {
    id: rec.id,
    definitionId: rec.definitionId,
    category: def?.category ?? "offensive_security",
    workspaceId: rec.workspaceId,
    title: rec.title,
    status: rec.status,
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
  };
}

async function withRls<T>(ownerId: string, fn: (sql: (query: string, params?: unknown[]) => Promise<unknown[]>) => Promise<T>): Promise<T> {
  const sql = client();
  await sql("SELECT set_config('app.user_id', $1, true)", [ownerId]);
  return fn(sql);
}

// ---------------------------------------------------------------------------
// 1. User Provisioning & Onboarding Management
// ---------------------------------------------------------------------------

export async function getOrCreateUser(
  userId: string,
  profile?: { email?: string; name?: string; avatarUrl?: string },
): Promise<{ user: DbUser; workspace: DbWorkspace; settings: DbUserSettings }> {
  return withRls(userId, async (sql) => {
    // 1. Check or insert user
    const userRows = (await sql(
      `SELECT id, email, name, avatar_url, role, onboarding_completed, onboarding_step, onboarding_data, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId],
    )) as Array<{
      id: string;
      email: string | null;
      name: string | null;
      avatar_url: string | null;
      role: string;
      onboarding_completed: boolean;
      onboarding_step: number;
      onboarding_data: Record<string, unknown>;
      created_at: string;
      updated_at: string;
    }>;

    let user: DbUser;
    if (userRows.length > 0 && userRows[0]) {
      const u = userRows[0];
      // Update email/name if changed in Clerk
      if (profile && (profile.email !== u.email || profile.name !== u.name)) {
        await sql(
          `UPDATE users SET email = COALESCE($2, email), name = COALESCE($3, name), avatar_url = COALESCE($4, avatar_url), updated_at = now()
           WHERE id = $1`,
          [userId, profile.email ?? null, profile.name ?? null, profile.avatarUrl ?? null],
        );
      }
      user = {
        id: u.id,
        email: profile?.email ?? u.email,
        name: profile?.name ?? u.name,
        avatarUrl: profile?.avatarUrl ?? u.avatar_url,
        role: u.role,
        onboardingCompleted: Boolean(u.onboarding_completed),
        onboardingStep: Number(u.onboarding_step ?? 1),
        onboardingData: (u.onboarding_data as Record<string, unknown>) ?? {},
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      };
    } else {
      // Create new user in Neon
      const email = profile?.email ?? null;
      const name = profile?.name ?? (email ? email.split("@")[0] : "Security Professional");
      const avatarUrl = profile?.avatarUrl ?? null;

      await sql(
        `INSERT INTO users (id, email, name, avatar_url, role, onboarding_completed, onboarding_step, onboarding_data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'security_professional', false, 1, '{}'::jsonb, now(), now())
         ON CONFLICT (id) DO NOTHING`,
        [userId, email, name, avatarUrl],
      );

      user = {
        id: userId,
        email: email ?? null,
        name: name ?? null,
        avatarUrl: avatarUrl ?? null,
        role: "security_professional",
        onboardingCompleted: false,
        onboardingStep: 1,
        onboardingData: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // 2. Ensure default workspace exists
    const wsRows = (await sql(
      `SELECT id, owner_id, name, slug, is_default, settings, created_at, updated_at
       FROM workspaces WHERE owner_id = $1 ORDER BY is_default DESC, created_at ASC`,
      [userId],
    )) as Array<{
      id: string;
      owner_id: string;
      name: string;
      slug: string;
      is_default: boolean;
      settings: Record<string, unknown>;
      created_at: string;
      updated_at: string;
    }>;

    let workspace: DbWorkspace;
    if (wsRows.length > 0 && wsRows[0]) {
      const w = wsRows[0];
      workspace = {
        id: w.id,
        ownerId: w.owner_id,
        name: w.name,
        slug: w.slug,
        isDefault: Boolean(w.is_default),
        settings: w.settings ?? {},
        createdAt: w.created_at,
        updatedAt: w.updated_at,
      };
    } else {
      const wsId = "ws_" + Math.random().toString(36).slice(2, 10);
      const wsName = (user.name ? user.name + "'s Workspace" : "Primary Security Workspace");
      const wsSlug = "default";
      await sql(
        `INSERT INTO workspaces (id, owner_id, name, slug, is_default, settings, created_at, updated_at)
         VALUES ($1, $2, $3, $4, true, '{}'::jsonb, now(), now())
         ON CONFLICT (owner_id, slug) DO NOTHING`,
        [wsId, userId, wsName, wsSlug],
      );
      workspace = {
        id: wsId,
        ownerId: userId,
        name: wsName,
        slug: wsSlug,
        isDefault: true,
        settings: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // 3. Ensure user settings exist
    const settingsRows = (await sql(
      `SELECT user_id, default_export_format, compact_lists, theme_mode, session_timeout_minutes, tester_profile, client_profile, ai_settings, updated_at
       FROM user_settings WHERE user_id = $1`,
      [userId],
    )) as Array<{
      user_id: string;
      default_export_format: string;
      compact_lists: boolean;
      theme_mode: string;
      session_timeout_minutes: number;
      tester_profile: Record<string, unknown>;
      client_profile: Record<string, unknown>;
      ai_settings?: Record<string, unknown>;
      updated_at: string;
    }>;

    let settings: DbUserSettings;
    if (settingsRows.length > 0 && settingsRows[0]) {
      const s = settingsRows[0];
      settings = {
        userId: s.user_id,
        defaultExportFormat: s.default_export_format ?? "pdf",
        compactLists: Boolean(s.compact_lists),
        themeMode: s.theme_mode ?? "dark",
        sessionTimeoutMinutes: s.session_timeout_minutes ?? 15,
        testerProfile: s.tester_profile ?? {},
        clientProfile: s.client_profile ?? {},
        aiSettings: s.ai_settings ?? {},
        updatedAt: s.updated_at,
      };
    } else {
      await sql(
        `INSERT INTO user_settings (user_id, default_export_format, compact_lists, theme_mode, session_timeout_minutes, tester_profile, client_profile, ai_settings, updated_at)
         VALUES ($1, 'pdf', false, 'dark', 15, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, now())
         ON CONFLICT (user_id) DO NOTHING`,
        [userId],
      );
      settings = {
        userId,
        defaultExportFormat: "pdf",
        compactLists: false,
        themeMode: "dark",
        sessionTimeoutMinutes: 15,
        testerProfile: {},
        clientProfile: {},
        aiSettings: {},
        updatedAt: new Date().toISOString(),
      };
    }

    return { user, workspace, settings };
  });
}

export async function getUser(userId: string): Promise<DbUser | null> {
  return withRls(userId, async (sql) => {
    const rows = (await sql(
      `SELECT id, email, name, avatar_url, role, onboarding_completed, onboarding_step, onboarding_data, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId],
    )) as Array<{
      id: string;
      email: string | null;
      name: string | null;
      avatar_url: string | null;
      role: string;
      onboarding_completed: boolean;
      onboarding_step: number;
      onboarding_data: Record<string, unknown>;
      created_at: string;
      updated_at: string;
    }>;
    if (rows.length === 0 || !rows[0]) return null;
    const u = rows[0];
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatar_url,
      role: u.role,
      onboardingCompleted: Boolean(u.onboarding_completed),
      onboardingStep: Number(u.onboarding_step ?? 1),
      onboardingData: u.onboarding_data ?? {},
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    };
  });
}

export async function updateUserOnboarding(
  userId: string,
  updates: {
    completed?: boolean;
    step?: number;
    onboardingData?: Record<string, unknown>;
    role?: string;
    persona?: string;
    workspaceName?: string;
    organizationName?: string;
    representativeName?: string;
    defaultExportFormat?: string;
  },
): Promise<{ user: DbUser; workspace?: DbWorkspace; settings?: DbUserSettings }> {
  return withRls(userId, async (sql) => {
    // Ensure user exists first
    await getOrCreateUser(userId);

    const sets: string[] = ["updated_at = now()"];
    const vals: unknown[] = [userId];
    let idx = 2;

    if (updates.completed !== undefined) {
      sets.push(`onboarding_completed = $${idx++}`);
      vals.push(Boolean(updates.completed));
    }
    if (updates.step !== undefined) {
      sets.push(`onboarding_step = $${idx++}`);
      vals.push(Number(updates.step));
    }
    const combinedData = {
      ...(updates.onboardingData ?? {}),
      ...(updates.persona ? { persona: updates.persona } : {}),
      ...(updates.organizationName ? { organizationName: updates.organizationName } : {}),
      ...(updates.representativeName ? { representativeName: updates.representativeName } : {}),
    };
    sets.push(`onboarding_data = $${idx++}::jsonb`);
    vals.push(JSON.stringify(combinedData));

    if (updates.role || updates.persona) {
      sets.push(`role = $${idx++}`);
      vals.push(updates.persona || updates.role);
    }

    const query = `UPDATE users SET ${sets.join(", ")} WHERE id = $1 RETURNING id, email, name, avatar_url, role, onboarding_completed, onboarding_step, onboarding_data, created_at, updated_at`;
    const rows = (await sql(query, vals)) as Array<{
      id: string;
      email: string | null;
      name: string | null;
      avatar_url: string | null;
      role: string;
      onboarding_completed: boolean;
      onboarding_step: number;
      onboarding_data: Record<string, unknown>;
      created_at: string;
      updated_at: string;
    }>;

    const u = rows[0]!;
    const user: DbUser = {
      id: u.id,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatar_url,
      role: u.role,
      onboardingCompleted: Boolean(u.onboarding_completed),
      onboardingStep: Number(u.onboarding_step ?? 1),
      onboardingData: u.onboarding_data ?? {},
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    };

    // 2. Synchronize workspace name if provided
    let workspace: DbWorkspace | undefined;
    if (updates.workspaceName) {
      let wsRows = (await sql(
        `UPDATE workspaces SET name = $1, updated_at = now()
         WHERE owner_id = $2 AND is_default = true
         RETURNING id, owner_id, name, slug, is_default, settings, created_at, updated_at`,
        [updates.workspaceName, userId],
      )) as Array<{
        id: string;
        owner_id: string;
        name: string;
        slug: string;
        is_default: boolean;
        settings: Record<string, unknown>;
        created_at: string;
        updated_at: string;
      }>;
      if (wsRows.length === 0) {
        // Fallback: update the first workspace for the user and make it default
        wsRows = (await sql(
          `UPDATE workspaces SET name = $1, is_default = true, updated_at = now()
           WHERE id = (SELECT id FROM workspaces WHERE owner_id = $2 ORDER BY created_at ASC LIMIT 1)
           RETURNING id, owner_id, name, slug, is_default, settings, created_at, updated_at`,
          [updates.workspaceName, userId],
        )) as Array<{
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          is_default: boolean;
          settings: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        }>;
      }
      if (wsRows[0]) {
        const w = wsRows[0];
        workspace = {
          id: w.id,
          ownerId: w.owner_id,
          name: w.name,
          slug: w.slug,
          isDefault: Boolean(w.is_default),
          settings: w.settings ?? {},
          createdAt: w.created_at,
          updatedAt: w.updated_at,
        };
      }
    }

    // 3. Synchronize user settings (tester or client profile, export format)
    let settings: DbUserSettings | undefined;
    const incomingTester = (updates as any).testerProfile || {};
    const incomingClient = (updates as any).clientProfile || {};
    if (
      updates.organizationName ||
      updates.representativeName ||
      (updates as any).contactEmail ||
      (updates as any).department ||
      (updates as any).phone ||
      (updates as any).testerProfile ||
      (updates as any).clientProfile ||
      updates.defaultExportFormat
    ) {
      const currentSettings = await getUserSettings(userId);
      const isClient = updates.persona === "client" || user.role === "client";
      const testerProfile = isClient
        ? currentSettings.testerProfile
        : {
            ...currentSettings.testerProfile,
            providerName:
              incomingTester.providerName ||
              updates.organizationName ||
              (currentSettings.testerProfile as any)?.providerName ||
              "",
            providerContactName:
              incomingTester.providerContactName ||
              updates.representativeName ||
              (currentSettings.testerProfile as any)?.providerContactName ||
              "",
            providerContactEmail:
              incomingTester.providerContactEmail ||
              (updates as any).contactEmail ||
              (currentSettings.testerProfile as any)?.providerContactEmail ||
              user.email ||
              "",
            providerDepartment:
              incomingTester.providerDepartment ||
              (updates as any).department ||
              (currentSettings.testerProfile as any)?.providerDepartment ||
              "",
            providerPhone:
              incomingTester.providerPhone ||
              (updates as any).phone ||
              (currentSettings.testerProfile as any)?.providerPhone ||
              "",
            ...incomingTester,
          };

      const clientProfile = isClient
        ? {
            ...currentSettings.clientProfile,
            clientName:
              incomingClient.clientName ||
              updates.organizationName ||
              (currentSettings.clientProfile as any)?.clientName ||
              "",
            clientContactName:
              incomingClient.clientContactName ||
              updates.representativeName ||
              (currentSettings.clientProfile as any)?.clientContactName ||
              "",
            clientContactEmail:
              incomingClient.clientContactEmail ||
              (updates as any).contactEmail ||
              (currentSettings.clientProfile as any)?.clientContactEmail ||
              user.email ||
              "",
            clientDepartment:
              incomingClient.clientDepartment ||
              (updates as any).department ||
              (currentSettings.clientProfile as any)?.clientDepartment ||
              "",
            clientPhone:
              incomingClient.clientPhone ||
              (updates as any).phone ||
              (currentSettings.clientProfile as any)?.clientPhone ||
              "",
            authorizedBy:
              incomingClient.authorizedBy ||
              updates.representativeName ||
              (currentSettings.clientProfile as any)?.authorizedBy ||
              "",
            ...incomingClient,
          }
        : currentSettings.clientProfile;

      const exportFormat = updates.defaultExportFormat || currentSettings.defaultExportFormat;
      settings = await putUserSettings(userId, {
        defaultExportFormat: exportFormat,
        testerProfile,
        clientProfile,
      });
    }

    return { user, workspace, settings };
  });
}

// ---------------------------------------------------------------------------
// 2. User Settings Persistence
// ---------------------------------------------------------------------------

export async function getUserSettings(userId: string): Promise<DbUserSettings> {
  return withRls(userId, async (sql) => {
    const rows = (await sql(
      `SELECT user_id, default_export_format, compact_lists, theme_mode, session_timeout_minutes, tester_profile, client_profile, ai_settings, updated_at
       FROM user_settings WHERE user_id = $1`,
      [userId],
    )) as Array<{
      user_id: string;
      default_export_format: string;
      compact_lists: boolean;
      theme_mode: string;
      session_timeout_minutes: number;
      tester_profile: Record<string, unknown>;
      client_profile: Record<string, unknown>;
      ai_settings?: Record<string, unknown>;
      updated_at: string;
    }>;

    if (rows.length > 0 && rows[0]) {
      const s = rows[0];
      return {
        userId: s.user_id,
        defaultExportFormat: s.default_export_format ?? "pdf",
        compactLists: Boolean(s.compact_lists),
        themeMode: s.theme_mode ?? "dark",
        sessionTimeoutMinutes: s.session_timeout_minutes ?? 15,
        testerProfile: s.tester_profile ?? {},
        clientProfile: s.client_profile ?? {},
        aiSettings: s.ai_settings ?? {},
        updatedAt: s.updated_at,
      };
    }

    // Provision default row if missing
    await getOrCreateUser(userId);
    return {
      userId,
      defaultExportFormat: "pdf",
      compactLists: false,
      themeMode: "dark",
      sessionTimeoutMinutes: 15,
      testerProfile: {},
      clientProfile: {},
      aiSettings: {},
      updatedAt: new Date().toISOString(),
    };
  });
}

export async function putUserSettings(
  userId: string,
  settings: {
    defaultExportFormat?: string;
    compactLists?: boolean;
    themeMode?: string;
    sessionTimeoutMinutes?: number;
    testerProfile?: Record<string, unknown>;
    clientProfile?: Record<string, unknown>;
    aiSettings?: Record<string, unknown>;
  },
): Promise<DbUserSettings> {
  return withRls(userId, async (sql) => {
    // Ensure user row exists
    await getOrCreateUser(userId);

    const existing = await getUserSettings(userId);
    const rawAi = settings.aiSettings ? { ...(existing.aiSettings || {}), ...settings.aiSettings } : (existing.aiSettings || {});
    // Strictly sanitize: NEVER store API keys in remote database; keys are stored exclusively in client-side localStorage
    const sanitizedAi: Record<string, unknown> = { ...rawAi };
    delete sanitizedAi.openaiApiKey;
    delete sanitizedAi.anthropicApiKey;
    delete sanitizedAi.groqApiKey;
    delete sanitizedAi.geminiApiKey;

    const updated = {
      defaultExportFormat: settings.defaultExportFormat ?? existing.defaultExportFormat,
      compactLists: settings.compactLists !== undefined ? settings.compactLists : existing.compactLists,
      themeMode: settings.themeMode ?? existing.themeMode,
      sessionTimeoutMinutes: settings.sessionTimeoutMinutes ?? existing.sessionTimeoutMinutes,
      testerProfile: settings.testerProfile ? { ...existing.testerProfile, ...settings.testerProfile } : existing.testerProfile,
      clientProfile: settings.clientProfile ? { ...existing.clientProfile, ...settings.clientProfile } : existing.clientProfile,
      aiSettings: sanitizedAi,
    };

    await sql(
      `INSERT INTO user_settings (user_id, default_export_format, compact_lists, theme_mode, session_timeout_minutes, tester_profile, client_profile, ai_settings, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, now())
       ON CONFLICT (user_id) DO UPDATE SET
         default_export_format = EXCLUDED.default_export_format,
         compact_lists = EXCLUDED.compact_lists,
         theme_mode = EXCLUDED.theme_mode,
         session_timeout_minutes = EXCLUDED.session_timeout_minutes,
         tester_profile = EXCLUDED.tester_profile,
         client_profile = EXCLUDED.client_profile,
         ai_settings = EXCLUDED.ai_settings,
         updated_at = now()`,
      [
        userId,
        updated.defaultExportFormat,
        updated.compactLists,
        updated.themeMode,
        updated.sessionTimeoutMinutes,
        JSON.stringify(updated.testerProfile),
        JSON.stringify(updated.clientProfile),
        JSON.stringify(updated.aiSettings),
      ],
    );

    return {
      userId,
      defaultExportFormat: updated.defaultExportFormat,
      compactLists: updated.compactLists,
      themeMode: updated.themeMode,
      sessionTimeoutMinutes: updated.sessionTimeoutMinutes,
      testerProfile: updated.testerProfile,
      clientProfile: updated.clientProfile,
      aiSettings: updated.aiSettings,
      updatedAt: new Date().toISOString(),
    };
  });
}

// ---------------------------------------------------------------------------
// 3. Workspaces Management
// ---------------------------------------------------------------------------

export async function getWorkspaces(userId: string): Promise<DbWorkspace[]> {
  return withRls(userId, async (sql) => {
    await getOrCreateUser(userId);
    const rows = (await sql(
      `SELECT id, owner_id, name, slug, is_default, settings, created_at, updated_at
       FROM workspaces WHERE owner_id = $1 ORDER BY is_default DESC, created_at ASC`,
      [userId],
    )) as Array<{
      id: string;
      owner_id: string;
      name: string;
      slug: string;
      is_default: boolean;
      settings: Record<string, unknown>;
      created_at: string;
      updated_at: string;
    }>;

    return rows.map((w) => ({
      id: w.id,
      ownerId: w.owner_id,
      name: w.name,
      slug: w.slug,
      isDefault: Boolean(w.is_default),
      settings: w.settings ?? {},
      createdAt: w.created_at,
      updatedAt: w.updated_at,
    }));
  });
}

export async function createWorkspace(
  userId: string,
  name: string,
  slug?: string,
  settings?: Record<string, unknown>,
): Promise<DbWorkspace> {
  return withRls(userId, async (sql) => {
    await getOrCreateUser(userId);
    const id = "ws_" + Math.random().toString(36).slice(2, 10);
    const generatedSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-|-$/g, "") || "ws";
    
    await sql(
      `INSERT INTO workspaces (id, owner_id, name, slug, is_default, settings, created_at, updated_at)
       VALUES ($1, $2, $3, $4, false, $5::jsonb, now(), now())`,
      [id, userId, name, generatedSlug, JSON.stringify(settings || {})],
    );

    return {
      id,
      ownerId: userId,
      name,
      slug: generatedSlug,
      isDefault: false,
      settings: settings || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

export async function updateWorkspace(
  userId: string,
  workspaceId: string,
  updates: { name?: string; slug?: string; settings?: Record<string, unknown> },
): Promise<DbWorkspace> {
  return withRls(userId, async (sql) => {
    let existing = (await sql(
      `SELECT id, owner_id, name, slug, is_default, settings, created_at, updated_at
       FROM workspaces WHERE owner_id = $1 AND (id = $2 OR slug = $2)`,
      [userId, workspaceId],
    )) as Array<{
      id: string;
      owner_id: string;
      name: string;
      slug: string;
      is_default: boolean;
      settings: Record<string, unknown>;
      created_at: string;
      updated_at: string;
    }>;

    if (existing.length === 0 && (workspaceId === "default" || workspaceId === "primary")) {
      existing = (await sql(
        `SELECT id, owner_id, name, slug, is_default, settings, created_at, updated_at
         FROM workspaces WHERE owner_id = $1 ORDER BY is_default DESC, created_at ASC LIMIT 1`,
        [userId],
      )) as Array<{
        id: string;
        owner_id: string;
        name: string;
        slug: string;
        is_default: boolean;
        settings: Record<string, unknown>;
        created_at: string;
        updated_at: string;
      }>;
    }

    const firstExisting = existing[0];
    if (!firstExisting) {
      throw new Error(`Workspace ${workspaceId} not found or unauthorized`);
    }

    const newName = updates.name?.trim() || firstExisting.name;
    const newSlug = updates.slug?.trim() || firstExisting.slug;
    const newSettings = updates.settings ? { ...(firstExisting.settings || {}), ...updates.settings } : firstExisting.settings;

    const rows = (await sql(
      `UPDATE workspaces
       SET name = $1, slug = $2, settings = $3::jsonb, updated_at = now()
       WHERE owner_id = $4 AND id = $5
       RETURNING id, owner_id, name, slug, is_default, settings, created_at, updated_at`,
      [newName, newSlug, JSON.stringify(newSettings || {}), userId, firstExisting.id],
    )) as Array<{
      id: string;
      owner_id: string;
      name: string;
      slug: string;
      is_default: boolean;
      settings: Record<string, unknown>;
      created_at: string;
      updated_at: string;
    }>;

    const w = rows[0];
    if (!w) {
      throw new Error(`Failed to update workspace ${workspaceId}`);
    }
    return {
      id: w.id,
      ownerId: w.owner_id,
      name: w.name,
      slug: w.slug,
      isDefault: Boolean(w.is_default),
      settings: w.settings ?? {},
      createdAt: w.created_at,
      updatedAt: w.updated_at,
    };
  });
}

export async function setDefaultWorkspace(
  userId: string,
  workspaceId: string,
): Promise<DbWorkspace> {
  return withRls(userId, async (sql) => {
    await sql(
      `UPDATE workspaces SET is_default = false, updated_at = now() WHERE owner_id = $1`,
      [userId],
    );

    const rows = (await sql(
      `UPDATE workspaces
       SET is_default = true, updated_at = now()
       WHERE owner_id = $1 AND id = $2
       RETURNING id, owner_id, name, slug, is_default, settings, created_at, updated_at`,
      [userId, workspaceId],
    )) as Array<{
      id: string;
      owner_id: string;
      name: string;
      slug: string;
      is_default: boolean;
      settings: Record<string, unknown>;
      created_at: string;
      updated_at: string;
    }>;

    const w = rows[0];
    if (!w) {
      throw new Error(`Workspace ${workspaceId} not found or unauthorized`);
    }

    return {
      id: w.id,
      ownerId: w.owner_id,
      name: w.name,
      slug: w.slug,
      isDefault: true,
      settings: w.settings ?? {},
      createdAt: w.created_at,
      updatedAt: w.updated_at,
    };
  });
}

export async function deleteWorkspace(
  userId: string,
  workspaceId: string,
): Promise<{ success: boolean; activeWorkspaceId: string }> {
  return withRls(userId, async (sql) => {
    const all = (await sql(
      `SELECT id, is_default FROM workspaces WHERE owner_id = $1 ORDER BY is_default DESC, created_at ASC`,
      [userId],
    )) as Array<{ id: string; is_default: boolean }>;

    if (!all.some((w) => w.id === workspaceId)) {
      throw new Error(`Workspace ${workspaceId} not found or unauthorized`);
    }

    if (all.length <= 1) {
      throw new Error("Cannot delete your only workspace. Create another workspace first.");
    }

    const isDeletingDefault = all.find((w) => w.id === workspaceId)?.is_default;

    await sql(`DELETE FROM workspaces WHERE owner_id = $1 AND id = $2`, [userId, workspaceId]);

    let activeWorkspaceId = "";
    if (isDeletingDefault) {
      const remaining = all.filter((w) => w.id !== workspaceId);
      const nextWs = remaining[0];
      if (!nextWs) {
        throw new Error("No remaining workspace found");
      }
      activeWorkspaceId = nextWs.id;
      await sql(
        `UPDATE workspaces SET is_default = true, updated_at = now() WHERE owner_id = $1 AND id = $2`,
        [userId, activeWorkspaceId],
      );
    } else {
      const def = all.find((w) => w.id !== workspaceId && w.is_default);
      const remaining = all.filter((w) => w.id !== workspaceId);
      activeWorkspaceId = def?.id || remaining[0]?.id || "";
    }

    return { success: true, activeWorkspaceId };
  });
}

// ---------------------------------------------------------------------------
// 4. Documents CRUD & Scoping
// ---------------------------------------------------------------------------

export async function listDocuments(ownerId: string, workspaceId?: string): Promise<DocumentSummary[]> {
  return withRls(ownerId, async (sql) => {
    const { workspace } = await getOrCreateUser(ownerId);
    let resolvedWsId = workspaceId;
    if (resolvedWsId === "default" || resolvedWsId === "primary") {
      resolvedWsId = workspace.id;
    }

    let query = "SELECT data, workspace_id, category FROM documents WHERE owner_id = $1";
    const params: unknown[] = [ownerId];

    if (resolvedWsId) {
      query += " AND (workspace_id = $2 OR (workspace_id IS NULL AND $2 = $3))";
      params.push(resolvedWsId, workspace.id);
    }
    query += " ORDER BY updated_at DESC";

    const rows = (await sql(query, params)) as Array<{
      data: DocumentRecord;
      workspace_id: string | null;
      category: string | null;
    }>;

    return rows.map((r) => {
      const s = toSummary(r.data);
      if (r.workspace_id) s.workspaceId = r.workspace_id;
      if (r.category) s.category = r.category;
      return s;
    });
  });
}

export async function getDocument(ownerId: string, id: string): Promise<DocumentRecord | null> {
  return withRls(ownerId, async (sql) => {
    const rows = (await sql(
      "SELECT data, workspace_id FROM documents WHERE owner_id = $1 AND id = $2",
      [ownerId, id],
    )) as Array<{ data: DocumentRecord; workspace_id: string | null }>;
    if (!rows[0]) return null;
    const doc = rows[0].data;
    if (rows[0].workspace_id) doc.workspaceId = rows[0].workspace_id;
    return doc;
  });
}

export async function putDocument(ownerId: string, record: DocumentRecord, workspaceId?: string): Promise<void> {
  return withRls(ownerId, async (sql) => {
    const { user, workspace } = await getOrCreateUser(ownerId);
    let targetWorkspaceId = workspaceId || record.workspaceId || workspace.id;
    if (targetWorkspaceId === "default" || targetWorkspaceId === "primary") {
      targetWorkspaceId = workspace.id;
    }
    const def = getDefinition(record.definitionId);
    const category = def?.category ?? "offensive_security";

    const docToSave = {
      ...record,
      ownerId,
      workspaceId: targetWorkspaceId,
    };

    // 1. Upsert document in documents table
    await sql(
      `INSERT INTO documents (id, workspace_id, owner_id, definition_id, category, title, status, source_data, data, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         workspace_id = EXCLUDED.workspace_id,
         owner_id = EXCLUDED.owner_id,
         definition_id = EXCLUDED.definition_id,
         category = EXCLUDED.category,
         title = EXCLUDED.title,
         status = EXCLUDED.status,
         source_data = EXCLUDED.source_data,
         data = EXCLUDED.data,
         updated_at = EXCLUDED.updated_at`,
      [
        record.id,
        targetWorkspaceId,
        ownerId,
        record.definitionId,
        category,
        record.title,
        record.status,
        JSON.stringify(record.source || {}),
        JSON.stringify(docToSave),
        record.createdAt,
        record.updatedAt,
      ],
    );

    // 2. Persist version snapshot in document_versions table
    if (record.versions && record.versions.length > 0) {
      for (const v of record.versions) {
        const vId = "ver_" + record.id + "_" + v.versionNumber;
        await sql(
          `INSERT INTO document_versions (id, document_id, owner_id, version_number, title, data, created_at)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
           ON CONFLICT (document_id, version_number) DO UPDATE SET
             title = EXCLUDED.title,
             data = EXCLUDED.data`,
          [
            vId,
            record.id,
            ownerId,
            v.versionNumber,
            v.title || record.title,
            JSON.stringify(v),
            v.createdAt,
          ],
        );
      }
    }
  });
}

export async function deleteDocument(ownerId: string, id: string): Promise<void> {
  return withRls(ownerId, async (sql) => {
    await sql("DELETE FROM documents WHERE owner_id = $1 AND id = $2", [ownerId, id]);
  });
}

// ---------------------------------------------------------------------------
// 5. Version History & Deliverable Exports
// ---------------------------------------------------------------------------

export async function listDocumentVersions(ownerId: string, documentId: string): Promise<DbDocumentVersion[]> {
  return withRls(ownerId, async (sql) => {
    const rows = (await sql(
      `SELECT id, document_id, owner_id, version_number, title, data, created_at
       FROM document_versions
       WHERE document_id = $1 AND owner_id = $2
       ORDER BY version_number DESC`,
      [documentId, ownerId],
    )) as Array<{
      id: string;
      document_id: string;
      owner_id: string;
      version_number: number;
      title: string;
      data: unknown;
      created_at: string;
    }>;

    return rows.map((r) => ({
      id: r.id,
      documentId: r.document_id,
      ownerId: r.owner_id,
      versionNumber: Number(r.version_number),
      title: r.title,
      data: r.data,
      createdAt: r.created_at,
    }));
  });
}

export async function logDocumentExport(ownerId: string, documentId: string, format: string): Promise<DbDocumentExport> {
  return withRls(ownerId, async (sql) => {
    const exportId = "exp_" + Math.random().toString(36).slice(2, 11);
    await sql(
      `INSERT INTO document_exports (id, document_id, owner_id, format, created_at)
       VALUES ($1, $2, $3, $4, now())`,
      [exportId, documentId, ownerId, format],
    );

    return {
      id: exportId,
      documentId,
      ownerId,
      format,
      createdAt: new Date().toISOString(),
    };
  });
}

export async function listDocumentExports(ownerId: string, documentId: string): Promise<DbDocumentExport[]> {
  return withRls(ownerId, async (sql) => {
    const rows = (await sql(
      `SELECT id, document_id, owner_id, format, created_at
       FROM document_exports
       WHERE document_id = $1 AND owner_id = $2
       ORDER BY created_at DESC`,
      [documentId, ownerId],
    )) as Array<{
      id: string;
      document_id: string;
      owner_id: string;
      format: string;
      created_at: string;
    }>;

    return rows.map((r) => ({
      id: r.id,
      documentId: r.document_id,
      ownerId: r.owner_id,
      format: r.format,
      createdAt: r.created_at,
    }));
  });
}
