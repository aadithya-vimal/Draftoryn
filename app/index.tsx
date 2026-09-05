import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useAppUser } from "../src/auth/clerk";
import { Button, Card, Heading, theme } from "../src/ui/primitives";
import { Icon } from "../src/ui/components";
import { CATEGORIES, definitionsByCategory } from "../src/engine/definitions/catalog";
import { CATEGORY_VISUALS } from "../src/ui/categories";

export default function LandingPage() {
  const { isLoaded, isSignedIn } = useAppUser();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 840;

  const [activeSpecIndex, setActiveSpecIndex] = useState(0);

  if (isLoaded && isSignedIn) {
    return <Redirect href="/(app)/home" />;
  }

  const specimens = [
    {
      id: "SPEC-AUTH-01",
      title: "Penetration Testing Agreement & Authorization",
      category: "Offensive Security",
      badgeTone: "#2563EB",
      sections: [
        { num: "01", name: "Authorization & Explicit Safe Harbor", detail: "Formal delegation under CFAA & international mandates." },
        { num: "02", name: "Permitted Target CIDRs & Subdomains", detail: "CIDR /24 blocks, domain roots, excluded endpoints." },
        { num: "03", name: "Testing Windows & Rate Limits", detail: "UTC schedules, allowed burst rates, non-destructive flags." },
        { num: "04", name: "Emergency Containment Protocol", detail: "Immediate escalation contacts with encrypted PGP channels." },
      ],
      sampleOutput: `## 1.0 AUTHORIZATION & SAFE HARBOR
Client hereby grants explicit legal authority to Assessor to perform active penetration testing against authorized systems identified in Schedule A. All activities conducted strictly within stated parameters shall be deemed authorized access under 18 U.S.C. § 1030 (CFAA).

## 2.0 TARGET SCOPE SPECIFICATION
- 198.51.100.0/24 (Production API Gateway) [IN SCOPE]
- *.internal.acmecorp.com (Staging Enclave) [IN SCOPE]
- 203.0.113.50 (Corporate Payment Gateway) [STRICTLY OUT OF SCOPE]`,
    },
    {
      id: "SPEC-DFIR-02",
      title: "Incident Response Playbook: Ransomware Containment",
      category: "Incident Response / DFIR",
      badgeTone: "#EF4444",
      sections: [
        { num: "01", name: "Severity Triage & Initial Assessment", detail: "Host isolation triggers, encrypted file discovery thresholds." },
        { num: "02", name: "Network Segmentation & Killswitch", detail: "VLAN quarantine, Active Directory token invalidation." },
        { num: "03", name: "Forensic Chain of Custody", detail: "Volatile memory preservation, disk snapshot hashes." },
        { num: "04", name: "Executive & Regulatory Disclosure", detail: "72-hour notification timeline, law enforcement coordination." },
      ],
      sampleOutput: `## 1.0 INCIDENT SEVERITY CRITERIA: LEVEL 4 (CRITICAL)
Trigger: Active ransomware encryption identified on ≥2 domain-joined endpoints.
Immediate Mandate: Execute Stage 1 host isolation within 15 minutes of triage.

## 2.0 FORENSIC CHAIN OF CUSTODY LOG
- Memory Dump Hash: SHA256 e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
- Custodian: Forensic Lead J. Smith (CISSP #491202)`,
    },
    {
      id: "SPEC-ARCH-03",
      title: "System Threat Model & Trust Boundaries",
      category: "Security Architecture",
      badgeTone: "#0D9488",
      sections: [
        { num: "01", name: "System Boundary Decomposition", detail: "External ingress, DMZ, application tier, data store boundaries." },
        { num: "02", name: "STRIDE Threat Identification", detail: "Spoofing, Tampering, Repudiation, Information Disclosure analysis." },
        { num: "03", name: "Cryptographic Controls & Key Management", detail: "mTLS requirements, envelope encryption, KMS rotation." },
        { num: "04", name: "Mitigation Tracking & Verification", detail: "Zero-trust residual risk evaluation." },
      ],
      sampleOutput: `## 1.0 TRUST BOUNDARY DEFINITIONS
- TB-01 [External → DMZ]: Ingress TLS 1.3 termination via Envoy Reverse Proxy.
- TB-02 [DMZ → Core Microservices]: Mutual TLS (mTLS) with SPIFFE/SPIRE x509 SVID validation.
- TB-03 [Core → Database Enclave]: Encrypted wire, IAM database auth, no direct internet egress.`,
    },
    {
      id: "SPEC-BIA-04",
      title: "Business Impact Analysis & Recovery Objectives",
      category: "Resilience",
      badgeTone: "#10B981",
      sections: [
        { num: "01", name: "Critical System Identification", detail: "Tier 1 revenue systems, customer facing APIs, authentication." },
        { num: "02", name: "RTO & RPO Metrics", detail: "Recovery Time Objective (≤1hr) and Recovery Point Objective (≤5min)." },
        { num: "03", name: "Financial & Operational Loss Matrix", detail: "Per-hour downtime costs, SLA penalty thresholds." },
        { num: "04", name: "Failover Sequence & Validation", detail: "Multi-region DNS reroute and state reconciliation." },
      ],
      sampleOutput: `## 1.0 SYSTEM RECOVERY OBJECTIVES
- System: Primary Transaction Pipeline (Tier 1)
- RTO (Recovery Time Objective): 45 minutes
- RPO (Recovery Point Objective): 0 minutes (Synchronous Raft replication)
- Maximum Tolerable Downtime (MTD): 2 hours`,
    },
  ];

  const currentSpec = specimens[activeSpecIndex] ?? specimens[0]!;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      {/* 1. Technical Editorial Top Bar */}
      <View style={styles.navWrapper}>
        <View style={styles.navContainer}>
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Icon name="Shield" size={16} color={theme.accentForeground} strokeWidth={2.2} />
            </View>
            <View>
              <Text style={styles.brandTitle}>DRAFTORYN</Text>
              <Text style={styles.brandSub}>DOC STUDIO // V1.0</Text>
            </View>
          </View>

          <View style={styles.navActions}>
            <Button
              label="Sign In"
              variant="ghost"
              onPress={() => router.push("/(auth)/login")}
              style={{ paddingHorizontal: isMobile ? 8 : 16 }}
            />
            <Button
              label="Initialize Studio →"
              onPress={() => router.push("/(auth)/signup")}
              style={{ paddingHorizontal: isMobile ? 12 : 20 }}
            />
          </View>
        </View>
      </View>

      {/* 2. SECTION: BIG STATEMENT */}
      <View style={styles.heroSection}>
        <View style={styles.heroContainer}>
          <View style={styles.techTag}>
            <View style={styles.techTagDot} />
            <Text style={styles.techTagText}>TECHNICAL EDITORIAL // PRECISION SPECIFICATIONS</Text>
          </View>

          <Heading level={1} style={isMobile ? styles.heroTitleMobile : styles.heroTitle}>
            Professional software for technical specifications, authorized agreements, and security evaluations.
          </Heading>

          <Text style={styles.heroLead}>
            Engineered for offensive security practitioners, forensics investigators, system architects, and
            commissioning organizations. Replacing ad-hoc docs and hallucinated formatting with 30 mathematically
            verifiable schemas and authoritative database persistence.
          </Text>

          <View style={[styles.heroCtaRow, isMobile && { flexDirection: "column", width: "100%", gap: 10 }]}>
            <Button
              label="Initialize Your Workspace →"
              onPress={() => router.push("/(auth)/signup")}
              style={isMobile ? { width: "100%" } : styles.ctaPrimary}
            />
            <Button
              label="Browse 30 Specifications"
              variant="secondary"
              onPress={() => router.push("/(auth)/login")}
              style={isMobile ? { width: "100%" } : undefined}
            />
          </View>

          {/* Metric Hairline Row */}
          <View style={styles.metricRow}>
            <View style={styles.metricCol}>
              <Text style={styles.metricVal}>30</Text>
              <Text style={styles.metricLab}>CANONICAL SPECIFICATIONS</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricCol}>
              <Text style={styles.metricVal}>06</Text>
              <Text style={styles.metricLab}>TECHNICAL DISCIPLINES</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricCol}>
              <Text style={styles.metricVal}>100%</Text>
              <Text style={styles.metricLab}>NEON RELATIONAL PERSISTENCE</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricCol}>
              <Text style={styles.metricVal}>05</Text>
              <Text style={styles.metricLab}>STANDARDIZED EXPORTS</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 3. SECTION: REAL PRODUCT SPECIMEN (Split Layout) */}
      <View style={styles.specimenSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>INTERACTIVE SPECIMEN PREVIEW</Text>
          <Heading level={2} style={styles.sectionTitle}>
            The document is the visual object.
          </Heading>
          <Text style={styles.sectionLead}>
            Draftoryn documents are not free-form text dumps. Each specification follows a strict relational
            schema with mandatory parameters, validation gates, and version-controlled snapshots.
          </Text>
        </View>

        {/* Specimen Selector Tabs */}
        <View style={[styles.specimenTabs, isMobile && { flexDirection: "column" }]}>
          {specimens.map((s, idx) => {
            const active = idx === activeSpecIndex;
            return (
              <Pressable
                key={s.id}
                style={[styles.specimenTabBtn, active && styles.specimenTabBtnActive]}
                onPress={() => setActiveSpecIndex(idx)}
              >
                <Text style={[styles.specimenTabId, active && { color: theme.accent }]}>{s.id}</Text>
                <Text style={[styles.specimenTabTitle, active && { color: theme.text }]}>{s.title}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Specimen Display Box */}
        <View style={[styles.specimenDisplay, isMobile && { flexDirection: "column" }]}>
          {/* Left: Outline & Structure */}
          <View style={[styles.specimenOutlineCol, isMobile ? { width: "100%" } : { width: "40%" }]}>
            <View style={styles.outlineHeader}>
              <Text style={styles.outlineHeaderTitle}>STRUCTURAL SCHEMA</Text>
              <View style={[styles.outlineBadge, { borderColor: currentSpec.badgeTone }]}>
                <Text style={[styles.outlineBadgeText, { color: currentSpec.badgeTone }]}>{currentSpec.category.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.sectionList}>
              {currentSpec.sections.map((sec) => (
                <View key={sec.num} style={styles.sectionListItem}>
                  <Text style={styles.sectionListNum}>{sec.num}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionListName}>{sec.name}</Text>
                    <Text style={styles.sectionListDetail}>{sec.detail}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Right: Rendered Document Specimen */}
          <View style={[styles.specimenRenderCol, isMobile ? { width: "100%" } : { width: "60%" }]}>
            <View style={styles.renderHeader}>
              <View style={styles.renderDot} />
              <Text style={styles.renderTitle}>{currentSpec.id} // RENDERED CANONICAL OUTPUT</Text>
            </View>
            <View style={styles.renderBody}>
              <Text style={styles.renderDocTitle}>{currentSpec.title}</Text>
              <View style={styles.renderMetaGrid}>
                <View style={styles.renderMetaItem}>
                  <Text style={styles.renderMetaKey}>AUTHORITY</Text>
                  <Text style={styles.renderMetaVal}>Lead Practitioner</Text>
                </View>
                <View style={styles.renderMetaItem}>
                  <Text style={styles.renderMetaKey}>PERSISTENCE</Text>
                  <Text style={styles.renderMetaVal}>Neon PostgreSQL</Text>
                </View>
                <View style={styles.renderMetaItem}>
                  <Text style={styles.renderMetaKey}>COMPLIANCE</Text>
                  <Text style={styles.renderMetaVal}>Strict Schema V1</Text>
                </View>
              </View>
              <View style={styles.renderDivider} />
              <Text style={styles.renderContent}>{currentSpec.sampleOutput}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 4. SECTION: LARGE TYPOGRAPHIC MANIFESTO */}
      <View style={styles.manifestoSection}>
        <View style={styles.manifestoContainer}>
          <Text style={styles.manifestoEyebrow}>CORE SYSTEM DOCTRINE</Text>
          <Text style={styles.manifestoLead}>
            PRECISION OVER HALLUCINATION.
          </Text>
          <Text style={styles.manifestoLead}>
            STRUCTURE OVER AMBIGUITY.
          </Text>
          <Text style={[styles.manifestoLead, { color: theme.accent }]}>
            AUTHORITATIVE DELIVERABLES OVER GENERIC TEXT.
          </Text>
          <Text style={styles.manifestoSub}>
            Every agreement, playbook, model, and report generated in Draftoryn is backed by a verified relational
            schema in Neon PostgreSQL. No fabricated demo states. No purple glowing blobs.
          </Text>
        </View>
      </View>

      {/* 5. SECTION: COMPLETE 30-SPECIFICATION CATALOG TABLE */}
      <View style={styles.catalogSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>CURATED SPECIFICATION REPOSITORY</Text>
          <Heading level={2} style={styles.sectionTitle}>
            30 Authoritative Documents. Nothing more, nothing less.
          </Heading>
          <Text style={styles.sectionLead}>
            Standardized definitions covering all core domains of offensive security, incident response,
            threat intelligence, security architecture, cyber risk governance, and enterprise resilience.
          </Text>
        </View>

        <View style={styles.catalogGrid}>
          {CATEGORIES.map((cat) => {
            const visual = CATEGORY_VISUALS[cat];
            const defs = definitionsByCategory(cat);
            return (
              <View key={cat} style={styles.disciplineBlock}>
                <View style={styles.disciplineHeader}>
                  <View style={[styles.disciplineIcon, { backgroundColor: `${visual.accent}14` }]}>
                    <Icon name={visual.icon} size={16} color={visual.accent} />
                  </View>
                  <Text style={styles.disciplineName}>{visual.label.toUpperCase()}</Text>
                  <Text style={styles.disciplineCount}>{defs.length} SPECS</Text>
                </View>
                <View style={styles.specList}>
                  {defs.map((d) => (
                    <View key={d.id} style={styles.specRow}>
                      <Text style={styles.specTitle}>{d.name}</Text>
                      <Text style={styles.specSectionsCount}>{d.sections.length} sections</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* 6. SECTION: FINAL CTA */}
      <View style={styles.finalSection}>
        <View style={styles.finalContainer}>
          <Text style={styles.finalEyebrow}>START DRAFTING TODAY</Text>
          <Heading level={2} style={styles.finalTitle}>
            Ready to generate authoritative documentation?
          </Heading>
          <Text style={styles.finalLead}>
            Provision your workspace in seconds with Clerk authentication and Neon PostgreSQL persistence.
          </Text>
          <View style={styles.finalBtnRow}>
            <Button
              label="Initialize Workspace Now →"
              onPress={() => router.push("/(auth)/signup")}
              style={styles.ctaPrimary}
            />
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerInner}>
          <Text style={styles.footerText}>© 2026 Draftoryn. All rights reserved.</Text>
          <Text style={styles.footerText}>Technical Editorial Document Design System</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { paddingBottom: 0 },

  navWrapper: {
    borderBottomWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  navContainer: {
    maxWidth: 1140,
    width: "100%",
    alignSelf: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: theme.radiusSm,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontFamily: theme.font.sansBlack,
    fontSize: 15,
    letterSpacing: 1.2,
    color: theme.text,
  },
  brandSub: {
    fontFamily: theme.font.mono,
    fontSize: 8.5,
    letterSpacing: 1.2,
    color: theme.muted,
  },
  navActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  heroSection: {
    paddingVertical: 64,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bg,
  },
  heroContainer: {
    maxWidth: 1080,
    width: "100%",
    alignSelf: "center",
  },
  techTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  techTagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.accent,
  },
  techTagText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.accent,
  },
  heroTitle: {
    fontSize: 48,
    lineHeight: 54,
    letterSpacing: -1.2,
    color: theme.text,
    marginBottom: 20,
  },
  heroTitleMobile: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
    color: theme.text,
    marginBottom: 16,
  },
  heroLead: {
    fontFamily: theme.font.sans,
    fontSize: 18,
    lineHeight: 28,
    color: theme.mutedLight,
    maxWidth: 820,
    marginBottom: 32,
  },
  heroCtaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 48,
  },
  ctaPrimary: {
    paddingHorizontal: 24,
  },

  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderColor: theme.border,
    paddingTop: 32,
    rowGap: 16,
  },
  metricCol: {
    flex: 1,
    minWidth: 140,
    gap: 4,
  },
  metricVal: {
    fontFamily: theme.font.sansBlack,
    fontSize: 32,
    color: theme.text,
  },
  metricLab: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    color: theme.muted,
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.border,
    alignSelf: "center",
    marginHorizontal: 16,
  },

  specimenSection: {
    paddingVertical: 64,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bgAlt,
  },
  sectionHeader: {
    maxWidth: 1080,
    width: "100%",
    alignSelf: "center",
    marginBottom: 32,
  },
  sectionEyebrow: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.accent,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
    color: theme.text,
    marginBottom: 12,
  },
  sectionLead: {
    fontFamily: theme.font.sans,
    fontSize: 16,
    lineHeight: 24,
    color: theme.mutedLight,
    maxWidth: 780,
  },

  specimenTabs: {
    maxWidth: 1080,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  specimenTabBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    gap: 2,
  },
  specimenTabBtnActive: {
    borderColor: theme.accent,
    backgroundColor: theme.surface2,
  },
  specimenTabId: {
    fontFamily: theme.font.mono,
    fontSize: 9.5,
    letterSpacing: 1.2,
    color: theme.muted,
  },
  specimenTabTitle: {
    fontFamily: theme.font.sansBold,
    fontSize: 13,
    color: theme.mutedLight,
  },

  specimenDisplay: {
    maxWidth: 1080,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    overflow: "hidden",
    backgroundColor: theme.surface,
  },
  specimenOutlineCol: {
    padding: 24,
    borderRightWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  outlineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  outlineHeaderTitle: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: theme.muted,
  },
  outlineBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderRadius: 2,
  },
  outlineBadgeText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  sectionList: {
    gap: 16,
  },
  sectionListItem: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  sectionListNum: {
    fontFamily: theme.font.monoMedium,
    fontSize: 12,
    color: theme.accent,
    marginTop: 1,
  },
  sectionListName: {
    fontFamily: theme.font.sansBold,
    fontSize: 13.5,
    color: theme.text,
  },
  sectionListDetail: {
    fontFamily: theme.font.sans,
    fontSize: 12,
    lineHeight: 16,
    color: theme.muted,
    marginTop: 2,
  },

  specimenRenderCol: {
    backgroundColor: theme.surface2,
  },
  renderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  renderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.ok,
  },
  renderTitle: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: theme.muted,
  },
  renderBody: {
    padding: 24,
  },
  renderDocTitle: {
    fontFamily: theme.font.sansBlack,
    fontSize: 20,
    color: theme.text,
    marginBottom: 16,
  },
  renderMetaGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  renderMetaItem: {
    gap: 2,
  },
  renderMetaKey: {
    fontFamily: theme.font.mono,
    fontSize: 9,
    letterSpacing: 1,
    color: theme.muted,
  },
  renderMetaVal: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    color: theme.text,
  },
  renderDivider: {
    height: 1,
    backgroundColor: theme.border,
    marginBottom: 16,
  },
  renderContent: {
    fontFamily: theme.font.mono,
    fontSize: 11.5,
    lineHeight: 20,
    color: theme.mutedLight,
  },

  manifestoSection: {
    paddingVertical: 80,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bg,
  },
  manifestoContainer: {
    maxWidth: 960,
    width: "100%",
    alignSelf: "center",
  },
  manifestoEyebrow: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 2.5,
    color: theme.muted,
    marginBottom: 20,
  },
  manifestoLead: {
    fontFamily: theme.font.sansBlack,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.8,
    color: theme.text,
    marginBottom: 4,
  },
  manifestoSub: {
    fontFamily: theme.font.sans,
    fontSize: 16,
    lineHeight: 25,
    color: theme.muted,
    marginTop: 24,
    maxWidth: 720,
  },

  catalogSection: {
    paddingVertical: 64,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bgAlt,
  },
  catalogGrid: {
    maxWidth: 1080,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 24,
    columnGap: 24,
  },
  disciplineBlock: {
    flex: 1,
    minWidth: 300,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 18,
  },
  disciplineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: theme.border,
    marginBottom: 12,
  },
  disciplineIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  disciplineName: {
    fontFamily: theme.font.sansBold,
    fontSize: 13,
    color: theme.text,
    flex: 1,
  },
  disciplineCount: {
    fontFamily: theme.font.mono,
    fontSize: 9.5,
    letterSpacing: 1,
    color: theme.muted,
  },
  specList: {
    gap: 8,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  specTitle: {
    fontFamily: theme.font.sans,
    fontSize: 12.5,
    color: theme.mutedLight,
    flex: 1,
  },
  specSectionsCount: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    color: theme.muted,
    marginLeft: 8,
  },

  finalSection: {
    paddingVertical: 72,
    paddingHorizontal: 20,
    backgroundColor: theme.bg,
    alignItems: "center",
  },
  finalContainer: {
    maxWidth: 720,
    width: "100%",
    alignItems: "center",
    textAlign: "center",
  },
  finalEyebrow: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.accent,
    marginBottom: 12,
  },
  finalTitle: {
    fontSize: 34,
    lineHeight: 40,
    color: theme.text,
    textAlign: "center",
    marginBottom: 14,
  },
  finalLead: {
    fontFamily: theme.font.sans,
    fontSize: 16,
    color: theme.mutedLight,
    textAlign: "center",
    marginBottom: 28,
  },
  finalBtnRow: {
    flexDirection: "row",
    gap: 12,
  },

  footer: {
    borderTopWidth: 1,
    borderColor: theme.border,
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: theme.surface,
  },
  footerInner: {
    maxWidth: 1080,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontFamily: theme.font.mono,
    fontSize: 11,
    color: theme.muted,
  },
});
