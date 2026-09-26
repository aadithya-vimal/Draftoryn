// Conflict detection: surface contradictions, never silently reconcile.
// Kinds: scope, severity, remediation_state, version, identity, dates,
// asset_naming, engagement_ref.

import { cyrb53 } from "../utils";
import type { AnalysisConflict, Asset, EvidenceItem, FindingCandidate } from "../schemas";

function mkId(analysisId: string, kind: string, summary: string): string {
  return `cf_${cyrb53(`${analysisId}|${kind}|${summary}`).slice(0, 12)}`;
}

export function detectConflicts(
  analysisId: string,
  evidence: EvidenceItem[],
  assets: Asset[],
  candidates: FindingCandidate[],
): AnalysisConflict[] {
  const conflicts: AnalysisConflict[] = [];

  // 1. Scope: out-of-scope assets appearing in scan/observation evidence.
  const scopeEvidence = evidence.filter((e) => e.evidenceType === "scope_statement");
  const scopeText = scopeEvidence.map((e) => e.content).join("\n");
  const outOfScopeHits = scopeText.match(/out[\s_-]?of[\s_-]?scope\s*:?\s*([^\n;]+)/gi) ?? [];
  const excluded = new Set<string>();
  for (const hit of outOfScopeHits) {
    const names = hit.split(/[:;,]/).slice(1).join(" ").split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter((s) => s.length > 3);
    for (const n of names) excluded.add(n);
  }
  for (const a of assets) {
    const canon = a.canonicalIdentifier.toLowerCase();
    for (const x of excluded) {
      if (canon.includes(x) || x.includes(canon)) {
        conflicts.push({
          id: mkId(analysisId, "scope", canon),
          kind: "scope",
          summary: `SCOPE CONFLICT: asset '${a.canonicalIdentifier}' appears in test evidence but matches an out-of-scope exclusion ('${x}'). Review required.`,
          evidenceIds: [...a.sourceEvidenceIds, ...scopeEvidence.map((e) => e.id)].slice(0, 20),
          resolution: "open",
        });
      }
    }
  }

  // 2. Severity disagreement: same fingerprint family, divergent severities.
  const byTitle = new Map<string, FindingCandidate[]>();
  for (const c of candidates) {
    const key = c.title.toLowerCase().replace(/\(.*\)/, "").trim();
    const g = byTitle.get(key);
    if (g) g.push(c);
    else byTitle.set(key, [c]);
  }
  for (const [, group] of byTitle) {
    const sevs = new Set(group.map((c) => c.severity));
    if (group.length > 1 && sevs.size > 1) {
      conflicts.push({
        id: mkId(analysisId, "severity", group[0]!.title),
        kind: "severity",
        summary: `SEVERITY DISAGREEMENT: '${group[0]!.title}' reported as ${[...sevs].join(" vs ")} across sources. Review required.`,
        evidenceIds: group.flatMap((c) => c.evidenceIds).slice(0, 20),
        resolution: "open",
      });
    }
  }

  // 3. Asset naming: near-duplicate identifiers that failed to canonicalize.
  const canons = assets.map((a) => a.canonicalIdentifier);
  for (let i = 0; i < canons.length; i++) {
    for (let j = i + 1; j < canons.length; j++) {
      const a = canons[i]!;
      const b = canons[j]!;
      if (a !== b && (a.includes(b) || b.includes(a)) && Math.abs(a.length - b.length) <= 12) {
        conflicts.push({
          id: mkId(analysisId, "asset_naming", `${a}~${b}`),
          kind: "asset_naming",
          summary: `ASSET NAMING: '${a}' and '${b}' may denote the same asset. Confirm before reporting.`,
          evidenceIds: [assets[i]!.id, assets[j]!.id],
          resolution: "open",
        });
      }
    }
  }

  // 4. Remediation-state: "fixed/remediated" claims vs active observations of same finding.
  const fixedEvidence = evidence.filter((e) => /remediat|fixed|resolved|patched/i.test(e.content));
  for (const f of fixedEvidence) {
    const related = candidates.filter((c) => f.content.toLowerCase().includes(c.title.toLowerCase().slice(0, 20)));
    for (const c of related) {
      conflicts.push({
        id: mkId(analysisId, "remediation_state", c.id),
        kind: "remediation_state",
        summary: `REMEDIATION CLAIM: evidence suggests '${c.title}' is remediated, but scanner evidence still reports it. Mark 'Not observed'/'Inconclusive' — never auto-close.`,
        evidenceIds: [f.id, ...c.evidenceIds].slice(0, 20),
        resolution: "open",
      });
    }
  }

  return conflicts.sort((a, b) => a.id.localeCompare(b.id));
}
