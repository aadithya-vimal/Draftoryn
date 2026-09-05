import React from "react";
import { Modal, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import * as Lucide from "lucide-react-native";
import { theme, Card, Heading } from "./primitives";
import type { DocumentStatus } from "../engine/types";

type IconProps = { name: string; size?: number; color?: string; strokeWidth?: number };
const iconCache = new Map<string, React.ElementType>();

export function Icon({ name, size = 20, color = theme.text, strokeWidth = 1.75 }: IconProps) {
  let Cmp = iconCache.get(name);
  if (!Cmp) {
    Cmp = (Lucide as unknown as Record<string, React.ElementType>)[name] ?? (Lucide.Circle as unknown as React.ElementType);
    iconCache.set(name, Cmp);
  }
  const Tag = Cmp as React.ElementType;
  return <Tag size={size} color={color} strokeWidth={strokeWidth} />;
}

export type BadgeTone = "neutral" | "accent" | "ok" | "warn" | "danger" | "info";

const BADGE_BG: Record<BadgeTone, string> = {
  neutral: theme.surface2,
  accent: "rgba(47, 107, 255, 0.12)",
  ok: "rgba(49, 183, 122, 0.12)",
  warn: "rgba(217, 154, 36, 0.12)",
  danger: "rgba(217, 74, 74, 0.12)",
  info: "rgba(47, 107, 255, 0.12)",
};
const BADGE_FG: Record<BadgeTone, string> = {
  neutral: theme.textSecondary,
  accent: "#2F6BFF",
  ok: "#31B77A",
  warn: "#D99A24",
  danger: "#D94A4A",
  info: "#2F6BFF",
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: BadgeTone }) {
  return (
    <View style={[styles.badge, { backgroundColor: BADGE_BG[tone] }]}>
      <Text style={[styles.badgeText, { color: BADGE_FG[tone] }]}>{children}</Text>
    </View>
  );
}

const STATUS_LABEL: Record<DocumentStatus, string> = {
  draft: "Draft",
  generating: "Generating",
  ready: "Ready",
  editing: "Editing",
  exporting: "Exporting",
  error: "Error",
};
const STATUS_TONE: Record<DocumentStatus, BadgeTone> = {
  draft: "neutral",
  generating: "info",
  ready: "ok",
  editing: "accent",
  exporting: "info",
  error: "danger",
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            style={[styles.segmentItem, active && styles.segmentItemActive]}
            onPress={() => onChange(o.value)}
          >
            {o.icon ? (
              <Icon
                name={o.icon}
                size={14}
                color={active ? theme.accentForeground : theme.muted}
              />
            ) : null}
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProgressBar({
  value,
  indeterminate,
  height = 6,
  style,
}: {
  value?: number;
  indeterminate?: boolean;
  height?: number;
  style?: ViewStyle;
}) {
  const pct = indeterminate ? 0.35 : Math.max(0, Math.min(1, value ?? 0));
  return (
    <View style={[styles.progressTrack, { height }, style]}>
      <View
        style={[
          styles.progressFill,
          { width: (Math.round(pct * 100) + "%") as any, height },
          indeterminate && styles.progressIndeterminate,
        ]}
      />
    </View>
  );
}

export function Skeleton({ width = "100%", height = 14, radius = 6, style }: { width?: number | string; height?: number; radius?: number; style?: ViewStyle }) {
  const merged = [{ width: width as ViewStyle["width"], height, borderRadius: radius, backgroundColor: theme.surface2, opacity: 0.7 }, style];
  return <View style={merged as unknown as ViewStyle} />;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.dialog} onPress={() => {}}>
          {title ? <Heading level={3} style={styles.dialogTitle}>{title}</Heading> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlayBottom} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          {title ? <Heading level={3} style={styles.dialogTitle}>{title}</Heading> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Lightweight vector-style "document page" illustration built from views.
export function PageIllustration({ width = 220, height = 280 }: { width?: number; height?: number }) {
  return (
    <View style={[styles.page, { width, height }]}>
      <View style={styles.pageHeader} />
      <View style={styles.pageRule} />
      <View style={[styles.pageLine, { width: "90%" }]} />
      <View style={[styles.pageLine, { width: "82%" }]} />
      <View style={[styles.pageLine, { width: "88%" }]} />
      <View style={styles.pageGap} />
      <View style={[styles.pageLine, { width: "70%" }]} />
      <View style={[styles.pageLine, { width: "84%" }]} />
      <View style={styles.pageAccent} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: "flex-start", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4 },
  badgeText: { fontFamily: theme.font.monoMedium, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  segment: { flexDirection: "row", backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radiusSm, padding: 3, gap: 2 },
  segmentItem: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: theme.radiusSm },
  segmentItemActive: { backgroundColor: theme.accent },
  segmentText: { fontFamily: theme.font.sansMedium, fontSize: 13, color: theme.textSecondary },
  segmentTextActive: { color: theme.accentForeground },
  progressTrack: { height: 4, backgroundColor: theme.surface2, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, backgroundColor: theme.accent, borderRadius: 2 },
  progressIndeterminate: { width: "40%", opacity: 0.6 },
  overlay: { flex: 1, backgroundColor: "rgba(9, 10, 12, 0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  overlayBottom: { flex: 1, backgroundColor: "rgba(9, 10, 12, 0.85)", justifyContent: "flex-end" },
  dialog: { width: "100%", maxWidth: 480, backgroundColor: theme.surface, borderRadius: theme.radiusLg, padding: 24, borderWidth: 1, borderColor: theme.borderLight, ...theme.shadowMd },
  sheet: { width: "100%", backgroundColor: theme.surface, borderTopLeftRadius: theme.radiusLg, borderTopRightRadius: theme.radiusLg, padding: 20, paddingBottom: 36, borderWidth: 1, borderColor: theme.border },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border, alignSelf: "center", marginBottom: 14 },
  dialogTitle: { marginBottom: 14 },
  page: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radiusLg, padding: 18, ...theme.shadowSm },
  pageHeader: { height: 10, width: 120, backgroundColor: theme.text, opacity: 0.85, borderRadius: 2 },
  pageRule: { height: 1, backgroundColor: theme.border, marginTop: 12, marginBottom: 14 },
  pageLine: { height: 7, backgroundColor: theme.surface2, borderRadius: 2, marginBottom: 9 },
  pageGap: { height: 10 },
  pageAccent: { position: "absolute", right: 16, bottom: 16, width: 8, height: 8, borderRadius: 2, backgroundColor: theme.accent, opacity: 0.9 },
});
