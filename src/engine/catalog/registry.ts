// Canonical registry: query API + bridge to the legacy generation engine.
// Backward compatible by design: legacy definition ids keep working through
// resolveLegacyDefinitionId(); no existing document is invalidated.

import { CANONICAL_DOCUMENTS, getCanonical, type CanonicalDocument, type DocumentFamily } from "./canonical";
import { migrateLegacyId } from "./aliases";
import { getDefinition } from "../definitions/catalog";
import type { DocumentDefinition } from "../types";

export type { CanonicalDocument, DocumentFamily };

export function listCanonicalDocuments(): CanonicalDocument[] {
  return CANONICAL_DOCUMENTS;
}

export function canonicalByFamily(family: DocumentFamily): CanonicalDocument[] {
  return CANONICAL_DOCUMENTS.filter((d) => d.family === family);
}

/** Every legacy definition id must map to exactly one canonical document. */
export function canonicalForLegacyId(legacyId: string): CanonicalDocument | undefined {
  return getCanonical(migrateLegacyId(legacyId));
}

/**
 * Representative legacy definition used to render a canonical document through
 * the existing deterministic generation engine. The canonical model owns
 * structure/variants/modules; the legacy definition supplies field/section
 * builders until the canonical renderer lands.
 */
const GENERATION_BASE: Record<string, string> = {
  pentest_engagement: "pentest_agreement",
  pentest_report: "pentest_report",
  pentest_retest: "pentest_report",
  redteam_engagement: "pentest_plan",
  redteam_report: "redteam_report",
  vuln_assessment_definition: "pentest_plan",
  vuln_assessment_report: "va_report",
  security_assessment_report: "sec_assessment_report",
  cloud_assessment_report: "cloud_sec_assessment",
  arch_review: "sec_arch_doc",
  threat_model: "threat_model",
  forensic_report: "forensics_report",
  ir_plan: "ir_plan",
  incident_report: "incident_report",
  lessons_learned: "lessons_learned_report",
  disclosure_policy: "sec_exception_waiver",
  bug_bounty_policy: "sec_exception_waiver",
  sec_requirements: "sec_design_review",
};

export function resolveLegacyDefinitionId(canonicalId: string): string {
  return GENERATION_BASE[canonicalId] ?? canonicalId;
}

export function resolveLegacyDefinition(canonicalId: string): DocumentDefinition | undefined {
  return getDefinition(resolveLegacyDefinitionId(canonicalId));
}

/** No duplicate active ids: canonical ids and legacy ids must not collide ambiguously. */
export function validateRegistry(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const doc of CANONICAL_DOCUMENTS) {
    if (seen.has(doc.canonicalId)) errors.push(`Duplicate canonicalId: ${doc.canonicalId}`);
    seen.add(doc.canonicalId);
    if (doc.requiredInputs.length === 0) errors.push(`${doc.canonicalId}: no requiredInputs`);
    if (doc.requiredSections.length === 0) errors.push(`${doc.canonicalId}: no requiredSections`);
    if (!resolveLegacyDefinition(doc.canonicalId)) {
      errors.push(`${doc.canonicalId}: generation base legacy definition missing`);
    }
    for (const v of doc.variants) {
      if (!v.id || !v.label) errors.push(`${doc.canonicalId}: variant missing id/label`);
    }
    for (const m of doc.modules) {
      if (!m.id || !m.title) errors.push(`${doc.canonicalId}: module missing id/title`);
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Derived validation rules for a canonical document (spec: validationRules). */
export function getValidationRules(canonical: CanonicalDocument): string[] {
  if (canonical.validationRules && canonical.validationRules.length > 0) return canonical.validationRules;
  const rules = [
    ...canonical.requiredInputs.map((f) => `require:${f}`),
    ...canonical.requiredSections.map((s) => `section:${s}`),
  ];
  if (canonical.reportType) rules.push("findings:require-evidence-ids");
  return rules;
}
