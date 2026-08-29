import { z } from "zod";
import type { DocumentDefinition, FieldDef, GeneratedDocument } from "./types";
import { isFieldVisible } from "./semantic";

const fieldSchema = (field: FieldDef): z.ZodTypeAny => {
  switch (field.type) {
    case "number":
      return z.coerce.number();
    case "toggle":
      return z.boolean();
    case "date":
    case "daterange":
    case "email":
    case "url":
    case "text":
    case "textarea":
    case "person":
    case "organization":
      return z.union([z.string(), z.null()]).optional();
    case "select":
      return z.union([z.string(), z.null()]).optional();
    case "list":
    case "multiselect":
      return z.union([z.array(z.string()), z.string(), z.null()]).optional();
    default:
      return z.any().optional();
  }
};

export interface SourceValidationResult {
  success: boolean;
  errors: Record<string, string>;
  data: Record<string, unknown>;
}

export function validateSource(
  def: DocumentDefinition,
  source: Record<string, unknown>,
): SourceValidationResult {
  const errors: Record<string, string> = {};
  const data: Record<string, unknown> = {};

  for (const field of def.fields) {
    if (!isFieldVisible(field, source)) continue;
    const raw = source[field.id];
    const schema = fieldSchema(field);

    if (field.required) {
      const empty =
        raw === undefined ||
        raw === null ||
        raw === "" ||
        (Array.isArray(raw) && raw.length === 0);
      if (empty) {
        errors[field.id] = `${field.label} is required.`;
        continue;
      }
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      errors[field.id] = `${field.label} is invalid.`;
      continue;
    }
    if (raw !== undefined) data[field.id] = parsed.data;
  }

  return {
    success: Object.keys(errors).length === 0,
    errors,
    data,
  };
}

const contentBlockSchema = z.object({
  type: z.enum(["heading", "paragraph", "list", "table", "callout", "divider"]),
  text: z.string().optional(),
  level: z.number().optional(),
  items: z.array(z.string()).optional(),
  table: z
    .object({ headers: z.array(z.string()), rows: z.array(z.array(z.string())) })
    .optional(),
  tone: z.enum(["info", "warning", "missing", "assumption", "neutral"]).optional(),
});

const sectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.string(),
  blocks: z.array(contentBlockSchema),
  status: z.string(),
  hidden: z.boolean().optional(),
  flagged: z.string().optional(),
  generatedAt: z.string().optional(),
});

export const generatedDocumentSchema = z.object({
  definitionId: z.string(),
  title: z.string(),
  metadata: z.record(z.string()).optional(),
  model: z.any(),
  sections: z.array(sectionSchema),
});

export interface GeneratedValidationResult {
  success: boolean;
  error?: string;
  doc?: GeneratedDocument;
}

export function validateGeneratedDocument(input: unknown): GeneratedValidationResult {
  const parsed = generatedDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  return { success: true, doc: parsed.data as unknown as GeneratedDocument };
}
