import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PUBLIC_PAGES,
  SITE_URL,
  buildOrganizationJsonLd,
  canonicalFor,
} from "../src/ui/seo";

const ROOT = process.cwd();

describe("SEO contract", () => {
  it("defines unique titles and descriptions for every public page", () => {
    const pages = Object.values(PUBLIC_PAGES);
    expect(pages.length).toBeGreaterThanOrEqual(7);
    expect(new Set(pages.map((p) => p.title)).size).toBe(pages.length);
    expect(new Set(pages.map((p) => p.description)).size).toBe(pages.length);
    for (const p of pages) {
      expect(p.title.length).toBeGreaterThan(10);
      expect(p.description.length).toBeGreaterThan(40);
      expect(p.title).toContain("Draftoryn");
      for (const bad of ["localhost", "staging", "preview", "portfolio", "lorem"]) {
        expect(`${p.title} ${p.description}`.toLowerCase()).not.toContain(bad);
      }
    }
  });

  it("builds canonical HTTPS URLs on the production hostname", () => {
    expect(canonicalFor("/")).toBe(`${SITE_URL}/`);
    expect(canonicalFor("/catalog")).toBe(`${SITE_URL}/catalog`);
    for (const p of Object.values(PUBLIC_PAGES)) {
      const c = canonicalFor(p.path);
      expect(c.startsWith("https://draftoryn.pages.dev/")).toBe(true);
    }
  });

  it("ships a plain-text robots.txt referencing the sitemap", () => {
    const robots = readFileSync(join(ROOT, "public", "robots.txt"), "utf8");
    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Allow: /");
    expect(robots).toContain("Sitemap: https://draftoryn.pages.dev/sitemap.xml");
    expect(robots).not.toContain("<html");
    expect(robots).not.toContain("Disallow");
  });

  it("ships a valid sitemap with exactly the canonical public URLs", () => {
    const xml = readFileSync(join(ROOT, "public", "sitemap.xml"), "utf8");
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const expected = Object.values(PUBLIC_PAGES).map((p) => canonicalFor(p.path));
    expect([...locs].sort()).toEqual([...expected].sort());
    expect(new Set(locs).size).toBe(locs.length);
    for (const u of locs) {
      expect(u!.startsWith("https://draftoryn.pages.dev/")).toBe(true);
    }
  });

  it("emits honest structured data without fake claims", () => {
    const ld = buildOrganizationJsonLd();
    expect(ld["@type"]).toBe("SoftwareApplication");
    expect(ld["url"]).toBe(SITE_URL);
    expect(ld["aggregateRating"]).toBeUndefined();
    expect(ld["review"]).toBeUndefined();
    expect(ld["author"]).toBeUndefined();
  });
});
