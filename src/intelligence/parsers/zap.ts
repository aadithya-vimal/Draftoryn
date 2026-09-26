// OWASP ZAP JSON parser (2.x/2.y alert format).

import type { Parser, ParseResult } from "./types";
import { truncate } from "../utils";

function mapRisk(risk: string): "critical" | "high" | "medium" | "low" | "informational" {
  const v = risk.trim().toLowerCase();
  if (v === "high") return "high";
  if (v === "medium") return "medium";
  if (v === "low") return "low";
  return "informational";
}

export const zapParser: Parser = {
  id: "zap",
  version: "1.0.0",
  canHandle: (input) => {
    const t = input.text.trimStart();
    if (!t.startsWith("{") && !t.startsWith("[")) return false;
    return t.includes('"alerts"') && (t.includes("riskdesc") || t.includes("riskcode"));
  },
  parse: (input): ParseResult => {
    let root: unknown;
    try {
      root = JSON.parse(input.text);
    } catch {
      return { artifactType: "zap_json", evidence: [], assets: [], observations: [], warnings: ["Malformed ZAP JSON."], classification: { label: "Malformed ZAP export", confidence: 0.3, basis: "parse failure", reviewRecommended: true } };
    }
    const sites = (root as Record<string, unknown>)["site"] ?? (Array.isArray(root) ? root : []);
    const siteArr = Array.isArray(sites) ? sites : [sites];
    const evidence: ParseResult["evidence"] = [];
    const observations: ParseResult["observations"] = [];
    const assetMap = new Map<string, ParseResult["assets"][number]>();
    const seen = new Set<string>();

    siteArr.forEach((site: unknown, si: number) => {
      const s = site as Record<string, unknown>;
      const siteName = String(s["@name"] ?? s["name"] ?? `site[${si}]`);
      if (!assetMap.has(siteName)) assetMap.set(siteName, { canonicalIdentifier: siteName, type: "url", url: siteName.startsWith("http") ? siteName : undefined });
      const alerts = (s["alerts"] ?? []) as Array<Record<string, unknown>>;
      alerts.forEach((a, ai) => {
        const title = String(a["alert"] ?? a["name"] ?? "Unnamed alert");
        const risk = String(a["riskdesc"] ?? a["risk"] ?? "Informational").split(" ")[0]!;
        const url = String(a["url"] ?? siteName);
        const param = String(a["param"] ?? "");
        const key = `${title}|${url}|${param}`;
        if (seen.has(key)) return;
        seen.add(key);
        evidence.push({
          evidenceType: "scanner_finding",
          title: `${title} (${url})`,
          content: truncate([`Alert: ${title}`, `Site: ${siteName}`, `URL: ${url}`, param ? `Param: ${param}` : "", `Risk: ${risk}`, a["desc"] ? `Description: ${String(a["desc"]).slice(0, 1500)}` : "", a["solution"] ? `Solution: ${String(a["solution"]).slice(0, 1500)}` : ""].filter(Boolean).join("\n"), 4000),
          structuredData: { alert: title, site: siteName, url, param: param || null, risk: mapRisk(risk), confidence: String(a["confidence"] ?? "Medium"), cweid: a["cweid"] ?? null, wasc: a["wascid"] ?? null, scanner: "zap" },
          sourceLocation: `site[${si}]/alerts[${ai}]`,
          confidence: "medium",
          evidenceLevel: "L1_observed",
        });
        observations.push({ category: "scanner_result", description: `ZAP alert "${title}" on ${url}`, assetRef: siteName, confidence: "medium" });
      });
    });

    return {
      artifactType: "zap_json",
      evidence,
      assets: [...assetMap.values()],
      observations,
      warnings: [],
      classification: { label: "OWASP ZAP findings export", confidence: 0.94, basis: "Detected ZAP alerts structure", reviewRecommended: false },
    };
  },
};
