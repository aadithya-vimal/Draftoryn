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
  offensive_security: {
    icon: "Crosshair",
    label: "Offensive Security",
    blurb: "Rules of engagement, authorization agreements, penetration testing, and red team reports.",
    accent: "#3B82F6",
  },
  incident_response_dfir: {
    icon: "Siren",
    label: "Incident Response / DFIR",
    blurb: "Incident plans, playbooks, digital forensics, malware analysis, and post-incident reviews.",
    accent: "#EC4899",
  },
  threat_intelligence: {
    icon: "Network",
    label: "Threat Intelligence",
    blurb: "Actor profiles, threat assessments, campaign tracking, and tactical intelligence briefs.",
    accent: "#8B5CF6",
  },
  security_architecture_engineering: {
    icon: "Building2",
    label: "Security Architecture / Engineering",
    blurb: "Threat models, architecture blueprints, design reviews, cloud, and app assessments.",
    accent: "#06B6D4",
  },
  risk_governance: {
    icon: "ShieldCheck",
    label: "Risk / Governance",
    blurb: "Cyber risk assessments, enterprise risk registers, vendor reviews, and exception waivers.",
    accent: "#F59E0B",
  },
  resilience: {
    icon: "RefreshCw",
    label: "Resilience",
    blurb: "Business impact analyses, continuity plans, disaster recovery, and cyber recovery playbooks.",
    accent: "#10B981",
  },
};
