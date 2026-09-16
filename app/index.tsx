import React, { useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useAppUser } from "../src/auth/clerk";
import { Button, Card, Heading, theme } from "../src/ui/primitives";
import { GradientText } from "../src/ui/GradientText";
import { DocMark, ExportChips, PageStack, Reveal } from "../src/ui/DocGraphics";
import { Icon } from "../src/ui/components";
import { CATEGORIES, definitionsByCategory } from "../src/engine/definitions/catalog";
import { CATEGORY_VISUALS } from "../src/ui/categories";
import { PublicHeader } from "../src/ui/PublicHeader";

export default function LandingPage() {
  const { isLoaded, isSignedIn } = useAppUser();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 840;
  const isTablet = width >= 840 && width < 1100;

  const [activeCatalogCat, setActiveCatalogCat] = useState(CATEGORIES[0]!);

  if (isLoaded && isSignedIn) {
    return <Redirect href="/(app)/home" />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      <PublicHeader activeNav={null} />

      {/* ========================================================================= */}
      {/* 02. HERO (Split Composition: Left: Typographic Statement | Right: UI)     */}
      {/* ========================================================================= */}
      <View style={styles.heroSection}>
        <View style={[styles.heroContainer, isMobile && { flexDirection: "column" }]}>
          
          {/* Left Column */}
          <View style={[styles.heroTextCol, isMobile ? { width: "100%" } : { width: "52%", paddingRight: 48 }]}>
            <Text style={styles.heroEyebrow}>CYBERSECURITY DOCUMENTATION / 01</Text>

            <GradientText style={[styles.heroHeadline, isMobile ? styles.heroHeadlineMobile : isTablet ? styles.heroHeadlineTablet : styles.heroHeadlineDesktop]}>
              Cybersecurity documents, generated precisely.
            </GradientText>

            <Text style={styles.heroBody}>
              Draftoryn is professional cybersecurity document software. Answer guided
              questions and generate penetration testing agreements, statements of work,
              authorization letters, rules of engagement, assessment reports,
              incident-response documents, vulnerability disclosure and bug bounty
              documents — then review, edit, and export.
            </Text>

            <View style={[styles.heroActionRow, isMobile && { flexDirection: "column", width: "100%", gap: 10 }]}>
              <Button
                label="Create a Document →"
                onPress={() => router.push("/(auth)/signup")}
                style={isMobile ? { width: "100%" } : styles.ctaPrimary}
              />
              <Button
                label="Explore Documents"
                variant="secondary"
                onPress={() => router.push("/catalog")}
                style={isMobile ? { width: "100%" } : undefined}
              />
            </View>
          </View>

          {/* Right Column: Fictional Demo Document Artifact */}
          <View style={[styles.heroUiCol, isMobile ? { width: "100%", marginTop: 32 } : { width: "48%" }]}>
            <View style={styles.productFrame}>
              <View style={styles.frameTitlebar}>
                <View style={styles.frameStatusDot} />
                <Text style={styles.frameSpecId}>DEMO DOCUMENT // FICTIONAL SPECIMEN</Text>
                <View style={{ flex: 1 }} />
                <Text style={styles.frameMetaTag}>DRAFT</Text>
              </View>
              
              <View style={styles.frameEditor}>
                <View style={styles.frameDocHeader}>
                  <Text style={styles.frameDocKicker}>PENETRATION TESTING AGREEMENT — DEMO</Text>
                  <Text style={styles.frameDocTitle}>Authorization & Rules of Engagement</Text>
                </View>

                {/* Guided-Input Block (obvious placeholders, no real facts) */}
                <View style={styles.frameParamBlock}>
                  <View style={styles.frameParamRow}>
                    <Text style={styles.frameParamKey}>CLIENT</Text>
                    <Text style={styles.frameParamVal}>[CLIENT]</Text>
                  </View>
                  <View style={styles.frameParamDivider} />
                  <View style={styles.frameParamRow}>
                    <Text style={styles.frameParamKey}>SCOPE</Text>
                    <Text style={styles.frameParamVal}>[SCOPE]</Text>
                  </View>
                  <View style={styles.frameParamDivider} />
                  <View style={styles.frameParamRow}>
                    <Text style={styles.frameParamKey}>TEST WINDOW</Text>
                    <Text style={styles.frameParamVal}>[TEST WINDOW]</Text>
                  </View>
                  <View style={styles.frameParamDivider} />
                  <View style={styles.frameParamRow}>
                    <Text style={styles.frameParamKey}>AUTHORIZATION</Text>
                    <Text style={styles.frameParamVal}>[AUTHORIZATION DETAILS]</Text>
                  </View>
                </View>

                {/* Section Outline Specimen */}
                <View style={styles.frameSectionOutline}>
                  <Text style={styles.frameOutlineHeading}>GENERATED SECTIONS (DEMO)</Text>
                  <View style={styles.frameSectionItem}>
                    <Text style={styles.frameSectionNum}>01</Text>
                    <Text style={styles.frameSectionName}>Authorization & Scope</Text>
                  </View>
                  <View style={styles.frameSectionItem}>
                    <Text style={styles.frameSectionNum}>02</Text>
                    <Text style={styles.frameSectionName}>Rules of Engagement</Text>
                  </View>
                  <View style={styles.frameSectionItem}>
                    <Text style={styles.frameSectionNum}>03</Text>
                    <Text style={styles.frameSectionName}>Reporting & Next Steps</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 03. LARGE PRODUCT COMPOSITION (Architectural Product Surface)             */}
      {/* ========================================================================= */}
      <Reveal>
      <View style={styles.compositionSection}>
        <View style={styles.maxContainer}>
          <View style={styles.compositionHeader}>
            <Text style={styles.sectionEyebrow}>HOW IT WORKS</Text>
            <Heading level={2} style={styles.sectionHeading}>
              Structured cybersecurity data in. Precise security documents out.
            </Heading>
            <Text style={styles.sectionLead}>
              Every Draftoryn document compiles from your answers into a verified, structured
              draft. Each section is discrete, editable, and traceable.
            </Text>
          </View>

          <View style={[styles.compositionGrid, isMobile && { flexDirection: "column" }]}>
            <View style={[styles.compositionCard, isMobile ? { width: "100%" } : { flex: 1 }]}>
              <DocMark size={40} />
              <Text style={styles.compCardStep}>01 / CHOOSE</Text>
              <Text style={styles.compCardTitle}>Pick Your Security Document</Text>
              <Text style={styles.compCardBody}>
                Penetration testing agreements, SOWs, authorization letters, rules of
                engagement, assessment reports, and disclosure documents.
              </Text>
            </View>
            <View style={[styles.compositionCard, isMobile ? { width: "100%" } : { flex: 1 }]}>
              <DocMark size={40} />
              <Text style={styles.compCardStep}>02 / ANSWER</Text>
              <Text style={styles.compCardTitle}>Guided Questions</Text>
              <Text style={styles.compCardBody}>
                Client, scope, schedule, and authorization captured as discrete answers —
                no blank-page drafting, no prompt engineering.
              </Text>
            </View>
            <View style={[styles.compositionCard, isMobile ? { width: "100%" } : { flex: 1 }]}>
              <DocMark size={40} />
              <Text style={styles.compCardStep}>03 / EXPORT</Text>
              <Text style={styles.compCardTitle}>Review & Deliver</Text>
              <Text style={styles.compCardBody}>
                AI drafts from your answers, you review and edit every section, then
                export PDF, DOCX, Markdown, or structured formats.
              </Text>
            </View>
          </View>
        </View>
      </View>
      </Reveal>

      {/* ========================================================================= */}
      {/* 04. DOCUMENT STORY (Editorial Typographic Breakout)                      */}
      {/* ========================================================================= */}
      <Reveal>
      <View style={styles.storySection}>
        <View style={styles.maxContainer}>
          <Text style={styles.storyEyebrow}>CORE EDITORIAL PHILOSOPHY</Text>
          <Text style={styles.storyQuote}>
            "A security document is not an essay. It is an operational agreement."
          </Text>
          <Text style={styles.storyBody}>
            When an authorization letter is vague or an assessment report buries its
            findings, everyone pays for it later. Draftoryn produces unambiguous
            scope definitions, explicit authorization language, and standardized
            security findings — generated precisely from your answers.
          </Text>
        </View>
      </View>
      </Reveal>

      {/* ========================================================================= */}
      {/* 05. DOCUMENT CATALOG (Numbered Publication Index)                        */}
      {/* ========================================================================= */}
      <Reveal>
      <View style={styles.catalogSection}>
        <View style={styles.maxContainer}>
          <View style={styles.catalogSectionHeader}>
            <Text style={styles.sectionEyebrow}>DOCUMENT INDEX</Text>
            <Heading level={2} style={styles.sectionHeading}>
              30 Security Documents Across 6 Disciplines
            </Heading>
          </View>

          {/* Numbered Category Rows */}
          <View style={styles.catalogRows}>
            {CATEGORIES.map((cat, idx) => {
              const numStr = String(idx + 1).padStart(2, "0");
              const visual = CATEGORY_VISUALS[cat];
              const defs = definitionsByCategory(cat);
              const isSelected = cat === activeCatalogCat;

              return (
                <Pressable
                  key={cat}
                  style={[styles.catalogRow, isSelected && styles.catalogRowActive]}
                  onPress={() => setActiveCatalogCat(cat)}
                >
                  <View style={styles.catalogRowTop}>
                    <Text style={[styles.catalogRowNum, isSelected && { color: theme.accent }]}>{numStr}</Text>
                    <Text style={styles.catalogRowTitle}>{visual.label.toUpperCase()}</Text>
                    <View style={{ flex: 1 }} />
                    <Text style={styles.catalogRowCount}>{defs.length} SPECIFICATIONS</Text>
                  </View>
                  <Text style={styles.catalogRowBlurb}>{visual.blurb}</Text>

                  {/* If active, show the actual document list */}
                  {isSelected && (
                    <View style={styles.catalogDocList}>
                      {defs.map((d) => (
                        <View key={d.id} style={styles.catalogDocItem}>
                          <Text style={styles.catalogDocName}>{d.name}</Text>
                          <Text style={styles.catalogDocSections}>{d.sections.length} sections • {d.fields.length} parameters</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={styles.catalogRowDivider} />
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
      </Reveal>

      {/* ========================================================================= */}
      {/* 06. WORKFLOW (Precision 3-Stage Pipeline)                                 */}
      {/* ========================================================================= */}
      <Reveal>
      <View style={styles.workflowSection}>
        <View style={styles.maxContainer}>
          <Text style={styles.sectionEyebrow}>OPERATIONAL WORKFLOW</Text>
          <Heading level={2} style={styles.sectionHeading}>
            From guided answers to precise security deliverable.
          </Heading>

          <View style={[styles.workflowGrid, isMobile && { flexDirection: "column" }]}>
            <View style={[styles.workflowStep, isMobile ? { width: "100%" } : { flex: 1 }]}>
              <Text style={styles.workflowStepNum}>STEP 01</Text>
              <Text style={styles.workflowStepTitle}>Choose Document</Text>
              <Text style={styles.workflowStepBody}>
                Pick the security document you need — authorization, SOW, rules of
                engagement, assessment report, disclosure, and more.
              </Text>
            </View>
            <View style={[styles.workflowStep, isMobile ? { width: "100%" } : { flex: 1 }]}>
              <Text style={styles.workflowStepNum}>STEP 02</Text>
              <Text style={styles.workflowStepTitle}>Answer Questions</Text>
              <Text style={styles.workflowStepBody}>
                Guided questions capture client, scope, schedule, and authorization —
                your answers become the document's ground truth.
              </Text>
            </View>
            <View style={[styles.workflowStep, isMobile ? { width: "100%" } : { flex: 1 }]}>
              <Text style={styles.workflowStepNum}>STEP 03</Text>
              <Text style={styles.workflowStepTitle}>AI Generates Draft</Text>
              <Text style={styles.workflowStepBody}>
                AI drafts every section using only the real data you entered — never
                inventing facts, always marking gaps explicitly.
              </Text>
            </View>
            <View style={[styles.workflowStep, isMobile ? { width: "100%" } : { flex: 1 }]}>
              <Text style={styles.workflowStepNum}>STEP 04</Text>
              <Text style={styles.workflowStepTitle}>Review & Edit</Text>
              <Text style={styles.workflowStepBody}>
                Review each section in the editor, refine wording, and approve the
                final content before it leaves your hands.
              </Text>
            </View>
            <View style={[styles.workflowStep, isMobile ? { width: "100%" } : { flex: 1 }]}>
              <Text style={styles.workflowStepNum}>STEP 05</Text>
              <Text style={styles.workflowStepTitle}>Export</Text>
              <Text style={styles.workflowStepBody}>
                Download precise PDF, DOCX, Markdown, or structured packages — with
                optional password protection.
              </Text>
            </View>
          </View>
        </View>
      </View>
      </Reveal>

      {/* ========================================================================= */}
      {/* 07. PROFESSIONAL OUTPUT (Warm White Document Artifact Preview)            */}
      {/* ========================================================================= */}
      <Reveal>
      <View style={styles.outputSection}>
        <View style={styles.maxContainer}>
          <Text style={styles.sectionEyebrow}>PHYSICAL DELIVERABLE AESTHETIC</Text>
          <Heading level={2} style={styles.sectionHeading}>
            High-contrast, professional security artifacts.
          </Heading>
          <Text style={styles.sectionLead}>
            Deliverables follow professional technical publishing standards. Warm off-white surfaces,
            dense technical typography, and clear section hierarchies. (Fictional demo content.)
          </Text>
          <View style={{ marginTop: 24 }}>
            <ExportChips />
          </View>

          {/* The Physical Document Artifact (fictional demo) */}
          <View style={styles.paperSheet}>
            <View style={styles.paperHeader}>
              <View>
                <Text style={styles.paperOrg}>[CLIENT ORGANIZATION] // SECURITY REVIEW</Text>
                <Text style={styles.paperDocId}>DEMO REFERENCE: SPEC-DEMO-001 (FICTIONAL)</Text>
              </View>
              <Text style={styles.paperClassification}>DEMO // FICTIONAL CONTENT</Text>
            </View>
            <View style={styles.paperRule} />

            <Text style={styles.paperTitle}>Rules of Engagement (Demo)</Text>
            <Text style={styles.paperMeta}>Effective Date: [DATE] • Scope: [SCOPE]</Text>

            <Text style={styles.paperSectionHead}>1.0 AUTHORIZATION (DEMO)</Text>
            <Text style={styles.paperParagraph}>
              Testing personnel operate under authorization granted by [CLIENT] for the
              scope defined in [SCOPE]. Actions performed within [TEST WINDOW] and in
              adherence to this agreement are recorded in [AUTHORIZATION DETAILS].
            </Text>

            <Text style={styles.paperSectionHead}>2.0 SCOPE & RESTRICTIONS (DEMO)</Text>
            <Text style={styles.paperParagraph}>
              In-scope systems: [SCOPE]. Out-of-scope systems are strictly excluded.
              Disruptive testing against [SCOPE] billing or production gateways is not
              permitted without written authorization.
            </Text>
          </View>
        </View>
      </View>
      </Reveal>

      {/* ========================================================================= */}
      {/* 08. BROADER PRODUCT VISION                                                */}
      {/* ========================================================================= */}
      <Reveal>
      <View style={styles.visionSection}>
        <View style={[styles.maxContainer, !isMobile && { flexDirection: "row", alignItems: "center", gap: 48 }]}>
          <View style={isMobile ? { width: "100%" } : { flex: 1 }}>
            <Text style={styles.visionEyebrow}>THE STANDARD FOR SECURITY DOCUMENTATION</Text>
            <Text style={styles.visionText}>
              Draftoryn is not another generic AI text generator. It is a precision
              workstation for cybersecurity documents — agreements, authorizations,
              assessments, and disclosures generated from your answers, never from
              thin air.
            </Text>
          </View>
          {!isMobile && (
            <View style={{ paddingRight: 12 }}>
              <PageStack />
            </View>
          )}
        </View>
      </View>
      </Reveal>

      {/* ========================================================================= */}
      {/* 09. FINAL CTA                                                             */}
      {/* ========================================================================= */}
      <Reveal>
      <View style={styles.finalCtaSection}>
        <View style={styles.finalCtaContainer}>
          <Text style={styles.finalEyebrow}>START DRAFTING TODAY</Text>
          <Heading level={2} style={styles.finalTitle}>
            Ready to generate precise security documents?
          </Heading>
          <Text style={styles.finalLead}>
            Choose a document, answer guided questions, and export a precise draft.
          </Text>
          <Button
            label="Create a Document →"
            onPress={() => router.push("/(auth)/signup")}
            style={styles.ctaPrimary}
          />
        </View>
      </View>
      </Reveal>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerInner}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Image
              source={require("../assets/logo.png")}
              style={styles.footerLogoBanner}
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

  maxContainer: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
  },

  // 01. Header
  header: {
    height: 72,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderColor: theme.border,
    justifyContent: "center",
  },
  headerInner: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerLogoImg: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  wordmark: {
    fontFamily: theme.font.sansBold,
    fontSize: 18,
    letterSpacing: -0.5,
    color: theme.text,
  },
  footerLogoBanner: {
    width: 90,
    height: 24,
  },
  headerNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 28,
  },
  headerNavLink: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.54,
    color: theme.textSecondary,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  // 02. Hero
  heroSection: {
    paddingVertical: 72,
    paddingHorizontal: 48,
    borderBottomWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bg,
  },
  heroContainer: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
  },
  heroTextCol: {},
  heroEyebrow: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.54, // 0.14em
    textTransform: "uppercase",
    color: "#2F6BFF",
    marginBottom: 16,
  },
  heroHeadline: {
    fontFamily: theme.font.sansBold,
    color: theme.text,
    marginBottom: 20,
  },
  heroHeadlineDesktop: {
    fontSize: 64,
    lineHeight: 70,
    letterSpacing: -2.88, // -0.045em
  },
  heroHeadlineTablet: {
    fontSize: 52,
    lineHeight: 58,
    letterSpacing: -2.3,
  },
  heroHeadlineMobile: {
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -1.8,
  },
  heroBody: {
    fontFamily: theme.font.sans,
    fontSize: 16,
    lineHeight: 24.8, // 1.55
    color: theme.textSecondary,
    marginBottom: 32,
    maxWidth: 520,
  },
  heroActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  ctaPrimary: {
    backgroundColor: "#2F6BFF",
    height: 44,
    borderRadius: 6,
    paddingHorizontal: 22,
  },

  heroUiCol: {},
  productFrame: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.borderLight,
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.20,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  frameTitlebar: {
    height: 38,
    backgroundColor: theme.surface2,
    borderBottomWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
  },
  frameStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#31B77A",
  },
  frameSpecId: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: theme.textSecondary,
  },
  frameMetaTag: {
    fontFamily: theme.font.monoMedium,
    fontSize: 9.5,
    letterSpacing: 1,
    color: theme.muted,
  },
  frameEditor: {
    padding: 22,
    gap: 16,
  },
  frameDocHeader: {
    gap: 4,
  },
  frameDocKicker: {
    fontFamily: theme.font.monoMedium,
    fontSize: 9.5,
    letterSpacing: 1.5,
    color: "#2F6BFF",
  },
  frameDocTitle: {
    fontFamily: theme.font.sansBold,
    fontSize: 18,
    color: theme.text,
  },
  frameParamBlock: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
    padding: 14,
    gap: 8,
  },
  frameParamRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  frameParamKey: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: theme.muted,
  },
  frameParamVal: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    color: theme.text,
  },
  frameParamDivider: {
    height: 1,
    backgroundColor: theme.border,
  },
  frameSectionOutline: {
    gap: 6,
  },
  frameOutlineHeading: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    color: theme.muted,
    marginBottom: 4,
  },
  frameSectionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  frameSectionNum: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    color: "#2F6BFF",
  },
  frameSectionName: {
    fontFamily: theme.font.sansMedium,
    fontSize: 13,
    color: theme.textSecondary,
  },

  // 03. Large Product Composition
  compositionSection: {
    paddingVertical: 72,
    paddingHorizontal: 48,
    borderBottomWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  compositionHeader: {
    marginBottom: 36,
  },
  sectionEyebrow: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.54,
    color: "#2F6BFF",
    marginBottom: 8,
  },
  sectionHeading: {
    fontFamily: theme.font.sansBold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1.2,
    color: theme.text,
    marginBottom: 12,
  },
  sectionLead: {
    fontFamily: theme.font.sans,
    fontSize: 16,
    lineHeight: 24.8,
    color: theme.textSecondary,
    maxWidth: 720,
  },
  compositionGrid: {
    flexDirection: "row",
    gap: 20,
  },
  compositionCard: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 24,
    gap: 8,
  },
  compCardStep: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: "#2F6BFF",
  },
  compCardTitle: {
    fontFamily: theme.font.sansBold,
    fontSize: 18,
    color: theme.text,
  },
  compCardBody: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    lineHeight: 21,
    color: theme.textSecondary,
  },

  // 04. Document Story
  storySection: {
    paddingVertical: 80,
    paddingHorizontal: 48,
    borderBottomWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bg,
  },
  storyEyebrow: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.54,
    color: theme.muted,
    marginBottom: 18,
  },
  storyQuote: {
    fontFamily: theme.font.sansBold,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1.2,
    color: theme.text,
    marginBottom: 18,
    maxWidth: 880,
  },
  storyBody: {
    fontFamily: theme.font.sans,
    fontSize: 16,
    lineHeight: 24.8,
    color: theme.textSecondary,
    maxWidth: 760,
  },

  // 05. Document Catalog
  catalogSection: {
    paddingVertical: 72,
    paddingHorizontal: 48,
    borderBottomWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  catalogSectionHeader: {
    marginBottom: 32,
  },
  catalogRows: {
    gap: 16,
  },
  catalogRow: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 20,
    gap: 8,
  },
  catalogRowActive: {
    borderColor: theme.borderActive,
    backgroundColor: theme.surfaceHover,
  },
  catalogRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  catalogRowNum: {
    fontFamily: theme.font.monoMedium,
    fontSize: 14,
    color: theme.muted,
  },
  catalogRowTitle: {
    fontFamily: theme.font.sansBold,
    fontSize: 17,
    letterSpacing: 0.5,
    color: theme.text,
  },
  catalogRowCount: {
    fontFamily: theme.font.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: theme.muted,
  },
  catalogRowBlurb: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 20,
    paddingLeft: 30,
  },
  catalogDocList: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderColor: theme.border,
    gap: 10,
    paddingLeft: 30,
  },
  catalogDocItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  catalogDocName: {
    fontFamily: theme.font.sansMedium,
    fontSize: 14,
    color: theme.text,
  },
  catalogDocSections: {
    fontFamily: theme.font.mono,
    fontSize: 11,
    color: theme.muted,
  },
  catalogRowDivider: {
    height: 1,
    backgroundColor: theme.border,
    marginTop: 8,
  },

  // 06. Workflow
  workflowSection: {
    paddingVertical: 72,
    paddingHorizontal: 48,
    borderBottomWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bg,
  },
  workflowGrid: {
    flexDirection: "row",
    gap: 24,
    marginTop: 32,
  },
  workflowStep: {
    borderLeftWidth: 2,
    borderLeftColor: "#2F6BFF",
    paddingLeft: 18,
    gap: 8,
  },
  workflowStepNum: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: "#2F6BFF",
  },
  workflowStepTitle: {
    fontFamily: theme.font.sansBold,
    fontSize: 18,
    color: theme.text,
  },
  workflowStepBody: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    lineHeight: 21,
    color: theme.textSecondary,
  },

  // 07. Professional Output (Paper sheet aesthetic)
  outputSection: {
    paddingVertical: 72,
    paddingHorizontal: 48,
    borderBottomWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  paperSheet: {
    backgroundColor: "#F5F3EE", // Warm White
    borderRadius: 8,
    padding: 36,
    marginTop: 32,
    maxWidth: 900,
    alignSelf: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#D9D6CE",
  },
  paperHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  paperOrg: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    color: "#6D7178",
  },
  paperDocId: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    color: "#16181C",
    marginTop: 2,
  },
  paperClassification: {
    fontFamily: theme.font.monoMedium,
    fontSize: 9.5,
    letterSpacing: 1,
    color: "#D94A4A",
  },
  paperRule: {
    height: 1,
    backgroundColor: "#272B32",
    marginVertical: 18,
    opacity: 0.2,
  },
  paperTitle: {
    fontFamily: theme.font.sansBold,
    fontSize: 24,
    color: "#16181C",
    marginBottom: 4,
  },
  paperMeta: {
    fontFamily: theme.font.mono,
    fontSize: 11,
    color: "#6D7178",
    marginBottom: 20,
  },
  paperSectionHead: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    color: "#16181C",
    marginTop: 14,
    marginBottom: 6,
  },
  paperParagraph: {
    fontFamily: theme.font.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: "#2C3038",
  },

  // 08. Broader Vision
  visionSection: {
    paddingVertical: 72,
    paddingHorizontal: 48,
    borderBottomWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bg,
  },
  visionEyebrow: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.54,
    color: theme.muted,
    marginBottom: 16,
  },
  visionText: {
    fontFamily: theme.font.sansBold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: theme.text,
    maxWidth: 920,
  },

  // 09. Final CTA
  finalCtaSection: {
    paddingVertical: 80,
    paddingHorizontal: 48,
    backgroundColor: theme.surface,
    alignItems: "center",
  },
  finalCtaContainer: {
    maxWidth: 640,
    width: "100%",
    alignItems: "center",
    textAlign: "center",
  },
  finalEyebrow: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.54,
    color: "#2F6BFF",
    marginBottom: 12,
  },
  finalTitle: {
    fontFamily: theme.font.sansBold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1,
    color: theme.text,
    textAlign: "center",
    marginBottom: 14,
  },
  finalLead: {
    fontFamily: theme.font.sans,
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: "center",
    marginBottom: 28,
  },

  // Footer
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
    paddingHorizontal: 48,
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
