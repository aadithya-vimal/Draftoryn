import React, { useState } from "react";
import {
  ActivityIndicator,
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
// Dark Editorial SaaS Design Tokens
// Near-black navy/indigo canvas (#07080F), deep navy/purple surfaces (#101223, #171932),
// thin borders (#23264A), high-contrast white typography, electric blue (#3B82F6),
// and vivid magenta/pink (#EC4899) secondary accents.
// ---------------------------------------------------------------------------
export const theme = {
  bg: "#07080F",
  bgAlt: "#0B0C18",
  surface: "#101223",
  surface2: "#171932",
  surfaceHover: "#1D2040",
  border: "#23264A",
  borderLight: "#2E335E",
  borderActive: "#3B82F6",
  text: "#FFFFFF",
  textSecondary: "#C5CBE3",
  muted: "#787F9E",
  mutedLight: "#9EA6C7",
  accent: "#3B82F6", // electric blue
  accentHover: "#60A5FA",
  accentSecondary: "#EC4899", // vivid magenta/pink
  accentForeground: "#FFFFFF",
  danger: "#EF4444",
  dangerBg: "rgba(239, 68, 68, 0.15)",
  warn: "#F59E0B",
  warnBg: "rgba(245, 158, 11, 0.15)",
  ok: "#10B981",
  okBg: "rgba(16, 185, 129, 0.15)",
  info: "#38BDF8",
  infoBg: "rgba(56, 189, 248, 0.15)",
  radius: 8,
  radiusSm: 6,
  spacing: 12,
  // Typography families (loaded via expo-font in app/_layout.tsx)
  font: {
    serif: "PlayfairDisplay_400Regular",
    serifSemi: "PlayfairDisplay_600SemiBold",
    serifBold: "PlayfairDisplay_700Bold",
    serifBlack: "PlayfairDisplay_900Black",
    sans: "SourceSans3_400Regular",
    sansMedium: "SourceSans3_500Medium",
    sansSemi: "SourceSans3_600SemiBold",
    mono: "IBMPlexMono_400Regular",
    monoMedium: "IBMPlexMono_500Medium",
  } as const,
  shadowSm: {
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  } as ViewStyle,
  shadowMd: {
    shadowColor: "#000000",
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  } as ViewStyle,
  shadowGlow: {
    shadowColor: "#3B82F6",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  } as ViewStyle,
};

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
  const font = level === 1 ? theme.font.serifBlack : level === 2 ? theme.font.serifBold : theme.font.serifSemi;
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
  h1: { color: theme.text, fontSize: 52, lineHeight: 58, letterSpacing: -1.2, marginBottom: 8 },
  h1Mobile: { color: theme.text, fontSize: 32, lineHeight: 38, letterSpacing: -0.5, marginBottom: 8 },
  h2: { color: theme.text, fontSize: 34, lineHeight: 40, letterSpacing: -0.6, marginBottom: 8 },
  h2Mobile: { color: theme.text, fontSize: 24, lineHeight: 30, letterSpacing: -0.3, marginBottom: 8 },
  h3: { color: theme.text, fontSize: 20, lineHeight: 26, fontWeight: "600", marginBottom: 6 },
  h3Mobile: { color: theme.text, fontSize: 17, lineHeight: 22, fontWeight: "600", marginBottom: 6 },
  sectionLabel: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24 },
  sectionLabelText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 12,
    letterSpacing: 3,
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
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    ...theme.shadowSm,
  },
  btnSecondary: {
    borderRadius: theme.radiusSm,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface2,
  },
  buttonText: { fontFamily: theme.font.sansSemi, fontSize: 14, letterSpacing: 0.3 },
  field: { marginBottom: 16 },
  label: { fontFamily: theme.font.monoMedium, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: theme.muted, marginBottom: 8 },
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
  emptySub: { fontFamily: theme.font.sans, fontSize: 14, color: theme.muted, textAlign: "center" },
  emptyActions: { marginTop: 20 },
  spinner: { padding: 12, alignItems: "center", justifyContent: "center" },
  error: { fontFamily: theme.font.sans, fontSize: 13, color: theme.danger, marginTop: 6 },
  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(7, 8, 15, 0.88)",
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
    fontFamily: theme.font.serifSemi,
    fontSize: 18,
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
