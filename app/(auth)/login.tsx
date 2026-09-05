import { Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { SignIn } from "@clerk/expo/web";
import { theme, useTheme } from "../../src/ui/primitives";
import { Icon } from "../../src/ui/components";
import { AuthBrandPanel } from "../../src/ui/AuthBrandPanel";

export default function Login() {
  const { width } = useWindowDimensions();
  const isMobile = width < 860;
  const { mode, toggleTheme } = useTheme();

  return (
    <View style={[styles.screen, isMobile && { flexDirection: "column" }]}>
      {!isMobile ? <AuthBrandPanel /> : null}
      <View style={[styles.formPanel, isMobile && { padding: 20 }]}>
        <View style={styles.topBar}>
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
        </View>

        {isMobile ? (
          <View style={[styles.mobileBrand, { marginBottom: 24 }]}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.mobileLogoImg}
              resizeMode="contain"
            />
          </View>
        ) : null}

        <View style={styles.formInner}>
          <SignIn fallbackRedirectUrl="/(app)/home" signUpUrl="/(auth)/signup" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, flexDirection: "row", backgroundColor: theme.bg },
  formPanel: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, position: "relative" },
  topBar: {
    position: "absolute",
    top: 24,
    right: 28,
  },
  themeToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  themeToggleText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1,
    color: theme.text,
  },
  mobileBrand: { alignItems: "center" },
  mobileLogoImg: { width: 180, height: 48 },
  formInner: { width: "100%", maxWidth: 420 },
});
