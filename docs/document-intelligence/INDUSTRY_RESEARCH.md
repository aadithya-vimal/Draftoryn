# Industry Research — Cybersecurity Document Format & Information Architecture

Research conducted 2026-09-24 from public authoritative sources. Structural
concepts only were extracted; no copyrighted wording or proprietary templates
were copied. Draftoryn claims no compliance with any standard — documents are
structurally *informed* by these sources only.

## 1. NIST SP 800-115 — Technical Guide to Information Security Testing and Assessment

- Source: https://csrc.nist.gov/pubs/sp/800/115/final
- Version: Final, 30 Sep 2008. Checked 2026-09-24.
- Relevant guidance: three-phase methodology (Planning → Execution →
  Post-Execution); assessment plan contents (goals, scope, team roles,
  limitations, assumptions, timeline, deliverables); Rules of Engagement
  template (Appendix B); data handling rules — collect, store, transmit
  securely, destroy when no longer needed; post-execution root-cause analysis
  and tailored reporting (Sec 8).
- Design decisions: `pentest_engagement` modules mirror the assessment-plan
  elements; RoE becomes a module not a document; evidence handling is a
  first-class module; reports separate systemic vs symptomatic findings.

## 2. OWASP Web Security Testing Guide (WSTG) — Reporting

- Source: https://owasp.org/www-project-web-security-testing-guide/stable/5-Reporting/README
- Version: Stable v4.2 (reporting guidance unchanged in latest). Checked 2026-09-24.
- Relevant guidance: three-part report (Executive Summary → Test Parameters →
  Findings); finding anatomy — reference ID, title, likelihood/exploitability
  factors, impact, risk rating, CVSS where required, description, remediation,
  references; appendices (methodology, severity scale, cleaned tool output,
  test checklist); retest subsection summarizing prior-test status; reports
  must serve both executives and engineers; encrypt the report.
- Design decisions: canonical finding schema requires id/title/severity/
  evidence/description/impact/remediation/references; exec/tech/full are
  *views* of one report model; retest is a first-class status set, never
  auto-remediated.

## 3. PTES — Reporting

- Source: http://www.pentest-standard.org/index.php/Reporting (mirror:
  https://pentest-standard.readthedocs.io/en/latest/reporting.html)
- Version: PTES v1.0. Checked 2026-09-24.
- Relevant guidance: two major sections — Executive Summary (background,
  overall posture incl. systemic issues, risk ranking, general findings with
  graphics, recommendation summary, strategic roadmap) and Technical Report
  (personnel/contacts, assets, scope, intel gathering in 4 categories,
  vulnerability assessment split scanner-found vs manual, exploitation
  timeline with per-host success/failure, post-exploitation business impact
  with evidence, countermeasure effectiveness, risk/exposure quantification).
- Design decisions: `pentest_report` modules follow this skeleton;
  scanner-vs-manual distinction enforced in the evidence model
  (Observation → FindingCandidate → ConfirmedFinding); post-exploitation
  impact must cite evidence.

## 4. CREST — Penetration Testing Guide / Programme guidance

- Sources: https://www.crest-approved.org/wp-content/uploads/2023/04/A-Guide-to-Penetration-Testing-2022.pdf?ver
  (Guide to Penetration Testing 2022); Defensible Penetration Test guidance
  (https://www.crest-approved.org/buying-building-cyber-services/implementation-procurement-guides-resources/).
  Checked 2026-09-24.
- Relevant guidance: programme-level governance (assurance framework, KPIs);
  scoping/delivery/sign-off minimums; reports must be structured, practical,
  business-legible, and drive remediation with service providers.
- Design decisions: engagement artifact includes governance-adjacent fields
  (drivers, sign-off); report quality gate checks remediation actionability.

## 5. FIRST — CVSS v4.0

- Source: https://www.first.org/cvss/v4.0/specification-document
- Version: v4.0, released 1 Nov 2023. Checked 2026-09-24.
- Relevant guidance: metric groups Base / Threat / Environmental /
  Supplemental; Base measures severity, not risk; qualitative scale
  None 0.0 / Low 0.1–3.9 / Medium 4.0–6.9 / High 7.0–8.9 / Critical 9.0–10.0.
- Design decisions: CVSS stored as version+vector+score, calculated only when
  metrics are evidenced; otherwise "CVSS not fully determined"; severity and
  CVSS kept as separate fields (severity may be analyst-assigned).

## 6. NIST SP 800-61 Rev. 3 — Incident Response (CSF 2.0 Community Profile)

- Source: https://csrc.nist.gov/pubs/sp/800/61/r3/final
- Version: Final, 3 Apr 2025 (supersedes Rev. 2). Checked 2026-09-24.
- Relevant guidance: life cycle reframed on CSF 2.0 functions
  (Govern/Identify/Protect prepare; Detect/Respond/Recover execute;
  continuous Improvement loop); IR policy contents; lessons-learned feeding
  improvement.
- Design decisions: `ir_plan` modules use the four response phases plus
  playbook module; `lessons_learned` is a standalone canonical doc feeding
  corrective actions with owners.

## 7. NIST SP 800-86 — Integrating Forensic Techniques into Incident Response

- Source: https://csrc.nist.gov/pubs/sp/800/86/final (Final). Checked 2026-09-24.
- Relevant guidance: forensic process (collection → examination → analysis →
  reporting); chain of custody; tool validation and hashing.
- Design decisions: `forensic_report` modules (custody, acquisition,
  analysis, timeline, opinion); malware analysis absorbed as a variant.

## 8. ISO/IEC 29147 / 30111 (public overviews)

- Sources: https://www.iso.org/standard/72311.html (29147:2018),
  https://www.iso.org/standard/69725.html (30111:2019). Checked 2026-09-24.
- Relevant guidance: vulnerability disclosure intake, triage, remediation,
  and coordinated handling workflows.
- Design decisions: `disclosure_policy` modules (scope, channels, handling
  SLAs, safe harbor); full standards text not reproduced.

## 9. CSA Cloud Controls Matrix v4.1

- Source: https://cloudsecurityalliance.org/research/cloud-controls-matrix/
  Checked 2026-09-24.
- Relevant guidance: cloud control domains (IAM, DSI, IVS, LOG, etc.).
- Design decisions: `cloud_assessment_report` modules align to IAM/network/
  data/workload/logging; findings carry optional CCM references.

## 10. NIST CSF 2.0

- Source: https://www.nist.gov/cyberframework (v2.0, Feb 2024). Checked 2026-09-24.
- Relevant guidance: six Functions Govern/Identify/Protect/Detect/Respond/
  Recover; Community Profiles for scoping.
- Design decisions: `security_assessment_report` framework variant maps
  findings to CSF functions; UI wording is "Mapped to", never "Compliant".

## 11. Consultancy report conventions (public guidance, not proprietary text)

- Sources: PCI SSC Penetration Testing Guidance v1.1
  (https://listings.pcisecuritystandards.org/documents/Penetration-Testing-Guidance-v1_1.pdf);
  SANS/industry report-writing guidance referenced from WSTG reading lists.
- Extracted patterns: document control block; scope/methodology/limitations
  up front; severity distribution charts; per-finding evidence and
  reproduction; remediation roadmap with effort levels; retest appendix.
- Design decisions: report schema sections follow this order; structured
  JSON/XML/YAML exports carry findings/assets/evidence/standardsMappings
  as semantic objects, not prose blobs.
