import React, { useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable, Switch, Alert, FlatList } from "react-native";
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

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  items: any[];
  createdAt: string;
  customerLat: string;
  customerLng: string;
}

interface InventoryItem {
  id: string;
  productId: string;
  storeId: string;
  stock: number;
  lowStockThreshold: number;
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
  };
}

interface PickerDashboardData {
  user: { id: string; username: string; phone: string | null; role: string };
  staffRecord: { id: string; userId: string; storeId: string; role: string; status: string };
  store: { id: string; name: string; address: string };
  orders: {
    pending: Order[];
    active: Order[];
    completed: Order[];
  };
}

function OrderCard({ 
  order, 
  onUpdateStatus,
  isUpdating 
}: { 
  order: Order; 
  onUpdateStatus: (orderId: string, status: string) => void;
  isUpdating: boolean;
}) {
  const { theme } = useTheme();
  const createdAt = new Date(order.createdAt);
  
  const getStatusColor = () => {
    switch (order.status) {
      case "pending": return theme.warning;
      case "confirmed": return theme.secondary;
      case "picking": return theme.primary;
      case "packed": return theme.success;
      default: return theme.textSecondary;
    }
  };

  const getNextStatus = () => {
    switch (order.status) {
      case "pending": return "picking";
      case "confirmed": return "picking";
      case "picking": return "packed";
      default: return null;
    }
  };

  const getButtonLabel = () => {
    switch (order.status) {
      case "pending": return "Start Picking";
      case "confirmed": return "Start Picking";
      case "picking": return "Mark as Packed";
      default: return null;
    }
  };

  const nextStatus = getNextStatus();
  const buttonLabel = getButtonLabel();

  return (
    <Card style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <ThemedText type="h3">{order.orderNumber}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {createdAt.toLocaleTimeString()}
          </ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + "20" }]}>
          <ThemedText type="small" style={{ color: getStatusColor() }}>
            {order.status.toUpperCase()}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.itemsList}>
        {order.items.slice(0, 3).map((item: any, index: number) => (
          <ThemedText key={index} type="body" style={{ color: theme.text }}>
            {item.quantity}x {item.name}
          </ThemedText>
        ))}
        {order.items.length > 3 ? (
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            +{order.items.length - 3} more items
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.orderFooter}>
        <ThemedText type="body" style={{ color: theme.text }}>
          Rp {order.total.toLocaleString()}
        </ThemedText>
        {nextStatus && buttonLabel ? (
          <Pressable
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={() => onUpdateStatus(order.id, nextStatus)}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color={theme.buttonText} />
            ) : (
              <ThemedText type="button" style={{ color: theme.buttonText }}>{buttonLabel}</ThemedText>
            )}
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

function InventoryCard({ item }: { item: InventoryItem }) {
  const { theme } = useTheme();
  const isLowStock = item.stock <= item.lowStockThreshold;

  return (
    <View style={styles.inventoryRow}>
      <View style={styles.inventoryInfo}>
        <ThemedText type="body" numberOfLines={1}>{item.product.name}</ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          Rp {item.product.price.toLocaleString()}
        </ThemedText>
      </View>
      <View style={[styles.stockBadge, { backgroundColor: isLowStock ? theme.error + "20" : theme.success + "20" }]}>
        <ThemedText type="body" style={{ color: isLowStock ? theme.error : theme.success }}>
          {item.stock}
        </ThemedText>
      </View>
    </View>
  );
}

export default function PickerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"orders" | "inventory">("orders");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const { data: dashboard, isLoading, refetch, isRefetching } = useQuery<PickerDashboardData>({
    queryKey: ["/api/picker/dashboard", user?.id],
    queryFn: async () => {
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : ""}/api/picker/dashboard?userId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch dashboard");
      return response.json();
    },
    enabled: !!user?.id && user?.role === "picker",
    refetchInterval: 15000,
  });

  const { data: inventory } = useQuery<InventoryItem[]>({
    queryKey: ["/api/picker/inventory", user?.id],
    queryFn: async () => {
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : ""}/api/picker/inventory?userId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch inventory");
      return response.json();
    },
    enabled: !!user?.id && user?.role === "picker" && activeTab === "inventory",
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (status: "online" | "offline") => {
      const response = await apiRequest("POST", "/api/staff/toggle-status", { userId: user?.id, status });
      if (!response.ok) throw new Error("Failed to toggle status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/picker/dashboard"] });
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      setUpdatingOrderId(orderId);
      const response = await apiRequest("PUT", `/api/picker/orders/${orderId}/status`, { userId: user?.id, status });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update order");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/picker/dashboard"] });
      setUpdatingOrderId(null);
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
      setUpdatingOrderId(null);
    },
  });

  if (!user || user.role !== "picker") {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Feather name="lock" size={48} color={theme.error} />
          <ThemedText type="h3" style={{ marginTop: Spacing.md }}>Access Denied</ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
            This dashboard is only for pickers.
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
  const pendingOrders = dashboard?.orders?.pending || [];
  const activeOrders = dashboard?.orders?.active || [];
  const allOrders = [...pendingOrders, ...activeOrders];

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
              <ThemedText type="h3">{dashboard?.user?.username || "Picker"}</ThemedText>
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

        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, activeTab === "orders" && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab("orders")}
          >
            <Feather name="package" size={18} color={activeTab === "orders" ? theme.primary : theme.textSecondary} />
            <ThemedText type="body" style={{ color: activeTab === "orders" ? theme.primary : theme.textSecondary }}>
              Orders ({allOrders.length})
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "inventory" && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab("inventory")}
          >
            <Feather name="box" size={18} color={activeTab === "inventory" ? theme.primary : theme.textSecondary} />
            <ThemedText type="body" style={{ color: activeTab === "inventory" ? theme.primary : theme.textSecondary }}>
              Inventory
            </ThemedText>
          </Pressable>
        </View>

        {activeTab === "orders" ? (
          <>
            {allOrders.length > 0 ? (
              allOrders.map(order => (
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
                <ThemedText type="h3" style={{ marginTop: Spacing.md }}>No Orders</ThemedText>
                <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
                  {isOnline ? "No orders to pick right now. Stay ready!" : "Go online to start receiving orders."}
                </ThemedText>
              </Card>
            )}
          </>
        ) : (
          <Card style={styles.inventoryCard}>
            {inventory && inventory.length > 0 ? (
              inventory.map(item => (
                <InventoryCard key={item.id} item={item} />
              ))
            ) : (
              <View style={styles.emptyInventory}>
                <Feather name="box" size={32} color={theme.textSecondary} />
                <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                  No inventory items
                </ThemedText>
              </View>
            )}
          </Card>
        )}
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
  tabContainer: { flexDirection: "row", marginBottom: Spacing.md },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, paddingVertical: Spacing.md },
  orderCard: { marginBottom: Spacing.md, padding: Spacing.md },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.xs },
  divider: { height: 1, marginVertical: Spacing.md },
  itemsList: { marginBottom: Spacing.md },
  orderFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actionButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm },
  inventoryCard: { padding: Spacing.md },
  inventoryRow: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: "#eee" },
  inventoryInfo: { flex: 1 },
  stockBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm, minWidth: 50, alignItems: "center" },
  emptyCard: { alignItems: "center", padding: Spacing.xxl },
  emptyInventory: { alignItems: "center", padding: Spacing.xl },
});
