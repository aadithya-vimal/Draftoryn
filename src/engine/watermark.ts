// Canonical Draftoryn generation attribution.
// Every exported document — visual or machine-readable — must carry this metadata
// so the watermark is consistent across all exporters.

export const DRAFTORYN_PRODUCT = "Draftoryn";
export const DRAFTORYN_VERSION = "1.0.0";

export interface GeneratorMeta {
  name: string;
  product: string;
  version: string;
  generatedAt: string;
  /** Stable machine-readable watermark used by structured exporters. */
  generatedBy: string;
}

export function buildGeneratorMeta(now: Date = new Date()): GeneratorMeta {
  return {
    name: DRAFTORYN_PRODUCT,
    product: DRAFTORYN_PRODUCT,
    version: DRAFTORYN_VERSION,
    generatedAt: now.toISOString(),
    generatedBy: DRAFTORYN_PRODUCT.toLowerCase(),
  };
}

/** Visual watermark string used by PDF / DOCX / HTML renderers. */
export function visualWatermark(): string {
  return DRAFTORYN_PRODUCT.toUpperCase();
}
