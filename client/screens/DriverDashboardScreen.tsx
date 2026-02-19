// app/screens/DriverDashboardScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
  Linking,
  Platform,
  TextInput,
  Modal,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StaffEarningsDashboard } from "@/components/StaffEarningsDashboard";
import QRISPaymentModal from "@/components/QRISPaymentModal";

// BRAND COLORS
const BRAND_PURPLE = "#6338f2";
const BRAND_MINT = "#10b981";

// ==================== PIN MODAL ====================
const PINModal = React.memo(function PINModal({
  visible,
  onClose,
  onSubmit,
  isLoading,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
  isLoading: boolean;
}) {
  const { theme } = useTheme();
  const [pin, setPin] = useState("");

  // Reset PIN when modal closes
  useEffect(() => {
    if (!visible) setPin("");
  }, [visible]);

  const handleSubmit = () => {
    if (pin.length !== 4) {
      Alert.alert("Invalid PIN", "Please enter the 4-digit code");
      return;
    }
    onSubmit(pin);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h3" style={{ marginBottom: 12 }}>
            Enter Delivery PIN
          </ThemedText>
          <ThemedText
            type="body"
            style={{ color: theme.textSecondary, marginBottom: 20, textAlign: "center" }}
          >
            Ask the customer for their 4-digit PIN
          </ThemedText>

          <TextInput
            style={[
              styles.pinInput,
              {
                backgroundColor: theme.backgroundRoot,
                color: theme.text,
                borderColor: BRAND_PURPLE,
              },
            ]}
            value={pin}
            onChangeText={(text) => setPin(text.replace(/[^0-9]/g, "").slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="0000"
            placeholderTextColor={theme.textSecondary}
            autoFocus
          />

          <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
            <Pressable
              style={[styles.modalButton, { backgroundColor: theme.border }]}
              onPress={onClose}
              disabled={isLoading}
            >
              <ThemedText type="button">Cancel</ThemedText>
            </Pressable>

            <Pressable
              style={[
                styles.modalButton,
                {
                  backgroundColor: BRAND_PURPLE,
                  opacity: pin.length === 4 && !isLoading ? 1 : 0.5,
                },
              ]}
              onPress={handleSubmit}
              disabled={pin.length !== 4 || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <ThemedText type="button" style={{ color: "#FFF" }}>
                  Confirm
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// ==================== ORDER CARD ====================
const OrderCard = React.memo(function OrderCard({
  order,
  onPickup,
  onComplete,
  isUpdating,
  disabled,
}: {
  order: any;
  onPickup: (orderId: string) => void;
  onComplete: (orderId: string) => void;
  isUpdating: boolean;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  const isAtStore = order.status === "packed";
  const isOnWay = order.status === "delivering";
  const isDelivered = order.status === "delivered";

  const getStatusColor = () => {
    if (isDelivered) return BRAND_MINT;
    if (isAtStore) return "#f59e0b";
    if (isOnWay) return BRAND_PURPLE;
    return theme.textSecondary;
  };

  const openMaps = useCallback(() => {
    const lat = order.customer_lat || order.customerLat;
    const lng = order.customer_lng || order.customerLng;

    if (!lat || !lng) {
      Alert.alert("Error", "Location data missing");
      return;
    }

    const label = encodeURIComponent("Customer Drop-off");

    if (Platform.OS === "android") {
      Linking.openURL(`google.navigation:q=${lat},${lng}`).catch(() => {
        Linking.openURL(`geo:${lat},${lng}?q=${lat},${lng}(${label})`);
      });
    } else {
      Linking.openURL(`maps://?ll=${lat},${lng}&q=${label}&t=m`).catch(() => {
        Linking.openURL(`http://maps.google.com/?q=${lat},${lng}`);
      });
    }
  }, [order.customer_lat, order.customer_lng, order.customerLat, order.customerLng]);

  const handlePickup = useCallback(() => onPickup(order.id), [order.id, onPickup]);
  const handleComplete = useCallback(() => onComplete(order.id), [order.id, onComplete]);
  const handleChat = useCallback(
    () => navigation.navigate("Chat", { orderId: order.id }),
    [order.id, navigation]
  );

  return (
    <Card style={styles.orderCard}>
      {/* Header */}
      <View style={styles.orderHeader}>
        <View>
          <ThemedText type="h3">
            {order.orderNumber || order.id.slice(0, 8).toUpperCase()}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {isDelivered ? "✅ Delivered" : isAtStore ? "📍 Waiting at Store" : "🚚 In Transit"}
          </ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + "15" }]}>
          <ThemedText type="small" style={{ color: getStatusColor(), fontWeight: "700" }}>
            {order.status.toUpperCase()}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {/* Address */}
      {order.address && (
        <View style={styles.addressSection}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Feather name="map-pin" size={16} color={BRAND_PURPLE} />
            <ThemedText type="body" style={{ fontWeight: "700", marginLeft: 6, color: "#1e293b" }}>
              Delivery Address
            </ThemedText>
          </View>

          {order.address.label && (
            <ThemedText type="h3" style={{ marginBottom: 4, color: "#1e293b" }}>
              {order.address.label}
            </ThemedText>
          )}

          <ThemedText type="body" style={{ color: "#64748b" }}>
            {order.address.fullAddress}
          </ThemedText>

          {order.address.details && (
            <View style={styles.addressDetails}>
              <ThemedText type="caption" style={{ color: "#64748b" }}>
                📝 {order.address.details}
              </ThemedText>
            </View>
          )}
        </View>
      )}

      {/* Details */}
      <View style={styles.orderDetails}>
        {!isDelivered && (
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 15, gap: 8 }}>
            <Feather name="home" size={14} color="#94a3b8" />
            <View style={{ flex: 1, height: 2, backgroundColor: isAtStore ? "#e2e8f0" : BRAND_PURPLE }} />
            <Feather name="truck" size={16} color={isOnWay ? BRAND_PURPLE : "#94a3b8"} />
            <View style={{ flex: 1, height: 2, backgroundColor: "#e2e8f0" }} />
            <Feather name="map-pin" size={14} color="#94a3b8" />
          </View>
        )}

        <View style={styles.detailRow}>
          <Feather name="package" size={16} color="#64748b" />
          <ThemedText type="body" style={{ color: "#334155" }}>
            {order.items.length} items to deliver
          </ThemedText>
        </View>

        <View style={styles.detailRow}>
          <Feather name="credit-card" size={16} color="#64748b" />
          <ThemedText type="body" style={{ color: "#334155" }}>
            {order.paymentMethod === "cod"
              ? "CASH ON DELIVERY"
              : order.paymentMethod === "qris"
              ? "QRIS PAYMENT"
              : "PREPAID"}
          </ThemedText>
        </View>

        {order.paymentMethod === "cod" && (
          <View
            style={[
              styles.paymentBadge,
              { backgroundColor: "#fff7ed", borderLeftColor: "#f59e0b" },
            ]}
          >
            <ThemedText type="small" style={{ color: "#9a3412", fontWeight: "700" }}>
              COLLECT FROM CUSTOMER:
            </ThemedText>
            <ThemedText type="h3" style={{ color: "#ea580c" }}>
              Rp {order.total.toLocaleString()}
            </ThemedText>
          </View>
        )}

        {order.paymentMethod === "qris" && !isDelivered && (
          <View
            style={[
              styles.paymentBadge,
              { backgroundColor: "#ecfdf5", borderLeftColor: BRAND_MINT },
            ]}
          >
            <ThemedText type="small" style={{ color: "#065f46", fontWeight: "700" }}>
              SHOW QR CODE TO CUSTOMER
            </ThemedText>
            <ThemedText type="h3" style={{ color: BRAND_MINT }}>
              Rp {order.total.toLocaleString()}
            </ThemedText>
          </View>
        )}

        {isDelivered && order.deliveredAt && (
          <View style={{ marginTop: 8 }}>
            <ThemedText type="caption" style={{ color: BRAND_MINT, fontWeight: "600" }}>
              Delivered: {new Date(order.deliveredAt).toLocaleString()}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Actions */}
      {!isDelivered && (
        <View style={styles.orderActions}>
          <Pressable style={styles.iconActionButton} onPress={openMaps}>
            <Feather name="navigation" size={18} color="#64748b" />
          </Pressable>

          <Pressable style={styles.iconActionButton} onPress={handleChat}>
            <Feather name="message-square" size={18} color={BRAND_PURPLE} />
          </Pressable>

          {isAtStore && (
            <Pressable
              style={[
                styles.actionButton,
                { backgroundColor: disabled ? "#cbd5e1" : BRAND_PURPLE, flex: 1 },
              ]}
              onPress={handlePickup}
              disabled={isUpdating || disabled}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Feather name="package" size={16} color="#FFF" />
                  <ThemedText type="button" style={{ color: "#FFF", fontWeight: "800" }}>
                    Pick Up
                  </ThemedText>
                </View>
              )}
            </Pressable>
          )}

          {isOnWay && (
            <Pressable
              style={[
                styles.actionButton,
                { backgroundColor: disabled ? "#cbd5e1" : BRAND_MINT, flex: 1 },
              ]}
              onPress={handleComplete}
              disabled={isUpdating || disabled}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Feather name="check-circle" size={16} color="#FFF" />
                  <ThemedText type="button" style={{ color: "#FFF", fontWeight: "800" }}>
                    {order.paymentMethod === "qris" ? "Show QR & PIN" : "Enter PIN"}
                  </ThemedText>
                </View>
              )}
            </Pressable>
          )}
        </View>
      )}
    </Card>
  );
});

// ==================== MAIN SCREEN ====================
export default function DriverDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();

  const [showCompleted, setShowCompleted] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // QRIS state
  const [qrisModalVisible, setQrisModalVisible] = useState(false);
  const [qrisOrderId, setQrisOrderId] = useState<string | null>(null);
  const [qrisAmount, setQrisAmount] = useState(0);

  // ==================== DATA FETCHING ====================
  const { data: dashboard, isLoading, refetch } = useQuery({
    queryKey: ["/api/driver/dashboard", user?.id],
    queryFn: async () => {
      const baseUrl = process.env.EXPO_PUBLIC_DOMAIN!;
      const response = await fetch(`${baseUrl}/api/driver/dashboard?userId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch dashboard");
      return response.json();
    },
    enabled: !!user?.id && user?.role === "driver",
    // ✅ Keep showing old data while background fetch happens — no layout shift
    placeholderData: (previousData: any) => previousData,
    // ✅ Don't treat data as stale immediately — prevents redundant refetches
    staleTime: 2500,
    // ✅ Auto-poll every 3s
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    // ✅ Only re-render when data or error actually changes, not on every isFetching tick
    notifyOnChangeProps: ["data", "error"],
  });

  // ==================== LOCATION ====================
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === "granted");
      if (status !== "granted") {
        Alert.alert(
          "Location Required",
          "Please enable location services to use delivery tracking.",
          [{ text: "OK" }]
        );
      }
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web" || !locationPermission || !user?.id) return;

    const activeOrders = dashboard?.orders?.active || [];
    const activeDelivery = activeOrders.find((o: any) => o.status === "delivering");
    if (!activeDelivery) return;

    let locationSubscription: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      try {
        locationSubscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 10 },
          async (location) => {
            try {
              await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/driver/location/update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  driverId: user.id,
                  orderId: activeDelivery.id,
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  heading: location.coords.heading || 0,
                  speed: location.coords.speed || 0,
                  accuracy: location.coords.accuracy || 0,
                }),
              });
            } catch (error) {
              console.error("❌ Location update error:", error);
            }
          }
        );
      } catch (error) {
        console.error("❌ Failed to start location tracking:", error);
      }
    };

    startTracking();
    return () => { locationSubscription?.remove(); };
  }, [dashboard?.orders?.active, user?.id, locationPermission]);

  // ==================== MUTATIONS ====================
  const pickupMutation = useMutation({
    mutationFn: async (orderId: string) => {
      setUpdatingOrderId(orderId);
      const response = await apiRequest("PUT", `/api/driver/orders/${orderId}/status`, {
        userId: user?.id,
        status: "delivering",
      });
      return response.json();
    },
    onSuccess: (_data, orderId) => {
      // ✅ Patch cache directly — no invalidation = no jarring refetch
      queryClient.setQueryData(["/api/driver/dashboard", user?.id], (old: any) => {
        if (!old) return old;
        const movedOrder = old.orders.ready?.find((o: any) => o.id === orderId)
          || old.orders.active?.find((o: any) => o.id === orderId);
        return {
          ...old,
          orders: {
            ...old.orders,
            ready: (old.orders.ready || []).filter((o: any) => o.id !== orderId),
            active: [
              ...(old.orders.active || []).filter((o: any) => o.id !== orderId),
              ...(movedOrder ? [{ ...movedOrder, status: "delivering" }] : []),
            ],
          },
        };
      });
      setUpdatingOrderId(null);
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
      setUpdatingOrderId(null);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({ orderId, pin }: { orderId: string; pin: string }) => {
      setUpdatingOrderId(orderId);
      const response = await apiRequest("PUT", `/api/driver/orders/${orderId}/complete`, {
        userId: user?.id,
        deliveryPin: pin,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to complete delivery");
      }
      return response.json();
    },
    onSuccess: (_data, { orderId }) => {
      // ✅ Patch cache — move order from active to completed
      queryClient.setQueryData(["/api/driver/dashboard", user?.id], (old: any) => {
        if (!old) return old;
        const completedOrder = (old.orders.active || []).find((o: any) => o.id === orderId);
        return {
          ...old,
          orders: {
            ...old.orders,
            active: (old.orders.active || []).filter((o: any) => o.id !== orderId),
            completed: [
              ...(completedOrder
                ? [{ ...completedOrder, status: "delivered", deliveredAt: new Date().toISOString() }]
                : []),
              ...(old.orders.completed || []),
            ],
          },
        };
      });
      setPinModalVisible(false);
      setSelectedOrderId(null);
      setUpdatingOrderId(null);
      setQrisModalVisible(false);
      setQrisOrderId(null);
      Alert.alert("✅ Success", "Order delivered successfully!");
    },
    onError: (error: Error) => {
      Alert.alert("❌ Incorrect PIN", error.message || "The PIN you entered is incorrect. Please try again.");
      setUpdatingOrderId(null);
    },
  });

  // ==================== HANDLERS ====================
  const handleManualRefresh = useCallback(async () => {
    // ✅ Only show spinner on manual pull, not on background interval polls
    setIsManualRefreshing(true);
    await refetch();
    setIsManualRefreshing(false);
  }, [refetch]);

  const handleLogout = useCallback(() => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => await logout() },
    ]);
  }, [logout]);

  const handleComplete = useCallback(
    (orderId: string) => {
      const activeOrders = dashboard?.orders?.active || [];
      const order = activeOrders.find((o: any) => o.id === orderId);

      if (order?.paymentMethod === "qris") {
        setQrisOrderId(orderId);
        setQrisAmount(order.total);
        setQrisModalVisible(true);
      } else {
        setSelectedOrderId(orderId);
        setPinModalVisible(true);
      }
    },
    [dashboard?.orders?.active]
  );

  const handleQrisConfirmed = useCallback(() => {
    setQrisModalVisible(false);
    if (qrisOrderId) {
      setSelectedOrderId(qrisOrderId);
      setPinModalVisible(true);
    }
  }, [qrisOrderId]);

  const handlePinSubmit = useCallback(
    (pin: string) => {
      if (selectedOrderId) {
        completeMutation.mutate({ orderId: selectedOrderId, pin });
      }
    },
    [selectedOrderId, completeMutation]
  );

  const handlePickup = useCallback(
    (orderId: string) => pickupMutation.mutate(orderId),
    [pickupMutation]
  );

  const handlePinClose = useCallback(() => {
    setPinModalVisible(false);
    setSelectedOrderId(null);
  }, []);

  const handleQrisCancel = useCallback(() => {
    setQrisModalVisible(false);
    setQrisOrderId(null);
  }, []);

  // ==================== GUARDS ====================
  if (!user || user.role !== "driver") {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Feather name="lock" size={48} color="#ef4444" />
          <ThemedText type="h3" style={{ marginTop: Spacing.md }}>
            Access Denied
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND_PURPLE} />
      </ThemedView>
    );
  }

  // ==================== DERIVED DATA ====================
  const readyOrders = dashboard?.orders?.ready || [];
  const activeOrders = dashboard?.orders?.active || [];
  const completedOrders = dashboard?.orders?.completed || [];
  const hasActiveDelivery = activeOrders.length > 0;

  const allActiveOrders = (hasActiveDelivery ? activeOrders : readyOrders).sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const sortedCompletedOrders = [...completedOrders].sort(
    (a: any, b: any) =>
      new Date(b.deliveredAt || b.createdAt).getTime() -
      new Date(a.deliveredAt || a.createdAt).getTime()
  );

  const todayEarnings = completedOrders.reduce(
    (sum: number, order: any) => sum + order.total,
    0
  );

  // ==================== RENDER ====================
  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: "white",
            borderBottomWidth: 1,
            borderBottomColor: "#f1f5f9",
          },
        ]}
      >
        <View style={styles.titleRow}>
          <ThemedText style={{ fontSize: 22, fontWeight: "900", color: "#1e293b" }}>
            Delivery Hub
          </ThemedText>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: BRAND_PURPLE }]}
              onPress={() => navigation.navigate("Notifications")}
            >
              <Feather name="bell" size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: "#fee2e2" }]}
              onPress={handleLogout}
            >
              <Feather name="log-out" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.statusRow, { marginTop: 8, marginBottom: 16 }]}>
          <View style={[styles.statusDot, { backgroundColor: BRAND_MINT }]} />
          <ThemedText type="caption" style={{ color: "#64748b", marginLeft: 6, fontWeight: "700" }}>
            ONLINE & READY
          </ThemedText>
        </View>

        {user?.id && (
          <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 16 }}>
            <StaffEarningsDashboard userId={user.id} role="driver" />
          </View>
        )}
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        // ✅ Only show pull-to-refresh spinner on MANUAL refresh, not on every background poll
        refreshControl={
          <RefreshControl
            refreshing={isManualRefreshing}
            onRefresh={handleManualRefresh}
            tintColor={BRAND_PURPLE}
          />
        }
      >
        {/* Active tasks */}
        <View style={styles.sectionHeader}>
          <Feather name="truck" size={18} color={BRAND_PURPLE} />
          <ThemedText style={{ fontSize: 13, fontWeight: "800", color: "#94a3b8", letterSpacing: 1 }}>
            ACTIVE TASKS ({allActiveOrders.length})
          </ThemedText>
        </View>

        {allActiveOrders.length > 0 ? (
          allActiveOrders.map((order: any) => (
            <OrderCard
              key={order.id}
              order={order}
              onPickup={handlePickup}
              onComplete={handleComplete}
              isUpdating={updatingOrderId === order.id}
              disabled={hasActiveDelivery && order.status === "packed"}
            />
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <MaterialCommunityIcons name="moped-outline" size={48} color="#cbd5e1" />
            <ThemedText type="h3" style={{ marginTop: Spacing.md, color: "#64748b" }}>
              No Deliveries
            </ThemedText>
            <ThemedText type="body" style={{ marginTop: 8, color: "#94a3b8" }}>
              New orders will appear here
            </ThemedText>
          </Card>
        )}

        {/* Completed section */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: Spacing.xl,
            marginBottom: 12,
          }}
        >
          <View style={styles.sectionHeader}>
            <Feather name="check-circle" size={18} color={BRAND_MINT} />
            <ThemedText
              style={{ fontSize: 13, fontWeight: "800", color: "#94a3b8", letterSpacing: 1 }}
            >
              TODAY'S WORK ({sortedCompletedOrders.length})
            </ThemedText>
          </View>
          <Pressable onPress={() => setShowCompleted((v) => !v)}>
            <Feather
              name={showCompleted ? "chevron-up" : "chevron-down"}
              size={22}
              color="#64748b"
            />
          </Pressable>
        </View>

        {showCompleted && (
          <>
            {sortedCompletedOrders.length > 0 ? (
              <>
                <Card
                  style={{
                    padding: 16,
                    marginBottom: 12,
                    backgroundColor: BRAND_MINT + "10",
                    borderColor: BRAND_MINT + "20",
                    borderWidth: 1,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <ThemedText type="body" style={{ fontWeight: "700", color: "#065f46" }}>
                      💰 Total Earnings Today
                    </ThemedText>
                    <ThemedText type="h2" style={{ color: BRAND_MINT }}>
                      Rp {todayEarnings.toLocaleString()}
                    </ThemedText>
                  </View>
                </Card>

                {sortedCompletedOrders.map((order: any) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onPickup={() => {}}
                    onComplete={() => {}}
                    isUpdating={false}
                  />
                ))}
              </>
            ) : (
              <Card style={styles.emptyCard}>
                <ThemedText type="body" style={{ color: "#94a3b8" }}>
                  No deliveries completed today
                </ThemedText>
              </Card>
            )}
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <PINModal
        visible={pinModalVisible}
        onClose={handlePinClose}
        onSubmit={handlePinSubmit}
        isLoading={completeMutation.isPending}
      />

      <QRISPaymentModal
        visible={qrisModalVisible}
        orderTotal={qrisAmount}
        onConfirmPayment={handleQrisConfirmed}
        onCancel={handleQrisCancel}
      />
    </ThemedView>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { paddingHorizontal: 20 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusRow: { flexDirection: "row", alignItems: "center" },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  headerActions: { flexDirection: "row", gap: 10 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  orderCard: { marginBottom: 16, padding: 16, borderRadius: 20, backgroundColor: "white" },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  divider: { height: 1, marginVertical: 12 },
  addressSection: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  addressDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  orderDetails: { marginBottom: 12 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  paymentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 10,
    borderLeftWidth: 4,
  },
  orderActions: { flexDirection: "row", gap: 10, marginTop: 5 },
  iconActionButton: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  actionButton: { height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  emptyCard: { alignItems: "center", padding: 40, borderRadius: 24 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: { width: "85%", padding: 24, borderRadius: 24, alignItems: "center" },
  pinInput: {
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 12,
    textAlign: "center",
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 2,
    width: "100%",
    marginTop: 10,
  },
  modalButton: { flex: 1, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});