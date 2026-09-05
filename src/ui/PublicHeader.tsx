import React from "react";
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Button, theme } from "./primitives";

interface PublicHeaderProps {
  activeNav?: "specifications" | "catalog" | "workflow" | "architecture" | null;
}

export function PublicHeader({ activeNav }: PublicHeaderProps) {
  const router = useRouter();
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
            <Pressable
              style={[styles.navItem, activeNav === "specifications" && styles.navItemActive]}
              onPress={() => router.push("/specifications")}
            >
              <Text
                style={[
                  styles.headerNavLink,
                  activeNav === "specifications" && styles.headerNavLinkActive,
                ]}
              >
                SPECIFICATIONS
              </Text>
              {activeNav === "specifications" && <View style={styles.navDot} />}
            </Pressable>

            <Pressable
              style={[styles.navItem, activeNav === "catalog" && styles.navItemActive]}
              onPress={() => router.push("/catalog")}
            >
              <Text
                style={[
                  styles.headerNavLink,
                  activeNav === "catalog" && styles.headerNavLinkActive,
                ]}
              >
                CATALOG
              </Text>
              {activeNav === "catalog" && <View style={styles.navDot} />}
            </Pressable>

            <Pressable
              style={[styles.navItem, activeNav === "workflow" && styles.navItemActive]}
              onPress={() => router.push("/workflow")}
            >
              <Text
                style={[
                  styles.headerNavLink,
                  activeNav === "workflow" && styles.headerNavLinkActive,
                ]}
              >
                WORKFLOW
              </Text>
              {activeNav === "workflow" && <View style={styles.navDot} />}
            </Pressable>

            <Pressable
              style={[styles.navItem, activeNav === "architecture" && styles.navItemActive]}
              onPress={() => router.push("/architecture")}
            >
              <Text
                style={[
                  styles.headerNavLink,
                  activeNav === "architecture" && styles.headerNavLinkActive,
                ]}
              >
                ARCHITECTURE
              </Text>
              {activeNav === "architecture" && <View style={styles.navDot} />}
            </Pressable>
          </View>
        )}

        {/* Right: Actions */}
        <View style={styles.headerRight}>
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
    backgroundColor: "#101216",
    borderBottomWidth: 1,
    borderColor: "#272B32",
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
    color: "#F5F3EE",
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
    borderBottomColor: "#2F6BFF",
  },
  headerNavLink: {
    fontFamily: theme.font.monoMedium,
    fontSize: 12,
    letterSpacing: 1.2,
    color: "#A1A5AD",
  },
  headerNavLinkActive: {
    color: "#F5F3EE",
  },
  navDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2F6BFF",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
