import type {
  DocumentDefinition,
  FieldDef,
  Org,
  Person,
  SemanticModel,
  SemanticScope,
  SemanticSchedule,
  SemanticAuthorization,
  SemanticReporting,
} from "./types";

function asString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  return String(v);
}

function asList(v: unknown): string[] {
  if (v === null || v === undefined) return [];
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).filter(Boolean);
  if (typeof v === "string") return v.split(/[\n,;]/).map((s) => s.trim()).filter(Boolean);
  return [String(v)];
}

function asPersonList(v: unknown): Person[] {
  if (!Array.isArray(v)) return [];
  return v.map((row) => {
    if (typeof row === "string") return { name: row };
    const r = row as Record<string, unknown>;
    return {
      name: asString(r.name),
      role: asString(r.role),
      email: asString(r.email),
      organization: asString(r.organization),
    };
  });
}

function applyField(model: SemanticModel, field: FieldDef, value: unknown): void {
  const concept = field.mapsTo;
  if (!concept) return;
  const key = field.mapsKey;

  switch (concept) {
    case "client":
    case "provider": {
      const org: Org = concept === "client" ? model.client ?? {} : model.provider ?? {};
      if (key) (org as Record<string, unknown>)[key] = asString(value);
      else if (typeof value === "object" && value !== null) Object.assign(org, value as object);
      if (concept === "client") model.client = org;
      else model.provider = org;
      break;
    }
    case "people":
      model.people.push(...asPersonList(value));
      break;
    case "objective":
      model.objective = asString(value) || model.objective;
      break;
    case "scope": {
      const scope: SemanticScope = model.scope ?? { inScope: [], outOfScope: [], conditional: [] };
      if (key === "outOfScope") scope.outOfScope.push(...asList(value));
      else if (key === "conditional") scope.conditional.push(...asList(value));
      else scope.inScope.push(...asList(value));
      model.scope = scope;
      break;
    }
    case "schedule": {
      const sched: SemanticSchedule = model.schedule ?? { windows: [] };
      if (key === "start") sched.start = asString(value) || undefined;
      else if (key === "end") sched.end = asString(value) || undefined;
      else sched.windows.push(...asList(value));
      model.schedule = sched;
      break;
    }
    case "authorization": {
      const auth: SemanticAuthorization = model.authorization ?? { conditions: [] };
      if (key === "conditions") auth.conditions.push(...asList(value));
      else if (key) (auth as unknown as Record<string, unknown>)[key] = asString(value) || undefined;
      model.authorization = auth;
      break;
    }
    case "constraints":
      model.constraints.push(...asList(value));
      break;
    case "methodology":
      model.methodology.push(...asList(value));
      break;
    case "evidence":
      model.evidence.push(...asList(value));
      break;
    case "findings":
      break;
    case "risks":
      break;
    case "recommendations":
      break;
    case "reporting": {
      const rep: SemanticReporting = model.reporting ?? { deliverables: [] };
      if (key === "deliverables" || !key) rep.deliverables.push(...asList(value));
      else if (key) (rep as unknown as Record<string, unknown>)[key] = asString(value) || undefined;
      model.reporting = rep;
      break;
    }
    case "assumptions":
      model.assumptions.push(...asList(value));
      break;
  }
}

export function buildSemanticModel(
  def: DocumentDefinition,
  source: Record<string, unknown>,
): SemanticModel {
  const model: SemanticModel = {
    documentType: def.id,
    category: def.category,
    documentName: def.name,
    people: [],
    constraints: [],
    methodology: [],
    evidence: [],
    findings: [],
    risks: [],
    recommendations: [],
    assumptions: [],
    extra: {},
  };

  for (const field of def.fields) {
    const value = source[field.id];
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
      continue;
    }
    applyField(model, field, value);
  }

  // Also capture all source values into model.extra so template engines can access everything directly
  for (const [k, v] of Object.entries(source)) {
    if (v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)) {
      model.extra[k] = v;
    }
  }

  return model;
}

export function isFieldVisible(field: FieldDef, source: Record<string, unknown>): boolean {
  if (!field.showIf) return true;
  const v = source[field.showIf.field];
  if (field.showIf.equals !== undefined) return v === field.showIf.equals;
  if (field.showIf.in !== undefined) return field.showIf.in.includes(v);
  return true;
}

export function isSectionVisible(
  section: { conditional?: { field: string; equals?: unknown; in?: unknown[] } },
  source: Record<string, unknown>,
): boolean {
  if (!section.conditional) return true;
  const v = source[section.conditional.field];
  if (section.conditional.equals !== undefined) return v === section.conditional.equals;
  if (section.conditional.in !== undefined) return section.conditional.in.includes(v);
  return true;
}
