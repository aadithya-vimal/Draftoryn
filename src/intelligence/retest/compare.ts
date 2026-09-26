// Document comparison + retest engine.
// Correlates previous findings with current evidence WITHOUT requiring
// exact wording (normalized token-overlap similarity). Absence of evidence
// yields Not-observed/Inconclusive — never auto-remediated.

import { cyrb53 } from "../utils";
import type { FindingCandidate } from "../schemas";

export type RetestStatus = "open" | "remediated" | "partially_remediated" | "not_reproduced" | "inconclusive" | "regressed" | "not_observed";

export interface RetestVerdict {
  priorReference: string;
  priorTitle: string;
  matchedCandidateId?: string;
  status: RetestStatus;
  rationale: string;
}

export interface DocumentDiff {
  added: string[];
  removed: string[];
  changed: Array<{ reference: string; change: string }>;
  resolved: string[];
  stillOpen: string[];
  contradictory: string[];
}

function tokens(s: string): Set<string> {
  return new Set(
    s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 3),
  );
}

export function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.max(ta.size, tb.size);
}

export interface PriorFinding {
  reference: string;
  title: string;
  severity: string;
}

export function compareFindings(
  prior: PriorFinding[],
  current: FindingCandidate[],
  threshold = 0.4,
): DocumentDiff {
  const added: string[] = [];
  const stillOpen: string[] = [];
  const removed: string[] = [];
  const changed: Array<{ reference: string; change: string }> = [];
  const matchedCurrent = new Set<string>();

  for (const p of prior) {
    let best: FindingCandidate | undefined;
    let bestScore = 0;
    for (const c of current) {
      if (c.status === "rejected" || c.status === "merged") continue;
      const s = similarity(p.title, c.title);
      if (s > bestScore) { bestScore = s; best = c; }
    }
    if (best && bestScore >= threshold) {
      matchedCurrent.add(best.id);
      stillOpen.push(p.reference);
      if (best.severity !== p.severity) {
        changed.push({ reference: p.reference, change: `severity ${p.severity} → ${best.severity}` });
      }
    } else {
      removed.push(p.reference);
    }
  }
  for (const c of current) {
    if (!matchedCurrent.has(c.id) && c.status !== "rejected" && c.status !== "merged") added.push(c.id);
  }
  return { added, removed, changed, resolved: [], stillOpen, contradictory: [] };
}

export function retestAnalysis(
  prior: PriorFinding[],
  current: FindingCandidate[],
  retestEvidencePresent: boolean,
): RetestVerdict[] {
  const diff = compareFindings(prior, current);
  return prior.map((p) => {
    const match = current.find((c) => diff.stillOpen.includes(p.reference) && similarity(p.title, c.title) >= 0.4);
    if (match) {
      const improved = severityRank(match.severity) < severityRank(p.severity);
      return {
        priorReference: p.reference,
        priorTitle: p.title,
        matchedCandidateId: match.id,
        status: improved ? "partially_remediated" : "open",
        rationale: improved ? "Still observed at reduced severity." : "Still observed in current evidence.",
      };
    }
    // Absent from current evidence: inconclusive unless retest explicitly targeted it.
    return {
      priorReference: p.reference,
      priorTitle: p.title,
      status: retestEvidencePresent ? "not_reproduced" : "inconclusive",
      rationale: retestEvidencePresent
        ? "Not observed in retest evidence; requires analyst confirmation before closure."
        : "No current evidence either way — marked Inconclusive, never auto-remediated.",
    };
  });
}

function severityRank(s: string): number {
  return { critical: 4, high: 3, medium: 2, low: 1, informational: 0 }[s] ?? -1;
}

export function diffId(a: string, b: string): string {
  return `diff_${cyrb53(`${a}|${b}`).slice(0, 12)}`;
}
