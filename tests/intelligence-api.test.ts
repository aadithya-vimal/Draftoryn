import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("@clerk/backend", () => ({ verifyToken: vi.fn() }));
vi.mock("../server/neon", () => ({
  getOrCreateUser: vi.fn(),
  getUserSettings: vi.fn(),
  putUserSettings: vi.fn(),
  getWorkspaces: vi.fn(),
  createWorkspace: vi.fn(),
  updateWorkspace: vi.fn(),
  setDefaultWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  listDocuments: vi.fn(),
  getDocument: vi.fn(),
  putDocument: vi.fn(),
  deleteDocument: vi.fn(),
  listDocumentVersions: vi.fn(),
  logDocumentExport: vi.fn(),
  listDocumentExports: vi.fn(),
}));

// In-memory fake for intelligence persistence: enforces owner-scoping like Neon.
const store = {
  analyses: new Map<string, Record<string, unknown>>(),
  artifacts: new Map<string, Array<Record<string, unknown>>>(),
  candidates: new Map<string, Array<Record<string, unknown>>>(),
  confirmed: new Map<string, Array<Record<string, unknown>>>(),
  reports: new Map<string, Array<Record<string, unknown>>>(),
  jobs: new Map<string, Record<string, unknown>>(),
};
let seq = 0;
const nid = (p: string): string => `${p}_${Date.now()}_${(seq += 1)}`;

vi.mock("../server/neon-intelligence", () => ({
  createAnalysis: vi.fn(async (ownerId: string, input: Record<string, unknown>) => {
    const row = { id: nid("an"), owner_id: ownerId, name: input["name"], report_type: input["reportType"] ?? "pentest_report", engagement: {}, status: "draft" };
    store.analyses.set(`${ownerId}:${row.id}`, row);
    return row;
  }),
  listAnalyses: vi.fn(async (ownerId: string) => [...store.analyses.values()].filter((r) => r["owner_id"] === ownerId)),
  getAnalysis: vi.fn(async (ownerId: string, id: string) => store.analyses.get(`${ownerId}:${id}`) ?? null),
  deleteAnalysis: vi.fn(async (ownerId: string, id: string) => {
    store.analyses.delete(`${ownerId}:${id}`);
  }),
  insertArtifactRow: vi.fn(async (ownerId: string, analysisId: string, input: Record<string, unknown>) => {
    const list = store.artifacts.get(`${ownerId}:${analysisId}`) ?? [];
    const dupe = list.find((a) => a["checksum"] === input["checksum"]);
    if (dupe) return { id: dupe["id"], duplicate: true };
    // Snake_case shape mirrors real Neon rows.
    const row = { id: nid("art"), filename: input["filename"], media_type: input["mediaType"], size_bytes: input["size"], checksum: input["checksum"], storage_key: input["storageKey"], artifact_type: "unknown", parser: "generic", status: "uploaded" };
    list.push(row);
    store.artifacts.set(`${ownerId}:${analysisId}`, list);
    return { id: row["id"], duplicate: false };
  }),
  listArtifactRows: vi.fn(async (ownerId: string, analysisId: string) => store.artifacts.get(`${ownerId}:${analysisId}`) ?? []),
  saveAnalysisGraph: vi.fn(async (ownerId: string, graph: { analysisId: string; candidates: Array<Record<string, unknown>> }) => {
    store.candidates.set(
      `${ownerId}:${graph.analysisId}`,
      graph.candidates.map((c) => ({
        id: c["id"],
        title: c["title"],
        severity: c["severity"],
        severity_basis: c["severityBasis"],
        confidence: c["confidence"],
        evidence_level: c["evidenceLevel"],
        status: c["status"],
        duplicate_of: null,
        cwe: JSON.stringify(c["cwe"] ?? []),
        taxonomy_mappings: JSON.stringify(c["taxonomyMappings"] ?? {}),
        evidence_ids: JSON.stringify(c["evidenceIds"] ?? []),
        affected_assets: JSON.stringify(c["affectedAssets"] ?? []),
        description: c["description"] ?? "",
      })),
    );
  }),
  listEvidenceRows: vi.fn(async () => []),
  listCandidateRows: vi.fn(async (ownerId: string, analysisId: string) => store.candidates.get(`${ownerId}:${analysisId}`) ?? []),
  listConflictRows: vi.fn(async () => []),
  listConfirmedRows: vi.fn(async (ownerId: string, analysisId: string) => store.confirmed.get(`${ownerId}:${analysisId}`) ?? []),
  getCandidateRow: vi.fn(async (ownerId: string, analysisId: string, fid: string) =>
    (store.candidates.get(`${ownerId}:${analysisId}`) ?? []).find((c) => c["id"] === fid) ?? null,
  ),
  updateCandidate: vi.fn(async (ownerId: string, analysisId: string, fid: string, patch: Record<string, unknown>) => {
    const row = (store.candidates.get(`${ownerId}:${analysisId}`) ?? []).find((c) => c["id"] === fid);
    if (!row) return;
    if (patch["status"] !== undefined) row["status"] = patch["status"];
    if (patch["title"] !== undefined) row["title"] = patch["title"];
    if (patch["duplicateOf"] !== undefined) row["duplicate_of"] = patch["duplicateOf"];
    if (patch["evidenceIds"] !== undefined) row["evidence_ids"] = JSON.stringify(patch["evidenceIds"]);
    if (patch["affectedAssets"] !== undefined) row["affected_assets"] = JSON.stringify(patch["affectedAssets"]);
  }),
  saveConfirmedFinding: vi.fn(async (ownerId: string, analysisId: string, f: Record<string, unknown>) => {
    const list = store.confirmed.get(`${ownerId}:${analysisId}`) ?? [];
    list.push({ ...f, affected_assets: JSON.stringify(f["affectedAssets"]), evidence: JSON.stringify(f["evidence"]), reproduction: JSON.stringify(f["reproduction"]), remediation: JSON.stringify(f["remediation"]), refs: JSON.stringify(f["references"]), taxonomy_mappings: JSON.stringify(f["taxonomyMappings"]) });
    store.confirmed.set(`${ownerId}:${analysisId}`, list);
  }),
  saveReport: vi.fn(async (ownerId: string, analysisId: string, report: Record<string, unknown>) => {
    const list = store.reports.get(`${ownerId}:${analysisId}`) ?? [];
    const version = list.length + 1;
    list.push({ ...report, version });
    store.reports.set(`${ownerId}:${analysisId}`, list);
    return { id: report["id"], version };
  }),
  listReports: vi.fn(async (ownerId: string, analysisId: string) => store.reports.get(`${ownerId}:${analysisId}`) ?? []),
  createJobRow: vi.fn(async (ownerId: string, analysisId: string | null, kind: string) => {
    const job = { id: nid("job"), status: "queued", kind, analysis_id: analysisId, error: null, owner_id: ownerId };
    store.jobs.set(`${ownerId}:${job.id}`, job);
    return { id: job.id, status: "queued" };
  }),
  updateJobRow: vi.fn(async (ownerId: string, jobId: string, status: string, error?: string) => {
    const job = store.jobs.get(`${ownerId}:${jobId}`);
    if (job) {
      job["status"] = status;
      job["error"] = error ?? null;
    }
  }),
  getJobRow: vi.fn(async (ownerId: string, jobId: string) => store.jobs.get(`${ownerId}:${jobId}`) ?? null),
}));

import { verifyToken } from "@clerk/backend";
import app from "../server/index";

const mockVerify = vi.mocked(verifyToken);
const SAVED_ENV = { ...process.env };

function authHeaders(user: string): Record<string, string> {
  if (user === "none") return {};
  return { Authorization: `Bearer token-${user}` };
}

async function api(path: string, init: { method?: string; body?: unknown } = {}, user = "userA") {
  return app.request(path, {
    method: init.method ?? "GET",
    headers: { ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}), ...authHeaders(user) },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

beforeEach(() => {
  process.env.CLERK_SECRET_KEY = "sk_test_dummy";
  delete process.env.ALLOW_DEV_AUTH;
  store.analyses.clear();
  store.artifacts.clear();
  store.candidates.clear();
  store.confirmed.clear();
  store.reports.clear();
  store.jobs.clear();
  mockVerify.mockImplementation(async (token: unknown) => {
    if (typeof token === "string" && token.startsWith("token-")) {
      const sub = token.slice("token-".length);
      return { sub, email: `${sub}@example.com` } as never;
    }
    throw new Error("invalid token");
  });
});

afterEach(() => {
  process.env = { ...SAVED_ENV };
  vi.restoreAllMocks();
});

const ZAP = readFileSync(new URL("./fixtures/zap.json", import.meta.url), "utf8");

describe("intelligence API", () => {
  it("rejects unauthenticated analysis access (401)", async () => {
    expect((await api("/api/analyses", {}, "none")).status).toBe(401);
  });

  it("isolates tenants: userB cannot read userA analysis (404, scenario F)", async () => {
    const created = (await (await api("/api/analyses", { method: "POST", body: { name: "Engagement" } })).json()) as { id: string };
    expect((await api(`/api/analyses/${created.id}`, {}, "userB")).status).toBe(404);
    expect((await api(`/api/analyses/${created.id}`, {}, "userA")).status).toBe(200);
  });

  it("rejects oversized uploads and archives safely (scenario H)", async () => {
    const created = (await (await api("/api/analyses", { method: "POST", body: { name: "E" } })).json()) as { id: string };
    const big = await api(`/api/analyses/${created.id}/artifacts`, { method: "POST", body: { filename: "x.txt", mediaType: "text/plain", content: "y".repeat(3_000_000) } });
    expect([400, 413]).toContain(big.status);
    const zip = await api(`/api/analyses/${created.id}/artifacts`, { method: "POST", body: { filename: "a.zip", mediaType: "application/zip", content: "PK\u0003\u0004binary" } });
    expect(zip.status).toBe(415);
  });

  it("runs the full loop: upload → run → review → confirm → report", async () => {
    const created = (await (await api("/api/analyses", { method: "POST", body: { name: "E2E" } })).json()) as { id: string };
    const up = await api(`/api/analyses/${created.id}/artifacts`, { method: "POST", body: { filename: "zap.json", mediaType: "application/json", content: ZAP } });
    expect(up.status).toBe(200);

    const run = await api(`/api/analyses/${created.id}/run`, { method: "POST" });
    expect(run.status).toBe(200);
    const runBody = (await run.json()) as { summary: { filesAnalyzed: number }; jobId: string };
    expect(runBody.summary.filesAnalyzed).toBe(1);

    // Job survives polling.
    expect((await api(`/api/jobs/${runBody.jobId}`)).status).toBe(200);

    const findings = (await (await api(`/api/analyses/${created.id}/findings`)).json()) as { candidates: Array<{ id: string }> };
    expect(findings.candidates.length).toBeGreaterThan(0);
    const fid = findings.candidates[0]!.id;

    // Confirm requires impact + remediation.
    const badConfirm = await api(`/api/analyses/${created.id}/findings/${fid}`, { method: "PATCH", body: { action: "confirm", impact: "", remediation: [] } });
    expect(badConfirm.status).toBe(400);

    await api(`/api/analyses/${created.id}/findings/${fid}`, { method: "PATCH", body: { action: "accept" } });
    const goodConfirm = await api(`/api/analyses/${created.id}/findings/${fid}`, {
      method: "PATCH",
      body: { action: "confirm", impact: "Exposure of management port indicates network segmentation impact.", remediation: ["Restrict access to trusted hosts."] },
    });
    expect(goodConfirm.status).toBe(200);

    const rep = await api(`/api/analyses/${created.id}/reports`, { method: "POST", body: { view: "full", engagement: { client: "Example Corp" } } });
    expect(rep.status).toBe(200);
    const repBody = (await rep.json()) as { version: number };
    expect(repBody.version).toBe(1);
  });

  it("fails closed with safe errors when running without artifacts", async () => {
    const created = (await (await api("/api/analyses", { method: "POST", body: { name: "Empty" } })).json()) as { id: string };
    const run = await api(`/api/analyses/${created.id}/run`, { method: "POST" });
    expect(run.status).toBe(500);
    const body = (await run.json()) as { error: string };
    expect(body.error).toBe("Request failed. Please try again.");
  });

  it("every intelligence persistence query is owner-scoped", async () => {
    const src = readFileSync(new URL("../server/neon-intelligence.ts", import.meta.url), "utf8");
    const queries = [...src.matchAll(/`(SELECT|INSERT|UPDATE|DELETE)[\s\S]*?`/gi)].map((m) => m[0]);
    expect(queries.length).toBeGreaterThan(10);
    for (const q of queries) {
      if (/WHERE/i.test(q)) expect(q).toMatch(/owner_id/);
    }
  });
});
