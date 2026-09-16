import React, { createElement } from "react";
import { Platform, StyleSheet, Text, type TextStyle } from "react-native";

/**
 * Animated-gradient headline text.
 *
 * On web this renders a plain <span> styled by the `.dryn-gradient` CSS
 * animation (defined once in app/+html.tsx), because React Native styles
 * cannot express background-clip text gradients. On native it falls back to
 * solid accent text. Animation is disabled under
 * `prefers-reduced-motion` by the CSS itself.
 */
export function GradientText({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
}) {
  if (Platform.OS === "web") {
    const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
    const {
      fontFamily,
      fontSize,
      lineHeight,
      letterSpacing,
      fontWeight,
      textAlign,
      marginBottom,
      marginTop,
    } = flat;

    const computedLineHeight =
      typeof lineHeight === "number"
        ? `${lineHeight}px`
        : (lineHeight ?? "1.1");

    const computedFontSize =
      typeof fontSize === "number"
        ? `${fontSize}px`
        : fontSize;

    const computedLetterSpacing =
      typeof letterSpacing === "number"
        ? `${letterSpacing}px`
        : letterSpacing;

    const computedMarginBottom =
      typeof marginBottom === "number"
        ? `${marginBottom}px`
        : marginBottom;

    const computedMarginTop =
      typeof marginTop === "number"
        ? `${marginTop}px`
        : marginTop;

    return createElement(
      "span",
      {
        className: "dryn-gradient",
        style: {
          fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: computedFontSize,
          lineHeight: computedLineHeight,
          letterSpacing: computedLetterSpacing,
          fontWeight: fontWeight ?? 700,
          textAlign: textAlign ?? "inherit",
          marginBottom: computedMarginBottom,
          marginTop: computedMarginTop,
          display: "block",
        } as React.CSSProperties,
      },
      children,
    );
  }
  return <Text style={[style, { color: "#2F6BFF" }]}>{children}</Text>;
}
