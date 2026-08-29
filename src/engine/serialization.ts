import type {
  DocumentStatus,
  DocumentVersion,
  GeneratedDocument,
  SemanticModel,
  Section,
} from "./types";

export function createVersion(
  versionNumber: number,
  title: string,
  source: Record<string, unknown>,
  model: SemanticModel,
  sections: Section[],
  status: DocumentStatus,
  note?: string,
): DocumentVersion {
  return {
    id: `v_${versionNumber}_${Date.now().toString(36)}`,
    versionNumber,
    title,
    createdAt: new Date().toISOString(),
    note,
    source,
    model,
    sections,
    status,
  };
}

export function nextVersionNumber(versions: DocumentVersion[]): number {
  if (versions.length === 0) return 1;
  const max = versions.reduce((m, v) => Math.max(m, v.versionNumber), 0);
  return max + 1;
}

export function latestVersion(versions: DocumentVersion[]): DocumentVersion | undefined {
  if (versions.length === 0) return undefined;
  return [...versions].sort((a, b) => b.versionNumber - a.versionNumber)[0];
}

/** Convert a generated document into a storable version payload. */
export function generatedToVersion(
  versionNumber: number,
  gen: GeneratedDocument,
  source: Record<string, unknown>,
  status: DocumentStatus,
  note?: string,
): DocumentVersion {
  return createVersion(
    versionNumber,
    gen.title,
    source,
    gen.model,
    gen.sections,
    status,
    note,
  );
}

export function serializeDocumentToJson(doc: GeneratedDocument): string {
  return JSON.stringify(doc, null, 2);
}
