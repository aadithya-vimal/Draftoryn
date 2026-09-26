# AI Grounding & Safety

## Evidence hierarchy (§14)

- L1 observed / L2 derived: may be stated as facts.
- L3 interpretation: labelled as interpretation.
- L4 inference: never a confirmed finding; insufficient evidence yields
  "Insufficient evidence to establish this finding."

## Context selection (`src/intelligence/ai/context.ts`)

The LLM receives normalized slices: per-finding evidence envelopes
(`selectFindingContext`, max 8 records × 3k chars) and aggregate
statistics (`selectReportContext`). Raw artifacts are never dumped into
prompts. Every envelope carries provenance IDs.

## Prompt-injection defense (`src/intelligence/ai/interface.ts`)

Uploaded files are untrusted. All evidence is wrapped in
`<<<UNTRUSTED-EVIDENCE>>>` markers declaring it DATA, never instructions.
System/application rules always outrank user instructions, which outrank
uploaded content. Prompts (`src/intelligence/ai/prompts.ts`) repeat the
grounding rules per task: finding_normalization, executive_summary,
remediation_synthesis, quality_review, section_regeneration,
conflict_analysis.

## Schema-first generation

LLM output is structured JSON validated against zod schemas, then
provenance-checked (every evidence ID must resolve), severity-checked,
and placeholder-scanned by the quality gate. Zero-evidence findings
FAIL validation. Malformed output is rejected, never rendered.

## Hallucination controls

Forbidden inventions: vulnerabilities, evidence, screenshots, assets,
IPs/domains, credentials, attack success, severity, CVSS vectors, CVEs,
CWEs, dates, tester actions, remediation validation, business impact,
authorization, scope, windows. Business impact uses conditional language
grounded in the demonstrated condition. Remediation is specific and
actionable; implementation is never claimed without evidence.
