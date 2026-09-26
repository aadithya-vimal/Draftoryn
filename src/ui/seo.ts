// Central SEO configuration: canonical hostname, per-page titles and
// descriptions. Pure data + builders (unit-tested); rendering lives in
// src/ui/SeoHead.tsx. No keyword stuffing, no fake claims.

export const SITE_URL = "https://draftoryn.pages.dev";
export const SITE_NAME = "Draftoryn";
export const OG_IMAGE = `${SITE_URL}/logo.png`;

export interface PageMeta {
  title: string;
  description: string;
  path: string;
}

export const PUBLIC_PAGES: Record<string, PageMeta> = {
  home: {
    title: "Draftoryn — Cybersecurity Document Studio",
    description:
      "Draftoryn is professional cybersecurity document software: answer guided questions and generate penetration testing agreements, assessment reports, authorizations, and disclosure documents — then review, edit, and export.",
    path: "/",
  },
  catalog: {
    title: "Draftoryn — Document Catalog",
    description:
      "Browse 18 canonical cybersecurity documents across 12 families — penetration testing, incident response, forensics, cloud security, and more — and draft directly from the catalog.",
    path: "/catalog",
  },
  specifications: {
    title: "Draftoryn — Technical Specifications",
    description:
      "Deterministic document schemas, verified operational boundaries, and framework alignments across 6 specialized cybersecurity disciplines.",
    path: "/specifications",
  },
  architecture: {
    title: "Draftoryn — How It Works",
    description:
      "Choose a cybersecurity document, answer guided questions, let AI draft from your answers, review every section, and export — on isolated, validated infrastructure.",
    path: "/architecture",
  },
  workflow: {
    title: "Draftoryn — Deterministic Workflow",
    description:
      "A deterministic compiler for security documents: typed parameters, immutable rules, grounded AI drafting, and PDF, DOCX, and Markdown export.",
    path: "/workflow",
  },
  terms: {
    title: "Draftoryn — Terms of Use",
    description: "Terms governing use of Draftoryn technical documentation software.",
    path: "/terms",
  },
  privacy: {
    title: "Draftoryn — Privacy Policy",
    description: "How Draftoryn collects, uses, and protects your data.",
    path: "/privacy",
  },
};

export function canonicalFor(path: string): string {
  const clean = path === "/" ? "/" : `/${path.replace(/^\/+|\/+$/g, "")}`;
  return `${SITE_URL}${clean}`;
}

/** Honest SoftwareApplication markup for the landing page only. */
export function buildOrganizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "Security",
    operatingSystem: "Web",
    description: PUBLIC_PAGES.home!.description,
  };
}
