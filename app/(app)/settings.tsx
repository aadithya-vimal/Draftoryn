import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useAppUser } from "../../src/auth/clerk";
import {
  Button,
  Card,
  Heading,
  SectionLabel,
  theme,
} from "../../src/ui/primitives";
import { Badge, Dialog, Icon, SegmentedControl } from "../../src/ui/components";
import {
  getUserSettings,
  saveUserSettings,
  type ClientProfile,
  type TesterProfile,
  type UserExportFormat,
  type UserSettings,
} from "../../src/lib/userSettings";
import {
  validateEmail,
  validatePhone,
} from "../../src/engine/validation";

type ExportOption = "pdf" | "docx" | "markdown" | "html" | "json";

export default function Settings() {
  const { name, email, isLoaded, isSignedIn, signOut } = useAppUser();

  const [loading, setLoading] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [manageOpen, setManageOpen] = useState<boolean>(false);

  const [exportFormat, setExportFormat] = useState<ExportOption>("pdf");
  const [compactLists, setCompactLists] = useState<boolean>(false);

  const [testerProfile, setTesterProfile] = useState<TesterProfile>({
    providerName: "",
    providerContactName: "",
    providerContactEmail: "",
    providerDepartment: "",
    providerPhone: "",
  });

  const [clientProfile, setClientProfile] = useState<ClientProfile>({
    clientName: "",
    clientContactName: "",
    clientContactEmail: "",
    clientDepartment: "",
    clientPhone: "",
    authorizedBy: "",
  });

  // Load persisted settings
  useEffect(() => {
    let mounted = true;
    getUserSettings().then((s) => {
      if (!mounted) return;
      setExportFormat((s.defaultExportFormat as ExportOption) || "pdf");
      setCompactLists(Boolean(s.compactLists));
      setTesterProfile(s.testerProfile);
      setClientProfile(s.clientProfile);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleExportFormatChange = async (format: ExportOption) => {
    setExportFormat(format);
    await saveUserSettings({ defaultExportFormat: format as UserExportFormat });
    showSavedFeedback();
  };

  const handleCompactToggle = async () => {
    const next = !compactLists;
    setCompactLists(next);
    await saveUserSettings({ compactLists: next });
    showSavedFeedback();
  };

  const handleSaveProfiles = async () => {
    setSaveStatus("saving");
    await saveUserSettings({
      defaultExportFormat: exportFormat as UserExportFormat,
      compactLists,
      testerProfile,
      clientProfile,
    });
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2500);
  };

  const showSavedFeedback = () => {
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2500);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  const displayName = name ?? "Draftoryn user";
  const displayEmail = email ?? "No email on file";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      <View style={styles.headerRow}>
        <Heading level={2} style={styles.title}>
          Settings
        </Heading>
        {saveStatus === "saving" ? (
          <View style={styles.saveBadge}>
            <ActivityIndicator size="small" color={theme.accent} />
            <Text style={styles.saveBadgeText}>Saving…</Text>
          </View>
        ) : saveStatus === "saved" ? (
          <View style={[styles.saveBadge, styles.saveBadgeSuccess]}>
            <Icon name="Check" size={14} color={theme.ok} />
            <Text style={[styles.saveBadgeText, { color: theme.ok }]}>Saved to device</Text>
          </View>
        ) : null}
      </View>

      {!isLoaded || loading ? (
        <Card>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={theme.accent} />
            <Text style={styles.muted}>Loading your preferences and profile data…</Text>
          </View>
        </Card>
      ) : !isSignedIn ? (
        <Card>
          <Text style={styles.muted}>You are not signed in.</Text>
          <Button
            label="Sign in"
            variant="secondary"
            onPress={() => router.replace("/(auth)/login")}
          />
        </Card>
      ) : (
        <>
          {/* Account */}
          <SectionLabel>Account</SectionLabel>
          <Card>
            <View style={styles.accountRow}>
              <View style={styles.avatar}>
                <Icon name="User" size={26} color={theme.accent} strokeWidth={1.5} />
              </View>
              <View style={styles.accountMeta}>
                <Text style={styles.accountName}>{displayName}</Text>
                <Text style={styles.accountEmail}>{displayEmail}</Text>
              </View>
            </View>
            <Button
              label="Manage account"
              variant="secondary"
              onPress={() => setManageOpen(true)}
              style={styles.actionButton}
            />
          </Card>

          {/* Export & Document Preferences */}
          <SectionLabel>Export Preferences</SectionLabel>
          <Card>
            <View style={styles.prefRow}>
              <View style={styles.prefText}>
                <Text style={styles.prefLabel}>Default export format</Text>
                <Text style={styles.prefHint}>
                  Selected by default when exporting documents or downloading drafts.
                </Text>
              </View>
            </View>
            <SegmentedControl<ExportOption>
              options={[
                { value: "pdf", label: "PDF" },
                { value: "docx", label: "DOCX" },
                { value: "markdown", label: "Markdown" },
                { value: "html", label: "HTML" },
                { value: "json", label: "JSON" },
              ]}
              value={exportFormat}
              onChange={handleExportFormatChange}
            />
            <Pressable
              style={({ pressed }) => [
                styles.toggleRow,
                pressed && styles.togglePressed,
              ]}
              onPress={handleCompactToggle}
            >
              <View style={styles.prefText}>
                <Text style={styles.prefLabel}>Compact lists</Text>
                <Text style={styles.prefHint}>
                  Use tighter spacing in document and draft lists.
                </Text>
              </View>
              <View style={[styles.switch, compactLists && styles.switchOn]}>
                <View style={[styles.knob, compactLists && styles.knobOn]} />
              </View>
            </Pressable>
          </Card>

          {/* Cybersecurity Tester / Provider Profile */}
          <SectionLabel>Cybersecurity Tester / Provider Profile</SectionLabel>
          <Card>
            <Text style={styles.profileIntro}>
              Configure your testing organization and assessor contact details to automatically autofill agreements, statements of work, and assessment reports in one touch.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Testing Firm / Organization Name</Text>
              <TextInput
                style={styles.textInput}
                value={testerProfile.providerName}
                onChangeText={(v) => setTesterProfile((p) => ({ ...p, providerName: v }))}
                placeholder="e.g., Draftoryn Security Consulting Inc."
                placeholderTextColor={theme.muted}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Lead Assessor / Tester Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={testerProfile.providerContactName}
                  onChangeText={(v) => setTesterProfile((p) => ({ ...p, providerContactName: v }))}
                  placeholder="e.g., Alex Mercer"
                  placeholderTextColor={theme.muted}
                />
              </View>
              <View style={styles.inputCol}>
                <View style={styles.labelWithValidation}>
                  <Text style={styles.inputLabel}>Tester Email Address</Text>
                  {testerProfile.providerContactEmail && !validateEmail(testerProfile.providerContactEmail) ? (
                    <Text style={styles.fieldError}>Invalid email</Text>
                  ) : null}
                </View>
                <TextInput
                  style={[
                    styles.textInput,
                    testerProfile.providerContactEmail && !validateEmail(testerProfile.providerContactEmail)
                      ? styles.inputErrorBorder
                      : null,
                  ]}
                  value={testerProfile.providerContactEmail}
                  onChangeText={(v) => setTesterProfile((p) => ({ ...p, providerContactEmail: v }))}
                  placeholder="alex@draftoryn.io"
                  placeholderTextColor={theme.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Department / Practice Unit</Text>
                <TextInput
                  style={styles.textInput}
                  value={testerProfile.providerDepartment}
                  onChangeText={(v) => setTesterProfile((p) => ({ ...p, providerDepartment: v }))}
                  placeholder="e.g., Red Team & Offensive Operations"
                  placeholderTextColor={theme.muted}
                />
              </View>
              <View style={styles.inputCol}>
                <View style={styles.labelWithValidation}>
                  <Text style={styles.inputLabel}>Direct / Emergency Phone</Text>
                  {testerProfile.providerPhone && !validatePhone(testerProfile.providerPhone) ? (
                    <Text style={styles.fieldError}>Invalid phone</Text>
                  ) : null}
                </View>
                <TextInput
                  style={[
                    styles.textInput,
                    testerProfile.providerPhone && !validatePhone(testerProfile.providerPhone)
                      ? styles.inputErrorBorder
                      : null,
                  ]}
                  value={testerProfile.providerPhone ?? ""}
                  onChangeText={(v) => setTesterProfile((p) => ({ ...p, providerPhone: v }))}
                  placeholder="+1 (555) 019-2834"
                  placeholderTextColor={theme.muted}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </Card>

          {/* Client / Organization Profile */}
          <SectionLabel>Client / Target Organization Profile</SectionLabel>
          <Card>
            <Text style={styles.profileIntro}>
              Store your default client organization or sponsor information for quick one-click autofilling.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Client Legal Entity Name</Text>
              <TextInput
                style={styles.textInput}
                value={clientProfile.clientName}
                onChangeText={(v) => setClientProfile((p) => ({ ...p, clientName: v }))}
                placeholder="e.g., Acme Technologies Corp."
                placeholderTextColor={theme.muted}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Client Primary Contact Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={clientProfile.clientContactName}
                  onChangeText={(v) => setClientProfile((p) => ({ ...p, clientContactName: v }))}
                  placeholder="e.g., Jane Doe"
                  placeholderTextColor={theme.muted}
                />
              </View>
              <View style={styles.inputCol}>
                <View style={styles.labelWithValidation}>
                  <Text style={styles.inputLabel}>Client Contact Email</Text>
                  {clientProfile.clientContactEmail && !validateEmail(clientProfile.clientContactEmail) ? (
                    <Text style={styles.fieldError}>Invalid email</Text>
                  ) : null}
                </View>
                <TextInput
                  style={[
                    styles.textInput,
                    clientProfile.clientContactEmail && !validateEmail(clientProfile.clientContactEmail)
                      ? styles.inputErrorBorder
                      : null,
                  ]}
                  value={clientProfile.clientContactEmail}
                  onChangeText={(v) => setClientProfile((p) => ({ ...p, clientContactEmail: v }))}
                  placeholder="jane.doe@acme.com"
                  placeholderTextColor={theme.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Department / Business Unit</Text>
                <TextInput
                  style={styles.textInput}
                  value={clientProfile.clientDepartment}
                  onChangeText={(v) => setClientProfile((p) => ({ ...p, clientDepartment: v }))}
                  placeholder="e.g., Information Security / Infrastructure"
                  placeholderTextColor={theme.muted}
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Authorizing Sponsor / Signatory</Text>
                <TextInput
                  style={styles.textInput}
                  value={clientProfile.authorizedBy}
                  onChangeText={(v) => setClientProfile((p) => ({ ...p, authorizedBy: v }))}
                  placeholder="e.g., Chief Information Security Officer"
                  placeholderTextColor={theme.muted}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelWithValidation}>
                <Text style={styles.inputLabel}>Client Contact Phone</Text>
                {clientProfile.clientPhone && !validatePhone(clientProfile.clientPhone) ? (
                  <Text style={styles.fieldError}>Invalid phone</Text>
                ) : null}
              </View>
              <TextInput
                style={[
                  styles.textInput,
                  clientProfile.clientPhone && !validatePhone(clientProfile.clientPhone)
                    ? styles.inputErrorBorder
                    : null,
                ]}
                value={clientProfile.clientPhone ?? ""}
                onChangeText={(v) => setClientProfile((p) => ({ ...p, clientPhone: v }))}
                placeholder="+1 (555) 839-1029"
                placeholderTextColor={theme.muted}
                keyboardType="phone-pad"
              />
            </View>
          </Card>

          {/* Save Button Bar */}
          <View style={styles.saveButtonBar}>
            <Button
              label={saveStatus === "saving" ? "Saving profiles…" : "Save Profiles & Preferences"}
              variant="primary"
              onPress={handleSaveProfiles}
              disabled={saveStatus === "saving"}
              style={styles.saveButtonFull}
            />
          </View>

          {/* About */}
          <SectionLabel>About</SectionLabel>
          <Card>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutName}>Draftoryn</Text>
              <Text style={styles.aboutVersion}>Version 2.0.0</Text>
            </View>
            <Text style={styles.bodyText}>
              A specialist cybersecurity writing and generation studio turning briefs and requirements into polished, export-ready governance and testing documents.
            </Text>
          </Card>

          {/* Authentication */}
          <SectionLabel>Authentication</SectionLabel>
          <Card>
            <Text style={styles.bodyText}>
              You are signed in to Draftoryn. Signing out ends your session on this device.
            </Text>
            <Button
              label="Sign out"
              variant="danger"
              onPress={handleSignOut}
              style={styles.actionButton}
            />
          </Card>
        </>
      )}

      <Dialog
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        title="Account managed by Clerk"
      >
        <Text style={styles.bodyText}>
          Your Draftoryn account is handled securely by Clerk, including your
          sign-in, email, and password. Account settings can be managed from
          the Clerk account area.
        </Text>
        <Button
          label="Close"
          variant="secondary"
          onPress={() => setManageOpen(false)}
          style={styles.actionButton}
        />
      </Dialog>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  body: {
    padding: 20,
    paddingTop: 32,
    paddingBottom: 64,
    width: "100%",
    maxWidth: 780,
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    marginBottom: 0,
  },
  saveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: theme.surface2,
    borderRadius: theme.radiusSm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  saveBadgeSuccess: {
    backgroundColor: "#F4FBF4",
    borderColor: "#C6F0C6",
  },
  saveBadgeText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 12,
    color: theme.accent,
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  muted: {
    fontFamily: theme.font.sans,
    color: theme.muted,
    fontSize: 15,
  },
  bodyText: {
    fontFamily: theme.font.sans,
    color: theme.text,
    fontSize: 15,
    lineHeight: 22,
  },
  profileIntro: {
    fontFamily: theme.font.sans,
    color: theme.muted,
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 16,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  accountMeta: {
    flex: 1,
  },
  accountName: {
    fontFamily: theme.font.serifSemi,
    color: theme.text,
    fontSize: 20,
    marginBottom: 2,
  },
  accountEmail: {
    fontFamily: theme.font.mono,
    color: theme.muted,
    fontSize: 13,
  },
  actionButton: {
    marginTop: 16,
  },
  prefRow: {
    marginBottom: 14,
  },
  prefText: {
    flex: 1,
  },
  prefLabel: {
    fontFamily: theme.font.sansMedium,
    color: theme.text,
    fontSize: 15,
    marginBottom: 2,
  },
  prefHint: {
    fontFamily: theme.font.sans,
    color: theme.muted,
    fontSize: 13,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: theme.border,
  },
  togglePressed: {
    opacity: 0.7,
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 2,
    justifyContent: "center",
  },
  switchOn: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  knob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.surface,
    ...theme.shadowSm,
  },
  knobOn: {
    alignSelf: "flex-end",
    backgroundColor: theme.accentForeground,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  inputCol: {
    flex: 1,
  },
  labelWithValidation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputLabel: {
    fontFamily: theme.font.sansMedium,
    fontSize: 13,
    color: theme.text,
    marginBottom: 6,
  },
  fieldError: {
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    color: theme.danger,
    marginBottom: 4,
  },
  textInput: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.text,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    paddingVertical: 9,
    paddingHorizontal: 12,
    outlineStyle: "none",
  } as any,
  inputErrorBorder: {
    borderColor: theme.danger,
  },
  saveButtonBar: {
    marginTop: 20,
    marginBottom: 8,
  },
  saveButtonFull: {
    width: "100%",
  },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  aboutName: {
    fontFamily: theme.font.serifSemi,
    fontSize: 16,
    color: theme.text,
  },
  aboutVersion: {
    fontFamily: theme.font.monoMedium,
    fontSize: 12,
    color: theme.muted,
  },
});
