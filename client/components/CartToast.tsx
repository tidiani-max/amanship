import React, { useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CartToastProps {
  visible: boolean;
  productName: string;
  onDismiss: () => void;
}

export function CartToast({ visible, productName, onDismiss }: CartToastProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  
  const translateY = useSharedValue(150);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      opacity.value = withTiming(1, { duration: 200 });
      
      const timer = setTimeout(() => {
        dismissToast();
      }, 4000);
      
      return () => clearTimeout(timer);
    } else {
      translateY.value = withSpring(150);
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const dismissToast = () => {
    translateY.value = withTiming(150, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onDismiss)();
    });
  };

  const handleGoToCart = () => {
    dismissToast();
    setTimeout(() => {
      navigation.navigate("Cart");
    }, 100);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: insets.bottom + 100,
          backgroundColor: theme.cardBackground,
        },
        Shadows.medium,
        animatedStyle,
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.success + "20" }]}>
        <Feather name="check" size={20} color={theme.success} />
      </View>
      
      <View style={styles.textContainer}>
        <ThemedText type="body" style={{ fontWeight: "600" }} numberOfLines={1}>
          {t.product.addedToCart}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary }} numberOfLines={1}>
          {productName}
        </ThemedText>
      </View>
      
      <Pressable
        style={[styles.cartButton, { backgroundColor: theme.primary }]}
        onPress={handleGoToCart}
      >
        <Feather name="shopping-cart" size={16} color={theme.buttonText} />
        <ThemedText type="small" style={{ color: theme.buttonText, fontWeight: "600", marginLeft: 4 }}>
          {t.cart.title}
        </ThemedText>
      </Pressable>
      
      <Pressable style={styles.closeButton} onPress={dismissToast}>
        <Feather name="x" size={18} color={theme.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    borderRadius: BorderRadius.md,
    zIndex: 1000,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  cartButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  closeButton: {
    padding: Spacing.sm,
  },
});
