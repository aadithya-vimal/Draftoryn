import React from "react";
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Link, useRouter } from "expo-router";
import { Button, theme, useTheme } from "./primitives";
import { Icon } from "./components";

interface PublicHeaderProps {
  activeNav?: "documents" | "catalog" | "workflow" | "how-it-works" | null;
}

export function PublicHeader({ activeNav }: PublicHeaderProps) {
  const router = useRouter();
  const { mode, toggleTheme } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 840;

  return (
    <View style={styles.header}>
      <View style={styles.headerInner}>
        {/* Left: Brand mark with wordmark */}
        <Pressable
          style={styles.headerLeft}
          onPress={() => router.push("/")}
          accessibilityRole="link"
          accessibilityLabel="Draftoryn Home"
        >
          <Image
            source={require("../../assets/icon.png")}
            style={styles.headerLogoImg}
            resizeMode="contain"
          />
          <Text style={styles.wordmark}>Draftoryn</Text>
        </Pressable>

        {/* Center: Navigation Links */}
        {!isMobile && (
          <View style={styles.headerNav}>
            {/* NOTE: plain Link (not asChild). Radix Slot object-spreads child
                style arrays into numeric-keyed garbage on web, which crashes
                React DOM. Layout lives on the wrapper View; visuals unchanged. */}
            <View style={[styles.navItem, activeNav === "documents" && styles.navItemActive]}>
              <Link
                href="/specifications"
                style={[
                  styles.headerNavLink,
                  activeNav === "documents" && styles.headerNavLinkActive,
                ]}
              >
                DOCUMENTS
              </Link>
              {activeNav === "documents" && <View style={styles.navDot} />}
            </View>

            <View style={[styles.navItem, activeNav === "catalog" && styles.navItemActive]}>
              <Link
                href="/catalog"
                style={[
                  styles.headerNavLink,
                  activeNav === "catalog" && styles.headerNavLinkActive,
                ]}
              >
                CATALOG
              </Link>
              {activeNav === "catalog" && <View style={styles.navDot} />}
            </View>

            <View style={[styles.navItem, activeNav === "workflow" && styles.navItemActive]}>
              <Link
                href="/workflow"
                style={[
                  styles.headerNavLink,
                  activeNav === "workflow" && styles.headerNavLinkActive,
                ]}
              >
                WORKFLOW
              </Link>
              {activeNav === "workflow" && <View style={styles.navDot} />}
            </View>

            <View style={[styles.navItem, activeNav === "how-it-works" && styles.navItemActive]}>
              <Link
                href="/architecture"
                style={[
                  styles.headerNavLink,
                  activeNav === "how-it-works" && styles.headerNavLinkActive,
                ]}
              >
                HOW IT WORKS
              </Link>
              {activeNav === "how-it-works" && <View style={styles.navDot} />}
            </View>
          </View>
        )}

        {/* Right: Actions */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={toggleTheme}
            style={styles.themeToggleBtn}
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
          >
            <Icon name={mode === "dark" ? "Sun" : "Moon"} size={13} color={theme.text} />
            <Text style={styles.themeToggleText}>
              {mode === "dark" ? "LIGHT" : "DARK"}
            </Text>
          </TouchableOpacity>
          <Button
            label="Sign In"
            variant="ghost"
            onPress={() => router.push("/(auth)/login")}
            style={{ paddingHorizontal: isMobile ? 8 : 16 }}
          />
          <Button
            label="Get Started"
            onPress={() => router.push("/(auth)/signup")}
            style={{ paddingHorizontal: isMobile ? 12 : 20 }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 72,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderColor: theme.border,
    justifyContent: "center",
  },
  headerInner: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerLogoImg: {
    width: 26,
    height: 26,
    borderRadius: 5,
  },
  wordmark: {
    fontFamily: theme.font.sansBold,
    fontSize: 18,
    letterSpacing: -0.5,
    color: theme.text,
  },
  headerNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 28,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  navItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.accent,
  },
  headerNavLink: {
    fontFamily: theme.font.monoMedium,
    fontSize: 12,
    letterSpacing: 1.2,
    color: theme.muted,
  },
  headerNavLinkActive: {
    color: theme.text,
  },
  navDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.accent,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  themeToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: theme.radiusSm,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
  },
  themeToggleText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10,
    letterSpacing: 1,
    color: theme.text,
  },
});
