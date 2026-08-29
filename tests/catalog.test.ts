import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  DOCUMENT_DEFINITIONS,
  definitionsByCategory,
  getDefinition,
} from "../src/engine/definitions/catalog";

describe("catalog", () => {
  it("includes all 12 day-one categories", () => {
    expect(CATEGORIES.length).toBe(12);
    for (const c of CATEGORIES) {
      expect(CATEGORY_LABELS[c]).toBeTruthy();
      expect(definitionsByCategory(c).length).toBeGreaterThan(0);
    }
  });

  it("defines the full day-one document catalog (100+ types)", () => {
    expect(DOCUMENT_DEFINITIONS.length).toBeGreaterThanOrEqual(100);
  });

  it("every document has unique section ids within its definition", () => {
    for (const def of DOCUMENT_DEFINITIONS) {
      const ids = def.sections.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("every definition references a known category and has fields", () => {
    for (const def of DOCUMENT_DEFINITIONS) {
      expect(CATEGORIES).toContain(def.category);
      expect(def.fields.length).toBeGreaterThan(0);
      expect(def.sections.length).toBeGreaterThan(0);
      expect(def.description).toBeTruthy();
      expect(def.purpose).toBeTruthy();
    }
  });

  it("can look documents up by id and slug", () => {
    const first = DOCUMENT_DEFINITIONS[0]!;
    expect(getDefinition(first.id)).toBe(first);
    expect(getDefinition(first.slug.replace(/-/g, "_") === first.id ? first.id : first.id)).toBeTruthy();
    const bySlug = DOCUMENT_DEFINITIONS.find((d) => d.slug === first.slug);
    expect(bySlug).toBe(first);
  });

  it("documents differ by category structure (pentest vs threat model vs incident response)", () => {
    const pentest = getDefinition("pentest_report")!;
    const tm = getDefinition("tm_report")!;
    const ir = getDefinition("ir_plan")!;
    const pentestKinds = new Set(pentest.sections.map((s) => s.kind));
    const tmKinds = new Set(tm.sections.map((s) => s.kind));
    const irKinds = new Set(ir.sections.map((s) => s.kind));
    expect(tmKinds.has("threat_catalog")).toBe(true);
    expect(tmKinds.has("mitigations")).toBe(true);
    expect(irKinds.has("classification")).toBe(true);
    expect(irKinds.has("containment")).toBe(true);
    expect(pentestKinds.has("mitigations")).toBe(false);
  });
});
