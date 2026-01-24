import React, { useEffect } from "react";
import { View, StyleSheet, Pressable, Dimensions, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
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
import { useLanguage } from "@/context/LanguageContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useQuery } from "@tanstack/react-query";
import { CallButton } from "@/components/CallButton";

type OrderTrackingRouteProp = RouteProp<RootStackParamList, "OrderTracking">;

export default function OrderTrackingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const route = useRoute<OrderTrackingRouteProp>();
  const { orderId } = route.params;
  const { width } = Dimensions.get("window");

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: async () => {
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/orders/${orderId}`);
      if (!response.ok) throw new Error("Order not found");
      return response.json();
    },
    refetchInterval: 5000,
  });

  const pulseScale = useSharedValue(1);
  const riderPosition = useSharedValue(0);

  useEffect(() => {
    if (!order) return;

    const s = order.status;
    const isDelivering = s === "delivering";

    pulseScale.value = withRepeat(
      withSequence(withTiming(1.2, { duration: 1000 }), withTiming(1, { duration: 1000 })),
      -1,
      true
    );

    if (isDelivering) {
      riderPosition.value = withRepeat(
        withSequence(withTiming(1, { duration: 5000 }), withTiming(0, { duration: 5000 })),
        -1,
        true
      );
    } else {
      riderPosition.value = 0;
    }
  }, [order?.status]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const riderAnimatedStyle = useAnimatedStyle(() => ({
    left: 20 + riderPosition.value * (width - 80),
  }));

  if (isLoading || !order) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={{ marginTop: 10 }}>Updating status...</ThemedText>
      </View>
    );
  }

  const getUIStatus = () => {
    const s = order.status;
    if (s === "pending" || s === "picking") return "preparing";
    if (s === "packed") return "picked_up";
    if (s === "delivering") return "on_the_way";
    if (s === "delivered") return "arriving";
    return "preparing";
  };

  const status = getUIStatus();

  const getStatusText = () => {
    switch (status) {
      case "preparing": return t.tracking?.preparingOrder || "Preparing your order";
      case "picked_up": return t.tracking?.riderPickedUp || "Rider picked up";
      case "on_the_way": return t.tracking?.onTheWayToYou || "Rider is on the way";
      case "arriving": return t.tracking?.almostThere || "Almost there!";
      default: return "Processing";
    }
  };

  const getTimeEstimate = () => {
    switch (status) {
      case "preparing": return "12-15 min";
      case "picked_up": return "10-12 min";
      case "on_the_way": return "5-8 min";
      case "arriving": return "1-2 min";
      default: return "-- min";
    }
  };

  // ✅ Only show message button if driver has picked up the order (delivering status)
  const showMessageButton = order.status === "delivering" && order.driverId;

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <View style={[styles.mapContainer, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.mapContent}>
          <View style={[styles.storePinContainer, { left: 20 }]}>
            <View style={[styles.storePin, { backgroundColor: theme.secondary }]}>
              <Feather name="shopping-bag" size={16} color="#FFFFFF" />
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Store</ThemedText>
          </View>
          <View style={[styles.routeLine, { backgroundColor: theme.primary + "40" }]} />
          <Animated.View style={[styles.riderPinContainer, riderAnimatedStyle]}>
            <Animated.View style={[styles.riderPulse, { backgroundColor: theme.primary + "30" }, pulseAnimatedStyle]} />
            <View style={[styles.riderPin, { backgroundColor: theme.primary }]}>
              <Feather name="truck" size={16} color="#FFFFFF" />
            </View>
          </Animated.View>
          <View style={[styles.destinationPinContainer, { right: 20 }]}>
            <View style={[styles.destinationPin, { backgroundColor: theme.success }]}>
              <Feather name="map-pin" size={16} color="#FFFFFF" />
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>You</ThemedText>
          </View>
        </View>
      </View>

      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusBadge, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="zap" size={16} color={theme.primary} />
            <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600" }}>{getTimeEstimate()}</ThemedText>
          </View>
          <ThemedText type="h3">{getStatusText()}</ThemedText>
          {/* ✅ Display orderNumber instead of UUID */}
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Order #{order.orderNumber}
          </ThemedText>
        </View>

        {/* ✅ Progress Tracker */}
        <View style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <View style={[styles.progressDot, { backgroundColor: theme.success }]}>
              <Feather name="check" size={12} color="#FFF" />
            </View>
            <ThemedText type="small" style={styles.progressLabel}>Confirmed</ThemedText>
          </View>

          <View style={[styles.progressLine, { 
            backgroundColor: ["picked_up", "on_the_way", "arriving"].includes(status) 
              ? theme.success : theme.border 
          }]} />

          <View style={styles.progressStep}>
            <View style={[styles.progressDot, { 
              backgroundColor: ["picked_up", "on_the_way", "arriving"].includes(status)
                ? theme.success : theme.border 
            }]}>
              {["picked_up", "on_the_way", "arriving"].includes(status) && (
                <Feather name="check" size={12} color="#FFF" />
              )}
            </View>
            <ThemedText type="small" style={styles.progressLabel}>Picked Up</ThemedText>
          </View>

          <View style={[styles.progressLine, { 
            backgroundColor: status === "arriving" ? theme.success : theme.border 
          }]} />

          <View style={styles.progressStep}>
            <View style={[styles.progressDot, { 
              backgroundColor: status === "arriving" ? theme.success : theme.border 
            }]}>
              {status === "arriving" && <Feather name="check" size={12} color="#FFF" />}
            </View>
            <ThemedText type="small" style={styles.progressLabel}>Delivered</ThemedText>
          </View>
        </View>

        <Card style={styles.riderCard}>
          <View style={styles.riderInfo}>
            <View style={[styles.riderAvatar, { backgroundColor: theme.primary }]}>
              <ThemedText type="h3" style={{ color: '#FFF' }}>
                {order.driverName?.charAt(0) || "D"}
              </ThemedText>
            </View>
            <View style={styles.riderDetails}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {order.driverName || "Finding Driver..."}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>Flash Courier Partner</ThemedText>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* ✅ Only show message button if driver has picked up */}
              {showMessageButton && (
                <Pressable 
                  onPress={() => navigation.navigate("Chat", { orderId: order.id })}
                  style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                >
                  <Feather name="message-square" size={20} color="#FFFFFF" />
                </Pressable>
              )}
              {order.driverPhone && <CallButton phoneNumber={order.driverPhone} />}
            </View>
          </View>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  mapContainer: { flex: 0.55, justifyContent: "center" },
  mapContent: { height: 60, marginHorizontal: Spacing.lg, position: "relative" },
  storePinContainer: { position: "absolute", alignItems: "center", top: 0 },
  storePin: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  routeLine: { position: "absolute", height: 4, left: 40, right: 40, top: 14, borderRadius: 2 },
  riderPinContainer: { position: "absolute", alignItems: "center", top: -4 },
  riderPulse: { position: "absolute", width: 50, height: 50, borderRadius: 25, top: -5 },
  riderPin: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  destinationPinContainer: { position: "absolute", alignItems: "center", top: 0 },
  destinationPin: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  bottomPanel: { flex: 0.45, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  statusHeader: { alignItems: "center", marginBottom: Spacing.xl },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.xs, gap: Spacing.xs, marginBottom: Spacing.sm },
  progressContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  progressStep: { alignItems: 'center' },
  progressDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  progressLine: { width: 60, height: 2, marginHorizontal: 8 },
  progressLabel: { fontSize: 10 },
  riderCard: { padding: 12 },
  riderInfo: { flexDirection: "row", alignItems: "center" },
  riderAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  riderDetails: { flex: 1, marginLeft: Spacing.md },
  actionBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});