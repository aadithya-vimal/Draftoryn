// Canonical document model for Draftoryn Document Intelligence Platform.
// Distinguishes FAMILY -> CANONICAL TYPE -> VARIANT -> MODULES -> OUTPUT FORMATS.
// Platform-agnostic, no React Native imports.

export type DocumentFamily =
  | "penetration_testing"
  | "red_team"
  | "vulnerability_assessment"
  | "security_assessment"
  | "cloud_security"
  | "security_architecture"
  | "threat_modeling"
  | "digital_forensics"
  | "incident_response"
  | "vulnerability_disclosure"
  | "bug_bounty"
  | "secure_development";

export const FAMILY_LABELS: Record<DocumentFamily, string> = {
  penetration_testing: "Penetration Testing",
  red_team: "Red Team / Adversary Emulation",
  vulnerability_assessment: "Vulnerability Assessment",
  security_assessment: "Security Assessment",
  cloud_security: "Cloud Security",
  security_architecture: "Security Architecture",
  threat_modeling: "Threat Modeling",
  digital_forensics: "Digital Forensics",
  incident_response: "Incident Response",
  vulnerability_disclosure: "Vulnerability Disclosure",
  bug_bounty: "Bug Bounty",
  secure_development: "Secure Development",
};

export type Audience = "executive" | "technical" | "full" | "client_handoff" | "remediation_tracker" | "retest";

export type ReportView = "executive" | "technical" | "full" | "remediation" | "retest";

export type OutputFormat = "pdf" | "docx" | "markdown" | "html" | "json" | "xml" | "yaml";

export interface CanonicalModule {
  id: string;
  title: string;
  description: string;
  /** Legacy top-level doc ids absorbed into this module. */
  absorbedLegacyIds?: string[];
}

export interface CanonicalVariant {
  id: string;
  label: string;
  description: string;
}

export interface CanonicalDocument {
  canonicalId: string;
  family: DocumentFamily;
  name: string;
  description: string;
  aliases: string[];
  variants: CanonicalVariant[];
  modules: CanonicalModule[];
  requiredInputs: string[];
  optionalInputs: string[];
  requiredSections: string[];
  optionalSections: string[];
  standardsMappings: string[];
  supportedEvidenceTypes: string[];
  supportedOutputFormats: OutputFormat[];
  validationRules?: string[];
  audiences: Audience[];
  reportType?: ReportView[];
  isStandalone: boolean;
  isModule: boolean;
  deprecatedAliases: string[];
}

export const CANONICAL_DOCUMENTS: CanonicalDocument[] = [
  {
    canonicalId: "pentest_engagement",
    family: "penetration_testing",
    name: "Pentest Engagement & Authorization",
    description:
      "Single canonical pre-engagement artifact covering authorization, scope, RoE, windows, comms and data handling. Replaces fragmented RoE / agreement / plan / schedule / comms documents.",
    aliases: ["roe", "pentest_agreement", "pentest_plan"],
    variants: [
      { id: "standard", label: "Standard", description: "General-purpose engagement" },
      { id: "web_app", label: "Web Application", description: "Web/API focused engagement" },
      { id: "network", label: "Network", description: "Internal/external network engagement" },
      { id: "cloud", label: "Cloud", description: "Cloud-scoped engagement" },
      { id: "api", label: "API", description: "API-only engagement" },
    ],
    modules: [
      { id: "purpose", title: "Purpose & Objectives", description: "Business and technical objectives" },
      { id: "parties", title: "Parties & Responsibilities", description: "Client, provider, contacts" },
      { id: "authorization", title: "Authorization & Safe Harbor", description: "Signatory, reference, jurisdiction", absorbedLegacyIds: ["pentest_agreement"] },
      { id: "scope", title: "Scope & Exclusions", description: "In-scope / out-of-scope inventory" },
      { id: "roe", title: "Rules of Engagement", description: "Permitted/prohibited techniques, tools", absorbedLegacyIds: ["roe"] },
      { id: "windows", title: "Testing Windows", description: "Schedule, blackout periods", absorbedLegacyIds: ["pentest_plan"] },
      { id: "comms", title: "Communication & Escalation", description: "Channels, emergency stop" },
      { id: "data_handling", title: "Data Handling & Evidence", description: "Collection, encryption, retention" },
      { id: "reporting_req", title: "Reporting Requirements", description: "Deliverables, audience, cadence" },
      { id: "signoff", title: "Sign-off", description: "Acceptance signatures" },
    ],
    requiredInputs: ["clientName", "providerName", "objective", "inScope", "authorizedBy", "startDate", "endDate"],
    optionalInputs: ["outOfScope", "windows", "constraints", "methodology", "evidence", "deliverables", "legalJurisdiction", "emergencyStopContact"],
    requiredSections: ["doc_control", "parties", "authorization", "scope", "roe", "windows", "comms", "signoff"],
    optionalSections: ["data_handling", "reporting_req", "methodology"],
    standardsMappings: ["NIST SP 800-115 Sec 6", "PTES Pre-Engagement", "CREST Engagement Guidance"],
    supportedEvidenceTypes: ["scope_doc", "sow", "roe_doc", "notes"],
    supportedOutputFormats: ["pdf", "docx", "markdown", "html", "json", "xml", "yaml"],
    audiences: ["executive", "technical", "full"],
    isStandalone: true,
    isModule: false,
    deprecatedAliases: [],
  },
  {
    canonicalId: "pentest_report",
    family: "penetration_testing",
    name: "Pentest Report",
    description: "Canonical assessment report. Executive / technical / full are presentation views of one model, not separate engines.",
    aliases: ["pentest_report"],
    variants: [
      { id: "full", label: "Full", description: "Executive + technical + appendices" },
      { id: "executive", label: "Executive", description: "Business-risk view" },
      { id: "technical", label: "Technical", description: "Findings + evidence + reproduction" },
      { id: "retest", label: "Retest", description: "Validation against prior report" },
    ],
    modules: [
      { id: "exec_summary", title: "Executive Summary", description: "Objectives, posture, key findings" },
      { id: "scope_method", title: "Scope & Methodology", description: "Scope, PTES/WSTG methodology, limitations" },
      { id: "risk_profile", title: "Risk Profile", description: "Severity distribution, systemic issues" },
      { id: "findings", title: "Detailed Findings", description: "Per-finding anatomy with evidence" },
      { id: "attack_path", title: "Attack Narrative / Paths", description: "Chained exploitation narrative" },
      { id: "remediation_roadmap", title: "Remediation Roadmap", description: "Prioritized fixes, SLAs" },
      { id: "appendices", title: "Appendices", description: "Evidence index, methodology refs" },
    ],
    requiredInputs: ["clientName", "objective", "inScope", "methodology"],
    optionalInputs: ["criticalFindings", "overallRiskRating", "evidence", "windows", "constraints"],
    requiredSections: ["doc_control", "exec_summary", "scope_methodology", "findings", "remediation"],
    optionalSections: ["attack_narrative", "retest_guidance", "appendix_evidence"],
    standardsMappings: ["PTES Reporting", "OWASP WSTG Reporting", "NIST SP 800-115 Sec 8", "FIRST CVSS v4.0"],
    supportedEvidenceTypes: ["nmap", "burp", "zap", "nessus", "nuclei", "nikto", "ffuf", "gobuster", "sarif", "notes", "screenshot", "prior_report"],
    supportedOutputFormats: ["pdf", "docx", "markdown", "html", "json", "xml", "yaml"],
    audiences: ["executive", "technical", "full", "client_handoff", "remediation_tracker", "retest"],
    reportType: ["executive", "technical", "full", "remediation", "retest"],
    isStandalone: true,
    isModule: false,
    deprecatedAliases: [],
  },
  {
    canonicalId: "pentest_retest",
    family: "penetration_testing",
    name: "Pentest Retest / Validation Report",
    description: "Compares a prior report against fresh retest evidence. Statuses: open / remediated / partial / not-reproduced / inconclusive / regressed.",
    aliases: [],
    variants: [{ id: "standard", label: "Standard", description: "Finding-by-finding validation" }],
    modules: [
      { id: "prior_ref", title: "Prior Findings Reference", description: "Baseline finding set" },
      { id: "retest_evidence", title: "Retest Evidence", description: "New artifacts examined" },
      { id: "validation", title: "Validation Results", description: "Per-finding verdict" },
    ],
    requiredInputs: ["priorReportRef", "clientName"],
    optionalInputs: ["inScope", "methodology"],
    requiredSections: ["doc_control", "validation", "remediation"],
    optionalSections: ["appendix_evidence"],
    standardsMappings: ["PTES Reporting (retest)", "PCI DSS Retest Guidance"],
    supportedEvidenceTypes: ["prior_report", "nuclei", "zap", "burp", "notes", "screenshot"],
    supportedOutputFormats: ["pdf", "docx", "markdown", "html", "json", "xml", "yaml"],
    audiences: ["technical", "full", "retest"],
    reportType: ["retest"],
    isStandalone: true,
    isModule: false,
    deprecatedAliases: [],
  },
  {
    canonicalId: "redteam_engagement",
    family: "red_team",
    name: "Red Team Engagement Definition / Plan",
    description: "Objectives, threat actor emulation, scope, TTPs allowed, blue-team coordination and stop conditions.",
    aliases: [],
    variants: [{ id: "standard", label: "Standard", description: "Campaign definition" }],
    modules: [
      { id: "objectives", title: "Objectives & Flags", description: "Crown jewels, flags" },
      { id: "actor", title: "Emulated Actor", description: "APT profile, TTP scope" },
      { id: "scope", title: "Scope & Constraints", description: "Domains, techniques allowed/denied" },
      { id: "coordination", title: "White-cell Coordination", description: "Deconfliction, comms" },
    ],
    requiredInputs: ["clientName", "objective", "inScope"],
    optionalInputs: ["emulatedThreatActor", "campaignFlags", "constraints"],
    requiredSections: ["doc_control", "objectives", "scope"],
    optionalSections: ["coordination"],
    standardsMappings: ["MITRE ATT&CK", "PTES Threat Modeling"],
    supportedEvidenceTypes: ["scope_doc", "notes"],
    supportedOutputFormats: ["pdf", "docx", "markdown", "html", "json", "xml", "yaml"],
    audiences: ["executive", "technical", "full"],
    isStandalone: true,
    isModule: false,
    deprecatedAliases: [],
  },
  {
    canonicalId: "redteam_report",
    family: "red_team",
    name: "Red Team Assessment Report",
    description: "Campaign narrative, detection analysis, lateral movement, ATT&CK mapping, defense recommendations.",
    aliases: ["redteam_report"],
    variants: [{ id: "full", label: "Full", description: "Narrative + detection + exposures" }],
    modules: [
      { id: "narrative", title: "Campaign Narrative", description: "Chronological actions" },
      { id: "detection", title: "Detection Analysis", description: "Blue-team efficacy" },
      { id: "exposures", title: "Critical Exposures", description: "Paths to objective" },
      { id: "recommendations", title: "Defense Recommendations", description: "Detections, hardening" },
    ],
    requiredInputs: ["clientName", "objective"],
    optionalInputs: ["emulatedThreatActor", "campaignFlags"],
    requiredSections: ["doc_control", "exec_summary", "narrative", "findings", "recommendations"],
    optionalSections: ["appendix_iocs"],
    standardsMappings: ["MITRE ATT&CK", "NIST SP 800-115 Sec 8"],
    supportedEvidenceTypes: ["notes", "logs", "screenshot", "sarif"],
    supportedOutputFormats: ["pdf", "docx", "markdown", "html", "json", "xml", "yaml"],
    audiences: ["executive", "technical", "full"],
    reportType: ["executive", "technical", "full"],
    isStandalone: true,
    isModule: false,
    deprecatedAliases: [],
  },
  {
    canonicalId: "vuln_assessment_definition",
    family: "vulnerability_assessment",
    name: "Vulnerability Assessment Definition",
    description: "Scan scope, credentials, windows, scan policy and success criteria — distinct from the report.",
    aliases: [],
    variants: [{ id: "standard", label: "Standard", description: "Scan definition" }],
    modules: [
      { id: "scope", title: "Scope", description: "CIDRs, hosts, repos" },
      { id: "policy", title: "Scan Policy", description: "Engine, credentials, intensity" },
      { id: "schedule", title: "Schedule", description: "Windows, frequency" },
    ],
    requiredInputs: ["clientName", "inScope"],
    optionalInputs: ["scanningEngine", "scannedSubnets", "windows"],
    requiredSections: ["doc_control", "scope"],
    optionalSections: ["schedule"],
    standardsMappings: ["NIST SP 800-115 Sec 4", "ISO/IEC 29147 (triage inputs)"],
    supportedEvidenceTypes: ["scope_doc", "notes"],
    supportedOutputFormats: ["pdf", "docx", "markdown", "html", "json", "xml", "yaml"],
    audiences: ["technical", "full"],
    isStandalone: true,
    isModule: false,
    deprecatedAliases: [],
  },
  {
    canonicalId: "vuln_assessment_report",
    family: "vulnerability_assessment",
    name: "Vulnerability Assessment Report",
    description: "Scanner + analyst-triaged inventory with CVSS, affected assets and remediation roadmap. Scanner output is observation, not auto-confirmed finding.",
    aliases: ["va_report"],
    variants: [
      { id: "full", label: "Full", description: "Inventory + roadmap" },
      { id: "retest", label: "Retest", description: "Validation view" },
    ],
    modules: [
      { id: "coverage", title: "Coverage", description: "Assets scanned, gaps" },
      { id: "severity_summary", title: "Severity Summary", description: "Distribution" },
      { id: "findings", title: "Findings", description: "Triaged vulns" },
      { id: "roadmap", title: "Remediation Roadmap", description: "Prioritized plan" },
    ],
    requiredInputs: ["clientName", "inScope"],
    optionalInputs: ["scanningEngine", "scannedSubnets", "methodology"],
    requiredSections: ["doc_control", "exec_summary", "findings", "remediation"],
    optionalSections: ["appendix_statistics"],
    standardsMappings: ["FIRST CVSS v4.0", "NIST SP 800-115 Sec 8"],
    supportedEvidenceTypes: ["nessus", "openvas", "nuclei", "nikto", "sarif", "nmap"],
    supportedOutputFormats: ["pdf", "docx", "markdown", "html", "json", "xml", "yaml"],
    audiences: ["executive", "technical", "full", "remediation_tracker", "retest"],
    reportType: ["executive", "technical", "full", "remediation", "retest"],
    isStandalone: true,
    isModule: false,
    deprecatedAliases: [],
  },
  {
    canonicalId: "security_assessment_report",
    family: "security_assessment",
    name: "Security Assessment Report",
    description: "Control-oriented assessment against a framework (NIST CSF 2.0 / CIS / ISO 27001). Distinct from vuln-scan reports.",
    aliases: ["sec_assessment_report", "cyber_risk_assessment", "third_party_sec_assessment"],
    variants: [
      { id: "framework", label: "Framework", description: "NIST CSF / CIS / ISO aligned" },
      { id: "vendor", label: "Third-Party", description: "Supplier evaluation" },
    ],
    modules: [
      { id: "framework", title: "Framework & Scope", description: "Controls in scope" },
      { id: "scorecard", title: "Scorecard", description: "Maturity ratings" },
      { id: "findings", title: "Control Findings", description: "Gaps per control" },
      { id: "roadmap", title: "Strategic Roadmap", description: "Uplift plan" },
    ],
    requiredInputs: ["clientName", "assessmentFramework"],
    optionalInputs: ["maturityLevel", "methodology"],
    requiredSections: ["doc_control", "exec_summary", "findings", "recommendations"],
    optionalSections: ["appendix_evidence"],
    standardsMappings: ["NIST CSF 2.0", "CIS Critical Controls", "ISO/IEC 27001 (public overview)"],
    supportedEvidenceTypes: ["notes", "csv", "json", "scope_doc"],
    supportedOutputFormats: ["pdf", "docx", "markdown", "html", "json", "xml", "yaml"],
    audiences: ["executive", "technical", "full"],
    reportType: ["executive", "technical", "full"],
    isStandalone: true,
    isModule: false,
    deprecatedAliases: [],
  },
  {
    canonicalId: "cloud_assessment_report",
    family: "cloud_security",
    name: "Cloud Security Assessment Report",
    description: "Account governance, IAM/CIEM, network, storage, workload and logging posture mapped to CCM/CIS baselines.",
    aliases: ["cloud_sec_assessment", "app_sec_assessment"],
    variants: [
      { id: "provider", label: "Provider", description: "AWS / Azure / GCP" },
      { id: "app", label: "Application", description: "App-layer assessment" },
    ],
    modules: [
      { id: "accounts", title: "Scoped Accounts", description: "Accounts / subscriptions" },
      { id: "iam", title: "IAM & Entitlements", description: "Over-privilege, keys" },
      { id: "network", title: "Network", description: "VPCs, exposure" },
      { id: "data", title: "Data & Workloads", description: "Storage, containers" },
      { id: "logging", title: "Logging & Monitoring", description: "CloudTrail / GuardDuty gaps" },
    ],
    requiredInputs: ["clientName", "cloudProvider", "accountIds"],
    optionalInputs: ["complianceBaselines", "methodology"],
    requiredSections: ["doc_control", "exec_summary", "findings", "remediation"],
    optionalSections: ["appendix_evidence"],
    standardsMappings: ["CSA CCM v4.1", "CIS Benchmarks (public)", "NIST CSF 2.0"],
    supportedEvidenceTypes: ["json", "csv", "sarif", "notes"],
    supportedOutputFormats: ["pdf", "docx", "markdown", "html", "json", "xml", "yaml"],
    audiences: ["executive", "technical", "full", "remediation_tracker"],
    reportType: ["executive", "technical", "full", "remediation"],
    isStandalone: true,
    isModule: false,
    deprecatedAliases: [],
  },
  {
    canonicalId: "arch_review",
    family: "security_architecture",
    name: "Security Architecture Review",
    description: "Zone/IAM/crypto/telemetry design review with compliance cross-reference. Absorbs sec_arch_doc + sec_design_review.",
    aliases: ["sec_arch_doc", "sec_design_review"],
    variants: [{ id: "standard", label: "Standard", description: "Design review" }],
    modules: [
      { id: "topology", title: "Topology & Zones", description: "Network/compute zones" },
      { id: "iam", title: "IAM Architecture", description: "AuthN/AuthZ design" },
      { id: "crypto", title: "Data Protection", description: "Crypto, key mgmt" },
      { id: "telemetry", title: "Telemetry", description: "Logging, SIEM" },
      { id: "compliance", title: "Compliance Matrix", description: "Control mapping" },
    ],
    requiredInputs: ["clientName", "systemScope"],
    optionalInputs: ["securityZones", "complianceStandards"],
    requiredSections: ["doc_control", "scope", "findings", "recommendations"],
    optionalSections: ["compliance_matrix"],
    standardsMappings: ["NIST CSF 2.0", "CSA CCM v4.1 (cloud parts)"],
    supportedEvidenceTypes: ["notes", "scope_doc", "json"],
    supportedOutputFormats: ["pdf", "docx", "markdown", "html", "json", "xml", "yaml"],
    audiences: ["executive", "technical", "full"],
    isStandalone: true,
    isModule: false,
    deprecatedAliases: [],
  },
  {
    canonicalId: "threat_model",
    family: "threat_modeling",
    name: "Threat Model",
    description: "STRIDE/attack-path analysis with trust boundaries, entry points, mitigations and residual risk.",
    aliases: ["threat_model", "threat_assessment_report", "threat_actor_profile", "threat_intel_report", "campaign_analysis_report"],
    variants: [
      { id: "stride", label: "STRIDE", description: "Design threat model" },
      { id: "assessment", label: "Threat Assessment", description: "Actor/campaign-informed review" },
    ],
    modules: [
      { id: "system", title: "System Overview", description: "Architecture context" },
      { id: "boundaries", title: "Trust Boundaries & Data Flow", description: "DFD-level detail" },
      { id: "stride", title: "STRIDE Analysis", description: "Per-threat analysis" },
      { id: "controls", title: "Required Controls", description: "Mitigations" },
      { id: "residual", title: "Residual Risk", description: "Accepted risk" },
    ],
    requiredInputs: ["clientName", "systemName"],
    optionalInputs: ["trustBoundaries", "entryPoints", "threatTopic"],
    requiredSections: ["doc_control", "system", "stride", "controls"],
    optionalSections: ["residual"],
    standardsMappings: ["OWASP Threat Modeling guidance", "NIST CSF 2.0 GV/ID"],
    supportedEvidenceTypes: ["notes", "scope_doc", "json"],
    supportedOutputFormats: ["pdf", "docx", "markdown", "html", "json", "xml", "yaml"],
    audiences: ["technical", "full"],
    isStandalone: true,
    isModule: false,
    deprecatedAliases: [],
  },
  {
    canonicalId: "forensic_report",
    family: "digital_forensics",
    name: "Digital Forensics Report",
    description: "Chain of custody, acquisition methodology, disk/memory/network analysis, timeline and opinion. Absorbs forensics + malware analysis as modules.",
    aliases: ["forensics_report", "malware_report"],
    variants: [
      { id: "investigation", label: "Investigation", description: "Host/network forensics" },
      { id: "malware", label: "Malware", description: "Binary analysis appendix" },
    ],
    modules: [
      { id: "custody", title: "Chain of Custody", description: "Hashes, handlers" },
      { id: "acquisition", title: "Acquisition", description: "Imaging methodology" },
      { id: "analysis", title: "Analysis", description: "Disk/memory/network" },
      { id: "timeline", title: "Timeline", description: "Event reconstruction" },
      { id: "opinion", title: "Opinion", description: "Investigative conclusions" },
    ],
    requiredInputs: ["clientName", "caseNumber"],
    optionalInputs: ["evidenceItems", "leadExaminer"],
    requiredSections: ["doc_control", "custody", "analysis", "timeline"],
    optionalSections: ["appendix_hashes", "iocs"],
    standardsMappings: ["NIST SP 800-86", "NIST SP 800-61 Rev.3 (handling)"],
    supportedEvidenceTypes: ["logs", "csv", "json", "screenshot", "notes"],
    supportedOutputFormats: ["pdf", "docx", "markdown", "html", "json", "xml", "yaml"],
    audiences: ["executive", "technical", "full"],
    reportType: ["executive", "technical", "full"],
    isStandalone: true,
    isModule: false,
    deprecatedAliases: [],
  },
  {
    canonicalId: "ir_plan",
    family: "incident_response",
    name: "Incident Response Plan",
    description: "Severity matrix, CIRT roles, four-phase workflows, notification and maintenance. Playbooks are modules, not standalone docs.",
    aliases: ["ir_plan", "ir_playbook"],
    variants: [{ id: "standard", label: "Standard", description: "Enterprise IR plan" }],
    modules: [
      { id: "severity", title: "Classification & Severity", description: "P1-P4 matrix" },
      { id: "roles", title: "CIRT Roles", description: "RACI, contacts" },
      { id: "phases", title: "Response Phases", description: "Prepare/detect/contain/recover" },
      { id: "playbook", title: "Scenario Playbooks", description: "Ransomware/BEC/etc.", absorbedLegacyIds: ["ir_playbook"] },
      { id: "legal", title: "Legal & Notification", description: "Regulatory triggers" },
    ],
    requiredInputs: ["clientName", "planOwner"],
    optionalInputs: ["escalationHotlines", "severityThresholds"],
    requiredSections: ["doc_control", "severity", "roles", "phases"],
    optionalSections: ["playbook", "legal"],
    standardsMappings: ["NIST SP 800-61 Rev.3", "CISA IR guidance (public)"],
    supportedEvidenceTypes: ["notes", "scope_doc"],
    supportedOutputFormats: ["pdf", "docx", "markdown", "html", "json", "xml", "yaml"],
    audiences: ["executive", "technical", "full"],
    isStandalone: true,
    isModule: false,
    deprecatedAliases: [],
  },
  {
    canonicalId: "incident_report",
    family: "incident_response",
    name: "Incident Report",
    description: "Factual record: severity, root cause, timeline, impact, containment, evidence preserved, disclosures.",
    aliases: ["incident_report"],
    variants: [{ id: "standard", label: "Standard", description: "Single-incident record" }],
    modules: [
      { id: "overview", title: "Overview & Severity", description: "ID, type, severity" },
      { id: "timeline", title: "Timeline", description: "Chronology" },
      { id: "impact", title: "Impact", description: "Systems/data" },
      { id: "response", title: "Response", description: "Containment/remediation" },
      { id: "evidence", title: "Evidence", description: "Preserved artifacts" },
    ],
    requiredInputs: ["clientName", "incidentNumber", "incidentDate"],
    optionalInputs: ["incidentType", "affectedSystems"],
    requiredSections: ["doc_control", "exec_summary", "timeline", "impact", "response"],
    optionalSections: ["regulatory_disclosures"],
    standardsMappings: ["NIST SP 800-61 Rev.3", "FIRST incident disclosure practice"],
    supportedEvidenceTypes: ["logs", "json", "csv", "screenshot", "notes"],
    supportedOutputFormats: ["pdf", "docx", "markdown", "html", "json", "xml", "yaml"],
    audiences: ["executive", "technical", "full"],
    reportType: ["executive", "technical", "full"],
    isStandalone: true,
    isModule: false,
    deprecatedAliases: [],
  },
  {
    canonicalId: "lessons_learned",
    family: "incident_response",
    name: "Post-Incident Review / Lessons Learned",
    description: "What worked, gaps, root causes, corrective actions with owners.",
    aliases: ["lessons_learned_report"],
    variants: [{ id: "standard", label: "Standard", description: "Post-mortem" }],
    modules: [
      { id: "retro", title: "Retrospective", description: "Summary" },
      { id: "gaps", title: "Gaps", description: "Pain points" },
      { id: "actions", title: "Corrective Actions", description: "Owners, dates" },
    ],
    requiredInputs: ["clientName", "incidentReference"],
    optionalInputs: ["identifiedGaps", "durationHours"],
    requiredSections: ["doc_control", "retro", "gaps", "actions"],
    optionalSections: [],
    standardsMappings: ["NIST SP 800-61 Rev.3 (lessons learned)"],
    supportedEvidenceTypes: ["notes", "incident_report"],
    supportedOutputFormats: ["pdf", "docx", "markdown", "html", "json", "xml", "yaml"],
    audiences: ["executive", "technical", "full"],
    isStandalone: true,
    isModule: false,
    deprecatedAliases: [],
  },
  {
    canonicalId: "disclosure_policy",
    family: "vulnerability_disclosure",
    name: "Vulnerability Disclosure Policy",
    description: "Safe-harbor, scope, reporting channels, SLAs per ISO 29147 / 30111 public guidance.",
    aliases: [],
    variants: [{ id: "standard", label: "Standard", description: "External researcher policy" }],
    modules: [
      { id: "scope", title: "Scope", description: "Covered assets" },
      { id: "channels", title: "Reporting Channels", description: "How to report" },
      { id: "handling", title: "Handling & SLAs", description: "Triage timelines" },
      { id: "safe_harbor", title: "Safe Harbor", description: "Legal protections" },
    ],
    requiredInputs: ["clientName"],
    optionalInputs: ["scope", "contact"],
    requiredSections: ["doc_control", "scope", "channels", "safe_harbor"],
    optionalSections: [],
    standardsMappings: ["ISO/IEC 29147", "ISO/IEC 30111"],
    supportedEvidenceTypes: ["notes"],
    supportedOutputFormats: ["pdf", "docx", "markdown", "html", "json", "xml", "yaml"],
    audiences: ["full"],
    isStandalone: true,
    isModule: false,
    deprecatedAliases: [],
  },
  {
    canonicalId: "bug_bounty_policy",
    family: "bug_bounty",
    name: "Bug Bounty / Research Program Policy",
    description: "Eligibility, tiers, rewards, rules and safe harbor for bounty researchers.",
    aliases: [],
    variants: [{ id: "standard", label: "Standard", description: "Bounty policy" }],
    modules: [
      { id: "eligibility", title: "Eligibility & Scope", description: "Who/what is covered" },
      { id: "rewards", title: "Tiers & Rewards", description: "Severity-based payouts" },
      { id: "rules", title: "Rules", description: "Testing boundaries" },
    ],
    requiredInputs: ["clientName"],
    optionalInputs: ["scope"],
    requiredSections: ["doc_control", "eligibility", "rewards", "rules"],
    optionalSections: [],
    standardsMappings: ["ISO/IEC 29147 (report handling inputs)"],
    supportedEvidenceTypes: ["notes"],
    supportedOutputFormats: ["pdf", "docx", "markdown", "html", "json", "xml", "yaml"],
    audiences: ["full"],
    isStandalone: true,
    isModule: false,
    deprecatedAliases: [],
  },
  {
    canonicalId: "sec_requirements",
    family: "secure_development",
    name: "Security Requirements Specification",
    description: "Acceptance/verification requirements for secure builds. Distinct from architecture review.",
    aliases: ["risk_register", "sec_exception_waiver", "bia_report", "bcp_plan", "drp_plan", "cyber_recovery_plan"],
    variants: [
      { id: "requirements", label: "Requirements", description: "Security acceptance criteria" },
      { id: "governance", label: "Governance Annex", description: "Risk/exception/continuity annex" },
    ],
    modules: [
      { id: "requirements", title: "Requirements", description: "Shall-statements, verification" },
      { id: "acceptance", title: "Acceptance Criteria", description: "Verification methods" },
      { id: "governance", title: "Governance Annex", description: "Risk register / exception / BIA summary" },
    ],
    requiredInputs: ["clientName", "systemScope"],
    optionalInputs: ["complianceStandards"],
    requiredSections: ["doc_control", "requirements", "acceptance"],
    optionalSections: ["governance"],
    standardsMappings: ["OWASP ASVS (public)", "NIST CSF 2.0 PR/ GV"],
    supportedEvidenceTypes: ["notes", "scope_doc", "csv"],
    supportedOutputFormats: ["pdf", "docx", "markdown", "html", "json", "xml", "yaml"],
    audiences: ["technical", "full"],
    isStandalone: true,
    isModule: false,
    deprecatedAliases: [],
  },
];

export const CANONICAL_BY_ID = new Map(CANONICAL_DOCUMENTS.map((d) => [d.canonicalId, d]));
export function getCanonical(id: string): CanonicalDocument | undefined {
  return CANONICAL_BY_ID.get(id);
}
