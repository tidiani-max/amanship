// app/screens/OrderTrackingScreen.tsx
// Grab-style full-screen map with bottom sheet

import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Animated, Dimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Svg, { Line, Circle, Path, Defs, LinearGradient, Stop } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { CallButton } from "@/components/CallButton";

type OrderTrackingRouteProp = RouteProp<RootStackParamList, "OrderTracking">;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_HEIGHT = 420;
const BOTTOM_SHEET_MIN_HEIGHT = 120;

export default function OrderTrackingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const route = useRoute<OrderTrackingRouteProp>();
  const { orderId } = route.params;

  // Bottom sheet animation
  const sheetY = useRef(new Animated.Value(SCREEN_HEIGHT - BOTTOM_SHEET_HEIGHT - insets.bottom)).current;
  const [isExpanded, setIsExpanded] = useState(true);

  // Driver animation values
  const driverX = useRef(new Animated.Value(SCREEN_WIDTH * 0.2)).current;
  const driverY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.5)).current;
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

  // Fetch driver location
  const { data: driverData } = useQuery({
    queryKey: ["driver-location", orderId],
    queryFn: async () => {
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/driver/location/${orderId}`);
      return response.json();
    },
    refetchInterval: 3000,
    enabled: order?.status === "delivering",
  });

  // Toggle bottom sheet
  const toggleSheet = () => {
    const targetY = isExpanded 
      ? SCREEN_HEIGHT - BOTTOM_SHEET_MIN_HEIGHT - insets.bottom
      : SCREEN_HEIGHT - BOTTOM_SHEET_HEIGHT - insets.bottom;

    Animated.spring(sheetY, {
      toValue: targetY,
      tension: 50,
      friction: 10,
      useNativeDriver: true,
    }).start();
    
    setIsExpanded(!isExpanded);
  };

  // Animate driver position
  useEffect(() => {
    if (!driverData?.hasLocation) return;

    const distance = driverData.distance || 5;
    const maxDistance = 5;
    const progress = Math.max(0, Math.min(1, (maxDistance - distance) / maxDistance));
    
    const targetX = SCREEN_WIDTH * 0.2 + (SCREEN_WIDTH * 0.6 * progress);
    const targetY = SCREEN_HEIGHT * 0.4 + (Math.sin(progress * Math.PI) * 50);

    Animated.parallel([
      Animated.spring(driverX, {
        toValue: targetX,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(driverY, {
        toValue: targetY,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [driverData?.location, driverData?.distance]);

  if (orderLoading || !order) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={{ marginTop: 10 }}>Loading...</ThemedText>
      </View>
    );
  }

  const getTimeEstimate = () => {
    if (driverData?.estimatedArrival) {
      const eta = new Date(driverData.estimatedArrival);
      const now = new Date();
      const diff = Math.ceil((eta.getTime() - now.getTime()) / 60000);
      return diff > 0 ? `${diff} min` : "Arriving now";
    }
    return "15 min";
  };

  const getStatusText = () => {
    const s = order.status;
    if (s === "pending" || s === "picking") return "Preparing your order";
    if (s === "packed") return "Ready for pickup";
    if (s === "delivering") return "Driver is on the way";
    if (s === "delivered") return "Order delivered";
    return "Processing";
  };

  const hasDriverLocation = driverData?.hasLocation && driverData.location;
  const showDriverInfo = order.status === "delivering" && order.driverId;

  return (
    <View style={styles.container}>
      {/* Full-screen Map */}
      <View style={styles.mapContainer}>
        <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={styles.map}>
          <Defs>
            <LinearGradient id="roadGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#e5e7eb" stopOpacity="0.5" />
              <Stop offset="1" stopColor="#d1d5db" stopOpacity="0.8" />
            </LinearGradient>
          </Defs>

          {/* Background Grid */}
          {[...Array(8)].map((_, i) => (
            <Line
              key={`h-${i}`}
              x1="0"
              y1={(SCREEN_HEIGHT / 8) * i}
              x2={SCREEN_WIDTH}
              y2={(SCREEN_HEIGHT / 8) * i}
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          ))}
          {[...Array(6)].map((_, i) => (
            <Line
              key={`v-${i}`}
              x1={(SCREEN_WIDTH / 6) * i}
              y1="0"
              x2={(SCREEN_WIDTH / 6) * i}
              y2={SCREEN_HEIGHT}
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          ))}

          {/* Route Path */}
          <Path
            d={`M ${SCREEN_WIDTH * 0.2} ${SCREEN_HEIGHT * 0.5} 
                Q ${SCREEN_WIDTH * 0.5} ${SCREEN_HEIGHT * 0.35} 
                ${SCREEN_WIDTH * 0.8} ${SCREEN_HEIGHT * 0.5}`}
            stroke="url(#roadGradient)"
            strokeWidth="40"
            fill="none"
            opacity="0.6"
          />
          <Path
            d={`M ${SCREEN_WIDTH * 0.2} ${SCREEN_HEIGHT * 0.5} 
                Q ${SCREEN_WIDTH * 0.5} ${SCREEN_HEIGHT * 0.35} 
                ${SCREEN_WIDTH * 0.8} ${SCREEN_HEIGHT * 0.5}`}
            stroke="#10b981"
            strokeWidth="6"
            fill="none"
            strokeDasharray="12,8"
            strokeLinecap="round"
          />

          {/* Store Pin (with shadow) */}
          <Circle cx={SCREEN_WIDTH * 0.2} cy={SCREEN_HEIGHT * 0.5} r="28" fill="#f59e0b" opacity="0.2" />
          <Circle cx={SCREEN_WIDTH * 0.2} cy={SCREEN_HEIGHT * 0.5} r="22" fill="#f59e0b" />
          <Circle cx={SCREEN_WIDTH * 0.2} cy={SCREEN_HEIGHT * 0.5} r="16" fill="#fff" />

          {/* Destination Pin (with shadow) */}
          <Circle cx={SCREEN_WIDTH * 0.8} cy={SCREEN_HEIGHT * 0.5} r="28" fill="#10b981" opacity="0.2" />
          <Circle cx={SCREEN_WIDTH * 0.8} cy={SCREEN_HEIGHT * 0.5} r="22" fill="#10b981" />
          <Circle cx={SCREEN_WIDTH * 0.8} cy={SCREEN_HEIGHT * 0.5} r="16" fill="#fff" />
        </Svg>

        {/* Animated Driver Marker */}
        {hasDriverLocation && (
          <Animated.View
            style={[
              styles.driverMarkerContainer,
              {
                transform: [
                  { translateX: driverX },
                  { translateY: driverY },
                ],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.driverPulse,
                { transform: [{ scale: pulseScale }] },
              ]}
            />
            <View style={styles.driverMarker}>
              <Feather name="navigation" size={24} color="#fff" />
            </View>
          </Animated.View>
        )}

        {/* Top Bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
          <Pressable
            style={[styles.backButton, { backgroundColor: '#fff' }]}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={24} color="#000" />
          </Pressable>
          
          <View style={styles.etaBadge}>
            <Feather name="clock" size={16} color="#10b981" />
            <ThemedText style={styles.etaText}>{getTimeEstimate()}</ThemedText>
          </View>
        </View>

        {/* Distance Badge (if driver is moving) */}
        {hasDriverLocation && (
          <View style={[styles.distanceBadge, { top: insets.top + 70 }]}>
            <Feather name="navigation" size={14} color="#10b981" />
            <ThemedText style={styles.distanceText}>
              {driverData.distance.toFixed(1)} km away
            </ThemedText>
          </View>
        )}
      </View>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            transform: [{ translateY: sheetY }],
            paddingBottom: insets.bottom,
            backgroundColor: theme.backgroundDefault,
          },
        ]}
      >
        {/* Sheet Handle */}
        <Pressable style={styles.sheetHandle} onPress={toggleSheet}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
        </Pressable>

        {/* Status Section */}
        <View style={styles.statusSection}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
            <View style={styles.statusTextContainer}>
              <ThemedText type="h3">{getStatusText()}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Order #{order.orderNumber}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Driver Info Card */}
        {showDriverInfo && (
          <Card style={styles.driverCard}>
            <View style={styles.driverInfo}>
              <View style={[styles.driverAvatar, { backgroundColor: theme.primary }]}>
                <ThemedText type="h2" style={{ color: '#fff' }}>
                  {order.driverName?.charAt(0) || "D"}
                </ThemedText>
              </View>
              <View style={styles.driverDetails}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {order.driverName || "Driver"}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Delivery Partner
                </ThemedText>
                {driverData?.location?.speed && (
                  <View style={styles.speedBadge}>
                    <Feather name="zap" size={10} color={theme.primary} />
                    <ThemedText style={styles.speedText}>
                      {Math.round(driverData.location.speed * 3.6)} km/h
                    </ThemedText>
                  </View>
                )}
              </View>
              <View style={styles.driverActions}>
                <Pressable
                  onPress={() => navigation.navigate("Chat", { orderId: order.id })}
                  style={[styles.actionButton, { backgroundColor: theme.backgroundRoot }]}
                >
                  <Feather name="message-circle" size={22} color={theme.text} />
                </Pressable>
                {order.driverPhone && <CallButton phoneNumber={order.driverPhone} />}
              </View>
            </View>
          </Card>
        )}

        {/* Delivery PIN */}
        <View style={styles.pinContainer}>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: 8 }}>
            Share this PIN with driver
          </ThemedText>
          <View style={[styles.pinBox, { backgroundColor: theme.success + '10', borderColor: theme.success }]}>
            <ThemedText type="h1" style={{ letterSpacing: 12, color: theme.success, fontWeight: '700' }}>
              {order.deliveryPin}
            </ThemedText>
          </View>
        </View>

        {/* Progress Steps */}
        <View style={styles.stepsContainer}>
          <View style={styles.step}>
            <View style={[styles.stepIcon, { backgroundColor: theme.success }]}>
              <Feather name="check" size={14} color="#fff" />
            </View>
            <View style={styles.stepContent}>
              <ThemedText type="small" style={{ fontWeight: '600' }}>Order Confirmed</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Your order is being prepared
              </ThemedText>
            </View>
          </View>

          <View style={[styles.stepLine, { 
            backgroundColor: order.status !== "pending" ? theme.success : theme.border 
          }]} />

          <View style={styles.step}>
            <View style={[styles.stepIcon, { 
              backgroundColor: order.status === "delivering" || order.status === "delivered" 
                ? theme.success : theme.border 
            }]}>
              {(order.status === "delivering" || order.status === "delivered") && (
                <Feather name="check" size={14} color="#fff" />
              )}
            </View>
            <View style={styles.stepContent}>
              <ThemedText type="small" style={{ fontWeight: '600' }}>Out for Delivery</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Driver picked up your order
              </ThemedText>
            </View>
          </View>

          <View style={[styles.stepLine, { 
            backgroundColor: order.status === "delivered" ? theme.success : theme.border 
          }]} />

          <View style={styles.step}>
            <View style={[styles.stepIcon, { 
              backgroundColor: order.status === "delivered" ? theme.success : theme.border 
            }]}>
              {order.status === "delivered" && <Feather name="check" size={14} color="#fff" />}
            </View>
            <View style={styles.stepContent}>
              <ThemedText type="small" style={{ fontWeight: '600' }}>Delivered</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Order completed
              </ThemedText>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  driverMarkerContainer: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00d47e30',
  },
  driverMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00d47e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  etaText: { fontSize: 15, fontWeight: '700', color: '#10b981' },
  distanceBadge: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  distanceText: { fontSize: 13, fontWeight: '600', color: '#065f46' },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 12 },
    }),
  },
  sheetHandle: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  statusSection: { marginTop: 12, marginBottom: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusTextContainer: { flex: 1 },
  driverCard: { padding: 16, marginBottom: 20 },
  driverInfo: { flexDirection: 'row', alignItems: 'center' },
  driverAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  driverDetails: { flex: 1, marginLeft: 14 },
  speedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  speedText: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  driverActions: { flexDirection: 'row', gap: 10 },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinContainer: { alignItems: 'center', marginBottom: 24 },
  pinBox: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  stepsContainer: { marginTop: 8 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  stepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: { flex: 1, paddingBottom: 16 },
  stepLine: { width: 2, height: 20, marginLeft: 13, marginVertical: 4 },
});