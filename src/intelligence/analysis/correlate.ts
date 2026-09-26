// Correlation + deduplication.
// Assets merge on canonical identifier; finding candidates merge on a
// deterministic fingerprint (asset|endpoint|param|category|cwe|signature).
// Source records are preserved: merges union evidenceIds and set duplicateOf.

import { cyrb53, normalizeIdentifier } from "../utils";
import type { Asset, EvidenceItem, FindingCandidate, Severity } from "../schemas";
import { mapFindingToStandards } from "../../engine/catalog/standards";

export function mergeAssets(assets: Asset[][]): Asset[] {
  const byCanon = new Map<string, Asset>();
  for (const list of assets) {
    for (const a of list) {
      const canon = normalizeIdentifier(a.canonicalIdentifier);
      const existing = byCanon.get(canon);
      if (!existing) {
        byCanon.set(canon, { ...a, canonicalIdentifier: canon });
        continue;
      }
      existing.sourceEvidenceIds = [...new Set([...existing.sourceEvidenceIds, ...a.sourceEvidenceIds])];
      if (existing.ownership === "unknown") existing.ownership = a.ownership;
      if (!existing.hostname && a.hostname) existing.hostname = a.hostname;
      if (!existing.ip && a.ip) existing.ip = a.ip;
      if (!existing.url && a.url) existing.url = a.url;
    }
  }
  return [...byCanon.values()];
}

function normTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/https?:\/\/[^\s)]+/g, " URL ")
    .replace(/\b\d{1,3}(\.\d{1,3}){3}\b/g, " IP ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function endpointOf(e: EvidenceItem): string {
  const sd = e.structuredData as Record<string, unknown>;
  for (const k of ["matchedAt", "url", "path", "uri", "port"]) {
    const v = sd[k];
    if (typeof v === "string" && v) return normalizeIdentifier(v).slice(0, 160);
    if (typeof v === "number") return `port:${v}`;
  }
  return "";
}

function severityOf(e: EvidenceItem): { severity: Severity; basis: string } {
  const sd = e.structuredData as Record<string, unknown>;
  const raw = String(sd["severity"] ?? sd["risk"] ?? "").toLowerCase();
  if (raw === "critical" || raw === "4") return { severity: "critical", basis: `scanner severity '${raw}'` };
  if (raw === "high" || raw === "3") return { severity: "high", basis: `scanner severity '${raw}'` };
  if (raw === "medium" || raw === "2") return { severity: "medium", basis: `scanner severity '${raw}'` };
  if (raw === "low" || raw === "1") return { severity: "low", basis: `scanner severity '${raw}'` };
  if (e.evidenceType === "manual_observation") return { severity: "medium", basis: "analyst observation pending validation" };
  return { severity: "informational", basis: "no severity signal in evidence" };
}

function cweOf(e: EvidenceItem): string[] {
  const sd = e.structuredData as Record<string, unknown>;
  const out = new Set<string>();
  for (const k of ["cwe", "cweid", "cwe-id"]) {
    const v = sd[k];
    const arr = Array.isArray(v) ? v : v != null ? [v] : [];
    for (const c of arr) {
      const s = String(c).toUpperCase();
      const m = s.match(/(\d{1,5})/);
      if (m) out.add(`CWE-${m[1]}`);
    }
  }
  return [...out];
}

/** Build one candidate per evidence cluster (scanner findings + manual validation). */
export function extractCandidates(
  analysisId: string,
  evidence: EvidenceItem[],
  assets: Asset[],
): { candidates: FindingCandidate[]; duplicatesMerged: number } {
  const relevant = evidence.filter((e) =>
    ["scanner_finding", "manual_observation", "log_excerpt"].includes(e.evidenceType),
  );
  const groups = new Map<string, EvidenceItem[]>();
  const assetOf = (e: EvidenceItem): string => {
    const hit = assets.find((a) => a.sourceEvidenceIds.includes(e.id));
    return hit ? hit.canonicalIdentifier : "";
  };

  for (const e of relevant) {
    const fp = [assetOf(e), endpointOf(e), normTitle(e.title).slice(0, 120), cweOf(e).sort().join("+")].join("|");
    const key = cyrb53(fp);
    const g = groups.get(key);
    if (g) g.push(e);
    else groups.set(key, [e]);
  }

  const candidates: FindingCandidate[] = [];
  let duplicatesMerged = 0;
  for (const [fp, group] of groups) {
    const first = group[0]!;
    const sevVotes = group.map((e) => severityOf(e));
    const order = { critical: 4, high: 3, medium: 2, low: 1, informational: 0 } as const;
    sevVotes.sort((a, b) => order[b.severity] - order[a.severity]);
    const top = sevVotes[0]!;
    const assetIds = [...new Set(group.flatMap((e) => assets.filter((a) => a.sourceEvidenceIds.includes(e.id)).map((a) => a.id)))];
    const cwes = [...new Set(group.flatMap((e) => cweOf(e)))];
    const mappings = mapFindingToStandards(first.title, group.map((e) => e.content).join("\n").slice(0, 2000));
    if (cwes.length > 0) mappings.cwe = [...new Set([...(mappings.cwe ?? []), ...cwes])];
    const id = `fc_${cyrb53(`${analysisId}|${fp}`).slice(0, 12)}`;
    candidates.push({
      id,
      canonicalFingerprint: fp,
      title: first.title.length > 120 ? first.title.slice(0, 117) + "…" : first.title,
      description: `Correlated from ${group.length} evidence record(s). Primary observation: ${first.content.slice(0, 800)}`,
      affectedAssets: assetIds,
      evidenceIds: group.map((e) => e.id),
      severity: top.severity,
      severityBasis: `${top.basis} (${group.length} supporting record(s))`,
      cwe: cwes,
      cve: [],
      taxonomyMappings: { cwe: mappings.cwe ?? [], cve: [], owaspWstg: mappings.owaspWstg ?? [], nistRefs: mappings.nistRef ?? [], attck: mappings.attck ?? [], ccm: mappings.ccm ?? [] },
      confidence: group.length > 1 ? "high" : first.confidence,
      evidenceLevel: group.some((e) => e.evidenceLevel === "L1_observed") ? "L1_observed" : "L2_derived",
      status: "proposed",
      contradictions: [],
    });
    if (group.length > 1) duplicatesMerged += group.length - 1;
  }

  candidates.sort((a, b) => a.id.localeCompare(b.id));
  return { candidates, duplicatesMerged };
}
