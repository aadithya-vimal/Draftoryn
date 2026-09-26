import React from "react";
import Head from "expo-router/head";
import { canonicalFor, OG_IMAGE, SITE_NAME, type PageMeta } from "./seo";

interface SeoHeadProps extends PageMeta {
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
}

/** Per-page head tags: title, description, canonical, Open Graph, Twitter. */
export function SeoHead({ title, description, path, noindex, jsonLd }: SeoHeadProps) {
  const canonical = canonicalFor(path);
  const robots = noindex ? "noindex, nofollow" : "index, follow";
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE} />
      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      ) : null}
    </Head>
  );
}
