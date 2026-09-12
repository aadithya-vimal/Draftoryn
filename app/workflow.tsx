import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { PublicHeader } from "../src/ui/PublicHeader";
import { Button, Card, Heading, theme } from "../src/ui/primitives";

export default function WorkflowPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 840;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      <PublicHeader activeNav="workflow" />

      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={styles.maxContainer}>
          <Text style={styles.eyebrow}>COMPILATION PIPELINE // 03</Text>
          <Heading level={1} style={isMobile ? styles.h1Mobile : styles.h1}>
            Deterministic Workflow
          </Heading>
          <Text style={styles.heroLead}>
            Draftoryn replaces vague conversational AI chats with a 4-stage deterministic compiler.
            Strict parameter typing, immutable rule trees, and bounded context guarantees zero hallucinations.
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaKey}>ZERO FABRICATION</Text>
              <Text style={styles.metaVal}>STRICT GROUND TRUTH</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaKey}>LEGAL BOUNDARIES</Text>
              <Text style={styles.metaVal}>EXPLICIT CIDR SCOPING</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaKey}>TARGET FORMATS</Text>
              <Text style={styles.metaVal}>PDF · DOCX · MARKDOWN</Text>
            </View>
          </View>
        </View>
      </View>

      {/* The 4-Stage Process */}
      <View style={styles.stagesSection}>
        <View style={styles.maxContainer}>
          <Text style={styles.eyebrow}>FOUR COMPILATION PHASES</Text>
          <Heading level={2} style={styles.sectionHeading}>
            From Typed Parameters to Cryptographic Snapshots
          </Heading>

          <View style={styles.stagesCol}>
            {/* Stage 01 */}
            <View style={styles.stageCard}>
              <View style={styles.stageHeader}>
                <Text style={styles.stageNumber}>STAGE 01</Text>
                <Text style={styles.stageTitle}>Parameter Ingestion & Scope Typing</Text>
              </View>
              <Text style={styles.stageDescription}>
                Rather than accepting an unconstrained freeform prompt, Draftoryn requests typed operational parameters:
                in-scope CIDR blocks, exclusion ranges, testing windows, emergency contacts, and authorization authority.
              </Text>
              <View style={styles.specimenBox}>
                <Text style={styles.specimenLabel}>SAMPLE INPUT ASSERTION</Text>
                <Text style={styles.specimenCode}>
                  TARGET_NETWORK: 192.168.10.0/24{"\n"}
                  EXCLUSION: 192.168.10.1 (Domain Controller){"\n"}
                  TESTING_WINDOW: 2026-10-01T00:00Z to 2026-10-07T23:59Z{"\n"}
                  HALT_TRIGGER: Immediate notification on critical outage
                </Text>
              </View>
            </View>

            {/* Stage 02 */}
            <View style={styles.stageCard}>
              <View style={styles.stageHeader}>
                <Text style={styles.stageNumber}>STAGE 02</Text>
                <Text style={styles.stageTitle}>Deterministic Rule-Engine Assembly</Text>
              </View>
              <Text style={styles.stageDescription}>
                The core structural tree compiles without AI dependency. Standard-mandated sections (such as PTES scope,
                NIST SP 800-115 methodology, and indemnification clauses) are generated directly from verified templates.
              </Text>
              <View style={styles.specimenBox}>
                <Text style={styles.specimenLabel}>DETERMINISTIC CLAUSE TREE</Text>
                <Text style={styles.specimenCode}>
                  [+] SECTION: Scope and Targets Defined (Verified against CIDR validator){"\n"}
                  [+] SECTION: Emergency Contact & Escalation Protocol{"\n"}
                  [+] SECTION: Limitation of Liability & Authorization
                </Text>
              </View>
            </View>

            {/* Stage 03 */}
            <View style={styles.stageCard}>
              <View style={styles.stageHeader}>
                <Text style={styles.stageNumber}>STAGE 03</Text>
                <Text style={styles.stageTitle}>Context-Bounded AI Synthesis</Text>
              </View>
              <Text style={styles.stageDescription}>
                When narrative synthesis is required (e.g. executive summaries or threat impact analyses), AI prompts are
                strictly bounded. Draftoryn prohibits the synthesis engine from fabricating fictitious vulnerabilities or unverified hosts.
              </Text>
              <View style={styles.specimenBox}>
                <Text style={styles.specimenLabel}>SYSTEM DIRECTIVE ENFORCEMENT</Text>
                <Text style={styles.specimenCode}>
                  "NEVER fabricate synthetic findings. NEVER generate unauthorized IPs. Treat user-supplied scope as absolute boundary."
                </Text>
              </View>
            </View>

            {/* Stage 04 */}
            <View style={styles.stageCard}>
              <View style={styles.stageHeader}>
                <Text style={styles.stageNumber}>STAGE 04</Text>
                <Text style={styles.stageTitle}>Multi-Target Export & Database Snapshot</Text>
              </View>
              <Text style={styles.stageDescription}>
                Deliverables compile natively to vector-bordered PDFs with technical line spacing, formatted Microsoft Word DOCX
                documents, and clean Markdown for GitOps repositories. Every version is immutably archived in transactional storage.
              </Text>
              <View style={styles.specimenBox}>
                <Text style={styles.specimenLabel}>COMPILED OUTPUT TARGETS</Text>
                <Text style={styles.specimenCode}>
                  OUTPUT: deliverable.pdf [Helvetica 595x842pt, 14pt breathing rules]{"\n"}
                  OUTPUT: deliverable.docx [OOXML Section Styles]{"\n"}
                  SNAPSHOT: Database Archive (document_versions #1 verified)
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Comparison Table */}
      <View style={styles.comparisonSection}>
        <View style={styles.maxContainer}>
          <Text style={styles.eyebrow}>SYSTEM COMPARISON</Text>
          <Heading level={2} style={styles.sectionHeading}>Why Draftoryn Exceeds Generic Alternatives</Heading>

          <View style={styles.compTable}>
            <View style={styles.compHeaderRow}>
              <Text style={[styles.compColHead, { flex: 1.2 }]}>CAPABILITY</Text>
              <Text style={[styles.compColHead, { flex: 1.5, color: "#2F6BFF" }]}>DRAFTORYN</Text>
              <Text style={[styles.compColHead, { flex: 1.5 }]}>GENERIC AI SAAS</Text>
              <Text style={[styles.compColHead, { flex: 1.5 }]}>MANUAL WORD TEMPLATES</Text>
            </View>
            <View style={styles.compRow}>
              <Text style={[styles.compCell, { flex: 1.2, color: "#F5F3EE" }]}>Scoping Rigor</Text>
              <Text style={[styles.compCell, { flex: 1.5, color: "#31B77A" }]}>Strict Parameter Typing</Text>
              <Text style={[styles.compCell, { flex: 1.5 }]}>Unbounded Chat Text</Text>
              <Text style={[styles.compCell, { flex: 1.5 }]}>Prone to copy-paste drift</Text>
            </View>
            <View style={styles.compRow}>
              <Text style={[styles.compCell, { flex: 1.2, color: "#F5F3EE" }]}>Hallucination Risk</Text>
              <Text style={[styles.compCell, { flex: 1.5, color: "#31B77A" }]}>Zero (Deterministic Baseline)</Text>
              <Text style={[styles.compCell, { flex: 1.5, color: "#D94A4A" }]}>High (Fabricates IPs/CVEs)</Text>
              <Text style={[styles.compCell, { flex: 1.5 }]}>None (Manual)</Text>
            </View>
            <View style={styles.compRow}>
              <Text style={[styles.compCell, { flex: 1.2, color: "#F5F3EE" }]}>Audit Persistence</Text>
              <Text style={[styles.compCell, { flex: 1.5, color: theme.ok }]}>Authoritative Relational Database</Text>
              <Text style={[styles.compCell, { flex: 1.5 }]}>Ephemeral chat history</Text>
              <Text style={[styles.compCell, { flex: 1.5 }]}>Scattered local files</Text>
            </View>
            <View style={styles.compRow}>
              <Text style={[styles.compCell, { flex: 1.2, color: "#F5F3EE" }]}>Standards Alignment</Text>
              <Text style={[styles.compCell, { flex: 1.5, color: "#31B77A" }]}>30 Canonical Specifications</Text>
              <Text style={[styles.compCell, { flex: 1.5 }]}>Generic approximations</Text>
              <Text style={[styles.compCell, { flex: 1.5 }]}>Outdated templates</Text>
            </View>
          </View>
        </View>
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <View style={styles.maxContainer}>
          <View style={styles.ctaCard}>
            <Text style={styles.ctaEyebrow}>START AUTHORING</Text>
            <Heading level={2} style={styles.ctaTitle}>Experience the Workflow</Heading>
            <Text style={styles.ctaLead}>
              Provision your workspace and start generating standardized technical documentation in minutes.
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
  metaRow: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  metaItem: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  metaKey: { fontFamily: theme.font.mono, fontSize: 10, color: theme.muted, letterSpacing: 0.8 },
  metaVal: { fontFamily: theme.font.monoMedium, fontSize: 11, color: theme.text, marginTop: 2 },

  stagesSection: { paddingVertical: 56 },
  sectionHeading: { fontSize: 28, color: theme.text, marginBottom: 32 },
  stagesCol: { gap: 20 },
  stageCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 24,
  },
  stageHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  stageNumber: { fontFamily: theme.font.monoMedium, fontSize: 12, color: theme.accent, letterSpacing: 1.5 },
  stageTitle: { fontFamily: theme.font.sansSemi, fontSize: 18, color: theme.text },
  stageDescription: { fontFamily: theme.font.sans, fontSize: 14, color: theme.textSecondary, lineHeight: 21, marginBottom: 16 },
  specimenBox: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
    padding: 14,
  },
  specimenLabel: { fontFamily: theme.font.monoMedium, fontSize: 10, color: theme.muted, letterSpacing: 1, marginBottom: 6 },
  specimenCode: { fontFamily: theme.font.mono, fontSize: 11, color: theme.text, lineHeight: 18 },

  comparisonSection: {
    paddingVertical: 56,
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.border,
  },
  compTable: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    overflow: "hidden",
  },
  compHeaderRow: {
    flexDirection: "row",
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderColor: theme.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  compColHead: { fontFamily: theme.font.monoMedium, fontSize: 11, letterSpacing: 1, color: theme.muted },
  compRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: theme.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  compCell: { fontFamily: theme.font.sans, fontSize: 13, color: theme.textSecondary },

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
