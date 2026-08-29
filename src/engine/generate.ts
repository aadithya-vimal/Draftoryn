import type {
  DocumentDefinition,
  GeneratedDocument,
  Org,
  Section,
  SectionDef,
  SemanticModel,
} from "./types";
import { buildSemanticModel, isSectionVisible } from "./semantic";
import { buildGeneratorMeta } from "./watermark";

function ph(value: string | undefined, placeholder: string): string {
  return value && value.trim().length > 0 ? value.trim() : placeholder;
}

function orgName(o: Org | undefined, placeholder: string): string {
  return ph(o?.name, placeholder);
}

function extra(model: SemanticModel, key: string): string[] {
  const v = model.extra[key];
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v];
  return [];
}

function single(model: SemanticModel, key: string): string {
  const v = model.extra[key];
  if (typeof v === "string") return v;
  return "";
}

interface Ctx {
  def: DocumentDefinition;
  model: SemanticModel;
}

function heading(text: string, level = 2): Section["blocks"][number] {
  return { type: "heading", text, level };
}

function paragraph(text: string): Section["blocks"][number] {
  return { type: "paragraph", text };
}

function list(items: string[]): Section["blocks"][number] {
  return { type: "list", items };
}

function callout(text: string, tone: "info" | "warning" | "missing" | "assumption"): Section["blocks"][number] {
  return { type: "callout", text, tone };
}

function table(headers: string[], rows: string[][]): Section["blocks"][number] {
  return { type: "table", table: { headers, rows } };
}

function missingField(name: string): Section["blocks"][number] {
  return callout(`Required information missing: ${name}. Provide this in the document inputs to complete the section.`, "missing");
}

function genericListSection(
  ctx: Ctx,
  kind: Section["kind"],
  values: string[],
  missingMsg: string,
): Section["blocks"][number][] {
  if (values.length === 0) return [callout(missingMsg, "missing")];
  return [list(values)];
}

// ---------------------------------------------------------------------------
// Per-section-kind generators. Every generator derives content strictly from
// the semantic model. Missing operational facts are surfaced as placeholders or
// explicit "[MISSING]" callouts; nothing is invented.
// ---------------------------------------------------------------------------

function generateBlocks(ctx: Ctx, s: SectionDef): Section["blocks"][number][] {
  const { model, def } = ctx;
  const client = orgName(model.client, "[CLIENT ORGANIZATION]");
  const provider = orgName(model.provider, "[TESTING / ASSESSING ORGANIZATION]");

  switch (s.kind) {
    case "title":
      return [
        paragraph(`${def.purpose} This document is prepared for ${client}.`),
      ];

    case "intro":
      return [
        paragraph(
          `${def.description} It is intended for ${ph(def.intendedAudience, "[INTENDED AUDIENCE]")}.`,
        ),
      ];

    case "parties": {
      const blocks: Section["blocks"][number][] = [];
      blocks.push(paragraph(`Client / receiving organization: ${client}.`));
      blocks.push(paragraph(`Assessing / engaging organization: ${provider}.`));
      if (model.people.length === 0) {
        blocks.push(callout("No individual contacts provided. Add client and assessor representatives in the inputs.", "missing"));
      } else {
        blocks.push(
          table(
            ["Name", "Role", "Organization", "Email"],
            model.people.map((p) => [ph(p.name, "[NAME]"), ph(p.role, "[ROLE]"), ph(p.organization, "[ORG]"), ph(p.email, "[EMAIL]")]),
          ),
        );
      }
      return blocks;
    }

    case "authorization": {
      const blocks: Section["blocks"][number][] = [];
      const auth = model.authorization;
      if (!auth || (!auth.authorizedBy && !auth.authorizedParty)) {
        blocks.push(missingField("authorizing party / signatory"));
      } else {
        blocks.push(
          paragraph(
            `${ph(auth.authorizedBy, "[AUTHORIZED SIGNATORY]")} of ${client} authorizes ${provider} to perform the activities described in this document.`,
          ),
        );
        blocks.push(paragraph(`Authorization reference: ${ph(auth.reference, "[REFERENCE / CONTRACT ID]")}.`));
        blocks.push(paragraph(`Authorization date: ${ph(auth.date, "[AUTHORIZATION DATE]").replace("[AUTHORIZATION DATE]", "[AUTHORIZATION DATE]")}.`));
      }
      if (auth && auth.conditions.length) {
        blocks.push(heading("Authorization conditions", 3));
        blocks.push(list(auth.conditions));
      }
      return blocks;
    }

    case "scope": {
      const scope = model.scope;
      const blocks: Section["blocks"][number][] = [];
      if (!scope || scope.inScope.length === 0) {
        blocks.push(missingField("in-scope targets / systems"));
      } else {
        blocks.push(heading("In scope", 3));
        blocks.push(list(scope.inScope));
      }
      if (scope && scope.outOfScope.length) {
        blocks.push(heading("Out of scope", 3));
        blocks.push(list(scope.outOfScope));
      }
      if (scope && scope.conditional.length) {
        blocks.push(heading("Conditionally in scope", 3));
        blocks.push(list(scope.conditional));
      }
      return blocks;
    }

    case "exclusions":
      return genericListSection(ctx, "exclusions", model.scope?.outOfScope ?? [], "No exclusions specified.");

    case "schedule": {
      const sched = model.schedule;
      const blocks: Section["blocks"][number][] = [];
      if (!sched || (!sched.start && !sched.end && sched.windows.length === 0)) {
        blocks.push(missingField("testing / activity window"));
      } else {
        if (sched.start || sched.end) {
          blocks.push(paragraph(`Activity period: ${ph(sched.start, "[START DATE]")} to ${ph(sched.end, "[END DATE]")}.`));
        }
        if (sched.windows.length) {
          blocks.push(heading("Maintenance / testing windows", 3));
          blocks.push(list(sched.windows));
        }
      }
      return blocks;
    }

    case "constraints": {
      const blocks: Section["blocks"][number][] = [];
      if (model.constraints.length === 0) {
        blocks.push(callout("No constraints provided. Define prohibited actions (e.g. no denial-of-service testing, no destructive actions) before commencement.", "warning"));
      } else {
        blocks.push(list(model.constraints));
      }
      return blocks;
    }

    case "methodology": {
      const blocks: Section["blocks"][number][] = [];
      if (model.methodology.length === 0) {
        blocks.push(callout("No methodology statements provided. Describe the approach, standards, and techniques applied.", "missing"));
      } else {
        blocks.push(list(model.methodology));
      }
      return blocks;
    }

    case "objectives": {
      const blocks: Section["blocks"][number][] = [];
      if (!model.objective) {
        blocks.push(missingField("engagement / assessment objective"));
      } else {
        blocks.push(paragraph(model.objective));
      }
      return blocks;
    }

    case "threat_actor": {
      const v = single(model, "threatActor");
      return [v ? paragraph(v) : callout("No threat actor profile supplied. Describe the adversary being emulated.", "missing")];
    }

    case "roles": {
      const blocks: Section["blocks"][number][] = [];
      if (model.people.length === 0) {
        blocks.push(callout("No roles provided. Define the individuals and teams responsible for this activity.", "missing"));
      } else {
        blocks.push(table(["Role", "Name", "Responsibility"], model.people.map((p) => [ph(p.role, "[ROLE]"), ph(p.name, "[NAME]"), ph(p.organization, "[ASSIGNED TO]")])));
      }
      return blocks;
    }

    case "communications": {
      const v = single(model, "communications");
      return [v ? paragraph(v) : callout("Define communication channels, points of contact, and escalation paths.", "missing")];
    }

    case "evidence":
      return genericListSection(ctx, "evidence", model.evidence, "No evidence requirements specified.");

    case "reporting": {
      const rep = model.reporting;
      const blocks: Section["blocks"][number][] = [];
      if (!rep || rep.deliverables.length === 0) {
        blocks.push(callout("No reporting deliverables specified.", "missing"));
      } else {
        blocks.push(heading("Deliverables", 3));
        blocks.push(list(rep.deliverables));
        if (rep.audience) blocks.push(paragraph(`Audience: ${rep.audience}.`));
        if (rep.cadence) blocks.push(paragraph(`Cadence: ${rep.cadence}.`));
      }
      return blocks;
    }

    case "findings":
      if (model.findings.length === 0) {
        return [
          table(["ID", "Title", "Severity", "Affected Asset", "Status"], []),
          callout("No findings were generated. Add findings in the editor or supply them via the inputs. Draftoryn never invents findings, evidence, or vulnerabilities.", "info"),
        ];
      }
      return [
        table(
          ["ID", "Title", "Severity", "Likelihood", "Impact", "Affected Asset"],
          model.findings.map((f) => [f.id, f.title, ph(f.severity, "?"), ph(f.likelihood, "?"), ph(f.impact, "?"), ph(f.affectedAsset, "?")]),
        ),
      ];

    case "risk":
      if (model.risks.length === 0) {
        return [
          table(["ID", "Risk", "Level", "Likelihood", "Impact"], []),
          callout("No risks recorded. Populate the risk register from the assessment results.", "info"),
        ];
      }
      return [
        table(["ID", "Risk", "Level", "Likelihood", "Impact"], model.risks.map((r) => [r.id, r.title, ph(r.level, "?"), ph(r.likelihood, "?"), ph(r.impact, "?")])),
      ];

    case "recommendations":
    case "remediation":
      if (model.recommendations.length === 0) {
        return [
          table(["ID", "Recommendation", "Priority"], []),
          callout("No recommendations yet. Add remediation actions in the editor.", "info"),
        ];
      }
      return [
        table(["ID", "Recommendation", "Priority"], model.recommendations.map((r) => [r.id, r.title, ph(r.priority, "?")])),
      ];

    case "severity_model":
      return [
        paragraph("Findings are rated using the following scale. Severity reflects the combination of likelihood and impact in the context of the engagement."),
        table(
          ["Severity", "Definition", "Typical Response"],
          [
            ["Critical", "Exploitable now with severe business impact.", "Remediate immediately."],
            ["High", "Exploitable with significant impact.", "Remediate within 30 days."],
            ["Medium", "Conditional or limited impact.", "Remediate within 90 days."],
            ["Low", "Minimal impact or difficult to exploit.", "Remediate as scheduled."],
            ["Informational", "No direct risk; hardening opportunity.", "Address as appropriate."],
          ],
        ),
      ];

    case "classification":
      return [
        table(
          ["Severity", "Examples", "Response Time"],
          [
            ["Critical", "Active breach, data exfiltration", "Immediate / < 1 hour"],
            ["High", "Confirmed compromise of a system", "< 4 hours"],
            ["Medium", "Suspicious activity under investigation", "< 24 hours"],
            ["Low", "Minor policy violation", "< 72 hours"],
          ],
        ),
      ];

    case "asset_inventory":
      return genericListSection(ctx, "asset_inventory", extra(model, "assets"), "No assets listed. Identify the systems, applications, or data in scope.");

    case "actor_inventory":
      return genericListSection(ctx, "actor_inventory", extra(model, "actors"), "No actors listed. Identify internal and external actors relevant to the system.");

    case "trust_boundaries":
      return genericListSection(ctx, "trust_boundaries", extra(model, "trustBoundaries"), "No trust boundaries described.");

    case "data_flow":
      return genericListSection(ctx, "data_flow", extra(model, "dataFlows"), "No data flows described.");

    case "entry_points":
      return genericListSection(ctx, "entry_points", extra(model, "entryPoints"), "No entry points listed.");

    case "threat_catalog":
      return genericListSection(ctx, "threat_catalog", extra(model, "threats"), "No threats enumerated.");

    case "attack_scenarios":
      return genericListSection(ctx, "attack_scenarios", extra(model, "attackScenarios"), "No attack scenarios described.");

    case "mitigations":
      return genericListSection(ctx, "mitigations", extra(model, "mitigations"), "No mitigations recorded.");

    case "residual_risk":
      return genericListSection(ctx, "residual_risks", extra(model, "residualRisks"), "No residual risk recorded after mitigation.");

    case "timeline": {
      const v = single(model, "timeline");
      return [v ? paragraph(v) : callout("No timeline provided.", "missing")];
    }

    case "assumptions":
      if (model.assumptions.length === 0) {
        return [callout("No assumptions recorded. State any assumptions that affect interpretation of this document.", "assumption")];
      }
      return [list(model.assumptions)];

    case "signoff":
      return [
        table(
          ["Party", "Name", "Signature", "Date"],
          [
            [client, "[NAME]", "[SIGNATURE]", "[DATE]"],
            [provider, "[NAME]", "[SIGNATURE]", "[DATE]"],
          ],
        ),
      ];

    case "narrative": {
      const v = single(model, "narrative");
      return [v ? paragraph(v) : callout("No narrative provided.", "missing")];
    }

    case "criteria":
      return genericListSection(ctx, "criteria", extra(model, "criteria"), "No assessment criteria defined.");

    case "security_requirements":
      return genericListSection(ctx, "security_requirements", extra(model, "securityRequirements"), "No security requirements specified.");

    case "contact_matrix": {
      const blocks: Section["blocks"][number][] = [];
      if (model.people.length === 0) blocks.push(callout("No contacts provided.", "missing"));
      else blocks.push(table(["Role", "Name", "Email / Phone"], model.people.map((p) => [ph(p.role, "[ROLE]"), ph(p.name, "[NAME]"), ph(p.email, "[CONTACT]")])));
      return blocks;
    }

    case "escalation":
      return genericListSection(ctx, "escalation", extra(model, "escalation"), "No escalation steps defined.");

    case "triage":
      return genericListSection(ctx, "triage", extra(model, "triage"), "Define how incidents are detected, validated, and prioritized.");

    case "containment":
      return genericListSection(ctx, "containment", extra(model, "containment"), "Define short-term and long-term containment actions.");

    case "eradication":
      return genericListSection(ctx, "eradication", extra(model, "eradication"), "Define how threats are removed and root causes addressed.");

    case "recovery":
      return genericListSection(ctx, "recovery", extra(model, "recovery"), "Define how services are restored and validated.");

    case "chain_of_custody":
      return [
        table(["Evidence ID", "Collected By", "Collected At", "Transferred To", "Transfer Time"], []),
        callout("No custody entries yet. Record each transfer of evidence to preserve integrity.", "info"),
      ];

    case "acquisition":
      return genericListSection(ctx, "acquisition", extra(model, "acquisition"), "Define how evidence is acquired and imaged.");

    case "coordinated_disclosure":
      return genericListSection(ctx, "coordinated_disclosure", extra(model, "coordinatedDisclosure"), "Define the coordinated disclosure workflow.");

    case "safe_harbor":
      return genericListSection(ctx, "safe_harbor", extra(model, "safeHarbor"), "Define safe harbor terms protecting eligible researchers.");

    case "reward_matrix":
      return [
        table(["Severity", "Reward", "Example"], [
          ["Critical", "[REWARD]", "[EXAMPLE]"],
          ["High", "[REWARD]", "[EXAMPLE]"],
          ["Medium", "[REWARD]", "[EXAMPLE]"],
          ["Low", "[REWARD]", "[EXAMPLE]"],
        ]),
      ];

    case "submission_requirements":
      return genericListSection(ctx, "submission_requirements", extra(model, "submissionRequirements"), "Define what a valid submission must contain.");

    case "duplicate_handling":
      return genericListSection(ctx, "duplicate_handling", extra(model, "duplicateHandling"), "Define how duplicate reports are handled.");

    case "custom":
    default: {
      if (s.guidance) return [paragraph(s.guidance)];
      return [callout("This section is defined by the document template. Provide content in the editor.", "info")];
    }
  }
}

function buildSection(ctx: Ctx, s: SectionDef): Section {
  const rawBlocks = generateBlocks(ctx, s);
  const cleanTitle = s.title.trim().toLowerCase();
  // Strip inner heading blocks that merely repeat the section title
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
    blocks,
    status: missing ? "missing" : "generated",
  };
}

export function generateDocument(
  def: DocumentDefinition,
  source: Record<string, unknown>,
): GeneratedDocument {
  const model = buildSemanticModel(def, source);
  const sections: Section[] = [];
  for (const s of def.sections) {
    if (s.conditional && !isSectionVisible(s, source)) continue;
    sections.push(buildSection({ def, model }, s));
  }

  const metadata: Record<string, string> = {
    category: def.category,
    documentType: def.id,
    client: orgName(model.client, ""),
    provider: orgName(model.provider, ""),
    generatedAt: new Date().toISOString(),
  };

  const title = model.client?.name ? `${model.client.name} — ${def.name}` : def.name;

  return {
    definitionId: def.id,
    title,
    metadata,
    model,
    sections,
    generator: buildGeneratorMeta(),
  };
}

export function regenerateSection(
  def: DocumentDefinition,
  sectionId: string,
  source: Record<string, unknown>,
): Section | undefined {
  const model = buildSemanticModel(def, source);
  const s = def.sections.find((x) => x.id === sectionId);
  if (!s) return undefined;
  return buildSection({ def, model }, s);
}

export function regenerateMissing(
  def: DocumentDefinition,
  source: Record<string, unknown>,
  sections: Section[],
): Section[] {
  const model = buildSemanticModel(def, source);
  return sections.map((sec) => {
    if (sec.status === "missing" || sec.status === "empty") {
      const def2 = def.sections.find((x) => x.id === sec.id);
      if (def2) return buildSection({ def, model }, def2);
    }
    return sec;
  });
}
