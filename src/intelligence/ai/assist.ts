// Server-side AI synthesis assist. Returns human-reviewable DRAFTS —
// nothing is auto-confirmed, auto-saved, or presented as fact.

import { cleanAndParseJson, executeAiCall, type AiProviderType } from "../../engine/ai/providers";
import { getPrompt } from "./prompts";
import { selectFindingContext, selectReportContext } from "./context";
import type { AnalysisGraph } from "../analysis/graph";

export interface AssistCredentials {
  provider: AiProviderType;
  model: string;
  apiKey: string;
}

export type AiTransport = (opts: {
  provider: AiProviderType;
  model: string;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  schema: string;
  temperature?: number;
}) => Promise<string>;

export interface FindingDraft {
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "informational";
  description: string;
  impact: string;
  evidenceIds: string[];
  reproduction: string[];
  remediation: string[];
  references: string[];
  confidence: "high" | "medium" | "low";
  verificationState: "confirmed" | "unverified" | "needs-review";
}

const SEVS = ["critical", "high", "medium", "low", "informational"] as const;

export async function assistFinding(
  graph: AnalysisGraph,
  candidateId: string,
  creds: AssistCredentials,
  call: AiTransport = executeAiCall,
): Promise<FindingDraft> {
  const ctx = selectFindingContext(graph, candidateId);
  const p = getPrompt("finding_normalization");
  const raw = await call({
    provider: creds.provider,
    model: creds.model,
    apiKey: creds.apiKey,
    systemPrompt: p.system,
    userPrompt: `Normalize this candidate. ${ctx.envelope}\n\nFailure behavior: ${p.failureBehavior}`,
    schema: p.outputSchema,
    temperature: 0.15,
  });
  const parsed = cleanAndParseJson<Record<string, unknown>>(raw);
  const evidenceIds = (Array.isArray(parsed["evidenceIds"]) ? (parsed["evidenceIds"] as unknown[]) : []).map(String).filter((e) => ctx.evidenceIds.includes(e));
  if (evidenceIds.length === 0) throw new Error("AI draft cites no valid evidence IDs — rejected.");
  const remediation = (Array.isArray(parsed["remediation"]) ? (parsed["remediation"] as unknown[]) : []).map(String).filter((s) => s.trim());
  if (remediation.length === 0) throw new Error("AI draft lacks remediation — rejected.");
  const sev = String(parsed["severity"] ?? ctx.candidate.severity);
  return {
    title: String(parsed["title"] ?? ctx.candidate.title).slice(0, 300),
    severity: (SEVS as readonly string[]).includes(sev) ? (sev as FindingDraft["severity"]) : ctx.candidate.severity,
    description: String(parsed["description"] ?? "").slice(0, 10000),
    impact: String(parsed["impact"] ?? "").slice(0, 5000),
    evidenceIds,
    reproduction: (Array.isArray(parsed["reproduction"]) ? (parsed["reproduction"] as unknown[]) : []).map(String).slice(0, 50),
    remediation: remediation.slice(0, 50),
    references: (Array.isArray(parsed["references"]) ? (parsed["references"] as unknown[]) : []).map(String).slice(0, 50),
    confidence: parsed["confidence"] === "high" || parsed["confidence"] === "low" ? parsed["confidence"] : "medium",
    verificationState: parsed["verificationState"] === "confirmed" || parsed["verificationState"] === "unverified" ? parsed["verificationState"] : "needs-review",
  };
}

export async function draftExecutiveSummary(
  graph: AnalysisGraph,
  creds: AssistCredentials,
  call: AiTransport = executeAiCall,
): Promise<string> {
  const p = getPrompt("executive_summary");
  const raw = await call({
    provider: creds.provider,
    model: creds.model,
    apiKey: creds.apiKey,
    systemPrompt: p.system,
    userPrompt: `Draft the executive summary from these statistics only.\n${selectReportContext(graph)}\n\nFailure behavior: ${p.failureBehavior}`,
    schema: p.outputSchema,
    temperature: 0.2,
  });
  const parsed = cleanAndParseJson<Record<string, unknown>>(raw);
  const summary = String(parsed["summary"] ?? "").trim().slice(0, 8000);
  if (!summary) throw new Error("AI summary draft empty — rejected.");
  return summary;
}
