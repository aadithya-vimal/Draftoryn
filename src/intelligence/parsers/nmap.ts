// Nmap XML parser. Deterministic: hosts/ports sorted by address+port.

import { assertSafeXml, xmlHead, type Parser, type ParseResult } from "./types";
import { MAX_RECORDS_PER_FILE, MAX_TEXT_CHARS } from "../ingestion/identify";
import { truncate } from "../utils";

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"));
  return m?.[1];
}

export const nmapParser: Parser = {
  id: "nmap",
  version: "1.0.0",
  canHandle: (input) => xmlHead(input.text).includes("<nmaprun"),
  parse: (input): ParseResult => {
    assertSafeXml(input.text, MAX_TEXT_CHARS);
    const text = input.text;
    const hostBlocks = text.match(/<host[\s>][\s\S]*?<\/host>/gi) ?? [];
    const evidence: ParseResult["evidence"] = [];
    const assets: ParseResult["assets"] = [];
    const observations: ParseResult["observations"] = [];
    const seen = new Set<string>();

    hostBlocks.slice(0, MAX_RECORDS_PER_FILE).forEach((block, hi) => {
      const addrTag = block.match(/<address[^>]*>/i)?.[0] ?? "";
      const ip = attr(addrTag, "addr") ?? `host[${hi}]`;
      const hostname = block.match(/<hostname[^>]*name\s*=\s*"([^"]*)"/i)?.[1];
      const status = block.match(/<status[^>]*state\s*=\s*"([^"]*)"/i)?.[1] ?? "unknown";
      const os = block.match(/<osmatch[^>]*name\s*=\s*"([^"]*)"/i)?.[1];
      const canon = hostname ?? ip;
      if (!seen.has(canon)) {
        seen.add(canon);
        assets.push({ canonicalIdentifier: canon, type: /^\d+\.\d+\.\d+\.\d+$/.test(ip) ? "ip" : "host", hostname, ip: /^\d/.test(ip) ? ip : undefined, environment: "unknown" });
      }
      const portBlocks = block.match(/<port[\s>][\s\S]*?<\/port>/gi) ?? [];
      portBlocks.forEach((pb, pi) => {
        const openTag = pb.match(/<port[^>]*>/i)?.[0] ?? "";
        const portid = attr(openTag, "portid") ?? "?";
        const proto = attr(openTag, "protocol") ?? "tcp";
        const state = pb.match(/<state[^>]*state\s*=\s*"([^"]*)"/i)?.[1] ?? "unknown";
        const svcTag = pb.match(/<service[^>]*>/i)?.[0] ?? "";
        const svc = attr(svcTag, "name") ?? "unknown";
        const product = attr(svcTag, "product");
        const version = attr(svcTag, "version");
        if (state !== "open") return;
        const banner = [svc, product, version].filter(Boolean).join(" ");
        evidence.push({
          evidenceType: "open_port",
          title: `${ip}:${portid}/${proto} open (${svc})`,
          content: truncate(`Host ${ip}${hostname ? ` (${hostname})` : ""} status=${status}${os ? ` os=${os}` : ""}: ${portid}/${proto} open ${banner}`, 2000),
          structuredData: { ip, hostname: hostname ?? null, port: portid, protocol: proto, state, service: svc, product: product ?? null, version: version ?? null, os: os ?? null },
          sourceLocation: `host[${hi}]/port[${pi}]`,
          confidence: "high",
          evidenceLevel: "L1_observed",
        });
        observations.push({
          category: "service_exposure",
          description: `Open service ${banner} on ${ip}:${portid}`,
          observedValue: `${portid}/${proto}`,
          assetRef: canon,
          confidence: "high",
        });
      });
    });

    evidence.sort((a, b) => a.title.localeCompare(b.title));
    return {
      artifactType: "nmap_xml",
      evidence,
      assets,
      observations,
      warnings: hostBlocks.length > MAX_RECORDS_PER_FILE ? [`Truncated to ${MAX_RECORDS_PER_FILE} hosts.`] : [],
      classification: { label: "Nmap scan results", confidence: 0.99, basis: "Detected canonical Nmap XML structure", reviewRecommended: false },
    };
  },
};
