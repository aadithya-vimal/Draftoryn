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
  text: z.string().max(20000).optional(),
  level: z.number().int().min(1).max(6).optional(),
  items: z.array(z.string().max(5000)).max(200).optional(),
  table: z
    .object({
      headers: z.array(z.string().max(2000)).max(50),
      rows: z.array(z.array(z.string().max(5000)).max(50)).max(500),
    })
    .optional(),
  tone: z.enum(["info", "warning", "missing", "assumption", "neutral"]).optional(),
});

const sectionSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(300),
  kind: z.string().min(1).max(80),
  blocks: z.array(contentBlockSchema).max(300),
  status: z.string().min(1).max(40),
  hidden: z.boolean().optional(),
  flagged: z.string().max(200).optional(),
  generatedAt: z.string().max(40).optional(),
});

export const generatedDocumentSchema = z.object({
  definitionId: z.string().min(1).max(80),
  title: z.string().min(1).max(300),
  metadata: z
    .record(z.string().max(2000))
    .refine((o) => Object.keys(o).length <= 50, { message: "Too many metadata entries" })
    .optional(),
  model: z.unknown(),
  sections: z.array(sectionSchema).max(100),
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

// ===========================================================================
// Format Validators & Predicates
// ===========================================================================

export function validateEmail(email: string): boolean {
  if (!email || !email.trim()) return true;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

export function validatePhone(phone: string): boolean {
  if (!phone || !phone.trim()) return true;
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  return /^\+?[0-9]{7,15}$/.test(cleaned);
}

export function validateDate(dateStr: string): boolean {
  if (!dateStr || !dateStr.trim()) return true;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match || !match[1] || !match[2] || !match[3]) return false;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const dateObj = new Date(y, m - 1, d);
  return dateObj.getFullYear() === y && dateObj.getMonth() === m - 1 && dateObj.getDate() === d;
}

export function isEmailField(field: FieldDef): boolean {
  if (field.type === "email") return true;
  const id = field.id.toLowerCase();
  const label = (field.label || "").toLowerCase();
  return id.includes("email") || id.includes("mail") || label.includes("email");
}

export function isPhoneField(field: FieldDef): boolean {
  const id = field.id.toLowerCase();
  const label = (field.label || "").toLowerCase();
  return id.includes("phone") || id.includes("tel") || id.includes("mobile") || label.includes("phone");
}

export function isDateField(field: FieldDef): boolean {
  if (field.type === "date") return true;
  const id = field.id.toLowerCase();
  const label = (field.label || "").toLowerCase();
  return (
    id.endsWith("date") ||
    id.startsWith("date") ||
    id.includes("startdate") ||
    id.includes("enddate") ||
    id.includes("authdate") ||
    label.includes("date")
  );
}
