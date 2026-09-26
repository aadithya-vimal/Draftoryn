// Bridge: IntelligenceReport → GeneratedDocument so reports become
// first-class Draftoryn documents (edit, version, restore, export).

import type { ContentBlock, GeneratedDocument, Section, SemanticModel } from "../../engine/types";
import { resolveLegacyDefinition } from "../../engine/catalog/registry";
import type { IntelligenceReport, ReportSection } from "../schemas";

function bodyToBlocks(body: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const chunks = body.split(/\n{2,}/).map((c) => c.trim()).filter(Boolean);
  let pendingList: string[] = [];
  const flush = () => {
    if (pendingList.length > 0) {
      blocks.push({ type: "list", items: pendingList, ordered: false });
      pendingList = [];
    }
  };
  for (const chunk of chunks) {
    if (chunk.startsWith("## ")) {
      flush();
      blocks.push({ type: "heading", level: 3, text: chunk.slice(3).trim() });
    } else if (chunk.startsWith("### ")) {
      flush();
      blocks.push({ type: "heading", level: 4, text: chunk.slice(4).trim() });
    } else if (/^(-|\*|\d+\.)\s/m.test(chunk)) {
      for (const line of chunk.split("\n")) {
        const m = line.match(/^(?:-|\*|\d+\.)\s+(.*)$/);
        if (m?.[1]) pendingList.push(m[1].trim());
        else if (line.trim()) pendingList.push(line.trim());
      }
    } else {
      flush();
      blocks.push({ type: "paragraph", text: chunk });
    }
  }
  flush();
  return blocks.length > 0 ? blocks : [{ type: "paragraph", text: body }];
}

function sectionToSection(s: ReportSection): Section {
  return {
    id: s.id,
    title: s.title,
    kind: s.id,
    blocks: bodyToBlocks(s.body),
    status: "generated",
    generatedAt: new Date().toISOString(),
  };
}

export function reportToGeneratedDocument(report: IntelligenceReport): GeneratedDocument {
  const base = resolveLegacyDefinition(report.type);
  const model: SemanticModel = {
    documentType: report.type,
    category: base?.category ?? "offensive_security",
    documentName: report.engagement.assessmentName ?? report.type,
    client: report.engagement.client ? { name: report.engagement.client } : undefined,
    people: [],
    objective: undefined,
    scope: { inScope: report.engagement.scope, outOfScope: [], conditional: [] },
    constraints: [],
    methodology: report.engagement.methodology,
    evidence: report.provenance.map((p) => `${p.sourceArtifactId} @ ${p.location}`),
    findings: report.findings.map((f) => ({
      id: f.reference,
      title: f.title,
      severity: f.severity,
      affectedAsset: f.affectedAssets.join(", "),
      description: f.description,
      status: f.verificationState,
    })),
    risks: [],
    recommendations: report.findings.flatMap((f, i) =>
      f.remediation.map((r, j) => ({ id: `R-${i + 1}.${j + 1}`, title: r })),
    ),
    assumptions: [],
    extra: { sourceAnalysisId: report.sourceAnalysisId, qualityScore: report.qualityScore ?? null },
  };

  return {
    id: report.id,
    definitionId: base?.id ?? "pentest_report",
    title: report.engagement.assessmentName ?? `Intelligence Report ${report.id}`,
    status: "ready",
    generatedAt: report.generatedAt,
    engineVersion: "intelligence-1.0.0",
    metadata: {
      client: report.engagement.client ?? "",
      date: report.generatedAt,
      classification: "Confidential",
      version: String(report.version),
      provenance: `${report.provenance.length} evidence refs`,
    },
    model,
    sections: report.sections.map(sectionToSection),
  };
}
