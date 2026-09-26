// Legacy -> canonical mapping. Every previous definition classified.
// KEEP = stays as canonical alias target; MERGE = absorbed; CONVERT TO MODULE;
// RENAME = canonical rename; DEPRECATE = alias retained; REMOVE = none (no data loss).

export type MigrationAction = "KEEP" | "MERGE" | "CONVERT_TO_MODULE" | "RENAME" | "DEPRECATE" | "REMOVE";

export interface MigrationRow {
  legacyId: string;
  legacyName: string;
  action: MigrationAction;
  canonicalId: string;
  note: string;
}

export const CATALOG_MIGRATION: MigrationRow[] = [
  { legacyId: "roe", legacyName: "Rules of Engagement (RoE)", action: "CONVERT_TO_MODULE", canonicalId: "pentest_engagement", note: "Becomes roe module of pentest_engagement" },
  { legacyId: "pentest_agreement", legacyName: "Penetration Testing Agreement / Authorization", action: "MERGE", canonicalId: "pentest_engagement", note: "Authorization module; jurisdiction/confidentiality preserved as inputs" },
  { legacyId: "pentest_plan", legacyName: "Penetration Testing Plan", action: "MERGE", canonicalId: "pentest_engagement", note: "Windows/phases/logistics become modules" },
  { legacyId: "pentest_report", legacyName: "Penetration Testing Report", action: "KEEP", canonicalId: "pentest_report", note: "Canonical report; exec/tech/full are views" },
  { legacyId: "redteam_report", legacyName: "Red Team Assessment Report", action: "KEEP", canonicalId: "redteam_report", note: "Keeps ATT&CK + detection modules" },
  { legacyId: "va_report", legacyName: "Vulnerability Assessment Report", action: "KEEP", canonicalId: "vuln_assessment_report", note: "Scanner output treated as observation" },
  { legacyId: "sec_assessment_report", legacyName: "Security Assessment Report", action: "MERGE", canonicalId: "security_assessment_report", note: "Merges with cyber_risk + third-party into framework report with variants" },
  { legacyId: "ir_plan", legacyName: "Incident Response Plan", action: "KEEP", canonicalId: "ir_plan", note: "Playbook becomes module" },
  { legacyId: "ir_playbook", legacyName: "Incident Response Playbook", action: "CONVERT_TO_MODULE", canonicalId: "ir_plan", note: "Scenario playbook module" },
  { legacyId: "incident_report", legacyName: "Incident Report", action: "KEEP", canonicalId: "incident_report", note: "Unchanged canonical" },
  { legacyId: "forensics_report", legacyName: "Digital Forensics Report", action: "KEEP", canonicalId: "forensic_report", note: "Chain-of-custody appendix retained" },
  { legacyId: "malware_report", legacyName: "Malware Analysis Report", action: "CONVERT_TO_MODULE", canonicalId: "forensic_report", note: "Malware variant/appendix" },
  { legacyId: "lessons_learned_report", legacyName: "Post-Incident / Lessons Learned Report", action: "RENAME", canonicalId: "lessons_learned", note: "Shortened canonical id" },
  { legacyId: "threat_intel_report", legacyName: "Threat Intelligence Report", action: "MERGE", canonicalId: "threat_model", note: "Intel/campaign/actor become threat_model assessment variant inputs" },
  { legacyId: "threat_actor_profile", legacyName: "Threat Actor Profile", action: "MERGE", canonicalId: "threat_model", note: "Actor dossier becomes assessment input module" },
  { legacyId: "threat_assessment_report", legacyName: "Threat Assessment Report", action: "MERGE", canonicalId: "threat_model", note: "Assessment variant" },
  { legacyId: "campaign_analysis_report", legacyName: "Campaign Analysis Report", action: "MERGE", canonicalId: "threat_model", note: "Campaign module" },
  { legacyId: "threat_model", legacyName: "Threat Model", action: "KEEP", canonicalId: "threat_model", note: "Canonical STRIDE model" },
  { legacyId: "sec_arch_doc", legacyName: "Security Architecture Document", action: "MERGE", canonicalId: "arch_review", note: "Merged with design review" },
  { legacyId: "sec_design_review", legacyName: "Security Design Review", action: "MERGE", canonicalId: "arch_review", note: "Design-review modules" },
  { legacyId: "cloud_sec_assessment", legacyName: "Cloud Security Assessment", action: "KEEP", canonicalId: "cloud_assessment_report", note: "CCM/CIS mapped" },
  { legacyId: "app_sec_assessment", legacyName: "Application Security Assessment", action: "MERGE", canonicalId: "cloud_assessment_report", note: "App variant of cloud/app assessment" },
  { legacyId: "cyber_risk_assessment", legacyName: "Cybersecurity Risk Assessment", action: "MERGE", canonicalId: "security_assessment_report", note: "Framework variant" },
  { legacyId: "risk_register", legacyName: "Risk Register", action: "CONVERT_TO_MODULE", canonicalId: "sec_requirements", note: "Governance annex module" },
  { legacyId: "third_party_sec_assessment", legacyName: "Third-Party Security Assessment", action: "MERGE", canonicalId: "security_assessment_report", note: "Vendor variant" },
  { legacyId: "sec_exception_waiver", legacyName: "Security Exception / Risk Acceptance", action: "CONVERT_TO_MODULE", canonicalId: "sec_requirements", note: "Governance annex" },
  { legacyId: "bia_report", legacyName: "Business Impact Analysis (BIA)", action: "CONVERT_TO_MODULE", canonicalId: "sec_requirements", note: "Governance annex (RTO/RPO)" },
  { legacyId: "bcp_plan", legacyName: "Business Continuity Plan (BCP)", action: "CONVERT_TO_MODULE", canonicalId: "sec_requirements", note: "Governance annex" },
  { legacyId: "drp_plan", legacyName: "Disaster Recovery Plan (DRP)", action: "CONVERT_TO_MODULE", canonicalId: "sec_requirements", note: "Governance annex" },
  { legacyId: "cyber_recovery_plan", legacyName: "Cyber Recovery Plan", action: "CONVERT_TO_MODULE", canonicalId: "sec_requirements", note: "Governance annex" },
];

export function migrateLegacyId(legacyId: string): string {
  return CATALOG_MIGRATION.find((r) => r.legacyId === legacyId)?.canonicalId ?? legacyId;
}
