# Draftoryn SEO

## Stack

- Expo SDK 52 + expo-router v4, fully client-rendered static SPA.
- `npm run export:web` (`expo export --platform web`) → `dist/`.
- Cloudflare Pages serves `dist/` as static hosting. `wrangler.toml` is the
  API Worker only — Pages behavior comes from `public/_headers` and
  `public/_redirects` (both copied into `dist/` by the export).

## robots.txt / sitemap.xml

- Source: `public/robots.txt`, `public/sitemap.xml`. Expo copies `public/`
  into `dist/` verbatim, and Pages serves existing static files before
  evaluating `_redirects` — so `/* /index.html 200` no longer hijacks them.
- Never implement these as app routes; the SPA router must not see them.
- Sitemap is a hand-maintained static file: 7 canonical public URLs only
  (/, /catalog, /specifications, /architecture, /workflow, /terms,
  /privacy). No auth, app, document, or debug routes.
- `tests/seo.test.ts` enforces: sitemap URLs === `PUBLIC_PAGES`
  canonicals, no duplicates, robots.txt content exact.
- Local preview: `node serve-dist.mjs` (serves `.txt`/`.xml` with correct
  MIME types).

## Metadata

- Contract: `src/ui/seo.ts` (`SITE_URL`, `PUBLIC_PAGES`, `canonicalFor`,
  `buildOrganizationJsonLd`). Rendering: `src/ui/SeoHead.tsx`
  (expo-router `Head`: title, description, robots, canonical, OG, Twitter,
  JSON-LD on home only).
- Root `app/_layout.tsx` intentionally has NO title/description (only the
  static `<title>Draftoryn</title>` fallback in `+html.tsx`) so pages never
  emit duplicates.
- Authenticated zones are noindex: `app/(app)/_layout.tsx`,
  `app/(auth)/_layout.tsx`, `app/document/_layout.tsx`.

## Canonicals

Always `https://draftoryn.pages.dev` + path. Never localhost, previews,
or other domains.

## Internal linking

Public nav (`PublicHeader`), footers, and legal cross-links use plain
`Link` (which renders RN `Text` → a real `<a href>`) so crawlers can
follow Homepage → Catalog/Specifications/Workflow/Architecture →
Terms/Privacy. Never use `Link asChild` with array-styled children:
Radix Slot object-spreads child styles into numeric-keyed garbage, which
crashes React DOM (`Failed to set an indexed property on
'CSSStyleDeclaration'`). Auth CTAs remain JS buttons (targets are
noindex).

## Verify after deploy

1. `curl -sI https://draftoryn.pages.dev/robots.txt` → 200, `text/plain`.
2. `curl -s https://draftoryn.pages.dev/robots.txt` → plain text, no HTML.
3. `curl -s https://draftoryn.pages.dev/sitemap.xml` → valid XML, 7 URLs.
4. View-source on `/` → single title/description/canonical.
5. Google Search Console → URL inspection + sitemap submit.

## Adding a public page

1. Add route + entry in `PUBLIC_PAGES` (unique title/description).
2. Render `<SeoHead {...PUBLIC_PAGES.x} />`.
3. Add its canonical URL to `public/sitemap.xml` (update `lastmod`).
4. Link it from header or footer with `Link`.
5. `npm run test` (SEO contract test fails otherwise).

## Known limitations

- SPA fallback (`/* /index.html 200`) soft-404s unknown URLs with HTTP
  200. True 404s need a Pages Function router (not implemented — would
  change the deployment mode).
- Meta tags render client-side; Google renders JS, but listings depend on
  successful rendering. No SSR without an architecture migration.
- No `site.webmanifest` (icon sizes unverified — a manifest with wrong
  sizes is worse than none). No `ads.txt` (no ad provider).
