import type { DocumentDefinition, GeneratedDocument, SectionDef } from "../types";

export interface GenerationRequest {
  system: string;
  user: string;
  /** JSON schema-ish description the model should follow (for structured output). */
  schema: string;
  definitionId: string;
  sectionId?: string;
}

const SAFE_RULES = [
  "Never invent operational facts: IP addresses, domains, credentials, contacts, authorization dates, testing windows, legal terms, evidence, findings, or approvals.",
  "Where information is missing, use a clearly marked placeholder such as [CLIENT NAME] or an explicit '[MISSING]' note instead of fabricating a value.",
  "Mark any AI-suggested content with the tone 'assumption' and keep it clearly distinguishable from confirmed user-provided facts.",
  "Preserve consistent terminology, names, dates and scope across all sections.",
  "Never start a section's blocks with a heading that repeats or duplicates the section's title. The section title is already rendered automatically in the document header.",
  "Produce structured output: an array of sections, each with id, title, kind, and blocks (heading/paragraph/list/table/callout/divider).",
];

export function buildDocumentPrompt(def: DocumentDefinition): GenerationRequest {
  const system = [
    "You are Draftoryn, an expert document and technical specification generation engine.",
    `Document type: ${def.name} (${def.category}).`,
    `Purpose: ${def.purpose}`,
    `Audience: ${def.intendedAudience}`,
    `Tone: ${def.tone ?? "professional, neutral, precise"}`,
    ...SAFE_RULES,
  ].join("\n");

  const user = [
    `Generate a complete first draft of the document "${def.name}".`,
    `Use the following canonical sections: ${def.sections.map((s) => s.title).join("; ")}.`,
    def.generationInstructions ? `Generation guidance: ${def.generationInstructions}` : "",
    def.terminology?.length ? `Preferred terminology: ${def.terminology.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    system,
    user,
    schema: sectionSchemaText(),
    definitionId: def.id,
  };
}

export function buildSectionPrompt(
  def: DocumentDefinition,
  section: SectionDef,
  model: GeneratedDocument["model"],
): GenerationRequest {
  const system = [
    "You are Draftoryn, an expert document and technical specification generation engine.",
    "Regenerate ONLY the requested section. Do not alter other sections.",
    "Never invent operational facts; use placeholders for missing data.",
    ...SAFE_RULES,
  ].join("\n");

  const user = [
    `Document type: ${def.name}.`,
    `Regenerate section "${section.title}" (kind: ${section.kind}).`,
    `Existing model context - client: ${model.client?.name ?? "[CLIENT NAME]"}; in-scope: ${(model.scope?.inScope ?? []).join(", ") || "[NONE]"}.`,
  ].join("\n");

  return { system, user, schema: sectionSchemaText(), definitionId: def.id, sectionId: section.id };
}

function sectionSchemaText(): string {
  return JSON.stringify(
    {
      type: "object",
      required: ["sections"],
      properties: {
        sections: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "title", "kind", "blocks"],
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              kind: { type: "string" },
              blocks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { enum: ["heading", "paragraph", "list", "table", "callout", "divider"] },
                    text: { type: "string" },
                    level: { type: "number" },
                    items: { type: "array", items: { type: "string" } },
                    table: {
                      type: "object",
                      properties: {
                        headers: { type: "array", items: { type: "string" } },
                        rows: { type: "array", items: { type: "array", items: { type: "string" } } },
                      },
                    },
                    tone: { enum: ["info", "warning", "missing", "assumption", "neutral"] },
                  },
                },
              },
            },
          },
        },
      },
    },
    null,
    2,
  );
}
