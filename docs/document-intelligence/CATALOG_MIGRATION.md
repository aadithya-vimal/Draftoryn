# Catalog Migration — Legacy → Canonical

30 legacy definitions → 18 canonical documents across 12 families.
Old documents keep opening/editing/exporting: `migrateLegacyId()` maps every
legacy id to its canonical successor, and `resolveLegacyDefinition()` selects
the generation base used by the deterministic engine.

| Legacy id | Legacy name | Action | Canonical id |
|---|---|---|---|
| roe | Rules of Engagement (RoE) | CONVERT TO MODULE | pentest_engagement |
| pentest_agreement | Penetration Testing Agreement / Authorization | MERGE | pentest_engagement |
| pentest_plan | Penetration Testing Plan | MERGE | pentest_engagement |
| pentest_report | Penetration Testing Report | KEEP | pentest_report |
| redteam_report | Red Team Assessment Report | KEEP | redteam_report |
| va_report | Vulnerability Assessment Report | KEEP | vuln_assessment_report |
| sec_assessment_report | Security Assessment Report | MERGE | security_assessment_report |
| ir_plan | Incident Response Plan | KEEP | ir_plan |
| ir_playbook | Incident Response Playbook | CONVERT TO MODULE | ir_plan |
| incident_report | Incident Report | KEEP | incident_report |
| forensics_report | Digital Forensics Report | KEEP | forensic_report |
| malware_report | Malware Analysis Report | CONVERT TO MODULE | forensic_report |
| lessons_learned_report | Post-Incident / Lessons Learned Report | RENAME | lessons_learned |
| threat_intel_report | Threat Intelligence Report | MERGE | threat_model |
| threat_actor_profile | Threat Actor Profile | MERGE | threat_model |
| threat_assessment_report | Threat Assessment Report | MERGE | threat_model |
| campaign_analysis_report | Campaign Analysis Report | MERGE | threat_model |
| threat_model | Threat Model | KEEP | threat_model |
| sec_arch_doc | Security Architecture Document | MERGE | arch_review |
| sec_design_review | Security Design Review | MERGE | arch_review |
| cloud_sec_assessment | Cloud Security Assessment | KEEP | cloud_assessment_report |
| app_sec_assessment | Application Security Assessment | MERGE | cloud_assessment_report |
| cyber_risk_assessment | Cybersecurity Risk Assessment | MERGE | security_assessment_report |
| risk_register | Risk Register | CONVERT TO MODULE | sec_requirements |
| third_party_sec_assessment | Third-Party Security Assessment | MERGE | security_assessment_report |
| sec_exception_waiver | Security Exception / Risk Acceptance | CONVERT TO MODULE | sec_requirements |
| bia_report | Business Impact Analysis (BIA) | CONVERT TO MODULE | sec_requirements |
| bcp_plan | Business Continuity Plan (BCP) | CONVERT TO MODULE | sec_requirements |
| drp_plan | Disaster Recovery Plan (DRP) | CONVERT TO MODULE | sec_requirements |
| cyber_recovery_plan | Cyber Recovery Plan | CONVERT TO MODULE | sec_requirements |

New canonical documents with no legacy predecessor: `pentest_retest`,
`redteam_engagement`, `vuln_assessment_definition`, `disclosure_policy`,
`bug_bounty_policy`.
