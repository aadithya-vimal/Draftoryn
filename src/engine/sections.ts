import type {
  DocumentDefinition,
  Section,
  SectionDef,
  SemanticModel,
} from "./types";

export function createEmptySections(def: DocumentDefinition): Section[] {
  return def.sections
    .filter((s) => !s.conditional)
    .map((s) => emptySection(s));
}

export function emptySection(s: SectionDef): Section {
  return {
    id: s.id,
    title: s.title,
    kind: s.kind,
    blocks: [],
    status: "empty",
  };
}

export function getSection(sections: Section[], id: string): Section | undefined {
  return sections.find((s) => s.id === id);
}

export function replaceSection(sections: Section[], updated: Section): Section[] {
  return sections.map((s) => (s.id === updated.id ? updated : s));
}

export function hideSection(sections: Section[], id: string): Section[] {
  return sections.map((s) => (s.id === id ? { ...s, hidden: true } : s));
}

export function showSection(sections: Section[], id: string): Section[] {
  return sections.map((s) => (s.id === id ? { ...s, hidden: false } : s));
}

export function removeSection(sections: Section[], id: string): Section[] {
  return sections.filter((s) => s.id !== id);
}

/** Optional sections defined by the document but not yet present in the doc. */
export function availableSections(def: DocumentDefinition, sections: Section[]): SectionDef[] {
  const present = new Set(sections.map((s) => s.id));
  return def.sections.filter((s) => s.optional && !present.has(s.id));
}

export function addSection(sections: Section[], def: SectionDef): Section[] {
  if (sections.some((s) => s.id === def.id)) return sections;
  return [...sections, emptySection(def)];
}

export function visibleSections(sections: Section[]): Section[] {
  return sections.filter((s) => !s.hidden);
}

/**
 * Returns the set of section kinds that should be regenerated when a given
 * semantic concept changes, so source-field edits stay consistent without
 * rewriting unrelated content.
 */
const CONCEPT_TO_SECTION_KINDS: Record<string, string[]> = {
  client: ["parties", "authorization", "title", "intro", "signoff"],
  provider: ["parties", "title", "intro"],
  people: ["roles", "parties", "contact_matrix", "escalation"],
  objective: ["objectives", "intro", "scope"],
  scope: ["scope", "exclusions"],
  schedule: ["schedule"],
  authorization: ["authorization", "signoff"],
  constraints: ["constraints"],
  methodology: ["methodology"],
  evidence: ["evidence"],
  reporting: ["reporting"],
  assumptions: ["assumptions"],
};

export function sectionsForConcept(concept: string): string[] {
  return CONCEPT_TO_SECTION_KINDS[concept] ?? [];
}

export function sectionKindsToRegenerate(
  def: DocumentDefinition,
  concept: string,
): string[] {
  const kinds = sectionsForConcept(concept);
  const ids = def.sections
    .filter((s) => kinds.includes(s.kind) && !s.conditional)
    .map((s) => s.id);
  return ids;
}

export function applyConsistencyPropagation(
  def: DocumentDefinition,
  sections: Section[],
  _model: SemanticModel,
  changedConcepts: string[],
): { sections: Section[]; touched: string[] } {
  const touched = new Set<string>();
  for (const c of changedConcepts) {
    for (const id of sectionKindsToRegenerate(def, c)) touched.add(id);
  }
  return { sections, touched: [...touched] };
}
