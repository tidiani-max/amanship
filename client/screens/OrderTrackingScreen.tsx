import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { mockRider } from "@/data/mockData";

type OrderTrackingRouteProp = RouteProp<RootStackParamList, "OrderTracking">;

const { width, height } = Dimensions.get("window");

export default function OrderTrackingScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const route = useRoute<OrderTrackingRouteProp>();
  const { orderId } = route.params;
  
  const [status, setStatus] = useState<"preparing" | "picked_up" | "on_the_way" | "arriving">("preparing");
  const pulseScale = useSharedValue(1);
  const riderPosition = useSharedValue(0);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );

    riderPosition.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 5000 }),
        withTiming(0, { duration: 5000 })
      ),
      -1,
      true
    );

    const statusTimer = setTimeout(() => {
      setStatus("picked_up");
    }, 3000);

    const statusTimer2 = setTimeout(() => {
      setStatus("on_the_way");
    }, 6000);

    const statusTimer3 = setTimeout(() => {
      setStatus("arriving");
    }, 10000);

    return () => {
      clearTimeout(statusTimer);
      clearTimeout(statusTimer2);
      clearTimeout(statusTimer3);
    };
  }, []);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const riderAnimatedStyle = useAnimatedStyle(() => ({
    left: 20 + riderPosition.value * (width - 80),
  }));

  const getStatusText = () => {
    switch (status) {
      case "preparing":
        return "Preparing your order";
      case "picked_up":
        return "Rider picked up your order";
      case "on_the_way":
        return "On the way to you";
      case "arriving":
        return "Almost there!";
      default:
        return "";
    }
  };

  const getTimeEstimate = () => {
    switch (status) {
      case "preparing":
        return "12-15 min";
      case "picked_up":
        return "10-12 min";
      case "on_the_way":
        return "5-8 min";
      case "arriving":
        return "1-2 min";
      default:
        return "";
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <View style={[styles.mapContainer, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.mapContent}>
          <View style={[styles.storePinContainer, { left: 20 }]}>
            <View style={[styles.storePin, { backgroundColor: theme.secondary }]}>
              <Feather name="shopping-bag" size={16} color="#FFFFFF" />
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Store
            </ThemedText>
          </View>
          
          <View style={[styles.routeLine, { backgroundColor: theme.primary + "40" }]} />
          
          <Animated.View style={[styles.riderPinContainer, riderAnimatedStyle]}>
            <Animated.View style={[styles.riderPulse, { backgroundColor: theme.primary + "30" }, pulseAnimatedStyle]} />
            <View style={[styles.riderPin, { backgroundColor: theme.primary }]}>
              <Feather name="truck" size={16} color={theme.buttonText} />
            </View>
          </Animated.View>
          
          <View style={[styles.destinationPinContainer, { right: 20 }]}>
            <View style={[styles.destinationPin, { backgroundColor: theme.success }]}>
              <Feather name="map-pin" size={16} color="#FFFFFF" />
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              You
            </ThemedText>
          </View>
        </View>
      </View>
      
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusBadge, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="zap" size={16} color={theme.primary} />
            <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600" }}>
              {getTimeEstimate()}
            </ThemedText>
          </View>
          <ThemedText type="h3">{getStatusText()}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Order {orderId}
          </ThemedText>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <View style={[styles.progressDot, { backgroundColor: theme.success }]}>
              <Feather name="check" size={12} color="#FFFFFF" />
            </View>
            <ThemedText type="small">Confirmed</ThemedText>
          </View>
          <View style={[styles.progressLine, { backgroundColor: status !== "preparing" ? theme.success : theme.border }]} />
          <View style={styles.progressStep}>
            <View style={[
              styles.progressDot,
              { backgroundColor: status !== "preparing" ? theme.success : theme.border }
            ]}>
              {status !== "preparing" ? (
                <Feather name="check" size={12} color="#FFFFFF" />
              ) : null}
            </View>
            <ThemedText type="small">Picked Up</ThemedText>
          </View>
          <View style={[styles.progressLine, { backgroundColor: status === "on_the_way" || status === "arriving" ? theme.success : theme.border }]} />
          <View style={styles.progressStep}>
            <View style={[
              styles.progressDot,
              { backgroundColor: status === "arriving" ? theme.success : theme.border }
            ]}>
              {status === "arriving" ? (
                <Feather name="check" size={12} color="#FFFFFF" />
              ) : null}
            </View>
            <ThemedText type="small">Delivered</ThemedText>
          </View>
        </View>
        
        <Card style={styles.riderCard}>
          <View style={styles.riderInfo}>
            <View style={[styles.riderAvatar, { backgroundColor: theme.primary }]}>
              <ThemedText type="h3" style={{ color: theme.buttonText }}>
                {mockRider.name.charAt(0)}
              </ThemedText>
            </View>
            <View style={styles.riderDetails}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {mockRider.name}
              </ThemedText>
              <View style={styles.riderRating}>
                <Feather name="star" size={14} color={theme.primary} />
                <ThemedText type="caption">{mockRider.rating}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  • {mockRider.vehicleNumber}
                </ThemedText>
              </View>
            </View>
            <Pressable
              style={[styles.callButton, { backgroundColor: theme.success }, Shadows.small]}
            >
              <Feather name="phone" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 0.55,
    justifyContent: "center",
  },
  mapContent: {
    height: 60,
    marginHorizontal: Spacing.lg,
    position: "relative",
  },
  storePinContainer: {
    position: "absolute",
    alignItems: "center",
    top: 0,
  },
  storePin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  routeLine: {
    position: "absolute",
    height: 4,
    left: 40,
    right: 40,
    top: 14,
    borderRadius: 2,
  },
  riderPinContainer: {
    position: "absolute",
    alignItems: "center",
    top: -4,
  },
  riderPulse: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    top: -5,
  },
  riderPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  destinationPinContainer: {
    position: "absolute",
    alignItems: "center",
    top: 0,
  },
  destinationPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  bottomPanel: {
    flex: 0.45,
    backgroundColor: "transparent",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  statusHeader: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  progressStep: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  progressLine: {
    width: 40,
    height: 3,
    marginHorizontal: Spacing.xs,
    marginBottom: 20,
    borderRadius: 1.5,
  },
  riderCard: {},
  riderInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  riderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  riderDetails: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  riderRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
