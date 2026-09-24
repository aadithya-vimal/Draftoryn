// Per-task prompts. Each prompt carries system rules, input/output schema,
// evidence constraints, and failure behavior. No universal mega-prompt.

import { EVIDENCE_GROUNDING_RULES } from "./interface";

export interface TaskPrompt {
  task: string;
  system: string;
  outputSchema: string;
  failureBehavior: string;
}

const BASE_SYSTEM = [
  "You are Draftoryn Report Synthesis, an evidence-grounded security reporting engine.",
  EVIDENCE_GROUNDING_RULES,
].join("\n");

const FINDING_OUTPUT_SCHEMA = JSON.stringify({
  type: "object",
  required: ["title", "severity", "description", "impact", "evidenceIds", "remediation", "confidence", "verificationState"],
  properties: {
    title: { type: "string" },
    severity: { enum: ["critical", "high", "medium", "low", "informational"] },
    description: { type: "string" },
    impact: { type: "string" },
    evidenceIds: { type: "array", items: { type: "string" }, minItems: 1 },
    reproduction: { type: "array", items: { type: "string" } },
    remediation: { type: "array", items: { type: "string" }, minItems: 1 },
    references: { type: "array", items: { type: "string" } },
    confidence: { enum: ["high", "medium", "low"] },
    verificationState: { enum: ["confirmed", "unverified", "needs-review"] },
  },
});

export const PROMPTS: Record<string, TaskPrompt> = {
  finding_normalization: {
    task: "Normalize one finding candidate into a confirmed-finding draft using ONLY the supplied evidence.",
    system: `${BASE_SYSTEM}\nNormalize scanner/analyst language into a professional finding. Preserve severity unless evidence contradicts it; downgrade scanner 'possible' language to needs-review.`,
    outputSchema: FINDING_OUTPUT_SCHEMA,
    failureBehavior: "If evidence is insufficient, return verificationState needs-review and state what is missing. Never invent.",
  },
  executive_summary: {
    task: "Draft a business-readable executive summary from finding counts, severities, and scope.",
    system: `${BASE_SYSTEM}\nAudience: executives. Minimal jargon, risk-oriented, action-oriented. No new facts beyond the supplied statistics.`,
    outputSchema: JSON.stringify({ type: "object", required: ["summary"], properties: { summary: { type: "string" } } }),
    failureBehavior: "If statistics are absent, return 'Insufficient evidence to summarize.'",
  },
  remediation_synthesis: {
    task: "Write specific, actionable remediation for the finding: immediate fix, root-cause fix, long-term prevention, verification method.",
    system: `${BASE_SYSTEM}\nRemediation must be technically realistic for the evidenced vulnerability. Never claim remediation was implemented.`,
    outputSchema: JSON.stringify({ type: "object", required: ["immediate", "rootCause", "longTerm", "verification"], properties: { immediate: { type: "string" }, rootCause: { type: "string" }, longTerm: { type: "string" }, verification: { type: "string" } } }),
    failureBehavior: "If the vulnerability is unclear, return needs-review guidance instead of generic advice.",
  },
  quality_review: {
    task: "Review a generated finding for unsupported claims, missing evidence, and severity consistency.",
    system: `${BASE_SYSTEM}\nReturn each problem with the exact unsupported sentence and the reason.`,
    outputSchema: JSON.stringify({ type: "object", required: ["problems"], properties: { problems: { type: "array", items: { type: "object", required: ["quote", "reason"], properties: { quote: { type: "string" }, reason: { type: "string" } } } } } }),
    failureBehavior: "If the finding cannot be parsed, report a single problem describing the parse failure.",
  },
  section_regeneration: {
    task: "Regenerate exactly one report section. Do not alter other sections or introduce new facts.",
    system: `${BASE_SYSTEM}\nRegenerate ONLY the requested section, citing the same evidence IDs.`,
    outputSchema: JSON.stringify({ type: "object", required: ["body"], properties: { body: { type: "string" } } }),
    failureBehavior: "If the section cannot be regenerated from evidence, return the original body unchanged.",
  },
  conflict_analysis: {
    task: "Explain a detected contradiction and what the reviewer must decide.",
    system: `${BASE_SYSTEM}\nNever reconcile contradictions silently; present both sides with evidence IDs.`,
    outputSchema: JSON.stringify({ type: "object", required: ["explanation", "options"], properties: { explanation: { type: "string" }, options: { type: "array", items: { type: "string" } } } }),
    failureBehavior: "If the conflict record is malformed, ask for human triage.",
  },
};
