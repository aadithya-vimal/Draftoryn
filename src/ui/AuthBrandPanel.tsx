import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { theme } from "./primitives";
import { Icon } from "./components";

export function AuthBrandPanel({ isSignUp = false }: { isSignUp?: boolean }) {
  return (
    <View style={styles.panel}>
      {/* Top Header & Logo */}
      <View style={styles.topSection}>
        <View style={styles.logoRow}>
          <View style={styles.brandTitleRow}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.logoIcon}
              resizeMode="contain"
            />
            <Text style={styles.brandTitleText}>DRAFTORYN</Text>
          </View>
        </View>

        <View style={styles.statementWrap}>
          <Text style={styles.kicker}>TECHNICAL SPECIFICATION PLATFORM</Text>
          <Text style={styles.heading}>
            {isSignUp
              ? "Create your workspace"
              : "Software engineering and technical documentation"}
          </Text>
          <Text style={styles.subtext}>
            Draftoryn standardizes software engineering and technical documentation. Author system architectures, API contracts, incident playbooks, security models, and engineering RFCs with schema discipline.
          </Text>
        </View>
      </View>

      {/* Center Specimen Terminal */}
      <View style={styles.specimenCard}>
        <View style={styles.specimenTitlebar}>
          <View style={styles.dotRow}>
            <View style={[styles.dot, { backgroundColor: "#D94A4A" }]} />
            <View style={[styles.dot, { backgroundColor: "#D99A24" }]} />
            <View style={[styles.dot, { backgroundColor: "#31B77A" }]} />
          </View>
          <Text style={styles.specimenId}>SPEC-ENG-ARCH-001 // SPECIFICATION</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.specimenTag}>VALIDATED</Text>
        </View>

        <View style={styles.specimenBody}>
          <View style={styles.termLine}>
            <Text style={styles.termPrompt}>$</Text>
            <Text style={styles.termCmd}>draftoryn validate --spec=sys-arch-001</Text>
          </View>
          <View style={styles.termOutputRow}>
            <Text style={styles.termCheck}>[PASS]</Text>
            <Text style={styles.termLabel}>SYSTEM_SCOPE:</Text>
            <Text style={styles.termVal}>Distributed Core Services</Text>
          </View>
          <View style={styles.termOutputRow}>
            <Text style={styles.termCheck}>[PASS]</Text>
            <Text style={styles.termLabel}>API_CONTRACT:</Text>
            <Text style={styles.termVal}>Schema & Event Boundaries Validated</Text>
          </View>
          <View style={styles.termOutputRow}>
            <Text style={styles.termCheck}>[PASS]</Text>
            <Text style={styles.termLabel}>DEPENDENCIES:</Text>
            <Text style={styles.termVal}>Verified Dependency Graph</Text>
          </View>
          <View style={styles.termOutputRow}>
            <Text style={styles.termCheck}>[READY]</Text>
            <Text style={styles.termLabel}>PIPELINE:</Text>
            <Text style={styles.termVal}>PDF · DOCX · MD · JSON Ready</Text>
          </View>
        </View>
      </View>

      {/* Feature Pills */}
      <View style={styles.pillRow}>
        <View style={styles.featurePill}>
          <Icon name="Layers" size={12} color={theme.accent} />
          <Text style={styles.featurePillText}>Workspace Isolation</Text>
        </View>
        <View style={styles.featurePill}>
          <Icon name="FileText" size={12} color={theme.accent} />
          <Text style={styles.featurePillText}>Multi-format Export</Text>
        </View>
        <View style={styles.featurePill}>
          <Icon name="CheckCircle" size={12} color={theme.ok} />
          <Text style={styles.featurePillText}>Structured Schemas</Text>
        </View>
      </View>

      {/* Footer Status */}
      <View style={styles.footerRow}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>SYSTEM STATUS: OPERATIONAL</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: "44%",
    maxWidth: 540,
    backgroundColor: theme.surface,
    borderRightWidth: 1,
    borderColor: theme.border,
    padding: 44,
    justifyContent: "space-between",
  },
  topSection: {
    gap: 20,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  brandTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
  },
  brandTitleText: {
    fontFamily: theme.font.sansBlack,
    fontSize: 20,
    letterSpacing: 1.5,
    color: theme.text,
  },
  statementWrap: {
    gap: 10,
  },
  kicker: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: theme.accent,
    textTransform: "uppercase",
  },
  heading: {
    fontFamily: theme.font.sansBold,
    fontSize: 26,
    lineHeight: 32,
    color: theme.text,
    letterSpacing: -0.5,
  },
  subtext: {
    fontFamily: theme.font.sans,
    fontSize: 13.5,
    lineHeight: 21,
    color: theme.muted,
  },
  specimenCard: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    overflow: "hidden",
    marginVertical: 18,
  },
  specimenTitlebar: {
    height: 34,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  dotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  specimenId: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: theme.textSecondary,
  },
  specimenTag: {
    fontFamily: theme.font.monoMedium,
    fontSize: 9,
    letterSpacing: 1,
    color: theme.ok,
  },
  specimenBody: {
    padding: 14,
    gap: 7,
  },
  termLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  termPrompt: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    color: theme.accent,
  },
  termCmd: {
    fontFamily: theme.font.mono,
    fontSize: 11.5,
    color: theme.text,
  },
  termOutputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 4,
  },
  termCheck: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10,
    color: theme.ok,
  },
  termLabel: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10.5,
    color: theme.muted,
  },
  termVal: {
    fontFamily: theme.font.mono,
    fontSize: 10.5,
    color: theme.textSecondary,
    flexShrink: 1,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  featurePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
  },
  featurePillText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10.5,
    color: theme.textSecondary,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: theme.border,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.ok,
  },
  statusText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10,
    letterSpacing: 1.2,
    color: theme.muted,
  },
});
