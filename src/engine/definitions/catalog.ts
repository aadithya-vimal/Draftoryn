import type {
  DocumentCategory,
  DocumentDefinition,
  ExportFormat,
  FieldDef,
  FieldType,
  SectionDef,
  SectionKind,
  SemanticConcept,
} from "../types";
import { CORE_EXPORT_FORMATS, USEFUL_EXPORT_FORMATS } from "../types";

// ---------------------------------------------------------------------------
// Field builders
// ---------------------------------------------------------------------------

interface FieldOpts {
  description?: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  default?: unknown;
  showIf?: FieldDef["showIf"];
  repeatable?: boolean;
  structured?: FieldDef[];
  mapsTo?: SemanticConcept;
  mapsKey?: string;
}

function field(type: FieldType, id: string, label: string, opts: FieldOpts = {}): FieldDef {
  return { type, id, label, ...opts };
}

const text = (id: string, label: string, o: FieldOpts = {}) => field("text", id, label, o);
const area = (id: string, label: string, o: FieldOpts = {}) => field("textarea", id, label, o);
const dateF = (id: string, label: string, o: FieldOpts = {}) => field("date", id, label, o);
const listF = (id: string, label: string, o: FieldOpts = {}) => field("list", id, label, { ...o, repeatable: true });
const mselect = (id: string, label: string, options: string[], o: FieldOpts = {}) =>
  field("multiselect", id, label, { ...o, options, repeatable: true });
const toggle = (id: string, label: string, o: FieldOpts = {}) => field("toggle", id, label, o);
const peopleF = (id: string, label: string, o: FieldOpts = {}) =>
  field("list", id, label, {
    ...o,
    repeatable: true,
    structured: [
      text("name", "Name"),
      text("role", "Role"),
      text("email", "Email"),
      text("organization", "Organization"),
    ],
  });

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function S(kind: SectionKind, title: string, opts: Partial<SectionDef> = {}): SectionDef {
  return { id: opts.id ?? kind, title, kind, ...opts };
}

function optS(kind: SectionKind, title: string, opts: Partial<SectionDef> = {}): SectionDef {
  return S(kind, title, { optional: true, ...opts });
}

const EXPORTS: ExportFormat[] = [...CORE_EXPORT_FORMATS, ...USEFUL_EXPORT_FORMATS];

// ---------------------------------------------------------------------------
// Reusable field groups
// ---------------------------------------------------------------------------

function orgFields(prefix: "client" | "provider"): FieldDef[] {
  const cap = prefix === "client" ? "Client" : "Assessing";
  return [
    text(`${prefix}Name`, `${cap} organization name`, {
      required: prefix === "client",
      mapsTo: prefix,
      mapsKey: "name",
      placeholder: prefix === "client" ? "Example Corp" : "Acme Security",
    }),
    text(`${prefix}ContactName`, `${cap} primary contact`, { mapsTo: prefix, mapsKey: "contactName" }),
    text(`${prefix}ContactEmail`, `${cap} contact email`, { mapsTo: prefix, mapsKey: "contactEmail" }),
    text(`${prefix}Department`, `${cap} department / business unit`, { mapsTo: prefix, mapsKey: "department" }),
  ];
}

function engagementFields(): FieldDef[] {
  return [
    area("objective", "Objective of the engagement", {
      mapsTo: "objective",
      description: "What the activity is intended to establish or accomplish.",
    }),
    listF("inScope", "In-scope targets / systems", { mapsTo: "scope", mapsKey: "inScope", description: "Domains, IP ranges, applications, accounts or environments included." }),
    listF("outOfScope", "Out-of-scope items", { mapsTo: "scope", mapsKey: "outOfScope" }),
    dateF("startDate", "Start date", { mapsTo: "schedule", mapsKey: "start" }),
    dateF("endDate", "End date", { mapsTo: "schedule", mapsKey: "end" }),
    listF("windows", "Testing / maintenance windows", { mapsTo: "schedule", mapsKey: "windows" }),
    text("authorizedBy", "Authorized signatory", { mapsTo: "authorization", mapsKey: "authorizedBy" }),
    text("authReference", "Authorization reference / contract ID", { mapsTo: "authorization", mapsKey: "reference" }),
    dateF("authDate", "Authorization date", { mapsTo: "authorization", mapsKey: "date" }),
    listF("constraints", "Constraints / prohibited activities", { mapsTo: "constraints", description: "e.g. No denial-of-service testing, no destructive actions." }),
    listF("methodology", "Methodology", { mapsTo: "methodology" }),
    listF("evidence", "Evidence requirements", { mapsTo: "evidence" }),
    listF("deliverables", "Reporting deliverables", { mapsTo: "reporting", mapsKey: "deliverables" }),
    text("reportAudience", "Report audience", { mapsTo: "reporting", mapsKey: "audience" }),
    listF("assumptions", "Assumptions & limitations", { mapsTo: "assumptions" }),
  ];
}

// ---------------------------------------------------------------------------
// Catalog specification
// ---------------------------------------------------------------------------

interface DocSpec {
  id: string;
  slug: string;
  name: string;
  description: string;
  audience: string;
  purpose: string;
  sections: SectionDef[];
  addFields?: FieldDef[];
  tone?: string;
  terminology?: string[];
  instructions?: string;
}

interface CategorySpec {
  category: DocumentCategory;
  fields: FieldDef[];
  docs: DocSpec[];
}

const CATALOG: CategorySpec[] = [
  // A. Penetration Testing ----------------------------------------------------
  {
    category: "penetration_testing",
    fields: [...orgFields("client"), ...orgFields("provider"), ...engagementFields()],
    docs: [
      {
        id: "pentest_agreement",
        slug: "penetration-testing-agreement",
        name: "Penetration Testing Agreement",
        description: "A binding agreement between a client and a penetration testing provider covering terms, responsibilities and authorization.",
        audience: "Client legal / procurement and the testing provider.",
        purpose: "Set out the commercial and legal basis under which penetration testing is performed.",
        sections: [
          S("title", "Penetration Testing Agreement"),
          S("intro", "Introduction"),
          S("parties", "Parties"),
          S("scope", "Scope of Engagement"),
          S("authorization", "Authorization & Consent"),
          S("constraints", "Constraints & Prohibited Activities"),
          S("reporting", "Deliverables & Reporting"),
          optS("schedule", "Schedule"),
          S("assumptions", "Assumptions & Limitations"),
          S("signoff", "Sign-off"),
        ],
      },
      {
        id: "pentest_sow",
        slug: "penetration-testing-sow",
        name: "Penetration Testing Statement of Work (SOW)",
        description: "Defines the work, methodology, timeline and deliverables for a penetration test.",
        audience: "Client and testing provider engagement owners.",
        purpose: "Describe the work to be performed and how it will be delivered.",
        sections: [
          S("title", "Statement of Work"),
          S("objectives", "Objectives"),
          S("scope", "Scope"),
          S("methodology", "Methodology"),
          S("schedule", "Schedule"),
          S("reporting", "Deliverables"),
          S("constraints", "Constraints"),
          S("assumptions", "Assumptions"),
          S("signoff", "Acceptance"),
        ],
      },
      {
        id: "pentest_authorization",
        slug: "authorization-to-test",
        name: "Authorization to Test / Authorization Letter",
        description: "Formal written permission to test specific systems within a defined window.",
        audience: "System owners and the testing team.",
        purpose: "Evidence that testing is explicitly authorized.",
        sections: [
          S("title", "Authorization to Test"),
          S("parties", "Authorizing Parties"),
          S("authorization", "Authorization"),
          S("scope", "Authorized Targets"),
          S("schedule", "Authorized Window"),
          S("constraints", "Conditions"),
          S("signoff", "Signature"),
        ],
      },
      {
        id: "pentest_scope",
        slug: "penetration-test-scope-document",
        name: "Penetration Test Scope Document",
        description: "Detailed definition of what is and is not included in the test.",
        audience: "Client and tester technical leads.",
        purpose: "Clarify the exact boundary of the engagement.",
        sections: [
          S("title", "Scope Document"),
          S("objectives", "Engagement Objectives"),
          S("scope", "In Scope"),
          S("exclusions", "Exclusions"),
          S("methodology", "Approach"),
        ],
      },
      {
        id: "pentest_roe",
        slug: "rules-of-engagement",
        name: "Rules of Engagement (RoE)",
        description: "Operational rules governing how testing is conducted, including stop conditions.",
        audience: "Testing team and client security staff.",
        purpose: "Define permitted and prohibited actions and emergency stops.",
        sections: [
          S("title", "Rules of Engagement"),
          S("authorization", "Authorization"),
          S("scope", "Targets"),
          S("constraints", "Prohibited Activities"),
          S("schedule", "Testing Windows"),
          S("communications", "Communications & Escalation"),
          S("evidence", "Evidence Handling"),
        ],
        addFields: [area("stopConditions", "Stop / abort conditions", { description: "Conditions that immediately halt testing." })],
      },
      {
        id: "pentest_schedule",
        slug: "testing-schedule-maintenance-window",
        name: "Testing Schedule / Maintenance Window",
        description: "Time-bound schedule for testing activities aligned to maintenance windows.",
        audience: "Operations and testing teams.",
        purpose: "Coordinate testing within approved windows.",
        sections: [
          S("title", "Testing Schedule"),
          S("schedule", "Schedule"),
          S("communications", "Coordination"),
        ],
      },
      {
        id: "pentest_communications",
        slug: "communication-escalation-plan",
        name: "Communication & Escalation Plan",
        description: "How the testing team communicates status and escalates issues.",
        audience: "Client SOC and testing team.",
        purpose: "Ensure timely coordination during the test.",
        sections: [
          S("title", "Communication & Escalation Plan"),
          S("communications", "Communication Channels"),
          S("escalation", "Escalation Path", { id: "escalation", kind: "escalation", optional: true }),
          S("team", "Key Contacts", { kind: "parties" }),
        ],
      },
      {
        id: "pentest_restrictions",
        slug: "testing-restrictions-prohibited-activities",
        name: "Testing Restrictions / Prohibited Activities",
        description: "Explicit list of actions that must not be performed during testing.",
        audience: "Testing team.",
        purpose: "Prevent unsafe or unauthorized actions.",
        sections: [
          S("title", "Testing Restrictions"),
          S("constraints", "Prohibited Activities"),
        ],
      },
      {
        id: "pentest_evidence",
        slug: "data-handling-evidence-requirements",
        name: "Data Handling & Evidence Requirements",
        description: "How test evidence is collected, stored and destroyed.",
        audience: "Testing and client security teams.",
        purpose: "Protect sensitive evidence and support reproducibility.",
        sections: [
          S("title", "Data Handling & Evidence Requirements"),
          S("evidence", "Evidence Requirements"),
        ],
      },
      {
        id: "pentest_reporting_requirements",
        slug: "reporting-requirements",
        name: "Reporting Requirements",
        description: "Expected report structure, audience and cadence.",
        audience: "Client stakeholders.",
        purpose: "Define reporting expectations.",
        sections: [
          S("title", "Reporting Requirements"),
          S("reporting", "Reporting"),
        ],
      },
      {
        id: "pentest_report",
        slug: "penetration-test-report",
        name: "Penetration Test Report",
        description: "Full technical report of the penetration test.",
        audience: "Client technical and security staff.",
        purpose: "Document the test and its outcomes.",
        sections: [
          S("title", "Penetration Test Report"),
          S("intro", "Executive Context"),
          S("scope", "Scope"),
          S("methodology", "Methodology"),
          S("findings", "Findings"),
          S("recommendations", "Remediation"),
          S("evidence", "Evidence"),
          S("assumptions", "Assumptions"),
        ],
      },
      {
        id: "pentest_exec_summary",
        slug: "executive-penetration-test-summary",
        name: "Executive Penetration Test Summary",
        description: "Non-technical summary for leadership.",
        audience: "Executive stakeholders.",
        purpose: "Summarize risk and outcomes at a leadership level.",
        sections: [
          S("title", "Executive Summary"),
          S("intro", "Overview"),
          S("findings", "Summary of Findings", { id: "findings", kind: "findings" }),
          S("recommendations", "Recommended Actions"),
        ],
      },
      {
        id: "pentest_technical_findings",
        slug: "technical-findings-report",
        name: "Technical Findings Report",
        description: "Detailed technical findings with evidence.",
        audience: "Technical teams.",
        purpose: "Provide reproducible technical detail.",
        sections: [
          S("title", "Technical Findings Report"),
          S("methodology", "Methodology"),
          S("findings", "Findings"),
          S("evidence", "Evidence"),
        ],
      },
      {
        id: "pentest_remediation",
        slug: "remediation-recommendations",
        name: "Remediation Recommendations",
        description: "Prioritized remediation guidance.",
        audience: "Client engineering.",
        purpose: "Guide fixing of findings.",
        sections: [
          S("title", "Remediation Recommendations"),
          S("recommendations", "Remediation Plan", { id: "recommendations", kind: "remediation" }),
        ],
      },
      {
        id: "pentest_retest_auth",
        slug: "retest-authorization",
        name: "Retest Authorization",
        description: "Authorization to retest after remediation.",
        audience: "Client and tester.",
        purpose: "Re-authorize testing of remediated items.",
        sections: [
          S("title", "Retest Authorization"),
          S("authorization", "Authorization"),
          S("scope", "Retest Targets"),
        ],
      },
      {
        id: "pentest_retest_report",
        slug: "retest-report",
        name: "Retest Report",
        description: "Results of retesting remediated findings.",
        audience: "Client technical staff.",
        purpose: "Confirm remediation effectiveness.",
        sections: [
          S("title", "Retest Report"),
          S("scope", "Retest Scope"),
          S("findings", "Retest Results", { id: "findings", kind: "findings" }),
        ],
      },
    ],
  },

  // B. Red Team ---------------------------------------------------------------
  {
    category: "red_team",
    fields: [
      ...orgFields("client"),
      ...orgFields("provider"),
      area("objective", "Campaign objective", { mapsTo: "objective" }),
      listF("inScope", "Target environments", { mapsTo: "scope", mapsKey: "inScope" }),
      listF("outOfScope", "Out-of-scope", { mapsTo: "scope", mapsKey: "outOfScope" }),
      dateF("startDate", "Campaign start", { mapsTo: "schedule", mapsKey: "start" }),
      dateF("endDate", "Campaign end", { mapsTo: "schedule", mapsKey: "end" }),
      listF("windows", "Active windows", { mapsTo: "schedule", mapsKey: "windows" }),
      text("authorizedBy", "Authorized sponsor", { mapsTo: "authorization", mapsKey: "authorizedBy" }),
      dateF("authDate", "Authorization date", { mapsTo: "authorization", mapsKey: "date" }),
      listF("constraints", "Constraints / prohibited actions", { mapsTo: "constraints" }),
      listF("methodology", "Emulation approach", { mapsTo: "methodology" }),
      area("threatActor", "Threat actor profile", { description: "Which adversary is being emulated." }),
      listF("attackScenarios", "Attack scenarios", { description: "Planned adversarial scenarios." }),
      listF("evidence", "Evidence requirements", { mapsTo: "evidence" }),
      listF("deliverables", "Reporting deliverables", { mapsTo: "reporting", mapsKey: "deliverables" }),
      listF("assumptions", "Assumptions", { mapsTo: "assumptions" }),
    ],
    docs: [
      {
        id: "redteam_sow", slug: "red-team-sow", name: "Red Team Statement of Work",
        description: "Work definition for a red team adversary emulation engagement.",
        audience: "Client and red team leads.", purpose: "Describe the red team engagement and deliverables.",
        sections: [S("title", "Red Team Statement of Work"), S("objectives", "Campaign Objectives"), S("scope", "Scope"), S("methodology", "Emulation Approach"), S("schedule", "Schedule"), S("reporting", "Deliverables"), S("assumptions", "Assumptions"), S("signoff", "Acceptance")],
      },
      {
        id: "redteam_authorization", slug: "red-team-authorization", name: "Red Team Authorization",
        description: "Formal authorization for adversary emulation.",
        audience: "Client leadership and red team.", purpose: "Evidence authorization for emulation.",
        sections: [S("title", "Red Team Authorization"), S("authorization", "Authorization"), S("scope", "Targets"), S("schedule", "Window"), S("constraints", "Conditions"), S("signoff", "Signature")],
      },
      {
        id: "redteam_scope", slug: "red-team-scope-target-definition", name: "Red Team Scope & Target Definition",
        description: "Defines targets and boundaries for emulation.",
        audience: "Red team and client.", purpose: "Clarify emulation boundaries.",
        sections: [S("title", "Scope & Target Definition"), S("objectives", "Objectives"), S("scope", "Targets"), S("exclusions", "Exclusions")],
      },
      {
        id: "redteam_roe", slug: "red-team-rules-of-engagement", name: "Red Team Rules of Engagement",
        description: "Operational rules for adversary emulation.",
        audience: "Red team operators.", purpose: "Govern emulation conduct and abort criteria.",
        sections: [S("title", "Rules of Engagement"), S("authorization", "Authorization"), S("scope", "Targets"), S("constraints", "Prohibited Actions"), S("communications", "Emergency Abort"), S("evidence", "Evidence")],
        addFields: [area("abort", "Emergency abort procedure", { description: "How to immediately halt the campaign." })],
      },
      {
        id: "redteam_objectives", slug: "red-team-campaign-objectives", name: "Campaign Objectives",
        description: "High-level objectives the campaign must achieve.",
        audience: "Client and red team.", purpose: "Align on success criteria.",
        sections: [S("title", "Campaign Objectives"), S("objectives", "Objectives")],
      },
      {
        id: "redteam_threat_actor", slug: "red-team-threat-actor-profile", name: "Threat Actor Profile",
        description: "Profile of the emulated adversary.",
        audience: "Red team.", purpose: "Ground emulation in a realistic adversary.",
        sections: [S("title", "Threat Actor Profile"), S("threat_actor", "Profile")],
      },
      {
        id: "redteam_emulation_plan", slug: "red-team-adversary-emulation-plan", name: "Adversary Emulation Plan",
        description: "Step-by-step emulation plan.",
        audience: "Red team operators.", purpose: "Operationalize the emulation.",
        sections: [S("title", "Adversary Emulation Plan"), S("objectives", "Objectives"), S("methodology", "Approach"), S("attack_scenarios", "Attack Scenarios", { id: "attack_scenarios", kind: "attack_scenarios" })],
      },
      {
        id: "redteam_attack_scenarios", slug: "red-team-attack-scenarios", name: "Attack Scenarios",
        description: "Specific adversarial scenarios to execute.",
        audience: "Red team.", purpose: "Enumerate test scenarios.",
        sections: [S("title", "Attack Scenarios"), S("attack_scenarios", "Scenarios", { id: "attack_scenarios", kind: "attack_scenarios" })],
      },
      {
        id: "redteam_constraints", slug: "red-team-constraints-prohibited-actions", name: "Constraints / Prohibited Actions",
        description: "Actions forbidden during emulation.",
        audience: "Red team.", purpose: "Prevent unsafe emulation.",
        sections: [S("title", "Constraints / Prohibited Actions"), S("constraints", "Prohibited Actions")],
      },
      {
        id: "redteam_abort", slug: "red-team-emergency-abort", name: "Communications & Emergency Abort Procedures",
        description: "How to communicate and abort during a campaign.",
        audience: "Red team and client SOC.", purpose: "Ensure safe coordination.",
        sections: [S("title", "Communications & Emergency Abort"), S("communications", "Communications"), S("constraints", "Abort Triggers", { id: "constraints", kind: "constraints", optional: true })],
      },
      {
        id: "redteam_soc", slug: "red-team-detection-soc-coordination", name: "Detection / SOC Coordination Requirements",
        description: "How detection and SOC coordination is handled.",
        audience: "Client SOC.", purpose: "Align detection goals.",
        sections: [S("title", "Detection / SOC Coordination"), S("communications", "SOC Coordination"), list_section("detectionGoals", "Detection Goals")],
      },
      {
        id: "redteam_evidence", slug: "red-team-evidence-collection", name: "Evidence Collection Requirements",
        description: "What evidence the red team must collect.",
        audience: "Red team.", purpose: "Support validation of emulation.",
        sections: [S("title", "Evidence Collection Requirements"), S("evidence", "Evidence")],
      },
      {
        id: "redteam_report", slug: "red-team-report", name: "Red Team Report",
        description: "Full red team engagement report.",
        audience: "Client security leadership.", purpose: "Document the campaign.",
        sections: [S("title", "Red Team Report"), S("intro", "Overview"), S("objectives", "Objectives"), S("methodology", "Approach"), S("findings", "Findings"), S("recommendations", "Recommendations")],
      },
      {
        id: "redteam_exec", slug: "red-team-executive-summary", name: "Red Team Executive Summary",
        description: "Leadership summary of the campaign.",
        audience: "Executives.", purpose: "Summarize campaign risk.",
        sections: [S("title", "Executive Summary"), S("intro", "Overview"), S("findings", "Outcome", { id: "findings", kind: "findings" })],
      },
      {
        id: "redteam_narrative", slug: "red-team-attack-narrative", name: "Attack Narrative / Timeline",
        description: "Chronological narrative of the campaign.",
        audience: "Technical and leadership.", purpose: "Tell the story of the emulation.",
        sections: [S("title", "Attack Narrative / Timeline"), S("narrative", "Narrative")],
      },
      {
        id: "redteam_findings", slug: "red-team-findings", name: "Red Team Findings",
        description: "Findings from the emulation.",
        audience: "Technical teams.", purpose: "Detail emulation outcomes.",
        sections: [S("title", "Red Team Findings"), S("findings", "Findings")],
      },
      {
        id: "redteam_detection_assessment", slug: "red-team-detection-response-assessment", name: "Detection & Response Assessment",
        description: "How well the client detected and responded.",
        audience: "Blue team.", purpose: "Assess detection coverage.",
        sections: [S("title", "Detection & Response Assessment"), S("findings", "Detection Gaps", { id: "findings", kind: "findings" }), S("recommendations", "Improvements")],
      },
      {
        id: "redteam_remediation", slug: "red-team-remediation", name: "Remediation Recommendations",
        description: "Prioritized fixes from the campaign.",
        audience: "Engineering.", purpose: "Guide remediation.",
        sections: [S("title", "Remediation Recommendations"), S("recommendations", "Remediation", { id: "recommendations", kind: "remediation" })],
      },
      {
        id: "redteam_retest", slug: "red-team-retest-validation", name: "Retest / Validation Report",
        description: "Validation that fixes are effective.",
        audience: "Technical teams.", purpose: "Confirm improvements.",
        sections: [S("title", "Retest / Validation Report"), S("scope", "Validation Scope"), S("findings", "Validation Results", { id: "findings", kind: "findings" })],
      },
    ],
  },

  // C. Vulnerability Assessment -------------------------------------------------
  {
    category: "vulnerability_assessment",
    fields: [
      ...orgFields("client"), ...orgFields("provider"),
      area("objective", "Assessment objective", { mapsTo: "objective" }),
      listF("inScope", "Assets in scope", { mapsTo: "scope", mapsKey: "inScope" }),
      listF("outOfScope", "Out of scope", { mapsTo: "scope", mapsKey: "outOfScope" }),
      dateF("startDate", "Start date", { mapsTo: "schedule", mapsKey: "start" }),
      dateF("endDate", "End date", { mapsTo: "schedule", mapsKey: "end" }),
      text("authorizedBy", "Authorized by", { mapsTo: "authorization", mapsKey: "authorizedBy" }),
      listF("constraints", "Testing constraints", { mapsTo: "constraints" }),
      listF("methodology", "Methodology", { mapsTo: "methodology" }),
      listF("deliverables", "Deliverables", { mapsTo: "reporting", mapsKey: "deliverables" }),
      listF("assumptions", "Assumptions", { mapsTo: "assumptions" }),
    ],
    docs: [
      { id: "va_sow", slug: "vulnerability-assessment-sow", name: "Vulnerability Assessment Statement of Work", description: "Work definition for a vulnerability assessment.", audience: "Client and assessor.", purpose: "Describe the assessment.", sections: [S("title", "Statement of Work"), S("objectives", "Objectives"), S("scope", "Scope"), S("methodology", "Methodology"), S("schedule", "Schedule"), S("reporting", "Deliverables"), S("signoff", "Acceptance")] },
      { id: "va_authorization", slug: "assessment-authorization", name: "Assessment Authorization", description: "Authorization for the assessment.", audience: "Asset owners.", purpose: "Evidence authorization.", sections: [S("title", "Assessment Authorization"), S("authorization", "Authorization"), S("scope", "Assets"), S("signoff", "Signature")] },
      { id: "va_scope", slug: "assessment-scope-asset-inventory", name: "Assessment Scope & Asset Inventory", description: "Scope and inventory of assessed assets.", audience: "Technical teams.", purpose: "Define assessed assets.", sections: [S("title", "Scope & Asset Inventory"), S("scope", "Scope"), S("asset_inventory", "Asset Inventory", { id: "asset_inventory", kind: "asset_inventory" })] },
      { id: "va_methodology", slug: "assessment-methodology", name: "Assessment Methodology", description: "How the assessment is performed.", audience: "Assessors.", purpose: "Describe method.", sections: [S("title", "Methodology"), S("methodology", "Methodology")] },
      { id: "va_schedule", slug: "assessment-schedule", name: "Assessment Schedule", description: "Timeline of the assessment.", audience: "Operations.", purpose: "Coordinate timing.", sections: [S("title", "Schedule"), S("schedule", "Schedule")] },
      { id: "va_constraints", slug: "assessment-constraints", name: "Testing Constraints", description: "Constraints on testing.", audience: "Assessors.", purpose: "Limit risk.", sections: [S("title", "Testing Constraints"), S("constraints", "Constraints")] },
      { id: "va_severity", slug: "vulnerability-severity-model", name: "Vulnerability Severity Model", description: "How vulnerabilities are rated.", audience: "Stakeholders.", purpose: "Define rating scale.", sections: [S("title", "Severity Model"), S("severity_model", "Severity Model", { id: "severity_model", kind: "severity_model" })] },
      { id: "va_findings", slug: "vulnerability-findings-report", name: "Vulnerability Findings Report", description: "Report of identified vulnerabilities.", audience: "Technical teams.", purpose: "Detail findings.", sections: [S("title", "Vulnerability Findings Report"), S("methodology", "Methodology"), S("findings", "Findings"), S("severity_model", "Severity Model", { id: "severity_model", kind: "severity_model", optional: true })] },
      { id: "va_exec", slug: "vulnerability-executive-summary", name: "Vulnerability Executive Summary", description: "Leadership summary of vulnerabilities.", audience: "Executives.", purpose: "Summarize risk.", sections: [S("title", "Executive Summary"), S("intro", "Overview"), S("findings", "Findings", { id: "findings", kind: "findings" })] },
      { id: "va_technical", slug: "technical-vulnerability-report", name: "Technical Vulnerability Report", description: "Technical detail of vulnerabilities.", audience: "Engineering.", purpose: "Provide remediation detail.", sections: [S("title", "Technical Vulnerability Report"), S("findings", "Findings"), S("evidence", "Evidence", { optional: true })] },
      { id: "va_remediation", slug: "vulnerability-remediation-plan", name: "Remediation Plan", description: "Plan to remediate vulnerabilities.", audience: "Engineering.", purpose: "Guide fixes.", sections: [S("title", "Remediation Plan"), S("recommendations", "Remediation", { id: "recommendations", kind: "remediation" })] },
      { id: "va_retest", slug: "vulnerability-validation-retest", name: "Validation / Retest Report", description: "Validation of remediation.", audience: "Technical teams.", purpose: "Confirm fixes.", sections: [S("title", "Validation / Retest Report"), S("scope", "Validation Scope"), S("findings", "Results", { id: "findings", kind: "findings" })] },
    ],
  },

  // D. Security Assessment ------------------------------------------------------
  {
    category: "security_assessment",
    fields: [
      ...orgFields("client"), ...orgFields("provider"),
      area("objective", "Assessment objective", { mapsTo: "objective" }),
      listF("inScope", "Systems in scope", { mapsTo: "scope", mapsKey: "inScope" }),
      listF("outOfScope", "Out of scope", { mapsTo: "scope", mapsKey: "outOfScope" }),
      dateF("startDate", "Start date", { mapsTo: "schedule", mapsKey: "start" }),
      dateF("endDate", "End date", { mapsTo: "schedule", mapsKey: "end" }),
      text("authorizedBy", "Authorized by", { mapsTo: "authorization", mapsKey: "authorizedBy" }),
      listF("methodology", "Methodology", { mapsTo: "methodology" }),
      listF("criteria", "Assessment criteria", { description: "Control families or standards assessed." }),
      listF("evidence", "Evidence requirements", { mapsTo: "evidence" }),
      listF("deliverables", "Deliverables", { mapsTo: "reporting", mapsKey: "deliverables" }),
      listF("assumptions", "Assumptions", { mapsTo: "assumptions" }),
    ],
    docs: [
      { id: "sa_plan", slug: "security-assessment-plan", name: "Security Assessment Plan", description: "Plan for a security assessment.", audience: "Client and assessor.", purpose: "Define the assessment plan.", sections: [S("title", "Security Assessment Plan"), S("objectives", "Objectives"), S("scope", "Scope"), S("methodology", "Methodology"), S("schedule", "Schedule"), S("criteria", "Criteria", { id: "criteria", kind: "criteria" })] },
      { id: "sa_scope", slug: "security-assessment-scope", name: "Security Assessment Scope", description: "Scope of the security assessment.", audience: "Technical leads.", purpose: "Clarify boundaries.", sections: [S("title", "Scope"), S("scope", "Scope"), S("exclusions", "Exclusions")] },
      { id: "sa_authorization", slug: "assessment-authorization", name: "Assessment Authorization", description: "Authorization for the assessment.", audience: "Leadership.", purpose: "Evidence authorization.", sections: [S("title", "Authorization"), S("authorization", "Authorization"), S("signoff", "Sign-off")] },
      { id: "sa_methodology", slug: "security-assessment-methodology", name: "Security Assessment Methodology", description: "How the assessment is performed.", audience: "Assessors.", purpose: "Describe the approach.", sections: [S("title", "Methodology"), S("methodology", "Methodology")] },
      { id: "sa_requirements", slug: "security-requirements-for-assessment", name: "Security Requirements for Assessment", description: "Requirements the assessment evaluates.", audience: "Stakeholders.", purpose: "State requirements.", sections: [S("title", "Security Requirements"), S("security_requirements", "Requirements", { id: "security_requirements", kind: "security_requirements" })] },
      { id: "sa_evidence", slug: "assessment-evidence-requirements", name: "Evidence Requirements", description: "Evidence the assessment needs.", audience: "Assessors.", purpose: "Define evidence.", sections: [S("title", "Evidence Requirements"), S("evidence", "Evidence")] },
      { id: "sa_criteria", slug: "assessment-criteria", name: "Assessment Criteria", description: "Standards used to assess.", audience: "Stakeholders.", purpose: "Define criteria.", sections: [S("title", "Assessment Criteria"), S("criteria", "Criteria", { id: "criteria", kind: "criteria" })] },
      { id: "sa_risk_method", slug: "risk-rating-methodology", name: "Risk Rating Methodology", description: "How risk is rated.", audience: "Stakeholders.", purpose: "Define risk scale.", sections: [S("title", "Risk Rating Methodology"), S("severity_model", "Risk Scale", { id: "severity_model", kind: "severity_model" })] },
      { id: "sa_findings", slug: "security-assessment-findings", name: "Security Assessment Findings", description: "Findings from the assessment.", audience: "Technical teams.", purpose: "Detail findings.", sections: [S("title", "Findings"), S("findings", "Findings"), S("risk", "Risk Summary", { id: "risk", kind: "risk", optional: true })] },
      { id: "sa_risk_register", slug: "risk-register", name: "Risk Register", description: "Register of identified risks.", audience: "Risk owners.", purpose: "Track risks.", sections: [S("title", "Risk Register"), S("risk", "Risks", { id: "risk", kind: "risk" })] },
      { id: "sa_remediation", slug: "security-assessment-remediation", name: "Remediation Plan", description: "Plan to remediate gaps.", audience: "Engineering.", purpose: "Guide fixes.", sections: [S("title", "Remediation Plan"), S("recommendations", "Remediation", { id: "recommendations", kind: "remediation" })] },
      { id: "sa_final", slug: "final-security-assessment-report", name: "Final Security Assessment Report", description: "Consolidated assessment report.", audience: "Leadership and technical.", purpose: "Document the assessment.", sections: [S("title", "Final Security Assessment Report"), S("intro", "Executive Context"), S("scope", "Scope"), S("methodology", "Methodology"), S("findings", "Findings"), S("risk", "Risk", { id: "risk", kind: "risk" }), S("recommendations", "Recommendations")] },
      { id: "sa_exec", slug: "security-assessment-executive-summary", name: "Security Assessment Executive Summary", description: "Leadership summary.", audience: "Executives.", purpose: "Summarize posture.", sections: [S("title", "Executive Summary"), S("intro", "Overview"), S("findings", "Findings", { id: "findings", kind: "findings" })] },
      { id: "sa_signoff", slug: "assessment-sign-off", name: "Assessment Sign-off", description: "Formal acceptance of the assessment.", audience: "Client.", purpose: "Record acceptance.", sections: [S("title", "Sign-off"), S("signoff", "Sign-off")] },
    ],
  },

  // E. Cloud Security Assessment ------------------------------------------------
  {
    category: "cloud_security_assessment",
    fields: [
      ...orgFields("client"), ...orgFields("provider"),
      area("objective", "Assessment objective", { mapsTo: "objective" }),
      listF("inScope", "Cloud accounts / subscriptions / projects", { mapsTo: "scope", mapsKey: "inScope" }),
      listF("outOfScope", "Out of scope", { mapsTo: "scope", mapsKey: "outOfScope" }),
      dateF("startDate", "Start date", { mapsTo: "schedule", mapsKey: "start" }),
      dateF("endDate", "End date", { mapsTo: "schedule", mapsKey: "end" }),
      text("authorizedBy", "Authorized by", { mapsTo: "authorization", mapsKey: "authorizedBy" }),
      listF("methodology", "Assessment methodology", { mapsTo: "methodology" }),
      listF("evidence", "Evidence requirements", { mapsTo: "evidence" }),
      listF("deliverables", "Deliverables", { mapsTo: "reporting", mapsKey: "deliverables" }),
      listF("assumptions", "Assumptions", { mapsTo: "assumptions" }),
    ],
    docs: [
      { id: "csa_sow", slug: "cloud-security-assessment-sow", name: "Cloud Security Assessment Statement of Work", description: "Work definition for a cloud security assessment.", audience: "Client cloud team.", purpose: "Describe the assessment.", sections: [S("title", "Statement of Work"), S("objectives", "Objectives"), S("scope", "Scope"), S("methodology", "Methodology"), S("schedule", "Schedule"), S("reporting", "Deliverables"), S("signoff", "Acceptance")] },
      { id: "csa_authorization", slug: "cloud-assessment-authorization", name: "Cloud Assessment Authorization", description: "Authorization for cloud assessment.", audience: "Cloud account owners.", purpose: "Evidence authorization.", sections: [S("title", "Authorization"), S("authorization", "Authorization"), S("scope", "Environments"), S("signoff", "Signature")] },
      { id: "csa_scope", slug: "cloud-environment-scope", name: "Cloud Environment Scope", description: "Scope of cloud environments.", audience: "Cloud team.", purpose: "Define cloud scope.", sections: [S("title", "Cloud Environment Scope"), S("scope", "Environments")] },
      { id: "csa_inventory", slug: "cloud-account-inventory", name: "Account / Subscription / Project Inventory", description: "Inventory of cloud accounts.", audience: "Cloud team.", purpose: "Enumerate accounts.", sections: [S("title", "Account Inventory"), S("asset_inventory", "Accounts", { id: "asset_inventory", kind: "asset_inventory" })] },
      { id: "csa_methodology", slug: "cloud-assessment-methodology", name: "Cloud Assessment Methodology", description: "How the cloud assessment is performed.", audience: "Assessors.", purpose: "Describe method.", sections: [S("title", "Methodology"), S("methodology", "Methodology")] },
      { id: "csa_config", slug: "cloud-configuration-requirements", name: "Cloud Configuration Requirements", description: "Configuration expectations reviewed.", audience: "Cloud team.", purpose: "State config baseline.", sections: [S("title", "Configuration Requirements"), S("criteria", "Configuration Criteria", { id: "criteria", kind: "criteria" })] },
      { id: "csa_identity", slug: "cloud-identity-access-review", name: "Identity & Access Review", description: "Review of cloud identity and access.", audience: "Cloud security.", purpose: "Assess IAM.", sections: [S("title", "Identity & Access Review"), S("findings", "IAM Findings", { id: "findings", kind: "findings" })] },
      { id: "csa_network", slug: "cloud-network-security-review", name: "Network Security Review", description: "Review of cloud network controls.", audience: "Cloud security.", purpose: "Assess network.", sections: [S("title", "Network Security Review"), S("findings", "Network Findings", { id: "findings", kind: "findings" })] },
      { id: "csa_data", slug: "cloud-data-security-review", name: "Data Security Review", description: "Review of cloud data protection.", audience: "Cloud security.", purpose: "Assess data controls.", sections: [S("title", "Data Security Review"), S("findings", "Data Findings", { id: "findings", kind: "findings" })] },
      { id: "csa_logging", slug: "cloud-logging-monitoring-review", name: "Logging / Monitoring Review", description: "Review of cloud logging and monitoring.", audience: "Cloud security.", purpose: "Assess observability.", sections: [S("title", "Logging / Monitoring Review"), S("findings", "Logging Findings", { id: "findings", kind: "findings" })] },
      { id: "csa_findings", slug: "cloud-security-findings", name: "Cloud Security Findings", description: "Consolidated cloud findings.", audience: "Cloud team.", purpose: "Detail findings.", sections: [S("title", "Cloud Security Findings"), S("findings", "Findings"), S("risk", "Risk Summary", { id: "risk", kind: "risk", optional: true })] },
      { id: "csa_risk", slug: "cloud-risk-assessment", name: "Cloud Risk Assessment", description: "Risk assessment of cloud findings.", audience: "Risk owners.", purpose: "Rate cloud risk.", sections: [S("title", "Cloud Risk Assessment"), S("risk", "Risk", { id: "risk", kind: "risk" })] },
      { id: "csa_remediation", slug: "cloud-remediation-plan", name: "Cloud Remediation Plan", description: "Plan to remediate cloud issues.", audience: "Cloud engineering.", purpose: "Guide fixes.", sections: [S("title", "Cloud Remediation Plan"), S("recommendations", "Remediation", { id: "recommendations", kind: "remediation" })] },
      { id: "csa_final", slug: "final-cloud-security-assessment-report", name: "Final Cloud Security Assessment Report", description: "Consolidated cloud assessment report.", audience: "Leadership and cloud team.", purpose: "Document the assessment.", sections: [S("title", "Final Cloud Security Assessment Report"), S("intro", "Overview"), S("scope", "Scope"), S("methodology", "Methodology"), S("findings", "Findings"), S("risk", "Risk", { id: "risk", kind: "risk" }), S("recommendations", "Recommendations")] },
      { id: "csa_retest", slug: "cloud-retest-validation", name: "Cloud Retest / Validation Report", description: "Validation of cloud remediation.", audience: "Cloud team.", purpose: "Confirm fixes.", sections: [S("title", "Cloud Retest / Validation Report"), S("scope", "Validation Scope"), S("findings", "Results", { id: "findings", kind: "findings" })] },
    ],
  },

  // F. Security Architecture Review --------------------------------------------
  {
    category: "security_architecture_review",
    fields: [
      ...orgFields("client"), ...orgFields("provider"),
      area("systemDescription", "System / application description", { description: "What the system does and its components." }),
      area("objective", "Security objectives", { mapsTo: "objective" }),
      area("trustBoundaries", "Trust boundary description", { description: "Boundaries between trusted and untrusted domains." }),
      listF("inScope", "Components in scope", { mapsTo: "scope", mapsKey: "inScope" }),
      dateF("startDate", "Review start", { mapsTo: "schedule", mapsKey: "start" }),
      dateF("endDate", "Review end", { mapsTo: "schedule", mapsKey: "end" }),
      text("authorizedBy", "Authorized by", { mapsTo: "authorization", mapsKey: "authorizedBy" }),
      listF("methodology", "Review methodology", { mapsTo: "methodology" }),
      listF("criteria", "Review criteria", { description: "Principles or standards applied." }),
      listF("deliverables", "Deliverables", { mapsTo: "reporting", mapsKey: "deliverables" }),
      listF("assumptions", "Assumptions", { mapsTo: "assumptions" }),
    ],
    docs: [
      { id: "arch_sow", slug: "architecture-review-sow", name: "Architecture Review Statement of Work", description: "Work definition for an architecture review.", audience: "Client architecture team.", purpose: "Describe the review.", sections: [S("title", "Statement of Work"), S("objectives", "Security Objectives"), S("scope", "Scope"), S("methodology", "Methodology"), S("schedule", "Schedule"), S("reporting", "Deliverables"), S("signoff", "Acceptance")] },
      { id: "arch_scope", slug: "architecture-review-scope", name: "Architecture Review Scope", description: "Scope of the architecture review.", audience: "Architects.", purpose: "Define scope.", sections: [S("title", "Scope"), S("scope", "Scope"), S("asset_inventory", "Components", { id: "asset_inventory", kind: "asset_inventory" })] },
      { id: "arch_description", slug: "system-application-description", name: "System / Application Description", description: "Description of the system under review.", audience: "Architects.", purpose: "Document the system.", sections: [S("title", "System / Application Description"), S("custom", "Description", { id: "system_description", kind: "custom", guidance: "Describe the system, its components, data and users." })] },
      { id: "arch_docs", slug: "architecture-documentation-requirements", name: "Architecture Documentation Requirements", description: "Documentation the review requires.", audience: "Architects.", purpose: "Define docs needed.", sections: [S("title", "Documentation Requirements"), S("criteria", "Required Documentation", { id: "criteria", kind: "criteria" })] },
      { id: "arch_objectives", slug: "security-objectives", name: "Security Objectives", description: "Security objectives for the system.", audience: "Stakeholders.", purpose: "State objectives.", sections: [S("title", "Security Objectives"), S("objectives", "Objectives")] },
      { id: "arch_trust", slug: "trust-boundary-description", name: "Trust Boundary Description", description: "Description of trust boundaries.", audience: "Architects.", purpose: "Clarify boundaries.", sections: [S("title", "Trust Boundaries"), S("trust_boundaries", "Trust Boundaries", { id: "trust_boundaries", kind: "trust_boundaries" })] },
      { id: "arch_threat", slug: "threat-model-architecture-review", name: "Threat Model for Architecture Review", description: "Threat model of the architecture.", audience: "Architects.", purpose: "Identify threats.", sections: [S("title", "Threat Model"), S("threat_catalog", "Threats", { id: "threat_catalog", kind: "threat_catalog" }), S("trust_boundaries", "Trust Boundaries", { id: "trust_boundaries", kind: "trust_boundaries", optional: true })] },
      { id: "arch_criteria", slug: "architecture-review-criteria", name: "Architecture Review Criteria", description: "Criteria used to judge the architecture.", audience: "Architects.", purpose: "Define criteria.", sections: [S("title", "Review Criteria"), S("criteria", "Criteria", { id: "criteria", kind: "criteria" })] },
      { id: "arch_findings", slug: "architecture-findings", name: "Architecture Findings", description: "Findings from the review.", audience: "Architects.", purpose: "Detail findings.", sections: [S("title", "Architecture Findings"), S("findings", "Findings")] },
      { id: "arch_risk", slug: "architecture-risk-assessment", name: "Architecture Risk Assessment", description: "Risk assessment of architecture findings.", audience: "Risk owners.", purpose: "Rate risk.", sections: [S("title", "Architecture Risk Assessment"), S("risk", "Risk", { id: "risk", kind: "risk" })] },
      { id: "arch_recommendations", slug: "security-recommendations", name: "Security Recommendations", description: "Recommendations for the architecture.", audience: "Architects.", purpose: "Guide improvements.", sections: [S("title", "Security Recommendations"), S("recommendations", "Recommendations", { id: "recommendations", kind: "recommendations" })] },
      { id: "arch_report", slug: "security-architecture-review-report", name: "Security Architecture Review Report", description: "Consolidated architecture review report.", audience: "Leadership and architects.", purpose: "Document the review.", sections: [S("title", "Security Architecture Review Report"), S("intro", "Overview"), S("scope", "Scope"), S("findings", "Findings"), S("risk", "Risk", { id: "risk", kind: "risk" }), S("recommendations", "Recommendations")] },
      { id: "arch_signoff", slug: "architecture-review-sign-off", name: "Architecture Review Sign-off", description: "Acceptance of the review.", audience: "Client.", purpose: "Record acceptance.", sections: [S("title", "Sign-off"), S("signoff", "Sign-off")] },
    ],
  },

  // G. Threat Modeling ---------------------------------------------------------
  {
    category: "threat_modeling",
    fields: [
      ...orgFields("client"),
      area("systemDescription", "System description", { description: "Describe the system and its purpose." }),
      listF("assets", "Assets", { description: "Assets the system must protect." }),
      listF("actors", "Actors", { description: "Internal and external actors." }),
      listF("trustBoundaries", "Trust boundaries", { description: "Boundaries between trust levels." }),
      listF("dataFlows", "Data flows", { description: "How data moves through the system." }),
      listF("entryPoints", "Entry points", { description: "Interfaces exposed to actors." }),
      listF("threats", "Threats", { description: "Threats relevant to the system." }),
      listF("attackScenarios", "Attack scenarios", { description: "Plausible attack paths." }),
      listF("mitigations", "Mitigations", { description: "Controls that reduce risk." }),
      listF("residualRisks", "Residual risks", { description: "Risk remaining after mitigations." }),
      listF("assumptions", "Assumptions", { mapsTo: "assumptions" }),
    ],
    docs: [
      { id: "tm_scope", slug: "threat-modeling-scope", name: "Threat Modeling Scope", description: "Scope of the threat model.", audience: "Architects and engineers.", purpose: "Define scope.", sections: [S("title", "Scope"), S("scope", "Scope"), S("asset_inventory", "Assets", { id: "asset_inventory", kind: "asset_inventory", optional: true })] },
      { id: "tm_system", slug: "threat-model-system-description", name: "System Description", description: "Description of the system.", audience: "Engineers.", purpose: "Document the system.", sections: [S("title", "System Description"), S("custom", "Description", { id: "system_description", kind: "custom", guidance: "Describe the system, users and data." })] },
      { id: "tm_assets", slug: "threat-model-asset-inventory", name: "Asset Inventory", description: "Inventory of assets to protect.", audience: "Engineers.", purpose: "Enumerate assets.", sections: [S("title", "Asset Inventory"), S("asset_inventory", "Assets", { id: "asset_inventory", kind: "asset_inventory" })] },
      { id: "tm_actors", slug: "threat-model-actor-inventory", name: "Actor Inventory", description: "Inventory of actors.", audience: "Engineers.", purpose: "Enumerate actors.", sections: [S("title", "Actor Inventory"), S("actor_inventory", "Actors", { id: "actor_inventory", kind: "actor_inventory" })] },
      { id: "tm_trust", slug: "threat-model-trust-boundaries", name: "Trust Boundaries", description: "Trust boundaries of the system.", audience: "Engineers.", purpose: "Define boundaries.", sections: [S("title", "Trust Boundaries"), S("trust_boundaries", "Trust Boundaries", { id: "trust_boundaries", kind: "trust_boundaries" })] },
      { id: "tm_dataflow", slug: "threat-model-data-flow", name: "Data Flow Description", description: "Data flows in the system.", audience: "Engineers.", purpose: "Describe flows.", sections: [S("title", "Data Flow Description"), S("data_flow", "Data Flows", { id: "data_flow", kind: "data_flow" })] },
      { id: "tm_entry", slug: "threat-model-entry-points", name: "Entry Point Inventory", description: "Entry points into the system.", audience: "Engineers.", purpose: "Enumerate entry points.", sections: [S("title", "Entry Point Inventory"), S("entry_points", "Entry Points", { id: "entry_points", kind: "entry_points" })] },
      { id: "tm_catalog", slug: "threat-model-threat-catalogue", name: "Threat Catalogue", description: "Catalogue of relevant threats.", audience: "Engineers.", purpose: "Enumerate threats.", sections: [S("title", "Threat Catalogue"), S("threat_catalog", "Threats", { id: "threat_catalog", kind: "threat_catalog" })] },
      { id: "tm_scenarios", slug: "threat-model-attack-scenarios", name: "Attack Scenarios", description: "Attack scenarios for the system.", audience: "Engineers.", purpose: "Describe scenarios.", sections: [S("title", "Attack Scenarios"), S("attack_scenarios", "Scenarios", { id: "attack_scenarios", kind: "attack_scenarios" })] },
      { id: "tm_risk", slug: "threat-risk-assessment", name: "Threat Risk Assessment", description: "Assessment of threat risk.", audience: "Risk owners.", purpose: "Rate threat risk.", sections: [S("title", "Threat Risk Assessment"), S("risk", "Risk", { id: "risk", kind: "risk" })] },
      { id: "tm_mitigations", slug: "threat-model-mitigations", name: "Mitigations", description: "Mitigations for identified threats.", audience: "Engineers.", purpose: "Define mitigations.", sections: [S("title", "Mitigations"), S("mitigations", "Mitigations", { id: "mitigations", kind: "mitigations" })] },
      { id: "tm_residual", slug: "threat-model-residual-risk", name: "Residual Risk Assessment", description: "Residual risk after mitigations.", audience: "Risk owners.", purpose: "Assess residual risk.", sections: [S("title", "Residual Risk Assessment"), S("residual_risk", "Residual Risks", { id: "residual_risk", kind: "residual_risk" })] },
      { id: "tm_report", slug: "threat-model-report", name: "Threat Model Report", description: "Consolidated threat model report.", audience: "Architects and engineers.", purpose: "Document the threat model.", sections: [S("title", "Threat Model Report"), S("intro", "Overview"), S("asset_inventory", "Assets", { id: "asset_inventory", kind: "asset_inventory" }), S("actor_inventory", "Actors", { id: "actor_inventory", kind: "actor_inventory" }), S("trust_boundaries", "Trust Boundaries", { id: "trust_boundaries", kind: "trust_boundaries" }), S("data_flow", "Data Flows", { id: "data_flow", kind: "data_flow" }), S("entry_points", "Entry Points", { id: "entry_points", kind: "entry_points" }), S("threat_catalog", "Threats", { id: "threat_catalog", kind: "threat_catalog" }), S("attack_scenarios", "Attack Scenarios", { id: "attack_scenarios", kind: "attack_scenarios" }), S("risk", "Risk", { id: "risk", kind: "risk" }), S("mitigations", "Mitigations", { id: "mitigations", kind: "mitigations" }), S("residual_risk", "Residual Risk", { id: "residual_risk", kind: "residual_risk" })] },
      { id: "tm_signoff", slug: "threat-model-review-sign-off", name: "Threat Model Review / Sign-off", description: "Acceptance of the threat model.", audience: "Client.", purpose: "Record acceptance.", sections: [S("title", "Review / Sign-off"), S("signoff", "Sign-off")] },
    ],
  },

  // H. Digital Forensics -------------------------------------------------------
  {
    category: "digital_forensics",
    fields: [
      ...orgFields("client"), ...orgFields("provider"),
      area("objective", "Investigation objective", { mapsTo: "objective" }),
      listF("inScope", "Systems / evidence in scope", { mapsTo: "scope", mapsKey: "inScope" }),
      dateF("startDate", "Investigation start", { mapsTo: "schedule", mapsKey: "start" }),
      dateF("endDate", "Investigation end", { mapsTo: "schedule", mapsKey: "end" }),
      text("authorizedBy", "Authorized by", { mapsTo: "authorization", mapsKey: "authorizedBy" }),
      dateF("authDate", "Authorization date", { mapsTo: "authorization", mapsKey: "date" }),
      listF("constraints", "Constraints", { mapsTo: "constraints" }),
      listF("methodology", "Examination methodology", { mapsTo: "methodology" }),
      listF("evidence", "Evidence requirements", { mapsTo: "evidence" }),
      listF("deliverables", "Deliverables", { mapsTo: "reporting", mapsKey: "deliverables" }),
      listF("assumptions", "Assumptions", { mapsTo: "assumptions" }),
    ],
    docs: [
      { id: "forensics_agreement", slug: "forensics-engagement-agreement", name: "Forensics Engagement Agreement", description: "Agreement for a forensic engagement.", audience: "Client and forensics provider.", purpose: "Set terms.", sections: [S("title", "Forensics Engagement Agreement"), S("parties", "Parties"), S("authorization", "Authorization"), S("scope", "Scope"), S("constraints", "Constraints"), S("reporting", "Deliverables"), S("signoff", "Sign-off")] },
      { id: "forensics_authorization", slug: "forensics-authorization", name: "Forensics Authorization", description: "Authorization for forensic investigation.", audience: "Client leadership.", purpose: "Evidence authorization.", sections: [S("title", "Authorization"), S("authorization", "Authorization"), S("scope", "Scope"), S("signoff", "Signature")] },
      { id: "forensics_scope", slug: "investigation-scope", name: "Investigation Scope", description: "Scope of the investigation.", audience: "Investigators.", purpose: "Define scope.", sections: [S("title", "Investigation Scope"), S("scope", "Scope"), S("objectives", "Objectives")] },
      { id: "forensics_evidence_plan", slug: "evidence-collection-plan", name: "Evidence Collection Plan", description: "Plan for collecting evidence.", audience: "Investigators.", purpose: "Plan collection.", sections: [S("title", "Evidence Collection Plan"), S("evidence", "Evidence"), S("acquisition", "Acquisition", { id: "acquisition", kind: "acquisition" })] },
      { id: "forensics_handling", slug: "evidence-handling-procedure", name: "Evidence Handling Procedure", description: "How evidence is handled.", audience: "Investigators.", purpose: "Protect integrity.", sections: [S("title", "Evidence Handling Procedure"), S("evidence", "Handling")] },
      { id: "forensics_coc", slug: "chain-of-custody-record", name: "Chain of Custody Record", description: "Record of evidence custody.", audience: "Investigators and legal.", purpose: "Preserve chain of custody.", sections: [S("title", "Chain of Custody Record"), S("chain_of_custody", "Custody Record", { id: "chain_of_custody", kind: "chain_of_custody" })] },
      { id: "forensics_acquisition", slug: "acquisition-plan", name: "Acquisition Plan", description: "Plan for acquiring evidence.", audience: "Investigators.", purpose: "Plan acquisition.", sections: [S("title", "Acquisition Plan"), S("acquisition", "Acquisition", { id: "acquisition", kind: "acquisition" })] },
      { id: "forensics_method", slug: "forensic-examination-methodology", name: "Forensic Examination Methodology", description: "Methodology for examination.", audience: "Investigators.", purpose: "Describe method.", sections: [S("title", "Examination Methodology"), S("methodology", "Methodology")] },
      { id: "forensics_timeline", slug: "investigation-timeline", name: "Investigation Timeline", description: "Timeline of the investigation.", audience: "Investigators.", purpose: "Record timeline.", sections: [S("title", "Investigation Timeline"), S("timeline", "Timeline", { id: "timeline", kind: "timeline" })] },
      { id: "forensics_register", slug: "evidence-register", name: "Evidence Register", description: "Register of collected evidence.", audience: "Investigators.", purpose: "Track evidence.", sections: [S("title", "Evidence Register"), S("chain_of_custody", "Register", { id: "chain_of_custody", kind: "chain_of_custody" })] },
      { id: "forensics_findings", slug: "forensic-findings", name: "Forensic Findings", description: "Findings of the investigation.", audience: "Investigators and legal.", purpose: "Detail findings.", sections: [S("title", "Forensic Findings"), S("findings", "Findings")] },
      { id: "forensics_analysis", slug: "forensic-analysis-report", name: "Forensic Analysis Report", description: "Analysis report of the investigation.", audience: "Legal and client.", purpose: "Document analysis.", sections: [S("title", "Forensic Analysis Report"), S("intro", "Overview"), S("methodology", "Methodology"), S("findings", "Findings"), S("timeline", "Timeline", { id: "timeline", kind: "timeline", optional: true })] },
      { id: "forensics_exec", slug: "forensic-executive-summary", name: "Forensic Executive Summary", description: "Leadership summary.", audience: "Executives.", purpose: "Summarize.", sections: [S("title", "Executive Summary"), S("intro", "Overview"), S("findings", "Findings", { id: "findings", kind: "findings" })] },
      { id: "forensics_conclusions", slug: "forensic-conclusions-recommendations", name: "Forensic Conclusions / Recommendations", description: "Conclusions and recommendations.", audience: "Client.", purpose: "Conclude and advise.", sections: [S("title", "Conclusions / Recommendations"), S("recommendations", "Recommendations", { id: "recommendations", kind: "recommendations" })] },
    ],
  },

  // I. Incident Response -------------------------------------------------------
  {
    category: "incident_response",
    fields: [
      ...orgFields("client"),
      area("objective", "Program objective", { mapsTo: "objective" }),
      peopleF("team", "Response team roles", { description: "Roles and responsibilities for response." }),
      listF("escalation", "Escalation steps", { description: "Steps to escalate an incident." }),
      listF("triage", "Triage steps", { description: "How incidents are detected and prioritized." }),
      listF("containment", "Containment actions", { description: "Short and long term containment." }),
      listF("eradication", "Eradication actions", { description: "How threats are removed." }),
      listF("recovery", "Recovery actions", { description: "How services are restored." }),
      listF("constraints", "Evidence preservation constraints", { mapsTo: "constraints" }),
      listF("deliverables", "Reporting deliverables", { mapsTo: "reporting", mapsKey: "deliverables" }),
      listF("assumptions", "Assumptions", { mapsTo: "assumptions" }),
    ],
    docs: [
      { id: "ir_plan", slug: "incident-response-plan", name: "Incident Response Plan", description: "Overall incident response plan.", audience: "Security and ops teams.", purpose: "Define response process.", sections: [S("title", "Incident Response Plan"), S("classification", "Classification Matrix", { id: "classification", kind: "classification" }), S("roles", "Roles & Responsibilities"), S("escalation", "Escalation", { id: "escalation", kind: "escalation" }), S("communications", "Communications"), S("triage", "Triage", { id: "triage", kind: "triage" }), S("containment", "Containment", { id: "containment", kind: "containment" }), S("eradication", "Eradication", { id: "eradication", kind: "eradication" }), S("recovery", "Recovery", { id: "recovery", kind: "recovery" }), S("evidence", "Evidence Preservation", { id: "evidence", kind: "evidence", optional: true })] },
      { id: "ir_classification", slug: "incident-classification-matrix", name: "Incident Classification Matrix", description: "How incidents are classified.", audience: "Response team.", purpose: "Define severity.", sections: [S("title", "Incident Classification Matrix"), S("classification", "Matrix", { id: "classification", kind: "classification" })] },
      { id: "ir_roles", slug: "incident-response-roles", name: "Incident Response Roles & Responsibilities", description: "Roles for response.", audience: "Response team.", purpose: "Assign roles.", sections: [S("title", "Roles & Responsibilities"), S("roles", "Roles")] },
      { id: "ir_contact", slug: "contact-escalation-matrix", name: "Contact / Escalation Matrix", description: "Contacts and escalation paths.", audience: "Response team.", purpose: "Define contacts.", sections: [S("title", "Contact / Escalation Matrix"), S("contact_matrix", "Contacts", { id: "contact_matrix", kind: "contact_matrix" }), S("escalation", "Escalation", { id: "escalation", kind: "escalation", optional: true })] },
      { id: "ir_communications", slug: "incident-communications-plan", name: "Incident Communications Plan", description: "How incidents are communicated.", audience: "Response team.", purpose: "Define comms.", sections: [S("title", "Communications Plan"), S("communications", "Communications")] },
      { id: "ir_triage", slug: "incident-triage-procedure", name: "Incident Triage Procedure", description: "Triage procedure.", audience: "Responders.", purpose: "Prioritize incidents.", sections: [S("title", "Triage Procedure"), S("triage", "Triage", { id: "triage", kind: "triage" })] },
      { id: "ir_containment", slug: "containment-procedure", name: "Containment Procedure", description: "Containment procedure.", audience: "Responders.", purpose: "Contain incidents.", sections: [S("title", "Containment Procedure"), S("containment", "Containment", { id: "containment", kind: "containment" })] },
      { id: "ir_eradication", slug: "eradication-procedure", name: "Eradication Procedure", description: "Eradication procedure.", audience: "Responders.", purpose: "Remove threats.", sections: [S("title", "Eradication Procedure"), S("eradication", "Eradication", { id: "eradication", kind: "eradication" })] },
      { id: "ir_recovery", slug: "recovery-procedure", name: "Recovery Procedure", description: "Recovery procedure.", audience: "Responders.", purpose: "Restore services.", sections: [S("title", "Recovery Procedure"), S("recovery", "Recovery", { id: "recovery", kind: "recovery" })] },
      { id: "ir_evidence", slug: "evidence-preservation-procedure", name: "Evidence Preservation Procedure", description: "Preserve evidence during response.", audience: "Responders.", purpose: "Protect evidence.", sections: [S("title", "Evidence Preservation Procedure"), S("evidence", "Evidence", { id: "evidence", kind: "evidence" })] },
      { id: "ir_record", slug: "incident-record", name: "Incident Record", description: "Record of an incident.", audience: "Responders.", purpose: "Log the incident.", sections: [S("title", "Incident Record"), S("timeline", "Record", { id: "timeline", kind: "timeline" }), S("findings", "Findings", { id: "findings", kind: "findings", optional: true })] },
      { id: "ir_timeline", slug: "incident-timeline", name: "Incident Timeline", description: "Timeline of an incident.", audience: "Responders.", purpose: "Record sequence.", sections: [S("title", "Incident Timeline"), S("timeline", "Timeline", { id: "timeline", kind: "timeline" })] },
      { id: "ir_report", slug: "incident-report", name: "Incident Report", description: "Report of an incident.", audience: "Stakeholders.", purpose: "Document the incident.", sections: [S("title", "Incident Report"), S("intro", "Summary"), S("timeline", "Timeline", { id: "timeline", kind: "timeline" }), S("findings", "Findings", { id: "findings", kind: "findings" }), S("recommendations", "Recommendations", { id: "recommendations", kind: "recommendations" })] },
      { id: "ir_post", slug: "post-incident-review", name: "Post-Incident Review", description: "Review after an incident.", audience: "Response team.", purpose: "Improve response.", sections: [S("title", "Post-Incident Review"), S("findings", "Review", { id: "findings", kind: "findings" })] },
      { id: "ir_lessons", slug: "lessons-learned", name: "Lessons Learned", description: "Lessons learned from an incident.", audience: "Response team.", purpose: "Capture lessons.", sections: [S("title", "Lessons Learned"), S("recommendations", "Lessons", { id: "recommendations", kind: "recommendations" })] },
      { id: "ir_corrective", slug: "corrective-action-plan", name: "Corrective Action Plan", description: "Plan to correct root causes.", audience: "Response team.", purpose: "Drive fixes.", sections: [S("title", "Corrective Action Plan"), S("recommendations", "Corrective Actions", { id: "recommendations", kind: "recommendations" })] },
    ],
  },

  // J. Vulnerability Disclosure ------------------------------------------------
  {
    category: "vulnerability_disclosure",
    fields: [
      ...orgFields("client"),
      listF("inScope", "Disclosure scope / eligible programs", { mapsTo: "scope", mapsKey: "inScope" }),
      listF("eligibleAssets", "Eligible assets", { description: "Assets covered by the policy." }),
      listF("outOfScopeActions", "Out-of-scope activities", { description: "Activities not permitted." }),
      listF("researcherRules", "Researcher rules", { description: "Rules researchers must follow." }),
      listF("safeHarbor", "Safe harbor terms", { description: "Legal protections for researchers." }),
      listF("severityClassification", "Severity classification", { description: "How severity is rated." }),
      listF("responseSla", "Response SLA", { description: "Timelines for acknowledgement and fix." }),
      listF("coordinatedDisclosure", "Coordinated disclosure steps", { description: "How coordinated disclosure works." }),
      listF("assumptions", "Assumptions", { mapsTo: "assumptions" }),
    ],
    docs: [
      { id: "vd_policy", slug: "vulnerability-disclosure-policy", name: "Vulnerability Disclosure Policy", description: "Policy for disclosing vulnerabilities.", audience: "Researchers and public.", purpose: "Set disclosure expectations.", sections: [S("title", "Vulnerability Disclosure Policy"), S("scope", "Scope"), S("eligible_assets_section", "Eligible Assets", { id: "eligible_assets", kind: "asset_inventory" }), S("out_of_scope_section", "Out-of-Scope Activities", { id: "out_of_scope", kind: "exclusions" }), S("safe_harbor", "Safe Harbor", { id: "safe_harbor", kind: "safe_harbor" }), S("coordinated_disclosure", "Coordinated Disclosure", { id: "coordinated_disclosure", kind: "coordinated_disclosure" })] },
      { id: "vd_procedure", slug: "vulnerability-reporting-procedure", name: "Vulnerability Reporting Procedure", description: "How to report a vulnerability.", audience: "Researchers.", purpose: "Guide reporting.", sections: [S("title", "Reporting Procedure"), S("communications", "How to Report"), S("response_sla", "Response SLA", { id: "response_sla", kind: "custom" }), S("coordinated_disclosure", "Coordinated Disclosure", { id: "coordinated_disclosure", kind: "coordinated_disclosure" })] },
      { id: "vd_scope", slug: "disclosure-scope", name: "Disclosure Scope", description: "Scope of the disclosure program.", audience: "Researchers.", purpose: "Define scope.", sections: [S("title", "Disclosure Scope"), S("scope", "Scope")] },
      { id: "vd_eligible", slug: "eligible-assets", name: "Eligible Assets", description: "Assets covered.", audience: "Researchers.", purpose: "List covered assets.", sections: [S("title", "Eligible Assets"), S("eligible_assets", "Assets", { id: "eligible_assets", kind: "asset_inventory" })] },
      { id: "vd_outofscope", slug: "out-of-scope-activities", name: "Out-of-Scope Activities", description: "Activities not allowed.", audience: "Researchers.", purpose: "List prohibited acts.", sections: [S("title", "Out-of-Scope Activities"), S("out_of_scope", "Prohibited", { id: "out_of_scope", kind: "exclusions" })] },
      { id: "vd_rules", slug: "researcher-rules", name: "Researcher Rules", description: "Rules for researchers.", audience: "Researchers.", purpose: "Define rules.", sections: [S("title", "Researcher Rules"), S("researcher_rules", "Rules", { id: "researcher_rules", kind: "custom" })] },
      { id: "vd_safeharbor", slug: "safe-harbor-terms", name: "Safe Harbor Terms", description: "Legal safe harbor for researchers.", audience: "Researchers and legal.", purpose: "Protect researchers.", sections: [S("title", "Safe Harbor Terms"), S("safe_harbor", "Terms", { id: "safe_harbor", kind: "safe_harbor" })] },
      { id: "vd_severity", slug: "severity-classification", name: "Severity Classification", description: "How severity is rated.", audience: "Researchers.", purpose: "Define severity.", sections: [S("title", "Severity Classification"), S("severity_model", "Severity", { id: "severity_model", kind: "severity_model" })] },
      { id: "vd_sla", slug: "response-sla", name: "Response SLA", description: "Response timelines.", audience: "Researchers.", purpose: "Set expectations.", sections: [S("title", "Response SLA"), S("response_sla", "SLA", { id: "response_sla", kind: "custom" })] },
      { id: "vd_coordinated", slug: "coordinated-disclosure-procedure", name: "Coordinated Disclosure Procedure", description: "Coordinated disclosure workflow.", audience: "Researchers.", purpose: "Define workflow.", sections: [S("title", "Coordinated Disclosure Procedure"), S("coordinated_disclosure", "Procedure", { id: "coordinated_disclosure", kind: "coordinated_disclosure" })] },
      { id: "vd_template", slug: "vulnerability-report-template", name: "Vulnerability Report Template", description: "Template for reports.", audience: "Researchers.", purpose: "Standardize reports.", sections: [S("title", "Vulnerability Report Template"), S("custom", "Template", { id: "report_template", kind: "custom", guidance: "Provide a structured template researchers should follow." })] },
      { id: "vd_templates", slug: "researcher-communication-templates", name: "Researcher Communication Templates", description: "Templates for researcher communication.", audience: "Program owners.", purpose: "Standardize comms.", sections: [S("title", "Researcher Communication Templates"), S("custom", "Templates", { id: "comms_templates", kind: "custom", guidance: "Provide acknowledgement and resolution templates." })] },
    ],
  },

  // K. Bug Bounty --------------------------------------------------------------
  {
    category: "bug_bounty",
    fields: [
      ...orgFields("client"),
      listF("inScope", "In-scope assets", { mapsTo: "scope", mapsKey: "inScope" }),
      listF("outOfScopeAssets", "Out-of-scope assets", { description: "Assets excluded." }),
      listF("rules", "Program rules", { description: "Rules researchers must follow." }),
      listF("submissionRequirements", "Submission requirements", { description: "What a valid report needs." }),
      listF("severityClassification", "Severity / reward matrix", { description: "Severity and reward mapping." }),
      listF("safeHarbor", "Safe harbor", { description: "Legal protections." }),
      listF("disclosurePolicy", "Disclosure policy", { description: "How disclosure is handled." }),
      listF("triageProcedure", "Triage procedure", { description: "How reports are triaged." }),
      listF("duplicateHandling", "Duplicate handling", { description: "How duplicates are handled." }),
      listF("assumptions", "Assumptions", { mapsTo: "assumptions" }),
    ],
    docs: [
      { id: "bb_policy", slug: "bug-bounty-program-policy", name: "Bug Bounty Program Policy", description: "Overall bug bounty policy.", audience: "Researchers and public.", purpose: "Set program expectations.", sections: [S("title", "Bug Bounty Program Policy"), S("scope", "Scope"), S("out_of_scope_assets", "Out-of-Scope Assets", { id: "out_of_scope", kind: "exclusions" }), S("rules", "Program Rules", { id: "rules", kind: "custom" }), S("safe_harbor", "Safe Harbor", { id: "safe_harbor", kind: "safe_harbor" }), S("disclosure_policy", "Disclosure Policy", { id: "disclosure_policy", kind: "custom" })] },
      { id: "bb_scope", slug: "bug-bounty-program-scope", name: "Program Scope", description: "Scope of the bounty program.", audience: "Researchers.", purpose: "Define scope.", sections: [S("title", "Program Scope"), S("scope", "In Scope"), S("out_of_scope_assets", "Out of Scope", { id: "out_of_scope", kind: "exclusions" })] },
      { id: "bb_inscope", slug: "bug-bounty-in-scope-assets", name: "In-Scope Assets", description: "Assets covered by the program.", audience: "Researchers.", purpose: "List covered assets.", sections: [S("title", "In-Scope Assets"), S("scope", "Assets")] },
      { id: "bb_outscope", slug: "bug-bounty-out-of-scope-assets", name: "Out-of-Scope Assets", description: "Assets not covered.", audience: "Researchers.", purpose: "List excluded assets.", sections: [S("title", "Out-of-Scope Assets"), S("out_of_scope", "Assets", { id: "out_of_scope", kind: "exclusions" })] },
      { id: "bb_rules", slug: "bug-bounty-program-rules", name: "Program Rules", description: "Rules researchers must follow.", audience: "Researchers.", purpose: "Define rules.", sections: [S("title", "Program Rules"), S("rules", "Rules", { id: "rules", kind: "custom" })] },
      { id: "bb_submission", slug: "bug-bounty-submission-requirements", name: "Submission Requirements", description: "What a valid submission requires.", audience: "Researchers.", purpose: "Define requirements.", sections: [S("title", "Submission Requirements"), S("submission_requirements", "Requirements", { id: "submission_requirements", kind: "submission_requirements" })] },
      { id: "bb_matrix", slug: "bug-bounty-severity-reward-matrix", name: "Severity / Reward Matrix", description: "Severity and reward mapping.", audience: "Researchers.", purpose: "Define rewards.", sections: [S("title", "Severity / Reward Matrix"), S("reward_matrix", "Matrix", { id: "reward_matrix", kind: "reward_matrix" })] },
      { id: "bb_safeharbor", slug: "bug-bounty-safe-harbor", name: "Safe Harbor", description: "Legal safe harbor for researchers.", audience: "Researchers and legal.", purpose: "Protect researchers.", sections: [S("title", "Safe Harbor"), S("safe_harbor", "Terms", { id: "safe_harbor", kind: "safe_harbor" })] },
      { id: "bb_disclosure", slug: "bug-bounty-disclosure-policy", name: "Disclosure Policy", description: "How disclosure is handled.", audience: "Researchers.", purpose: "Define disclosure.", sections: [S("title", "Disclosure Policy"), S("disclosure_policy", "Policy", { id: "disclosure_policy", kind: "custom" })] },
      { id: "bb_triage", slug: "bug-bounty-triage-procedure", name: "Triage Procedure", description: "How reports are triaged.", audience: "Program team.", purpose: "Define triage.", sections: [S("title", "Triage Procedure"), S("triage_procedure", "Triage", { id: "triage_procedure", kind: "custom" })] },
      { id: "bb_duplicate", slug: "bug-bounty-duplicate-handling", name: "Duplicate Handling", description: "How duplicates are handled.", audience: "Program team.", purpose: "Define duplicate policy.", sections: [S("title", "Duplicate Handling"), S("duplicate_handling", "Policy", { id: "duplicate_handling", kind: "duplicate_handling" })] },
      { id: "bb_templates", slug: "bug-bounty-researcher-communication-templates", name: "Researcher Communication Templates", description: "Templates for researcher communication.", audience: "Program owners.", purpose: "Standardize comms.", sections: [S("title", "Researcher Communication Templates"), S("custom", "Templates", { id: "comms_templates", kind: "custom", guidance: "Provide acknowledgement and reward templates." })] },
    ],
  },

  // L. Secure Development / Security Requirements ------------------------------
  {
    category: "secure_development",
    fields: [
      ...orgFields("client"),
      area("objective", "Security requirements objective", { mapsTo: "objective" }),
      listF("securityRequirements", "Security requirements", { description: "Specific security requirements." }),
      listF("assumptions", "Assumptions", { mapsTo: "assumptions" }),
    ],
    docs: [
      { id: "sd_spec", slug: "security-requirements-specification", name: "Security Requirements Specification", description: "Specification of security requirements.", audience: "Product and engineering.", purpose: "Define security requirements.", sections: [S("title", "Security Requirements Specification"), S("objectives", "Objective"), S("security_requirements", "Requirements", { id: "security_requirements", kind: "security_requirements" })] },
      { id: "sd_dev", slug: "secure-development-requirements", name: "Secure Development Requirements", description: "Secure development lifecycle requirements.", audience: "Engineering.", purpose: "Define SDLC requirements.", sections: [S("title", "Secure Development Requirements"), S("security_requirements", "Requirements", { id: "security_requirements", kind: "security_requirements" })] },
      { id: "sd_authn", slug: "authentication-requirements", name: "Authentication Requirements", description: "Authentication requirements.", audience: "Engineering.", purpose: "Define authn requirements.", sections: [S("title", "Authentication Requirements"), S("security_requirements", "Requirements", { id: "security_requirements", kind: "security_requirements" })] },
      { id: "sd_authz", slug: "authorization-requirements", name: "Authorization Requirements", description: "Authorization requirements.", audience: "Engineering.", purpose: "Define authz requirements.", sections: [S("title", "Authorization Requirements"), S("security_requirements", "Requirements", { id: "security_requirements", kind: "security_requirements" })] },
      { id: "sd_crypto", slug: "cryptography-requirements", name: "Cryptography Requirements", description: "Cryptography requirements.", audience: "Engineering.", purpose: "Define crypto requirements.", sections: [S("title", "Cryptography Requirements"), S("security_requirements", "Requirements", { id: "security_requirements", kind: "security_requirements" })] },
      { id: "sd_logging", slug: "logging-monitoring-requirements", name: "Logging & Monitoring Requirements", description: "Logging and monitoring requirements.", audience: "Engineering.", purpose: "Define observability requirements.", sections: [S("title", "Logging & Monitoring Requirements"), S("security_requirements", "Requirements", { id: "security_requirements", kind: "security_requirements" })] },
      { id: "sd_data", slug: "data-protection-requirements", name: "Data Protection Requirements", description: "Data protection requirements.", audience: "Engineering.", purpose: "Define data protection requirements.", sections: [S("title", "Data Protection Requirements"), S("security_requirements", "Requirements", { id: "security_requirements", kind: "security_requirements" })] },
      { id: "sd_acceptance", slug: "security-acceptance-criteria", name: "Security Acceptance Criteria", description: "Criteria for accepting security.", audience: "Product and engineering.", purpose: "Define acceptance.", sections: [S("title", "Security Acceptance Criteria"), S("criteria", "Criteria", { id: "criteria", kind: "criteria" })] },
      { id: "sd_test", slug: "security-test-requirements", name: "Security Test Requirements", description: "Security testing requirements.", audience: "QA and engineering.", purpose: "Define test requirements.", sections: [S("title", "Security Test Requirements"), S("security_requirements", "Requirements", { id: "security_requirements", kind: "security_requirements" })] },
      { id: "sd_arch", slug: "security-architecture-requirements", name: "Security Architecture Requirements", description: "Security architecture requirements.", audience: "Architecture.", purpose: "Define architecture requirements.", sections: [S("title", "Security Architecture Requirements"), S("security_requirements", "Requirements", { id: "security_requirements", kind: "security_requirements" })] },
    ],
  },
];

// Helper used above for a couple of inline section definitions.
function list_section(id: string, title: string): SectionDef {
  return S("custom", title, { id, kind: "custom", guidance: `Define ${title.toLowerCase()}.` });
}

// ---------------------------------------------------------------------------
// Build final DocumentDefinition list
// ---------------------------------------------------------------------------

export const DOCUMENT_DEFINITIONS: DocumentDefinition[] = CATALOG.flatMap((cat) =>
  cat.docs.map((doc) => ({
    id: doc.id,
    slug: doc.slug,
    name: doc.name,
    category: cat.category,
    description: doc.description,
    intendedAudience: doc.audience,
    purpose: doc.purpose,
    fields: [...cat.fields, ...(doc.addFields ?? [])],
    sections: doc.sections,
    tone: doc.tone ?? "professional, neutral, precise",
    generationInstructions: doc.instructions,
    terminology: doc.terminology,
    outputCapabilities: EXPORTS,
  })),
);

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  penetration_testing: "Penetration Testing",
  red_team: "Red Team / Adversary Emulation",
  vulnerability_assessment: "Vulnerability Assessment",
  security_assessment: "Security Assessment",
  cloud_security_assessment: "Cloud Security Assessment",
  security_architecture_review: "Security Architecture Review",
  threat_modeling: "Threat Modeling",
  digital_forensics: "Digital Forensics",
  incident_response: "Incident Response",
  vulnerability_disclosure: "Vulnerability Disclosure",
  bug_bounty: "Bug Bounty Program",
  secure_development: "Secure Development / Security Requirements",
};

export const CATEGORIES: DocumentCategory[] = CATALOG.map((c) => c.category);

export function getDefinition(id: string): DocumentDefinition | undefined {
  return DOCUMENT_DEFINITIONS.find((d) => d.id === id);
}

export function getDefinitionBySlug(slug: string): DocumentDefinition | undefined {
  return DOCUMENT_DEFINITIONS.find((d) => d.slug === slug);
}

export function definitionsByCategory(category: DocumentCategory): DocumentDefinition[] {
  return DOCUMENT_DEFINITIONS.filter((d) => d.category === category);
}
