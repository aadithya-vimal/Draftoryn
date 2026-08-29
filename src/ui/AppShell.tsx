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

function isActive(pathname: string, href: string): boolean {
  const base = href.replace(/\/$/, "");
  return pathname === base || pathname.startsWith(base + "/") || pathname === href;
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

  const rail = (
    <View style={styles.railInner}>
      <Pressable onPress={() => router.push("/(app)/home")}>
        <Brand />
      </Pressable>
      <View style={styles.railNav}>
        {NAV.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Pressable
              key={n.href}
              style={[styles.railItem, active && styles.railItemActive]}
              onPress={() => router.push(n.href)}
            >
              <Icon name={n.icon} size={19} color={active ? theme.accent : theme.muted} />
              <Text style={[styles.railLabel, active && { color: theme.accent }]}>{n.label}</Text>
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
        <Pressable onPress={() => signOut()} hitSlop={8}>
          <Icon name="LogOut" size={18} color={theme.muted} />
        </Pressable>
      </View>
    </View>
  );

  const bottomTabs = (
    <View style={styles.bottomBar}>
      {NAV.map((n) => {
        const active = isActive(pathname, n.href);
        return (
          <Pressable key={n.href} style={styles.bottomItem} onPress={() => router.push(n.href)}>
            <Icon name={n.icon} size={20} color={active ? theme.accent : theme.muted} />
            <Text style={[styles.bottomLabel, active && { color: theme.accent }]}>{n.label}</Text>
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
      <Pressable onPress={() => router.push("/(app)/settings")} hitSlop={8}>
        <View style={styles.avatar}>
          <Icon name="User" size={15} color={theme.muted} />
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
  railNav: { gap: 4, marginTop: 28 },
  railItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: theme.radiusSm },
  railItemActive: { backgroundColor: theme.surface2 },
  railLabel: { fontFamily: theme.font.sansMedium, fontSize: 14, color: theme.text },
  railUser: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 16, borderTopWidth: 1, borderColor: theme.border },
  avatar: { width: 32, height: 32, borderRadius: 999, backgroundColor: theme.surface2, alignItems: "center", justifyContent: "center" },
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
  contentMobile: { flex: 1 },
  bottomBar: { flexDirection: "row", backgroundColor: theme.surface, borderTopWidth: 1, borderColor: theme.border, paddingBottom: 8, paddingTop: 6 },
  bottomItem: { flex: 1, alignItems: "center", gap: 3, paddingVertical: 4 },
  bottomLabel: { fontFamily: theme.font.mono, fontSize: 10, letterSpacing: 0.5, color: theme.muted },
});
