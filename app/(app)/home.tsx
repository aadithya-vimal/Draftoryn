import { useEffect, useState } from "react";
import { Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useAppUser } from "../../src/auth/clerk";
import { listDocuments } from "../../src/data/documents";
import {
  CATEGORIES,
  DOCUMENT_DEFINITIONS,
  definitionsByCategory,
  getDefinition,
} from "../../src/engine/definitions/catalog";
import type { DocumentCategory } from "../../src/engine/types";
import type { DocumentSummary } from "../../src/repository/types";
import { Button, Card, Heading, SectionLabel, EmptyState, theme, useTheme } from "../../src/ui/primitives";
import {
  Icon,
  StatusBadge,
  Skeleton,
} from "../../src/ui/components";
import { CATEGORY_VISUALS } from "../../src/ui/categories";
import { OnboardingFlow } from "../../src/ui/OnboardingFlow";
import { fetchUserMe, type OnboardingData, type UserMeResponse } from "../../src/data/onboarding";
import { type WorkspaceRecord } from "../../src/data/workspaces";
import { useWorkspace } from "../../src/context/WorkspaceContext";

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
  const { mode, toggleTheme } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 860;
  const { activeWorkspace } = useWorkspace();
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [userData, setUserData] = useState<UserMeResponse | null>(null);

  const loadData = () => {
    if (!user.isLoaded || !user.isSignedIn || !user.userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    listDocuments(user, activeWorkspace?.id)
      .then((result) => setDocs(result))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));

    fetchUserMe(user).then((res) => {
      if (!res) return;
      setUserData(res);
      if (!res.user.onboardingCompleted) {
        setOnboardingOpen(true);
      }
    });
  };

  useEffect(() => {
    loadData();
  }, [user.userId, user.isLoaded, user.isSignedIn, activeWorkspace?.id]);

  const workspaceName = activeWorkspace?.name || userData?.workspace?.name || "Primary Workspace";
  const userRole = userData?.user?.role || "Security Professional";
  const persona = userData?.user?.onboardingData?.persona || "cybersecurity_professional";

  // Recommend starting specifications based on persona
  const recommendedDefs =
    persona === "client"
      ? ["pentest_agreement", "roe", "pentest_report", "third_party_assessment"]
      : persona === "technical_professional"
      ? ["threat_model", "security_architecture", "cloud_assessment", "app_assessment"]
      : ["pentest_agreement", "roe", "incident_plan", "threat_intel_report"];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      <View style={[styles.container, !isMobile && styles.containerWeb]}>
        
        {/* Workspace Metadata Header */}
        <View style={styles.workspaceHeader}>
          <View style={styles.workspaceHeaderLeft}>
            <View style={styles.statusDot} />
            <Text style={styles.workspaceTag}>
              WORKSPACE // {workspaceName.toUpperCase()}
            </Text>
            <View style={styles.personaPill}>
              <Text style={styles.personaPillText}>{userRole.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.workspaceHeaderRight}>
            <TouchableOpacity
              onPress={toggleTheme}
              style={styles.themeToggleBtn}
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
            >
              <Icon name={mode === "dark" ? "Sun" : "Moon"} size={13} color={theme.text} />
              <Text style={styles.themeToggleText}>
                {mode === "dark" ? "LIGHT" : "DARK"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Banner with Asymmetric Editorial Layout */}
        <View style={[styles.heroRow, isMobile && styles.heroRowMobile]}>
          <View style={[styles.heroTextCol, isMobile ? { width: "100%" } : { flex: 1.2, paddingRight: 36 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <Image
                source={require("../../assets/icon.png")}
                style={{ width: 32, height: 32, borderRadius: 6 }}
                resizeMode="contain"
              />
              <Text style={styles.kicker}>SECURITY SPECIFICATION SYSTEM</Text>
            </View>
            <Heading level={1} style={isMobile ? styles.h1Mobile : styles.h1}>
              Draftoryn
            </Heading>
            <Text style={styles.heroDescription}>
              Professional technical agreements, security evaluations, threat models, and architectural
              specifications. Built with rigorous document schemas, strict typographics, and automatic
              workspace synchronization.
            </Text>

            <View style={[styles.ctaRow, isMobile && { flexDirection: "column", width: "100%", gap: 10 }]}>
              <Button
                label="Create New Document →"
                onPress={() => router.push("/(app)/discover")}
                style={isMobile ? { width: "100%" } : undefined}
              />
              <Button
                label={`Browse ${DOCUMENT_DEFINITIONS.length} Specifications`}
                variant="secondary"
                onPress={() => router.push("/(app)/discover")}
                style={isMobile ? { width: "100%" } : undefined}
              />
            </View>
          </View>

          {/* Right Column: Live Document Specimen Callout */}
          {!isMobile && (
            <View style={styles.specimenCol}>
              <View style={styles.specimenCard}>
                <View style={styles.specimenTop}>
                  <View style={styles.specimenBadge}>
                    <Text style={styles.specimenBadgeText}>SPECIMEN</Text>
                  </View>
                  <Text style={styles.specimenId}>SPEC-SEC-AUTH-001</Text>
                </View>
                <Text style={styles.specimenTitle}>Penetration Testing Authorization</Text>
                <Text style={styles.specimenBlurb}>
                  Standardized legal and operational framework granting formal testing permissions, defining boundary scopes, and emergency contact protocols.
                </Text>
                <View style={styles.specimenDivider} />
                <View style={styles.specimenMetaRow}>
                  <Text style={styles.specimenMetaKey}>FORMATS</Text>
                  <Text style={styles.specimenMetaVal}>PDF • Markdown • DOCX • HTML</Text>
                </View>
                <View style={styles.specimenMetaRow}>
                  <Text style={styles.specimenMetaKey}>SCHEMA</Text>
                  <Text style={styles.specimenMetaVal}>Strict Model + 7 Verified Sections</Text>
                </View>
                <TouchableOpacity
                  style={styles.specimenAction}
                  onPress={() => router.push("/document/new?def=pentest_agreement")}
                >
                  <Text style={styles.specimenActionText}>Instantiate This Specification →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Recommended Starter Documents */}
        <SectionLabel>Recommended for your role</SectionLabel>
        <View style={styles.starterGrid}>
          {recommendedDefs.map((defId) => {
            const def = getDefinition(defId);
            if (!def) return null;
            const visual = CATEGORY_VISUALS[def.category];
            return (
              <TouchableOpacity
                key={defId}
                style={[styles.starterCard, { width: isMobile ? "100%" : "48.5%" }]}
                onPress={() => router.push(`/document/new?def=${defId}`)}
              >
                <Card hover style={styles.starterCardInner}>
                  <View style={styles.starterCardHeader}>
                    <View style={styles.starterIconWrap}>
                      <Icon name={visual.icon} size={15} color={visual.accent} />
                    </View>
                    <Text style={styles.starterCategoryText}>{categoryLabel(def.category).toUpperCase()}</Text>
                    <View style={{ flex: 1 }} />
                    <Icon name="ArrowRight" size={14} color={theme.muted} />
                  </View>
                  <Text style={styles.starterTitle}>{def.name}</Text>
                  <Text style={styles.starterSummary}>{def.description}</Text>
                  <View style={styles.starterFooter}>
                    <Text style={styles.starterMetaText}>
                      {def.sections.length} sections • {def.fields.length} parameters
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recent Work / Documents Grid */}
        <SectionLabel>Your workspace documents</SectionLabel>
        {loading ? (
          <View style={styles.docGrid}>
            {[1, 2].map((i) => (
              <Card key={i} style={[styles.docCard, { width: isMobile ? "100%" : "48.5%" }]}>
                <Skeleton width="60%" height={18} />
                <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
                <Skeleton width="30%" height={12} style={{ marginTop: 14 }} />
              </Card>
            ))}
          </View>
        ) : docs.length === 0 ? (
          <EmptyState
            title="No documents created in this workspace yet"
            subtitle="Choose one of the recommended specifications above or launch a custom agreement."
            action={
              <Button
                label="Create your first document"
                onPress={() => router.push("/(app)/discover")}
              />
            }
          />
        ) : (
          <View style={styles.docGrid}>
            {docs.slice(0, 8).map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.docCard, { width: isMobile ? "100%" : "48.5%" }]}
                onPress={() => router.push(`/document/${d.id}`)}
              >
                <Card hover style={styles.docCardInner}>
                  <Text style={styles.docTitle}>{d.title}</Text>
                  <Text style={styles.docCategory}>{categoryLabel(d.category)}</Text>
                  <View style={styles.docMetaRow}>
                    <StatusBadge status={d.status} />
                    <Text style={styles.docUpdated}>Updated {formatRelative(d.updatedAt)}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
            {docs.length > 8 && (
              <View style={{ width: "100%", alignItems: "center", marginTop: 8 }}>
                <Button
                  label={`View all ${docs.length} documents in Library →`}
                  variant="secondary"
                  onPress={() => router.push("/(app)/library")}
                />
              </View>
            )}
          </View>
        )}

        {/* 6 Technical Disciplines */}
        <SectionLabel>Explore all 6 disciplines</SectionLabel>
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
                <Card style={styles.catInner} hover>
                  <View style={styles.catHeader}>
                    <View style={styles.catIconWrap}>
                      <Icon name={visual.icon} size={18} color={visual.accent} />
                    </View>
                    <Text style={styles.catCountBadge}>{defs.length} SPECS</Text>
                  </View>
                  <Text style={styles.catLabel}>{visual.label}</Text>
                  <Text style={styles.catBlurb}>{visual.blurb}</Text>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>

      </View>

      {/* Persona-driven Onboarding Modal */}
      {onboardingOpen && (
        <OnboardingFlow
          open={onboardingOpen}
          user={user}
          initialData={userData?.user?.onboardingData}
          onComplete={() => {
            setOnboardingOpen(false);
            loadData();
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { paddingTop: 24, paddingBottom: 60, paddingHorizontal: 16 },
  container: { width: "100%", alignSelf: "center" },
  containerWeb: { maxWidth: 1080, paddingHorizontal: 8 },

  workspaceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    marginBottom: 24,
  },
  workspaceHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.ok,
  },
  workspaceTag: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.5,
    color: theme.text,
  },
  personaPill: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: theme.surface2,
    borderRadius: 3,
  },
  personaPillText: {
    fontFamily: theme.font.mono,
    fontSize: 9.5,
    letterSpacing: 1,
    color: theme.mutedLight,
  },
  workspaceHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  themeToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.radiusSm,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
  },
  themeToggleText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10,
    letterSpacing: 1,
    color: theme.text,
  },
  persistenceTag: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: theme.muted,
  },

  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 36,
  },
  heroRowMobile: {
    flexDirection: "column",
  },
  heroTextCol: {},
  kicker: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: theme.accent,
    marginBottom: 8,
  },
  h1: {
    fontFamily: theme.font.sansBlack,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1,
    color: theme.text,
    marginBottom: 12,
  },
  h1Mobile: {
    fontFamily: theme.font.sansBlack,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
    color: theme.text,
    marginBottom: 12,
  },
  heroDescription: {
    fontFamily: theme.font.sans,
    fontSize: 15,
    lineHeight: 23,
    color: theme.mutedLight,
    marginBottom: 22,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  specimenCol: {
    flex: 0.9,
  },
  specimenCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 20,
    gap: 8,
  },
  specimenTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  specimenBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: theme.accentSubtle,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: theme.accent,
  },
  specimenBadgeText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 9,
    letterSpacing: 1,
    color: theme.accent,
  },
  specimenId: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: theme.muted,
  },
  specimenTitle: {
    fontFamily: theme.font.sansBold,
    fontSize: 17,
    color: theme.text,
  },
  specimenBlurb: {
    fontFamily: theme.font.sans,
    fontSize: 12.5,
    lineHeight: 18,
    color: theme.muted,
  },
  specimenDivider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 4,
  },
  specimenMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  specimenMetaKey: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: theme.muted,
  },
  specimenMetaVal: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    color: theme.mutedLight,
  },
  specimenAction: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: theme.border,
  },
  specimenActionText: {
    fontFamily: theme.font.sansSemi,
    fontSize: 12,
    color: theme.accent,
  },

  starterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 32,
    rowGap: 14,
  },
  starterCard: {},
  starterCardInner: {
    padding: 18,
    gap: 6,
    marginBottom: 0,
  },
  starterCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  starterIconWrap: {
    width: 24,
    height: 24,
    borderRadius: theme.radiusSm,
    backgroundColor: theme.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  starterCategoryText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 9.5,
    letterSpacing: 1.5,
    color: theme.muted,
  },
  starterTitle: {
    fontFamily: theme.font.sansBold,
    fontSize: 16,
    color: theme.text,
  },
  starterSummary: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    lineHeight: 18,
    color: theme.muted,
  },
  starterFooter: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: theme.border,
  },
  starterMetaText: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    color: theme.mutedLight,
  },

  docGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 32,
    rowGap: 14,
  },
  docCard: {},
  docCardInner: {
    padding: 18,
    marginBottom: 0,
  },
  docTitle: {
    fontFamily: theme.font.sansBold,
    fontSize: 16,
    color: theme.text,
    marginBottom: 4,
  },
  docCategory: {
    fontFamily: theme.font.sans,
    fontSize: 12.5,
    color: theme.muted,
    marginBottom: 12,
  },
  docMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  docUpdated: {
    fontFamily: theme.font.mono,
    fontSize: 11,
    color: theme.muted,
  },

  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 14,
    marginBottom: 20,
  },
  catCard: {
    marginBottom: 0,
  },
  catInner: {
    padding: 18,
    gap: 6,
    marginBottom: 0,
  },
  catHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  catIconWrap: {
    width: 28,
    height: 28,
    borderRadius: theme.radiusSm,
    backgroundColor: theme.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  catCountBadge: {
    fontFamily: theme.font.mono,
    fontSize: 9.5,
    letterSpacing: 1,
    color: theme.muted,
  },
  catLabel: {
    fontFamily: theme.font.sansBold,
    fontSize: 15,
    color: theme.text,
  },
  catBlurb: {
    fontFamily: theme.font.sans,
    fontSize: 12.5,
    lineHeight: 17,
    color: theme.muted,
  },
});
