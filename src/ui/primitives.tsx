import React, { createContext, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type PressableStateCallbackType,
  type TextStyle,
  type StyleProp,
  type ViewStyle,
} from "react-native";

// ---------------------------------------------------------------------------
// Strict Technical Editorial Design Tokens
// Dark Mode: Background: #090A0C | Surface: #101216 | Border: #272B32 | Text: #F5F3EE | Accent: #2F6BFF
// Light Mode: Background: #F6F7F9 | Surface: #FFFFFF | Border: #D6D9E0 | Text: #0D0F12 | Accent: #1F5EFF
// ---------------------------------------------------------------------------

export const darkColors = {
  bg: "#090A0C",
  bgAlt: "#101216",
  surface: "#101216",
  surface2: "#15181D",
  surfaceHover: "#191C22",
  border: "#272B32",
  borderLight: "#343941",
  borderActive: "#2F6BFF",
  text: "#F5F3EE",
  textSecondary: "#A1A5AD",
  muted: "#727780",
  mutedLight: "#A1A5AD",
  textDim: "#525760",
  accent: "#2F6BFF",
  accentHover: "#1F4FD1",
  accentSubtle: "rgba(47, 107, 255, 0.12)",
  accentSecondary: "#343941",
  accentForeground: "#FFFFFF",
  danger: "#D94A4A",
  dangerBg: "rgba(217, 74, 74, 0.12)",
  warn: "#D99A24",
  warnBg: "rgba(217, 154, 36, 0.12)",
  ok: "#31B77A",
  okBg: "rgba(49, 183, 122, 0.12)",
  info: "#2F6BFF",
  infoBg: "rgba(47, 107, 255, 0.12)",
};

export const lightColors = {
  bg: "#F6F7F9",
  bgAlt: "#FFFFFF",
  surface: "#FFFFFF",
  surface2: "#F0F2F5",
  surfaceHover: "#E8EBEF",
  border: "#D6D9E0",
  borderLight: "#E2E5EB",
  borderActive: "#1F5EFF",
  text: "#0D0F12",
  textSecondary: "#474C56",
  muted: "#686E7B",
  mutedLight: "#8C93A1",
  textDim: "#A6ACB8",
  accent: "#1F5EFF",
  accentHover: "#0F4BD9",
  accentSubtle: "rgba(31, 94, 255, 0.09)",
  accentSecondary: "#E2E5EB",
  accentForeground: "#FFFFFF",
  danger: "#DC2626",
  dangerBg: "rgba(220, 38, 38, 0.08)",
  warn: "#B45309",
  warnBg: "rgba(180, 83, 9, 0.08)",
  ok: "#15803D",
  okBg: "rgba(21, 128, 61, 0.08)",
  info: "#1F5EFF",
  infoBg: "rgba(31, 94, 255, 0.08)",
};

const isWeb = Platform.OS === "web";

export const theme = {
  bg: isWeb ? "var(--color-bg, #090A0C)" : darkColors.bg,
  bgAlt: isWeb ? "var(--color-bg-alt, #101216)" : darkColors.bgAlt,
  surface: isWeb ? "var(--color-surface, #101216)" : darkColors.surface,
  surface2: isWeb ? "var(--color-surface2, #15181D)" : darkColors.surface2,
  surfaceHover: isWeb ? "var(--color-surface-hover, #191C22)" : darkColors.surfaceHover,
  border: isWeb ? "var(--color-border, #272B32)" : darkColors.border,
  borderLight: isWeb ? "var(--color-border-light, #343941)" : darkColors.borderLight,
  borderActive: isWeb ? "var(--color-border-active, #2F6BFF)" : darkColors.borderActive,
  text: isWeb ? "var(--color-text, #F5F3EE)" : darkColors.text,
  textSecondary: isWeb ? "var(--color-text-secondary, #A1A5AD)" : darkColors.textSecondary,
  muted: isWeb ? "var(--color-muted, #727780)" : darkColors.muted,
  mutedLight: isWeb ? "var(--color-muted-light, #A1A5AD)" : darkColors.mutedLight,
  textDim: isWeb ? "var(--color-text-dim, #525760)" : darkColors.textDim,
  accent: isWeb ? "var(--color-accent, #2F6BFF)" : darkColors.accent,
  accentHover: isWeb ? "var(--color-accent-hover, #1F4FD1)" : darkColors.accentHover,
  accentSubtle: isWeb ? "var(--color-accent-subtle, rgba(47, 107, 255, 0.12))" : darkColors.accentSubtle,
  accentSecondary: isWeb ? "var(--color-accent-secondary, #343941)" : darkColors.accentSecondary,
  accentForeground: "#FFFFFF",
  danger: isWeb ? "var(--color-danger, #D94A4A)" : darkColors.danger,
  dangerBg: isWeb ? "var(--color-danger-bg, rgba(217, 74, 74, 0.12))" : darkColors.dangerBg,
  warn: isWeb ? "var(--color-warn, #D99A24)" : darkColors.warn,
  warnBg: isWeb ? "var(--color-warn-bg, rgba(217, 154, 36, 0.12))" : darkColors.warnBg,
  ok: isWeb ? "var(--color-ok, #31B77A)" : darkColors.ok,
  okBg: isWeb ? "var(--color-ok-bg, rgba(49, 183, 122, 0.12))" : darkColors.okBg,
  info: isWeb ? "var(--color-info, #2F6BFF)" : darkColors.info,
  infoBg: isWeb ? "var(--color-info-bg, rgba(47, 107, 255, 0.12))" : darkColors.infoBg,
  radius: 8,      // Cards: 8px
  radiusSm: 6,    // Buttons & Inputs: 6px
  radiusLg: 10,   // Large product frames: 10px
  spacing: 12,
  font: {
    // Inter Tight typography
    sans: "InterTight_400Regular",
    sansMedium: "InterTight_500Medium",
    sansSemi: "InterTight_600SemiBold",
    sansBold: "InterTight_700Bold",
    sansExtraBold: "InterTight_800ExtraBold",
    sansBlack: "InterTight_900Black",
    // IBM Plex Mono typography
    mono: "IBMPlexMono_400Regular",
    monoMedium: "IBMPlexMono_500Medium",
    // Compatibility aliases
    serif: "InterTight_400Regular",
    serifSemi: "InterTight_600SemiBold",
    serifBold: "InterTight_700Bold",
    serifBlack: "InterTight_900Black",
  } as const,
  shadowSm: {
    shadowColor: "#000000",
    shadowOpacity: 0.20,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  } as ViewStyle,
  shadowMd: {
    shadowColor: "#000000",
    shadowOpacity: 0.20,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  } as ViewStyle,
  shadowGlow: {
    shadowColor: "#000000",
    shadowOpacity: 0.20,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  } as ViewStyle,
};

// ---------------------------------------------------------------------------
// Theme Context & State Provider
// ---------------------------------------------------------------------------
export type ThemeMode = "dark" | "light";

export interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  rawColors: typeof darkColors;
}

export const ThemeContext = createContext<ThemeContextValue>({
  mode: "dark",
  isDark: true,
  setMode: () => {},
  toggleTheme: () => {},
  rawColors: darkColors,
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = window.localStorage.getItem("draftoryn_theme_mode") as ThemeMode | null;
      if (saved === "light" || saved === "dark") {
        setModeState(saved);
        applyDomTheme(saved);
        return;
      }
    }
    applyDomTheme("dark");
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("draftoryn_theme_mode", newMode);
    }
    applyDomTheme(newMode);
  };

  const toggleTheme = () => {
    setMode(mode === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        isDark: mode === "dark",
        setMode,
        toggleTheme,
        rawColors: mode === "dark" ? darkColors : lightColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

function applyDomTheme(targetMode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", targetMode);
  if (document.body) {
    document.body.style.backgroundColor = targetMode === "light" ? lightColors.bg : darkColors.bg;
    document.body.style.color = targetMode === "light" ? lightColors.text : darkColors.text;
  }
}

export function Screen({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <View style={styles.screen}>
      {title ? <Heading level={2} style={styles.screenTitle}>{title}</Heading> : null}
      <View style={styles.screenBody}>{children}</View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Heading: refined typography hierarchy with tight letterspacing.
// ---------------------------------------------------------------------------
export function Heading({
  level = 3,
  children,
  style,
  center,
}: {
  level?: 1 | 2 | 3;
  children: React.ReactNode;
  style?: TextStyle;
  center?: boolean;
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const font = level === 1 ? theme.font.sansBlack : level === 2 ? theme.font.sansBold : theme.font.sansSemi;
  const baseStyle =
    level === 1
      ? isMobile ? styles.h1Mobile : styles.h1
      : level === 2
      ? isMobile ? styles.h2Mobile : styles.h2
      : isMobile ? styles.h3Mobile : styles.h3;

  return (
    <Text
      style={[
        baseStyle,
        { fontFamily: font, textAlign: center ? "center" : "left" },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// SectionLabel: tracked uppercase mono label flanked by hairline dark borders.
// ---------------------------------------------------------------------------
export function SectionLabel({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.sectionLabel, style]}>
      <View style={styles.rule} />
      <Text style={styles.sectionLabelText}>{children}</Text>
      <View style={styles.rule} />
    </View>
  );
}

export function Card({
  children,
  style,
  accentTop,
  elevated,
  hover,
}: {
  children: React.ReactNode;
  style?: import("react-native").StyleProp<ViewStyle>;
  accentTop?: boolean;
  elevated?: boolean;
  hover?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const hoverProps = hover
    ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) }
    : {};
  return (
    <View
      style={[
        styles.card,
        elevated ? theme.shadowMd : undefined,
        accentTop ? styles.cardAccentTop : undefined,
        hovered ? { backgroundColor: theme.surfaceHover, borderColor: theme.borderLight } : undefined,
        style,
      ]}
      {...hoverProps}
    >
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const [hovered, setHovered] = useState(false);
  const base: ViewStyle = variant === "primary" || variant === "danger" ? styles.btnPrimary : styles.btnSecondary;
  const palette =
    variant === "danger"
      ? { bg: theme.danger, fg: "#FFFFFF" }
      : variant === "primary"
        ? { bg: theme.accent, fg: theme.accentForeground }
        : variant === "secondary"
          ? { bg: theme.surface2, fg: theme.text }
          : { bg: "transparent", fg: theme.muted };
  const hoverBg =
    variant === "primary"
      ? theme.accentHover
      : variant === "danger"
        ? "#DC2626"
        : variant === "secondary"
          ? theme.surfaceHover
          : theme.surface2;
  const compute = (s: PressableStateCallbackType): StyleProp<ViewStyle> => [
    base,
    { backgroundColor: hovered && !disabled ? hoverBg : palette.bg },
    variant === "secondary" && hovered ? { borderColor: theme.accent } : {},
    variant === "ghost" && hovered ? { backgroundColor: theme.surface2 } : {},
    disabled ? { opacity: 0.45 } : undefined,
    style as ViewStyle,
  ];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setHovered(false)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={compute}
    >
      <Text
        style={[
          styles.buttonText,
          { color: hovered && variant === "secondary" ? theme.accent : palette.fg },
          variant === "ghost" && hovered && { color: theme.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  secure,
  style,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secure?: boolean;
  style?: ViewStyle;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          {
            borderColor: focused ? theme.accent : theme.border,
            backgroundColor: focused ? theme.surfaceHover : theme.surface2,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        multiline={multiline}
        secureTextEntry={secure}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

export function Chip({ label, onPress, active }: { label: string; onPress?: () => void; active?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && { backgroundColor: theme.accent, borderColor: theme.accent },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.chipText, active && { color: "#FFFFFF" }]}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <Heading level={3} style={styles.emptyTitle}>{title}</Heading>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
      {action ? <View style={styles.emptyActions}>{action}</View> : null}
    </View>
  );
}

export function Spinner({
  size = "small",
  color = theme.accent,
  style,
}: {
  size?: "small" | "large" | number;
  color?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.spinner, style]}>
      <ActivityIndicator size={size as "small" | "large"} color={color} />
    </View>
  );
}

export function LoadingOverlay({
  message = "Loading…",
  subMessage,
}: {
  message?: string;
  subMessage?: string;
}) {
  return (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color={theme.accent} style={{ marginBottom: 14 }} />
        <Text style={styles.loadingMsg}>{message}</Text>
        {subMessage ? <Text style={styles.loadingSubMsg}>{subMessage}</Text> : null}
      </View>
    </View>
  );
}

export function ErrorText({ message }: { message: string }) {
  return <Text style={styles.error}>{message}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, padding: theme.spacing, paddingTop: 28 },
  screenTitle: { marginBottom: 16 },
  screenBody: { flex: 1 },
  h1: { color: theme.text, fontSize: 48, lineHeight: 48, letterSpacing: -1.92, marginBottom: 8, fontFamily: theme.font.sansBold },
  h1Mobile: { color: theme.text, fontSize: 36, lineHeight: 38, letterSpacing: -1.4, marginBottom: 8, fontFamily: theme.font.sansBold },
  h2: { color: theme.text, fontSize: 24, lineHeight: 26.4, letterSpacing: -0.6, marginBottom: 8, fontFamily: theme.font.sansSemi },
  h2Mobile: { color: theme.text, fontSize: 20, lineHeight: 22, letterSpacing: -0.5, marginBottom: 8, fontFamily: theme.font.sansSemi },
  h3: { color: theme.text, fontSize: 18, lineHeight: 22, fontWeight: "600", marginBottom: 6, fontFamily: theme.font.sansSemi },
  h3Mobile: { color: theme.text, fontSize: 16, lineHeight: 20, fontWeight: "600", marginBottom: 6, fontFamily: theme.font.sansSemi },
  sectionLabel: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24 },
  sectionLabelText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.54,
    textTransform: "uppercase",
    color: theme.accent,
  },
  rule: { flex: 1, height: 1, backgroundColor: theme.border },
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 24,
    marginBottom: 16,
    ...theme.shadowSm,
  },
  cardAccentTop: { borderTopWidth: 2, borderTopColor: theme.accent },
  btnPrimary: {
    borderRadius: theme.radiusSm,
    paddingVertical: 12,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    height: 44,
    backgroundColor: theme.accent,
  },
  btnSecondary: {
    borderRadius: theme.radiusSm,
    paddingVertical: 12,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    height: 44,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.surface2,
  },
  buttonText: { fontFamily: theme.font.sansSemi, fontSize: 15, letterSpacing: -0.2 },
  field: { marginBottom: 16 },
  label: { fontFamily: theme.font.monoMedium, fontSize: 11, letterSpacing: 1.54, textTransform: "uppercase", color: theme.muted, marginBottom: 8 },
  input: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderRadius: theme.radiusSm,
    color: theme.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: theme.font.sans,
  },
  inputMultiline: { minHeight: 110, textAlignVertical: "top" },
  chip: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { fontFamily: theme.font.sansMedium, fontSize: 13, color: theme.mutedLight },
  empty: { padding: 48, alignItems: "center" },
  emptyTitle: { color: theme.text, marginBottom: 8 },
  emptySub: { fontFamily: theme.font.sans, fontSize: 16, lineHeight: 24.8, color: theme.muted, textAlign: "center" },
  emptyActions: { marginTop: 20 },
  spinner: { padding: 12, alignItems: "center", justifyContent: "center" },
  error: { fontFamily: theme.font.sans, fontSize: 13, color: theme.danger, marginTop: 6 },
  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(9, 10, 12, 0.94)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    padding: 24,
  },
  loadingCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 28,
    alignItems: "center",
    maxWidth: 360,
    width: "100%",
    ...theme.shadowMd,
  },
  loadingMsg: {
    fontFamily: theme.font.sansSemi,
    fontSize: 17,
    color: theme.text,
    textAlign: "center",
    marginBottom: 4,
  },
  loadingSubMsg: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.muted,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4,
  },
});
