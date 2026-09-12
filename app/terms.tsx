import React from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { PublicHeader } from "../src/ui/PublicHeader";
import { Heading, theme } from "../src/ui/primitives";

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "1. Acceptance by use",
    body: "By accessing or using Draftoryn — including creating an account, drafting a document, generating content with AI, or exporting any file — you agree to these Terms. If you do not agree, do not use Draftoryn. Continued use constitutes ongoing acceptance of the current Terms.",
  },
  {
    heading: "2. What Draftoryn is",
    body: "Draftoryn is technical documentation software. It compiles structured document drafts from information you enter, optionally assisted by third-party AI models. Draftoryn does not provide legal, compliance, engineering, or security advice of any kind.",
  },
  {
    heading: "3. AI can make mistakes — review everything",
    body: "AI-generated content can be incomplete, outdated, or incorrect, including names, dates, scope boundaries, findings, and regulatory references. You must review every document thoroughly before using it as an official, operational, or legitimizing record. Never rely on an unreviewed draft.",
  },
  {
    heading: "4. Not legal advice. Not legal tender. No liability.",
    body: "Draftoryn outputs are drafting aids only. They are not legal advice, do not create an attorney-client relationship, and are not legal tender or an official certification of any kind. Draftoryn washes its hands of — and accepts no liability for — any reliance on, or consequences flowing from, documents you create or export. You are solely responsible for verification, professional review, approval, and use.",
  },
  {
    heading: "5. Your responsibilities",
    body: "You are responsible for: (a) the accuracy of all information you enter; (b) having the authority to test, assess, or document the systems in scope; (c) obtaining all required authorizations before acting on any document; (d) configuring your own AI provider keys; and (e) complying with all applicable laws and contracts.",
  },
  {
    heading: "6. Acceptable use",
    body: "Do not use Draftoryn to facilitate unauthorized access, wrongdoing, or the creation of misleading authorizations or findings. Do not attempt to breach, disrupt, or misuse the service, other tenants' workspaces, or the underlying infrastructure.",
  },
  {
    heading: "7. Intellectual property",
    body: "You retain rights to the content you enter and the documents you create. Draftoryn retains all rights to the software, templates, schemas, and service itself. Do not copy, resell, or misrepresent the service.",
  },
  {
    heading: "8. Availability and changes",
    body: "Draftoryn is provided on an as-available basis without warranties of any kind. We may modify, suspend, or discontinue features at any time, and may update these Terms; continued use after an update constitutes acceptance.",
  },
  {
    heading: "9. Contact",
    body: "Questions about these Terms: contact the Draftoryn operator through your workspace administrator or the support channel listed in the application.",
  },
];

export default function TermsPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 840;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <PublicHeader activeNav={null} />

      <View style={styles.hero}>
        <View style={styles.maxContainer}>
          <Text style={styles.eyebrow}>LEGAL // TERMS OF USE</Text>
          <Heading level={1} style={isMobile ? styles.h1Mobile : styles.h1}>
            Terms of Use
          </Heading>
          <Text style={styles.heroLead}>
            By accessing or using Draftoryn you agree to these Terms. AI can make mistakes — review
            every document thoroughly before any official or legal use. Draftoryn outputs are not
            legal advice or legal tender, and Draftoryn accepts no liability for reliance on them.
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
            <TouchableOpacity onPress={() => router.push("/privacy")}>
              <Text style={styles.crossLink}>Privacy Policy →</Text>
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
