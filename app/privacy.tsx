import React from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { PublicHeader } from "../src/ui/PublicHeader";
import { Heading, theme } from "../src/ui/primitives";

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "1. Acceptance by use",
    body: "By accessing or using Draftoryn — including creating an account, drafting a document, generating content with AI, or exporting any file — you agree to this Privacy Policy and to the Terms of Use. If you do not agree, do not use Draftoryn. Continued use constitutes ongoing acceptance.",
  },
  {
    heading: "2. Data we collect",
    body: "Account and authentication data (via our identity provider, including email and session tokens); workspace data (workspaces, settings, onboarding profiles); document data you enter (titles, source fields, sections, versions, export logs); and operational data (timestamps, preferences such as theme and autosave).",
  },
  {
    heading: "3. How we use data",
    body: "To operate workspaces, persist documents and versions, render exports, remember preferences, enforce access boundaries between workspaces, and diagnose failures. We do not sell your data.",
  },
  {
    heading: "4. AI processing and your keys",
    body: "AI features run only when you request them and only on the real data you entered. If you supply your own provider API key, it stays in your settings and is used to call the provider you selected; your entered context is transmitted to that provider to produce the draft. Review provider policies before use. Draftoryn never invents operational facts on your behalf — missing values are left as placeholders.",
  },
  {
    heading: "5. Storage and security",
    body: "Documents persist in workspace-scoped relational storage with tenant isolation enforced at the API and database layers. No system can guarantee absolute security; you are responsible for safeguarding credentials, API keys, and exported files.",
  },
  {
    heading: "6. Your choices and rights",
    body: "You may review, correct, export, or delete your documents and workspaces from within the application (deleting a workspace permanently deletes its documents). Contact your workspace administrator for access, correction, or deletion requests you cannot complete yourself.",
  },
  {
    heading: "7. AI limitations reminder",
    body: "AI can make mistakes. Outputs are drafting aids only — not legal advice and not legal tender. Always review thoroughly before any official or legal use. See the Terms of Use for the full liability position.",
  },
  {
    heading: "8. Changes to this policy",
    body: "We may update this policy as the service evolves. Continued use after an update constitutes acceptance of the revised policy.",
  },
  {
    heading: "9. Contact",
    body: "Privacy questions: contact the Draftoryn operator through your workspace administrator or the support channel listed in the application.",
  },
];

export default function PrivacyPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 840;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <PublicHeader activeNav={null} />

      <View style={styles.hero}>
        <View style={styles.maxContainer}>
          <Text style={styles.eyebrow}>LEGAL // PRIVACY POLICY</Text>
          <Heading level={1} style={isMobile ? styles.h1Mobile : styles.h1}>
            Privacy Policy
          </Heading>
          <Text style={styles.heroLead}>
            By accessing or using Draftoryn you agree to this policy and to the Terms of Use.
            AI runs only on the real data you enter — review every draft before any official use.
          </Text>
          <Text style={styles.updated}>Last updated: September 2026</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.maxContainer}>
          {SECTIONS.map((s) => (
            <View key={s.heading} style={styles.section}>
              <Text style={styles.sectionHeading}>{s.heading}</Text>
              <Text style={styles.sectionBody}>{s.body}</Text>
            </View>
          ))}

          <View style={styles.crossLinks}>
            <TouchableOpacity onPress={() => router.push("/terms")}>
              <Text style={styles.crossLink}>Terms of Use →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/")}>
              <Text style={styles.crossLink}>Back to home →</Text>
            </TouchableOpacity>
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
            <TouchableOpacity onPress={() => router.push("/terms")}>
              <Text style={[styles.footerText, styles.footerLink]}>TERMS</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/privacy")}>
              <Text style={[styles.footerText, styles.footerLink]}>PRIVACY</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { paddingBottom: 0 },
  maxContainer: { maxWidth: 860, width: "100%", alignSelf: "center", paddingHorizontal: 32 },
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
    fontSize: 16,
    color: theme.textSecondary,
    lineHeight: 25,
    maxWidth: 720,
  },
  updated: {
    fontFamily: theme.font.mono,
    fontSize: 11,
    color: theme.muted,
    marginTop: 14,
  },
  content: { paddingVertical: 40 },
  section: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 20,
    marginBottom: 14,
  },
  sectionHeading: {
    fontFamily: theme.font.sansSemi,
    fontSize: 16,
    color: theme.text,
    marginBottom: 8,
  },
  sectionBody: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    lineHeight: 22,
    color: theme.textSecondary,
  },
  crossLinks: { flexDirection: "row", gap: 20, marginTop: 12, marginBottom: 8 },
  crossLink: {
    fontFamily: theme.font.sansMedium,
    fontSize: 14,
    color: theme.accent,
    textDecorationLine: "underline",
  },
  footer: {
    backgroundColor: theme.bg,
    borderTopWidth: 1,
    borderColor: theme.border,
    justifyContent: "center",
    paddingVertical: 18,
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
  footerLink: { color: theme.accent, textDecorationLine: "underline" },
});
