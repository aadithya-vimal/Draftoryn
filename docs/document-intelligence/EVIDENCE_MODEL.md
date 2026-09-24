# Evidence Model

Core pipeline types (`src/intelligence/schemas/evidence.ts`). All stages
validate through zod — no untyped JSON in the core model.

## SourceArtifact

Uploaded file identity: id, filename, mediaType (verified, not just
extension), size, sha256 checksum, artifactType (registry enum), parser +
parserVersion, uploadedAt, status (queued/parsing/parsed/failed).

## EvidenceItem

One extracted fact: sourceArtifactId + sourceLocation (JSON path / line /
record / page), evidenceType (open_port, scanner_finding, scope_statement,
screenshot, …), title, content (bounded 20k chars), structuredData,
confidence, sensitivity, redactionState (original/redacted), evidenceLevel
(L1 observed … L4 inference).

## Asset

Canonicalized target: canonicalIdentifier (normalized host/IP/URL),
typed fields, ownership (in_scope/out_of_scope/unknown), sourceEvidenceIds.

## Observation

Scanner output lands here — category scanner_result etc., validated=false
by default. A scanner result NEVER becomes a confirmed vulnerability
without human review.

## TestActivity

Methodology/testCaseId/objective/result + evidence links (WSTG coverage,
retest checks).

See FINDING_MODEL.md and REPORT_MODEL.md for downstream stages.
