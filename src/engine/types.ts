// Core type system for the Draftoryn document engine.
// This module is platform-agnostic and must not import any React Native code.

import type { GeneratorMeta } from "./watermark";

export type DocumentCategory =
  | "penetration_testing"
  | "red_team"
  | "vulnerability_assessment"
  | "security_assessment"
  | "cloud_security_assessment"
  | "security_architecture_review"
  | "threat_modeling"
  | "digital_forensics"
  | "incident_response"
  | "vulnerability_disclosure"
  | "bug_bounty"
  | "secure_development";

export type FieldType =
  | "text"
  | "textarea"
  | "date"
  | "daterange"
  | "select"
  | "multiselect"
  | "toggle"
  | "list"
  | "number"
  | "email"
  | "person"
  | "organization"
  | "url";

export type SemanticConcept =
  | "client"
  | "provider"
  | "people"
  | "objective"
  | "scope"
  | "schedule"
  | "authorization"
  | "constraints"
  | "methodology"
  | "evidence"
  | "findings"
  | "risks"
  | "recommendations"
  | "reporting"
  | "assumptions";

export interface FieldCondition {
  field: string;
  equals?: unknown;
  in?: unknown[];
}

export interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
  description?: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  default?: unknown;
  showIf?: FieldCondition;
  /** When true, the field accepts a repeatable list of values or structured rows. */
  repeatable?: boolean;
  /** Structured sub-fields used when repeatable rows are needed (e.g. people). */
  structured?: FieldDef[];
  /** Which semantic concept this input feeds. */
  mapsTo?: SemanticConcept;
  /** Optional key inside the concept (e.g. scope.inScope). */
  mapsKey?: string;
}

export type SectionKind = string;

export interface SectionDef {
  id: string;
  title: string;
  kind: SectionKind;
  required?: boolean;
  /** Optional sections can be hidden by the user. */
  optional?: boolean;
  conditional?: FieldCondition;
  description?: string;
  /** Free-form generation guidance for the AI / deterministic generator. */
  guidance?: string;
}

export type ExportFormat =
  | "pdf"
  | "docx"
  | "markdown"
  | "json"
  | "xml"
  | "yaml"
  | "html";

export interface DocumentDefinition {
  id: string;
  slug: string;
  name: string;
  category: DocumentCategory;
  description: string;
  intendedAudience: string;
  purpose: string;
  fields: FieldDef[];
  sections: SectionDef[];
  tone?: string;
  generationInstructions?: string;
  terminology?: string[];
  outputCapabilities?: ExportFormat[];
}

// ---- Semantic model -------------------------------------------------------

export interface Org {
  name?: string;
  department?: string;
  contactName?: string;
  contactEmail?: string;
  address?: string;
}

export interface Person {
  name?: string;
  role?: string;
  email?: string;
  organization?: string;
}

export interface Finding {
  id: string;
  title: string;
  severity?: string;
  likelihood?: string;
  impact?: string;
  affectedAsset?: string;
  description?: string;
  status?: string;
}

export interface Risk {
  id: string;
  title: string;
  level?: string;
  likelihood?: string;
  impact?: string;
  description?: string;
}

export interface Recommendation {
  id: string;
  title: string;
  priority?: string;
  description?: string;
}

export interface SemanticScope {
  inScope: string[];
  outOfScope: string[];
  conditional: string[];
}

export interface SemanticSchedule {
  start?: string;
  end?: string;
  windows: string[];
}

export interface SemanticAuthorization {
  authorizedBy?: string;
  authorizedParty?: string;
  date?: string;
  reference?: string;
  conditions: string[];
}

export interface SemanticReporting {
  deliverables: string[];
  audience?: string;
  cadence?: string;
}

export interface SemanticModel {
  documentType: string;
  category: DocumentCategory;
  documentName: string;
  client?: Org;
  provider?: Org;
  people: Person[];
  objective?: string;
  scope?: SemanticScope;
  schedule?: SemanticSchedule;
  authorization?: SemanticAuthorization;
  constraints: string[];
  methodology: string[];
  evidence: string[];
  findings: Finding[];
  risks: Risk[];
  recommendations: Recommendation[];
  reporting?: SemanticReporting;
  assumptions: string[];
  extra: Record<string, unknown>;
}

// ---- Generated document ---------------------------------------------------

export type BlockType =
  | "heading"
  | "paragraph"
  | "list"
  | "table"
  | "callout"
  | "divider";

export type BlockTone = "info" | "warning" | "missing" | "assumption" | "neutral";

export interface ContentBlock {
  type: BlockType;
  text?: string;
  level?: number;
  items?: string[];
  table?: { headers: string[]; rows: string[][] };
  tone?: BlockTone;
}

export type SectionStatus =
  | "generated"
  | "empty"
  | "edited"
  | "missing"
  | "ai";

export interface Section {
  id: string;
  title: string;
  kind: SectionKind;
  blocks: ContentBlock[];
  status: SectionStatus;
  hidden?: boolean;
  /** Marks content as assumption / AI-suggested rather than confirmed user fact. */
  flagged?: BlockTone;
  generatedAt?: string;
}

export interface DocumentVersion {
  id: string;
  versionNumber: number;
  title: string;
  createdAt: string;
  note?: string;
  source: Record<string, unknown>;
  model: SemanticModel;
  sections: Section[];
  status: DocumentStatus;
}

export type DocumentStatus =
  | "draft"
  | "generating"
  | "ready"
  | "editing"
  | "exporting"
  | "error";

export type GenerationStatus =
  | "idle"
  | "generating"
  | "validating"
  | "completed"
  | "failed";

export interface GeneratedDocument {
  definitionId: string;
  title: string;
  metadata: Record<string, string>;
  model: SemanticModel;
  sections: Section[];
  /** Canonical Draftoryn attribution. Present on every generated document. */
  generator?: GeneratorMeta;
}

export const CORE_EXPORT_FORMATS: ExportFormat[] = [
  "pdf",
  "docx",
  "markdown",
  "json",
  "xml",
];

export const USEFUL_EXPORT_FORMATS: ExportFormat[] = ["yaml", "html"];
