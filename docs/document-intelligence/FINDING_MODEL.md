# Finding Model

Mandatory flow: Scanner Result → Observation → Evidence → Candidate Finding
→ Human Review/Validation → Confirmed Finding.

## FindingCandidate (`src/intelligence/schemas/findings.ts`)

Machine-proposed. Fields: id, canonicalFingerprint
(`asset|endpoint|param|category|cwe|scanner-signature` hash — dedup key),
title, description, affectedAssets, evidenceIds (min 1; zero-evidence
candidates fail validation), severity + severityBasis, optional evidenced
CVSS (`fullyDetermined` flag), CWE/CVE arrays (format-validated), taxonomy
mappings (WSTG/NIST/ATT&CK/CCM), confidence, evidenceLevel, status
(proposed/accepted/rejected/merged/split/unverified), duplicateOf,
contradictions.

Dedup preserves all source records — merging sets `duplicateOf` and unions
evidenceIds; nothing is destroyed.

## ConfirmedFinding

Human-reviewed. Fields: reference (F-001…), affectedAssets (min 1),
description, impact (evidence-grounded; conditional language where the
evidence only demonstrates a condition), evidence (min 1), reproduction,
remediation (min 1; immediate + root-cause + long-term + verification
method where supported), references, confidence, verificationState
(confirmed/unverified/needs-review).

Scanner language ("possible", "potential") must never be upgraded to
"confirmed" without validating evidence.

## AnalysisConflict

kind: scope/severity/remediation_state/version/identity/dates/
asset_naming/engagement_ref. Always cites ≥2 evidenceIds. Resolution:
open/acknowledged/resolved. Shown to the human; never auto-reconciled.
