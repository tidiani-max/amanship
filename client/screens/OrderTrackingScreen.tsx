// app/screens/OrderTrackingScreen.tsx
// Works with Expo Go - no react-native-maps needed!

import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { CallButton } from "@/components/CallButton";

type OrderTrackingRouteProp = RouteProp<RootStackParamList, "OrderTracking">;

export default function OrderTrackingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const route = useRoute<OrderTrackingRouteProp>();
  const { orderId } = route.params;

  // Fetch order details
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: async () => {
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/orders/${orderId}`);
      if (!response.ok) throw new Error("Order not found");
      return response.json();
    },
    refetchInterval: 5000,
  });

  // Fetch driver location (real-time polling)
  const { data: driverData } = useQuery({
    queryKey: ["driver-location", orderId],
    queryFn: async () => {
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/driver/location/${orderId}`);
      return response.json();
    },
    refetchInterval: 3000, // Update every 3 seconds
    enabled: order?.status === "delivering",
  });

  if (orderLoading || !order) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={{ marginTop: 10 }}>Loading order details...</ThemedText>
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
      case "preparing": return "Preparing your order";
      case "picked_up": return "Rider picked up";
      case "on_the_way": return "Rider is on the way";
      case "arriving": return "Almost there!";
      default: return "Processing";
    }
  };

  const getTimeEstimate = () => {
    if (driverData?.estimatedArrival) {
      const eta = new Date(driverData.estimatedArrival);
      const now = new Date();
      const diff = Math.ceil((eta.getTime() - now.getTime()) / 60000);
      return diff > 0 ? `${diff} min` : "Arriving now";
    }
    
    switch (status) {
      case "preparing": return "12-15 min";
      case "picked_up": return "10-12 min";
      case "on_the_way": return "5-8 min";
      case "arriving": return "1-2 min";
      default: return "-- min";
    }
  };

  const showMessageButton = order.status === "delivering" && order.driverId;
  const hasDriverLocation = driverData?.hasLocation && driverData.location;

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      {/* Visual Map Representation */}
      <View style={[styles.mapContainer, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.visualMap}>
          {/* Store Icon */}
          <View style={styles.visualPin}>
            <View style={[styles.storePinIcon, { backgroundColor: theme.secondary }]}>
              <Feather name="shopping-bag" size={20} color="#fff" />
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }}>
              Store
            </ThemedText>
          </View>

          {/* Route Line */}
          <View style={[styles.routeLine, { backgroundColor: theme.primary + "40" }]} />

          {/* Driver Icon (animated) */}
          {hasDriverLocation && (
            <View style={styles.visualPin}>
              <View style={[styles.driverPinIcon, { backgroundColor: theme.primary }]}>
                <Feather name="truck" size={20} color="#fff" />
              </View>
              <ThemedText type="small" style={{ color: theme.primary, marginTop: 4, fontWeight: "600" }}>
                {driverData.distance.toFixed(1)} km
              </ThemedText>
            </View>
          )}

          {/* Destination Icon */}
          <View style={styles.visualPin}>
            <View style={[styles.destPinIcon, { backgroundColor: theme.success }]}>
              <Feather name="home" size={20} color="#fff" />
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }}>
              You
            </ThemedText>
          </View>
        </View>

        {/* GPS Accuracy Badge */}
        {hasDriverLocation && driverData.location.accuracy && (
          <View style={[styles.accuracyBadge, { backgroundColor: theme.cardBackground }]}>
            <Feather name="crosshair" size={12} color="#10b981" />
            <ThemedText style={styles.accuracyText}>
              GPS: ±{Math.round(driverData.location.accuracy)}m
            </ThemedText>
          </View>
        )}

        {/* Speed Badge */}
        {hasDriverLocation && driverData.location.speed && (
          <View style={[styles.speedBadge, { backgroundColor: theme.cardBackground }]}>
            <Feather name="navigation" size={12} color={theme.primary} />
            <ThemedText style={[styles.accuracyText, { color: theme.primary }]}>
              {Math.round(driverData.location.speed * 3.6)} km/h
            </ThemedText>
          </View>
        )}
      </View>

      {/* Bottom Panel */}
      <ScrollView 
        style={styles.bottomPanel}
        contentContainerStyle={{
          paddingBottom: insets.bottom + Spacing.lg,
          paddingHorizontal: Spacing.lg,
          paddingTop: Spacing.lg,
        }}
      >
        {/* Status Header */}
        <View style={styles.statusHeader}>
          <View style={[styles.statusBadge, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="zap" size={16} color={theme.primary} />
            <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600" }}>
              {getTimeEstimate()}
            </ThemedText>
          </View>
          <ThemedText type="h3">{getStatusText()}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Order #{order.orderNumber}
          </ThemedText>

          {/* Distance to Customer */}
          {hasDriverLocation && (
            <View style={styles.distanceBadge}>
              <Feather name="navigation" size={14} color={theme.success} />
              <ThemedText type="caption" style={{ color: theme.success, fontWeight: "600" }}>
                {driverData.distance.toFixed(1)} km away
              </ThemedText>
            </View>
          )}
        </View>

        {/* Progress Tracker */}
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

        {/* Driver Info Card */}
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
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Flash Courier Partner
              </ThemedText>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
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

        {/* Delivery PIN */}
        <Card style={styles.pinCard}>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: 4 }}>
            Delivery PIN Code
          </ThemedText>
          <ThemedText type="h1" style={{ letterSpacing: 8, color: theme.primary }}>
            {order.deliveryPin}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }}>
            Share this code with the driver upon arrival
          </ThemedText>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  mapContainer: { 
    flex: 0.4, 
    justifyContent: "center", 
    alignItems: "center",
    position: 'relative',
  },
  visualMap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '90%',
    paddingVertical: 20,
  },
  visualPin: {
    alignItems: 'center',
  },
  storePinIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  driverPinIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  destPinIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  routeLine: {
    position: 'absolute',
    height: 4,
    left: '15%',
    right: '15%',
    borderRadius: 2,
  },
  accuracyBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  speedBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  accuracyText: { fontSize: 12, fontWeight: '600', color: '#065f46' },
  bottomPanel: { flex: 0.6 },
  statusHeader: { alignItems: "center", marginBottom: Spacing.xl },
  statusBadge: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: Spacing.md, 
    paddingVertical: Spacing.xs, 
    borderRadius: BorderRadius.xs, 
    gap: Spacing.xs, 
    marginBottom: Spacing.sm 
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  progressContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  progressStep: { alignItems: 'center' },
  progressDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  progressLine: { width: 60, height: 2, marginHorizontal: 8 },
  progressLabel: { fontSize: 10 },
  riderCard: { padding: 12, marginBottom: Spacing.md },
  riderInfo: { flexDirection: "row", alignItems: "center" },
  riderAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  riderDetails: { flex: 1, marginLeft: Spacing.md },
  actionBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  pinCard: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 2,
    borderColor: '#10b981',
  },
});