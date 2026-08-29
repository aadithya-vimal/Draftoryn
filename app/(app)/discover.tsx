import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  CATEGORIES,
  DOCUMENT_DEFINITIONS,
  definitionsByCategory,
} from "../../src/engine/definitions/catalog";
import type { DocumentCategory, DocumentDefinition } from "../../src/engine/types";
import { Card, Heading, Input, SectionLabel, theme } from "../../src/ui/primitives";
import { Icon } from "../../src/ui/components";
import { CATEGORY_VISUALS } from "../../src/ui/categories";

const ALL = "__all__" as const;

export default function Discover() {
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const paramCat =
    typeof params.cat === "string"
      ? (params.cat as DocumentCategory)
      : typeof params.category === "string"
      ? (params.category as DocumentCategory)
      : Array.isArray(params.cat) && params.cat.length > 0
      ? (params.cat[0] as DocumentCategory)
      : undefined;

  const [activeCat, setActiveCat] = useState<DocumentCategory | typeof ALL>(
    paramCat ?? ALL,
  );
  const [query, setQuery] = useState("");

  const filtered = useMemo<DocumentDefinition[]>(() => {
    const q = query.trim().toLowerCase();
    const inCategory =
      activeCat === ALL ? DOCUMENT_DEFINITIONS : definitionsByCategory(activeCat);
    if (!q) return inCategory;
    return inCategory.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q),
    );
  }, [activeCat, query]);

  const isFiltered = activeCat !== ALL || query.trim().length > 0;
  const activeLabel =
    activeCat === ALL ? undefined : CATEGORY_VISUALS[activeCat]?.label;

  const selectCat = (cat: DocumentCategory | typeof ALL) => {
    setActiveCat(cat);
    if (cat === ALL) {
      router.setParams({ cat: undefined, category: undefined });
    } else {
      router.setParams({ cat, category: cat });
    }
  };

  const clearFilters = () => {
    setQuery("");
    setActiveCat(ALL);
    router.setParams({ cat: undefined, category: undefined });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      <View style={styles.header}>
        <Heading level={2} style={isMobile ? styles.titleMobile : styles.title}>
          Document catalog
        </Heading>
        <SectionLabel>Professional technical & security templates</SectionLabel>
      </View>

      <Input
        value={query}
        onChangeText={setQuery}
        placeholder="Search templates by title, standard, or description…"
        style={styles.search}
      />

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        <Pressable
          style={[styles.chip, activeCat === ALL && styles.chipActive]}
          onPress={() => selectCat(ALL)}
        >
          <Text
            style={[
              styles.chipText,
              activeCat === ALL && styles.chipTextActive,
            ]}
          >
            All templates
          </Text>
        </Pressable>
        {CATEGORIES.map((c) => {
          const active = activeCat === c;
          const visual = CATEGORY_VISUALS[c];
          return (
            <Pressable
              key={c}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => selectCat(c)}
            >
              <Icon
                name={visual.icon}
                size={14}
                color={active ? theme.accentForeground : visual.accent}
              />
              <Text
                style={[
                  styles.chipText,
                  active && styles.chipTextActive,
                ]}
              >
                {visual.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isFiltered ? (
        <View style={styles.filterBar}>
          <Text style={styles.filterText}>
            Showing {filtered.length} template
            {filtered.length === 1 ? "" : "s"}
            {activeLabel ? ` in ${activeLabel}` : ""}
            {query.trim() ? ` matching "${query.trim()}"` : ""}
          </Text>
          <Pressable onPress={clearFilters} hitSlop={8}>
            <Text style={styles.clearBtn}>Clear filters</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.grid}>
        {filtered.map((d) => {
          const visual = CATEGORY_VISUALS[d.category];
          return (
            <View
              key={d.id}
              style={[styles.card, { width: isMobile ? "100%" : "31.8%" }]}
            >
              <Card hover style={{ height: "100%" }}>
                <Pressable
                  style={styles.cardPress}
                  onPress={() =>
                    router.push({
                      pathname: "/document/new",
                      params: { def: d.id },
                    })
                  }
                >
                  <View style={styles.cardTop}>
                    <View
                      style={[
                        styles.iconBadge,
                        { backgroundColor: `${visual.accent}14` },
                      ]}
                    >
                      <Icon
                        name={visual.icon}
                        size={18}
                        color={visual.accent}
                      />
                    </View>
                    <Text style={styles.catName} numberOfLines={1}>{visual.label}</Text>
                  </View>

                  <Heading level={3} style={styles.cardTitle}>
                    {d.name}
                  </Heading>

                  <Text style={styles.cardDesc} numberOfLines={3}>
                    {d.description}
                  </Text>

                  <View style={styles.cardFooter}>
                    <Text style={styles.sectionsCount}>
                      {d.sections.length} sections
                    </Text>
                    <View style={styles.startBtn}>
                      <Text style={styles.startBtnText}>Start drafting</Text>
                      <Icon
                        name="ArrowRight"
                        size={14}
                        color={theme.accent}
                      />
                    </View>
                  </View>
                </Pressable>
              </Card>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: {
    padding: 20,
    paddingTop: 28,
    paddingBottom: 48,
    maxWidth: 1080,
    alignSelf: "center",
    width: "100%",
  },
  header: { marginBottom: 18 },
  title: { marginBottom: 6, fontSize: 32 },
  titleMobile: { marginBottom: 6, fontSize: 24 },
  search: { marginBottom: 12 },
  chipRow: { gap: 10, paddingVertical: 14 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radiusSm,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  chipActive: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  chipText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 13,
    color: theme.muted,
  },
  chipTextActive: { color: theme.accentForeground },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: theme.surface2,
    borderRadius: theme.radiusSm,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 14,
  },
  filterText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 13,
    color: theme.text,
  },
  clearBtn: {
    fontFamily: theme.font.sansSemi,
    fontSize: 13,
    color: theme.accent,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  card: { width: "100%" },
  cardPress: { padding: 16 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: theme.radiusSm,
    backgroundColor: theme.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  catName: {
    fontFamily: theme.font.sansMedium,
    fontSize: 12,
    color: theme.muted,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 6,
  },
  cardDesc: {
    fontFamily: theme.font.sans,
    color: theme.muted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  sectionsCount: {
    fontFamily: theme.font.mono,
    fontSize: 11,
    color: theme.muted,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  startBtnText: {
    fontFamily: theme.font.sansSemi,
    fontSize: 13,
    color: theme.accent,
  },
  emptyWrap: {
    padding: 40,
    alignItems: "center",
    backgroundColor: theme.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
  },
  emptyTitle: {
    fontFamily: theme.font.serifSemi,
    fontSize: 18,
    color: theme.text,
    marginBottom: 6,
  },
  emptySub: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.muted,
  },
});
