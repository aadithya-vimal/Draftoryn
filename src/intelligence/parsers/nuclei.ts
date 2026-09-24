// Nuclei JSONL/JSON parser with deterministic de-duplication.

import type { Parser, ParseResult } from "./types";
import { MAX_RECORDS_PER_FILE } from "../ingestion/identify";
import { truncate } from "../utils";

function normSev(s: unknown): "critical" | "high" | "medium" | "low" | "informational" {
  const v = String(s ?? "").toLowerCase();
  if (v === "critical") return "critical";
  if (v === "high") return "high";
  if (v === "medium") return "medium";
  if (v === "low") return "low";
  return "informational";
}

export const nucleiParser: Parser = {
  id: "nuclei",
  version: "1.0.0",
  canHandle: (input) => {
    const t = input.text.trimStart();
    if (input.filename.toLowerCase().includes("nuclei")) return true;
    if (!t.startsWith("{") && !t.startsWith("[")) return false;
    return t.includes("template-id") || t.includes("templateID");
  },
  parse: (input): ParseResult => {
    const lines = input.text.split("\n").map((l) => l.trim()).filter(Boolean);
    const evidence: ParseResult["evidence"] = [];
    const observations: ParseResult["observations"] = [];
    const assetSet = new Map<string, ParseResult["assets"][number]>();
    const seen = new Set<string>();

    const pushRecord = (rec: Record<string, unknown>, loc: string) => {
      const templateId = String(rec["template-id"] ?? rec["templateID"] ?? "unknown-template");
      const host = String(rec["host"] ?? "");
      const matchedAt = String(rec["matched-at"] ?? rec["matched"] ?? host);
      const info = (rec["info"] ?? {}) as Record<string, unknown>;
      const name = String(info["name"] ?? templateId);
      const severity = normSev(info["severity"]);
      const key = `${templateId}|${host}|${matchedAt}`;
      if (seen.has(key)) return;
      seen.add(key);
      const assetId = host || matchedAt;
      if (assetId && !assetSet.has(assetId)) {
        assetSet.set(assetId, { canonicalIdentifier: assetId, type: assetId.startsWith("http") ? "url" : "host", url: assetId.startsWith("http") ? assetId : undefined, hostname: assetId.startsWith("http") ? undefined : assetId });
      }
      const cwe = Array.isArray(info["classification"]) ? [] : [];
      const classif = info["classification"] as Record<string, unknown> | undefined;
      const cweIds: string[] = Array.isArray(classif?.["cwe-id"]) ? (classif?.["cwe-id"] as string[]) : [];
      const cveIds: string[] = Array.isArray(classif?.["cve-id"]) ? (classif?.["cve-id"] as string[]) : [];
      evidence.push({
        evidenceType: "scanner_finding",
        title: `${name} (${matchedAt})`,
        content: truncate(`Nuclei template ${templateId} matched ${matchedAt} (host: ${host || "n/a"}) severity=${severity}`, 2000),
        structuredData: { templateId, name, host, matchedAt, severity, cwe: cweIds, cve: cveIds, reference: info["reference"] ?? null, scanner: "nuclei" },
        sourceLocation: loc,
        confidence: "medium",
        evidenceLevel: "L1_observed",
      });
      observations.push({ category: "scanner_result", description: `Nuclei ${templateId}: ${name} on ${matchedAt}`, assetRef: assetId || undefined, confidence: "medium" });
      void cwe;
    };

    try {
      const trimmed = input.text.trim();
      if (trimmed.startsWith("[")) {
        const arr = JSON.parse(trimmed) as unknown[];
        arr.slice(0, MAX_RECORDS_PER_FILE).forEach((r, i) => {
          if (r && typeof r === "object") pushRecord(r as Record<string, unknown>, `result[${i}]`);
        });
      } else {
        lines.slice(0, MAX_RECORDS_PER_FILE).forEach((line, i) => {
          try {
            pushRecord(JSON.parse(line) as Record<string, unknown>, `line[${i}]`);
          } catch {
            // Skip malformed lines; record continues deterministically.
          }
        });
      }
    } catch {
      return { artifactType: "nuclei_jsonl", evidence: [], assets: [], observations: [], warnings: ["Unparseable Nuclei input."], classification: { label: "Unparseable Nuclei output", confidence: 0.3, basis: "parse failure", reviewRecommended: true } };
    }

    return {
      artifactType: lines.length > 1 || !input.text.trim().startsWith("[") ? "nuclei_jsonl" : "nuclei_json",
      evidence,
      assets: [...assetSet.values()],
      observations,
      warnings: [],
      classification: { label: "Nuclei scan output", confidence: 0.95, basis: "Detected Nuclei template-id structure", reviewRecommended: false },
    };
  },
};
