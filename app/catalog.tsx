import React, { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { PublicHeader } from "../src/ui/PublicHeader";
import { Button, Card, Heading, Input, theme } from "../src/ui/primitives";
import { CATEGORIES, DOCUMENT_DEFINITIONS, definitionsByCategory } from "../src/engine/definitions/catalog";
import { CATEGORY_VISUALS } from "../src/ui/categories";
import { DraggableScrollView } from "../src/ui/DraggableScrollView";
import type { DocumentCategory, DocumentDefinition } from "../src/engine/types";

const ALL = "__all__" as const;

export default function CatalogPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 840;

  const [activeCategory, setActiveCategory] = useState<DocumentCategory | typeof ALL>(ALL);
  const [query, setQuery] = useState("");

  const filtered = useMemo<DocumentDefinition[]>(() => {
    const q = query.trim().toLowerCase();
    const inCategory = activeCategory === ALL ? DOCUMENT_DEFINITIONS : definitionsByCategory(activeCategory);
    if (!q) return inCategory;
    return inCategory.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q)
    );
  }, [activeCategory, query]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      <PublicHeader activeNav="catalog" />

      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={styles.maxContainer}>
          <Text style={styles.eyebrow}>CANONICAL DIRECTORY // 02</Text>
          <Heading level={1} style={isMobile ? styles.h1Mobile : styles.h1}>
            Document Catalog
          </Heading>
          <Text style={styles.heroLead}>
            Search and inspect all 30 canonical cybersecurity specifications. Filter by operational discipline,
            review section schema counts, and launch directly into document creation.
          </Text>

          {/* Search Input */}
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Search specifications by title, acronym, or keywords (e.g., RoE, Pentest, Forensics, BIA)..."
            style={styles.searchInput}
          />

          {/* Category Filter Chips */}
          <DraggableScrollView contentContainerStyle={styles.chipsRow}>
            <Pressable
              style={[styles.chip, activeCategory === ALL && styles.chipActive]}
              onPress={() => setActiveCategory(ALL)}
            >
              <Text style={[styles.chipText, activeCategory === ALL && styles.chipTextActive]}>
                All Specifications ({DOCUMENT_DEFINITIONS.length})
              </Text>
            </Pressable>
            {CATEGORIES.map((c) => {
              const count = definitionsByCategory(c).length;
              const isSelected = activeCategory === c;
              return (
                <Pressable
                  key={c}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setActiveCategory(c)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {CATEGORY_VISUALS[c].label} ({count})
                  </Text>
                </Pressable>
              );
            })}
          </DraggableScrollView>
        </View>
      </View>

      {/* Catalog Results Grid */}
      <View style={styles.gridSection}>
        <View style={styles.maxContainer}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              SHOWING {filtered.length} SPECIFICATIONS
            </Text>
            {activeCategory !== ALL && (
              <Pressable onPress={() => setActiveCategory(ALL)}>
                <Text style={styles.clearFilterText}>Clear discipline filter ✕</Text>
              </Pressable>
            )}
          </View>

          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No matching specifications found</Text>
              <Text style={styles.emptySub}>
                Try searching for terms like "Incident", "Pentest", "Agreement", or "Risk".
              </Text>
              <Button label="Reset filters" variant="secondary" onPress={() => { setQuery(""); setActiveCategory(ALL); }} />
            </View>
          ) : (
            <View style={styles.catalogGrid}>
              {filtered.map((def) => {
                const catVisual = CATEGORY_VISUALS[def.category];
                return (
                  <Card key={def.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.catPill}>
                        <Text style={styles.catPillText}>{catVisual.label.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.sectionBadge}>{def.sections.length} SECTIONS</Text>
                    </View>

                    <Text style={styles.cardTitle}>{def.name}</Text>
                    <Text style={styles.cardDesc}>{def.description}</Text>

                    <View style={styles.metaRow}>
                      <Text style={styles.metaFormats}>EXPORTS: PDF · DOCX · MD · JSON · XML</Text>
                    </View>

                    <View style={styles.cardActionRow}>
                      <Button
                        label="Draft Specification →"
                        onPress={() => router.push("/document/new?def=" + def.id)}
                        style={{ width: "100%" }}
                      />
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* Footer */}
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
          <Text style={styles.footerText}>ENTERPRISE DOCUMENTATION ENGINE</Text>
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
    marginBottom: 16,
    flex: 1,
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
