import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { PublicHeader } from "../src/ui/PublicHeader";
import { Button, Card, Heading, theme } from "../src/ui/primitives";

export default function ArchitecturePage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 840;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      <PublicHeader activeNav="architecture" />

      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={styles.maxContainer}>
          <Text style={styles.eyebrow}>SYSTEMS BLUEPRINT // 04</Text>
          <Heading level={1} style={isMobile ? styles.h1Mobile : styles.h1}>
            Systems Architecture
          </Heading>
          <Text style={styles.heroLead}>
            Draftoryn is architected around relational persistence, cryptographic data isolation,
            and pure programmatic document compilation.
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaKey}>PRIMARY DATABASE</Text>
              <Text style={styles.metaVal}>NEON POSTGRESQL</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaKey}>IDENTITY</Text>
              <Text style={styles.metaVal}>CLERK MULTI-TENANT</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaKey}>EXPORT ENGINE</Text>
              <Text style={styles.metaVal}>PURE VECTOR PDF & OOXML</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Architecture Layers */}
      <View style={styles.layersSection}>
        <View style={styles.maxContainer}>
          <Text style={styles.eyebrow}>LAYERED ARCHITECTURE</Text>
          <Heading level={2} style={styles.sectionHeading}>
            Five Core Infrastructure Layers
          </Heading>

          <View style={styles.layerCards}>
            {/* Layer 01: Auth */}
            <View style={styles.layerCard}>
              <View style={styles.layerBadge}>
                <Text style={styles.layerNum}>LAYER 01</Text>
              </View>
              <View style={styles.layerContent}>
                <Heading level={3} style={styles.layerTitle}>Identity & Tenant Isolation</Heading>
                <Text style={styles.layerDesc}>
                  Authentication is managed via Clerk session tokens. Every user is mapped to a dedicated
                  tenant workspace ID. Cross-tenant access is strictly denied at both API and database layers.
                </Text>
                <View style={styles.techPills}>
                  <Text style={styles.techPill}>Clerk JWT</Text>
                  <Text style={styles.techPill}>Multi-Tenant Isolation</Text>
                  <Text style={styles.techPill}>RBAC Validation</Text>
                </View>
              </View>
            </View>

            {/* Layer 02: Neon PostgreSQL */}
            <View style={styles.layerCard}>
              <View style={styles.layerBadge}>
                <Text style={styles.layerNum}>LAYER 02</Text>
              </View>
              <View style={styles.layerContent}>
                <Heading level={3} style={styles.layerTitle}>Authoritative Neon PostgreSQL Database</Heading>
                <Text style={styles.layerDesc}>
                  Draftoryn treats Neon PostgreSQL as the single source of truth. All user-generated content,
                  workspace preferences, document trees, version histories, and export logs persist in normalized relational tables.
                </Text>
                <View style={styles.specimenBox}>
                  <Text style={styles.specimenLabel}>CANONICAL NEON TABLES</Text>
                  <Text style={styles.specimenCode}>
                    users · workspaces · user_settings · documents · document_versions · document_exports
                  </Text>
                </View>
              </View>
            </View>

            {/* Layer 03: Document Engine */}
            <View style={styles.layerCard}>
              <View style={styles.layerBadge}>
                <Text style={styles.layerNum}>LAYER 03</Text>
              </View>
              <View style={styles.layerContent}>
                <Heading level={3} style={styles.layerTitle}>Dual-Engine Compiler Pipeline</Heading>
                <Text style={styles.layerDesc}>
                  Combines a deterministic schema compiler (assembling mandatory structural clauses and rules) with a
                  context-bounded AI engine. AI operates strictly on customer-provided parameters with zero prompt leakage.
                </Text>
                <View style={styles.techPills}>
                  <Text style={styles.techPill}>Schema Validator</Text>
                  <Text style={styles.techPill}>Deterministic Trees</Text>
                  <Text style={styles.techPill}>Bounded Synthesis</Text>
                </View>
              </View>
            </View>

            {/* Layer 04: Native Compilers */}
            <View style={styles.layerCard}>
              <View style={styles.layerBadge}>
                <Text style={styles.layerNum}>LAYER 04</Text>
              </View>
              <View style={styles.layerContent}>
                <Heading level={3} style={styles.layerTitle}>Headless Vector & Document Compilers</Heading>
                <Text style={styles.layerDesc}>
                  Exports do not rely on fragile browser screenshots or headless Chrome printers. We use pure programmatic
                  compilation via pdf-lib (drawing exact vector bounding boxes, Helvetica typography, and generous spacing)
                  and docx (generating OOXML Word documents).
                </Text>
                <View style={styles.techPills}>
                  <Text style={styles.techPill}>pdf-lib (Vector Engine)</Text>
                  <Text style={styles.techPill}>docx (Native OOXML)</Text>
                  <Text style={styles.techPill}>CommonMark AST</Text>
                </View>
              </View>
            </View>

            {/* Layer 05: Data Privacy */}
            <View style={styles.layerCard}>
              <View style={styles.layerBadge}>
                <Text style={styles.layerNum}>LAYER 05</Text>
              </View>
              <View style={styles.layerContent}>
                <Heading level={3} style={styles.layerTitle}>Zero-Retention Privacy Guarantee</Heading>
                <Text style={styles.layerDesc}>
                  Client deliverables, IP targets, and confidential security findings are NEVER used for model training.
                  Draftoryn contains zero third-party behavioral trackers or client-side telemetry beacons.
                </Text>
                <View style={styles.techPills}>
                  <Text style={styles.techPill}>No Model Training</Text>
                  <Text style={styles.techPill}>Zero Telemetry</Text>
                  <Text style={styles.techPill}>SOC 2 Aligned</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <View style={styles.maxContainer}>
          <View style={styles.ctaCard}>
            <Text style={styles.ctaEyebrow}>DEPLOY DRAFTORYN</Text>
            <Heading level={2} style={styles.ctaTitle}>Build on High-Assurance Foundations</Heading>
            <Text style={styles.ctaLead}>
              Join cybersecurity teams drafting authorized agreements, threat models, and incident reports with complete relational confidence.
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
          <Text style={styles.footerText}>NEON POSTGRESQL · CLERK AUTH</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#090A0C" },
  body: { paddingBottom: 0 },
  maxContainer: { maxWidth: 1180, width: "100%", alignSelf: "center", paddingHorizontal: 32 },

  hero: {
    paddingVertical: 56,
    backgroundColor: "#101216",
    borderBottomWidth: 1,
    borderColor: "#272B32",
  },
  eyebrow: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.54,
    color: "#2F6BFF",
    marginBottom: 12,
  },
  h1: { fontSize: 44, color: "#F5F3EE", letterSpacing: -1.5, marginBottom: 16 },
  h1Mobile: { fontSize: 32, color: "#F5F3EE", letterSpacing: -1, marginBottom: 14 },
  heroLead: {
    fontFamily: theme.font.sans,
    fontSize: 18,
    color: "#A1A5AD",
    lineHeight: 26,
    maxWidth: 780,
    marginBottom: 28,
  },
  metaRow: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  metaItem: {
    backgroundColor: "#15181D",
    borderWidth: 1,
    borderColor: "#272B32",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  metaKey: { fontFamily: theme.font.mono, fontSize: 10, color: "#727780", letterSpacing: 0.8 },
  metaVal: { fontFamily: theme.font.monoMedium, fontSize: 11, color: "#F5F3EE", marginTop: 2 },

  layersSection: { paddingVertical: 56 },
  sectionHeading: { fontSize: 28, color: "#F5F3EE", marginBottom: 32 },
  layerCards: { gap: 20 },
  layerCard: {
    flexDirection: "row",
    backgroundColor: "#101216",
    borderWidth: 1,
    borderColor: "#272B32",
    borderRadius: 8,
    padding: 24,
    gap: 20,
  },
  layerBadge: {
    width: 84,
    height: 32,
    backgroundColor: "#15181D",
    borderWidth: 1,
    borderColor: "#343941",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  layerNum: { fontFamily: theme.font.monoMedium, fontSize: 11, color: "#2F6BFF", letterSpacing: 1 },
  layerContent: { flex: 1 },
  layerTitle: { fontSize: 18, color: "#F5F3EE", marginBottom: 8 },
  layerDesc: { fontFamily: theme.font.sans, fontSize: 14, color: "#A1A5AD", lineHeight: 21, marginBottom: 14 },
  techPills: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  techPill: {
    fontFamily: theme.font.mono,
    fontSize: 11,
    color: "#F5F3EE",
    backgroundColor: "#15181D",
    borderWidth: 1,
    borderColor: "#272B32",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  specimenBox: {
    backgroundColor: "#15181D",
    borderWidth: 1,
    borderColor: "#272B32",
    borderRadius: 6,
    padding: 12,
  },
  specimenLabel: { fontFamily: theme.font.monoMedium, fontSize: 10, color: "#727780", letterSpacing: 1, marginBottom: 4 },
  specimenCode: { fontFamily: theme.font.mono, fontSize: 11, color: "#2F6BFF" },

  ctaSection: { paddingVertical: 64 },
  ctaCard: {
    backgroundColor: "#101216",
    borderWidth: 1,
    borderColor: "#343941",
    borderRadius: 10,
    padding: 44,
    alignItems: "center",
    textAlign: "center",
  },
  ctaEyebrow: { fontFamily: theme.font.monoMedium, fontSize: 11, color: "#2F6BFF", letterSpacing: 1.54, marginBottom: 8 },
  ctaTitle: { fontSize: 28, color: "#F5F3EE", textAlign: "center", marginBottom: 12 },
  ctaLead: { fontFamily: theme.font.sans, fontSize: 15, color: "#A1A5AD", textAlign: "center", maxWidth: 640, marginBottom: 24 },

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
    paddingHorizontal: 32,
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
