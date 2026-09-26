// Intelligence schemas — strongly typed core model for the document
// intelligence pipeline. Platform-agnostic (no React Native imports).
// Arbitrary untyped JSON is never the core model: every stage validates
// through these zod schemas.

import { z } from "zod";

export const SEVERITIES = ["critical", "high", "medium", "low", "informational"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  informational: 0,
};

/** Evidence hierarchy (§14): only L1/L2 may be stated as established facts. */
export const EVIDENCE_LEVELS = ["L1_observed", "L2_derived", "L3_interpretation", "L4_inference"] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export const VERIFICATION_STATES = ["confirmed", "unverified", "needs-review"] as const;
export type VerificationState = (typeof VERIFICATION_STATES)[number];

export const ARTIFACT_TYPES = [
  "nmap_xml",
  "burp_xml",
  "zap_json",
  "zap_xml",
  "nessus_xml",
  "openvas_xml",
  "nuclei_jsonl",
  "nuclei_json",
  "nikto_json",
  "ffuf_json",
  "gobuster_json",
  "sarif",
  "csv",
  "json",
  "jsonl",
  "xml_generic",
  "yaml",
  "txt",
  "log",
  "markdown",
  "pdf",
  "docx",
  "image",
  "scope_doc",
  "prior_report",
  "unknown",
] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const sourceArtifactSchema = z.object({
  id: z.string().min(1).max(80),
  filename: z.string().min(1).max(255),
  mediaType: z.string().min(1).max(127),
  size: z.number().int().min(0),
  checksum: z.string().regex(/^[a-f0-9]{64}$/, "sha256 hex required"),
  artifactType: z.enum(ARTIFACT_TYPES),
  parser: z.string().min(1).max(80),
  parserVersion: z.string().min(1).max(24),
  uploadedAt: z.string().datetime({ offset: true }),
  status: z.enum(["queued", "parsing", "parsed", "failed"]),
  failureReason: z.string().max(500).optional(),
});
export type SourceArtifact = z.infer<typeof sourceArtifactSchema>;

export const provenanceRefSchema = z.object({
  sourceArtifactId: z.string().min(1).max(80),
  /** JSON path / line / record / page pointer into the source artifact. */
  location: z.string().min(1).max(500),
  evidenceLevel: z.enum(EVIDENCE_LEVELS),
});
export type ProvenanceRef = z.infer<typeof provenanceRefSchema>;

export const EVIDENCE_TYPES = [
  "open_port",
  "service_banner",
  "scanner_finding",
  "manual_observation",
  "scope_statement",
  "credential_reference",
  "screenshot",
  "log_excerpt",
  "config_excerpt",
  "timeline_event",
  "identity",
  "document_section",
] as const;

export const evidenceItemSchema = z.object({
  id: z.string().min(1).max(80),
  sourceArtifactId: z.string().min(1).max(80),
  sourceLocation: z.string().min(1).max(500),
  evidenceType: z.enum(EVIDENCE_TYPES),
  title: z.string().min(1).max(300),
  content: z.string().max(20000),
  structuredData: z.record(z.unknown()).default({}),
  extractedAt: z.string().datetime({ offset: true }),
  confidence: z.enum(CONFIDENCE_LEVELS),
  sensitivity: z.enum(["public", "internal", "sensitive", "highly_sensitive"]).default("internal"),
  redactionState: z.enum(["original", "redacted", "redaction_pending"]).default("original"),
  evidenceLevel: z.enum(EVIDENCE_LEVELS),
});
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;

export const assetSchema = z.object({
  id: z.string().min(1).max(80),
  canonicalIdentifier: z.string().min(1).max(500),
  type: z.enum(["host", "domain", "ip", "url", "application", "cloud_account", "repository", "other"]),
  hostname: z.string().max(253).optional(),
  ip: z.string().max(45).optional(),
  url: z.string().max(2000).optional(),
  application: z.string().max(300).optional(),
  environment: z.string().max(120).optional(),
  ownership: z.enum(["in_scope", "out_of_scope", "unknown"]).default("unknown"),
  sourceEvidenceIds: z.array(z.string()).max(500).default([]),
});
export type Asset = z.infer<typeof assetSchema>;

export const observationSchema = z.object({
  id: z.string().min(1).max(80),
  assetId: z.string().min(1).max(80).optional(),
  category: z.enum(["scanner_result", "service_exposure", "misconfiguration", "manual_validation", "scope_fact", "other"]),
  description: z.string().min(1).max(5000),
  observedValue: z.string().max(5000).optional(),
  sourceEvidenceIds: z.array(z.string()).min(1).max(500),
  confidence: z.enum(CONFIDENCE_LEVELS),
  /** Scanner output is an observation, never an auto-confirmed vulnerability. */
  validated: z.boolean().default(false),
});
export type Observation = z.infer<typeof observationSchema>;

export const testActivitySchema = z.object({
  id: z.string().min(1).max(80),
  methodology: z.string().min(1).max(200),
  testCaseId: z.string().max(120).optional(),
  objective: z.string().min(1).max(2000),
  result: z.enum(["pass", "fail", "finding", "inconclusive", "blocked", "not_tested"]),
  sourceEvidenceIds: z.array(z.string()).max(500).default([]),
});
export type TestActivity = z.infer<typeof testActivitySchema>;
