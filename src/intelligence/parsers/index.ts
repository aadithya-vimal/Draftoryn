// Parser registry: artifact bytes → first matching parser → normalized result.
// Order matters: specific tool parsers first, generic fallback last.

import type { Parser, ParserInput, ParseResult } from "./types";
import { nmapParser } from "./nmap";
import { nessusParser } from "./nessus";
import { nucleiParser } from "./nuclei";
import { zapParser } from "./zap";
import { burpParser } from "./burp";
import { sarifParser } from "./sarif";
import { genericParser } from "./generic";

export type { Parser, ParserInput, ParseResult };

const PARSERS: Parser[] = [nmapParser, nessusParser, burpParser, zapParser, nucleiParser, sarifParser, genericParser];

export function listParsers(): Array<{ id: string; version: string }> {
  return PARSERS.map((p) => ({ id: p.id, version: p.version }));
}

export function selectParser(input: ParserInput): Parser {
  for (const p of PARSERS) {
    try {
      if (p !== genericParser && p.canHandle(input)) return p;
    } catch {
      continue;
    }
  }
  return genericParser;
}

export function parseArtifact(input: ParserInput): { result: ParseResult; parserId: string; parserVersion: string } {
  const parser = selectParser(input);
  try {
    const result = parser.parse(input);
    return { result, parserId: parser.id, parserVersion: parser.version };
  } catch (e) {
    // A parser must never take down the pipeline: fail the file safely.
    const reason = e instanceof Error ? e.message : String(e);
    return {
      result: {
        artifactType: "unknown",
        evidence: [],
        assets: [],
        observations: [],
        warnings: [`Parse rejected safely: ${reason.slice(0, 300)}`],
        classification: { label: "Unparseable artifact", confidence: 0.2, basis: "parser safety rejection", reviewRecommended: true },
      },
      parserId: parser.id,
      parserVersion: parser.version,
    };
  }
}
