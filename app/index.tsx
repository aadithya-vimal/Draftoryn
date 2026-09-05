import React, { useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useAppUser } from "../src/auth/clerk";
import { Button, Card, Heading, theme } from "../src/ui/primitives";
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
            <Text style={styles.heroEyebrow}>DOCUMENTATION SYSTEM / 01</Text>
            
            <Text style={[styles.heroHeadline, isMobile ? styles.heroHeadlineMobile : isTablet ? styles.heroHeadlineTablet : styles.heroHeadlineDesktop]}>
              Technical specifications and security agreements.
            </Text>

            <Text style={styles.heroBody}>
              Draftoryn is professional documentation software designed for technical precision.
              Construct verified penetration testing agreements, incident playbooks, threat models,
              and compliance architectures with mathematical schema discipline.
            </Text>

            <View style={[styles.heroActionRow, isMobile && { flexDirection: "column", width: "100%", gap: 10 }]}>
              <Button
                label="Initialize Workspace →"
                onPress={() => router.push("/(auth)/signup")}
                style={isMobile ? { width: "100%" } : styles.ctaPrimary}
              />
              <Button
                label="Browse Specifications"
                variant="secondary"
                onPress={() => router.push("/(auth)/login")}
                style={isMobile ? { width: "100%" } : undefined}
              />
            </View>
          </View>

          {/* Right Column: Real Draftoryn Product UI Framed Artifact */}
          <View style={[styles.heroUiCol, isMobile ? { width: "100%", marginTop: 32 } : { width: "48%" }]}>
            <View style={styles.productFrame}>
              <View style={styles.frameTitlebar}>
                <View style={styles.frameStatusDot} />
                <Text style={styles.frameSpecId}>SPEC-SEC-AUTH-001 // EDITOR VIEW</Text>
                <View style={{ flex: 1 }} />
                <Text style={styles.frameMetaTag}>NEON PERSISTED</Text>
              </View>
              
              <View style={styles.frameEditor}>
                <View style={styles.frameDocHeader}>
                  <Text style={styles.frameDocKicker}>LEGAL & OPERATIONAL FRAMEWORK</Text>
                  <Text style={styles.frameDocTitle}>Penetration Testing Authorization</Text>
                </View>

                {/* Real Parameter Ingestion Block */}
                <View style={styles.frameParamBlock}>
                  <View style={styles.frameParamRow}>
                    <Text style={styles.frameParamKey}>TARGET CIDR</Text>
                    <Text style={styles.frameParamVal}>198.51.100.0/24 (Production API Enclave)</Text>
                  </View>
                  <View style={styles.frameParamDivider} />
                  <View style={styles.frameParamRow}>
                    <Text style={styles.frameParamKey}>SAFE HARBOR</Text>
                    <Text style={styles.frameParamVal}>18 U.S.C. § 1030 Explicit Authorization Active</Text>
                  </View>
                  <View style={styles.frameParamDivider} />
                  <View style={styles.frameParamRow}>
                    <Text style={styles.frameParamKey}>TEST WINDOW</Text>
                    <Text style={styles.frameParamVal}>02:00–06:00 UTC (Off-peak Production)</Text>
                  </View>
                </View>

                {/* Section Outline Specimen */}
                <View style={styles.frameSectionOutline}>
                  <Text style={styles.frameOutlineHeading}>COMPILED SECTIONS</Text>
                  <View style={styles.frameSectionItem}>
                    <Text style={styles.frameSectionNum}>01</Text>
                    <Text style={styles.frameSectionName}>Delegation of Authority & Safe Harbor</Text>
                  </View>
                  <View style={styles.frameSectionItem}>
                    <Text style={styles.frameSectionNum}>02</Text>
                    <Text style={styles.frameSectionName}>Scope Boundaries & Out-of-Scope Production Exclusions</Text>
                  </View>
                  <View style={styles.frameSectionItem}>
                    <Text style={styles.frameSectionNum}>03</Text>
                    <Text style={styles.frameSectionName}>Emergency Escalation Protocol & PGP Keys</Text>
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
      <View style={styles.compositionSection}>
        <View style={styles.maxContainer}>
          <View style={styles.compositionHeader}>
            <Text style={styles.sectionEyebrow}>SYSTEM ARCHITECTURE</Text>
            <Heading level={2} style={styles.sectionHeading}>
              Structured data model. Not unstructured conversational output.
            </Heading>
            <Text style={styles.sectionLead}>
              Every Draftoryn document compiles from typed parameters into verified relational schemas.
              Each section is discrete, editable, and traceable.
            </Text>
          </View>

          <View style={[styles.compositionGrid, isMobile && { flexDirection: "column" }]}>
            <View style={[styles.compositionCard, isMobile ? { width: "100%" } : { flex: 1 }]}>
              <Text style={styles.compCardStep}>01 / MODEL</Text>
              <Text style={styles.compCardTitle}>Typed Parameter Definitions</Text>
              <Text style={styles.compCardBody}>
                Assessors, targets, exclusions, schedules, and communication channels are captured as discrete typed variables.
              </Text>
            </View>
            <View style={[styles.compositionCard, isMobile ? { width: "100%" } : { flex: 1 }]}>
              <Text style={styles.compCardStep}>02 / ENGINE</Text>
              <Text style={styles.compCardTitle}>Deterministic Assembly</Text>
              <Text style={styles.compCardBody}>
                Document sections assemble deterministically according to standardized technical specifications and compliance rules.
              </Text>
            </View>
            <View style={[styles.compositionCard, isMobile ? { width: "100%" } : { flex: 1 }]}>
              <Text style={styles.compCardStep}>03 / PERSISTENCE</Text>
              <Text style={styles.compCardTitle}>Neon PostgreSQL Relational Truth</Text>
              <Text style={styles.compCardBody}>
                Document records, revision versions, deliverable exports, and client authorizations are permanently stored in Neon PostgreSQL.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 04. DOCUMENT STORY (Editorial Typographic Breakout)                      */}
      {/* ========================================================================= */}
      <View style={styles.storySection}>
        <View style={styles.maxContainer}>
          <Text style={styles.storyEyebrow}>CORE EDITORIAL PHILOSOPHY</Text>
          <Text style={styles.storyQuote}>
            "A technical document is not an essay. It is an operational contract."
          </Text>
          <Text style={styles.storyBody}>
            When an unauthorized asset is compromised or an incident response playbook fails under pressure,
            vague conversational AI output is a liability. Draftoryn guarantees unambiguous boundary definitions,
            legally vetted Safe Harbor language, and standardized technical findings.
          </Text>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 05. DOCUMENT CATALOG (Numbered Publication Index)                        */}
      {/* ========================================================================= */}
      <View style={styles.catalogSection}>
        <View style={styles.maxContainer}>
          <View style={styles.catalogSectionHeader}>
            <Text style={styles.sectionEyebrow}>PUBLICATION INDEX</Text>
            <Heading level={2} style={styles.sectionHeading}>
              30 Canonical Specifications Across 6 Disciplines
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

      {/* ========================================================================= */}
      {/* 06. WORKFLOW (Precision 3-Stage Pipeline)                                 */}
      {/* ========================================================================= */}
      <View style={styles.workflowSection}>
        <View style={styles.maxContainer}>
          <Text style={styles.sectionEyebrow}>OPERATIONAL WORKFLOW</Text>
          <Heading level={2} style={styles.sectionHeading}>
            From parameter specification to publication-grade deliverable.
          </Heading>

          <View style={[styles.workflowGrid, isMobile && { flexDirection: "column" }]}>
            <View style={[styles.workflowStep, isMobile ? { width: "100%" } : { flex: 1 }]}>
              <Text style={styles.workflowStepNum}>PHASE 01</Text>
              <Text style={styles.workflowStepTitle}>Scope Ingestion</Text>
              <Text style={styles.workflowStepBody}>
                Input testing targets, client identity, authorized assessors, and operational constraints through structured fields.
              </Text>
            </View>
            <View style={[styles.workflowStep, isMobile ? { width: "100%" } : { flex: 1 }]}>
              <Text style={styles.workflowStepNum}>PHASE 02</Text>
              <Text style={styles.workflowStepTitle}>Section Compilation</Text>
              <Text style={styles.workflowStepBody}>
                Draftoryn compiles technical clauses, containment matrices, and trust boundaries into an authoritative document snapshot.
              </Text>
            </View>
            <View style={[styles.workflowStep, isMobile ? { width: "100%" } : { flex: 1 }]}>
              <Text style={styles.workflowStepNum}>PHASE 03</Text>
              <Text style={styles.workflowStepTitle}>Relational Export</Text>
              <Text style={styles.workflowStepBody}>
                Export deliverable packages in PDF, Markdown, DOCX, or HTML with audit logging written directly to Neon.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 07. PROFESSIONAL OUTPUT (Warm White Document Artifact Preview)            */}
      {/* ========================================================================= */}
      <View style={styles.outputSection}>
        <View style={styles.maxContainer}>
          <Text style={styles.sectionEyebrow}>PHYSICAL DELIVERABLE AESTHETIC</Text>
          <Heading level={2} style={styles.sectionHeading}>
            High-contrast, professional technical artifacts.
          </Heading>
          <Text style={styles.sectionLead}>
            Deliverables follow international technical publishing standards. Warm off-white surfaces,
            dense technical typography, and clear section hierarchies.
          </Text>

          {/* The Physical Document Artifact */}
          <View style={styles.paperSheet}>
            <View style={styles.paperHeader}>
              <View>
                <Text style={styles.paperOrg}>APEX CYBER LABS // DEFENSE OPERATIONS</Text>
                <Text style={styles.paperDocId}>SPECIFICATION REF: SPEC-ROE-2026</Text>
              </View>
              <Text style={styles.paperClassification}>CONFIDENTIAL // AUTHORIZED ACCESS ONLY</Text>
            </View>
            <View style={styles.paperRule} />
            
            <Text style={styles.paperTitle}>Rules of Engagement Specification</Text>
            <Text style={styles.paperMeta}>Effective Date: September 2026 • Framework: PTES / NIST SP 800-115</Text>
            
            <Text style={styles.paperSectionHead}>1.0 EXECUTIVE AUTHORIZATION & SAFE HARBOR</Text>
            <Text style={styles.paperParagraph}>
              Testing personnel operating under this engagement are formally authorized by the target organization
              to conduct active penetration testing within the verified parameters defined in Schedule A. All actions
              performed in adherence to this agreement are certified as non-malicious and authorized.
            </Text>

            <Text style={styles.paperSectionHead}>2.0 AUTHORIZED ASSETS & CIDR RESTRICTIONS</Text>
            <Text style={styles.paperParagraph}>
              Primary API Endpoint: 198.51.100.10/32 [IN SCOPE] • Production Database: 198.51.100.50/32 [STRICTLY EXCLUDED].
              Zero automated brute-forcing or denial-of-service testing is permitted against production billing gateways.
            </Text>
          </View>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 08. BROADER PRODUCT VISION                                                */}
      {/* ========================================================================= */}
      <View style={styles.visionSection}>
        <View style={styles.maxContainer}>
          <Text style={styles.visionEyebrow}>THE STANDARD FOR TECHNICAL SPECIFICATIONS</Text>
          <Text style={styles.visionText}>
            Draftoryn is not another AI text generator wrapped in SaaS decoration. It is an editorial
            engineering workstation designed to produce authoritative, durable technical agreements.
          </Text>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 09. FINAL CTA                                                             */}
      {/* ========================================================================= */}
      <View style={styles.finalCtaSection}>
        <View style={styles.finalCtaContainer}>
          <Text style={styles.finalEyebrow}>START DRAFTING TODAY</Text>
          <Heading level={2} style={styles.finalTitle}>
            Ready to generate authoritative documentation?
          </Heading>
          <Text style={styles.finalLead}>
            Provision your workspace in seconds with Clerk authentication and Neon PostgreSQL persistence.
          </Text>
          <Button
            label="Initialize Workspace Now →"
            onPress={() => router.push("/(auth)/signup")}
            style={styles.ctaPrimary}
          />
        </View>
      </View>

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
          <Text style={styles.footerText}>NEON POSTGRESQL · CLERK AUTH</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#090A0C" },
  body: { paddingBottom: 0 },

  maxContainer: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
  },

  // 01. Header
  header: {
    height: 72,
    backgroundColor: "#101216",
    borderBottomWidth: 1,
    borderColor: "#272B32",
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
    color: "#F5F3EE",
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
    color: "#A1A5AD",
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
    borderColor: "#272B32",
    backgroundColor: "#090A0C",
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
    color: "#F5F3EE",
    marginBottom: 20,
  },
  heroHeadlineDesktop: {
    fontSize: 64,
    lineHeight: 64,
    letterSpacing: -2.88, // -0.045em
  },
  heroHeadlineTablet: {
    fontSize: 52,
    lineHeight: 52,
    letterSpacing: -2.3,
  },
  heroHeadlineMobile: {
    fontSize: 40,
    lineHeight: 40,
    letterSpacing: -1.8,
  },
  heroBody: {
    fontFamily: theme.font.sans,
    fontSize: 16,
    lineHeight: 24.8, // 1.55
    color: "#A1A5AD",
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
    backgroundColor: "#101216",
    borderWidth: 1,
    borderColor: "#343941",
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
    backgroundColor: "#15181D",
    borderBottomWidth: 1,
    borderColor: "#272B32",
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
    color: "#A1A5AD",
  },
  frameMetaTag: {
    fontFamily: theme.font.monoMedium,
    fontSize: 9.5,
    letterSpacing: 1,
    color: "#727780",
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
    color: "#F5F3EE",
  },
  frameParamBlock: {
    backgroundColor: "#15181D",
    borderWidth: 1,
    borderColor: "#272B32",
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
    color: "#727780",
  },
  frameParamVal: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    color: "#F5F3EE",
  },
  frameParamDivider: {
    height: 1,
    backgroundColor: "#272B32",
  },
  frameSectionOutline: {
    gap: 6,
  },
  frameOutlineHeading: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    color: "#727780",
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
    color: "#A1A5AD",
  },

  // 03. Large Product Composition
  compositionSection: {
    paddingVertical: 72,
    paddingHorizontal: 48,
    borderBottomWidth: 1,
    borderColor: "#272B32",
    backgroundColor: "#101216",
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
    color: "#F5F3EE",
    marginBottom: 12,
  },
  sectionLead: {
    fontFamily: theme.font.sans,
    fontSize: 16,
    lineHeight: 24.8,
    color: "#A1A5AD",
    maxWidth: 720,
  },
  compositionGrid: {
    flexDirection: "row",
    gap: 20,
  },
  compositionCard: {
    backgroundColor: "#15181D",
    borderWidth: 1,
    borderColor: "#272B32",
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
    color: "#F5F3EE",
  },
  compCardBody: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    lineHeight: 21,
    color: "#A1A5AD",
  },

  // 04. Document Story
  storySection: {
    paddingVertical: 80,
    paddingHorizontal: 48,
    borderBottomWidth: 1,
    borderColor: "#272B32",
    backgroundColor: "#090A0C",
  },
  storyEyebrow: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.54,
    color: "#727780",
    marginBottom: 18,
  },
  storyQuote: {
    fontFamily: theme.font.sansBold,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1.2,
    color: "#F5F3EE",
    marginBottom: 18,
    maxWidth: 880,
  },
  storyBody: {
    fontFamily: theme.font.sans,
    fontSize: 16,
    lineHeight: 24.8,
    color: "#A1A5AD",
    maxWidth: 760,
  },

  // 05. Document Catalog
  catalogSection: {
    paddingVertical: 72,
    paddingHorizontal: 48,
    borderBottomWidth: 1,
    borderColor: "#272B32",
    backgroundColor: "#101216",
  },
  catalogSectionHeader: {
    marginBottom: 32,
  },
  catalogRows: {
    gap: 16,
  },
  catalogRow: {
    backgroundColor: "#15181D",
    borderWidth: 1,
    borderColor: "#272B32",
    borderRadius: 8,
    padding: 20,
    gap: 8,
  },
  catalogRowActive: {
    borderColor: "#343941",
    backgroundColor: "#181B21",
  },
  catalogRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  catalogRowNum: {
    fontFamily: theme.font.monoMedium,
    fontSize: 14,
    color: "#727780",
  },
  catalogRowTitle: {
    fontFamily: theme.font.sansBold,
    fontSize: 17,
    letterSpacing: 0.5,
    color: "#F5F3EE",
  },
  catalogRowCount: {
    fontFamily: theme.font.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: "#727780",
  },
  catalogRowBlurb: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: "#A1A5AD",
    lineHeight: 20,
    paddingLeft: 30,
  },
  catalogDocList: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderColor: "#272B32",
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
    color: "#F5F3EE",
  },
  catalogDocSections: {
    fontFamily: theme.font.mono,
    fontSize: 11,
    color: "#727780",
  },
  catalogRowDivider: {
    height: 1,
    backgroundColor: "#272B32",
    marginTop: 8,
  },

  // 06. Workflow
  workflowSection: {
    paddingVertical: 72,
    paddingHorizontal: 48,
    borderBottomWidth: 1,
    borderColor: "#272B32",
    backgroundColor: "#090A0C",
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
    color: "#F5F3EE",
  },
  workflowStepBody: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    lineHeight: 21,
    color: "#A1A5AD",
  },

  // 07. Professional Output (Paper sheet aesthetic)
  outputSection: {
    paddingVertical: 72,
    paddingHorizontal: 48,
    borderBottomWidth: 1,
    borderColor: "#272B32",
    backgroundColor: "#101216",
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
    borderColor: "#272B32",
    backgroundColor: "#090A0C",
  },
  visionEyebrow: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.54,
    color: "#727780",
    marginBottom: 16,
  },
  visionText: {
    fontFamily: theme.font.sansBold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: "#F5F3EE",
    maxWidth: 920,
  },

  // 09. Final CTA
  finalCtaSection: {
    paddingVertical: 80,
    paddingHorizontal: 48,
    backgroundColor: "#101216",
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
    color: "#F5F3EE",
    textAlign: "center",
    marginBottom: 14,
  },
  finalLead: {
    fontFamily: theme.font.sans,
    fontSize: 16,
    color: "#A1A5AD",
    textAlign: "center",
    marginBottom: 28,
  },

  // Footer
  footer: {
    height: 60,
    backgroundColor: "#090A0C",
    borderTopWidth: 1,
    borderColor: "#272B32",
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
    color: "#727780",
  },
});
