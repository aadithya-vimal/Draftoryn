import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { PublicHeader } from "../src/ui/PublicHeader";
import { Button, Card, Heading, theme } from "../src/ui/primitives";
import { CATEGORIES, definitionsByCategory } from "../src/engine/definitions/catalog";
import { CATEGORY_VISUALS } from "../src/ui/categories";

export default function SpecificationsPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 840;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      <PublicHeader activeNav="documents" />

      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={styles.maxContainer}>
          <Text style={styles.eyebrow}>TECHNICAL SPECIFICATIONS // 01</Text>
          <Heading level={1} style={isMobile ? styles.h1Mobile : styles.h1}>
            Authoritative Specifications
          </Heading>
          <Text style={styles.heroLead}>
            Deterministic document schemas, verified operational boundaries, and rigorous framework alignments
            across 6 specialized cybersecurity disciplines.
          </Text>

          <View style={styles.specimenMetaBar}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeKey}>TOTAL SPECIFICATIONS</Text>
              <Text style={styles.metaBadgeVal}>30 ACTIVE</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeKey}>PIPELINE</Text>
              <Text style={styles.metaBadgeVal}>DUAL-ENGINE VALIDATED</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeKey}>DATA PERSISTENCE</Text>
              <Text style={styles.metaBadgeVal}>RELATIONAL DATABASE</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Disciplines & Specifications */}
      <View style={styles.contentSection}>
        <View style={styles.maxContainer}>
          {CATEGORIES.map((catKey, catIdx) => {
            const visual = CATEGORY_VISUALS[catKey];
            const docs = definitionsByCategory(catKey);

            return (
              <View key={catKey} style={styles.categoryBlock}>
                {/* Category Header */}
                <View style={styles.categoryHeader}>
                  <View style={styles.catLeft}>
                    <Text style={styles.catNum}>0{catIdx + 1}</Text>
                    <View>
                      <Heading level={2} style={styles.catTitle}>{visual.label}</Heading>
                      <Text style={styles.catDesc}>{visual.blurb}</Text>
                    </View>
                  </View>
                  <View style={styles.specCountBadge}>
                    <Text style={styles.specCountText}>{docs.length} SPECIFICATIONS</Text>
                  </View>
                </View>

                {/* Grid of Documents in this Category */}
                <View style={styles.specGrid}>
                  {docs.map((doc) => (
                    <Card key={doc.id} style={styles.specCard}>
                      <View style={styles.specCardTop}>
                        <Text style={styles.specId}>SPEC-{doc.id.toUpperCase()}</Text>
                        <Text style={styles.specSectionsCount}>{doc.sections.length} SECTIONS</Text>
                      </View>
                      <Text style={styles.specName}>{doc.name}</Text>
                      <Text style={styles.specDescription}>{doc.description}</Text>

                      <View style={styles.specParamsBlock}>
                        <Text style={styles.paramsTitle}>KEY PARAMETERS</Text>
                        <Text style={styles.paramsList}>
                          {doc.fields.slice(0, 4).map(f => f.label).join(" · ")}
                          {doc.fields.length > 4 ? " + " + (doc.fields.length - 4) + " more" : ""}
                        </Text>
                      </View>

                      <View style={styles.specCardFooter}>
                        <Pressable
                          style={styles.draftActionBtn}
                          onPress={() => router.push("/document/new?def=" + doc.id)}
                        >
                          <Text style={styles.draftActionText}>Draft Specification →</Text>
                        </Pressable>
                      </View>
                    </Card>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Standards Alignment Matrix */}
      <View style={styles.standardsSection}>
        <View style={styles.maxContainer}>
          <Text style={styles.eyebrow}>GOVERNANCE & COMPLIANCE // STANDARDS</Text>
          <Heading level={2} style={styles.sectionTitle}>
            Aligned with Industry Frameworks
          </Heading>
          <Text style={styles.sectionSub}>
            Every specification incorporates standardized clause structures aligned with global regulatory mandates.
          </Text>

          <View style={styles.standardsGrid}>
            <View style={styles.standardCard}>
              <Text style={styles.standardName}>NIST SP 800-115 / PTES</Text>
              <Text style={styles.standardDesc}>
                Penetration testing execution standards, explicit rules of engagement, and scoping boundary clauses.
              </Text>
            </View>
            <View style={styles.standardCard}>
              <Text style={styles.standardName}>NIST SP 800-61r2 / ISO 27035</Text>
              <Text style={styles.standardDesc}>
                Computer security incident handling, triage taxonomies, evidence preservation, and post-incident lessons learned.
              </Text>
            </View>
            <View style={styles.standardCard}>
              <Text style={styles.standardName}>MITRE ATT&CK & STIX</Text>
              <Text style={styles.standardDesc}>
                Standardized adversary technique mappings, campaign analysis reports, and threat actor profiles.
              </Text>
            </View>
            <View style={styles.standardCard}>
              <Text style={styles.standardName}>ISO 27001 / SOC 2 / FAIR</Text>
              <Text style={styles.standardDesc}>
                Quantitative risk assessments, risk registers, third-party security audits, and risk exception authorizations.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <View style={styles.maxContainer}>
          <View style={styles.ctaCard}>
            <Text style={styles.ctaEyebrow}>START AUTHORING</Text>
            <Heading level={2} style={styles.ctaTitle}>
              Ready to generate technical specifications?
            </Heading>
            <Text style={styles.ctaLead}>
              Select any of the 30 specifications, define your parameters, and compile authoritative deliverables in seconds.
            </Text>
            <Button
              label="Initialize Workspace Now →"
              onPress={() => router.push("/(auth)/signup")}
              style={{ alignSelf: "center" }}
            />
          </View>
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
  specimenMetaBar: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
  },
  metaBadge: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  metaBadgeKey: { fontFamily: theme.font.mono, fontSize: 10, color: theme.muted, letterSpacing: 0.8 },
  metaBadgeVal: { fontFamily: theme.font.monoMedium, fontSize: 11, color: theme.text, marginTop: 2 },

  contentSection: { paddingVertical: 48 },
  categoryBlock: { marginBottom: 48 },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: theme.border,
    paddingBottom: 16,
    marginBottom: 24,
  },
  catLeft: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  catNum: { fontFamily: theme.font.monoMedium, fontSize: 20, color: theme.accent },
  catTitle: { fontSize: 22, color: theme.text },
  catDesc: { fontFamily: theme.font.sans, fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  specCountBadge: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.borderLight,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  specCountText: { fontFamily: theme.font.monoMedium, fontSize: 10, color: theme.accent, letterSpacing: 1 },

  specGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  specCard: {
    width: "48.8%",
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 20,
  },
  specCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  specId: { fontFamily: theme.font.monoMedium, fontSize: 11, color: theme.accent, letterSpacing: 1 },
  specSectionsCount: { fontFamily: theme.font.mono, fontSize: 10, color: theme.muted },
  specName: { fontFamily: theme.font.sansSemi, fontSize: 17, color: theme.text, marginBottom: 6 },
  specDescription: { fontFamily: theme.font.sans, fontSize: 13, color: theme.textSecondary, lineHeight: 19, marginBottom: 14 },
  specParamsBlock: {
    backgroundColor: theme.surface2,
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
  },
  paramsTitle: { fontFamily: theme.font.monoMedium, fontSize: 9.5, color: theme.muted, letterSpacing: 0.8, marginBottom: 4 },
  paramsList: { fontFamily: theme.font.mono, fontSize: 11, color: theme.text },
  specCardFooter: { flexDirection: "row", justifyContent: "flex-end" },
  draftActionBtn: { paddingVertical: 4 },
  draftActionText: { fontFamily: theme.font.sansSemi, fontSize: 13, color: theme.accent },

  standardsSection: {
    paddingVertical: 56,
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.border,
  },
  sectionTitle: { fontSize: 28, color: theme.text, marginBottom: 8 },
  sectionSub: { fontFamily: theme.font.sans, fontSize: 15, color: theme.textSecondary, marginBottom: 32 },
  standardsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  standardCard: {
    width: "48.8%",
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
    padding: 18,
  },
  standardName: { fontFamily: theme.font.monoMedium, fontSize: 14, color: theme.text, marginBottom: 6 },
  standardDesc: { fontFamily: theme.font.sans, fontSize: 13, color: theme.textSecondary, lineHeight: 18 },

  ctaSection: { paddingVertical: 64 },
  ctaCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.borderLight,
    borderRadius: 10,
    padding: 44,
    alignItems: "center",
    textAlign: "center",
  },
  ctaEyebrow: { fontFamily: theme.font.monoMedium, fontSize: 11, color: theme.accent, letterSpacing: 1.54, marginBottom: 8 },
  ctaTitle: { fontSize: 28, color: theme.text, textAlign: "center", marginBottom: 12 },
  ctaLead: { fontFamily: theme.font.sans, fontSize: 15, color: theme.textSecondary, textAlign: "center", maxWidth: 640, marginBottom: 24 },

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
