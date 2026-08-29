import { describe, expect, it } from "vitest";
import {
  addSection,
  availableSections,
  createEmptySections,
  hideSection,
  removeSection,
  showSection,
  sectionKindsToRegenerate,
} from "../src/engine/sections";
import { getDefinition } from "../src/engine/definitions/catalog";
import { createVersion, latestVersion, nextVersionNumber } from "../src/engine/serialization";
import type { DocumentVersion } from "../src/engine/types";

describe("sections", () => {
  it("hides and shows sections", () => {
    const def = getDefinition("pentest_report")!;
    const sections = createEmptySections(def);
    const id = sections[0]!.id;
    expect(hideSection(sections, id).find((s) => s.id === id)?.hidden).toBe(true);
    expect(showSection(hideSection(sections, id), id).find((s) => s.id === id)?.hidden).toBeFalsy();
  });

  it("removes a section", () => {
    const def = getDefinition("pentest_report")!;
    const sections = createEmptySections(def);
    const id = sections[0]!.id;
    expect(removeSection(sections, id).some((s) => s.id === id)).toBe(false);
  });

  it("adds an available optional section", () => {
    const def = getDefinition("pentest_communications")!;
    const optional = def.sections.find((s) => s.optional)!;
    let sections = createEmptySections(def);
    sections = removeSection(sections, optional.id);
    expect(sections.some((s) => s.id === optional.id)).toBe(false);
    const next = addSection(sections, optional);
    expect(next.some((s) => s.id === optional.id)).toBe(true);
    expect(availableSections(def, next).some((s) => s.id === optional.id)).toBe(false);
  });

  it("identifies dependent sections for a changed concept (consistency)", () => {
    const def = getDefinition("pentest_agreement")!;
    const deps = sectionKindsToRegenerate(def, "client");
    expect(deps).toContain("parties");
    expect(deps).toContain("authorization");
  });
});

describe("serialization / versioning", () => {
  const v1: DocumentVersion = createVersion(1, "Doc", {}, { documentType: "x", category: "penetration_testing", documentName: "Doc", people: [], constraints: [], methodology: [], evidence: [], findings: [], risks: [], recommendations: [], assumptions: [], extra: {} }, [], "draft");
  const v2: DocumentVersion = createVersion(2, "Doc", {}, { documentType: "x", category: "penetration_testing", documentName: "Doc", people: [], constraints: [], methodology: [], evidence: [], findings: [], risks: [], recommendations: [], assumptions: [], extra: {} }, [], "draft");

  it("computes next version number", () => {
    expect(nextVersionNumber([v1, v2])).toBe(3);
    expect(nextVersionNumber([])).toBe(1);
  });

  it("returns the latest version", () => {
    expect(latestVersion([v1, v2])?.versionNumber).toBe(2);
  });
});
