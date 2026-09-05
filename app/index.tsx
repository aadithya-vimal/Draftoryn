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
      label: "Penetration Testing Authorization",
      icon: "ShieldAlert",
      badge: "Offensive Security",
      title: "Legally Authoritative Security Scopes",
      desc: "Establish clear rules of engagement, authorized targets, out-of-scope assets, test schedule boundaries, and emergency contact escalation paths in minutes.",
      previewTitle: "Penetration Testing Agreement & Authorization",
      previewMeta: "PTES / NIST SP 800-115 Standard · 7 Sections",
      previewItems: [
        "1.0 Identification of Parties & Authority",
        "2.0 Authorization & Safe Harbor Clause",
        "3.0 Target CIDR Ranges & Domain Scope",
        "4.0 Out-of-Scope Production Systems",
        "5.0 Emergency Escalation Protocol",
      ],
    },
    {
      label: "Incident Response Playbook",
      icon: "Siren",
      badge: "Incident Response / DFIR",
      title: "Operational Incident Response Playbooks",
      desc: "Standardize containment matrices, forensic evidence handling procedures, severity triage, and stakeholder communication timelines.",
      previewTitle: "Cybersecurity Incident Response Playbook",
      previewMeta: "NIST SP 800-61 Rev 2 Framework · Operational",
      previewItems: [
        "1.0 Incident Classification & Severity Matrix",
        "2.0 Triage & First-Responder Protocol",
        "3.0 Forensic Evidence Chain of Custody",
        "4.0 Containment & Eradication Procedures",
        "5.0 Post-Incident Remediation & Sign-off",
      ],
    },
    {
      label: "Enterprise Threat Model",
      icon: "Building2",
      badge: "Security Architecture",
      title: "STRIDE Architecture & Trust Boundaries",
      desc: "Structured architecture blueprints including component trust boundaries, data flow diagrams, threat modeling mitigations, and compliance checklists.",
      previewTitle: "System Threat Model & Architecture Spec",
      previewMeta: "STRIDE / OWASP Threat Matrix · Production-Grade",
      previewItems: [
        "1.0 System Architecture Overview",
        "2.0 Trust Boundaries & Data Flow Diagrams",
        "3.0 STRIDE Threat Identification Matrix",
        "4.0 Authentication & Cryptographic Controls",
        "5.0 Residual Risk Acceptance & Action Items",
      ],
    },
  ];

  const currentTab = tabs[activeTab] ?? tabs[0]!;

  const stats = [
    { value: "30", label: "Core Security Frameworks" },
    { value: "6", label: "Specialized Domains" },
    { value: "7", label: "Export Formats (PDF, DOCX...)" },
    { value: "100%", label: "Client-Side Privacy" },
  ];

  const features = [
    {
      icon: "Cpu",
      title: "Context-Driven Opt-In AI",
      desc: "Deterministic manual structural drafting by default. Opt in to AI synthesis only when you provide explicit scope and organizational context.",
    },
    {
      icon: "FileCheck2",
      title: "Publication-Grade Exports",
      desc: "Export to executive styled PDFs, structured Word DOCX files, clean GitHub Markdown, and raw JSON blueprints.",
    },
    {
      icon: "Lock",
      title: "Zero Operational Data Leakage",
      desc: "Strict field boundaries and client-side isolation protect your live credentials, proprietary targets, and private endpoints.",
    },
    {
      icon: "Database",
      title: "Serverless Persistence",
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
                <Text style={styles.proBadgeText}>CYBERSECURITY</Text>
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
            <Text style={styles.pillText}>Specialized Cybersecurity Document Studio</Text>
          </View>

          <Heading level={1} style={isMobile ? styles.heroTitleMobile : styles.heroTitle}>
            Authoritative security agreements & technical specs in seconds.
          </Heading>

          <Text style={[styles.heroSubtitle, isMobile && { fontSize: 15, lineHeight: 22 }]}>
            Stop wrestling with unstandardized templates. Draftoryn provides 30 rigorously structured cybersecurity documents across Offensive Security, DFIR, Threat Intelligence, Architecture, Governance, and Resilience.
          </Text>

          <View style={[styles.heroCtaRow, isMobile && { flexDirection: "column", width: "100%" }]}>
            <Button
              label="Start drafting now"
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
            {stats.map((s) => (
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
          <Text style={styles.sectionKicker}>CANONICAL BLUEPRINTS</Text>
          <Heading level={2} style={styles.sectionHeading}>
            Rigorously structured for security professionals
          </Heading>
          <Text style={styles.sectionDesc}>
            Select a framework to preview how Draftoryn structures complex cybersecurity scopes, technical findings, and executive sign-offs into export-ready documents.
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
                  color={active ? "#FFFFFF" : theme.mutedLight}
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
          <View style={[styles.showcaseGrid, isMobile && { flexDirection: "column", gap: 24 }]}>
            <View style={styles.showcaseLeft}>
              <View style={styles.badgeWrap}>
                <Text style={styles.showcaseBadge}>{currentTab.badge.toUpperCase()}</Text>
              </View>
              <Heading level={3} style={styles.showcaseTitle}>
                {currentTab.title}
              </Heading>
              <Text style={styles.showcaseText}>{currentTab.desc}</Text>
              <View style={{ marginTop: 24 }}>
                <Button
                  label="Create this document"
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
                    <View style={[styles.dot, { backgroundColor: "#EF4444" }]} />
                    <View style={[styles.dot, { backgroundColor: "#F59E0B" }]} />
                    <View style={[styles.dot, { backgroundColor: "#10B981" }]} />
                  </View>
                  <Text style={styles.docMockupFile}>draftoryn-preview.pdf</Text>
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
          <Text style={styles.sectionKicker}>DESIGNED FOR RIGOR</Text>
          <Heading level={2} style={styles.sectionHeading}>
            Everything required to author, review, and deliver
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
          <Text style={styles.sectionKicker}>EXHAUSTIVE SECURITY CATALOG</Text>
          <Heading level={2} style={styles.sectionHeading}>
            6 Core Cybersecurity Domains (30 Standard Frameworks)
          </Heading>
        </View>

        <View style={styles.catGrid}>
          {CATEGORIES.map((cat) => {
            const visual = CATEGORY_VISUALS[cat];
            return (
              <View
                key={cat}
                style={[styles.catCardWrap, { width: isMobile ? "100%" : "31.8%" }]}
              >
                <Card hover style={styles.catCard}>
                  <View style={styles.catHead}>
                    <View style={[styles.catIconWrap, { backgroundColor: `${visual.accent}20` }]}>
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
          <Text style={styles.bannerKicker}>READY TO DRAFT?</Text>
          <Heading level={2} style={styles.bannerTitle}>
            Start drafting professional security documentation.
          </Heading>
          <Text style={styles.bannerSub}>
            Standardize your agreements, incident playbooks, and assessment deliverables. Free access to all 30 standard security templates.
          </Text>
          <Button
            label="Open your workspace"
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
            The authoritative cybersecurity document studio.
          </Text>
          <Text style={styles.footerMeta}>
            Direct Serverless Neon PostgreSQL · Client-Isolated Synthesis
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
    paddingVertical: 14,
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
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: {
    width: 32,
    height: 32,
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 9,
    color: theme.accent,
    letterSpacing: 1.5,
  },
  navActions: { flexDirection: "row", alignItems: "center", gap: 10 },

  // Hero
  heroSection: {
    paddingVertical: 56,
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
    marginBottom: 24,
    ...theme.shadowSm,
  },
  pillText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 13,
    color: theme.textSecondary,
  },
  heroTitle: {
    fontSize: 46,
    lineHeight: 54,
    letterSpacing: -1.2,
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
    marginBottom: 36,
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
    paddingVertical: 22,
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
    paddingVertical: 64,
    paddingHorizontal: 24,
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
  },
  sectionHeader: {
    alignItems: "center",
    marginBottom: 36,
  },
  sectionKicker: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 2.5,
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
    maxWidth: 640,
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 28,
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
    color: theme.textSecondary,
  },
  tabLabelActive: {
    color: "#FFFFFF",
  },
  showcaseCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 36,
    ...theme.shadowMd,
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
    letterSpacing: 1.5,
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
    backgroundColor: theme.surface2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
    ...theme.shadowSm,
  },
  docMockupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: theme.border,
  },
  docMockupDots: { flexDirection: "row", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  docMockupFile: { fontFamily: theme.font.mono, fontSize: 11, color: theme.muted },
  docMockupBody: { padding: 22 },
  mockupDocTitle: { fontFamily: theme.font.serifSemi, fontSize: 16, color: theme.text, marginBottom: 4 },
  mockupDocMeta: { fontFamily: theme.font.mono, fontSize: 11, color: theme.muted, marginBottom: 14 },
  mockupDivider: { height: 1, backgroundColor: theme.border, marginBottom: 14 },
  mockupItem: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  mockupItemText: { fontFamily: theme.font.sans, fontSize: 13, color: theme.textSecondary },
  mockupFooterWatermark: {
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
  },
  mockupWatermarkText: { fontFamily: theme.font.mono, fontSize: 10, color: theme.muted },

  // Features
  featuresSection: {
    paddingVertical: 64,
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
  featureCard: { padding: 22, height: "100%", backgroundColor: theme.surface },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: theme.surface2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  featureTitle: { fontSize: 17, color: theme.text, marginBottom: 8 },
  featureDesc: { fontFamily: theme.font.sans, fontSize: 13, lineHeight: 20, color: theme.muted },

  // Categories
  categoriesSection: {
    paddingVertical: 64,
    paddingHorizontal: 24,
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
  },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  catCardWrap: { marginBottom: 0 },
  catCard: { padding: 20, height: "100%", backgroundColor: theme.surface },
  catHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  catIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  catTitle: { fontFamily: theme.font.sansSemi, fontSize: 15, color: theme.text },
  catDesc: { fontFamily: theme.font.sans, fontSize: 13, lineHeight: 19, color: theme.muted },

  // Banner
  bannerSection: {
    paddingVertical: 56,
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
    ...theme.shadowMd,
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
    marginBottom: 28,
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
