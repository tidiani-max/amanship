// app/screens/DriverDashboardScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, Pressable, Alert, Linking,
  Platform, TextInput, Modal, TouchableOpacity, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing } from "@/constants/theme";
import { StaffEarningsDashboard } from "@/components/StaffEarningsDashboard";

const BRAND_PURPLE = "#6338f2";
const BRAND_MINT   = "#10b981";
const BRAND_AMBER  = "#f59e0b";

// Proximity thresholds
const NEARBY_THRESHOLD_M  = 500;  // notify customer at 500 m
const ARRIVED_THRESHOLD_M = 80;   // auto-highlight button at 80 m

// ─────────────────────────────────────────────────────────────────────────────
// Haversine distance (metres)
// ─────────────────────────────────────────────────────────────────────────────
function distanceMetre(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────────────────────────────────────
// TotalOrderTimer
// ─────────────────────────────────────────────────────────────────────────────
const TotalOrderTimer = React.memo(function TotalOrderTimer({ createdAt }: { createdAt: string }) {
  const TARGET = 15 * 60;
  const AMBER  = 12 * 60;
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  );
  useEffect(() => {
    const t = setInterval(() =>
      setElapsed(Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)), 1000);
    return () => clearInterval(t);
  }, [createdAt]);

  const overdue  = elapsed >= TARGET;
  const isAmber  = !overdue && elapsed >= AMBER;
  const color    = overdue ? "#ef4444" : isAmber ? BRAND_AMBER : BRAND_PURPLE;
  const progress = Math.min(elapsed / TARGET, 1);
  const rem      = Math.abs(TARGET - elapsed);
  const mm       = Math.floor(rem / 60).toString().padStart(2, "0");
  const ss       = (rem % 60).toString().padStart(2, "0");
  const label    = overdue ? `+${mm}:${ss} overdue` : `${mm}:${ss} left`;

  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <ThemedText style={{ color: "#94a3b8", fontSize: 10, fontWeight: "700" }}>🕐 15-MIN ORDER CLOCK</ThemedText>
        <ThemedText style={{ color, fontSize: 10, fontWeight: "800" }}>{label}</ThemedText>
      </View>
      <View style={{ height: 6, backgroundColor: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
        <View style={{ height: 6, width: `${progress * 100}%`, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// TimerBadge
// ─────────────────────────────────────────────────────────────────────────────
const PHASE_BUDGETS: Record<string, number> = {
  packed:     3 * 60,
  delivering: 0,
  arrived:    0,
};

const TimerBadge = React.memo(function TimerBadge({
  status, phaseStartedAt,
}: { status: string; phaseStartedAt?: string }) {
  const budget = PHASE_BUDGETS[status] ?? 0;
  const [elapsed, setElapsed] = useState(() =>
    phaseStartedAt ? Math.floor((Date.now() - new Date(phaseStartedAt).getTime()) / 1000) : 0
  );
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!phaseStartedAt) return;
    const t = setInterval(() =>
      setElapsed(Math.floor((Date.now() - new Date(phaseStartedAt).getTime()) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phaseStartedAt]);

  const overdue = budget > 0 && elapsed >= budget;
  const nearEnd = budget > 0 && !overdue && elapsed >= budget - 60;

  useEffect(() => {
    if (nearEnd || overdue) {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 500, useNativeDriver: true }),
      ]));
      loop.start();
      return () => loop.stop();
    }
    pulseAnim.setValue(1);
  }, [nearEnd, overdue]);

  if (!phaseStartedAt) return null;

  const color = overdue ? "#ef4444" : nearEnd ? BRAND_AMBER : BRAND_MINT;
  let timeLabel: string;
  if (budget === 0) {
    timeLabel = `${Math.floor(elapsed / 60).toString().padStart(2,"0")}:${(elapsed % 60).toString().padStart(2,"0")} elapsed`;
  } else if (overdue) {
    const over = elapsed - budget;
    timeLabel = `+${Math.floor(over/60).toString().padStart(2,"0")}:${(over%60).toString().padStart(2,"0")}`;
  } else {
    const rem = budget - elapsed;
    timeLabel = `${Math.floor(rem/60).toString().padStart(2,"0")}:${(rem%60).toString().padStart(2,"0")}`;
  }

  const phaseLabel: Record<string,string> = { packed: "Pickup window", delivering: "In transit", arrived: "Waiting at door" };

  return (
    <Animated.View style={[styles.timerBadge, { backgroundColor: color + "15", borderColor: color + "40", opacity: pulseAnim }]}>
      <View style={[styles.timerDot, { backgroundColor: color }]} />
      <ThemedText style={{ color, fontWeight: "700", fontSize: 11 }}>
        {phaseLabel[status] ?? status}: {timeLabel}
        {overdue && budget > 0 ? " — Speed up!" : ""}
      </ThemedText>
    </Animated.View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ProximityBanner — shown while delivering
// ─────────────────────────────────────────────────────────────────────────────
function ProximityBanner({ distM }: { distM: number | null }) {
  if (distM === null) return null;

  if (distM <= ARRIVED_THRESHOLD_M) {
    return (
      <View style={[styles.proximityBanner, { backgroundColor: "#ecfdf5", borderLeftColor: BRAND_MINT }]}>
        <ThemedText style={{ color: "#065f46", fontWeight: "700", fontSize: 12 }}>
          🛵 You're at the destination — tap "I've Arrived" now!
        </ThemedText>
      </View>
    );
  }
  if (distM <= NEARBY_THRESHOLD_M) {
    return (
      <View style={[styles.proximityBanner, { backgroundColor: "#fffbeb", borderLeftColor: BRAND_AMBER }]}>
        <ThemedText style={{ color: "#92400e", fontWeight: "700", fontSize: 12 }}>
          📍 {Math.round(distM)} m from customer — almost there!
        </ThemedText>
      </View>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PIN Modal
// ─────────────────────────────────────────────────────────────────────────────
const PINModal = React.memo(function PINModal({
  visible, onClose, onSubmit, isLoading,
}: { visible: boolean; onClose: () => void; onSubmit: (pin: string) => void; isLoading: boolean }) {
  const { theme } = useTheme();
  const [pin, setPin] = useState("");
  useEffect(() => { if (!visible) setPin(""); }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h3" style={{ marginBottom: 8 }}>Enter Delivery PIN</ThemedText>
          <ThemedText style={{ color: theme.textSecondary, marginBottom: 20, textAlign: "center", fontSize: 14 }}>
            Ask the customer for their 4-digit code
          </ThemedText>
          <TextInput
            style={[styles.pinInput, { backgroundColor: theme.backgroundRoot, color: theme.text, borderColor: BRAND_PURPLE }]}
            value={pin}
            onChangeText={(t) => setPin(t.replace(/[^0-9]/g, "").slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="0000"
            placeholderTextColor={theme.textSecondary}
            autoFocus
          />
          <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
            <Pressable style={[styles.modalBtn, { backgroundColor: theme.border }]} onPress={onClose} disabled={isLoading}>
              <ThemedText type="button">Cancel</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.modalBtn, { backgroundColor: BRAND_PURPLE, opacity: pin.length === 4 && !isLoading ? 1 : 0.5 }]}
              onPress={() => pin.length === 4 && onSubmit(pin)}
              disabled={pin.length !== 4 || isLoading}
            >
              {isLoading
                ? <ActivityIndicator size="small" color="#FFF" />
                : <ThemedText type="button" style={{ color: "#FFF" }}>Confirm</ThemedText>
              }
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// OrderCard
// ─────────────────────────────────────────────────────────────────────────────
const OrderCard = React.memo(function OrderCard({
  order, onPickup, onArrive, onComplete,
  isUpdating, disabled, driverCoords,
}: {
  order: any;
  onPickup:   (id: string) => void;
  onArrive:   (id: string) => void;
  onComplete: (id: string) => void;
  isUpdating: boolean;
  disabled?: boolean;
  driverCoords?: { lat: number; lng: number } | null;
}) {
  const { theme }  = useTheme();
  const navigation = useNavigation<any>();

  const isPacked    = order.status === "packed";
  const isOnWay     = order.status === "delivering";
  const isArrived   = order.status === "arrived";
  const isDelivered = order.status === "delivered";

  const statusColor = isDelivered ? BRAND_MINT : isArrived ? BRAND_MINT : isPacked ? BRAND_AMBER : BRAND_PURPLE;

  // Distance to customer
  const cLat = parseFloat(order.customer_lat || order.customerLat || "0");
  const cLng = parseFloat(order.customer_lng || order.customerLng || "0");
  const distM: number | null =
    driverCoords && cLat && cLng
      ? distanceMetre(driverCoords.lat, driverCoords.lng, cLat, cLng)
      : null;

  const openMaps = useCallback(() => {
    if (!cLat || !cLng) { Alert.alert("Error", "Location data missing"); return; }
    const label = encodeURIComponent("Customer Drop-off");
    if (Platform.OS === "android") {
      Linking.openURL(`google.navigation:q=${cLat},${cLng}`).catch(() =>
        Linking.openURL(`geo:${cLat},${cLng}?q=${cLat},${cLng}(${label})`)
      );
    } else {
      Linking.openURL(`maps://?ll=${cLat},${cLng}&q=${label}&t=m`);
    }
  }, [cLat, cLng]);

  const phaseStartedAt =
    isPacked   ? (order.packedAt      || order.createdAt) :
    isOnWay    ? (order.deliveringAt   || order.createdAt) :
    isArrived  ? (order.arrivedAt      || order.createdAt) :
    undefined;

  const statusLabel =
    isDelivered ? "✅ Delivered"            :
    isArrived   ? "🛵 Arrived at Customer"  :
    isPacked    ? "📍 Waiting at Store"     :
                  "🚚 In Transit";

  return (
    <Card style={styles.orderCard}>
      {/* 15-min clock */}
      {!isDelivered && order.createdAt && <TotalOrderTimer createdAt={order.createdAt} />}

      {/* Phase timer badge */}
      {!isDelivered && <TimerBadge status={order.status} phaseStartedAt={phaseStartedAt} />}

      {/* Proximity banner (while delivering) */}
      {isOnWay && <ProximityBanner distM={distM} />}

      {/* Arrived banner */}
      {isArrived && (
        <View style={[styles.proximityBanner, { backgroundColor: "#ecfdf5", borderLeftColor: BRAND_MINT }]}>
          <ThemedText style={{ color: "#065f46", fontWeight: "700", fontSize: 12 }}>
            🛵 Customer has been notified — ask for their 4-digit PIN
          </ThemedText>
        </View>
      )}

      {/* Header */}
      <View style={styles.orderHeader}>
        <View>
          <ThemedText type="h3">{order.orderNumber || order.id.slice(0, 8).toUpperCase()}</ThemedText>
          <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>{statusLabel}</ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "15" }]}>
          <ThemedText style={{ color: statusColor, fontWeight: "700", fontSize: 11 }}>
            {order.status.toUpperCase()}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {/* Progress bar */}
      {!isDelivered && (
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 6 }}>
          <Feather name="home"    size={14} color="#94a3b8" />
          <View style={{ flex: 1, height: 3, backgroundColor: isOnWay || isArrived ? BRAND_PURPLE : "#e2e8f0", borderRadius: 2 }} />
          <Feather name="truck"   size={16} color={isOnWay || isArrived ? BRAND_PURPLE : "#94a3b8"} />
          <View style={{ flex: 1, height: 3, backgroundColor: isArrived ? BRAND_MINT : "#e2e8f0", borderRadius: 2 }} />
          <Feather name="map-pin" size={14} color={isArrived ? BRAND_MINT : "#94a3b8"} />
        </View>
      )}

      {/* Address */}
      {order.address && (
        <View style={styles.addressBox}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <Feather name="map-pin" size={14} color={BRAND_PURPLE} />
            <ThemedText style={{ fontWeight: "700", marginLeft: 6, color: "#1e293b", fontSize: 13 }}>Delivery Address</ThemedText>
          </View>
          {order.address.label && <ThemedText style={{ fontWeight: "700", color: "#1e293b" }}>{order.address.label}</ThemedText>}
          <ThemedText style={{ color: "#64748b", fontSize: 13 }}>{order.address.fullAddress}</ThemedText>
          {order.address.details && (
            <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#e2e8f0" }}>
              <ThemedText style={{ color: "#64748b", fontSize: 12 }}>📝 {order.address.details}</ThemedText>
            </View>
          )}
        </View>
      )}

      {/* Details */}
      <View style={{ marginBottom: 12, gap: 6 }}>
        <View style={styles.detailRow}>
          <Feather name="package" size={14} color="#64748b" />
          <ThemedText style={{ color: "#334155", fontSize: 13 }}>{order.items?.length || 0} items to deliver</ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Feather name="credit-card" size={14} color="#64748b" />
          <ThemedText style={{ color: "#334155", fontSize: 13 }}>
            {order.paymentMethod === "cod"  ? "CASH ON DELIVERY" :
             order.paymentMethod === "qris" ? "QRIS (Xendit)"    : "PREPAID"}
          </ThemedText>
        </View>
        {order.paymentMethod === "cod" && (
          <View style={[styles.badge, { backgroundColor: "#fff7ed", borderLeftColor: BRAND_AMBER }]}>
            <ThemedText style={{ color: "#9a3412", fontWeight: "700", fontSize: 11 }}>COLLECT FROM CUSTOMER:</ThemedText>
            <ThemedText style={{ color: "#ea580c", fontSize: 18, fontWeight: "900" }}>
              Rp {order.total?.toLocaleString()}
            </ThemedText>
          </View>
        )}
        {isDelivered && order.deliveredAt && (
          <ThemedText style={{ color: BRAND_MINT, fontWeight: "600", fontSize: 12 }}>
            Delivered: {new Date(order.deliveredAt).toLocaleString()}
          </ThemedText>
        )}
      </View>

      {/* Action buttons */}
      {!isDelivered && (
        <View style={styles.actions}>
          {/* Map */}
          <Pressable style={styles.iconBtn} onPress={openMaps}>
            <Feather name="navigation" size={18} color="#64748b" />
          </Pressable>
          {/* Chat */}
          <Pressable style={styles.iconBtn} onPress={() => navigation.navigate("Chat", { orderId: order.id })}>
            <Feather name="message-square" size={18} color={BRAND_PURPLE} />
          </Pressable>

          {/* PICK UP (packed → delivering) */}
          {isPacked && (
            <Pressable
              style={[styles.mainBtn, { backgroundColor: disabled ? "#cbd5e1" : BRAND_PURPLE }]}
              onPress={() => onPickup(order.id)}
              disabled={isUpdating || disabled}
            >
              {isUpdating
                ? <ActivityIndicator size="small" color="#FFF" />
                : <>
                    <Feather name="package" size={16} color="#FFF" />
                    <ThemedText style={{ color: "#FFF", fontWeight: "800" }}>Pick Up</ThemedText>
                  </>
              }
            </Pressable>
          )}

          {/* I'VE ARRIVED (delivering → arrived) */}
          {isOnWay && (
            <Pressable
              style={[styles.mainBtn, {
                backgroundColor: disabled ? "#cbd5e1"
                  : distM !== null && distM <= ARRIVED_THRESHOLD_M
                  ? BRAND_MINT
                  : BRAND_PURPLE,
              }]}
              onPress={() => onArrive(order.id)}
              disabled={isUpdating || disabled}
            >
              {isUpdating
                ? <ActivityIndicator size="small" color="#FFF" />
                : <>
                    <Feather name="map-pin" size={16} color="#FFF" />
                    <ThemedText style={{ color: "#FFF", fontWeight: "800" }}>I've Arrived</ThemedText>
                  </>
              }
            </Pressable>
          )}

          {/* ENTER PIN (arrived → delivered) */}
          {isArrived && (
            <Pressable
              style={[styles.mainBtn, { backgroundColor: disabled ? "#cbd5e1" : BRAND_MINT }]}
              onPress={() => onComplete(order.id)}
              disabled={isUpdating || disabled}
            >
              {isUpdating
                ? <ActivityIndicator size="small" color="#FFF" />
                : <>
                    <Feather name="check-circle" size={16} color="#FFF" />
                    <ThemedText style={{ color: "#FFF", fontWeight: "800" }}>Enter PIN</ThemedText>
                  </>
              }
            </Pressable>
          )}
        </View>
      )}
    </Card>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────
export default function DriverDashboardScreen() {
  const insets      = useSafeAreaInsets();
  const { theme }   = useTheme();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const navigation  = useNavigation<any>();

  const [showCompleted,   setShowCompleted]   = useState(false);
  const [updatingId,      setUpdatingId]      = useState<string | null>(null);
  const [pinVisible,      setPinVisible]      = useState(false);
  const [selectedId,      setSelectedId]      = useState<string | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [isRefreshing,    setIsRefreshing]    = useState(false);
  const [driverCoords,    setDriverCoords]    = useState<{ lat: number; lng: number } | null>(null);
  const nearbyFiredRef = useRef<Set<string>>(new Set());

  // ── Dashboard data ──────────────────────────────────────────────────────────
  const { data: dashboard, isLoading, refetch } = useQuery({
    queryKey: ["/api/driver/dashboard", user?.id],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN}/api/driver/dashboard?userId=${user?.id}`
      );
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
    enabled: !!user?.id && user?.role === "driver",
    staleTime: 2500,
    refetchInterval: 3000,
    placeholderData: (prev: any) => prev,
  });

  // ── Location permission ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === "granted");
    })();
  }, []);

  // ── GPS tracking + proximity detection ─────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === "web" || !locationGranted || !user?.id) return;
    const activeOrders = dashboard?.orders?.active || [];
    const delivery = activeOrders.find((o: any) => o.status === "delivering");
    if (!delivery) return;

    let sub: Location.LocationSubscription | null = null;

    const start = async () => {
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 10 },
        async (loc) => {
          const dLat = loc.coords.latitude;
          const dLng = loc.coords.longitude;
          setDriverCoords({ lat: dLat, lng: dLng });

          // Push to server
          try {
            await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/driver/location/update`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                driverId: user.id, orderId: delivery.id,
                latitude: dLat, longitude: dLng,
                heading: loc.coords.heading  || 0,
                speed:   loc.coords.speed    || 0,
                accuracy:loc.coords.accuracy || 0,
              }),
            });
          } catch (e) { console.error("❌ location update:", e); }

          // Proximity check
          const cLat = parseFloat(delivery.customer_lat || delivery.customerLat || "0");
          const cLng = parseFloat(delivery.customer_lng || delivery.customerLng || "0");
          if (!cLat || !cLng) return;

          const dist = distanceMetre(dLat, dLng, cLat, cLng);

          // Fire "nearby" notification once per order
          if (dist <= NEARBY_THRESHOLD_M && !nearbyFiredRef.current.has(delivery.id)) {
            nearbyFiredRef.current.add(delivery.id);
            try {
              await fetch(
                `${process.env.EXPO_PUBLIC_DOMAIN}/api/driver/orders/${delivery.id}/notify-nearby`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    driverId:       user.id,
                    distanceMeters: Math.round(dist),
                    etaMinutes:     Math.ceil(dist / ((loc.coords.speed || 5) * 60)),
                  }),
                }
              );
            } catch (e) { console.error("❌ nearby notification:", e); }
          }
        }
      );
    };

    start().catch(console.error);
    return () => { sub?.remove(); };
  }, [dashboard?.orders?.active, user?.id, locationGranted]);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const pickupMutation = useMutation({
    mutationFn: async (orderId: string) => {
      setUpdatingId(orderId);
      const res = await apiRequest("PUT", `/api/driver/orders/${orderId}/status`, {
        userId: user?.id, status: "delivering",
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: (_data, orderId) => {
      queryClient.setQueryData(["/api/driver/dashboard", user?.id], (old: any) => {
        if (!old) return old;
        const moved = old.orders.ready?.find((o: any) => o.id === orderId);
        return {
          ...old,
          orders: {
            ...old.orders,
            ready:  (old.orders.ready  || []).filter((o: any) => o.id !== orderId),
            active: [
              ...(old.orders.active || []).filter((o: any) => o.id !== orderId),
              ...(moved ? [{ ...moved, status: "delivering", deliveringAt: new Date().toISOString() }] : []),
            ],
          },
        };
      });
      setUpdatingId(null);
    },
    onError: (err: Error) => { Alert.alert("Error", err.message); setUpdatingId(null); },
  });

  const arriveMutation = useMutation({
    mutationFn: async (orderId: string) => {
      setUpdatingId(orderId);
      const res = await apiRequest("PUT", `/api/driver/orders/${orderId}/status`, {
        userId: user?.id, status: "arrived",
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: (_data, orderId) => {
      queryClient.setQueryData(["/api/driver/dashboard", user?.id], (old: any) => {
        if (!old) return old;
        const order = old.orders.active?.find((o: any) => o.id === orderId);
        return {
          ...old,
          orders: {
            ...old.orders,
            active: [
              ...(old.orders.active || []).filter((o: any) => o.id !== orderId),
              ...(order ? [{ ...order, status: "arrived", arrivedAt: new Date().toISOString() }] : []),
            ],
          },
        };
      });
      setUpdatingId(null);
      Alert.alert("🛵 Arrived!", "Customer has been notified with their PIN. Ask them for it now.");
    },
    onError: (err: Error) => { Alert.alert("Error", err.message); setUpdatingId(null); },
  });

  const completeMutation = useMutation({
    mutationFn: async ({ orderId, pin }: { orderId: string; pin: string }) => {
      setUpdatingId(orderId);
      const res = await apiRequest("PUT", `/api/driver/orders/${orderId}/complete`, {
        userId: user?.id, deliveryPin: pin,
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: (_data, { orderId }) => {
      queryClient.setQueryData(["/api/driver/dashboard", user?.id], (old: any) => {
        if (!old) return old;
        const done = (old.orders.active || []).find((o: any) => o.id === orderId);
        return {
          ...old,
          orders: {
            ...old.orders,
            active: (old.orders.active || []).filter((o: any) => o.id !== orderId),
            completed: [
              ...(done ? [{ ...done, status: "delivered", deliveredAt: new Date().toISOString() }] : []),
              ...(old.orders.completed || []),
            ],
          },
        };
      });
      setPinVisible(false); setSelectedId(null); setUpdatingId(null);
      Alert.alert("✅ Delivered!", "Order completed successfully!");
    },
    onError: (err: Error) => {
      Alert.alert("❌ Incorrect PIN", err.message);
      setUpdatingId(null);
    },
  });

  // ── Handlers ────────────────────────────────────────────────────────────────
  const onPickup  = useCallback((id: string) => pickupMutation.mutate(id), [pickupMutation]);
  const onArrive  = useCallback((id: string) => arriveMutation.mutate(id), [arriveMutation]);
  const onComplete= useCallback((id: string) => { setSelectedId(id); setPinVisible(true); }, []);
  const onPinSubmit = useCallback((pin: string) => {
    if (selectedId) completeMutation.mutate({ orderId: selectedId, pin });
  }, [selectedId, completeMutation]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true); await refetch(); setIsRefreshing(false);
  }, [refetch]);

  const handleLogout = useCallback(() => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  }, [logout]);

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (!user || user.role !== "driver") {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.center}>
          <Feather name="lock" size={48} color="#ef4444" />
          <ThemedText type="h3" style={{ marginTop: 12 }}>Access Denied</ThemedText>
        </View>
      </ThemedView>
    );
  }
  if (isLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={BRAND_PURPLE} />
      </ThemedView>
    );
  }

  // ── Data ────────────────────────────────────────────────────────────────────
  const readyOrders     = dashboard?.orders?.ready     || [];
  const activeOrders    = dashboard?.orders?.active    || [];
  const completedOrders = dashboard?.orders?.completed || [];
  const hasActive       = activeOrders.length > 0;

  const allActive = (hasActive ? activeOrders : readyOrders).sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const todayEarnings = completedOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.titleRow}>
          <ThemedText style={{ fontSize: 22, fontWeight: "900", color: "#1e293b" }}>Delivery Hub</ThemedText>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: BRAND_PURPLE }]}
              onPress={() => navigation.navigate("Notifications")}>
              <Feather name="bell" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: "#fee2e2" }]} onPress={handleLogout}>
              <Feather name="log-out" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, marginBottom: 12 }}>
          <View style={[styles.dot, { backgroundColor: BRAND_MINT }]} />
          <ThemedText style={{ color: "#64748b", marginLeft: 6, fontWeight: "700", fontSize: 12 }}>ONLINE & READY</ThemedText>
        </View>
        {user?.id && (
          <View style={{ marginBottom: 12 }}>
            <StaffEarningsDashboard userId={user.id} role="driver" />
          </View>
        )}
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={BRAND_PURPLE} />}
      >
        {/* Active tasks */}
        <View style={styles.sectionHeader}>
          <Feather name="truck" size={16} color={BRAND_PURPLE} />
          <ThemedText style={{ fontSize: 12, fontWeight: "800", color: "#94a3b8", letterSpacing: 1 }}>
            ACTIVE TASKS ({allActive.length})
          </ThemedText>
        </View>

        {allActive.length > 0 ? allActive.map((order: any) => (
          <OrderCard
            key={order.id}
            order={order}
            onPickup={onPickup}
            onArrive={onArrive}
            onComplete={onComplete}
            isUpdating={updatingId === order.id}
            disabled={hasActive && order.status === "packed"}
            driverCoords={driverCoords}
          />
        )) : (
          <Card style={styles.emptyCard}>
            <MaterialCommunityIcons name="moped-outline" size={48} color="#cbd5e1" />
            <ThemedText type="h3" style={{ marginTop: 12, color: "#64748b" }}>No Deliveries</ThemedText>
            <ThemedText style={{ marginTop: 6, color: "#94a3b8" }}>New orders will appear here</ThemedText>
          </Card>
        )}

        {/* Completed */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 12 }}>
          <View style={styles.sectionHeader}>
            <Feather name="check-circle" size={16} color={BRAND_MINT} />
            <ThemedText style={{ fontSize: 12, fontWeight: "800", color: "#94a3b8", letterSpacing: 1 }}>
              TODAY'S WORK ({completedOrders.length})
            </ThemedText>
          </View>
          <Pressable onPress={() => setShowCompleted(v => !v)}>
            <Feather name={showCompleted ? "chevron-up" : "chevron-down"} size={22} color="#64748b" />
          </Pressable>
        </View>

        {showCompleted && (
          <>
            {completedOrders.length > 0 && (
              <Card style={{ padding: 16, marginBottom: 12, backgroundColor: BRAND_MINT + "10", borderColor: BRAND_MINT + "20", borderWidth: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <ThemedText style={{ fontWeight: "700", color: "#065f46" }}>💰 Today's Earnings</ThemedText>
                  <ThemedText style={{ fontSize: 20, fontWeight: "900", color: BRAND_MINT }}>
                    Rp {todayEarnings.toLocaleString()}
                  </ThemedText>
                </View>
              </Card>
            )}
            {completedOrders.map((order: any) => (
              <OrderCard
                key={order.id} order={order}
                onPickup={() => {}} onArrive={() => {}} onComplete={() => {}}
                isUpdating={false} driverCoords={null}
              />
            ))}
          </>
        )}
      </ScrollView>

      <PINModal
        visible={pinVisible}
        onClose={() => { setPinVisible(false); setSelectedId(null); }}
        onSubmit={onPinSubmit}
        isLoading={completeMutation.isPending}
      />
    </ThemedView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#f8fafc" },
  center:       { flex: 1, justifyContent: "center", alignItems: "center" },
  header:       { paddingHorizontal: 20, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  titleRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dot:          { width: 8, height: 8, borderRadius: 4 },
  iconButton:   { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  scroll:       { paddingHorizontal: 16, paddingTop: 16 },
  sectionHeader:{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  // Card
  orderCard:    { marginBottom: 16, padding: 16, borderRadius: 20, backgroundColor: "white" },
  orderHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  statusBadge:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  divider:      { height: 1, marginVertical: 10 },
  addressBox:   { backgroundColor: "#f8fafc", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#f1f5f9" },
  detailRow:    { flexDirection: "row", alignItems: "center", gap: 8 },
  badge:        { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, marginTop: 8, borderLeftWidth: 4 },
  proximityBanner: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4 },
  // Timer
  timerBadge:   { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, marginBottom: 10, alignSelf: "flex-start" },
  timerDot:     { width: 6, height: 6, borderRadius: 3 },
  // Actions
  actions:      { flexDirection: "row", gap: 10, marginTop: 4 },
  iconBtn:      { width: 48, height: 48, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 14, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  mainBtn:      { flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  // Empty
  emptyCard:    { alignItems: "center", padding: 40, borderRadius: 24 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.7)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "85%", padding: 24, borderRadius: 24, alignItems: "center" },
  pinInput:     { fontSize: 36, fontWeight: "900", letterSpacing: 12, textAlign: "center", paddingVertical: 18, borderRadius: 16, borderWidth: 2, width: "100%", marginTop: 10 },
  modalBtn:     { flex: 1, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});