// Burp Suite XML export parser. Request/response bodies are summarized by
// length only — raw credentials or tokens in traffic are never persisted.

import { assertSafeXml, xmlHead, type Parser, type ParseResult } from "./types";
import { MAX_RECORDS_PER_FILE, MAX_TEXT_CHARS } from "../ingestion/identify";
import { truncate } from "../utils";

function field(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, "i"));
  return (m?.[1] ?? "").trim();
}

export const burpParser: Parser = {
  id: "burp",
  version: "1.0.0",
  canHandle: (input) => {
    const head = xmlHead(input.text);
    return head.includes("<issues") && input.text.includes("<issue>");
  },
  parse: (input): ParseResult => {
    assertSafeXml(input.text, MAX_TEXT_CHARS);
    const issues = input.text.match(/<issue>[\s\S]*?<\/issue>/gi) ?? [];
    const evidence: ParseResult["evidence"] = [];
    const observations: ParseResult["observations"] = [];
    const assetMap = new Map<string, ParseResult["assets"][number]>();
    const seen = new Set<string>();

    issues.slice(0, MAX_RECORDS_PER_FILE).forEach((block, i) => {
      const name = field(block, "name") || "Unnamed Burp issue";
      const severity = field(block, "severity") || "Information";
      const confidence = field(block, "confidence") || "";
      const host = field(block, "host") || "";
      const path = field(block, "path") || "";
      const detail = field(block, "detail") || field(block, "issueDetail") || "";
      const remediation = field(block, "remediationBackground") || "";
      const key = `${name}|${host}|${path}`;
      if (seen.has(key)) return;
      seen.add(key);
      const assetId = `https://${host}${path}`.replace(/\/$/, "") || host;
      if (host && !assetMap.has(assetId)) assetMap.set(assetId, { canonicalIdentifier: assetId, type: "url", hostname: host, url: host.startsWith("http") ? host : `https://${host}` });
      evidence.push({
        evidenceType: "scanner_finding",
        title: `${name} (${host}${path})`,
        content: truncate([`Burp issue: ${name}`, `Severity: ${severity}${confidence ? ` Confidence: ${confidence}` : ""}`, `Host: ${host}`, `Path: ${path}`, detail ? `Detail: ${detail.replace(/<[^>]*>/g, "").slice(0, 1500)}` : "", remediation ? `Remediation: ${remediation.replace(/<[^>]*>/g, "").slice(0, 1200)}` : ""].filter(Boolean).join("\n"), 4000),
        structuredData: { name, host, path, severity, confidence: confidence || null, scanner: "burp" },
        sourceLocation: `issue[${i}]`,
        confidence: /certain|firm/i.test(confidence) ? "high" : "medium",
        evidenceLevel: "L1_observed",
      });
      observations.push({ category: "scanner_result", description: `Burp: ${name} on ${host}${path}`, assetRef: host || undefined, confidence: "medium" });
    });

    return {
      artifactType: "burp_xml",
      evidence,
      assets: [...assetMap.values()],
      observations,
      warnings: [],
      classification: { label: "Burp Suite findings export", confidence: 0.93, basis: "Detected Burp issues XML structure", reviewRecommended: false },
    };
  },
};
