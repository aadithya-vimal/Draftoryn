// Parser contract: artifact bytes/text in, normalized raw evidence out.
// Parsers never log content, never execute anything, never touch the network.

import type { ArtifactType } from "../schemas/evidence";
import type { EVIDENCE_TYPES } from "../schemas/evidence";

export interface ParserInput {
  filename: string;
  mediaType: string;
  text: string;
  size: number;
  /** Raw bytes when available (required for docx/pdf/image; text may be ""). */
  bytes?: Uint8Array;
}

export interface RawEvidence {
  evidenceType: (typeof EVIDENCE_TYPES)[number];
  title: string;
  content: string;
  structuredData: Record<string, unknown>;
  sourceLocation: string;
  confidence: "high" | "medium" | "low";
  evidenceLevel: "L1_observed" | "L2_derived";
}

export interface RawAsset {
  canonicalIdentifier: string;
  type: "host" | "domain" | "ip" | "url" | "application" | "cloud_account" | "repository" | "other";
  hostname?: string;
  ip?: string;
  url?: string;
  application?: string;
  environment?: string;
}

export interface RawObservation {
  category: "scanner_result" | "service_exposure" | "misconfiguration" | "manual_validation" | "scope_fact" | "other";
  description: string;
  observedValue?: string;
  assetRef?: string;
  confidence: "high" | "medium" | "low";
}

export interface ParserClassification {
  label: string;
  confidence: number;
  basis: string;
  reviewRecommended: boolean;
}

export interface ParseResult {
  artifactType: ArtifactType;
  evidence: RawEvidence[];
  assets: RawAsset[];
  observations: RawObservation[];
  warnings: string[];
  classification: ParserClassification;
}

export interface Parser {
  id: string;
  version: string;
  canHandle(input: ParserInput): boolean;
  parse(input: ParserInput): ParseResult;
}

/** Reject XXE / billion-laughs carriers before any XML parsing. */
export function assertSafeXml(text: string, maxBytes: number): void {
  if (text.length > maxBytes) throw new Error(`XML exceeds size cap (${maxBytes} chars).`);
  // A bare public DOCTYPE (e.g. stock `<!DOCTYPE nmaprun>`) carries no entities
  // and is safe; anything with an internal subset or ENTITY is rejected.
  if (/<!ENTITY/i.test(text.slice(0, 200000))) throw new Error("XML with ENTITY declarations rejected (XXE protection).");
  if (/<!DOCTYPE[^>]*\[/i.test(text.slice(0, 20000))) throw new Error("XML with DOCTYPE internal subset rejected (XXE protection).");
  const entities = (text.match(/&\w+;/g) ?? []).length;
  if (entities > 5000) throw new Error("XML entity expansion rejected.");
}

/** Look for a root marker within the XML prologue (real files start with <?xml ...?>). */
export function xmlHead(input: string, len = 2000): string {
  return input.slice(0, len);
}

export function emptyResult(artifactType: ArtifactType, label: string, warnings: string[] = []): ParseResult {
  return {
    artifactType,
    evidence: [],
    assets: [],
    observations: [],
    warnings,
    classification: { label, confidence: 0.5, basis: "parser fallback", reviewRecommended: true },
  };
}
