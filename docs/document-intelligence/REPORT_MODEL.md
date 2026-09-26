# Report Model

One canonical `IntelligenceReport` (`src/intelligence/schemas/reports.ts`,
schemaVersion 1.0.0). Executive/technical/full/remediation/retest are
projections — never separate engines.

Fields: id, type (canonical report id), sourceAnalysisId, status
(draft/in_review/validated/exported), generatedAt, engagement block
(client/assessmentName/scope/methodology), findings (ConfirmedFinding[]),
sections, provenance refs, qualityScore + qualityFailures, version +
supersedes chain (history preserved, never overwritten).

Sections: id/title/optional flag/body/evidenceIds/view
(executive/technical/shared/appendix). Optional sections with no supporting
evidence are omitted from output rather than filled with invented content.

Pen-test report section order follows researched professional structure:
document control → executive summary → assessment overview/objectives →
scope/exclusions → methodology/limitations → timeline → risk profile →
findings summary + severity distribution → detailed findings (per-finding
anatomy with evidence/reproduction/impact/remediation) → attack narrative
→ remediation roadmap → appendices (evidence index, methodology mapping).
