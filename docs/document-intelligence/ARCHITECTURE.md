# Architecture — Document Intelligence Platform

Two equal capabilities on one canonical model:

- GENERATION: canonical doc → structured inputs → deterministic Draftoryn
  document (existing engine, bridged via
  `src/engine/catalog/registry.ts` → legacy definitions).
- INTELLIGENCE: artifacts → parsers → normalized evidence graph →
  correlation/dedup → conflicts/completeness → human review → confirmed
  findings → evidence-grounded report → quality gate → exports.

## Pipeline modules (`src/intelligence/`)

- `schemas/` — zod core model (SourceArtifact, EvidenceItem, Asset,
  Observation, TestActivity, FindingCandidate, ConfirmedFinding,
  AnalysisConflict, IntelligenceReport).
- `ingestion/` — limits + magic-byte media identification.
- `parsers/` — registry + nmap/nessus/nuclei/zap/burp/sarif/generic.
- `analysis/` — normalize → correlate/dedup → conflicts → completeness →
  redact; `analyzeArtifacts()` entrypoint (pure, deterministic).
- `review/` — human-in-the-loop actions + confirmation (mandatory
  remediation/impact).
- `quality/` — quality gate (SUPPORTED/UNSUPPORTED/MISSING/UNVERIFIED).
- `standards/` — CVSS validation + cached NVD abstraction; catalog
  keyword mappings in `src/engine/catalog/standards.ts`.
- `retest/` — fuzzy document compare + retest verdicts (never
  auto-remediate).
- `ai/` — provider interface, per-task prompts, scoped context selection.
- `reporting/` — deterministic synthesis + view projections.
- `storage/` + `jobs/` — server-side persistence and async job model
  (see SECURITY_MODEL.md).

## Data flow

UPLOAD → IDENTIFY → VERIFY → EXTRACT → PARSE → CLASSIFY → NORMALIZE →
EVIDENCE → ASSETS/OBSERVATIONS → CANDIDATES → DEDUP → ENRICH → CONFLICTS →
COMPLETENESS → REVIEW → SYNTHESIZE → VALIDATE → EXPORT.

Deterministic stages run before any LLM call; the LLM refines
evidence-scoped sections only. AI is optional — reports build fully
without it.

## Tenancy & trust

Every server row is owner-scoped (`owner_id = auth user`); no owner_id
from clients. Uploads are high-sensitivity: checksums, type verification,
size caps, no public access, redaction with originals preserved, no
secret/content logging. See SECURITY_MODEL.md.
