import React, { createElement, useEffect, useRef } from "react";
import { Platform, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { theme } from "./primitives";

const isWeb = Platform.OS === "web";

/** Raw div on web (for CSS motion classes), plain View elsewhere. */
function MotionDiv({
  cls,
  style,
  children,
}: {
  cls?: string;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}) {
  if (!isWeb) return <View style={style}>{children}</View>;
  const flat = style ? ((Array.isArray(style) ? Object.assign({}, ...style) : style) as Record<string, unknown>) : undefined;
  return createElement("div", { className: cls, style: flat }, children);
}

// ---------------------------------------------------------------------------
// Reveal — IntersectionObserver scroll-reveal on web, passthrough on native.
// ---------------------------------------------------------------------------

export function Reveal({
  children,
  style,
  delayMs = 0,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  delayMs?: number;
}) {
  const ref = useRef<unknown>(null);

  useEffect(() => {
    if (!isWeb) return;
    const node = ref.current as unknown as { classList?: { add: (c: string) => void } } | null;
    const classList = node?.classList;
    if (!node || !classList) return;
    if (typeof IntersectionObserver === "undefined") {
      classList.add("dryn-visible");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            classList.add("dryn-visible");
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(node as unknown as Element);
    return () => observer.disconnect();
  }, []);

  if (!isWeb) return <>{children}</>;
  const flat = style ? ((Array.isArray(style) ? Object.assign({}, ...style) : style) as Record<string, unknown>) : {};
  return createElement(
    "div",
    {
      ref,
      className: "dryn-reveal",
      style: { width: "100%", transitionDelay: delayMs ? `${delayMs}ms` : undefined, ...flat },
    },
    children,
  );
}

// ---------------------------------------------------------------------------
// DocMark — small restrained document glyph.
// ---------------------------------------------------------------------------

export function DocMark({ size = 46 }: { size?: number }) {
  const scale = size / 46;
  return (
    <View style={[docStyles.page, { width: size, height: size * 1.28, borderRadius: 5 * scale, padding: 7 * scale }]}>
      <View style={[docStyles.accentBar, { height: Math.max(2, 3 * scale), width: "58%", marginBottom: 5 * scale }]} />
      <View style={[docStyles.line, { height: Math.max(1.5, 2 * scale), marginBottom: 3.5 * scale }]} />
      <View style={[docStyles.line, { height: Math.max(1.5, 2 * scale), width: "86%", marginBottom: 3.5 * scale }]} />
      <View style={[docStyles.line, { height: Math.max(1.5, 2 * scale), width: "72%" }]} />
    </View>
  );
}

const docStyles = StyleSheet.create({
  page: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
  },
  accentBar: {
    backgroundColor: theme.accent,
    borderRadius: 1,
  },
  line: {
    backgroundColor: theme.border,
    borderRadius: 1,
    width: "100%",
  },
});

// ---------------------------------------------------------------------------
// PageStack — layered pages with typing lines and a caret (hero-adjacent).
// ---------------------------------------------------------------------------

const STACK_LINES = [
  { width: "92%", delay: "0.15s" },
  { width: "78%", delay: "0.45s" },
  { width: "86%", delay: "0.75s" },
  { width: "64%", delay: "1.05s" },
];

export function PageStack() {
  return (
    <MotionDiv cls={isWeb ? "dryn-page-float" : undefined} style={graphicsStyles.stackWrap}>
      <View style={graphicsStyles.stackBack} />
      <View style={graphicsStyles.stackMid} />
      <View style={graphicsStyles.stackFront}>
        <View style={graphicsStyles.stackAccent} />
        {STACK_LINES.map((l, i) => (
          <MotionDiv
            key={i}
            cls={isWeb ? "dryn-typing-line" : undefined}
            style={[graphicsStyles.stackLine, { width: l.width, animationDelay: isWeb ? l.delay : undefined } as ViewStyle]}
          />
        ))}
        <View style={graphicsStyles.stackCaretRow}>
          <View style={[graphicsStyles.stackLine, { width: 34, marginBottom: 0 }]} />
          <MotionDiv cls={isWeb ? "dryn-caret" : undefined} style={{ width: 2, height: 12 } as ViewStyle} />
        </View>
      </View>
    </MotionDiv>
  );
}

// ---------------------------------------------------------------------------
// FlowSteps — Choose → Answer → Generate → Review → Export.
// ---------------------------------------------------------------------------

export const FLOW_STEPS = [
  { num: "01", label: "Choose" },
  { num: "02", label: "Answer" },
  { num: "03", label: "Generate" },
  { num: "04", label: "Review" },
  { num: "05", label: "Export" },
];

export function FlowSteps() {
  return (
    <View style={graphicsStyles.flowRow}>
      {FLOW_STEPS.map((s, i) => (
        <React.Fragment key={s.num}>
          <View style={graphicsStyles.flowStep}>
            <View style={graphicsStyles.flowBadge}>
              <Text style={graphicsStyles.flowNum}>{s.num}</Text>
            </View>
            <Text style={graphicsStyles.flowLabel}>{s.label}</Text>
          </View>
          {i < FLOW_STEPS.length - 1 ? (
            <MotionDiv cls={isWeb ? "dryn-flow-line" : undefined} style={graphicsStyles.flowConnector} />
          ) : null}
        </React.Fragment>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// ExportChips — animated format indicators.
// ---------------------------------------------------------------------------

const EXPORT_FORMATS = ["PDF", "DOCX", "MD", "JSON", "XML", "YAML"];

export function ExportChips() {
  return (
    <View style={graphicsStyles.chipRow}>
      {EXPORT_FORMATS.map((f) => (
        <View key={f} style={graphicsStyles.chip}>
          <MotionDiv cls={isWeb ? "dryn-pulse-dot" : undefined} style={graphicsStyles.chipDot} />
          <Text style={graphicsStyles.chipText}>{f}</Text>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// GenerateLoader — polished generation/loading state.
// ---------------------------------------------------------------------------

export function GenerateLoader({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={graphicsStyles.loaderWrap}>
      <DocMark size={52} />
      <Text style={graphicsStyles.loaderTitle}>{title}</Text>
      <View style={graphicsStyles.loaderLines}>
        {[
          { width: "88%", delay: "0.1s" },
          { width: "66%", delay: "0.5s" },
          { width: "78%", delay: "0.9s" },
        ].map((l, i) => (
          <MotionDiv
            key={i}
            cls={isWeb ? "dryn-typing-line" : undefined}
            style={[graphicsStyles.loaderLine, { width: l.width, animationDelay: isWeb ? l.delay : undefined } as ViewStyle]}
          />
        ))}
      </View>
      <Text style={graphicsStyles.loaderSub}>{sub}</Text>
    </View>
  );
}

const graphicsStyles = StyleSheet.create({
  stackWrap: {
    width: 168,
    height: 208,
  },
  stackBack: {
    position: "absolute",
    left: 14,
    top: 0,
    width: 140,
    height: 184,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    opacity: 0.55,
  },
  stackMid: {
    position: "absolute",
    left: 7,
    top: 8,
    width: 140,
    height: 184,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    opacity: 0.8,
  },
  stackFront: {
    position: "absolute",
    left: 0,
    top: 16,
    width: 140,
    height: 184,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.borderLight,
    borderRadius: 8,
    padding: 14,
    ...theme.shadowSm,
  },
  stackAccent: {
    height: 4,
    width: "52%",
    backgroundColor: theme.accent,
    borderRadius: 2,
    marginBottom: 12,
  },
  stackLine: {
    height: 5,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 2,
    marginBottom: 8,
  },
  stackCaretRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  flowRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  flowStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
  },
  flowBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  flowNum: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10,
    color: "#FFFFFF",
  },
  flowLabel: {
    fontFamily: theme.font.sansMedium,
    fontSize: 13,
    color: theme.text,
  },
  flowConnector: {
    flex: 1,
    minWidth: 20,
    height: 2,
    backgroundColor: theme.border,
    borderRadius: 1,
    opacity: 0.8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.ok,
  },
  chipText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1,
    color: theme.textSecondary,
  },
  loaderWrap: {
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  loaderTitle: {
    fontFamily: theme.font.sansSemi,
    fontSize: 16,
    color: theme.text,
    textAlign: "center",
  },
  loaderLines: {
    width: "100%",
    maxWidth: 300,
    gap: 7,
  },
  loaderLine: {
    height: 6,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 3,
  },
  loaderSub: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.muted,
    textAlign: "center",
    lineHeight: 18,
  },
});
