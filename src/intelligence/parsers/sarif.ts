// SARIF v2.1.0 parser (static analysis / scanner interchange format).

import type { Parser, ParseResult } from "./types";
import { MAX_RECORDS_PER_FILE } from "../ingestion/identify";
import { truncate } from "../utils";

export const sarifParser: Parser = {
  id: "sarif",
  version: "1.0.0",
  canHandle: (input) => {
    const t = input.text.trimStart();
    if (!t.startsWith("{")) return false;
    return t.includes('"$schema"') && t.includes("sarif") && t.includes('"runs"');
  },
  parse: (input): ParseResult => {
    let root: Record<string, unknown>;
    try {
      root = JSON.parse(input.text) as Record<string, unknown>;
    } catch {
      return { artifactType: "sarif", evidence: [], assets: [], observations: [], warnings: ["Malformed SARIF JSON."], classification: { label: "Malformed SARIF", confidence: 0.3, basis: "parse failure", reviewRecommended: true } };
    }
    const runs = (root["runs"] ?? []) as Array<Record<string, unknown>>;
    const evidence: ParseResult["evidence"] = [];
    const observations: ParseResult["observations"] = [];
    const assetMap = new Map<string, ParseResult["assets"][number]>();
    const seen = new Set<string>();
    let count = 0;

    for (let ri = 0; ri < runs.length && count < MAX_RECORDS_PER_FILE; ri++) {
      const run = runs[ri]!;
      const toolName = String((run["tool"] as Record<string, unknown>)?.["driver"] ? (((run["tool"] as Record<string, unknown>)["driver"] as Record<string, unknown>)["name"] ?? "sarif-tool") : "sarif-tool");
      const results = (run["results"] ?? []) as Array<Record<string, unknown>>;
      for (let i = 0; i < results.length && count < MAX_RECORDS_PER_FILE; i++) {
        const r = results[i]!;
        const ruleId = String(r["ruleId"] ?? "unknown-rule");
        const message = String((r["message"] as Record<string, unknown>)?.["text"] ?? "");
        const level = String(r["level"] ?? "note");
        const loc = (((r["locations"] ?? []) as Array<Record<string, unknown>>)[0]?.["physicalLocation"] ?? {}) as Record<string, unknown>;
        const uri = String(((loc["artifactLocation"] as Record<string, unknown>)?.["uri"]) ?? "unknown-artifact");
        const line = ((loc["region"] as Record<string, unknown>)?.["startLine"] as number | undefined) ?? 0;
        const key = `${ruleId}|${uri}|${line}|${message.slice(0, 200)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        count++;
        if (!assetMap.has(uri)) assetMap.set(uri, { canonicalIdentifier: uri, type: "repository" });
        evidence.push({
          evidenceType: "scanner_finding",
          title: `${ruleId} (${uri}${line ? `:${line}` : ""})`,
          content: truncate(`SARIF [${toolName}] ${level}: ${ruleId}\nArtifact: ${uri}${line ? ` line ${line}` : ""}\n${message.slice(0, 1500)}`, 3000),
          structuredData: { ruleId, level, uri, line, message: message.slice(0, 1500), tool: toolName, scanner: "sarif" },
          sourceLocation: `runs[${ri}]/results[${i}]`,
          confidence: "medium",
          evidenceLevel: "L1_observed",
        });
        observations.push({ category: "scanner_result", description: `SARIF ${ruleId} in ${uri}`, assetRef: uri, confidence: "medium" });
      }
    }

    return {
      artifactType: "sarif",
      evidence,
      assets: [...assetMap.values()],
      observations,
      warnings: [],
      classification: { label: "SARIF static-analysis results", confidence: 0.95, basis: "Detected SARIF v2.1.0 structure", reviewRecommended: false },
    };
  },
};
