import type {
  BlockTone,
  ContentBlock,
  DocumentDefinition,
  GeneratedDocument,
  Section,
  SectionDef,
  SemanticModel,
} from "./types";
import { buildSemanticModel, isSectionVisible } from "./semantic";
import { validateGeneratedDocument, validateSource } from "./validation";
import { formatCatalogDate } from "../lib/date";

// Safe block builders
const heading = (text: string, level: 1 | 2 | 3 | 4 | 5 | 6 = 2): ContentBlock => ({
  type: "heading",
  level,
  text,
});

const paragraph = (text: string): ContentBlock => ({
  type: "paragraph",
  text,
});

const list = (items: string[], ordered = false): ContentBlock => ({
  type: "list",
  ordered,
  items,
});

const table = (headers: string[], rows: string[][]): ContentBlock => ({
  type: "table",
  table: { headers, rows },
});

const callout = (
  text: string,
  tone: BlockTone = "info",
  title?: string,
): ContentBlock => ({
  type: "callout",
  tone,
  text: title ? `${title}: ${text}` : text,
});

const missingField = (fieldName: string): ContentBlock =>
  callout(
    `[MISSING REQUIRED FIELD: ${fieldName.toUpperCase()}] - Provide this value in the source inputs.`,
    "missing",
    "Required Input Missing",
  );

function ph(val: unknown, placeholder: string): string {
  if (typeof val === "string" && val.trim().length > 0) return val.trim();
  if (Array.isArray(val) && val.length > 0) return val.join(", ");
  return placeholder;
}

interface Ctx {
  def: DocumentDefinition;
  model: SemanticModel;
  source: Record<string, unknown>;
}

function single(model: SemanticModel, key: string): string | undefined {
  const v = model.extra[key];
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return undefined;
}

function extra(model: SemanticModel, key: string): string[] {
  const v = model.extra[key];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string" && v.trim().length > 0) return [v.trim()];
  return [];
}

function genericListSection(
  ctx: Ctx,
  fallbackKey: string,
  items: string[],
  emptyMessage: string,
): ContentBlock[] {
  const listItems = items.length ? items : extra(ctx.model, fallbackKey);
  if (listItems.length === 0) {
    return [callout(emptyMessage, "info")];
  }
  return [list(listItems)];
}

function generateBlocks(ctx: Ctx, s: SectionDef): ContentBlock[] {
  const { model, def, source } = ctx;
  const client = model.client?.name ?? "[CLIENT ORGANIZATION]";
  const provider = model.provider?.name ?? "[ASSESSING ORGANIZATION]";

  switch (s.kind) {
    case "doc_control":
      return [
        table(
          ["Property", "Value"],
          [
            ["Document Title", def.name],
            ["Document ID", `DOC-${def.id.toUpperCase()}-${new Date().getFullYear()}`],
            ["Version", "1.0 (Draft)"],
            ["Classification", "Confidential / Restricted Access"],
            ["Client Organization", client],
            ["Assessing Organization", provider],
            ["Date Created", formatCatalogDate(new Date())],
            ["Status", "Under Review"],
          ],
        ),
      ];

    case "parties": {
      const clientPhone = model.client?.phone || single(model, "clientPhone") || single(model, "clientContactPhone");
      const providerPhone = model.provider?.phone || single(model, "providerPhone") || single(model, "providerContactPhone");
      const blocks: ContentBlock[] = [];
      blocks.push(
        table(
          ["Role", "Organization", "Primary Contact", "Email / Channel", "Direct Phone"],
          [
            [
              "Client Sponsor",
              client,
              ph(model.client?.contactName, "[CLIENT CONTACT]"),
              ph(model.client?.contactEmail, "[CLIENT EMAIL]"),
              ph(clientPhone, "—"),
            ],
            [
              "Assessing Entity",
              provider,
              ph(model.provider?.contactName, "[ASSESSOR LEAD]"),
              ph(model.provider?.contactEmail, "[ASSESSOR EMAIL]"),
              ph(providerPhone, "—"),
            ],
          ],
        ),
      );
      if (model.people && model.people.length > 0) {
        blocks.push(paragraph("Key Technical & Operational Personnel:"));
        blocks.push(
          table(
            ["Name", "Role", "Organization", "Contact"],
            model.people.map((p) => [ph(p.name, "[NAME]"), ph(p.role, "[ROLE]"), ph(p.organization, "[ORG]"), ph(p.email, "[CONTACT]")]),
          ),
        );
      }
      return blocks;
    }

    case "purpose_bg":
    case "intro": {
      const blocks: ContentBlock[] = [];
      blocks.push(
        paragraph(
          `This document establishes the operational parameters, authorized activities, and technical standards for ${def.name.toLowerCase()} conducted for ${client} by ${provider}.`,
        ),
      );
      if (model.objective) {
        blocks.push(paragraph(`Primary Objective: ${model.objective}`));
      }
      const jurisdiction = single(model, "legalJurisdiction");
      if (jurisdiction) {
        blocks.push(paragraph(`Governing Law & Jurisdiction: This document and all authorized activities are governed under the laws of ${jurisdiction}.`));
      }
      return blocks;
    }

    case "definitions":
      return [
        table(
          ["Term", "Definition"],
          [
            ["Engagement", `The authorized ${def.name} activities conducted under this agreement.`],
            ["In-Scope Assets", "The explicitly authorized hostnames, IP ranges, APIs, and cloud services defined herein."],
            ["Rules of Engagement", "The binding operational constraints, testing windows, and escalation procedures governing execution."],
            ["Vulnerability", "A flaw in an information system, security procedure, or internal control that could be exploited."],
            ["Emergency Stop", "An immediate cessation of testing triggered by system instability, critical discovery, or sponsor instruction."],
          ],
        ),
      ];

    case "authorization": {
      const blocks: ContentBlock[] = [];
      const auth = model.authorization;
      const jurisdiction = single(model, "legalJurisdiction");
      if (!auth || (!auth.authorizedBy && !auth.authorizedParty)) {
        blocks.push(missingField("authorizing party / signatory"));
      } else {
        blocks.push(
          paragraph(
            `${ph(auth.authorizedBy ?? auth.authorizedParty, "[AUTHORIZED SIGNATORY]")} of ${client} hereby explicitly authorizes ${provider} to conduct the ${def.name} activities described in this document against the designated in-scope assets.`,
          ),
        );
        const authRows = [
          ["Authorizing Entity", client],
          ["Authorized Signatory", ph(auth.authorizedBy ?? auth.authorizedParty, "[AUTHORIZED SIGNATORY]")],
          ["Authorization Reference", ph(auth.reference, "[REF-AUTH-001]")],
          ["Authorization Date", ph(auth.date, formatCatalogDate(new Date()))],
          ["Testing Window", model.schedule ? `${ph(model.schedule.start, "[START DATE]")} to ${ph(model.schedule.end, "[END DATE]")}` : "[AUTHORIZED WINDOW]"],
        ];
        if (jurisdiction) {
          authRows.push(["Governing Jurisdiction", jurisdiction]);
        }
        blocks.push(table(["Authorization Parameter", "Details"], authRows));
        if (auth.conditions && auth.conditions.length > 0) {
          blocks.push(paragraph("Authorization Conditions & Mandatory Constraints:"));
          blocks.push(list(auth.conditions));
        }
      }
      return blocks;
    }

    case "policy_waived": {
      const policy = (source.policyWaived as string)?.trim() || single(model, "policyWaived") || (source.policy as string)?.trim();
      if (policy) {
        return [
          paragraph(`The following specific organizational security policy, regulatory mandate, or technical standard is subject to this formal waiver exception:`),
          callout(policy, "info", "Waived Standard / Policy"),
        ];
      }
      return [
        callout("Specific corporate security policy or technical control standard being waived under this exception.", "info", "Security Policy Identifier"),
      ];
    }

    case "scope":
    case "in_scope": {
      const scope = model.scope;
      const blocks: ContentBlock[] = [];
      if (!scope || scope.inScope.length === 0) {
        blocks.push(missingField("in-scope targets / systems"));
      } else {
        blocks.push(
          table(
            ["Asset Identifier / Target", "Target Type", "Environment", "Status"],
            scope.inScope.map((item, idx) => [`TARGET-${idx + 1}`, item, "Production / Staging", "In Scope (Authorized)"]),
          ),
        );
      }
      if (scope && scope.outOfScope && scope.outOfScope.length > 0) {
        blocks.push(paragraph("Explicitly Excluded Targets:"));
        blocks.push(list(scope.outOfScope));
      }
      const reqAccess = extra(model, "requiredAccess");
      if (reqAccess.length > 0) {
        blocks.push(paragraph("Required Access, Credentials & Whitelists:"));
        blocks.push(list(reqAccess));
      }
      return blocks;
    }

    case "out_of_scope":
    case "exclusions":
      return genericListSection(
        ctx,
        "outOfScope",
        model.scope?.outOfScope ?? [],
        "No explicit out-of-scope exclusions specified. All targets not listed in the in-scope inventory are strictly excluded by default.",
      );

    case "target_types": {
      const inScope = model.scope?.inScope ?? [];
      if (inScope.length > 0) {
        return [
          paragraph("Target environment classification derived from authorized in-scope assets:"),
          list(inScope),
        ];
      }
      return [
        paragraph("Target environments and asset types correspond directly to the authorized in-scope asset inventory."),
      ];
    }

    case "asset_inventory": {
      const scope = model.scope;
      const items = scope?.inScope?.length ? scope.inScope : [];
      if (items.length > 0) {
        return [
          table(
            ["Asset ID", "Asset Description / Hostname", "Classification", "Owner", "Environment"],
            items.map((item, idx) => [
              `AST-${idx + 101}`,
              item,
              "Confidential",
              client,
              "Production / Staging",
            ]),
          ),
        ];
      }
      return [
        paragraph("Asset inventory corresponds to the verified in-scope target list authorized for this engagement."),
      ];
    }

    case "actor_inventory": {
      const actors = extra(model, "threatActors");
      if (actors.length > 0) {
        return [
          paragraph("Identified Threat Actors & Authorization Roles:"),
          list(actors),
        ];
      }
      return [
        paragraph("Threat actor classifications and authorization tiers to be evaluated based on the designated target architecture."),
      ];
    }

    case "trust_boundaries": {
      const boundaries = extra(model, "trustBoundaries");
      if (boundaries.length > 0) {
        return [
          paragraph("Designated Trust Boundaries:"),
          list(boundaries),
        ];
      }
      return [
        paragraph("Trust boundaries and security perimeters shall be defined across target network interfaces and service tiers."),
      ];
    }

    case "data_flow": {
      const flows = extra(model, "dataFlow");
      if (flows.length > 0) {
        return [
          paragraph("Designated Data Flow Paths:"),
          list(flows),
        ];
      }
      return [
        paragraph("Data flow paths and ingress/egress transit protocols shall be mapped across target scope interfaces."),
      ];
    }

    case "entry_points": {
      const eps = extra(model, "entryPoints");
      if (eps.length > 0) {
        return [
          paragraph("Designated Attack Surfaces & Entry Points:"),
          list(eps),
        ];
      }
      return [
        paragraph("Authorized network and application entry points correspond strictly to the in-scope asset inventory."),
      ];
    }

    case "threat_catalog": {
      const threats = extra(model, "threatCatalog");
      if (threats.length > 0) {
        return [
          paragraph("Cataloged Threat Scenarios:"),
          list(threats),
        ];
      }
      return [
        paragraph("Threat vectors and security concerns are evaluated strictly against authorized in-scope assets and interfaces."),
      ];
    }

    case "attack_scenarios": {
      const scenarios = extra(model, "attackScenarios");
      if (scenarios.length > 0) {
        return [
          paragraph("Authorized Attack Scenarios:"),
          list(scenarios),
        ];
      }
      return [
        paragraph("Attack modeling scenarios and test cases are conducted strictly within the bounds of the authorized rules of engagement."),
      ];
    }

    case "schedule":
    case "schedule_term":
    case "window": {
      const sched = model.schedule;
      const start = sched?.start ?? single(model, "startDate") ?? formatCatalogDate(new Date());
      const end = sched?.end ?? single(model, "endDate") ?? formatCatalogDate(new Date(Date.now() + 14 * 86400000));
      const windows = sched?.windows?.length ? sched.windows.join(", ") : single(model, "windows") ?? "Standard Authorized Maintenance Window";
      const phases = extra(model, "testingPhases");

      const blocks: ContentBlock[] = [
        paragraph(
          `The authorized operational schedule for ${def.name.toLowerCase()} activities is established as follows:`,
        ),
        table(
          ["Phase / Activity", "Start Date", "End Date", "Authorized Hours / Window", "Coordination Contact"],
          phases.length > 0
            ? phases.map((p, idx) => [p, start, end, windows, provider])
            : [
                ["Authorized Testing Window", start, end, windows, provider],
                ["Remediation Reporting & Debrief", end, end, "Business Hours", client],
              ],
        ),
        paragraph(
          `Execution Window: Testing activities are strictly constrained between ${start} and ${end} during authorized windows (${windows}). Any testing outside these parameters requires explicit advance written re-authorization from ${client}.`,
        ),
      ];
      return blocks;
    }

    case "testing_boundaries":
    case "constraints":
    case "restrictions": {
      const prohibited = extra(model, "prohibitedTechniques");
      const userConstraints = model.constraints.length ? model.constraints : extra(model, "constraints");
      const allConstraints = [...userConstraints, ...prohibited];

      if (allConstraints.length > 0) {
        return [
          paragraph("The following operational constraints and safety boundaries are strictly binding upon all testing personnel:"),
          list(allConstraints),
        ];
      }
      return [
        paragraph(
          `Testing activities are strictly confined to the explicitly designated in-scope targets. Any testing against out-of-scope production assets, third-party infrastructure, or unauthorized interfaces is strictly prohibited without prior written amendment.`,
        ),
      ];
    }

    case "emergency_stop":
    case "escalation":
    case "emergency_escalation": {
      const emergencyContact = single(model, "emergencyStopContact") || model.client?.phone || model.client?.contactName || "[PRIMARY EMERGENCY CONTACT]";
      const clientContact = model.client?.contactName ?? "[CLIENT CONTACT]";
      const clientEmail = model.client?.contactEmail ?? "[CLIENT EMAIL]";
      const clientPhone = model.client?.phone ?? "[CLIENT PHONE]";
      const providerLead = model.provider?.contactName ?? "[ASSESSOR LEAD]";
      const providerEmail = model.provider?.contactEmail ?? "[ASSESSOR EMAIL]";
      const providerPhone = model.provider?.phone ?? "[ASSESSOR PHONE]";

      return [
        callout(
          `EMERGENCY STOP PROTOCOL: In the event of system instability, unexpected downtime, or discovery of critical vulnerability, testing must IMMEDIATELY HALT. Contact emergency hotline: ${emergencyContact}.`,
          "danger",
          "Emergency Stop Protocol",
        ),
        table(
          ["Role", "Organization", "Name", "Direct Contact"],
          [
            ["Emergency Stop Hotline", client, emergencyContact, emergencyContact],
            ["Client Primary Contact", client, clientContact, `${clientEmail} · ${clientPhone}`],
            ["Assessing Lead", provider, providerLead, `${providerEmail} · ${providerPhone}`],
          ],
        ),
      ];
    }

    case "contact_matrix":
    case "contacts": {
      const clientPhone = model.client?.phone || single(model, "clientPhone") || "On file";
      const providerPhone = model.provider?.phone || single(model, "providerPhone") || "On file";
      return [
        table(
          ["Role", "Organization", "Name", "Phone", "Email / Channel"],
          [
            ["Client Primary Contact", client, ph(model.client?.contactName, "[CLIENT CONTACT]"), clientPhone, ph(model.client?.contactEmail, "[EMAIL]")],
            ["Testing Lead", provider, ph(model.provider?.contactName, "[ASSESSOR LEAD]"), providerPhone, ph(model.provider?.contactEmail, "[EMAIL]")],
          ],
        ),
      ];
    }

    case "communications": {
      return [
        paragraph(
          `Operational communications between ${client} and ${provider} shall proceed through verified encrypted channels and designated primary contacts.`,
        ),
      ];
    }

    case "reporting":
    case "deliverables":
    case "deliverables_reporting": {
      const rep = model.reporting;
      const deliverablesList = rep?.deliverables?.length
        ? rep.deliverables
        : extra(model, "deliverables").length
        ? extra(model, "deliverables")
        : extra(model, "reporting");

      const audience = rep?.audience ?? single(model, "reportAudience") ?? `${client} Security & Technical Leadership`;

      if (deliverablesList.length > 0) {
        return [
          paragraph(`The following formal deliverables shall be produced by ${provider} and delivered to ${audience}:`),
          table(
            ["Deliverable Item", "Format / Channel", "Target Audience"],
            deliverablesList.map((item) => [item, "Encrypted Delivery", audience]),
          ),
          paragraph(
            "Delivery & Confidentiality Requirements: All reports containing discovered vulnerabilities are classified strictly as CONFIDENTIAL. Deliverables will be transmitted exclusively via encrypted channels.",
          ),
        ];
      }
      return [
        paragraph(
          `Formal assessment documentation and findings reports will be delivered to ${audience} via encrypted channels upon conclusion of testing.`,
        ),
      ];
    }

    case "soc_coordination":
      return [
        table(
          ["Coordination Aspect", "Protocol / Expectation"],
          [
            ["Blue Team Awareness Level", "Controlled Disclosure / White Team Authorized"],
            ["De-confliction SLA", "Response within 15 minutes of suspected security event query"],
            ["Indicator Sharing", "Originating addresses and timestamp logs delivered at debrief"],
          ],
        ),
      ];

    case "credentials_handling":
      return [
        list([
          "Test accounts must be provisioned with designated test flags and unique non-production usernames.",
          "Credentials provided to testing personnel must be transmitted exclusively via encrypted channels.",
          "All test passwords and API keys must be revoked immediately upon conclusion of testing.",
        ]),
      ];

    case "data_protection":
    case "confidentiality": {
      const customTerms = single(model, "confidentialityTerms") || single(model, "confidentiality");
      const blocks: ContentBlock[] = [];
      blocks.push(
        paragraph(
          `All confidential information, discovered vulnerabilities, system architectures, and client data accessed during this engagement are classified strictly as CONFIDENTIAL. ${provider} agrees not to disclose or duplicate any findings without prior written consent from ${client}.`,
        ),
      );
      if (customTerms) {
        blocks.push(paragraph(`Specific Non-Disclosure & Confidentiality Terms: ${customTerms}`));
      }
      blocks.push(
        list([
          "All assessment data stored on tester systems must be encrypted at rest using AES-256 encryption.",
          "Data transfers must occur exclusively over encrypted transport channels (TLS 1.3, SFTP, PGP).",
          "Residual test artifacts and temporary files must be securely destroyed upon completion of authorized reporting.",
        ]),
      );
      return blocks;
    }

    case "evidence":
    case "evidence_handling":
    case "evidence_types": {
      const evidenceList = model.evidence.length
        ? model.evidence
        : extra(model, "evidence");

      if (evidenceList.length > 0) {
        return [
          paragraph(`All testing evidence collected during ${def.name.toLowerCase()} must be captured and protected in accordance with cryptographic integrity standards:`),
          table(
            ["Evidence Item / Category", "Integrity & Storage Standard", "Retention"],
            evidenceList.map((item) => [item, "AES-256 Volume + SHA-256 Hash", "Engagement Scope Duration"]),
          ),
          paragraph("Evidence Sanitization: Testing personnel must redact non-essential credentials from final report artifacts prior to transmission."),
        ];
      }
      return [
        paragraph(
          `All testing evidence, logs, and reproduction transcripts collected during ${def.name.toLowerCase()} must be encrypted at rest (AES-256), protected with cryptographic integrity hashes, and securely retained in accordance with mutual confidentiality terms.`,
        ),
      ];
    }

    case "chain_of_custody":
      return [
        paragraph("All digital artifacts collected during operations shall be recorded with cryptographic hashes (SHA-256) and tracked via formal chain of custody logs."),
      ];

    case "storage_reqs":
    case "encryption_reqs":
    case "transfer_reqs":
    case "retention":
    case "destruction":
    case "evidence_retention":
      return [
        table(
          ["Requirement Domain", "Standard", "Verification Method"],
          [
            ["Storage Encryption", "AES-256 / FIPS 140-3 validated cryptographic module", "Cryptographic Volume Check"],
            ["Data in Transit", "TLS 1.3 with Perfect Forward Secrecy (ECDHE)", "Cipher Suite Inspection"],
            ["Retention Window", "Agreed post-engagement window unless legal hold applies", "Calendar Schedule"],
            ["Sanitization / Destruction", "Cryptographic Erase / Secure Overwrite", "Certificate of Destruction"],
          ],
        ),
      ];

    case "severity_model":
      return [
        paragraph(
          "Vulnerability findings and risks are rated according to the Common Vulnerability Scoring System (CVSS v3.1 / v4.0) standard:",
        ),
        table(
          ["Severity", "CVSS Base Score", "Definition & Impact", "Typical Remediation SLA"],
          [
            ["Critical", "9.0 - 10.0", "Directly exploitable remotely with complete system takeover or data breach.", "Immediate / Within 24 - 48 Hours"],
            ["High", "7.0 - 8.9", "Exploitable with significant business impact or major privilege escalation.", "Within 7 - 14 Days"],
            ["Medium", "4.0 - 6.9", "Conditional exploitability requiring specific user interaction or prerequisites.", "Within 30 - 60 Days"],
            ["Low", "0.1 - 3.9", "Difficult to exploit with minimal impact; defense-in-depth hardening opportunities.", "Within 90 Days / Next Release"],
            ["Informational", "0.0", "Security best practice observations and architecture hardening guidance.", "As Resources Permit"],
          ],
        ),
      ];

    case "findings_summary":
    case "findings": {
      if (model.findings.length > 0) {
        return [
          table(
            ["Finding ID", "Vulnerability Title", "Severity", "Likelihood", "Impact", "Affected Asset", "Status"],
            model.findings.map((f) => [
              f.id,
              f.title,
              ph(f.severity, "Medium"),
              ph(f.likelihood, "Medium"),
              ph(f.impact, "Medium"),
              ph(f.affectedAsset, "[TARGET]"),
              "Open",
            ]),
          ),
        ];
      }
      const findingsSummary = single(model, "findingsSummary");
      if (findingsSummary) {
        return [paragraph(findingsSummary)];
      }
      return [
        paragraph(
          "No vulnerability findings have been recorded for this draft. Verified findings and proof-of-concept reproduction steps may be added in the editor.",
        ),
      ];
    }

    case "risk": {
      if (model.risks.length > 0) {
        return [
          table(
            ["Risk ID", "Risk Description", "Likelihood", "Impact", "Risk Rating", "Owner", "Treatment Strategy"],
            model.risks.map((r) => [r.id, r.title, ph(r.likelihood, "Medium"), ph(r.impact, "Medium"), ph(r.level, "Medium"), client, "Remediate"]),
          ),
        ];
      }
      return [
        paragraph("No risk items have been formally recorded. Risk ratings, likelihood, impact, and treatment strategies may be documented in the editor."),
      ];
    }

    case "recommendations":
    case "remediation": {
      const recsText = single(model, "remediationRecommendations");
      if (recsText) {
        return [paragraph(recsText)];
      }
      if (model.recommendations.length > 0) {
        return [
          table(
            ["Rec ID", "Prioritized Recommendation", "Priority", "Target Deadline"],
            model.recommendations.map((r) => [r.id, r.title, ph(r.priority, "High"), "Scheduled"]),
          ),
        ];
      }
      return [
        paragraph("No remediation recommendations have been documented for this draft. Priority fixes and implementation timelines may be added in the editor."),
      ];
    }

    case "exec_summary": {
      const execText = single(model, "executiveSummary");
      if (execText) {
        return [paragraph(execText)];
      }
      const blocks: ContentBlock[] = [
        paragraph(
          `Executive Overview: ${provider} is authorized to conduct ${def.name.toLowerCase()} for ${client} under the operational parameters established in this document.`,
        ),
      ];
      if (model.objective) {
        blocks.push(paragraph(`Primary Engagement Objective: ${model.objective}`));
      }
      return blocks;
    }

    case "methodology":
    case "activities": {
      const tools = extra(model, "permittedTools");
      const phases = extra(model, "testingPhases");
      const userMeth = model.methodology.length ? model.methodology : extra(model, "methodology");
      const blocks: ContentBlock[] = [];

      if (phases.length > 0) {
        blocks.push(paragraph("Testing Phases:"));
        blocks.push(list(phases, true));
      }
      if (tools.length > 0) {
        blocks.push(paragraph("Permitted Toolsets & Frameworks:"));
        blocks.push(list(tools));
      }
      if (userMeth.length > 0) {
        blocks.push(paragraph("Methodology & Standards:"));
        blocks.push(list(userMeth));
      }
      if (blocks.length === 0) {
        blocks.push(
          paragraph(
            `All testing activities shall be executed in accordance with established industry methodologies and ethical security testing standards authorized by ${client}.`,
          ),
        );
      }
      return blocks;
    }

    case "signoff":
    case "acceptance": {
      const blocks: ContentBlock[] = [];
      const auth = model.authorization;
      const clientContact = ph(model.client?.contactName ?? auth?.authorizedBy, "[CLIENT AUTHORIZED SIGNATORY]");
      const providerContact = ph(model.provider?.contactName, "[ASSESSOR LEAD]");
      const date = formatCatalogDate(new Date());

      blocks.push(
        paragraph(
          `By signing below, the authorized representatives of ${client} and ${provider} accept the operational boundaries, authorization parameters, and standards established in this specification.`,
        ),
      );
      blocks.push(
        table(
          ["Sign-off Field", "Client Signatory", "Assessing Entity Signatory"],
          [
            ["Organization", client, provider],
            ["Printed Name", clientContact, providerContact],
            ["Title / Role", ph(model.client?.department, "Authorized Representative"), ph(model.provider?.department, "Practice Lead / Assessor")],
            ["Signature", "____________________________", "____________________________"],
            ["Date", date, date],
          ],
        ),
      );
      return blocks;
    }

    case "liability_terms": {
      const jurisdiction = single(model, "legalJurisdiction");
      const blocks: ContentBlock[] = [
        paragraph(
          `Limitation of Liability: Testing activities performed by ${provider} are conducted on an "as-is" basis in accordance with authorized parameters. Neither party shall be liable for indirect, incidental, or consequential damages resulting from authorized activities conducted in compliance with this agreement.`,
        ),
      ];
      if (jurisdiction) {
        blocks.push(
          paragraph(`Governing Jurisdiction: This agreement and any disputes arising hereunder shall be governed exclusively by the laws and courts of ${jurisdiction}.`),
        );
      }
      return blocks;
    }

    case "limitations_assumptions": {
      const items = model.assumptions.length
        ? model.assumptions
        : extra(model, "assumptions");

      if (items.length > 0) {
        return [
          paragraph("Operational assumptions & prerequisites for this activity:"),
          list(items),
        ];
      }
      return [
        paragraph("Operational assumptions & scope boundaries are defined according to mutual agreement between the parties."),
      ];
    }

    default: {
      const customValue = extra(model, s.kind).length
        ? extra(model, s.kind)
        : extra(model, s.id).length
        ? extra(model, s.id)
        : [];
      if (customValue.length > 0) {
        return [list(customValue)];
      }
      return [
        paragraph(
          `This section outlines the operational standards and parameters for ${s.title.toLowerCase()} as agreed between ${client} and ${provider}.`,
        ),
      ];
    }
  }
}

function buildSection(ctx: Ctx, s: SectionDef): Section {
  const rawBlocks = generateBlocks(ctx, s);
  const cleanTitle = s.title.trim().toLowerCase();

  // Filter redundant heading blocks matching section title
  const blocks = rawBlocks.filter((b) => {
    if (b.type === "heading" && b.text) {
      const cleanHeading = b.text.trim().toLowerCase();
      if (
        cleanHeading === cleanTitle ||
        cleanTitle.startsWith(cleanHeading) ||
        cleanHeading.startsWith(cleanTitle)
      ) {
        return false;
      }
    }
    return true;
  });

  const missing = blocks.some((b) => b.type === "callout" && b.tone === "missing");
  return {
    id: s.id,
    title: s.title,
    kind: s.kind,
    blocks: blocks.length > 0 ? blocks : [paragraph(`Details for ${s.title}.`)],
    status: missing ? "missing" : "generated",
  };
}

export function generateDocument(
  def: DocumentDefinition,
  source: Record<string, unknown>,
): GeneratedDocument {
  const validation = validateSource(def, source);
  const model = buildSemanticModel(def, source);
  const ctx: Ctx = { def, model, source };

  // Filter out any sections that are conditionally hidden based on source
  const sections: Section[] = def.sections
    .filter((s) => isSectionVisible(s, source))
    .map((s) => buildSection(ctx, s));

  const doc: GeneratedDocument = {
    id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    definitionId: def.id,
    title: def.name,
    status: validation.success ? "ready" : "draft",
    generatedAt: new Date().toISOString(),
    engineVersion: "2.0.0",
    model,
    metadata: {
      client: model.client?.name ?? "",
      provider: model.provider?.name ?? "",
      date: formatCatalogDate(new Date()),
      classification: "Confidential",
      version: "1.0",
    },
    sections,
    validation,
  };

  const validated = validateGeneratedDocument(doc);
  return validated.doc ?? doc;
}

export function regenerateSection(
  def: DocumentDefinition,
  sectionId: string,
  source: Record<string, unknown>,
): Section | null {
  const secDef = def.sections.find((s) => s.id === sectionId);
  if (!secDef) return null;
  const model = buildSemanticModel(def, source);
  const ctx: Ctx = { def, model, source };
  return buildSection(ctx, secDef);
}
