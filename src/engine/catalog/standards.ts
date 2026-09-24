// Machine-readable standard/framework mappings. Informational only —
// Draftoryn never claims compliance; UI must render "Mapped to", not "Compliant with".
export interface StandardRef {
  id: string;
  title: string;
  version: string;
  url: string;
}

export const STANDARDS: StandardRef[] = [
  { id: "nist-sp800-115", title: "NIST SP 800-115 Technical Guide to Information Security Testing and Assessment", version: "Final Sep 2008", url: "https://csrc.nist.gov/pubs/sp/800/115/final" },
  { id: "owasp-wstg-reporting", title: "OWASP WSTG — Reporting (Structure, Executive Summary, Findings)", version: "Stable/latest 2024", url: "https://owasp.org/www-project-web-security-testing-guide/stable/5-Reporting/README" },
  { id: "ptes-reporting", title: "PTES — Reporting (Executive + Technical)", version: "v1.0", url: "http://www.pentest-standard.org/index.php/Reporting" },
  { id: "first-cvss-v40", title: "FIRST CVSS v4.0 Specification", version: "v4.0 (Nov 2023)", url: "https://www.first.org/cvss/v4.0/specification-document" },
  { id: "nist-sp800-61r3", title: "NIST SP 800-61 Rev.3 Incident Handling Guide", version: "Rev.3", url: "https://csrc.nist.gov/pubs/sp/800/61/r3/final" },
  { id: "nist-sp800-86", title: "NIST SP 800-86 Guide to Integrating Forensic Techniques", version: "Final", url: "https://csrc.nist.gov/pubs/sp/800/86/final" },
  { id: "iso-29147", title: "ISO/IEC 29147 Vulnerability Disclosure (public overview)", version: "2018", url: "https://www.iso.org/standard/72311.html" },
  { id: "iso-30111", title: "ISO/IEC 30111 Vulnerability Handling Processes (public overview)", version: "2019", url: "https://www.iso.org/standard/69725.html" },
  { id: "csa-ccm-v41", title: "CSA Cloud Controls Matrix", version: "v4.1", url: "https://cloudsecurityalliance.org/research/cloud-controls-matrix/" },
  { id: "nist-csf-20", title: "NIST Cybersecurity Framework", version: "2.0 (Feb 2024)", url: "https://www.nist.gov/cyberframework" },
];

export interface FindingMapping {
  cwe?: string[];
  owaspWstg?: string[];
  nistRef?: string[];
  attck?: string[];
  ccm?: string[];
}

// Curated starter map: category keyword -> mappings. Deterministic, no AI needed.
const KEYWORD_MAP: Array<{ match: RegExp; map: FindingMapping }> = [
  { match: /insecure direct object|idor|bola|broken object/i, map: { cwe: ["CWE-639"], owaspWstg: ["WSTG-ATHZ-04"], nistRef: ["NIST SP 800-115 Sec 5"], attck: ["T1550"] } },
  { match: /sql ?injection|sqli/i, map: { cwe: ["CWE-89"], owaspWstg: ["WSTG-INPV-05"], nistRef: ["NIST SP 800-115 Sec 5"] } },
  { match: /cross-?site scripting|xss/i, map: { cwe: ["CWE-79"], owaspWstg: ["WSTG-INPV-02"] } },
  { match: /broken access|missing authorization|privilege escalation/i, map: { cwe: ["CWE-862", "CWE-269"], owaspWstg: ["WSTG-ATHZ-01"] } },
  { match: /open (port|service)|unnecessary service/i, map: { cwe: ["CWE-1006"], nistRef: ["NIST SP 800-115 Sec 4"] } },
  { match: /missing (patch|update)|outdated|EOL/i, map: { cwe: ["CWE-1104"], nistRef: ["NIST SP 800-115 Sec 4"] } },
  { match: /s3|bucket|public expos|storage/i, map: { cwe: ["CWE-200"], ccm: ["CCM DSI"], nistRef: ["NIST CSF PR.DS"] } },
  { match: /ransomware|containment|eradication/i, map: { nistRef: ["NIST SP 800-61 Rev.3 Sec 3"], attck: ["T1486"] } },
];

export function mapFindingToStandards(title: string, description: string): FindingMapping {
  const text = `${title} ${description}`;
  const out: FindingMapping = {};
  for (const row of KEYWORD_MAP) {
    if (row.match.test(text)) {
      for (const [k, v] of Object.entries(row.map)) {
        const key = k as keyof FindingMapping;
        out[key] = Array.from(new Set([...(out[key] ?? []), ...(v ?? [])]));
      }
    }
  }
  return out;
}
