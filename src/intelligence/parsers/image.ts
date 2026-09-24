// Image evidence: registered with metadata only. Pixels are never parsed
// locally — use the AI vision description flow for content analysis.

import type { Parser, ParseResult } from "./types";

function pngDimensions(b: Uint8Array): string | null {
  if (b.length > 24 && b[12] === 0x49 && b[13] === 0x48 && b[14] === 0x44 && b[15] === 0x52) {
    const w = (b[16]! << 24) | (b[17]! << 16) | (b[18]! << 8) | b[19]!;
    const h = (b[20]! << 24) | (b[21]! << 16) | (b[22]! << 8) | b[23]!;
    if (w > 0 && h > 0 && w < 100000 && h < 100000) return `${w}x${h}`;
  }
  return null;
}

export const imageParser: Parser = {
  id: "image",
  version: "1.0.0",
  canHandle: (input) => {
    if (input.mediaType.startsWith("image/")) return true;
    if (!input.bytes || input.bytes.length < 4) return false;
    const b = input.bytes;
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return true;
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true;
    return b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46;
  },
  parse: (input): ParseResult => {
    const dims = input.bytes ? pngDimensions(input.bytes) : null;
    return {
      artifactType: "image",
      evidence: [
        {
          evidenceType: "screenshot",
          title: `Screenshot evidence: ${input.filename}`,
          content: `Image evidence registered (${input.size} bytes${dims ? `, ${dims}px` : ""}). Pixel content is not parsed locally; use AI Describe for analysis.`,
          structuredData: { filename: input.filename, bytes: input.size, dimensions: dims ?? null },
          sourceLocation: "image",
          confidence: "low",
          evidenceLevel: "L1_observed",
        },
      ],
      assets: [],
      observations: [],
      warnings: [],
      classification: { label: "Evidence screenshot", confidence: 0.8, basis: "image media signature", reviewRecommended: true },
    };
  },
};
