import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button, Heading, theme } from "./primitives";
import { Icon, ProgressBar } from "./components";
import { saveOnboardingProgress, type OnboardingData } from "../data/onboarding";
import type { AppUser } from "../auth/clerk";

const ROLES = [
  { id: "offensive_security", label: "Offensive Security / Pentester", icon: "Crosshair", desc: "RoE, penetration testing scopes, red team & vulnerability reports" },
  { id: "incident_response", label: "Incident Responder / DFIR", icon: "Siren", desc: "IR playbooks, forensic reports, malware analysis & post-mortems" },
  { id: "security_architect", label: "Security Architect / Engineer", icon: "Building2", desc: "Threat models, system architectures, cloud & app assessments" },
  { id: "risk_governance", label: "Risk & Compliance / GRC", icon: "ShieldCheck", desc: "Cyber risk assessments, risk registers & third-party reviews" },
  { id: "resilience", label: "Resilience / BCP / DRP", icon: "RefreshCw", desc: "Business impact analyses, disaster recovery & continuity plans" },
];

export function OnboardingModal({
  open,
  user,
  initialData,
  onComplete,
}: {
  open: boolean;
  user: AppUser;
  initialData?: OnboardingData;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState(initialData?.role || ROLES[0]!.id);
  const [documentFocus, setDocumentFocus] = useState(initialData?.documentFocus || "Penetration Testing Agreements");
  const [orgName, setOrgName] = useState(initialData?.organizationName || "");
  const [saving, setSaving] = useState(false);

  const handleNext = async () => {
    if (step === 1) {
      setStep(2);
      await saveOnboardingProgress(user, {
        step: 2,
        role: selectedRole,
        onboardingData: { role: selectedRole },
      });
    } else if (step === 2) {
      setSaving(true);
      const data: OnboardingData = {
        role: selectedRole,
        documentFocus,
        organizationName: orgName.trim(),
      };
      await saveOnboardingProgress(user, {
        completed: true,
        step: 3,
        role: selectedRole,
        onboardingData: data,
      });
      setSaving(false);
      onComplete();
    }
  };

  return (
    <Modal visible={open} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>STEP {step} OF 2</Text>
              </View>
              <Text style={styles.progressLabel}>Workspace Setup</Text>
            </View>
            <ProgressBar value={step === 1 ? 0.5 : 1} height={4} style={{ marginTop: 8 }} />
          </View>

          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            {step === 1 ? (
              <View style={styles.stepContainer}>
                <Heading level={2} style={styles.title}>
                  What is your primary cybersecurity focus?
                </Heading>
                <Text style={styles.subtitle}>
                  Draftoryn will tailor your default templates and document schemas to your specialized domain.
                </Text>

                <View style={styles.rolesList}>
                  {ROLES.map((r) => {
                    const active = selectedRole === r.id;
                    return (
                      <Pressable
                        key={r.id}
                        style={[styles.roleItem, active && styles.roleItemActive]}
                        onPress={() => setSelectedRole(r.id)}
                      >
                        <View style={[styles.roleIconWrap, active && styles.roleIconWrapActive]}>
                          <Icon name={r.icon} size={20} color={active ? theme.accent : theme.muted} />
                        </View>
                        <View style={styles.roleTextWrap}>
                          <Text style={[styles.roleTitle, active && styles.roleTitleActive]}>{r.label}</Text>
                          <Text style={styles.roleDesc}>{r.desc}</Text>
                        </View>
                        {active ? <Icon name="Check" size={18} color={theme.accent} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.stepContainer}>
                <Heading level={2} style={styles.title}>
                  Configure your default workspace
                </Heading>
                <Text style={styles.subtitle}>
                  Set up your organization identity for automatic document header and signature generation.
                </Text>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Primary Document Priority</Text>
                  <TextInput
                    style={styles.input}
                    value={documentFocus}
                    onChangeText={setDocumentFocus}
                    placeholder="e.g. Penetration Testing Authorization Agreements"
                    placeholderTextColor={theme.muted}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Organization / Practice Name</Text>
                  <TextInput
                    style={styles.input}
                    value={orgName}
                    onChangeText={setOrgName}
                    placeholder="e.g. Cyber Operations Unit, Acme Defense Labs"
                    placeholderTextColor={theme.muted}
                  />
                </View>

                <View style={styles.callout}>
                  <Icon name="ShieldCheck" size={18} color={theme.accent} />
                  <Text style={styles.calloutText}>
                    Your workspace state and document history will persist securely in your database.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {step === 2 ? (
              <Button
                label="Back"
                variant="ghost"
                onPress={() => setStep(1)}
                disabled={saving}
                style={{ marginRight: 8 }}
              />
            ) : null}
            <Button
              label={step === 1 ? "Continue" : saving ? "Saving…" : "Finish & Launch Workspace"}
              onPress={handleNext}
              disabled={saving}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 540,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 26,
    ...theme.shadowMd,
  },
  header: { marginBottom: 18 },
  badgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10,
    letterSpacing: 1,
    color: theme.accent,
  },
  progressLabel: {
    fontFamily: theme.font.sansMedium,
    fontSize: 12,
    color: theme.muted,
  },
  contentScroll: { maxHeight: 400 },
  stepContainer: { paddingTop: 4 },
  title: { fontSize: 24, lineHeight: 30, color: theme.text, marginBottom: 8 },
  subtitle: { fontFamily: theme.font.sans, fontSize: 14, lineHeight: 20, color: theme.muted, marginBottom: 20 },
  rolesList: { gap: 10, marginBottom: 12 },
  roleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: theme.radiusSm,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
  },
  roleItemActive: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderColor: theme.accent,
  },
  roleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  roleIconWrapActive: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
  },
  roleTextWrap: { flex: 1 },
  roleTitle: { fontFamily: theme.font.sansSemi, fontSize: 14, color: theme.text, marginBottom: 2 },
  roleTitleActive: { color: theme.accent },
  roleDesc: { fontFamily: theme.font.sans, fontSize: 12, color: theme.muted, lineHeight: 16 },
  formGroup: { marginBottom: 16 },
  label: { fontFamily: theme.font.monoMedium, fontSize: 11.5, textTransform: "uppercase", letterSpacing: 1, color: theme.muted, marginBottom: 8 },
  input: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    color: theme.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: theme.font.sans,
  },
  callout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
    padding: 12,
    borderRadius: theme.radiusSm,
    marginTop: 8,
    marginBottom: 8,
  },
  calloutText: { flex: 1, fontFamily: theme.font.sans, fontSize: 12.5, color: theme.textSecondary, lineHeight: 18 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 22, paddingTop: 16, borderTopWidth: 1, borderColor: theme.border },
});
