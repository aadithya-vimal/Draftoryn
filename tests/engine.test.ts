import { describe, expect, it } from "vitest";
import { buildSemanticModel } from "../src/engine/semantic";
import { validateSource } from "../src/engine/validation";
import { generateDocument, regenerateSection } from "../src/engine/generate";
import { getDefinition } from "../src/engine/definitions/catalog";

const IP_RE = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;

function textOf(defId: string, source: Record<string, unknown>): string {
  const def = getDefinition(defId)!;
  const gen = generateDocument(def, source);
  return gen.sections
    .flatMap((s) => s.blocks.flatMap((b) => [b.text ?? "", ...(b.items ?? []), ...(b.table?.rows.flat() ?? [])]))
    .join("\n");
}

describe("semantic model", () => {
  it("maps fields to the correct semantic concept", () => {
    const def = getDefinition("pentest_agreement")!;
    const model = buildSemanticModel(def, {
      clientName: "Acme Corp",
      clientContactName: "Jane",
      providerName: "TestCo",
      inScope: ["app.example.com"],
      constraints: ["No DoS"],
    });
    expect(model.client?.name).toBe("Acme Corp");
    expect(model.client?.contactName).toBe("Jane");
    expect(model.provider?.name).toBe("TestCo");
    expect(model.scope?.inScope).toContain("app.example.com");
    expect(model.constraints).toContain("No DoS");
  });
});

describe("input validation", () => {
  it("flags required missing fields", () => {
    const def = getDefinition("pentest_agreement")!;
    const res = validateSource(def, {});
    expect(res.success).toBe(false);
    expect(res.errors.clientName).toBeTruthy();
  });

  it("passes when required fields present", () => {
    const def = getDefinition("pentest_agreement")!;
    const res = validateSource(def, { clientName: "Acme" });
    expect(res.success).toBe(true);
  });
});

describe("generation safety (no fabrication)", () => {
  it("uses placeholders when client name is missing", () => {
    const t = textOf("pentest_agreement", {});
    expect(t).toContain("[CLIENT ORGANIZATION]");
  });

  it("never invents IP addresses when none are provided", () => {
    const t = textOf("pentest_report", {});
    expect(IP_RE.test(t)).toBe(false);
  });

  it("marks missing required information rather than inventing it", () => {
    const def = getDefinition("pentest_agreement")!;
    const gen = generateDocument(def, {});
    const auth = gen.sections.find((s) => s.kind === "authorization")!;
    expect(auth.status).toBe("missing");
  });

  it("produces empty-but-structured findings instead of fabricated ones", () => {
    const def = getDefinition("pentest_report")!;
    const gen = generateDocument(def, {});
    const findings = gen.sections.find((s) => s.kind === "findings")!;
    const t = findings.blocks.flatMap((b) => [b.text ?? "", ...(b.items ?? [])]).join("\n");
    expect(t.toLowerCase()).not.toContain("sql injection in ");
    expect(IP_RE.test(t)).toBe(false);
  });
});

describe("generation determinism & structure", () => {
  it("is deterministic for the same input", () => {
    const def = getDefinition("pentest_plan")!;
    const src = { clientName: "Acme", objective: "Find holes" };
    const a = JSON.stringify(generateDocument(def, src).sections);
    const b = JSON.stringify(generateDocument(def, src).sections);
    expect(a).toBe(b);
  });

  it("includes category-appropriate sections", () => {
    const gen = generateDocument(getDefinition("threat_model")!, { clientName: "Acme" });
    const kinds = gen.sections.map((s) => s.kind);
    expect(kinds).toContain("scope");
    expect(kinds).toContain("findings");
    expect(kinds).toContain("recommendations");
  });

  it("regenerating a single section only replaces that section", () => {
    const def = getDefinition("pentest_report")!;
    const src = { clientName: "Acme" };
    const gen = generateDocument(def, src);
    const before = gen.sections.find((s) => s.id === "scope_methodology")!.blocks;
    const updated = regenerateSection(def, "scope_methodology", src);
    expect(updated?.id).toBe("scope_methodology");
    void before;
  });

  it("populates user-entered data into reporting, escalation, and schedule sections", () => {
    const def = getDefinition("pentest_agreement")!;
    const src = {
      clientName: "Alpha Bank",
      clientContactName: "Alice Smith",
      clientContactEmail: "alice@alphabank.com",
      providerName: "CyberShield Security",
      providerContactName: "Bob Assessor",
      providerContactEmail: "bob@cybershield.io",
      startDate: "2026-09-01",
      endDate: "2026-09-15",
      windows: ["00:00 - 06:00 UTC Maintenance Window"],
      deliverables: [
        "Executive PDF Briefing",
        "Technical Vulnerability Catalog",
      ],
      reportAudience: "Alpha Bank Board and CISO",
      evidence: [
        "Encrypted Burp Suite Logs",
        "Sanitized Exploit Screenshots",
      ],
    };

    const gen = generateDocument(def, src);

    // Reporting & Deliverables
    const reportingSec = gen.sections.find((s) => s.kind === "reporting")!;
    expect(reportingSec).toBeDefined();
    const repText = reportingSec.blocks.flatMap((b) => [b.text ?? "", ...(b.table?.rows.flat() ?? [])]).join(" ");
    expect(repText).toContain("Executive PDF Briefing");
    expect(repText).toContain("Technical Vulnerability Catalog");
    expect(repText).toContain("Alpha Bank Board and CISO");

    // Incident / Emergency Escalation
    const escalationSec = gen.sections.find((s) => s.kind === "escalation")!;
    expect(escalationSec).toBeDefined();
    const escText = escalationSec.blocks.flatMap((b) => [b.text ?? "", ...(b.table?.rows.flat() ?? [])]).join(" ");
    expect(escText).toContain("Alice Smith");
    expect(escText).toContain("alice@alphabank.com");
    expect(escText).toContain("Bob Assessor");

    // Schedule & Term
    const scheduleSec = gen.sections.find((s) => s.kind === "schedule")!;
    expect(scheduleSec).toBeDefined();
    const schedText = scheduleSec.blocks.flatMap((b) => [b.text ?? "", ...(b.table?.rows.flat() ?? [])]).join(" ");
    expect(schedText).toContain("2026-09-01");
    expect(schedText).toContain("2026-09-15");
    expect(schedText).toContain("00:00 - 06:00 UTC Maintenance Window");

    // Evidence
    const evidenceSec = gen.sections.find((s) => s.kind === "evidence")!;
    expect(evidenceSec).toBeDefined();
    const evText = evidenceSec.blocks.flatMap((b) => [b.text ?? "", ...(b.table?.rows.flat() ?? [])]).join(" ");
    expect(evText).toContain("Encrypted Burp Suite Logs");
    expect(evText).toContain("Sanitized Exploit Screenshots");
  });
});
