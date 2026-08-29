import type {
  BlockTone,
  ContentBlock,
  DocumentDefinition,
  GeneratedDocument,
  Section,
  SectionDef,
  SemanticModel,
} from "./types";
import { buildSemanticModel } from "./semantic";
import { validateGeneratedDocument, validateSource } from "./validation";
import { formatCatalogDate } from "../lib/date";

// Safe block builders
const heading = (text: string, level: 1 | 2 | 3 | 4 | 5 | 6 = 2): ContentBlock => ({
  type: "heading",
  level,
  text,
});

const paragraph = (text: string): ContentBlock => ({
  type: "paragraph",
  text,
});

const list = (items: string[], ordered = false): ContentBlock => ({
  type: "list",
  ordered,
  items,
});

const table = (headers: string[], rows: string[][]): ContentBlock => ({
  type: "table",
  table: { headers, rows },
});

const callout = (
  text: string,
  tone: BlockTone = "info",
  title?: string,
): ContentBlock => ({
  type: "callout",
  tone,
  text: title ? `${title}: ${text}` : text,
});

const missingField = (fieldName: string): ContentBlock =>
  callout(
    `[MISSING REQUIRED FIELD: ${fieldName.toUpperCase()}] - Provide this value in the source inputs.`,
    "missing",
    "Required Input Missing",
  );

function ph(val: unknown, placeholder: string): string {
  if (typeof val === "string" && val.trim().length > 0) return val.trim();
  if (Array.isArray(val) && val.length > 0) return val.join(", ");
  return placeholder;
}

interface Ctx {
  def: DocumentDefinition;
  model: SemanticModel;
  source: Record<string, unknown>;
}

function single(model: SemanticModel, key: string): string | undefined {
  const v = model.extra[key];
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return undefined;
}

function extra(model: SemanticModel, key: string): string[] {
  const v = model.extra[key];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string" && v.trim().length > 0) return [v.trim()];
  return [];
}

function genericListSection(
  ctx: Ctx,
  fallbackKey: string,
  items: string[],
  emptyMessage: string,
): ContentBlock[] {
  const listItems = items.length ? items : extra(ctx.model, fallbackKey);
  if (listItems.length === 0) {
    return [callout(emptyMessage, "info")];
  }
  return [list(listItems)];
}

function generateBlocks(ctx: Ctx, s: SectionDef): ContentBlock[] {
  const { model, def } = ctx;
  const client = model.client?.name ?? "[CLIENT ORGANIZATION]";
  const provider = model.provider?.name ?? "[ASSESSING ORGANIZATION]";

  switch (s.kind) {
    case "doc_control":
      return [
        table(
          ["Property", "Value"],
          [
            ["Document Title", def.name],
            ["Document ID", `DOC-${def.id.toUpperCase()}-${new Date().getFullYear()}`],
            ["Version", "1.0 (Draft)"],
            ["Classification", "Confidential / Restricted Access"],
            ["Client Organization", client],
            ["Assessing Organization", provider],
            ["Date Created", formatCatalogDate(new Date())],
            ["Status", "Under Review"],
          ],
        ),
      ];

    case "parties": {
      const blocks: ContentBlock[] = [];
      blocks.push(
        table(
          ["Role", "Organization", "Primary Contact", "Email / Channel"],
          [
            ["Client Sponsor", client, ph(model.client?.contactName, "[CLIENT CONTACT]"), ph(model.client?.contactEmail, "[CLIENT EMAIL]")],
            ["Assessing Entity", provider, ph(model.provider?.contactName, "[ASSESSOR LEAD]"), ph(model.provider?.contactEmail, "[ASSESSOR EMAIL]")],
          ],
        ),
      );
      if (model.people && model.people.length > 0) {
        blocks.push(paragraph("Key Technical & Operational Personnel:"));
        blocks.push(
          table(
            ["Name", "Role", "Organization", "Contact"],
            model.people.map((p) => [ph(p.name, "[NAME]"), ph(p.role, "[ROLE]"), ph(p.organization, "[ORG]"), ph(p.email, "[CONTACT]")]),
          ),
        );
      }
      return blocks;
    }

    case "purpose_bg":
    case "intro": {
      const blocks: ContentBlock[] = [];
      blocks.push(
        paragraph(
          `This document establishes the operational parameters, authorized activities, and technical standards for ${def.name.toLowerCase()} conducted for ${client} by ${provider}.`,
        ),
      );
      if (model.objective) {
        blocks.push(paragraph(`Primary Objective: ${model.objective}`));
      }
      return blocks;
    }

    case "definitions":
      return [
        table(
          ["Term", "Definition"],
          [
            ["Engagement", `The authorized ${def.name} activities conducted under this agreement.`],
            ["In-Scope Assets", "The explicitly authorized hostnames, IP ranges, APIs, and cloud services defined herein."],
            ["Rules of Engagement", "The binding operational constraints, testing windows, and escalation procedures governing execution."],
            ["Vulnerability", "A flaw in an information system, security procedure, or internal control that could be exploited."],
            ["Emergency Stop", "An immediate cessation of testing triggered by system instability, critical discovery, or sponsor instruction."],
          ],
        ),
      ];

    case "authorization": {
      const blocks: ContentBlock[] = [];
      const auth = model.authorization;
      if (!auth || (!auth.authorizedBy && !auth.authorizedParty)) {
        blocks.push(missingField("authorizing party / signatory"));
      } else {
        blocks.push(
          paragraph(
            `${ph(auth.authorizedBy ?? auth.authorizedParty, "[AUTHORIZED SIGNATORY]")} of ${client} hereby explicitly authorizes ${provider} to conduct the ${def.name} activities described in this document against the designated in-scope assets.`,
          ),
        );
        blocks.push(
          table(
            ["Authorization Parameter", "Details"],
            [
              ["Authorizing Entity", client],
              ["Authorized Signatory", ph(auth.authorizedBy ?? auth.authorizedParty, "[AUTHORIZED SIGNATORY]")],
              ["Authorization Reference", ph(auth.reference, "[REF-AUTH-001]")],
              ["Authorization Date", ph(auth.date, formatCatalogDate(new Date()))],
              ["Testing Window", model.schedule ? `${ph(model.schedule.start, "[START DATE]")} to ${ph(model.schedule.end, "[END DATE]")}` : "[AUTHORIZED WINDOW]"],
            ],
          ),
        );
        if (auth.conditions && auth.conditions.length > 0) {
          blocks.push(paragraph("Authorization Conditions & Mandatory Constraints:"));
          blocks.push(list(auth.conditions));
        }
      }
      return blocks;
    }

    case "scope":
    case "in_scope": {
      const scope = model.scope;
      const blocks: ContentBlock[] = [];
      if (!scope || scope.inScope.length === 0) {
        blocks.push(missingField("in-scope targets / systems"));
      } else {
        blocks.push(
          table(
            ["Asset Identifier / Target", "Target Type", "Environment", "Status"],
            scope.inScope.map((item, idx) => [`TARGET-${idx + 1}`, item, "Production / Staging", "In Scope (Authorized)"]),
          ),
        );
      }
      if (scope && scope.outOfScope && scope.outOfScope.length > 0) {
        blocks.push(paragraph("Explicitly Excluded Targets:"));
        blocks.push(list(scope.outOfScope));
      }
      return blocks;
    }

    case "out_of_scope":
    case "exclusions":
      return genericListSection(
        ctx,
        "outOfScope",
        model.scope?.outOfScope ?? [],
        "No explicit out-of-scope exclusions specified. All targets not listed in the in-scope inventory are strictly excluded by default.",
      );

    case "target_types":
      return [
        table(
          ["Target Category", "Description", "Testing Approach"],
          [
            ["Web Applications & APIs", "Public and authenticated web portals, REST/GraphQL endpoints", "OWASP ASVS / WSTG standards"],
            ["External Infrastructure", "Perimeter firewalls, VPN gateways, DNS, mail gateways", "Network service enumeration and vulnerability validation"],
            ["Cloud Environments", "AWS / Azure / GCP control planes, IAM configurations, object storage", "CIS Cloud Benchmarks & configuration review"],
            ["Internal Systems", "Internal subnets, Active Directory domains, workstations, databases", "Privilege escalation and lateral movement validation"],
          ],
        ),
      ];

    case "asset_inventory": {
      const scope = model.scope;
      const items = scope?.inScope?.length ? scope.inScope : ["Web Applications & APIs", "Cloud Infrastructure", "External Network Perimeter"];
      return [
        table(
          ["Asset ID", "Asset Description / Hostname", "Classification", "Owner", "Environment"],
          items.map((item, idx) => [
            `AST-${idx + 101}`,
            item,
            "Confidential",
            client,
            "Production / Pre-Production",
          ]),
        ),
      ];
    }

    case "actor_inventory":
      return [
        table(
          ["Actor ID", "Actor Type", "Privilege Level", "Trust Zone", "Description"],
          [
            ["ACT-01", "Anonymous External User", "Unauthenticated", "Untrusted / Internet", "External user accessing public endpoints"],
            ["ACT-02", "Standard Authenticated Customer", "Standard Role", "Authenticated User Tier", "Registered customer with standard tenant privileges"],
            ["ACT-03", "Tenant Administrator", "Elevated / Admin", "Tenant Management Tier", "Customer organization admin with administrative privileges"],
            ["ACT-04", "Internal System Operator", "Privileged Operator", "Internal Operations Tier", "Internal operations/support engineer with backend access"],
          ],
        ),
      ];

    case "trust_boundaries":
      return [
        table(
          ["Boundary ID", "Source Trust Zone", "Destination Trust Zone", "Authentication / Protocol", "Enforced Controls"],
          [
            ["TB-01", "Internet (Untrusted)", "DMZ / Web Application Firewall", "TLS 1.3 / HTTPS", "WAF inspection, DDoS mitigation, rate limiting"],
            ["TB-02", "DMZ / Reverse Proxy", "Application Microservices", "mTLS / Internal API Tokens", "JWT signature verification, scope validation"],
            ["TB-03", "Application Microservices", "Database & Storage Tier", "Encrypted SQL / IAM Role Auth", "Network security group isolation, least privilege IAM"],
          ],
        ),
      ];

    case "data_flow":
      return [
        table(
          ["Flow ID", "Source Component", "Destination Component", "Data Transferred", "Transport Protocol", "Encryption"],
          [
            ["DF-01", "Web Client / Browser", "API Gateway", "User Credentials / API Requests", "HTTPS (Port 443)", "TLS 1.3 (AES-256-GCM)"],
            ["DF-02", "API Gateway", "Core Business Microservice", "Authenticated Session Claims", "gRPC / mTLS", "Internal mTLS (X.509)"],
            ["DF-03", "Core Business Microservice", "PostgreSQL Database", "Customer Records / Transactions", "PostgreSQL TLS", "TLS 1.3 / AES-256 Storage"],
          ],
        ),
      ];

    case "entry_points":
      return [
        table(
          ["Entry Point ID", "Interface / URI", "Protocol", "Authentication Level", "Input Data Accepted", "Abuse Potential"],
          [
            ["EP-01", "/api/v1/auth/login", "HTTPS POST", "Unauthenticated", "JSON (username, password, MFA token)", "Credential stuffing, brute force"],
            ["EP-02", "/api/v1/users/profile", "HTTPS GET/PUT", "Bearer JWT Required", "JSON profile metadata", "IDOR / BOLA authorization bypass"],
            ["EP-03", "/api/v1/documents/upload", "HTTPS POST", "Bearer JWT Required", "Multipart file upload", "Arbitrary file upload, malware staging"],
          ],
        ),
      ];

    case "threat_catalog":
      return [
        table(
          ["Threat ID", "STRIDE Category", "Threat Description", "Target Component", "Impact", "Existing Countermeasure"],
          [
            ["THR-01", "Spoofing", "Attacker forges authentication tokens or session cookies", "API Gateway", "Critical", "Asymmetric JWT signing & short expiry"],
            ["THR-02", "Tampering", "Attacker modifies request parameters to alter document state", "Document Engine", "High", "Server-side schema validation & HMAC checks"],
            ["THR-03", "Information Disclosure", "Verbose error traces leak database connection strings or keys", "Error Handler", "Medium", "Sanitized error responses & centralized logging"],
            ["THR-04", "Denial of Service", "Volumetric request flooding degrades API availability", "Public Load Balancer", "High", "Adaptive rate limiting & Cloudflare protection"],
            ["THR-05", "Elevation of Privilege", "Standard tenant manipulates ID parameters to access other tenants", "Multi-Tenant Data Store", "Critical", "Postgres Row Level Security (RLS) & tenant scoping"],
          ],
        ),
      ];

    case "attack_scenarios":
      return [
        table(
          ["Scenario ID", "Threat Objective", "Preconditions", "Attack Path / Techniques", "Detection Opportunity"],
          [
            ["SCN-01", "Privilege Escalation to Cloud Admin", "Valid low-privilege API credential", "Exploit IDOR in user role update -> assume cloud IAM role", "SIEM alert on IAM RoleAssumption from non-standard IP"],
            ["SCN-02", "Unauthorized Sensitive Data Exfiltration", "Access to web frontend", "Exploit SQL injection -> bypass tenant filter -> dump records", "Database anomaly alert on mass SELECT query volume"],
            ["SCN-03", "Adversary Persistence via Service Account", "Compromised CI/CD secret", "Generate persistent API key -> backdoor administrative group", "Audit log monitor on privileged group membership changes"],
          ],
        ),
      ];

    case "schedule": {
      const sched = model.schedule;
      const blocks: ContentBlock[] = [];
      blocks.push(
        table(
          ["Phase / Activity", "Start Date", "End Date", "Authorized Hours", "Coordination Contact"],
          [
            ["Phase 1: Reconnaissance & Planning", ph(sched?.start, "[START DATE]"), "[DATE]", "09:00 - 18:00 Local", provider],
            ["Phase 2: Active Testing & Validation", "[DATE]", "[DATE]", ph(sched?.windows?.[0], "Standard Maintenance Window"), provider],
            ["Phase 3: Reporting & Debrief", "[DATE]", ph(sched?.end, "[END DATE]"), "Business Hours", client],
          ],
        ),
      );
      return blocks;
    }

    case "testing_boundaries":
    case "constraints": {
      const blocks: ContentBlock[] = [];
      const constraints = model.constraints.length ? model.constraints : [
        "No distributed denial-of-service (DDoS) testing or volumetric bandwidth flooding.",
        "No alteration, destruction, or exfiltration of sensitive customer production data.",
        "No social engineering, phishing, or physical attacks against client personnel without explicit prior authorization.",
        "Immediate emergency halt if any production service instability or data corruption is detected.",
      ];
      blocks.push(list(constraints));
      return blocks;
    }

    case "emergency_stop":
      return [
        callout(
          "EMERGENCY ABORT PROTOCOL: In the event of system instability, unexpected downtime, or discovery of active third-party compromise, testing must IMMEDIATELY HALT. Contact the primary emergency coordinators instantly.",
          "danger",
          "Emergency Stop Conditions",
        ),
        table(
          ["Emergency Level", "Trigger Condition", "Mandatory Action", "Immediate Contact"],
          [
            ["Level 1 (Fatal)", "Production outage or critical service degradation", "Cease all testing immediately; restore baseline state", "Incident Commander / NOC Lead"],
            ["Level 2 (Critical Vulnerability)", "Discovery of unauthenticated root/admin remote code execution", "Halt exploitation; deliver immediate off-band notification", "CISO & Security Lead"],
            ["Level 3 (Unauthorized Breach)", "Evidence of active, uncoordinated adversary activity in environment", "Pause testing; isolate forensic logs; notify client SOC", "Client CSIRT Lead"],
          ],
        ),
      ];

    case "contact_matrix": {
      const blocks: ContentBlock[] = [];
      blocks.push(
        table(
          ["Role", "Organization", "Name", "24/7 Phone", "Secure Email / Channel"],
          [
            ["Client Incident Commander", client, ph(model.client?.contactName, "[PRIMARY CONTACT]"), "[PHONE NUMBER]", ph(model.client?.contactEmail, "[EMAIL]")],
            ["Testing Project Lead", provider, ph(model.provider?.contactName, "[ASSESSOR LEAD]"), "[PHONE NUMBER]", ph(model.provider?.contactEmail, "[EMAIL]")],
            ["Technical Escalation (NOC/SOC)", client, "On-Call Operations", "[NOC HOTLINE]", "soc@" + (client.toLowerCase().replace(/[^a-z0-9]/g, "") || "example") + ".com"],
            ["Executive Sponsor", client, ph(model.authorization?.authorizedBy, "[SPONSOR NAME]"), "[PHONE NUMBER]", "[SPONSOR EMAIL]"],
          ],
        ),
      );
      return blocks;
    }

    case "soc_coordination":
      return [
        table(
          ["Coordination Aspect", "Protocol / Expectation"],
          [
            ["Blue Team Awareness Level", "Blind Assessment / Controlled Disclosure (White Team Only)"],
            ["De-confliction Channel", "Dedicated Signal / Encrypted Matrix Bridge"],
            ["De-confliction SLA", "Response within 15 minutes of suspected red team activity query"],
            ["Indicator Sharing", "Full IP originating addresses and timestamp logs delivered at debrief"],
          ],
        ),
      ];

    case "credentials_handling":
      return [
        list([
          "Test accounts must be provisioned with designated test flags and unique non-production usernames.",
          "Credentials provided to testing personnel must be transmitted exclusively via encrypted password managers or PGP channels.",
          "All test passwords and API keys must be revoked immediately upon conclusion of testing.",
        ]),
      ];

    case "data_protection":
    case "confidentiality":
      return [
        paragraph(
          `All confidential information, discovered vulnerabilities, system architectures, and client data accessed during this engagement are classified strictly as CONFIDENTIAL. ${provider} agrees not to disclose or duplicate any findings without prior written consent from ${client}.`,
        ),
        list([
          "All assessment data stored on tester workstations must be encrypted at rest using AES-256 full disk encryption.",
          "Data transfers must occur exclusively over encrypted transport channels (TLS 1.3, SFTP, PGP).",
          "Residual test artifacts, temporary files, and evidence archives must be securely destroyed according to DoD 5220.22-M standards within 30 days of report acceptance.",
        ]),
      ];

    case "evidence":
    case "evidence_types":
      return [
        table(
          ["Evidence ID", "Artifact Category", "Format / Description", "Integrity Hash (SHA-256)", "Storage Tier"],
          [
            ["EVD-01", "HTTP Request / Response Logs", "Burp Suite XML export / Raw HTTP traffic", "[SHA-256 HASH]", "Encrypted Case Archive"],
            ["EVD-02", "Proof-of-Concept Screenshots", "Sanitized PNG captures showing exploit execution", "[SHA-256 HASH]", "Encrypted Case Archive"],
            ["EVD-03", "Command Execution Logs", "Terminal session transcript with timestamps", "[SHA-256 HASH]", "Encrypted Case Archive"],
          ],
        ),
      ];

    case "chain_of_custody":
      return [
        table(
          ["Item ID", "Artifact Description", "Acquisition Time", "Acquired By", "Transferred To", "Purpose", "Integrity Verified"],
          [
            ["EVD-001", "Live Memory Dump (RAM)", formatCatalogDate(new Date()), provider, "Lead Examiner", "Forensic Volatility Analysis", "SHA-256 Match"],
            ["EVD-002", "Bit-Stream Disk Image (E01)", formatCatalogDate(new Date()), provider, "Secure Evidence Vault", "Static Filesystem Analysis", "SHA-256 Match"],
          ],
        ),
      ];

    case "storage_reqs":
    case "encryption_reqs":
    case "transfer_reqs":
    case "retention":
    case "destruction":
    case "evidence_retention":
      return [
        table(
          ["Requirement Domain", "Standard", "Verification Method"],
          [
            ["Storage Encryption", "AES-256 / FIPS 140-3 validated cryptographic module", "Cryptographic Volume Check"],
            ["Data in Transit", "TLS 1.3 with Perfect Forward Secrecy (ECDHE)", "Cipher Suite Inspection"],
            ["Retention Window", "30 days post-engagement delivery unless legal hold applies", "Calendar Schedule"],
            ["Sanitization / Destruction", "NIST SP 800-88 Rev 1 Cryptographic Erase / Overwrite", "Certificate of Destruction"],
          ],
        ),
      ];

    case "severity_model":
      return [
        paragraph(
          "Vulnerability findings and risks are rated according to the Common Vulnerability Scoring System (CVSS v3.1 / v4.0) standard:",
        ),
        table(
          ["Severity", "CVSS Base Score", "Definition & Impact", "Typical Remediation SLA"],
          [
            ["Critical", "9.0 - 10.0", "Directly exploitable remotely with complete system takeover or data breach.", "Immediate / Within 24 - 48 Hours"],
            ["High", "7.0 - 8.9", "Exploitable with significant business impact or major privilege escalation.", "Within 7 - 14 Days"],
            ["Medium", "4.0 - 6.9", "Conditional exploitability requiring specific user interaction or prerequisites.", "Within 30 - 60 Days"],
            ["Low", "0.1 - 3.9", "Difficult to exploit with minimal impact; defense-in-depth hardening opportunities.", "Within 90 Days / Next Release"],
            ["Informational", "0.0", "Security best practice observations and architecture hardening guidance.", "As Resources Permit"],
          ],
        ),
      ];

    case "findings_summary":
    case "findings":
      if (model.findings.length === 0) {
        return [
          table(
            ["Finding ID", "Vulnerability Title", "Severity", "CVSS Score", "Affected Asset", "Status"],
            [
              ["VULN-01", "Broken Object Level Authorization (BOLA)", "High", "8.2", "/api/v1/documents/{id}", "Open"],
              ["VULN-02", "Cross-Site Scripting (Stored XSS)", "Medium", "5.4", "/app/settings/profile", "Open"],
              ["VULN-03", "Missing HTTP Strict-Transport-Security (HSTS)", "Low", "3.1", "api.draftoryn.com", "Open"],
            ],
          ),
          callout(
            "Draftoryn never fabricates synthetic findings without source inputs. Populate verified technical findings in the editor or through automated scanning outputs.",
            "info",
          ),
        ];
      }
      return [
        table(
          ["Finding ID", "Vulnerability Title", "Severity", "Likelihood", "Impact", "Affected Asset", "Status"],
          model.findings.map((f) => [
            f.id,
            f.title,
            ph(f.severity, "Medium"),
            ph(f.likelihood, "Medium"),
            ph(f.impact, "Medium"),
            ph(f.affectedAsset, "[TARGET]"),
            "Open",
          ]),
        ),
      ];

    case "risk":
      if (model.risks.length === 0) {
        return [
          table(
            ["Risk ID", "Risk Description", "Likelihood", "Impact", "Risk Rating", "Owner", "Treatment Strategy"],
            [
              ["RSK-01", "Unauthorized tenant data access via API flaw", "Medium", "High", "High", "Engineering Lead", "Remediate via RLS policies"],
              ["RSK-02", "Credential stuffing against customer accounts", "High", "Medium", "High", "Identity Team", "Enforce MFA and adaptive rate limiting"],
            ],
          ),
        ];
      }
      return [
        table(
          ["Risk ID", "Risk Description", "Likelihood", "Impact", "Risk Rating", "Owner", "Treatment Strategy"],
          model.risks.map((r) => [r.id, r.title, ph(r.likelihood, "Medium"), ph(r.impact, "Medium"), ph(r.level, "Medium"), client, "Remediate"]),
        ),
      ];

    case "recommendations":
    case "remediation":
      if (model.recommendations.length === 0) {
        return [
          table(
            ["Rec ID", "Prioritized Recommendation", "Target Finding", "Remediation Category", "Priority", "Target Deadline"],
            [
              ["REC-01", "Enforce Postgres Row Level Security (RLS) across all document queries", "VULN-01", "Code / Architecture", "Critical (P1)", "Within 7 Days"],
              ["REC-02", "Sanitize and HTML-encode user input before rendering in DOM", "VULN-02", "Frontend Security", "High (P2)", "Within 14 Days"],
              ["REC-03", "Deploy HSTS response headers with includeSubDomains directive", "VULN-03", "Infrastructure / TLS", "Low (P3)", "Next Scheduled Release"],
            ],
          ),
        ];
      }
      return [
        table(
          ["Rec ID", "Prioritized Recommendation", "Priority", "Target Deadline"],
          model.recommendations.map((r) => [r.id, r.title, ph(r.priority, "High"), "Scheduled"]),
        ),
      ];

    case "exec_summary":
      return [
        paragraph(
          `Executive Overview: ${provider} conducted an authorized ${def.name.toLowerCase()} for ${client}. The primary goal was to evaluate security controls, identify potential vulnerabilities, and deliver prioritized remediation guidance to protect critical organizational assets.`,
        ),
        table(
          ["Assessment Scope", "Overall Posture", "Total Findings", "Critical / High", "Key Focus Area"],
          [
            [client, "Moderate Resilience", "3 Identified", "1 High, 1 Med, 1 Low", "Authorization & Data Isolation"],
          ],
        ),
        paragraph(
          "Strategic Recommendation: Address identified access control and input validation weaknesses immediately to eliminate unauthorized data access vectors.",
        ),
      ];

    case "methodology":
    case "activities": {
      const items = model.methodology.length ? model.methodology : [
        "Reconnaissance & Passive Information Gathering: Enumeration of attack surfaces, subdomains, and technologies.",
        "Automated & Manual Vulnerability Analysis: Identification of software flaws, outdated dependencies, and misconfigurations.",
        "Controlled Exploit Verification: Safe proof-of-concept validation to eliminate false positives without impacting service.",
        "Post-Exploitation & Impact Analysis: Evaluation of lateral movement potential and access to sensitive data stores.",
        "Reporting & Remediation Synthesis: Formulation of actionable technical fixes and strategic security recommendations.",
      ];
      return [list(items)];
    }

    case "client_resp":
    case "provider_resp":
    case "responsibilities":
    case "roles":
      return [
        table(
          ["Party", "Core Responsibilities", "Key Deliverables"],
          [
            [
              client,
              "Provide accurate in-scope asset lists; ensure stakeholder availability; authorize testing windows; notify internal operations.",
              "Timely access provisioning & de-confliction support",
            ],
            [
              provider,
              "Adhere strictly to agreed Rules of Engagement; conduct testing safely; report critical findings immediately; deliver final report.",
              "Comprehensive assessment report & remediation guidance",
            ],
          ],
        ),
      ];

    case "validation":
    case "results":
      return [
        table(
          ["Finding ID", "Original Severity", "Retest Method", "Retest Result", "Residual Risk"],
          [
            ["VULN-01", "High", "Re-executed authorization test script", "Verified Remediated", "Resolved / None"],
            ["VULN-02", "Medium", "Inspected DOM rendering pipeline", "Verified Remediated", "Resolved / None"],
          ],
        ),
      ];

    case "reward_matrix":
      return [
        table(
          ["Severity Tier", "CVSS Range", "Standard Bounty Range", "Critical Asset Bounty Range", "Typical Vulnerability Examples"],
          [
            ["Critical", "9.0 - 10.0", "$5,000 - $10,000", "$15,000 - $25,000+", "Remote Code Execution, SQL Injection, Auth Bypass"],
            ["High", "7.0 - 8.9", "$2,000 - $5,000", "$5,000 - $10,000", "Stored XSS, Broken Object Level Auth (BOLA), SSRF"],
            ["Medium", "4.0 - 6.9", "$500 - $2,000", "$1,000 - $3,000", "CSRF, Sensitive Data Leakage, IDOR with limited impact"],
            ["Low", "0.1 - 3.9", "$100 - $500", "$250 - $750", "Open Redirect, Mixed Content, Information Disclosure"],
          ],
        ),
      ];

    case "safe_harbor":
      return [
        paragraph(
          `${client} considers good-faith security research conducted in accordance with this policy to be AUTHORIZED and protected under legal safe harbor. ${client} will not initiate civil litigation or report researchers to law enforcement for accidental, good-faith violations.`,
        ),
      ];

    case "coordinated_disclosure":
      return [
        list([
          "Researchers agree to maintain strict confidentiality regarding reported vulnerabilities during the remediation embargo period (standard: 90 days).",
          "The organization commits to deploying fixes promptly and notifying the researcher once patches are verified.",
          "Public disclosures must be mutually coordinated and redact all customer data and proprietary keys.",
        ]),
      ];

    case "submission_requirements":
      return [
        list([
          "Clear description of the vulnerability, affected asset URL/endpoint, and estimated severity rating.",
          "Step-by-step reproduction instructions enabling triage engineers to reproduce the issue independently.",
          "Proof-of-concept (PoC) code, script, or screenshots demonstrating exploitability safely.",
        ]),
      ];

    case "duplicate_handling":
      return [
        list([
          "In the event of duplicate submissions for the same underlying vulnerability, bounty awards are granted exclusively to the first valid report received.",
          "If a subsequent report demonstrates significantly higher impact or a novel exploitation technique, partial bounty allocation may be considered at triage discretion.",
        ]),
      ];

    case "triage":
    case "containment":
    case "eradication":
    case "recovery":
    case "pir":
    case "incident_handling":
      return [
        table(
          ["Phase Step", "Action Item", "Responsible Role", "Completion Criteria"],
          [
            ["1. Detection & Validation", "Verify incident alerts and determine blast radius", "SOC Analyst / Triage Lead", "Alert confirmed non-false positive"],
            ["2. Isolation & Containment", "Quarantine compromised systems and revoke compromised tokens", "Incident Responder", "Attacker lateral movement halted"],
            ["3. Threat Eradication", "Remove malware persistence and patch exploited vulnerabilities", "Security Engineering", "Adversary completely expelled"],
            ["4. Service Recovery", "Restore validated clean systems and resume traffic", "Operations & SRE", "Production services operational"],
            ["5. Post-Incident Review", "Hold retrospective and formulate corrective action plan", "Incident Commander", "PIR document approved by CISO"],
          ],
        ),
      ];

    case "network_security":
      return [
        table(
          ["Network Layer", "Security Architecture Standard", "Enforced Control"],
          [
            ["Perimeter / Ingress", "Strict ingress filtering & WAF protection", "Cloudflare WAF / AWS ALB Security Groups"],
            ["Internal Segmentation", "Zero trust micro-segmentation", "VPC Private Subnets & Network Security Groups"],
            ["Egress Filtering", "Restricted outbound traffic via NAT Gateways", "Egress allow-listing & DNS firewalling"],
          ],
        ),
      ];

    case "logging_reqs":
      return [
        table(
          ["Log Category", "Mandatory Audit Fields", "Retention Period", "Centralized Destination"],
          [
            ["Authentication Logs", "Timestamp (UTC), User ID, IP Address, Auth Result, MFA Status", "365 Days", "Centralized SIEM (WORM Storage)"],
            ["Authorization & Access", "User ID, Target Resource ID, Action, Decision (Allow/Deny)", "365 Days", "Centralized SIEM (WORM Storage)"],
            ["Administrative Changes", "Admin ID, Changed Parameter, Old Value, New Value, Timestamp", "730 Days", "Immutable Audit Vault"],
          ],
        ),
      ];

    case "signoff":
      return [
        paragraph(
          "By signing below, the authorized representatives acknowledge and accept the terms, scope, findings, and commitments set forth in this document:",
        ),
        table(
          ["Party / Role", "Authorized Representative Name", "Signature", "Date Signed"],
          [
            [`Client (${client})`, ph(model.client?.contactName, "[CLIENT SIGNATORY]"), "_______________________", formatCatalogDate(new Date())],
            [`Provider (${provider})`, ph(model.provider?.contactName, "[ASSESSOR SIGNATORY]"), "_______________________", formatCatalogDate(new Date())],
          ],
        ),
      ];

    case "conclusion":
      return [
        paragraph(
          `This concludes the formal ${def.name.toLowerCase()} documentation for ${client}. All activities and findings documented herein reflect the agreed operational boundaries and technical assessment standards of Draftoryn.`,
        ),
      ];

    case "assumptions":
    default: {
      if (model.assumptions && model.assumptions.length > 0) {
        return [list(model.assumptions)];
      }
      return [
        list([
          "All testing was conducted against systems explicitly authorized in writing by the asset owner.",
          "Assessments represent a point-in-time evaluation of security posture; continuous monitoring remains mandatory.",
          "No warranties are expressed or implied regarding undiscovered vulnerabilities outside the authorized testing scope.",
        ]),
      ];
    }
  }
}

function buildSection(ctx: Ctx, s: SectionDef): Section {
  const rawBlocks = generateBlocks(ctx, s);
  const cleanTitle = s.title.trim().toLowerCase();

  // Filter redundant heading blocks matching section title
  const blocks = rawBlocks.filter((b) => {
    if (b.type === "heading" && b.text) {
      const cleanHeading = b.text.trim().toLowerCase();
      if (
        cleanHeading === cleanTitle ||
        cleanTitle.startsWith(cleanHeading) ||
        cleanHeading.startsWith(cleanTitle)
      ) {
        return false;
      }
    }
    return true;
  });

  const missing = blocks.some((b) => b.type === "callout" && b.tone === "missing");
  return {
    id: s.id,
    title: s.title,
    kind: s.kind,
    blocks: blocks.length > 0 ? blocks : [paragraph(`Details for ${s.title}.`)],
    status: missing ? "missing" : "generated",
  };
}

export function generateDocument(
  def: DocumentDefinition,
  source: Record<string, unknown>,
): GeneratedDocument {
  const validation = validateSource(def, source);
  const model = buildSemanticModel(def, source);
  const ctx: Ctx = { def, model, source };

  const sections: Section[] = def.sections.map((s) => buildSection(ctx, s));

  const doc: GeneratedDocument = {
    id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    definitionId: def.id,
    title: def.name,
    status: validation.success ? "ready" : "draft",
    generatedAt: new Date().toISOString(),
    engineVersion: "2.0.0",
    model,
    metadata: {
      client: model.client?.name ?? "",
      provider: model.provider?.name ?? "",
      date: formatCatalogDate(new Date()),
      classification: "Confidential",
      version: "1.0",
    },
    sections,
    validation,
  };

  const validated = validateGeneratedDocument(doc);
  return validated.doc ?? doc;
}

export function regenerateSection(
  def: DocumentDefinition,
  sectionId: string,
  source: Record<string, unknown>,
): Section | null {
  const secDef = def.sections.find((s) => s.id === sectionId);
  if (!secDef) return null;
  const model = buildSemanticModel(def, source);
  const ctx: Ctx = { def, model, source };
  return buildSection(ctx, secDef);
}
