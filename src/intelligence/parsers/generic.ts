// Generic fallback parser: CSV, JSON, YAML (safe), TXT/LOG/MD, generic XML,
// plus heuristic shapes for Nikto / ffuf / Gobuster / OpenVAS CSV.
// Never throws on malformed input — returns warnings + reviewRecommended.

import yaml from "js-yaml";
import { assertSafeXml, type Parser, type ParseResult, type RawEvidence } from "./types";
import { MAX_EVIDENCE_PER_FILE, MAX_RECORDS_PER_FILE, MAX_TEXT_CHARS } from "../ingestion/identify";
import { truncate } from "../utils";

const CHUNK = 4000;

function chunkText(text: string, loc: string, kind: RawEvidence["evidenceType"]): RawEvidence[] {
  const out: RawEvidence[] = [];
  for (let i = 0; i < text.length && out.length < 50; i += CHUNK) {
    out.push({
      evidenceType: kind,
      title: `Excerpt ${out.length + 1}`,
      content: text.slice(i, i + CHUNK),
      structuredData: { chunk: out.length, totalChars: text.length },
      sourceLocation: `${loc}#chunk[${out.length}]`,
      confidence: "medium",
      evidenceLevel: "L1_observed",
    });
  }
  return out;
}

export function scopeStatements(text: string): RawEvidence[] {
  const lines = text.split("\n");
  const out: RawEvidence[] = [];
  lines.forEach((line, i) => {
    const l = line.trim();
    if (l.length < 4 || l.length > 500) return;
    if (/(in[\s_-]?scope|out[\s_-]?of[\s_-]?scope|exclu(sion|ded)|target\s*:)/i.test(l)) {
      out.push({
        evidenceType: "scope_statement",
        title: `Scope statement (line ${i + 1})`,
        content: truncate(l, 500),
        structuredData: { line: i + 1 },
        sourceLocation: `line[${i + 1}]`,
        confidence: "medium",
        evidenceLevel: "L2_derived",
      });
    }
  });
  return out.slice(0, 200);
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let cur = "";
  let row: string[] = [];
  let quoted = false;
  const push = () => { row.push(cur); cur = ""; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") push();
    else if (c === "\n") { push(); rows.push(row); row = []; }
    else if (c === "\r") { /* skip */ }
    else cur += c;
  }
  push();
  if (row.length > 1 || (row.length === 1 && row[0]!.trim())) rows.push(row);
  const headers = (rows.shift() ?? []).map((h) => h.trim());
  return { headers, rows: rows.filter((r) => r.some((c) => c.trim())) };
}

function niktoShape(v: unknown): boolean {
  return Array.isArray(v) && v.length > 0 && typeof v[0] === "object" && v[0] !== null && "vulnerabilities" in (v[0] as object);
}

export const genericParser: Parser = {
  id: "generic",
  version: "1.0.0",
  canHandle: () => true,
  parse: (input): ParseResult => {
    const warnings: string[] = [];
    const evidence: RawEvidence[] = [];
    const observations: ParseResult["observations"] = [];
    const assets: ParseResult["assets"] = [];
    const ext = (input.filename.toLowerCase().match(/\.([a-z0-9]{1,5})$/)?.[1]) ?? "";
    const text = input.text.length > MAX_TEXT_CHARS ? input.text.slice(0, MAX_TEXT_CHARS) : input.text;
    if (input.text.length > MAX_TEXT_CHARS) warnings.push("Input truncated to 2M chars.");

    let label = "Text/log document";
    let confidence = 0.55;
    let artifactType: ParseResult["artifactType"] = "txt";

    try {
      if (ext === "csv" || (text.includes(",") && text.split("\n")[0]!.split(",").length >= 2 && !text.trimStart().startsWith("{"))) {
        const { headers, rows } = parseCsv(text);
        label = "CSV data extract";
        artifactType = "csv";
        confidence = 0.7;
        rows.slice(0, Math.min(rows.length, MAX_EVIDENCE_PER_FILE)).forEach((r, i) => {
          const obj: Record<string, unknown> = {};
          headers.forEach((h, hi) => { obj[h || `col${hi}`] = r[hi] ?? ""; });
          evidence.push({
            evidenceType: "document_section",
            title: `CSV row ${i + 1}`,
            content: truncate(headers.map((h, hi) => `${h || hi}: ${r[hi] ?? ""}`).join(" | "), 1000),
            structuredData: obj,
            sourceLocation: `row[${i + 1}]`,
            confidence: "medium",
            evidenceLevel: "L1_observed",
          });
        });
        if (rows.length > MAX_EVIDENCE_PER_FILE) warnings.push(`CSV truncated to ${MAX_EVIDENCE_PER_FILE} rows.`);
      } else if (ext === "yaml" || ext === "yml") {
        const data = yaml.load(text, { schema: yaml.JSON_SCHEMA }) as unknown;
        label = "YAML document";
        artifactType = "yaml";
        confidence = 0.7;
        evidence.push({ evidenceType: "document_section", title: "YAML content summary", content: truncate(JSON.stringify(data, null, 1).slice(0, CHUNK), CHUNK), structuredData: { topKeys: data && typeof data === "object" ? Object.keys(data).slice(0, 50) : [] }, sourceLocation: "document", confidence: "medium", evidenceLevel: "L1_observed" });
      } else if (text.trimStart().startsWith("{") || text.trimStart().startsWith("[")) {
        const data: unknown = JSON.parse(text);
        if (niktoShape(data)) {
          label = "Nikto scan output";
          artifactType = "nikto_json";
          confidence = 0.9;
          for (const entry of (data as Array<Record<string, unknown>>).slice(0, MAX_RECORDS_PER_FILE)) {
            const host = String(entry["host"] ?? "");
            const vulns = (entry["vulnerabilities"] ?? []) as Array<Record<string, unknown>>;
            for (const v of vulns.slice(0, 200)) {
              evidence.push({
                evidenceType: "scanner_finding",
                title: `Nikto: ${String(v["msg"] ?? "finding").slice(0, 200)} (${host})`,
                content: truncate(`Nikto finding on ${host}:${String(entry["port"] ?? "")} — ${String(v["msg"] ?? "")} [id=${String(v["id"] ?? "")}]`, 2000),
                structuredData: { host, port: entry["port"] ?? null, niktoId: v["id"] ?? null, msg: v["msg"] ?? null, scanner: "nikto" },
                sourceLocation: `host[${host}]`,
                confidence: "medium",
                evidenceLevel: "L1_observed",
              });
            }
          }
        } else if (data && typeof data === "object" && "results" in (data as object) && Array.isArray((data as Record<string, unknown>)["results"])) {
          label = "ffuf fuzzing output";
          artifactType = "ffuf_json";
          confidence = 0.9;
          const results = (data as Record<string, unknown>)["results"] as Array<Record<string, unknown>>;
          for (const r of results.slice(0, MAX_RECORDS_PER_FILE)) {
            evidence.push({
              evidenceType: "scanner_finding",
              title: `ffuf: [${String(r["status"] ?? "?")}] ${String(r["url"] ?? r["input"] ?? "result")}`,
              content: truncate(`ffuf result url=${String(r["url"] ?? "")} status=${String(r["status"] ?? "")} length=${String(r["length"] ?? "")} words=${String(r["words"] ?? "")}`, 1000),
              structuredData: { url: r["url"] ?? null, status: r["status"] ?? null, length: r["length"] ?? null, scanner: "ffuf" },
              sourceLocation: "results[]",
              confidence: "medium",
              evidenceLevel: "L1_observed",
            });
          }
        } else {
          label = "JSON document";
          artifactType = ext === "jsonl" ? "jsonl" : "json";
          confidence = 0.65;
          const keys = data && typeof data === "object" ? Object.keys(data).slice(0, 100) : [];
          evidence.push({ evidenceType: "document_section", title: "JSON content summary", content: truncate(JSON.stringify(data, null, 1).slice(0, CHUNK), CHUNK), structuredData: { topKeys: keys }, sourceLocation: "document", confidence: "medium", evidenceLevel: "L1_observed" });
        }
      } else if (text.trimStart().startsWith("<")) {
        assertSafeXml(text, MAX_TEXT_CHARS);
        label = "XML document";
        artifactType = "xml_generic";
        confidence = 0.6;
        const tags = [...text.matchAll(/<([a-zA-Z][\w:.-]*)/g)].map((m) => m[1]!).slice(0, 500);
        evidence.push({ evidenceType: "document_section", title: "XML content summary", content: truncate(text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, CHUNK), CHUNK), structuredData: { distinctTags: [...new Set(tags)].slice(0, 100) }, sourceLocation: "document", confidence: "low", evidenceLevel: "L1_observed" });
      } else {
        artifactType = ext === "md" ? "markdown" : ext === "log" ? "log" : "txt";
        evidence.push(...chunkText(text, "document", ext === "log" ? "log_excerpt" : "manual_observation"));
        const scope = scopeStatements(text);
        evidence.push(...scope);
        if (/pentest|penetration|vulnerability|assessment|finding|poc|reproduc/i.test(text)) {
          label = "Penetration-test notes";
          confidence = 0.64;
        }
        observations.push(...scope.slice(0, 50).map((s) => ({ category: "scope_fact" as const, description: s.content, confidence: "medium" as const })));
      }
    } catch (e) {
      warnings.push(`Generic parse degraded: ${e instanceof Error ? e.message : String(e)}`);
    }

    return {
      artifactType,
      evidence,
      assets,
      observations,
      warnings,
      classification: { label, confidence, basis: "generic content-shape heuristics", reviewRecommended: confidence < 0.8 },
    };
  },
};
