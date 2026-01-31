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
  noTranslate?: boolean; // Option to disable auto-translate
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

  // Auto-translate text children
  const translatedChildren = React.useMemo(() => {
    if (noTranslate || typeof children !== 'string') {
      return children;
    }
    return autoTranslate(children, language);
  }, [children, language, noTranslate]);

  return (
    <Text style={[{ color: getColor() }, getTypeStyle(), style]} {...rest}>
      {translatedChildren}
    </Text>
  );
}