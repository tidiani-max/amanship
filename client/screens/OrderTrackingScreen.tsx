// app/screens/OrderTrackingScreen.tsx
// Real-time animated map with driver movement tracking

import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, ScrollView, Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Svg, { Line, Circle, Path } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { CallButton } from "@/components/CallButton";

type OrderTrackingRouteProp = RouteProp<RootStackParamList, "OrderTracking">;

const MAP_WIDTH = 350;
const MAP_HEIGHT = 200;

export default function OrderTrackingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const route = useRoute<OrderTrackingRouteProp>();
  const { orderId } = route.params;

  // Animation values
  const driverX = useRef(new Animated.Value(0)).current;
  const driverY = useRef(new Animated.Value(0)).current;
  const driverRotation = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

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

  // Animate driver position when location updates
  useEffect(() => {
    if (!driverData?.hasLocation) return;

    const distance = driverData.distance || 5;
    const maxDistance = 5; // 5km max display range
    
    // Calculate position (0 = store, 100 = customer)
    const progress = Math.max(0, Math.min(100, ((maxDistance - distance) / maxDistance) * 100));
    
    const targetX = (progress / 100) * (MAP_WIDTH - 60) + 30;
    const targetY = MAP_HEIGHT / 2 + (Math.sin(progress / 20) * 20); // Slight wave for realistic path

    // Smooth animation to new position
    Animated.parallel([
      Animated.spring(driverX, {
        toValue: targetX,
        friction: 10,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(driverY, {
        toValue: targetY,
        friction: 10,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(driverRotation, {
        toValue: driverData.location.heading || 90,
        duration: 500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [driverData?.location, driverData?.distance]);

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
      {/* Animated Map */}
      <View style={[styles.mapContainer, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.mapWrapper}>
          <Svg width={MAP_WIDTH} height={MAP_HEIGHT} style={styles.map}>
            {/* Background Grid */}
            <Line x1="0" y1={MAP_HEIGHT/3} x2={MAP_WIDTH} y2={MAP_HEIGHT/3} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" />
            <Line x1="0" y1={MAP_HEIGHT*2/3} x2={MAP_WIDTH} y2={MAP_HEIGHT*2/3} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" />
            
            {/* Road/Path */}
            <Path
              d={`M 30 ${MAP_HEIGHT/2} Q ${MAP_WIDTH/2} ${MAP_HEIGHT/2 - 20} ${MAP_WIDTH - 30} ${MAP_HEIGHT/2}`}
              stroke="#d1d5db"
              strokeWidth="20"
              fill="none"
            />
            <Path
              d={`M 30 ${MAP_HEIGHT/2} Q ${MAP_WIDTH/2} ${MAP_HEIGHT/2 - 20} ${MAP_WIDTH - 30} ${MAP_HEIGHT/2}`}
              stroke="#10b981"
              strokeWidth="4"
              fill="none"
              strokeDasharray="8,8"
            />
            
            {/* Store Pin */}
            <Circle cx="30" cy={MAP_HEIGHT/2} r="16" fill="#f59e0b" />
            <Circle cx="30" cy={MAP_HEIGHT/2} r="12" fill="#fff" />
            
            {/* Destination Pin */}
            <Circle cx={MAP_WIDTH - 30} cy={MAP_HEIGHT/2} r="16" fill="#10b981" />
            <Circle cx={MAP_WIDTH - 30} cy={MAP_HEIGHT/2} r="12" fill="#fff" />
          </Svg>

          {/* Animated Driver Icon */}
          {hasDriverLocation && (
            <Animated.View
              style={[
                styles.driverIcon,
                {
                  transform: [
                    { translateX: driverX },
                    { translateY: driverY },
                    { rotate: driverRotation.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    })},
                  ],
                },
              ]}
            >
              {/* Pulse Effect */}
              <Animated.View
                style={[
                  styles.driverPulse,
                  {
                    transform: [{ scale: pulseScale }],
                    backgroundColor: theme.primary + '30',
                  },
                ]}
              />
              {/* Driver Bike */}
              <View style={[styles.driverMarker, { backgroundColor: theme.primary }]}>
                <Feather name="navigation" size={20} color="#fff" />
              </View>
            </Animated.View>
          )}
        </View>

        {/* Map Labels */}
        <View style={styles.mapLabels}>
          <View style={styles.mapLabel}>
            <View style={[styles.labelDot, { backgroundColor: '#f59e0b' }]} />
            <ThemedText type="small">Store</ThemedText>
          </View>
          <View style={styles.mapLabel}>
            <View style={[styles.labelDot, { backgroundColor: '#10b981' }]} />
            <ThemedText type="small">Your Location</ThemedText>
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
    paddingVertical: 20,
  },
  mapWrapper: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    position: 'relative',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  map: {
    borderRadius: 16,
  },
  driverIcon: {
    position: 'absolute',
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverPulse: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  mapLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: MAP_WIDTH,
    marginTop: 12,
  },
  mapLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
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