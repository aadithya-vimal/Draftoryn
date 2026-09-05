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
    const def = getDefinition("pentest_report")!;
    const optionalSectionDef = { id: "custom_notes", title: "Custom Notes", kind: "custom", optional: true };
    const customDef = { ...def, sections: [...def.sections, optionalSectionDef] };
    let sections = createEmptySections(def);
    expect(sections.some((s) => s.id === optionalSectionDef.id)).toBe(false);
    expect(availableSections(customDef, sections).some((s) => s.id === optionalSectionDef.id)).toBe(true);
    const next = addSection(sections, optionalSectionDef);
    expect(next.some((s) => s.id === optionalSectionDef.id)).toBe(true);
    expect(availableSections(customDef, next).some((s) => s.id === optionalSectionDef.id)).toBe(false);
  });

  it("identifies dependent sections for a changed concept (consistency)", () => {
    const def = getDefinition("pentest_agreement")!;
    const deps = sectionKindsToRegenerate(def, "client");
    expect(deps).toContain("parties");
    expect(deps).toContain("authorization");
  });
});

describe("serialization / versioning", () => {
  const v1: DocumentVersion = createVersion(1, "Doc", {}, { documentType: "x", category: "offensive_security", documentName: "Doc", people: [], constraints: [], methodology: [], evidence: [], findings: [], risks: [], recommendations: [], assumptions: [], extra: {} }, [], "draft");
  const v2: DocumentVersion = createVersion(2, "Doc", {}, { documentType: "x", category: "offensive_security", documentName: "Doc", people: [], constraints: [], methodology: [], evidence: [], findings: [], risks: [], recommendations: [], assumptions: [], extra: {} }, [], "draft");

  it("computes next version number", () => {
    expect(nextVersionNumber([v1, v2])).toBe(3);
    expect(nextVersionNumber([])).toBe(1);
  });

  it("returns the latest version", () => {
    expect(latestVersion([v1, v2])?.versionNumber).toBe(2);
  });
});

describe("field validators", () => {
  it("validates emails correctly", async () => {
    const { validateEmail, isEmailField } = await import("../src/engine/validation");
    expect(validateEmail("")).toBe(true);
    expect(validateEmail("user@example.com")).toBe(true);
    expect(validateEmail("first.last+tag@sub.domain.co.uk")).toBe(true);
    expect(validateEmail("invalid-email")).toBe(false);
    expect(validateEmail("@missinguser.com")).toBe(false);
    expect(validateEmail("user@nodot")).toBe(false);

    expect(isEmailField({ id: "clientEmail", label: "Client Contact", type: "text" })).toBe(true);
    expect(isEmailField({ id: "contact", label: "Primary Email Address", type: "text" })).toBe(true);
  });

  it("validates phone numbers correctly", async () => {
    const { validatePhone, isPhoneField } = await import("../src/engine/validation");
    expect(validatePhone("")).toBe(true);
    expect(validatePhone("+1 (555) 123-4567")).toBe(true);
    expect(validatePhone("5551234567")).toBe(true);
    expect(validatePhone("+44 20 7946 0991")).toBe(true);
    expect(validatePhone("123")).toBe(false);
    expect(validatePhone("not-a-phone-number")).toBe(false);

    expect(isPhoneField({ id: "clientPhone", label: "Client Phone Number", type: "text" })).toBe(true);
    expect(isPhoneField({ id: "emergencyContactTel", label: "Emergency Telephone", type: "text" })).toBe(true);
  });

  it("validates dates correctly", async () => {
    const { validateDate, isDateField } = await import("../src/engine/validation");
    expect(validateDate("")).toBe(true);
    expect(validateDate("2026-08-29")).toBe(true);
    expect(validateDate("2024-02-29")).toBe(true); // leap year
    expect(validateDate("2025-02-29")).toBe(false); // non leap year
    expect(validateDate("2026-13-01")).toBe(false); // invalid month
    expect(validateDate("2026-04-31")).toBe(false); // April has 30 days
    expect(validateDate("invalid-date")).toBe(false);

    expect(isDateField({ id: "startDate", label: "Engagement Start", type: "date" })).toBe(true);
    expect(isDateField({ id: "authDate", label: "Authorized On", type: "text" })).toBe(true);
  });
});
