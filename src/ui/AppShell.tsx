import React, { useEffect, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useAppUser } from "../auth/clerk";
import { Dialog, Icon } from "./components";
import { Button, theme, useTheme } from "./primitives";
import { useWorkspace } from "../context/WorkspaceContext";
import type { WorkspaceRecord } from "../data/workspaces";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { href: "/(app)/home", label: "Home", icon: "Home" },
  { href: "/(app)/discover", label: "Catalog", icon: "Compass" },
  { href: "/(app)/library", label: "Library", icon: "Folder" },
  { href: "/(app)/settings", label: "Settings", icon: "Settings" },
];

function normalizePath(p: string): string {
  if (!p) return "";
  const stripped = p.replace(/\/\([^)]+\)/g, "").replace(/\/+$/, "");
  return stripped === "" ? "/" : stripped;
}

function isNavActive(current: string, target: string): boolean {
  const cur = normalizePath(current);
  const tgt = normalizePath(target);
  if (cur === tgt) return true;
  if (tgt !== "/" && cur.startsWith(tgt + "/")) return true;
  return false;
}

function Brand() {
  return (
    <View style={styles.brand}>
      <Image
        source={require("../../assets/icon.png")}
        style={styles.brandMarkImg}
        resizeMode="contain"
      />
      <View>
        <Text style={styles.brandText}>DRAFTORYN</Text>
        <Text style={styles.brandSub}>SPECIFICATION SYSTEM</Text>
      </View>
    </View>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const user = useAppUser();
  const { name, email, signOut, isSignedIn, userId } = user;
  const { width } = useWindowDimensions();
  const isMobile = width < 840;
  const { isDark, toggleTheme } = useTheme();

  const {
    workspaces,
    activeWorkspace: activeWs,
    setActiveWorkspace,
    createAndSelectWorkspace,
  } = useWorkspace();
  const [wsModalOpen, setWsModalOpen] = useState<boolean>(false);
  const [newWsName, setNewWsName] = useState<string>("");
  const [creatingWs, setCreatingWs] = useState<boolean>(false);

  const handleSelectWorkspace = async (ws: WorkspaceRecord) => {
    try {
      await setActiveWorkspace(ws);
      setWsModalOpen(false);
    } catch (e) {
      console.error("Failed to select workspace", e);
    }
  };

  const handleCreateWorkspace = async () => {
    const trimmed = newWsName.trim();
    if (!trimmed || creatingWs) return;
    setCreatingWs(true);
    try {
      await createAndSelectWorkspace(trimmed);
      setNewWsName("");
      setWsModalOpen(false);
    } catch (e) {
      console.error("Failed to create workspace", e);
    } finally {
      setCreatingWs(false);
    }
  };

  const activeNav: NavItem = NAV.find((n) => isNavActive(pathname, n.href)) ?? NAV[0]!;
  const isSettingsActive = isNavActive(pathname, "/(app)/settings");

  const rail = (
    <View style={styles.railInner}>
      <View>
        <Pressable onPress={() => router.push("/(app)/home")} accessibilityRole="button" accessibilityLabel="Draftoryn Home">
          <Brand />
        </Pressable>

        {/* Workspace Context Indicator & Switcher */}
        <Pressable
          style={({ pressed }) => [styles.workspaceCard, pressed && styles.workspaceCardPressed]}
          onPress={() => setWsModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Switch Workspace"
        >
          <View style={styles.workspaceDot} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.workspaceLabel}>WORKSPACE</Text>
            <Text style={styles.workspaceName} numberOfLines={1}>
              {activeWs?.name || "Primary Workspace"}
            </Text>
          </View>
          <Icon name="ChevronDown" size={13} color={theme.muted} />
        </Pressable>

        {/* Navigation links */}
        <View style={styles.railNav}>
          <Text style={styles.navGroupLabel}>NAVIGATION</Text>
          {NAV.map((n) => {
            const active = isNavActive(pathname, n.href);
            return (
              <Pressable
                key={n.href}
                style={[styles.railItem, active && styles.railItemActive]}
                onPress={() => router.push(n.href)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                {active && <View style={styles.railActiveIndicator} />}
                <Icon
                  name={n.icon}
                  size={16}
                  color={active ? theme.accent : theme.muted}
                  strokeWidth={active ? 2.2 : 1.7}
                />
                <Text style={[styles.railLabel, active && styles.railLabelActive]}>
                  {n.label}
                </Text>
                {active && <View style={styles.activeDot} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* User block at bottom */}
      <View style={styles.railUser}>
        <View style={styles.avatar}>
          <Icon name="User" size={14} color={theme.mutedLight} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.userName} numberOfLines={1}>{name ?? "Operator"}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{email ?? "user@draftoryn.io"}</Text>
        </View>
        <Pressable
          onPress={toggleTheme}
          hitSlop={8}
          accessibilityLabel={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          style={styles.themeToggleBtn}
        >
          <Icon name={isDark ? "Sun" : "Moon"} size={14} color={theme.muted} />
        </Pressable>
        <Pressable onPress={() => signOut()} hitSlop={8} accessibilityLabel="Sign out" style={styles.logoutBtn}>
          <Icon name="LogOut" size={15} color={theme.muted} />
        </Pressable>
      </View>
    </View>
  );

  const bottomTabs = (
    <View style={styles.bottomBar}>
      {NAV.map((n) => {
        const active = isNavActive(pathname, n.href);
        return (
          <Pressable
            key={n.href}
            style={[styles.bottomItem, active && styles.bottomItemActive]}
            onPress={() => router.push(n.href)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            {active && <View style={styles.bottomActiveBar} />}
            <View style={[styles.bottomIconWrap, active && styles.bottomIconWrapActive]}>
              <Icon
                name={n.icon}
                size={19}
                color={active ? theme.accent : theme.muted}
                strokeWidth={active ? 2.4 : 1.8}
              />
            </View>
            <Text style={[styles.bottomLabel, active && styles.bottomLabelActive]}>
              {n.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const mobileTopHeader = (
    <View style={styles.mobileHeader}>
      <Pressable onPress={() => router.push("/(app)/home")}>
        <Brand />
      </Pressable>
      <Pressable
        onPress={() => setWsModalOpen(true)}
        style={styles.mobileWsButton}
        accessibilityRole="button"
        accessibilityLabel="Switch Workspace"
      >
        <View style={styles.workspaceDot} />
        <Text style={styles.mobileWsText} numberOfLines={1}>
          {activeWs?.name || "Workspace"}
        </Text>
        <Icon name="ChevronDown" size={11} color={theme.muted} />
      </Pressable>
      <Pressable
        onPress={toggleTheme}
        hitSlop={8}
        accessibilityLabel={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        style={styles.mobileThemeBtn}
      >
        <Icon name={isDark ? "Sun" : "Moon"} size={15} color={theme.muted} />
      </Pressable>
      <Pressable onPress={() => router.push("/(app)/settings")} hitSlop={8}>
        <View style={[styles.avatar, isSettingsActive && styles.avatarActive]}>
          <Icon name="User" size={15} color={isSettingsActive ? theme.accent : theme.muted} />
        </View>
      </Pressable>
    </View>
  );

  const wsDialog = (
    <Dialog
      open={wsModalOpen}
      onClose={() => setWsModalOpen(false)}
      title="Workspaces"
    >
      <Text style={styles.wsModalHint}>
        Workspaces isolate specifications, documents, and project deliverables with dedicated access boundaries.
      </Text>

      <View style={styles.wsList}>
        {workspaces.map((w) => {
          const isSelected = activeWs ? activeWs.id === w.id : Boolean(w.isDefault);
          return (
            <Pressable
              key={w.id}
              style={[styles.wsRow, isSelected && styles.wsRowSelected]}
              onPress={() => handleSelectWorkspace(w)}
            >
              <View style={[styles.wsRadio, isSelected && styles.wsRadioSelected]}>
                {isSelected && <View style={styles.wsRadioInner} />}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.wsRowName, isSelected && styles.wsRowNameSelected]} numberOfLines={1}>
                  {w.name}
                </Text>
                <Text style={styles.wsRowSlug}>{isSelected ? "Active Workspace" : "Click to switch"}</Text>
              </View>
              {isSelected && (
                <View style={styles.wsActiveBadge}>
                  <Text style={styles.wsActiveBadgeText}>ACTIVE</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.wsCreateSection}>
        <Text style={styles.wsCreateLabel}>Create New Workspace</Text>
        <View style={styles.wsCreateRow}>
          <TextInput
            style={styles.wsInput}
            value={newWsName}
            onChangeText={setNewWsName}
            placeholder="e.g., Red Team Practice"
            placeholderTextColor={theme.muted}
          />
          <Button
            label={creatingWs ? "Creating…" : "Create"}
            variant="secondary"
            onPress={handleCreateWorkspace}
            disabled={!newWsName.trim() || creatingWs}
            style={{ minWidth: 84 }}
          />
        </View>
      </View>

      <View style={styles.wsFooterRow}>
        <Pressable
          onPress={() => {
            setWsModalOpen(false);
            router.push("/(app)/settings");
          }}
          style={styles.manageLink}
        >
          <Icon name="Settings" size={13} color={theme.accent} />
          <Text style={styles.manageLinkText}>Manage in Settings</Text>
        </Pressable>
        <Button
          label="Close"
          variant="ghost"
          onPress={() => setWsModalOpen(false)}
        />
      </View>
    </Dialog>
  );

  if (isMobile) {
    return (
      <View style={styles.shellMobile}>
        {mobileTopHeader}
        <View style={styles.contentMobile}>{children}</View>
        {bottomTabs}
        {wsDialog}
      </View>
    );
  }

  return (
    <View style={styles.shellWeb}>
      <View style={styles.rail}>{rail}</View>
      <View style={styles.contentWeb}>{children}</View>
      {wsDialog}
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMarkImg: { width: 28, height: 28, borderRadius: 6 },
  brandText: { fontFamily: theme.font.sansBlack, fontSize: 16, letterSpacing: 1.2, color: theme.text },
  brandSub: { fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 1.5, color: theme.muted, marginTop: 1 },
  workspaceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: theme.surface2,
    borderRadius: theme.radiusSm,
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: 18,
  },
  workspaceCardPressed: {
    backgroundColor: theme.surfaceHover,
    borderColor: theme.borderActive,
  },
  workspaceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.ok },
  workspaceLabel: { fontFamily: theme.font.mono, fontSize: 8.5, letterSpacing: 1.5, color: theme.muted, textTransform: "uppercase" },
  workspaceName: { fontFamily: theme.font.sansSemi, fontSize: 12, color: theme.text },
  mobileWsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 9,
    backgroundColor: theme.surface2,
    borderRadius: theme.radiusSm,
    borderWidth: 1,
    borderColor: theme.border,
    maxWidth: 160,
  },
  mobileWsText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 11,
    color: theme.text,
  },
  wsModalHint: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.muted,
    lineHeight: 18,
    marginBottom: 16,
  },
  wsList: {
    gap: 8,
    marginBottom: 16,
  },
  wsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
  },
  wsRowSelected: {
    borderColor: theme.accent,
    backgroundColor: theme.surfaceHover,
  },
  wsRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  wsRadioSelected: {
    borderColor: theme.accent,
  },
  wsRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.accent,
  },
  wsRowName: {
    fontFamily: theme.font.sansMedium,
    fontSize: 13,
    color: theme.text,
  },
  wsRowNameSelected: {
    fontFamily: theme.font.sansSemi,
    color: theme.text,
  },
  wsRowSlug: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    color: theme.muted,
    marginTop: 2,
  },
  wsActiveBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: "rgba(47, 107, 255, 0.12)",
    borderRadius: 2,
  },
  wsActiveBadgeText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 9,
    color: theme.accent,
    letterSpacing: 0.8,
  },
  wsCreateSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
  },
  wsCreateLabel: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10,
    color: theme.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  wsCreateRow: {
    flexDirection: "row",
    gap: 8,
  },
  wsInput: {
    flex: 1,
    height: 36,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    paddingHorizontal: 10,
    color: theme.text,
    fontFamily: theme.font.sans,
    fontSize: 13,
  },
  wsFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: theme.border,
  },
  manageLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  manageLinkText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    color: theme.accent,
    letterSpacing: 0.5,
  },
  navGroupLabel: { fontFamily: theme.font.monoMedium, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: theme.textDim, marginBottom: 8, marginTop: 16 },
  rail: { width: 232, backgroundColor: theme.surface, borderRightWidth: 1, borderColor: theme.border },
  railInner: { flex: 1, padding: 16, paddingTop: 20, justifyContent: "space-between" },
  railNav: { marginTop: 4 },
  railItem: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "transparent",
    marginBottom: 2,
  },
  railItemActive: {
    backgroundColor: theme.surfaceHover,
    borderLeftWidth: 2,
    borderLeftColor: theme.accent,
  },
  railActiveIndicator: {
    position: "absolute",
    left: -1,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: theme.accent,
  },
  railLabel: {
    fontFamily: theme.font.sansMedium,
    fontSize: 14,
    color: theme.muted,
    flex: 1,
  },
  railLabelActive: {
    fontFamily: theme.font.sansSemi,
    fontSize: 14,
    color: theme.text,
    fontWeight: "600",
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.accent,
  },
  railUser: { flexDirection: "row", alignItems: "center", gap: 7, paddingTop: 14, borderTopWidth: 1, borderColor: theme.border },
  avatar: { width: 28, height: 28, borderRadius: theme.radiusSm, backgroundColor: theme.surface2, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.border },
  avatarActive: { borderColor: theme.accent, backgroundColor: theme.accentSubtle },
  userName: { fontFamily: theme.font.sansMedium, fontSize: 12, color: theme.text },
  userEmail: { fontFamily: theme.font.mono, fontSize: 9.5, color: theme.muted },
  themeToggleBtn: {
    padding: 5,
    borderRadius: theme.radiusSm,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  mobileThemeBtn: {
    padding: 6,
    borderRadius: theme.radiusSm,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtn: { padding: 4 },
  shellWeb: { flex: 1, flexDirection: "row", backgroundColor: theme.bg, minHeight: 0 as any },
  contentWeb: { flex: 1, backgroundColor: theme.bg, minHeight: 0 as any, overflow: "hidden" as any },
  shellMobile: { flex: 1, backgroundColor: theme.bg, minHeight: 0 as any },
  mobileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  mobilePageBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.28)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  mobilePageBadgeText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 0.5,
    color: theme.accent,
    textTransform: "uppercase",
  },
  contentMobile: { flex: 1, minHeight: 0 as any, overflow: "hidden" as any },
  bottomBar: {
    flexDirection: "row",
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderColor: theme.border,
    paddingBottom: 8,
    paddingTop: 4,
  },
  bottomItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 4,
    position: "relative",
  },
  bottomItemActive: {},
  bottomActiveBar: {
    position: "absolute",
    top: -4,
    left: "25%",
    right: "25%",
    height: 2.5,
    backgroundColor: theme.accent,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  bottomIconWrap: {
    width: 32,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
  },
  bottomIconWrapActive: {
    backgroundColor: "rgba(59, 130, 246, 0.14)",
  },
  bottomLabel: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    color: theme.muted,
  },
  bottomLabelActive: {
    color: theme.accent,
    fontWeight: "700",
  },
});
