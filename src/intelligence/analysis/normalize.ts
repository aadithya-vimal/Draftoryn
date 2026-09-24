// Normalization: parsed artifacts → validated graph nodes with stable ids.
// Deterministic: same inputs → same ids, same order.

import { cyrb53, normalizeIdentifier, sanitizeFilename } from "../utils";
import type { Asset, EvidenceItem, Observation } from "../schemas";
import type { ParseResult } from "../parsers/types";
import type { AnalyzedArtifact } from "./graph";

export interface NormalizedArtifact {
  artifact: AnalyzedArtifact;
  evidence: EvidenceItem[];
  assets: Asset[];
  observations: Observation[];
}

export function normalizeArtifact(
  analysisId: string,
  filename: string,
  checksum: string,
  mediaType: string,
  size: number,
  parsed: ParseResult,
  parserId: string,
  parserVersion: string,
  now = new Date().toISOString(),
): NormalizedArtifact {
  const safeName = sanitizeFilename(filename);
  const artifactId = `art_${cyrb53(`${analysisId}|${checksum}|${safeName}`).slice(0, 12)}`;

  const artifact: AnalyzedArtifact = {
    artifactId,
    filename: safeName,
    artifactType: parsed.artifactType,
    parserId,
    parserVersion,
    classification: parsed.classification,
    warnings: parsed.warnings,
  };

  const evidence: EvidenceItem[] = parsed.evidence.map((e, i) => ({
    id: `${artifactId}:e:${i}`,
    sourceArtifactId: artifactId,
    sourceLocation: e.sourceLocation,
    evidenceType: e.evidenceType,
    title: e.title,
    content: e.content,
    structuredData: e.structuredData,
    extractedAt: now,
    confidence: e.confidence,
    sensitivity: "internal",
    redactionState: "original",
    evidenceLevel: e.evidenceLevel,
  }));

  const assetKeyToId = new Map<string, string>();
  const assets: Asset[] = [];
  parsed.assets.forEach((a) => {
    const canon = normalizeIdentifier(a.canonicalIdentifier);
    const id = `ast_${cyrb53(`${analysisId}|${canon}`).slice(0, 12)}`;
    if (assetKeyToId.has(canon)) return;
    assetKeyToId.set(canon, id);
    assets.push({
      id,
      canonicalIdentifier: canon,
      type: a.type,
      hostname: a.hostname,
      ip: a.ip,
      url: a.url,
      application: a.application,
      environment: a.environment,
      ownership: "unknown",
      sourceEvidenceIds: [],
    });
  });

  const observations: Observation[] = parsed.observations.map((o, i) => {
    let assetId: string | undefined;
    if (o.assetRef) {
      const canon = normalizeIdentifier(o.assetRef);
      assetId = assetKeyToId.get(canon);
      if (!assetId) {
        assetId = `ast_${cyrb53(`${analysisId}|${canon}`).slice(0, 12)}`;
        assetKeyToId.set(canon, assetId);
        assets.push({ id: assetId, canonicalIdentifier: canon, type: "other", ownership: "unknown", sourceEvidenceIds: [] });
      }
    }
    return {
      id: `${artifactId}:o:${i}`,
      assetId,
      category: o.category,
      description: o.description,
      observedValue: o.observedValue,
      sourceEvidenceIds: evidence.slice(0, 3).map((e) => e.id),
      confidence: o.confidence,
      validated: false,
    };
  });

  // Link evidence back to assets by matching identifiers in titles/content.
  for (const e of evidence) {
    const hay = `${e.title} ${JSON.stringify(e.structuredData)}`.toLowerCase();
    for (const a of assets) {
      if (a.canonicalIdentifier.length >= 4 && hay.includes(a.canonicalIdentifier)) {
        if (!a.sourceEvidenceIds.includes(e.id)) a.sourceEvidenceIds.push(e.id);
      }
    }
  }
  void checksum;
  void mediaType;
  void size;

  return { artifact, evidence, assets, observations };
}
