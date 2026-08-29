import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useAppUser } from "../src/auth/clerk";
import { Button, Card, Heading, theme } from "../src/ui/primitives";
import { Icon } from "../src/ui/components";
import { CATEGORIES } from "../src/engine/definitions/catalog";
import { CATEGORY_VISUALS } from "../src/ui/categories";

export default function LandingPage() {
  const { isLoaded, isSignedIn } = useAppUser();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 840;
  const isTablet = width >= 840 && width < 1100;

  const [activeTab, setActiveTab] = useState(0);

  if (isLoaded && isSignedIn) {
    return <Redirect href="/(app)/home" />;
  }

  const tabs = [
    {
      label: "Software Requirements (SRS)",
      icon: "Code2",
      badge: "Engineering",
      title: "Complete IEEE 830 / ISO Software Specs",
      desc: "Generate comprehensive system scope, user roles, functional requirements, REST API contracts, sequence logic, and non-functional constraints tailored for development teams.",
      previewTitle: "Software Requirements Specification (SRS)",
      previewMeta: "ISO/IEC/IEEE 29148 Standard · 12 Sections",
      previewItems: [
        "1.0 Purpose & System Scope",
        "2.0 User Classes & Personas",
        "3.0 Functional Requirements & Use Cases",
        "4.0 Data Models & External APIs",
        "5.0 Security & Performance Guarantees",
      ],
    },
    {
      label: "Penetration Testing Scope",
      icon: "ShieldAlert",
      badge: "Security",
      title: "Legally Authoritative Security Scopes",
      desc: "Create clear rules of engagement, authorized targets, out-of-scope assets, test schedule boundaries, and emergency contact escalation paths in minutes.",
      previewTitle: "Penetration Test Authorization Agreement",
      previewMeta: "PTES Standard · Legal & Operational Scope",
      previewItems: [
        "1.0 Authorization & Safe Harbor Clause",
        "2.0 Target CIDR Ranges & Domains",
        "3.0 Out-of-Scope Production Systems",
        "4.0 Testing Windows & Rate Limits",
        "5.0 Escalation & Incident Response Contacts",
      ],
    },
    {
      label: "Architecture & Threat Model",
      icon: "Layers",
      badge: "Architecture",
      title: "STRIDE & Cloud Infrastructure Plans",
      desc: "Structured architecture blueprints including component trust boundaries, data flow diagrams, threat modeling mitigations, and compliance checklists.",
      previewTitle: "Cloud Architecture & Threat Model",
      previewMeta: "STRIDE Framework · AWS/GCP Ready",
      previewItems: [
        "1.0 System Architecture Overview",
        "2.0 Trust Boundaries & Data Flow",
        "3.0 STRIDE Threat Matrix",
        "4.0 AuthN / AuthZ Mechanism",
        "5.0 Resilience & Disaster Recovery",
      ],
    },
  ];

  const currentTab = tabs[activeTab] ?? tabs[0]!;

  const stats = [
    { value: "100+", label: "Vetted Templates" },
    { value: "< 5s", label: "Instant Generation" },
    { value: "7+", label: "Export Formats (PDF, DOCX...)" },
    { value: "100%", label: "Zero Server Lock-in" },
  ];

  const features = [
    {
      icon: "Cpu",
      title: "Ultra-Fast Groq Intelligence",
      desc: "Powered by high-throughput LLaMA models on Groq hardware. Drafts multi-page technical blueprints with zero hallucination.",
    },
    {
      icon: "FileCheck2",
      title: "Publication-Grade Exports",
      desc: "Export to bordered executive PDFs, stylized Word DOCX documents, clean GitHub Markdown, and structured JSON.",
    },
    {
      icon: "Lock",
      title: "Zero Operational Data Leakage",
      desc: "Placeholders and explicit variables protect your live credentials, proprietary codebases, and private endpoints.",
    },
    {
      icon: "Database",
      title: "Serverless Neon Persistence",
      desc: "Cloud-synchronized PostgreSQL database via Neon with instant offline caching and Clerk authentication.",
    },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      {/* 1. Header Bar */}
      <View style={styles.navWrapper}>
        <View style={styles.navContainer}>
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Icon name="Shield" size={18} color={theme.accentForeground} strokeWidth={2.2} />
            </View>
            <Text style={styles.brandTitle}>Draftoryn</Text>
            {!isMobile ? (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>STUDIO</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.navActions}>
            <Button
              label="Sign in"
              variant="ghost"
              onPress={() => router.push("/(auth)/login")}
              style={{ paddingHorizontal: isMobile ? 8 : 16 }}
            />
            <Button
              label={isMobile ? "Get started" : "Get started free"}
              onPress={() => router.push("/(auth)/signup")}
              style={{ paddingHorizontal: isMobile ? 12 : 20 }}
            />
          </View>
        </View>
      </View>

      {/* 2. Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroContainer}>
          <View style={styles.pillBadge}>
            <Icon name="Sparkles" size={14} color={theme.accent} />
            <Text style={styles.pillText}>Next-Gen Technical & Security Document Studio</Text>
          </View>

          <Heading level={1} style={isMobile ? styles.heroTitleMobile : styles.heroTitle}>
            Authoritative technical specs & security agreements in seconds.
          </Heading>

          <Text style={[styles.heroSubtitle, isMobile && { fontSize: 15, lineHeight: 22 }]}>
            Stop wrestling with messy word templates. Draftoryn combines domain-specific frameworks with high-speed AI to create flawless system specifications, software architecture plans, and security assessment scopes.
          </Text>

          <View style={[styles.heroCtaRow, isMobile && { flexDirection: "column", width: "100%" }]}>
            <Button
              label="Start drafting for free"
              onPress={() => router.push("/(auth)/signup")}
              style={isMobile ? { width: "100%" } : styles.ctaPrimary}
            />
            <Button
              label="Sign in to workspace"
              variant="secondary"
              onPress={() => router.push("/(auth)/login")}
              style={isMobile ? { width: "100%" } : undefined}
            />
          </View>

          {/* Stats strip */}
          <View style={styles.statsStrip}>
            {stats.map((s, i) => (
              <View key={s.label} style={[styles.statBox, isMobile && { width: "50%", marginBottom: 12 }]}>
                <Text style={styles.statVal}>{s.value}</Text>
                <Text style={styles.statLab}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 3. Interactive Product Showcase / Tabs */}
      <View style={styles.showcaseSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionKicker}>CURATED BLUEPRINTS</Text>
          <Heading level={2} style={styles.sectionHeading}>
            Engineered for modern software & security teams
          </Heading>
          <Text style={styles.sectionDesc}>
            Select a document type to preview how Draftoryn structures complex engineering requirements into export-ready documents.
          </Text>
        </View>

        {/* Tab Selector */}
        <View style={[styles.tabRow, isMobile && { flexDirection: "column", gap: 8 }]}>
          {tabs.map((t, idx) => {
            const active = activeTab === idx;
            return (
              <Pressable
                key={t.label}
                onPress={() => setActiveTab(idx)}
                style={[
                  styles.tabButton,
                  active && styles.tabButtonActive,
                  isMobile && { width: "100%" },
                ]}
              >
                <Icon
                  name={t.icon}
                  size={18}
                  color={active ? theme.accentForeground : theme.text}
                />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Tab Content Display Card */}
        <View style={[styles.showcaseCard, isMobile && { padding: 18 }]}>
          <View style={[styles.showcaseGrid, isMobile && { flexDirection: "column", gap: 20 }]}>
            <View style={styles.showcaseLeft}>
              <View style={styles.badgeWrap}>
                <Text style={styles.showcaseBadge}>{currentTab.badge.toUpperCase()}</Text>
              </View>
              <Heading level={3} style={styles.showcaseTitle}>
                {currentTab.title}
              </Heading>
              <Text style={styles.showcaseText}>{currentTab.desc}</Text>
              <View style={{ marginTop: 20 }}>
                <Button
                  label="Use this blueprint"
                  onPress={() => router.push("/(auth)/signup")}
                  style={{ alignSelf: isMobile ? "stretch" : "flex-start" }}
                />
              </View>
            </View>

            {/* Document Preview Mockup */}
            <View style={styles.showcaseRight}>
              <View style={styles.docMockup}>
                <View style={styles.docMockupHeader}>
                  <View style={styles.docMockupDots}>
                    <View style={[styles.dot, { backgroundColor: "#ff5f56" }]} />
                    <View style={[styles.dot, { backgroundColor: "#ffbd2e" }]} />
                    <View style={[styles.dot, { backgroundColor: "#27c93f" }]} />
                  </View>
                  <Text style={styles.docMockupFile}>draftoryn-spec.pdf</Text>
                </View>
                <View style={styles.docMockupBody}>
                  <Text style={styles.mockupDocTitle}>{currentTab.previewTitle}</Text>
                  <Text style={styles.mockupDocMeta}>{currentTab.previewMeta}</Text>
                  <View style={styles.mockupDivider} />
                  {currentTab.previewItems.map((item) => (
                    <View key={item} style={styles.mockupItem}>
                      <Icon name="CheckCircle2" size={15} color={theme.accent} />
                      <Text style={styles.mockupItemText}>{item}</Text>
                    </View>
                  ))}
                  <View style={styles.mockupFooterWatermark}>
                    <Text style={styles.mockupWatermarkText}>Generated with Draftoryn Studio</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* 4. Features Grid */}
      <View style={styles.featuresSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionKicker}>BUILT FOR PERFORMANCE</Text>
          <Heading level={2} style={styles.sectionHeading}>
            Everything needed to draft, edit, and ship
          </Heading>
        </View>

        <View style={styles.featureGrid}>
          {features.map((f) => (
            <View
              key={f.title}
              style={[styles.featureCardWrap, { width: isMobile ? "100%" : isTablet ? "48%" : "23.5%" }]}
            >
              <Card style={styles.featureCard} accentTop>
                <View style={styles.featureIcon}>
                  <Icon name={f.icon} size={22} color={theme.accent} />
                </View>
                <Heading level={3} style={styles.featureTitle}>
                  {f.title}
                </Heading>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </Card>
            </View>
          ))}
        </View>
      </View>

      {/* 5. Supported Categories */}
      <View style={styles.categoriesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionKicker}>DOCUMENT CATEGORIES</Text>
          <Heading level={2} style={styles.sectionHeading}>
            Over 100 domain-specific document types
          </Heading>
        </View>

        <View style={styles.catGrid}>
          {CATEGORIES.slice(0, 6).map((cat) => {
            const visual = CATEGORY_VISUALS[cat];
            return (
              <View
                key={cat}
                style={[styles.catCardWrap, { width: isMobile ? "100%" : "31.8%" }]}
              >
                <Card hover style={styles.catCard}>
                  <View style={styles.catHead}>
                    <View style={[styles.catIconWrap, { backgroundColor: `${visual.accent}18` }]}>
                      <Icon name={visual.icon} size={18} color={visual.accent} />
                    </View>
                    <Text style={styles.catTitle}>{visual.label}</Text>
                  </View>
                  <Text style={styles.catDesc}>{visual.blurb}</Text>
                </Card>
              </View>
            );
          })}
        </View>
      </View>

      {/* 6. Big CTA Footer Banner */}
      <View style={styles.bannerSection}>
        <View style={styles.bannerCard}>
          <Text style={styles.bannerKicker}>READY TO GET STARTED?</Text>
          <Heading level={2} style={styles.bannerTitle}>
            Start drafting professional documentation in minutes.
          </Heading>
          <Text style={styles.bannerSub}>
            No credit card required. Free tier includes full access to all standard templates and instant multi-format exports.
          </Text>
          <Button
            label="Create your workspace"
            onPress={() => router.push("/(auth)/signup")}
            style={{ paddingHorizontal: 32, paddingVertical: 14 }}
          />
        </View>
      </View>

      {/* 7. Footer */}
      <View style={styles.footer}>
        <View style={styles.footerInner}>
          <View style={styles.footerBrandRow}>
            <View style={styles.brandMark}>
              <Icon name="Shield" size={16} color={theme.accentForeground} strokeWidth={2} />
            </View>
            <Text style={styles.brandTitle}>Draftoryn</Text>
          </View>
          <Text style={styles.footerText}>
            Professional technical specification and security document studio.
          </Text>
          <Text style={styles.footerMeta}>
            Direct Serverless Neon PostgreSQL · Powered by Groq AI Inference
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { paddingBottom: 0 },

  // Navbar
  navWrapper: {
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderColor: theme.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "100%",
  },
  navContainer: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: { fontFamily: theme.font.serifSemi, fontSize: 20, color: theme.text },
  proBadge: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 9,
    color: theme.accent,
    letterSpacing: 1,
  },
  navActions: { flexDirection: "row", alignItems: "center", gap: 6 },

  // Hero
  heroSection: {
    paddingVertical: 40,
    paddingHorizontal: 16,
    backgroundColor: theme.bg,
    borderBottomWidth: 1,
    borderColor: theme.border,
  },
  heroContainer: {
    maxWidth: 960,
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
  },
  pillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 20,
    ...theme.shadowSm,
  },
  pillText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 13,
    color: theme.text,
  },
  heroTitle: {
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1.5,
    color: theme.text,
    textAlign: "center",
    marginBottom: 20,
  },
  heroTitleMobile: {
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.75,
    color: theme.text,
    textAlign: "center",
    marginBottom: 16,
  },
  heroSubtitle: {
    fontFamily: theme.font.sans,
    fontSize: 17,
    lineHeight: 27,
    color: theme.muted,
    textAlign: "center",
    maxWidth: 720,
    marginBottom: 32,
  },
  heroCtaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    justifyContent: "center",
    marginBottom: 48,
  },
  ctaPrimary: { paddingHorizontal: 28, paddingVertical: 14 },

  // Stats
  statsStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    paddingVertical: 20,
    paddingHorizontal: 28,
    ...theme.shadowSm,
  },
  statBox: { alignItems: "center" },
  statVal: {
    fontFamily: theme.font.serifSemi,
    fontSize: 26,
    color: theme.accent,
    marginBottom: 4,
  },
  statLab: {
    fontFamily: theme.font.sans,
    fontSize: 12,
    color: theme.muted,
  },

  // Showcase
  showcaseSection: {
    paddingVertical: 56,
    paddingHorizontal: 24,
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
  },
  sectionHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  sectionKicker: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.accent,
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 30,
    color: theme.text,
    textAlign: "center",
    marginBottom: 12,
  },
  sectionDesc: {
    fontFamily: theme.font.sans,
    fontSize: 15,
    color: theme.muted,
    textAlign: "center",
    maxWidth: 620,
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.radiusSm,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  tabButtonActive: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  tabLabel: {
    fontFamily: theme.font.sansMedium,
    fontSize: 13,
    color: theme.text,
  },
  tabLabelActive: {
    color: theme.accentForeground,
  },
  showcaseCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 36,
    ...theme.shadowSm,
  },
  showcaseGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 36,
  },
  showcaseLeft: { flex: 1 },
  badgeWrap: { marginBottom: 12 },
  showcaseBadge: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    color: theme.accent,
    letterSpacing: 1,
  },
  showcaseTitle: {
    fontSize: 24,
    color: theme.text,
    marginBottom: 12,
  },
  showcaseText: {
    fontFamily: theme.font.sans,
    fontSize: 15,
    lineHeight: 24,
    color: theme.muted,
  },
  showcaseRight: { flex: 1, alignItems: "center", justifyContent: "center" },
  docMockup: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    ...theme.shadowSm,
  },
  docMockupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  docMockupDots: { flexDirection: "row", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  docMockupFile: { fontFamily: theme.font.mono, fontSize: 11, color: "#64748b" },
  docMockupBody: { padding: 22 },
  mockupDocTitle: { fontFamily: theme.font.serifSemi, fontSize: 16, color: "#0f172a", marginBottom: 4 },
  mockupDocMeta: { fontFamily: theme.font.mono, fontSize: 11, color: "#64748b", marginBottom: 14 },
  mockupDivider: { height: 1, backgroundColor: "#e2e8f0", marginBottom: 14 },
  mockupItem: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  mockupItemText: { fontFamily: theme.font.sans, fontSize: 13, color: "#334155" },
  mockupFooterWatermark: {
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: "#f1f5f9",
    alignItems: "center",
  },
  mockupWatermarkText: { fontFamily: theme.font.mono, fontSize: 10, color: "#94a3b8" },

  // Features
  featuresSection: {
    paddingVertical: 56,
    paddingHorizontal: 24,
    backgroundColor: theme.surface2,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.border,
  },
  featureGrid: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  featureCardWrap: { marginBottom: 0 },
  featureCard: { padding: 22, height: "100%" },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  featureTitle: { fontSize: 17, color: theme.text, marginBottom: 8 },
  featureDesc: { fontFamily: theme.font.sans, fontSize: 13, lineHeight: 20, color: theme.muted },

  // Categories
  categoriesSection: {
    paddingVertical: 56,
    paddingHorizontal: 24,
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
  },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  catCardWrap: { marginBottom: 0 },
  catCard: { padding: 18, height: "100%" },
  catHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  catIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  catTitle: { fontFamily: theme.font.sansSemi, fontSize: 15, color: theme.text },
  catDesc: { fontFamily: theme.font.sans, fontSize: 13, lineHeight: 18, color: theme.muted },

  // Banner
  bannerSection: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
  },
  bannerCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: "center",
    ...theme.shadowSm,
  },
  bannerKicker: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.accent,
    marginBottom: 10,
  },
  bannerTitle: {
    fontSize: 28,
    color: theme.text,
    textAlign: "center",
    marginBottom: 12,
    maxWidth: 640,
  },
  bannerSub: {
    fontFamily: theme.font.sans,
    fontSize: 15,
    color: theme.muted,
    textAlign: "center",
    maxWidth: 540,
    marginBottom: 26,
  },

  // Footer
  footer: {
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderColor: theme.border,
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  footerInner: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
    gap: 8,
  },
  footerBrandRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  footerText: { fontFamily: theme.font.sans, fontSize: 13, color: theme.text },
  footerMeta: { fontFamily: theme.font.mono, fontSize: 11, color: theme.muted },
});


