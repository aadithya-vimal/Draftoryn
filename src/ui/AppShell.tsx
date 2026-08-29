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
        <Icon name="Shield" size={18} color={theme.accentForeground} strokeWidth={2} />
      </View>
      <Text style={styles.brandText}>Draftoryn</Text>
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
      <Pressable onPress={() => router.push("/(app)/home")} accessibilityRole="button" accessibilityLabel="Draftoryn Home">
        <Brand />
      </Pressable>
      <View style={styles.railNav}>
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
                size={19}
                color={active ? theme.accent : theme.muted}
                strokeWidth={active ? 2.3 : 1.8}
              />
              <Text style={[styles.railLabel, active && styles.railLabelActive]}>
                {n.label}
              </Text>
              {active && <View style={styles.activeDot} />}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.railUser}>
        <View style={styles.avatar}>
          <Icon name="User" size={16} color={theme.muted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName} numberOfLines={1}>{name ?? "Account"}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{email ?? ""}</Text>
        </View>
        <Pressable onPress={() => signOut()} hitSlop={8} accessibilityLabel="Sign out">
          <Icon name="LogOut" size={18} color={theme.muted} />
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
  brandMark: { width: 30, height: 30, borderRadius: 8, backgroundColor: theme.accent, alignItems: "center", justifyContent: "center" },
  brandText: { fontFamily: theme.font.serifSemi, fontSize: 19, color: theme.text },
  rail: { width: 248, backgroundColor: theme.surface, borderRightWidth: 1, borderColor: theme.border },
  railInner: { flex: 1, padding: 20, paddingTop: 26, justifyContent: "space-between" },
  railNav: { gap: 6, marginTop: 28 },
  railItem: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radiusSm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  railItemActive: {
    backgroundColor: "#FAF6EE",
    borderColor: "rgba(184, 134, 11, 0.25)",
  },
  railActiveIndicator: {
    position: "absolute",
    left: 0,
    top: 6,
    bottom: 6,
    width: 3.5,
    backgroundColor: theme.accent,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
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
    color: theme.accent,
    fontWeight: "600",
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.accent,
  },
  railUser: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 16, borderTopWidth: 1, borderColor: theme.border },
  avatar: { width: 32, height: 32, borderRadius: 999, backgroundColor: theme.surface2, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "transparent" },
  avatarActive: { borderColor: theme.accent, backgroundColor: "#FAF6EE" },
  userName: { fontFamily: theme.font.sansMedium, fontSize: 13, color: theme.text },
  userEmail: { fontFamily: theme.font.mono, fontSize: 10, color: theme.muted },
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
    backgroundColor: "#FAF6EE",
    borderWidth: 1,
    borderColor: "rgba(184, 134, 11, 0.25)",
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
    backgroundColor: "rgba(184, 134, 11, 0.12)",
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
