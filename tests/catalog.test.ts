import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  DOCUMENT_DEFINITIONS,
  definitionsByCategory,
  getDefinition,
} from "../src/engine/definitions/catalog";

describe("catalog", () => {
  it("includes all 6 core cybersecurity categories", () => {
    expect(CATEGORIES.length).toBe(6);
    for (const c of CATEGORIES) {
      expect(CATEGORY_LABELS[c]).toBeTruthy();
      expect(definitionsByCategory(c).length).toBeGreaterThan(0);
    }
  });

  it("defines exactly the 30 core document definitions", () => {
    expect(DOCUMENT_DEFINITIONS.length).toBe(30);
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
    expect(getDefinition(first.slug)).toBe(first);
  });

  it("verifies documents across all 6 domains have rich domain-specific sections", () => {
    const roe = getDefinition("roe")!;
    const ir = getDefinition("ir_plan")!;
    const tm = getDefinition("threat_model")!;
    const risk = getDefinition("cyber_risk_assessment")!;
    const bcp = getDefinition("bcp_plan")!;
    const intel = getDefinition("threat_intel_report")!;

    expect(roe.category).toBe("offensive_security");
    expect(ir.category).toBe("incident_response_dfir");
    expect(tm.category).toBe("security_architecture_engineering");
    expect(risk.category).toBe("risk_governance");
    expect(bcp.category).toBe("resilience");
    expect(intel.category).toBe("threat_intelligence");

    expect(roe.sections.length).toBeGreaterThanOrEqual(8);
    expect(ir.sections.length).toBeGreaterThanOrEqual(8);
    expect(tm.sections.length).toBeGreaterThanOrEqual(8);
  });
});
