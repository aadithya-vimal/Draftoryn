import { describe, expect, it } from "vitest";
import {
  CANONICAL_DOCUMENTS,
  CATALOG_MIGRATION,
  FAMILY_LABELS,
  canonicalByFamily,
  canonicalForLegacyId,
  getCanonical,
  getValidationRules,
  migrateLegacyId,
  resolveLegacyDefinition,
  resolveLegacyDefinitionId,
  validateRegistry,
} from "../src/engine/catalog/index";
import { DOCUMENT_DEFINITIONS } from "../src/engine/definitions/catalog";

describe("canonical catalog registry", () => {
  it("covers fewer canonical docs than legacy definitions", () => {
    expect(CANONICAL_DOCUMENTS.length).toBeGreaterThan(0);
    expect(CANONICAL_DOCUMENTS.length).toBeLessThan(DOCUMENT_DEFINITIONS.length);
  });

  it("classifies every legacy definition exactly once", () => {
    const legacyIds = new Set(DOCUMENT_DEFINITIONS.map((d) => d.id));
    const mappedIds = new Set(CATALOG_MIGRATION.map((r) => r.legacyId));
    expect(mappedIds).toEqual(legacyIds);
    for (const row of CATALOG_MIGRATION) {
      expect(getCanonical(row.canonicalId)).toBeDefined();
    }
  });

  it("has no duplicate canonical ids and every canonical resolves a generation base", () => {
    const { ok, errors } = validateRegistry();
    expect(errors).toEqual([]);
    expect(ok).toBe(true);
  });

  it("resolves legacy ids to canonical docs (backward compat)", () => {
    expect(migrateLegacyId("roe")).toBe("pentest_engagement");
    expect(migrateLegacyId("pentest_report")).toBe("pentest_report");
    expect(canonicalForLegacyId("ir_playbook")?.canonicalId).toBe("ir_plan");
    expect(resolveLegacyDefinitionId("pentest_report")).toBe("pentest_report");
    expect(resolveLegacyDefinition("pentest_report")?.id).toBe("pentest_report");
  });

  it("exposes families, variants, modules and validation rules", () => {
    const pentest = canonicalByFamily("penetration_testing");
    expect(pentest.length).toBeGreaterThanOrEqual(3);
    for (const family of Object.keys(FAMILY_LABELS)) {
      expect(canonicalByFamily(family as never).length).toBeGreaterThan(0);
    }
    const engagement = getCanonical("pentest_engagement")!;
    expect(engagement.variants.length).toBeGreaterThanOrEqual(5);
    expect(engagement.modules.length).toBeGreaterThanOrEqual(10);
    expect(getValidationRules(engagement)).toContain("require:clientName");
  });
});
