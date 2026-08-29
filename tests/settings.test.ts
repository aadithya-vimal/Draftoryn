import { describe, expect, it } from "vitest";
import {
  DEFAULT_USER_SETTINGS,
  autofillFromProfiles,
  type UserSettings,
} from "../src/lib/userSettings";

describe("user settings & autofill", () => {
  const sampleSettings: UserSettings = {
    defaultExportFormat: "docx",
    compactLists: true,
    testerProfile: {
      providerName: "Aegis Red Team Labs",
      providerContactName: "Alex Vance",
      providerContactEmail: "alex@aegisred.com",
      providerDepartment: "Offensive Security",
      providerPhone: "+1 555-019-9988",
    },
    clientProfile: {
      clientName: "Global Fintech Solutions",
      clientContactName: "Sarah Connor",
      clientContactEmail: "sconnor@globalfintech.com",
      clientDepartment: "SecOps",
      clientPhone: "+1 555-018-2233",
      authorizedBy: "Chief Information Security Officer",
    },
  };

  it("autofills tester profile fields into source", () => {
    const initialSource = { objective: "Test API security" };
    const filled = autofillFromProfiles(initialSource, sampleSettings, "tester");

    expect(filled.providerName).toBe("Aegis Red Team Labs");
    expect(filled.providerContactName).toBe("Alex Vance");
    expect(filled.providerContactEmail).toBe("alex@aegisred.com");
    expect(filled.providerDepartment).toBe("Offensive Security");
    expect(filled.providerPhone).toBe("+1 555-019-9988");
    expect(filled.objective).toBe("Test API security");
    expect(filled.clientName).toBeUndefined();
  });

  it("autofills client profile fields into source", () => {
    const initialSource = { objective: "Test API security" };
    const filled = autofillFromProfiles(initialSource, sampleSettings, "client");

    expect(filled.clientName).toBe("Global Fintech Solutions");
    expect(filled.clientContactName).toBe("Sarah Connor");
    expect(filled.clientContactEmail).toBe("sconnor@globalfintech.com");
    expect(filled.clientDepartment).toBe("SecOps");
    expect(filled.clientPhone).toBe("+1 555-018-2233");
    expect(filled.authorizedBy).toBe("Chief Information Security Officer");
    expect(filled.providerName).toBeUndefined();
  });

  it("autofills both tester and client profiles when target is all", () => {
    const initialSource = {};
    const filled = autofillFromProfiles(initialSource, sampleSettings, "all");

    expect(filled.providerName).toBe("Aegis Red Team Labs");
    expect(filled.clientName).toBe("Global Fintech Solutions");
    expect(filled.authorizedBy).toBe("Chief Information Security Officer");
  });

  it("handles empty profiles safely without overwriting existing data", () => {
    const initialSource = { clientName: "Existing Corp" };
    const filled = autofillFromProfiles(initialSource, DEFAULT_USER_SETTINGS, "all");

    expect(filled.clientName).toBe("Existing Corp");
  });
});
