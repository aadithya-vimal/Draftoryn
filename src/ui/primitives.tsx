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
// Serif design tokens
// Warm ivory canvas, rich-black ink, a single burnished-gold accent.
// Centralized here so every screen inherits the system by using primitives.
// ---------------------------------------------------------------------------
export const theme = {
  bg: "#FAFAF8",
  surface: "#FFFFFF",
  surface2: "#F5F3F0",
  border: "#E8E4DF",
  text: "#1A1A1A",
  muted: "#6B6B6B",
  accent: "#B8860B",
  accentSecondary: "#D4A84B",
  accentForeground: "#FFFFFF",
  danger: "#9B2C2C",
  warn: "#A9791B",
  ok: "#4F6F52",
  radius: 8,
  radiusSm: 6,
  spacing: 12,
  // Typography families (loaded via expo-font in app/_layout.tsx).
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
  // Subtle, refined shadows (no harsh depth — restraint is the point).
  shadowSm: {
    shadowColor: "#1A1A1A",
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  } as ViewStyle,
  shadowMd: {
    shadowColor: "#1A1A1A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
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
// Heading: the signature serif. One component, three levels, so headlines
// stay consistent everywhere instead of ad-hoc Text styles per screen.
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
// SectionLabel: tracked uppercase mono label flanked by hairline rules.
// The defining editorial rhythm of the Serif system.
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
        hovered ? { backgroundColor: "#FBF7EE" } : undefined,
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
      ? { bg: theme.danger, fg: theme.accentForeground }
      : variant === "primary"
        ? { bg: theme.accent, fg: theme.accentForeground }
        : variant === "secondary"
          ? { bg: "transparent", fg: theme.text }
          : { bg: "transparent", fg: theme.muted };
  const hoverBg =
    variant === "primary"
      ? theme.accentSecondary
      : variant === "danger"
        ? "#7E2323"
        : variant === "secondary"
          ? theme.surface2
          : "transparent";
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
          variant === "ghost" && hovered && { textDecorationLine: "underline", textDecorationColor: theme.accent },
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
          { borderColor: focused ? theme.accent : theme.border },
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
      <Text style={[styles.chipText, active && { color: theme.accentForeground }]}>{label}</Text>
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

export function Spinner() {
  return (
    <View style={styles.spinner}>
      <ActivityIndicator color={theme.accent} />
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
  h1: { color: theme.text, fontSize: 56, lineHeight: 62, letterSpacing: -1.5, marginBottom: 8 },
  h1Mobile: { color: theme.text, fontSize: 32, lineHeight: 38, letterSpacing: -0.5, marginBottom: 8 },
  h2: { color: theme.text, fontSize: 36, lineHeight: 42, letterSpacing: -0.5, marginBottom: 8 },
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
    borderColor: theme.text,
    backgroundColor: "transparent",
  },
  buttonText: { fontFamily: theme.font.sansMedium, fontSize: 15, letterSpacing: 0.5 },
  field: { marginBottom: 16 },
  label: { fontFamily: theme.font.monoMedium, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: theme.muted, marginBottom: 8 },
  input: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderRadius: theme.radiusSm,
    color: theme.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: theme.font.sans,
  },
  inputMultiline: { minHeight: 110, textAlignVertical: "top" },
  chip: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { fontFamily: theme.font.sansMedium, fontSize: 13, color: theme.muted },
  empty: { padding: 48, alignItems: "center" },
  emptyTitle: { color: theme.text, marginBottom: 8 },
  emptySub: { fontFamily: theme.font.sans, fontSize: 14, color: theme.muted, textAlign: "center" },
  emptyActions: { marginTop: 20 },
  spinner: { padding: 24, alignItems: "center" },
  error: { fontFamily: theme.font.sans, fontSize: 13, color: theme.danger, marginTop: 6 },
});
