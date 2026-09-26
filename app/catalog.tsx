import React, { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useAppUser } from "../src/auth/clerk";
import { PublicHeader } from "../src/ui/PublicHeader";
import { SeoHead } from "../src/ui/SeoHead";
import { PUBLIC_PAGES } from "../src/ui/seo";
import { Button, Card, Heading, Input, theme } from "../src/ui/primitives";
import {
  CANONICAL_DOCUMENTS,
  FAMILY_LABELS,
  resolveLegacyDefinitionId,
  type DocumentFamily,
} from "../src/engine/catalog/index";
import { DraggableScrollView } from "../src/ui/DraggableScrollView";

const ALL = "__all__" as const;
const FAMILIES = Object.keys(FAMILY_LABELS) as DocumentFamily[];

export default function CatalogPage() {
  const router = useRouter();
  const user = useAppUser();
  const { width } = useWindowDimensions();
  const isMobile = width < 840;

  const handleDraftClick = (canonicalId: string) => {
    if (!user.isSignedIn) {
      router.push("/(auth)/login");
      return;
    }
    // Canonical docs render through their legacy generation base (backward compat).
    router.push(`/document/new?def=${resolveLegacyDefinitionId(canonicalId)}`);
  };

  const [activeFamily, setActiveFamily] = useState<DocumentFamily | typeof ALL>(ALL);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const inFamily = activeFamily === ALL ? CANONICAL_DOCUMENTS : CANONICAL_DOCUMENTS.filter((d) => d.family === activeFamily);
    if (!q) return inFamily;
    return inFamily.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.canonicalId.toLowerCase().includes(q) ||
        d.variants.some((v) => v.label.toLowerCase().includes(q))
    );
  }, [activeFamily, query]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      <SeoHead {...PUBLIC_PAGES.catalog!} />
      <PublicHeader activeNav="catalog" />

      <View style={styles.hero}>
        <View style={styles.maxContainer}>
          <Text style={styles.eyebrow}>CANONICAL DIRECTORY // 02</Text>
          <Heading level={1} style={isMobile ? styles.h1Mobile : styles.h1}>
            Document Catalog
          </Heading>
          <Text style={styles.heroLead}>
            {CANONICAL_DOCUMENTS.length} canonical documents across {FAMILIES.length} families.
            Each opens variants and modules — one model for generation and intelligence reporting.
          </Text>

          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Search canonical documents, families, or variants (e.g., Pentest, Retest, Forensics)..."
            style={styles.searchInput}
          />

          <DraggableScrollView contentContainerStyle={styles.chipsRow}>
            <Pressable
              style={[styles.chip, activeFamily === ALL && styles.chipActive]}
              onPress={() => setActiveFamily(ALL)}
            >
              <Text style={[styles.chipText, activeFamily === ALL && styles.chipTextActive]}>
                All Families ({CANONICAL_DOCUMENTS.length})
              </Text>
            </Pressable>
            {FAMILIES.map((f) => {
              const count = CANONICAL_DOCUMENTS.filter((d) => d.family === f).length;
              const isSelected = activeFamily === f;
              return (
                <Pressable
                  key={f}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setActiveFamily(f)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {FAMILY_LABELS[f].toUpperCase()} ({count})
                  </Text>
                </Pressable>
              );
            })}
          </DraggableScrollView>
        </View>
      </View>

      <View style={styles.gridSection}>
        <View style={styles.maxContainer}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              SHOWING {filtered.length} CANONICAL DOCUMENTS
            </Text>
            {activeFamily !== ALL && (
              <Pressable onPress={() => setActiveFamily(ALL)}>
                <Text style={styles.clearFilterText}>Clear family filter ✕</Text>
              </Pressable>
            )}
          </View>

          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No matching documents found</Text>
              <Text style={styles.emptySub}>
                Try searching for terms like "Pentest", "Retest", "Forensics", or "Disclosure".
              </Text>
              <Button label="Reset filters" variant="secondary" onPress={() => { setQuery(""); setActiveFamily(ALL); }} />
            </View>
          ) : (
            <View style={styles.catalogGrid}>
              {filtered.map((doc) => (
                <Card key={doc.canonicalId} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.catPill}>
                      <Text style={styles.catPillText}>{FAMILY_LABELS[doc.family].toUpperCase()}</Text>
                    </View>
                    <Text style={styles.sectionBadge}>{doc.modules.length} MODULES</Text>
                  </View>

                  <Text style={styles.cardTitle}>{doc.name}</Text>
                  <Text style={styles.cardDesc}>{doc.description}</Text>

                  <Text style={styles.variantLine}>
                    VARIANTS: {doc.variants.map((v) => v.label).join(" · ")}
                  </Text>
                  {doc.standardsMappings.length > 0 ? (
                    <Text style={styles.mappedLine}>Mapped to: {doc.standardsMappings.slice(0, 3).join(" · ")}</Text>
                  ) : null}

                  <View style={styles.metaRow}>
                    <Text style={styles.metaFormats}>EXPORTS: PDF · DOCX · MD · JSON · XML · YAML · HTML</Text>
                  </View>

                  <View style={styles.cardActionRow}>
                    <Button
                      label={user.isSignedIn ? "Draft Document →" : "Sign in to Draft →"}
                      onPress={() => handleDraftClick(doc.canonicalId)}
                      style={{ width: "100%" }}
                    />
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerInner}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Image
              source={require("../assets/logo.png")}
              style={{ width: 90, height: 24 }}
              resizeMode="contain"
            />
            <Text style={styles.footerText}>© 2026 DRAFTORYN. TECHNICAL EDITORIAL SOFTWARE.</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <Pressable onPress={() => router.push("/terms")}>
              <Text style={[styles.footerText, { color: theme.accent, textDecorationLine: "underline" }]}>TERMS</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/privacy")}>
              <Text style={[styles.footerText, { color: theme.accent, textDecorationLine: "underline" }]}>PRIVACY</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { paddingBottom: 0 },
  maxContainer: { maxWidth: 1180, width: "100%", alignSelf: "center", paddingHorizontal: 32 },

  hero: {
    paddingVertical: 56,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderColor: theme.border,
  },
  eyebrow: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.54,
    color: theme.accent,
    marginBottom: 12,
  },
  h1: { fontSize: 44, color: theme.text, letterSpacing: -1.5, marginBottom: 16 },
  h1Mobile: { fontSize: 32, color: theme.text, letterSpacing: -1, marginBottom: 14 },
  heroLead: {
    fontFamily: theme.font.sans,
    fontSize: 18,
    color: theme.textSecondary,
    lineHeight: 26,
    maxWidth: 780,
    marginBottom: 28,
  },
  searchInput: {
    height: 48,
    backgroundColor: theme.surface2,
    borderColor: theme.border,
    borderRadius: 6,
    fontSize: 15,
    marginBottom: 20,
  },
  chipsRow: { flexDirection: "row", gap: 8, paddingBottom: 4 },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
  },
  chipActive: {
    backgroundColor: theme.surfaceHover,
    borderColor: theme.accent,
  },
  chipText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 12,
    color: theme.muted,
  },
  chipTextActive: {
    color: theme.text,
  },

  gridSection: { paddingVertical: 44 },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  resultsCount: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    color: theme.muted,
  },
  clearFilterText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    color: theme.accent,
  },

  catalogGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  card: {
    width: "32.2%",
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 20,
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  catPill: {
    backgroundColor: theme.accentSubtle,
    borderWidth: 1,
    borderColor: theme.borderActive,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  catPillText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10,
    letterSpacing: 0.8,
    color: theme.accent,
  },
  sectionBadge: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    color: theme.muted,
  },
  cardTitle: {
    fontFamily: theme.font.sansSemi,
    fontSize: 17,
    color: theme.text,
    marginBottom: 8,
  },
  cardDesc: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
    flex: 1,
  },
  variantLine: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 0.4,
    color: theme.textSecondary,
    marginBottom: 6,
  },
  mappedLine: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    color: theme.muted,
    marginBottom: 6,
  },
  metaRow: {
    borderTopWidth: 1,
    borderColor: theme.border,
    paddingTop: 12,
    marginBottom: 16,
  },
  metaFormats: {
    fontFamily: theme.font.mono,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: theme.muted,
  },
  cardActionRow: { width: "100%" },

  emptyState: {
    padding: 48,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    alignItems: "center",
  },
  emptyTitle: { fontFamily: theme.font.sansSemi, fontSize: 18, color: theme.text, marginBottom: 8 },
  emptySub: { fontFamily: theme.font.sans, fontSize: 14, color: theme.textSecondary, marginBottom: 20 },

  footer: {
    height: 60,
    backgroundColor: theme.bg,
    borderTopWidth: 1,
    borderColor: theme.border,
    justifyContent: "center",
  },
  footerInner: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: theme.muted,
  },
});
