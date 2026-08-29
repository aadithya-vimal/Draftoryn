import type { GeneratedDocument, Section } from "../types";

export interface SemanticJson {
  generated_by: string;
  generator: { name: string; product: string; version: string; generated_at: string };
  document_type: string;
  name: string;
  category: string;
  metadata: Record<string, string>;
  organization: {
    client?: unknown;
    provider?: unknown;
  };
  people: unknown[];
  objective?: string;
  scope?: unknown;
  schedule?: unknown;
  authorization?: unknown;
  constraints: string[];
  methodology: string[];
  evidence: string[];
  findings: unknown[];
  risks: unknown[];
  recommendations: unknown[];
  reporting?: unknown;
  assumptions: string[];
  sections: Array<{
    id: string;
    title: string;
    kind: string;
    status: string;
    blocks: unknown[];
  }>;
}

export function toSemanticJsonObject(doc: GeneratedDocument): SemanticJson {
  const m = doc.model;
  const gen = doc.generator;
  return {
    generated_by: "draftoryn",
    generator: gen
      ? { name: gen.name, product: gen.product, version: gen.version, generated_at: gen.generatedAt }
      : { name: "Draftoryn", product: "Draftoryn", version: "1.0.0", generated_at: new Date().toISOString() },
    document_type: m.documentType,
    name: doc.title,
    category: m.category,
    metadata: doc.metadata,
    organization: { client: m.client, provider: m.provider },
    people: m.people,
    objective: m.objective,
    scope: m.scope,
    schedule: m.schedule,
    authorization: m.authorization,
    constraints: m.constraints,
    methodology: m.methodology,
    evidence: m.evidence,
    findings: m.findings,
    risks: m.risks,
    recommendations: m.recommendations,
    reporting: m.reporting,
    assumptions: m.assumptions,
    sections: doc.sections
      .filter((s: Section) => !s.hidden)
      .map((s) => ({ id: s.id, title: s.title, kind: s.kind, status: s.status, blocks: s.blocks })),
  };
}

export function toJson(doc: GeneratedDocument): string {
  return JSON.stringify(toSemanticJsonObject(doc), null, 2);
}
