import { describe, expect, it } from "vitest";
import {
  findingCandidateSchema,
  reportSchema,
  REPORT_SCHEMA_VERSION,
  sourceArtifactSchema,
} from "../src/intelligence/schemas/index";

const artifact = {
  id: "art_1",
  filename: "nmap.xml",
  mediaType: "application/xml",
  size: 1200,
  checksum: "a".repeat(64),
  artifactType: "nmap_xml",
  parser: "nmap",
  parserVersion: "1.0.0",
  uploadedAt: new Date().toISOString(),
  status: "parsed",
};

describe("intelligence schemas", () => {
  it("accepts a valid source artifact and rejects bad checksums", () => {
    expect(sourceArtifactSchema.safeParse(artifact).success).toBe(true);
    expect(
      sourceArtifactSchema.safeParse({ ...artifact, checksum: "zzz" }).success,
    ).toBe(false);
  });

  it("rejects finding candidates without evidence", () => {
    const base = {
      id: "fc_1",
      canonicalFingerprint: "fp",
      title: "IDOR",
      description: "desc",
      severity: "high",
      severityBasis: "manual validation",
      confidence: "high",
      evidenceLevel: "L1_observed",
    };
    expect(findingCandidateSchema.safeParse({ ...base, evidenceIds: [] }).success).toBe(false);
    expect(
      findingCandidateSchema.safeParse({ ...base, evidenceIds: ["ev_1"] }).success,
    ).toBe(true);
  });

  it("accepts a versioned report", () => {
    const parsed = reportSchema.safeParse({
      id: "rep_1",
      type: "pentest_report",
      sourceAnalysisId: "an_1",
      status: "draft",
      generatedAt: new Date().toISOString(),
      schemaVersion: REPORT_SCHEMA_VERSION,
    });
    expect(parsed.success).toBe(true);
  });
});
