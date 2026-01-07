import React, { useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable, Switch, Alert, Linking, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useNavigation } from "@react-navigation/native";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  items: any[];
  createdAt: string;
  customerLat: string;
  customerLng: string;
  addressId: string | null;
  paymentMethod: string;
}

interface DriverDashboardData {
  user: { id: string; username: string; phone: string | null; role: string };
  staffRecord: { id: string; userId: string; storeId: string; role: string; status: string };
  store: { id: string; name: string; address: string };
  orders: {
    ready: Order[];
    active: Order[];
    completed: Order[];
  };
}

function OrderCard({ 
  order, 
  onUpdateStatus,
  isUpdating,
  disabled
}: { 
  order: Order; 
  onUpdateStatus: (orderId: string, status: string) => void;
  isUpdating: boolean;
  disabled?: boolean;
}) {

  const { theme } = useTheme();
  const navigation = useNavigation<any>(); // Add this hook
  
  // Logic to determine the current phase of delivery
  const isAtStore = order.status === "packed" || order.status === "ready";
  const isOnWay = order.status === "delivering";

  const getStatusColor = () => {
    if (isAtStore) return theme.warning;
    if (isOnWay) return theme.primary;
    return theme.success;
  };

  const getButtonConfig = () => {
    if (isAtStore) return { label: "Pick Up", status: "delivering", icon: "package" as const };
    if (isOnWay) return { label: "Complete", status: "delivered", icon: "check-circle" as const };
    return null;
  };

const openMaps = () => {
  // Use the snake_case keys from your DB results
  console.log("DRIVER APP SEEING LAT:", (order as any).customer_lat);
  console.log("DRIVER APP SEEING LNG:", (order as any).customer_lng);
    // ------------------------------
  const lat = (order as any).customer_lat || order.customerLat;
  const lng = (order as any).customer_lng || order.customerLng;
  
  if (!lat || !lng) {
    Alert.alert("Error", "Coordinate data missing for this order.");
    return;
  }

  const label = encodeURIComponent("Customer Drop-off (Nowhere Cafe)");

  // PLATFORM SPECIFIC STRATEGY
  if (Platform.OS === 'android') {
    /** * google.navigation:q=LAT,LNG 
     * This is the "Gold Standard" for drivers. 
     * It forces Google Maps into Turn-by-Turn mode to the EXACT GPS point,
     * ignoring nearby landmarks like SMA 8.
     */
    Linking.openURL(`google.navigation:q=${lat},${lng}`).catch(() => {
      // Fallback if navigation intent fails
      Linking.openURL(`geo:${lat},${lng}?q=${lat},${lng}(${label})`);
    });
  } else {
    /**
     * Apple Maps: ll (Lat/Long) + q (Label)
     * ll sets the center of the map on the coordinates.
     * q puts the pin exactly there.
     */
    const url = `maps://?ll=${lat},${lng}&q=${label}&t=m`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`http://maps.google.com/?q=${lat},${lng}`);
    });
  }
};
  const config = getButtonConfig();

  return (
    <Card style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <ThemedText type="h3">#{order.id}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {isAtStore ? "📍 Waiting at Store" : "🚚 In Transit"}
          </ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + "20" }]}>
          <ThemedText type="small" style={{ color: getStatusColor() }}>
            {order.status.toUpperCase()}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.orderDetails}>
        {/* Visual Delivery Progress Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8 }}>
          <Feather name="home" size={14} color={theme.textSecondary} />
          <View style={{ flex: 1, height: 2, backgroundColor: isAtStore ? theme.border : theme.primary }} />
          <Feather name="truck" size={16} color={isOnWay ? theme.primary : theme.textSecondary} />
          <View style={{ flex: 1, height: 2, backgroundColor: theme.border }} />
          <Feather name="map-pin" size={14} color={theme.textSecondary} />
        </View>

        <View style={styles.detailRow}>
          <Feather name="package" size={16} color={theme.textSecondary} />
          <ThemedText type="body">{order.items.length} items to deliver</ThemedText>
        </View>

        <View style={styles.detailRow}>
          <Feather name="credit-card" size={16} color={theme.textSecondary} />
          <ThemedText type="body">
            {order.paymentMethod === "cod" ? "CASH ON DELIVERY" : "PREPAID"}
          </ThemedText>
        </View>

        {order.paymentMethod === "cod" && (
          <View style={[styles.codBadge, { backgroundColor: theme.warning + "15", borderLeftWidth: 4, borderLeftColor: theme.warning }]}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>COLLECT FROM CUSTOMER:</ThemedText>
            <ThemedText type="h3" style={{ color: theme.warning }}>Rp {order.total.toLocaleString()}</ThemedText>
          </View>
        )}
      </View>

      {/* ACTION BUTTONS */}
      <View style={styles.orderActions}>
        {/* Map Button */}
        <Pressable 
          style={[styles.mapButton, { borderColor: theme.border }]} 
          onPress={openMaps}
        >
          <Feather name="navigation" size={18} color={theme.secondary} />
        </Pressable>

        {/* Chat Button - Primary way to contact customer */}
        <Pressable 
          style={[styles.mapButton, { borderColor: theme.border }]} 
          onPress={() => navigation.navigate("Chat", { orderId: order.id })}
        >
          <Feather name="message-square" size={18} color={theme.primary} />
        </Pressable>
        
        {/* Main Status Toggle (Pick Up / Complete) */}
        {config && (
          <Pressable
  style={[
    styles.actionButton,
    {
      backgroundColor: disabled ? "#999" : theme.primary,
      flex: 1
    }
  ]}
  onPress={() => onUpdateStatus(order.id, config.status)}
  disabled={isUpdating || disabled}
>

            {isUpdating ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name={config.icon} size={16} color="#FFF" />
                <ThemedText type="button" style={{ color: "#FFF" }}>{config.label}</ThemedText>
              </View>
            )}
          </Pressable>
        )}
      </View>
    </Card>
  );
}

function CompletedOrderCard({ order }: { order: Order }) {
  const { theme } = useTheme();
  const createdAt = new Date(order.createdAt);

  return (
    <View style={styles.completedRow}>
      <View style={styles.completedInfo}>
        <ThemedText type="body">{order.orderNumber}</ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {createdAt.toLocaleDateString()} {createdAt.toLocaleTimeString()}
        </ThemedText>
      </View>
      <ThemedText type="body" style={{ color: theme.success }}>
        Rp {order.total.toLocaleString()}
      </ThemedText>
    </View>
  );
}

export default function DriverDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCompleted, setShowCompleted] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

 const { data: dashboard, isLoading, refetch, isRefetching } = useQuery<DriverDashboardData>({
    queryKey: ["/api/driver/dashboard", user?.id],
    queryFn: async () => {
      const baseUrl = "process.env.EXPO_PUBLIC_DOMAIN"; 
      const response = await fetch(`${baseUrl}/api/driver/dashboard?userId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch dashboard");
      return response.json();
    },
    enabled: !!user?.id && user?.role === "driver",
    // CHANGE THIS: 3 seconds for instant-feel updates
    refetchInterval: 3000, 
    // Keeps syncing even if the driver switches apps briefly
    refetchOnWindowFocus: true, 
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (status: "online" | "offline") => {
      const response = await apiRequest("POST", "/api/staff/toggle-status", { userId: user?.id, status });
      if (!response.ok) throw new Error("Failed to toggle status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/dashboard"] });
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });

 const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      setUpdatingOrderId(orderId);
      const response = await apiRequest("PUT", `/api/driver/orders/${orderId}/status`, { userId: user?.id, status });
      return response.json();
    },
    // This runs the moment the button is clicked
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["/api/driver/dashboard"] });
      const previousData = queryClient.getQueryData(["/api/driver/dashboard"]);
      // (Optional) Manually update cache here for zero-latency UI
      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/dashboard"] });
      setUpdatingOrderId(null);
    },
  });

  if (!user || user.role !== "driver") {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Feather name="lock" size={48} color={theme.error} />
          <ThemedText type="h3" style={{ marginTop: Spacing.md }}>Access Denied</ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
            This dashboard is only for drivers.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText type="body" style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
          Loading dashboard...
        </ThemedText>
      </ThemedView>
    );
  }

  const isOnline = dashboard?.staffRecord?.status === "online";
  const readyOrders = dashboard?.orders?.ready || [];
const activeOrders = dashboard?.orders?.active || [];
const completedOrders = dashboard?.orders?.completed || [];

// 🔒 DRIVER LOCK LOGIC
const hasActiveDelivery = activeOrders.length > 0;

// ❌ DO NOT merge ready + active
const allActiveOrders = hasActiveDelivery ? activeOrders : readyOrders;


  const todayEarnings = completedOrders.reduce((sum, order) => sum + order.total, 0);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      >
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <ThemedText type="h3">{dashboard?.user?.username || "Driver"}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {dashboard?.store?.name || "No store assigned"}
              </ThemedText>
            </View>
            <View style={styles.toggleContainer}>
              <ThemedText type="body" style={{ color: isOnline ? theme.success : theme.textSecondary }}>
                {isOnline ? "Online" : "Offline"}
              </ThemedText>
              <Switch
                value={isOnline}
                onValueChange={(value) => toggleStatusMutation.mutate(value ? "online" : "offline")}
                trackColor={{ false: theme.border, true: theme.success + "80" }}
                thumbColor={isOnline ? theme.success : theme.textSecondary}
              />
            </View>
          </View>
        </Card>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Feather name="truck" size={24} color={theme.primary} />
            <ThemedText type="h2" style={{ marginTop: Spacing.xs }}>
  {activeOrders.length}
</ThemedText>
<ThemedText type="caption">Active</ThemedText>

          </Card>
          <Card style={styles.statCard}>
            <Feather name="check-circle" size={24} color={theme.success} />
            <ThemedText type="h2" style={{ marginTop: Spacing.xs }}>{completedOrders.length}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>Delivered</ThemedText>
          </Card>
          <Card style={styles.statCardWide}>
            <Feather name="dollar-sign" size={24} color={theme.warning} />
            <ThemedText type="h3" style={{ marginTop: Spacing.xs }}>Rp {(todayEarnings * 0.1).toLocaleString()}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>Est. Earnings</ThemedText>
          </Card>
        </View>

        <ThemedText type="h3" style={styles.sectionTitle}>
          Active Deliveries ({allActiveOrders.length})
        </ThemedText>

        {allActiveOrders.length > 0 ? (
          allActiveOrders.map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onUpdateStatus={(orderId, status) => updateOrderMutation.mutate({ orderId, status })}
              isUpdating={updatingOrderId === order.id}
            />
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Feather name="inbox" size={48} color={theme.textSecondary} />
            <ThemedText type="h3" style={{ marginTop: Spacing.md }}>No Deliveries</ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
              {isOnline ? "Waiting for orders to be packed..." : "Go online to start receiving deliveries."}
            </ThemedText>
          </Card>
        )}

        {completedOrders.length > 0 ? (
          <>
            <Pressable style={styles.completedHeader} onPress={() => setShowCompleted(!showCompleted)}>
              <ThemedText type="h3">Completed Today ({completedOrders.length})</ThemedText>
              <Feather name={showCompleted ? "chevron-up" : "chevron-down"} size={20} color={theme.text} />
            </Pressable>
            
            {showCompleted ? (
              <Card style={styles.completedCard}>
                {completedOrders.map(order => (
                  <CompletedOrderCard key={order.id} order={order} />
                ))}
              </Card>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  scrollContent: { paddingHorizontal: Spacing.lg },
  statusCard: { marginBottom: Spacing.md, padding: Spacing.md },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  toggleContainer: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  statsRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: { flex: 1, alignItems: "center", padding: Spacing.md },
  statCardWide: { flex: 1.5, alignItems: "center", padding: Spacing.md },
  sectionTitle: { marginBottom: Spacing.md },
  orderCard: { marginBottom: Spacing.md, padding: Spacing.md },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.xs },
  divider: { height: 1, marginVertical: Spacing.md },
  orderDetails: { marginBottom: Spacing.md },
  detailRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.xs },
  codBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, marginTop: Spacing.sm },
  orderActions: { flexDirection: "row", gap: Spacing.sm },
  mapButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderRadius: BorderRadius.sm },
  actionButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, alignItems: "center" },
  emptyCard: { alignItems: "center", padding: Spacing.xxl },
  completedHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: Spacing.lg, marginBottom: Spacing.md },
  completedCard: { padding: Spacing.md },
  completedRow: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: "#eee" },
  completedInfo: { flex: 1 },
});
