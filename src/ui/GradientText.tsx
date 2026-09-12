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
    const { fontFamily, fontSize, lineHeight, letterSpacing, fontWeight, textAlign, marginBottom } = flat;
    return createElement(
      "span",
      {
        className: "dryn-gradient",
        style: {
          fontFamily,
          fontSize,
          lineHeight,
          letterSpacing,
          fontWeight,
          textAlign,
          marginBottom,
          display: "block",
        } as React.CSSProperties,
      },
      children,
    );
  }
  return <Text style={[style, { color: "#2F6BFF" }]}>{children}</Text>;
}
