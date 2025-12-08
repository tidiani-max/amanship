import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type OrderSuccessRouteProp = RouteProp<RootStackParamList, "OrderSuccess">;

export default function OrderSuccessScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<OrderSuccessRouteProp>();
  const { orderId } = route.params;

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.2, { damping: 8 }),
      withSpring(1, { damping: 12 })
    );
    opacity.value = withDelay(300, withSpring(1));
  }, []);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleTrackOrder = () => {
    navigation.replace("OrderTracking", { orderId });
  };

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Main" }],
    });
  };

  return (
    <ThemedView
      style={[
        styles.container,
        { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
      ]}
    >
      <View style={styles.content}>
        <Animated.View
          style={[styles.iconContainer, { backgroundColor: theme.success }, iconAnimatedStyle]}
        >
          <Feather name="check" size={64} color="#FFFFFF" />
        </Animated.View>
        
        <Animated.View style={[styles.textContent, contentAnimatedStyle]}>
          <View style={[styles.lightningBadge, { backgroundColor: theme.primary }]}>
            <Feather name="zap" size={20} color={theme.buttonText} />
          </View>
          
          <ThemedText type="h1" style={styles.title}>
            Order Placed!
          </ThemedText>
          
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Your order has been confirmed and is being prepared
          </ThemedText>
          
          <View style={[styles.orderIdContainer, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Order ID
            </ThemedText>
            <ThemedText type="h3">{orderId}</ThemedText>
          </View>
          
          <View style={styles.estimateContainer}>
            <Feather name="clock" size={20} color={theme.primary} />
            <View style={styles.estimateText}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Estimated Delivery
              </ThemedText>
              <ThemedText type="h2" style={{ color: theme.primary }}>
                15 minutes
              </ThemedText>
            </View>
          </View>
        </Animated.View>
      </View>
      
      <View style={styles.footer}>
        <Button onPress={handleTrackOrder}>Track Order</Button>
        <Button variant="text" onPress={handleGoHome}>
          Back to Home
        </Button>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xxl,
  },
  textContent: {
    alignItems: "center",
  },
  lightningBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  orderIdContainer: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    borderRadius: 12,
    marginBottom: Spacing.xl,
  },
  estimateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  estimateText: {
    alignItems: "flex-start",
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
});
