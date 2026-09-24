// Nessus (.nessus) XML parser. Severity mapping: 0 none/info, 1 low, 2 medium, 3 high, 4 critical.

import { assertSafeXml, xmlHead, type Parser, type ParseResult } from "./types";
import { MAX_RECORDS_PER_FILE, MAX_TEXT_CHARS } from "../ingestion/identify";
import { truncate } from "../utils";

const NESSUS_SEV = ["informational", "low", "medium", "high", "critical"] as const;

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"));
  return m?.[1];
}
function tag(block: string, name: string): string | undefined {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m?.[1]?.trim();
}

export const nessusParser: Parser = {
  id: "nessus",
  version: "1.0.0",
  canHandle: (input) => xmlHead(input.text).includes("<NessusClientData"),
  parse: (input): ParseResult => {
    assertSafeXml(input.text, MAX_TEXT_CHARS);
    const hosts = input.text.match(/<ReportHost[\s>][\s\S]*?<\/ReportHost>/gi) ?? [];
    const evidence: ParseResult["evidence"] = [];
    const assets: ParseResult["assets"] = [];
    const observations: ParseResult["observations"] = [];
    const seenHosts = new Set<string>();
    let count = 0;

    for (let hi = 0; hi < hosts.length && count < MAX_RECORDS_PER_FILE; hi++) {
      const block = hosts[hi]!;
      const host = attr(block.match(/<ReportHost[^>]*>/i)?.[0] ?? "", "name") ?? `host[${hi}]`;
      if (!seenHosts.has(host)) {
        seenHosts.add(host);
        assets.push({ canonicalIdentifier: host, type: "host", hostname: host });
      }
      const items = block.match(/<ReportItem[\s>][\s\S]*?<\/ReportItem>/gi) ?? [];
      for (let ii = 0; ii < items.length && count < MAX_RECORDS_PER_FILE; ii++) {
        const item = items[ii]!;
        const openTag = item.match(/<ReportItem[^>]*>/i)?.[0] ?? "";
        const port = attr(openTag, "port") ?? "0";
        const pluginName = attr(openTag, "pluginName") ?? tag(item, "plugin_name") ?? "Unknown plugin result";
        const pluginId = attr(openTag, "pluginID") ?? "";
        const sevNum = Math.max(0, Math.min(4, parseInt(attr(openTag, "severity") ?? "0", 10) || 0));
        const cves = [...item.matchAll(/<cve>([^<]*)<\/cve>/gi)].map((m) => m[1]!.trim()).filter(Boolean);
        const cvss3 = tag(item, "cvss3_vector") ?? tag(item, "cvss_vector");
        const synopsis = tag(item, "synopsis");
        if (sevNum === 0) continue;
        count++;
        evidence.push({
          evidenceType: "scanner_finding",
          title: `${pluginName} (${host}:${port})`,
          content: truncate([`Plugin ${pluginId}: ${pluginName}`, `Host: ${host} Port: ${port}`, synopsis ? `Synopsis: ${synopsis}` : ""].filter(Boolean).join("\n"), 4000),
          structuredData: { host, port, pluginId, pluginName, severity: NESSUS_SEV[sevNum], cves, cvss3_vector: cvss3 ?? null, scanner: "nessus" },
          sourceLocation: `ReportHost[${hi}]/ReportItem[${ii}]`,
          confidence: "medium",
          evidenceLevel: "L1_observed",
        });
        observations.push({ category: "scanner_result", description: `Nessus plugin ${pluginId} fired on ${host}:${port}: ${pluginName}`, assetRef: host, confidence: "medium" });
      }
    }
    // De-duplicate identical plugin+host+port rows deterministically.
    const dedup = new Map<string, (typeof evidence)[number]>();
    for (const e of evidence) {
      const key = `${e.structuredData.host}|${e.structuredData.port}|${e.structuredData.pluginId}`;
      if (!dedup.has(key)) dedup.set(key, e);
    }
    return {
      artifactType: "nessus_xml",
      evidence: [...dedup.values()],
      assets,
      observations,
      warnings: count >= MAX_RECORDS_PER_FILE ? ["Record cap reached; remainder truncated."] : [],
      classification: { label: "Nessus vulnerability scan export", confidence: 0.97, basis: "Detected canonical Nessus XML structure", reviewRecommended: false },
    };
  },
};
