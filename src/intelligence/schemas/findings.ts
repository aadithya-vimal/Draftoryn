// Finding schemas: candidate (machine-proposed) vs confirmed (human-reviewed).
// Flow: Scanner Result → Observation → Evidence → Candidate → Review → Confirmed.

import { z } from "zod";
import { CONFIDENCE_LEVELS, EVIDENCE_LEVELS, SEVERITIES, VERIFICATION_STATES } from "./evidence";

export const cvssSchema = z.object({
  version: z.enum(["4.0", "3.1", "3.0"]),
  vector: z.string().min(1).max(300),
  score: z.number().min(0).max(10),
  /** True only when every metric in the vector was evidenced, never invented. */
  fullyDetermined: z.boolean().default(false),
});
export type CvssRef = z.infer<typeof cvssSchema>;

export const taxonomyMappingsSchema = z.object({
  cwe: z.array(z.string().regex(/^CWE-\d+$/)).max(10).default([]),
  cve: z.array(z.string().regex(/^CVE-\d{4}-\d{4,}$/)).max(10).default([]),
  owaspWstg: z.array(z.string().max(40)).max(10).default([]),
  nistRefs: z.array(z.string().max(80)).max(10).default([]),
  attck: z.array(z.string().regex(/^T\d{4}(\.\d{3})?$/)).max(20).default([]),
  ccm: z.array(z.string().max(40)).max(20).default([]),
});
export type TaxonomyMappings = z.infer<typeof taxonomyMappingsSchema>;

export const findingCandidateSchema = z.object({
  id: z.string().min(1).max(80),
  /** Deterministic dedup fingerprint: asset|endpoint|param|category|cwe|signature. */
  canonicalFingerprint: z.string().min(1).max(512),
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(10000),
  affectedAssets: z.array(z.string()).max(200).default([]),
  evidenceIds: z.array(z.string()).min(1).max(500),
  severity: z.enum(SEVERITIES),
  severityBasis: z.string().min(1).max(1000),
  cvss: cvssSchema.optional(),
  cwe: z.array(z.string().regex(/^CWE-\d+$/)).max(10).default([]),
  cve: z.array(z.string().regex(/^CVE-\d{4}-\d{4,}$/)).max(10).default([]),
  taxonomyMappings: taxonomyMappingsSchema.default({}),
  confidence: z.enum(CONFIDENCE_LEVELS),
  evidenceLevel: z.enum(EVIDENCE_LEVELS),
  status: z.enum(["proposed", "accepted", "rejected", "merged", "split", "unverified"]).default("proposed"),
  duplicateOf: z.string().max(80).optional(),
  contradictions: z.array(z.string().max(500)).max(50).default([]),
});
export type FindingCandidate = z.infer<typeof findingCandidateSchema>;

export const confirmedFindingSchema = z.object({
  id: z.string().min(1).max(80),
  findingCandidateId: z.string().min(1).max(80),
  reference: z.string().min(1).max(24),
  title: z.string().min(1).max(300),
  severity: z.enum(SEVERITIES),
  affectedAssets: z.array(z.string()).min(1).max(200),
  description: z.string().min(1).max(10000),
  impact: z.string().min(1).max(5000),
  evidence: z.array(z.string()).min(1).max(500),
  reproduction: z.array(z.string().max(2000)).max(50).default([]),
  remediation: z.array(z.string().max(2000)).min(1).max(50),
  references: z.array(z.string().max(500)).max(50).default([]),
  confidence: z.enum(CONFIDENCE_LEVELS),
  verificationState: z.enum(VERIFICATION_STATES),
  cvss: cvssSchema.optional(),
  taxonomyMappings: taxonomyMappingsSchema.default({}),
});
export type ConfirmedFinding = z.infer<typeof confirmedFindingSchema>;

export const conflictSchema = z.object({
  id: z.string().min(1).max(80),
  kind: z.enum([
    "scope",
    "severity",
    "remediation_state",
    "version",
    "identity",
    "dates",
    "asset_naming",
    "engagement_ref",
  ]),
  summary: z.string().min(1).max(1000),
  evidenceIds: z.array(z.string()).min(2).max(50),
  resolution: z.enum(["open", "acknowledged", "resolved"]).default("open"),
});
export type AnalysisConflict = z.infer<typeof conflictSchema>;
