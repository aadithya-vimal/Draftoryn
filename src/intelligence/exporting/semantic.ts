// Semantic structured rendering of an IntelligenceReport.
// JSON/XML/YAML carry findings/assets/evidence/standardsMappings as real
// objects — never giant prose strings.

import yaml from "js-yaml";
import type { IntelligenceReport } from "../schemas";

export interface SemanticReport {
  report: { id: string; type: string; view: string; version: number; status: string; generatedAt: string; qualityScore?: number; qualityFailures: string[] };
  engagement: IntelligenceReport["engagement"];
  scope: string[];
  findings: Array<{
    reference: string;
    title: string;
    severity: string;
    affectedAssets: string[];
    description: string;
    impact: string;
    evidence: string[];
    reproduction: string[];
    remediation: string[];
    references: string[];
    confidence: string;
    verificationState: string;
    cvss?: unknown;
    taxonomyMappings: unknown;
  }>;
  assets: string[];
  evidence: Array<{ id: string; artifact: string; location: string; level: string }>;
  standardsMappings: Array<{ finding: string; mappings: unknown }>;
  sections: Array<{ id: string; title: string; view: string }>;
}

export function toSemanticReport(report: IntelligenceReport): SemanticReport {
  return {
    report: {
      id: report.id,
      type: report.type,
      view: report.view,
      version: report.version,
      status: report.status,
      generatedAt: report.generatedAt,
      qualityScore: report.qualityScore,
      qualityFailures: report.qualityFailures,
    },
    engagement: report.engagement,
    scope: report.engagement.scope,
    findings: report.findings.map((f) => ({
      reference: f.reference,
      title: f.title,
      severity: f.severity,
      affectedAssets: f.affectedAssets,
      description: f.description,
      impact: f.impact,
      evidence: f.evidence,
      reproduction: f.reproduction,
      remediation: f.remediation,
      references: f.references,
      confidence: f.confidence,
      verificationState: f.verificationState,
      cvss: f.cvss,
      taxonomyMappings: f.taxonomyMappings,
    })),
    assets: [...new Set(report.findings.flatMap((f) => f.affectedAssets))],
    evidence: report.provenance.map((p, i) => ({ id: `ev:${i}`, artifact: p.sourceArtifactId, location: p.location, level: p.evidenceLevel })),
    standardsMappings: report.findings.map((f) => ({ finding: f.reference, mappings: f.taxonomyMappings })),
    sections: report.sections.map((s) => ({ id: s.id, title: s.title, view: s.view })),
  };
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function valueToXml(key: string, value: unknown, indent: string): string {
  if (value === null || value === undefined) return `${indent}<${key}/>`;
  if (Array.isArray(value)) {
    return value.map((v) => valueToXml(key.endsWith("s") ? key.slice(0, -1) : "item", v, indent)).join("\n");
  }
  if (typeof value === "object") {
    const inner = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => valueToXml(k.replace(/[^A-Za-z0-9_]/g, "_"), v, indent + "  "))
      .join("\n");
    return `${indent}<${key}>\n${inner}\n${indent}</${key}>`;
  }
  return `${indent}<${key}>${xmlEscape(String(value))}</${key}>`;
}

export function toSemanticXml(report: IntelligenceReport): string {
  const sem = toSemanticReport(report);
  const body = Object.entries(sem)
    .map(([k, v]) => valueToXml(k, v, "  "))
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<intelligenceReport>\n${body}\n</intelligenceReport>`;
}

export function toSemanticYaml(report: IntelligenceReport): string {
  return yaml.dump(toSemanticReport(report), { noRefs: true });
}
