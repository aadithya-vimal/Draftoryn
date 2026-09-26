// Shared module library for the canonical catalog.
// Modules are the unit of reuse: several canonical documents compose the same
// module (e.g. "scope", "signoff") instead of duplicating top-level documents.

export interface ModuleDef {
  id: string;
  title: string;
  description: string;
  /** Legacy section kinds that render this module through the existing engine. */
  legacySectionKinds: string[];
  /** Legacy input field ids that feed this module. */
  inputFields: string[];
}

export const MODULE_LIBRARY: Record<string, ModuleDef> = {
  purpose: {
    id: "purpose",
    title: "Purpose & Objectives",
    description: "Business and technical objectives of the activity.",
    legacySectionKinds: ["purpose_bg", "intro", "objectives"],
    inputFields: ["objective"],
  },
  parties: {
    id: "parties",
    title: "Parties & Responsibilities",
    description: "Client, provider, contacts and RACI.",
    legacySectionKinds: ["parties"],
    inputFields: ["clientName", "providerName", "clientContactName", "providerContactName"],
  },
  authorization: {
    id: "authorization",
    title: "Authorization & Safe Harbor",
    description: "Signatory, reference, jurisdiction, conditions.",
    legacySectionKinds: ["authorization"],
    inputFields: ["authorizedBy", "authReference", "authDate", "legalJurisdiction"],
  },
  scope: {
    id: "scope",
    title: "Scope & Exclusions",
    description: "In-scope inventory plus explicit exclusions.",
    legacySectionKinds: ["scope", "in_scope", "out_of_scope", "exclusions"],
    inputFields: ["inScope", "outOfScope"],
  },
  roe: {
    id: "roe",
    title: "Rules of Engagement",
    description: "Permitted/prohibited techniques, tools, constraints.",
    legacySectionKinds: ["testing_boundaries", "constraints", "restrictions"],
    inputFields: ["constraints", "permittedTools", "prohibitedTechniques"],
  },
  windows: {
    id: "windows",
    title: "Testing Windows",
    description: "Schedule, windows, blackout periods.",
    legacySectionKinds: ["schedule", "schedule_term", "window"],
    inputFields: ["startDate", "endDate", "windows", "testingPhases"],
  },
  comms: {
    id: "comms",
    title: "Communication & Escalation",
    description: "Channels, contacts, emergency stop.",
    legacySectionKinds: ["communications", "emergency_stop", "escalation", "contact_matrix", "contacts"],
    inputFields: ["emergencyStopContact"],
  },
  data_handling: {
    id: "data_handling",
    title: "Data Handling & Evidence",
    description: "Collection, encryption, retention, destruction.",
    legacySectionKinds: ["evidence", "evidence_handling", "data_protection", "confidentiality"],
    inputFields: ["evidence"],
  },
  reporting_req: {
    id: "reporting_req",
    title: "Reporting Requirements",
    description: "Deliverables, audience, cadence.",
    legacySectionKinds: ["reporting", "deliverables", "deliverables_reporting"],
    inputFields: ["deliverables", "reportAudience"],
  },
  signoff: {
    id: "signoff",
    title: "Sign-off",
    description: "Acceptance signatures.",
    legacySectionKinds: ["signoff", "acceptance"],
    inputFields: [],
  },
  exec_summary: {
    id: "exec_summary",
    title: "Executive Summary",
    description: "Objectives, posture, key findings in business language.",
    legacySectionKinds: ["exec_summary"],
    inputFields: ["executiveSummary", "overallRiskRating"],
  },
  scope_method: {
    id: "scope_method",
    title: "Scope & Methodology",
    description: "Scope, methodology, limitations.",
    legacySectionKinds: ["scope", "methodology", "activities", "limitations_assumptions"],
    inputFields: ["inScope", "methodology", "assumptions"],
  },
  risk_profile: {
    id: "risk_profile",
    title: "Risk Profile",
    description: "Severity distribution and systemic issues.",
    legacySectionKinds: ["severity_model", "findings_summary", "risk"],
    inputFields: ["overallRiskRating"],
  },
  findings: {
    id: "findings",
    title: "Detailed Findings",
    description: "Per-finding anatomy with evidence and provenance.",
    legacySectionKinds: ["findings", "findings_summary"],
    inputFields: ["criticalFindings"],
  },
  attack_path: {
    id: "attack_path",
    title: "Attack Narrative / Paths",
    description: "Chained exploitation narrative.",
    legacySectionKinds: ["activities"],
    inputFields: [],
  },
  remediation_roadmap: {
    id: "remediation_roadmap",
    title: "Remediation Roadmap",
    description: "Prioritized fixes with SLAs and verification.",
    legacySectionKinds: ["recommendations", "remediation"],
    inputFields: [],
  },
  appendices: {
    id: "appendices",
    title: "Appendices",
    description: "Evidence index and methodology references.",
    legacySectionKinds: ["evidence", "chain_of_custody"],
    inputFields: ["evidence"],
  },
  validation: {
    id: "validation",
    title: "Validation Results",
    description: "Per-finding retest verdicts.",
    legacySectionKinds: ["findings", "reporting"],
    inputFields: ["priorReportRef"],
  },
};

export function getModule(id: string): ModuleDef | undefined {
  return MODULE_LIBRARY[id];
}

/** Resolve a canonical module list to module definitions; unknown ids are skipped. */
export function resolveModules(moduleIds: string[]): ModuleDef[] {
  const out: ModuleDef[] = [];
  for (const id of moduleIds) {
    const m = MODULE_LIBRARY[id] ?? {
      id,
      title: id,
      description: "Canonical module.",
      legacySectionKinds: [id],
      inputFields: [],
    };
    out.push(m);
  }
  return out;
}
