import React, { ReactNode } from "react";
import { StyleSheet, Pressable, ViewStyle, StyleProp, ActivityIndicator } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

interface ButtonProps {
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  loading?: boolean;
  // 1. Added "outline" to the variant type definition
  variant?: "primary" | "secondary" | "text" | "outline"; 
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  onPress,
  children,
  style,
  disabled = false,
  loading = false,
  variant = "primary",
}: ButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.98, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const getBackgroundColor = () => {
    if (variant === "primary") return theme.primary;
    // Outline and Text variants should have transparent backgrounds
    if (variant === "outline" || variant === "text") return "transparent";
    if (variant === "secondary") return theme.backgroundDefault; 
    return "transparent";
  };

  const getBorderStyle = () => {
    // 2. Define the border for the outline variant
    if (variant === "outline") {
      return {
        borderWidth: 1,
        borderColor: theme.primary,
      };
    }
    if (variant === "secondary") {
      return {
        borderWidth: 1,
        borderColor: theme.border,
      };
    }
    return {};
  };

  const getTextColor = () => {
    if (variant === "primary") return theme.buttonText;
    if (variant === "outline") return theme.primary; // Text matches border color
    if (variant === "secondary") return theme.text;
    return theme.primary;
  };

  return (
    <AnimatedPressable
      onPress={(disabled || loading) ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          opacity: (disabled || loading) ? 0.6 : 1,
        },
        getBorderStyle(),
        variant === "text" && styles.textButton,
        style,
        animatedStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <ThemedText
          type="button"
          style={[styles.buttonText, { color: getTextColor() }]}
        >
          {children}
        </ThemedText>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48, // Standard height if Spacing.buttonHeight isn't defined
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  textButton: {
    height: "auto",
    paddingHorizontal: 0,
    paddingVertical: Spacing.sm,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});