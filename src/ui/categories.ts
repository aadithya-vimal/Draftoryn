import type { DocumentCategory } from "../engine/types";

export interface CategoryVisual {
  icon: string;
  label: string;
  blurb: string;
  /** Accent used for category cards / identity. */
  accent: string;
}

// Coherent icon system (Lucide) + restrained accent per family.
export const CATEGORY_VISUALS: Record<DocumentCategory, CategoryVisual> = {
  penetration_testing: {
    icon: "Crosshair",
    label: "Penetration Testing",
    blurb: "Authorized simulated attacks to find exploitable weaknesses.",
    accent: "#B8860B",
  },
  red_team: {
    icon: "Swords",
    label: "Red Team",
    blurb: "Goal-based adversarial emulation against people, process, and tech.",
    accent: "#9B2C2C",
  },
  vulnerability_assessment: {
    icon: "ScanLine",
    label: "Vulnerability Assessment",
    blurb: "Systematic identification and rating of vulnerabilities.",
    accent: "#A9791B",
  },
  security_assessment: {
    icon: "ShieldCheck",
    label: "Security Assessment",
    blurb: "Broad evaluation of security posture and controls.",
    accent: "#4F6F52",
  },
  cloud_security_assessment: {
    icon: "Cloud",
    label: "Cloud Security Assessment",
    blurb: "Review of cloud configuration, identity, and workload risk.",
    accent: "#3F6FB0",
  },
  security_architecture_review: {
    icon: "Building2",
    label: "Security Architecture Review",
    blurb: "Evaluation of design, trust boundaries, and control placement.",
    accent: "#5B4B8A",
  },
  threat_modeling: {
    icon: "Network",
    label: "Threat Modeling",
    blurb: "Structured analysis of threats, assets, and trust boundaries.",
    accent: "#7C3AED",
  },
  digital_forensics: {
    icon: "Fingerprint",
    label: "Digital Forensics",
    blurb: "Acquisition, analysis, and preservation of digital evidence.",
    accent: "#4B5563",
  },
  incident_response: {
    icon: "Siren",
    label: "Incident Response",
    blurb: "Detection, containment, and recovery from security incidents.",
    accent: "#9B2C2C",
  },
  vulnerability_disclosure: {
    icon: "Megaphone",
    label: "Vulnerability Disclosure",
    blurb: "Coordinated disclosure and safe-harbor workflow.",
    accent: "#A9791B",
  },
  bug_bounty: {
    icon: "Target",
    label: "Bug Bounty",
    blurb: "Researcher programs and submission handling.",
    accent: "#4F6F52",
  },
  secure_development: {
    icon: "Code2",
    label: "Secure Development",
    blurb: "Secure SDLC, requirements, and review guidance.",
    accent: "#3F6FB0",
  },
};
