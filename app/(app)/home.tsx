import { useEffect, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useAppUser } from "../../src/auth/clerk";
import { listDocuments } from "../../src/data/documents";
import {
  CATEGORIES,
  definitionsByCategory,
} from "../../src/engine/definitions/catalog";
import type { DocumentCategory } from "../../src/engine/types";
import type { DocumentSummary } from "../../src/repository/types";
import { Button, Card, Heading, SectionLabel, EmptyState, theme } from "../../src/ui/primitives";
import {
  Icon,
  StatusBadge,
  Skeleton,
  PageIllustration,
} from "../../src/ui/components";
import { CATEGORY_VISUALS } from "../../src/ui/categories";

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} mo${months === 1 ? "" : "s"} ago`;
  const years = Math.round(months / 12);
  return `${years} yr${years === 1 ? "" : "s"} ago`;
}

function categoryLabel(category: string): string {
  const visual = CATEGORY_VISUALS[category as DocumentCategory];
  return visual ? visual.label : category;
}

export default function Home() {
  const user = useAppUser();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user.isLoaded || !user.isSignedIn || !user.userId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    listDocuments(user)
      .then((result) => {
        if (active) setDocs(result);
      })
      .catch(() => {
        if (active) setDocs([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user.userId, user.isLoaded, user.isSignedIn]);

  const greeting = user.name ? `, ${user.name.split(" ")[0]}` : "";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      <View style={[styles.container, !isMobile && styles.containerWeb]}>
        {/* Hero */}
        <View style={[styles.hero, !isMobile && styles.heroRow]}>
          <View style={[styles.heroText, !isMobile && { paddingRight: 32 }]}>
            <Text style={styles.kicker}>Professional Document Studio</Text>
            <Heading
              level={1}
              style={isMobile ? styles.wordmarkMobile : styles.wordmark}
            >
              Draftoryn
            </Heading>
            <Heading
              level={3}
              style={isMobile ? styles.headlineMobile : styles.headline}
            >
              Generate professional technical & security documents
            </Heading>
            <Text style={[styles.subcopy, { fontSize: isMobile ? 14 : 15, lineHeight: isMobile ? 20 : 22 }]}>
              System specifications, authorized agreements, assessments, and architectural plans — drafted from a curated
              catalog of structured, expert-grade templates.
            </Text>
            <View style={[styles.ctaRow, isMobile && { flexDirection: "column", width: "100%", gap: 10 }]}>
              <Button
                label="Create document"
                onPress={() => router.push("/document/new?def=pentest_agreement")}
                style={isMobile ? { width: "100%" } : undefined}
              />
              {!isMobile ? <View style={styles.ctaSpacer} /> : null}
              <Button
                label="Browse catalog"
                variant="secondary"
                onPress={() => router.push("/(app)/discover")}
                style={isMobile ? { width: "100%" } : undefined}
              />
            </View>
            <Text style={styles.greeting}>
              Welcome back{user.isLoaded && user.isSignedIn ? greeting : ""}
            </Text>
          </View>
          {!isMobile ? (
            <View style={styles.heroArt}>
              <PageIllustration width={240} height={290} />
            </View>
          ) : null}
        </View>

        {/* Categories section */}
        <SectionLabel>Browse by category</SectionLabel>
        <View style={styles.catGrid}>
          {CATEGORIES.map((cat) => {
            const visual = CATEGORY_VISUALS[cat];
            const defs = definitionsByCategory(cat);
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.catCard, { width: isMobile ? "100%" : "31.5%", marginRight: isMobile ? 0 : "2.75%" }]}
                onPress={() => router.push(`/(app)/discover?category=${cat}`)}
              >
                <Card style={styles.catInner} accentTop hover>
                  <View style={[styles.catIconWrap, { backgroundColor: `${visual.accent}14` }]}>
                    <Icon name={visual.icon} size={22} color={visual.accent} />
                  </View>
                  <Text style={styles.catLabel}>{visual.label}</Text>
                  <Text style={styles.catBlurb}>{visual.blurb}</Text>
                  <View style={styles.catFooter}>
                    <Text style={styles.catCount}>{defs.length} templates</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recent documents */}
        <SectionLabel>Recent documents</SectionLabel>
        {loading ? (
          <View style={styles.docGrid}>
            {[1, 2, 3].map((i) => (
              <Card key={i} style={[styles.docCard, { width: isMobile ? "100%" : "48%" }]}>
                <Skeleton width="60%" height={18} />
                <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
                <Skeleton width="30%" height={12} style={{ marginTop: 14 }} />
              </Card>
            ))}
          </View>
        ) : docs.length === 0 ? (
          <EmptyState
            title="No documents drafted yet"
            subtitle="Your recent work will appear here. Choose a template or create your first document above."
            action={
              <Button
                label="Create document"
                onPress={() => router.push("/document/new?def=pentest_agreement")}
              />
            }
          />
        ) : (
          <View style={styles.docGrid}>
            {docs.slice(0, 8).map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.docCard, { width: isMobile ? "100%" : "48%", marginRight: isMobile ? 0 : "2%" }]}
                onPress={() => router.push(`/document/${d.id}`)}
              >
                <Card hover>
                  <Text style={styles.docTitle}>{d.title}</Text>
                  <Text style={styles.docCategory}>{categoryLabel(d.category)}</Text>
                  <View style={styles.docMetaRow}>
                    <StatusBadge status={d.status} />
                    <Text style={styles.docUpdated}>Updated {formatRelative(d.updatedAt)}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { paddingTop: 20, paddingBottom: 40, paddingHorizontal: 16 },
  container: { width: "100%", alignSelf: "center" },
  containerWeb: { maxWidth: 1080, paddingHorizontal: 8 },

  hero: { marginBottom: 28 },
  heroRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroText: { flex: 1 },
  heroArt: { alignItems: "center", justifyContent: "center" },
  kicker: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: theme.accent,
    marginBottom: 8,
  },
  wordmark: { fontSize: 56, lineHeight: 62, letterSpacing: -1.5, marginBottom: 8 },
  wordmarkMobile: { fontSize: 34, lineHeight: 40, letterSpacing: -0.5, marginBottom: 8 },
  headline: { fontSize: 24, lineHeight: 30, marginBottom: 8, color: theme.text },
  headlineMobile: { fontSize: 18, lineHeight: 24, marginBottom: 8, color: theme.text },
  subcopy: {
    fontFamily: theme.font.sans,
    color: theme.muted,
    maxWidth: 560,
    marginBottom: 16,
  },
  ctaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  ctaSpacer: { width: 12 },
  greeting: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.muted,
    marginTop: 12,
  },

  catGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  catCard: { marginBottom: 14 },
  catInner: { marginBottom: 0, padding: 16 },
  catIconWrap: {
    width: 38,
    height: 38,
    borderRadius: theme.radiusSm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  catLabel: {
    fontFamily: theme.font.serifSemi,
    fontSize: 17,
    color: theme.text,
    marginBottom: 4,
  },
  catBlurb: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    lineHeight: 18,
    color: theme.muted,
    marginBottom: 10,
  },
  catFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  catCount: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: theme.accent,
  },

  docGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  docCard: { width: "100%", marginBottom: 14 },
  docCardWeb: { width: "31.5%", marginRight: "2.75%", marginBottom: 18 },
  docTitle: {
    fontFamily: theme.font.serifSemi,
    fontSize: 18,
    color: theme.text,
    marginBottom: 6,
  },
  docCategory: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: theme.muted,
    marginBottom: 14,
  },
  docMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  docUpdated: {
    fontFamily: theme.font.sans,
    fontSize: 12,
    color: theme.muted,
  },

  skeletonGap: { height: 10 },
});
