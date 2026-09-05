import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
  useTheme,
} from "../../src/ui/primitives";
import { Badge, Dialog, Icon, SegmentedControl } from "../../src/ui/components";
import {
  getUserSettings,
  saveUserSettings,
  type ClientProfile,
  type TesterProfile,
  type ThemeMode,
  type UserExportFormat,
  type UserSettings,
} from "../../src/lib/userSettings";
import { useSessionTimeout } from "../../src/ui/SessionTimeoutProvider";
import { fetchUserMe, saveOnboardingProgress } from "../../src/data/onboarding";
import {
  validateEmail,
  validatePhone,
} from "../../src/engine/validation";
import {
  updateWorkspace,
  type WorkspaceRecord,
} from "../../src/data/workspaces";
import { useWorkspace } from "../../src/context/WorkspaceContext";

type ExportOption = "pdf" | "docx" | "markdown" | "html" | "json";

export default function Settings() {
  const user = useAppUser();
  const { name, email, isLoaded, isSignedIn, signOut } = user;

  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    createAndSelectWorkspace,
    deleteAndSelectWorkspace,
    reloadWorkspaces,
  } = useWorkspace();

  const [loading, setLoading] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [manageOpen, setManageOpen] = useState<boolean>(false);

  const [newWsName, setNewWsName] = useState<string>("");
  const [isCreatingWs, setIsCreatingWs] = useState<boolean>(false);
  const [editingWsId, setEditingWsId] = useState<string | null>(null);
  const [editingWsName, setEditingWsName] = useState<string>("");
  const [deleteWsTarget, setDeleteWsTarget] = useState<WorkspaceRecord | null>(null);
  const [isDeletingWs, setIsDeletingWs] = useState<boolean>(false);

  const { mode: currentThemeMode, setMode: setCurrentThemeMode } = useTheme();
  const { triggerTestWarning } = useSessionTimeout();
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState<number>(15);

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

  // Load persisted settings (with local fallback)
  useEffect(() => {
    let mounted = true;
    getUserSettings(user).then((s) => {
      if (!mounted) return;
      setExportFormat((s.defaultExportFormat as ExportOption) || "pdf");
      setCompactLists(Boolean(s.compactLists));
      if (s.sessionTimeoutMinutes) setSessionTimeoutMinutes(s.sessionTimeoutMinutes);
      setTesterProfile(s.testerProfile);
      setClientProfile(s.clientProfile);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [user.userId, user.isSignedIn, user.isLoaded]);

  const [wsError, setWsError] = useState<string | null>(null);

  const handleCreateNewWorkspace = async () => {
    const trimmed = newWsName.trim();
    if (!trimmed || isCreatingWs) return;
    setIsCreatingWs(true);
    setWsError(null);
    try {
      await createAndSelectWorkspace(trimmed);
      setNewWsName("");
      showSavedFeedback();
    } catch (e) {
      console.error("Failed to create workspace:", e);
      setWsError(e instanceof Error ? e.message : "Failed to create workspace.");
    } finally {
      setIsCreatingWs(false);
    }
  };

  const handleUpdateWorkspace = async (id: string) => {
    const trimmed = editingWsName.trim();
    if (!trimmed) return;
    setWsError(null);
    try {
      await updateWorkspace(user, id, { name: trimmed });
      setEditingWsId(null);
      await reloadWorkspaces();
      showSavedFeedback();
    } catch (e) {
      console.error("Failed to update workspace:", e);
      setWsError(e instanceof Error ? e.message : "Failed to update workspace name.");
    }
  };

  const handleSelectActiveWorkspace = async (w: WorkspaceRecord) => {
    try {
      await setActiveWorkspace(w);
      showSavedFeedback();
    } catch (e) {
      console.error("Failed to set active workspace:", e);
    }
  };

  const handleConfirmDeleteWorkspace = async () => {
    if (!deleteWsTarget || isDeletingWs) return;
    if (workspaces.length <= 1) return;
    setIsDeletingWs(true);
    try {
      await deleteAndSelectWorkspace(deleteWsTarget.id);
      setDeleteWsTarget(null);
      showSavedFeedback();
    } catch (e) {
      console.error("Failed to delete workspace:", e);
      setWsError(e instanceof Error ? e.message : "Failed to delete workspace.");
    } finally {
      setIsDeletingWs(false);
    }
  };

  const handleExportFormatChange = async (format: ExportOption) => {
    setExportFormat(format);
    try {
      await saveUserSettings({ defaultExportFormat: format as UserExportFormat }, user);
      showSavedFeedback();
    } catch (err) {
      console.error("Failed to save export format:", err);
    }
  };

  const handleCompactToggle = async () => {
    const next = !compactLists;
    setCompactLists(next);
    try {
      await saveUserSettings({ compactLists: next }, user);
      showSavedFeedback();
    } catch (err) {
      console.error("Failed to save compact toggle:", err);
    }
  };

  const handleThemeChange = async (newMode: ThemeMode) => {
    setCurrentThemeMode(newMode);
    try {
      await saveUserSettings({ themeMode: newMode }, user);
      showSavedFeedback();
    } catch (err) {
      console.error("Failed to save theme mode:", err);
    }
  };

  const handleTimeoutChange = async (minsStr: string) => {
    const mins = parseInt(minsStr, 10) || 15;
    setSessionTimeoutMinutes(mins);
    try {
      await saveUserSettings({ sessionTimeoutMinutes: mins }, user);
      showSavedFeedback();
    } catch (err) {
      console.error("Failed to save timeout:", err);
    }
  };

  const handleSaveProfiles = async () => {
    setSaveStatus("saving");
    try {
      if (activeWorkspace?.name) {
        await saveOnboardingProgress(user, {
          workspaceName: activeWorkspace.name,
        });
      }
      await saveUserSettings({
        defaultExportFormat: exportFormat as UserExportFormat,
        compactLists,
        themeMode: currentThemeMode,
        sessionTimeoutMinutes,
        testerProfile,
        clientProfile,
      }, user);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (err) {
      console.error("Failed to save profiles to Neon:", err);
      setSaveStatus("idle");
    }
  };

  const showSavedFeedback = () => {
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 3500);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  const displayName = name ?? "Draftoryn user";
  const displayEmail = email ?? "No email on file";

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
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
            <Text style={[styles.saveBadgeText, { color: theme.ok }]}>Saved</Text>
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

          {/* Workspaces */}
          <SectionLabel>Workspaces</SectionLabel>
          <Card>
            <View style={styles.workspaceRow}>
              <View style={styles.workspaceIconWrap}>
                <Icon name="Database" size={20} color={theme.accent} />
              </View>
              <View style={styles.workspaceMeta}>
                <Text style={styles.workspaceName}>Workspaces</Text>
                <View style={styles.neonSyncRow}>
                  <View style={styles.neonDot} />
                  <Text style={styles.neonSyncText}>Isolate documents and specifications across projects</Text>
                </View>
              </View>
            </View>

            <View style={{ marginTop: 16, gap: 10 }}>
              {workspaces.map((w) => {
                const isActive = activeWorkspace ? activeWorkspace.id === w.id : Boolean(w.isDefault);
                const isEditing = editingWsId === w.id;
                return (
                  <View key={w.id} style={[styles.wsItemCard, isActive && styles.wsItemCardActive]}>
                    {isEditing ? (
                      <View style={{ gap: 8 }}>
                        <TextInput
                          style={styles.textInput}
                          value={editingWsName}
                          onChangeText={setEditingWsName}
                          placeholder="Workspace Name"
                          placeholderTextColor={theme.muted}
                          autoFocus
                        />
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Button
                            label="Save"
                            variant="primary"
                            onPress={() => handleUpdateWorkspace(w.id)}
                            style={{ minWidth: 70 }}
                          />
                          <Button
                            label="Cancel"
                            variant="secondary"
                            onPress={() => {
                              setEditingWsId(null);
                              setWsError(null);
                            }}
                            style={{ minWidth: 70 }}
                          />
                        </View>
                        {wsError ? <Text style={styles.fieldError}>{wsError}</Text> : null}
                      </View>
                    ) : (
                      <View style={styles.wsItemContent}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={styles.wsItemTitle} numberOfLines={1}>{w.name}</Text>
                            {isActive && (
                              <View style={styles.wsActivePill}>
                                <Text style={styles.wsActivePillText}>ACTIVE</Text>
                              </View>
                            )}
                            {w.isDefault && !isActive && (
                              <View style={[styles.wsActivePill, { backgroundColor: theme.surface2 }]}>
                                <Text style={[styles.wsActivePillText, { color: theme.muted }]}>DEFAULT</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.wsItemSlug}>ID: {w.id} · slug: {w.slug}</Text>
                        </View>

                        <View style={styles.wsItemActions}>
                          {!isActive && (
                            <Button
                              label="Make Active"
                              variant="secondary"
                              onPress={() => handleSelectActiveWorkspace(w)}
                              style={styles.wsActionBtn}
                            />
                          )}
                          <Button
                            label="Rename"
                            variant="ghost"
                            onPress={() => {
                              setEditingWsId(w.id);
                              setEditingWsName(w.name);
                            }}
                            style={styles.wsActionBtn}
                          />
                          {workspaces.length > 1 && (
                            <Button
                              label="Delete"
                              variant="danger"
                              onPress={() => setDeleteWsTarget(w)}
                              style={styles.wsActionBtn}
                            />
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Create New Workspace */}
            <View style={styles.createWsBox}>
              <Text style={styles.createWsTitle}>Create Workspace</Text>
              <View style={styles.createWsRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={newWsName}
                  onChangeText={setNewWsName}
                  placeholder="New workspace name…"
                  placeholderTextColor={theme.muted}
                />
                <Button
                  label={isCreatingWs ? "Creating…" : "Create Workspace"}
                  variant="primary"
                  onPress={handleCreateNewWorkspace}
                  disabled={!newWsName.trim() || isCreatingWs}
                />
              </View>
              {wsError ? <Text style={styles.fieldError}>{wsError}</Text> : null}
            </View>
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

          {/* Appearance & Interface Theme */}
          <SectionLabel>Appearance & Interface Theme</SectionLabel>
          <Card>
            <View style={styles.prefRow}>
              <View style={styles.prefText}>
                <Text style={styles.prefLabel}>Visual Theme</Text>
                <Text style={styles.prefHint}>
                  Choose between high-contrast dark technical editorial or crisp white document drafting.
                </Text>
              </View>
            </View>
            <SegmentedControl<ThemeMode>
              options={[
                { value: "dark", label: "Dark Mode", icon: "Moon" },
                { value: "light", label: "Light Mode", icon: "Sun" },
              ]}
              value={currentThemeMode}
              onChange={handleThemeChange}
            />
          </Card>

          {/* Security & Session Inactivity Timeout */}
          <SectionLabel>Security & Session Inactivity Timeout</SectionLabel>
          <Card>
            <View style={styles.prefRow}>
              <View style={styles.prefText}>
                <Text style={styles.prefLabel}>Idle Session Timeout</Text>
                <Text style={styles.prefHint}>
                  To protect confidential penetration testing agreements and security findings, sessions automatically lock after inactivity.
                </Text>
              </View>
            </View>
            <SegmentedControl<string>
              options={[
                { value: "15", label: "15 min (Standard)" },
                { value: "30", label: "30 min" },
                { value: "60", label: "60 min" },
              ]}
              value={String(sessionTimeoutMinutes)}
              onChange={handleTimeoutChange}
            />
            <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderColor: theme.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontFamily: theme.font.sansSemi, fontSize: 13, color: theme.text }}>Preview Warning Popup</Text>
                <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.muted }}>Test the "Extend Session" warning dialog and countdown.</Text>
              </View>
              <Button
                label="Test Warning"
                variant="secondary"
                onPress={triggerTestWarning}
              />
            </View>
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
              label={
                saveStatus === "saving"
                  ? "Saving profiles & preferences…"
                  : saveStatus === "saved"
                  ? "✓ Saved to Database!"
                  : "Save Profiles & Preferences"
              }
              variant={saveStatus === "saved" ? "secondary" : "primary"}
              onPress={handleSaveProfiles}
              disabled={saveStatus === "saving"}
              style={(saveStatus === "saved" ? [styles.saveButtonFull, styles.saveButtonSaved] : styles.saveButtonFull) as any}
            />
            {saveStatus === "saved" && (
              <View style={styles.saveInlineConfirmation}>
                <Icon name="Check" size={14} color={theme.ok} />
                <Text style={styles.saveInlineConfirmationText}>All configuration parameters saved to your workspace.</Text>
              </View>
            )}
          </View>

          {/* About */}
          <SectionLabel>About</SectionLabel>
          <Card>
            <View style={styles.aboutRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Image
                  source={require("../../assets/icon.png")}
                  style={{ width: 24, height: 24, borderRadius: 5 }}
                  resizeMode="contain"
                />
                <Text style={styles.aboutName}>Draftoryn</Text>
              </View>
            </View>
            <Text style={styles.bodyText}>
              Professional technical editorial software for cybersecurity authorizations, assessment reports, threat models, and architectural specifications.
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
        title="Account Management"
      >
        <Text style={styles.bodyText}>
          Your Draftoryn account is handled securely, including your
          sign-in, email, and password. Multi-factor authentication and credentials
          are encrypted with security standards.
        </Text>
        <Button
          label="Close"
          variant="secondary"
          onPress={() => setManageOpen(false)}
          style={styles.actionButton}
        />
      </Dialog>

      {/* Delete Workspace Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteWsTarget)}
        onClose={() => setDeleteWsTarget(null)}
        title="Delete Workspace"
      >
        <View style={{ gap: 16 }}>
          <Text style={{ fontFamily: theme.font.sans, fontSize: 14, color: theme.text, lineHeight: 22 }}>
            Are you sure you want to delete workspace{" "}
            <Text style={{ fontFamily: theme.font.sansBold, color: theme.text }}>
              "{deleteWsTarget?.name}"
            </Text>
            ? This will permanently delete the workspace and all documents associated with it. This action cannot be undone.
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <Button
              label="Cancel"
              variant="secondary"
              onPress={() => setDeleteWsTarget(null)}
            />
            <Button
              label={isDeletingWs ? "Deleting…" : "Delete Workspace"}
              variant="danger"
              onPress={handleConfirmDeleteWorkspace}
              disabled={isDeletingWs}
            />
          </View>
        </View>
      </Dialog>
    </ScrollView>

    {/* Floating unmissable toast confirmation */}
    {saveStatus === "saved" && (
      <View style={styles.floatingSavedToast}>
        <View style={styles.floatingSavedDot} />
        <Icon name="Check" size={16} color={theme.ok} />
        <Text style={styles.floatingSavedText}>Settings and profiles saved successfully.</Text>
      </View>
    )}
  </View>
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
    backgroundColor: theme.okBg,
    borderColor: "rgba(16, 185, 129, 0.35)",
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
  workspaceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  workspaceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  workspaceMeta: {
    flex: 1,
  },
  workspaceName: {
    fontFamily: theme.font.serifSemi,
    fontSize: 17,
    color: theme.text,
    marginBottom: 4,
  },
  neonSyncRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  neonDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.ok,
  },
  neonSyncText: {
    fontFamily: theme.font.mono,
    fontSize: 11,
    color: theme.muted,
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
  wsItemCard: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    padding: 12,
  },
  wsItemCardActive: {
    borderColor: theme.accent,
    backgroundColor: theme.surfaceHover,
  },
  wsItemContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  wsItemTitle: {
    fontFamily: theme.font.sansSemi,
    fontSize: 14,
    color: theme.text,
  },
  wsActivePill: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: "rgba(47, 107, 255, 0.12)",
    borderRadius: 2,
  },
  wsActivePillText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 9,
    color: theme.accent,
    letterSpacing: 0.8,
  },
  wsItemSlug: {
    fontFamily: theme.font.mono,
    fontSize: 11,
    color: theme.muted,
    marginTop: 3,
  },
  wsItemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  wsActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  createWsBox: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: theme.border,
  },
  createWsTitle: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10,
    letterSpacing: 1,
    color: theme.muted,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  createWsRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  floatingSavedToast: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.surface,
    borderColor: theme.ok,
    borderWidth: 1.5,
    borderRadius: theme.radiusSm,
    paddingVertical: 12,
    paddingHorizontal: 20,
    ...theme.shadowMd,
    zIndex: 9999,
  },
  floatingSavedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.ok,
  },
  floatingSavedText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 14,
    color: theme.text,
  },
  saveButtonSaved: {
    borderColor: theme.ok,
  },
  saveInlineConfirmation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    alignSelf: "center",
  },
  saveInlineConfirmationText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 13,
    color: theme.ok,
  },
});
