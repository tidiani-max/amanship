import { Text, type TextProps } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { Typography } from "@/constants/theme";
import { autoTranslate } from "@/lib/auto-translate";
import React, { useMemo } from "react";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "h1" | "h2" | "h3" | "body" | "caption" | "button" | "small" | "link";
  noTranslate?: boolean;
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "body",
  children,
  noTranslate = false,
  ...rest
}: ThemedTextProps) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();

  const getColor = () => {
    if (isDark && darkColor) return darkColor;
    if (!isDark && lightColor) return lightColor;
    if (type === "link") return theme.link;
    return theme.text;
  };

  const getTypeStyle = () => {
    switch (type) {
      case "h1": return Typography.h1;
      case "h2": return Typography.h2;
      case "h3": return Typography.h3;
      case "body": return Typography.body;
      case "caption": return Typography.caption;
      case "button": return Typography.button;
      case "small": return Typography.small;
      case "link": return Typography.body;
      default: return Typography.body;
    }
  };

  /**
   * SAFETY LOGIC: 
   * 1. If noTranslate is active, return original.
   * 2. If children isn't a string, return original.
   * 3. If autoTranslate returns an empty result, fallback to original children.
   */
  const translatedChildren = useMemo(() => {
    if (noTranslate || typeof children !== 'string' || !children.trim()) {
      return children;
    }

    try {
      const result = autoTranslate(children, language);
      // If result is null/undefined/empty, we MUST show the original children
      return result && result.length > 0 ? result : children;
    } catch (error) {
      console.warn("Translation failed for:", children);
      return children;
    }
  }, [children, language, noTranslate]);

  return (
    <Text 
      style={[{ color: getColor() }, getTypeStyle(), style]} 
      {...rest}
    >
      {translatedChildren}
    </Text>
  );
}