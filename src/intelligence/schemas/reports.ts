// Report schemas: one canonical report model with presentation views
// (executive / technical / full / remediation / retest) — never separate engines.

import { z } from "zod";
import { confirmedFindingSchema } from "./findings";
import { provenanceRefSchema } from "./evidence";

export const REPORT_VIEWS = ["executive", "technical", "full", "remediation", "retest"] as const;
export type ReportView = (typeof REPORT_VIEWS)[number];

export const reportSectionSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(300),
  /** Optional sections vanish from output when no evidence supports them. */
  optional: z.boolean().default(false),
  body: z.string().max(60000),
  evidenceIds: z.array(z.string()).max(500).default([]),
  view: z.enum(["executive", "technical", "shared", "appendix"]).default("shared"),
});
export type ReportSection = z.infer<typeof reportSectionSchema>;

export const reportSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.string().min(1).max(80),
  sourceAnalysisId: z.string().min(1).max(80),
  status: z.enum(["draft", "in_review", "validated", "exported"]),
  generatedAt: z.string().datetime({ offset: true }),
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  view: z.enum(REPORT_VIEWS).default("full"),
  engagement: z.object({
    client: z.string().max(300).optional(),
    assessmentName: z.string().max(300).optional(),
    scope: z.array(z.string().max(500)).max(200).default([]),
    methodology: z.array(z.string().max(200)).max(50).default([]),
  }).default({}),
  findings: z.array(confirmedFindingSchema).max(1000).default([]),
  sections: z.array(reportSectionSchema).max(100).default([]),
  provenance: z.array(provenanceRefSchema).max(5000).default([]),
  /** Quality gate score 0..1 plus blocking failures. */
  qualityScore: z.number().min(0).max(1).optional(),
  qualityFailures: z.array(z.string().max(500)).max(200).default([]),
  /** Report version chain: never overwrite history destructively. */
  version: z.number().int().min(1).default(1),
  supersedes: z.string().max(80).optional(),
});
export type IntelligenceReport = z.infer<typeof reportSchema>;

export const REPORT_SCHEMA_VERSION = "1.0.0";
