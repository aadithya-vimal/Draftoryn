import React from "react";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useAppUser } from "../auth/clerk";
import { Icon } from "./components";
import { theme } from "./primitives";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { href: "/(app)/home", label: "Home", icon: "Home" },
  { href: "/(app)/discover", label: "Discover", icon: "Compass" },
  { href: "/(app)/library", label: "Library", icon: "Library" },
  { href: "/(app)/settings", label: "Settings", icon: "Settings" },
];

function normalizePath(p: string): string {
  if (!p) return "/";
  return (
    p
      .replace(/\/\([^)]+\)/g, "")
      .replace(/\/+$/, "") || "/"
  );
}

function isNavActive(pathname: string, href: string): boolean {
  const current = normalizePath(pathname);
  const target = normalizePath(href);
  if (current === target) return true;
  if (target === "/home" && (current === "/" || current === "/home")) return true;
  if (target !== "/" && current.startsWith(target + "/")) return true;
  return false;
}

function Brand() {
  return (
    <View style={styles.brand}>
      <View style={styles.brandMark}>
        <Icon name="Shield" size={16} color={theme.accentForeground} strokeWidth={2.2} />
      </View>
      <View>
        <Text style={styles.brandText}>DRAFTORYN</Text>
        <Text style={styles.brandSub}>DOC STUDIO // V1</Text>
      </View>
    </View>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { name, email, signOut } = useAppUser();
  const { width } = useWindowDimensions();
  const isMobile = width < 840;

  const activeNav: NavItem = NAV.find((n) => isNavActive(pathname, n.href)) ?? NAV[0]!;
  const isSettingsActive = isNavActive(pathname, "/(app)/settings");

  const rail = (
    <View style={styles.railInner}>
      <View>
        <Pressable onPress={() => router.push("/(app)/home")} accessibilityRole="button" accessibilityLabel="Draftoryn Home">
          <Brand />
        </Pressable>

        {/* Workspace Context Indicator */}
        <View style={styles.workspaceCard}>
          <View style={styles.workspaceDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.workspaceLabel}>WORKSPACE</Text>
            <Text style={styles.workspaceName} numberOfLines={1}>Primary Workspace</Text>
          </View>
          <View style={styles.workspaceBadge}>
            <Text style={styles.workspaceBadgeText}>LIVE</Text>
          </View>
        </View>

        {/* Navigation links */}
        <View style={styles.railNav}>
          <Text style={styles.navGroupLabel}>STUDIO</Text>
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
      <View style={styles.mobilePageBadge}>
        <Icon name={activeNav.icon} size={13} color={theme.accent} />
        <Text style={styles.mobilePageBadgeText}>{activeNav.label}</Text>
      </View>
      <Pressable onPress={() => router.push("/(app)/settings")} hitSlop={8}>
        <View style={[styles.avatar, isSettingsActive && styles.avatarActive]}>
          <Icon name="User" size={15} color={isSettingsActive ? theme.accent : theme.muted} />
        </View>
      </Pressable>
    </View>
  );

  if (isMobile) {
    return (
      <View style={styles.shellMobile}>
        {mobileTopHeader}
        <View style={styles.contentMobile}>{children}</View>
        {bottomTabs}
      </View>
    );
  }

  return (
    <View style={styles.shellWeb}>
      <View style={styles.rail}>{rail}</View>
      <View style={styles.contentWeb}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: { width: 28, height: 28, borderRadius: theme.radiusSm, backgroundColor: theme.accent, alignItems: "center", justifyContent: "center" },
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
  workspaceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.ok },
  workspaceLabel: { fontFamily: theme.font.mono, fontSize: 8.5, letterSpacing: 1.5, color: theme.muted, textTransform: "uppercase" },
  workspaceName: { fontFamily: theme.font.sansSemi, fontSize: 12, color: theme.text },
  workspaceBadge: { paddingVertical: 2, paddingHorizontal: 5, backgroundColor: theme.okBg, borderRadius: 2 },
  workspaceBadgeText: { fontFamily: theme.font.monoMedium, fontSize: 8.5, color: theme.ok, letterSpacing: 0.8 },
  navGroupLabel: { fontFamily: theme.font.monoMedium, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: theme.textDim, marginBottom: 8, marginTop: 16 },
  rail: { width: 224, backgroundColor: theme.surface, borderRightWidth: 1, borderColor: theme.border },
  railInner: { flex: 1, padding: 16, paddingTop: 20, justifyContent: "space-between" },
  railNav: { marginTop: 4 },
  railItem: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: theme.radiusSm,
    borderWidth: 1,
    borderColor: "transparent",
    marginBottom: 2,
  },
  railItemActive: {
    backgroundColor: theme.surface2,
    borderColor: theme.borderLight,
  },
  railActiveIndicator: {
    position: "absolute",
    left: -1,
    top: 5,
    bottom: 5,
    width: 2.5,
    backgroundColor: theme.accent,
    borderRadius: 1,
  },
  railLabel: {
    fontFamily: theme.font.sansMedium,
    fontSize: 13,
    color: theme.muted,
    flex: 1,
  },
  railLabelActive: {
    fontFamily: theme.font.sansSemi,
    fontSize: 13,
    color: theme.text,
    fontWeight: "600",
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.accent,
  },
  railUser: { flexDirection: "row", alignItems: "center", gap: 9, paddingTop: 14, borderTopWidth: 1, borderColor: theme.border },
  avatar: { width: 28, height: 28, borderRadius: theme.radiusSm, backgroundColor: theme.surface2, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.border },
  avatarActive: { borderColor: theme.accent, backgroundColor: theme.accentSubtle },
  userName: { fontFamily: theme.font.sansMedium, fontSize: 12, color: theme.text },
  userEmail: { fontFamily: theme.font.mono, fontSize: 9.5, color: theme.muted },
  logoutBtn: { padding: 4 },
  shellWeb: { flex: 1, flexDirection: "row", backgroundColor: theme.bg },
  contentWeb: { flex: 1, backgroundColor: theme.bg },
  shellMobile: { flex: 1, backgroundColor: theme.bg },
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
  contentMobile: { flex: 1 },
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
