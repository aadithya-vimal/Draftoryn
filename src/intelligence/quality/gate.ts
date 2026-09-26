// Report quality gate. Every field resolves to SUPPORTED / UNSUPPORTED /
// MISSING / UNVERIFIED — never force-filled for cosmetic completeness.

import type { AnalysisGraph } from "../analysis/graph";
import type { ConfirmedFinding } from "../schemas";
import { validateCvssVector } from "../standards/cvss";

export type FieldState = "supported" | "unsupported" | "missing" | "unverified";

export interface FindingQuality {
  reference: string;
  states: Record<string, FieldState>;
  failures: string[];
}

export interface QualityResult {
  score: number;
  failures: string[];
  findings: FindingQuality[];
}

const PLACEHOLDERS = ["[missing]", "[tbd]", "[todo]", "lorem", "xxx", "[client name]", "[target]"];

function hasPlaceholder(text: string): boolean {
  const t = text.toLowerCase();
  return PLACEHOLDERS.some((p) => t.includes(p));
}

export function gradeFinding(f: ConfirmedFinding, evidenceIds: Set<string>): FindingQuality {
  const states: Record<string, FieldState> = {};
  const failures: string[] = [];
  const check = (field: string, ok: boolean, missing: boolean, problem?: string) => {
    states[field] = missing ? "missing" : ok ? "supported" : "unsupported";
    if (!ok && problem) failures.push(`${f.reference} ${field}: ${problem}`);
  };

  check("id", !!f.id && !!f.reference, false, "missing unique ID");
  check("title", f.title.trim().length > 3 && !hasPlaceholder(f.title), f.title.trim().length === 0, "title placeholder/empty");
  check("severity", ["critical", "high", "medium", "low", "informational"].includes(f.severity), false);
  check("affectedAsset", f.affectedAssets.length > 0, f.affectedAssets.length === 0, "no affected asset");
  const evidenceOk = f.evidence.length > 0 && f.evidence.every((e) => evidenceIds.has(e));
  check("evidence", evidenceOk, f.evidence.length === 0, f.evidence.length === 0 ? "zero evidence IDs — FAIL" : "cites unknown evidence IDs");
  check("description", f.description.trim().length > 20 && !hasPlaceholder(f.description), f.description.trim().length === 0, "description placeholder/too thin");
  check("impact", f.impact.trim().length > 10 && !hasPlaceholder(f.impact), f.impact.trim().length === 0, "impact missing/placeholder");
  check("remediation", f.remediation.length > 0 && f.remediation.every((r) => r.trim().length > 5), f.remediation.length === 0, "remediation missing/thin");
  states["confidence"] = f.confidence ? "supported" : "missing";
  states["provenance"] = evidenceOk ? "supported" : "unsupported";
  states["status"] = f.verificationState === "confirmed" ? "supported" : "unverified";

  if (f.cvss) {
    const v = validateCvssVector(f.cvss.vector);
    states["cvss"] = v.valid ? (f.cvss.fullyDetermined ? "supported" : "unverified") : "unsupported";
    if (!v.valid) failures.push(`${f.reference} cvss: invalid vector (${v.reason})`);
  } else {
    states["cvss"] = "missing";
  }
  states["cwe"] = (f.taxonomyMappings.cwe ?? []).length > 0 ? "supported" : "missing";
  states["cve"] = "supported"; // CVEs are optional; absence is not a defect.

  return { reference: f.reference, states, failures };
}

export function runQualityGate(findings: ConfirmedFinding[], graph: AnalysisGraph): QualityResult {
  const evidenceIds = new Set(graph.evidence.map((e) => e.id));
  const graded = findings.map((f) => gradeFinding(f, evidenceIds));
  const failures = graded.flatMap((g) => g.failures);

  // Duplicate references / titles.
  const refs = findings.map((f) => f.reference);
  if (new Set(refs).size !== refs.length) failures.push("duplicate finding references");

  const total = graded.length * 10;
  const bad = graded.reduce((n, g) => n + Object.values(g.states).filter((s) => s === "unsupported" || s === "missing").length, 0);
  const score = total === 0 ? 0 : Math.max(0, 1 - bad / total);
  return { score: Math.round(score * 100) / 100, failures, findings: graded };
}
