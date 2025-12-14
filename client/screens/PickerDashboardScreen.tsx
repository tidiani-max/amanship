import React, { useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable, Switch, Alert, TextInput, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";
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

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  categoryId: string;
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

function InventoryItemRow({ 
  item, 
  onUpdateStock,
  isUpdating,
  onEditComplete
}: { 
  item: InventoryItem;
  onUpdateStock: (id: string, newStock: number) => void;
  isUpdating: boolean;
  onEditComplete: () => void;
}) {
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [stockValue, setStockValue] = useState(String(item.stock));
  const [submittedValue, setSubmittedValue] = useState<number | null>(null);
  const isLowStock = item.stock <= item.lowStockThreshold;

  React.useEffect(() => {
    if (!isUpdating && isEditing && submittedValue !== null) {
      if (item.stock === submittedValue) {
        setStockValue(String(item.stock));
        setIsEditing(false);
        setSubmittedValue(null);
        onEditComplete();
      } else {
        setSubmittedValue(null);
      }
    }
  }, [isUpdating, item.stock, submittedValue]);

  const handleSave = () => {
    const newStock = parseInt(stockValue, 10);
    if (isNaN(newStock) || newStock < 0) {
      Alert.alert("Invalid Stock", "Please enter a valid stock number");
      setStockValue(String(item.stock));
      return;
    }
    setSubmittedValue(newStock);
    onUpdateStock(item.id, newStock);
  };

  const handleCancel = () => {
    if (isUpdating) return;
    setStockValue(String(item.stock));
    setIsEditing(false);
  };

  return (
    <View style={[styles.inventoryRow, { borderBottomColor: theme.border }]}>
      <View style={styles.inventoryInfo}>
        <ThemedText type="body" numberOfLines={1}>{item.product.name}</ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          Rp {item.product.price.toLocaleString()}
        </ThemedText>
      </View>
      {isEditing ? (
        <View style={styles.editStockContainer}>
          <TextInput
            style={[styles.stockInput, { borderColor: theme.border, color: theme.text }]}
            value={stockValue}
            onChangeText={setStockValue}
            keyboardType="numeric"
            autoFocus
            editable={!isUpdating}
          />
          <Pressable 
            style={[styles.stockSaveButton, { backgroundColor: theme.success, opacity: isUpdating ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="check" size={16} color="#fff" />
            )}
          </Pressable>
          <Pressable 
            style={[styles.stockCancelButton, { backgroundColor: theme.textSecondary, opacity: isUpdating ? 0.5 : 1 }]}
            onPress={handleCancel}
            disabled={isUpdating}
          >
            <Feather name="x" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <Pressable 
          style={[styles.stockBadge, { backgroundColor: isLowStock ? theme.error + "20" : theme.success + "20" }]}
          onPress={() => setIsEditing(true)}
        >
          <ThemedText type="body" style={{ color: isLowStock ? theme.error : theme.success }}>
            {item.stock}
          </ThemedText>
          <Feather name="edit-2" size={12} color={isLowStock ? theme.error : theme.success} style={{ marginLeft: 4 }} />
        </Pressable>
      )}
    </View>
  );
}

function AddProductModal({
  visible,
  onClose,
  onAddProduct,
  existingProductIds,
  isAdding
}: {
  visible: boolean;
  onClose: () => void;
  onAddProduct: (productId: string, stock: number) => void;
  existingProductIds: string[];
  isAdding: boolean;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockCount, setStockCount] = useState("10");

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch(new URL("/api/products", getApiUrl()).toString());
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
    enabled: visible,
  });

  const availableProducts = products?.filter(p => !existingProductIds.includes(p.id)) || [];

  const handleAdd = () => {
    if (!selectedProduct) {
      Alert.alert("Select Product", "Please select a product to add");
      return;
    }
    const stock = parseInt(stockCount, 10);
    if (isNaN(stock) || stock < 0) {
      Alert.alert("Invalid Stock", "Please enter a valid stock number");
      return;
    }
    onAddProduct(selectedProduct.id, stock);
  };

  const handleClose = () => {
    if (isAdding) return;
    setSelectedProduct(null);
    setStockCount("10");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.cardBackground, paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="h3">Add Product to Inventory</ThemedText>
            <Pressable onPress={handleClose} disabled={isAdding}>
              <Feather name="x" size={24} color={isAdding ? theme.textSecondary : theme.text} />
            </Pressable>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: Spacing.xl }} />
          ) : availableProducts.length === 0 ? (
            <View style={styles.emptyProducts}>
              <Feather name="package" size={48} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
                All products are already in inventory
              </ThemedText>
            </View>
          ) : (
            <ScrollView style={styles.productList} showsVerticalScrollIndicator={false}>
              {availableProducts.map(product => (
                <Pressable
                  key={product.id}
                  style={[
                    styles.productOption,
                    { borderColor: theme.border },
                    selectedProduct?.id === product.id && { borderColor: theme.primary, backgroundColor: theme.primary + "10" }
                  ]}
                  onPress={() => !isAdding && setSelectedProduct(product)}
                  disabled={isAdding}
                >
                  <View style={styles.productOptionInfo}>
                    <ThemedText type="body">{product.name}</ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      Rp {product.price.toLocaleString()}
                    </ThemedText>
                  </View>
                  {selectedProduct?.id === product.id ? (
                    <Feather name="check-circle" size={20} color={theme.primary} />
                  ) : (
                    <Feather name="circle" size={20} color={theme.border} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          )}

          <KeyboardAwareScrollViewCompat 
            style={{ flexShrink: 0 }}
            contentContainerStyle={{ flexGrow: 0 }}
          >
            {selectedProduct ? (
              <View style={styles.stockInputSection}>
                <ThemedText type="body" style={{ marginBottom: Spacing.sm }}>Initial Stock:</ThemedText>
                <TextInput
                  style={[styles.stockInputLarge, { borderColor: theme.border, color: theme.text }]}
                  value={stockCount}
                  onChangeText={setStockCount}
                  keyboardType="numeric"
                  placeholder="Enter stock count"
                  placeholderTextColor={theme.textSecondary}
                  editable={!isAdding}
                />
              </View>
            ) : null}
          </KeyboardAwareScrollViewCompat>

          <View style={styles.modalActions}>
            <Pressable 
              style={[styles.modalButton, { backgroundColor: theme.border, opacity: isAdding ? 0.5 : 1 }]}
              onPress={handleClose}
              disabled={isAdding}
            >
              <ThemedText type="button" style={{ color: theme.text }}>Cancel</ThemedText>
            </Pressable>
            <Pressable 
              style={[styles.modalButton, { backgroundColor: theme.primary, opacity: (selectedProduct && !isAdding) ? 1 : 0.5 }]}
              onPress={handleAdd}
              disabled={!selectedProduct || isAdding}
            >
              {isAdding ? (
                <ActivityIndicator size="small" color={theme.buttonText} />
              ) : (
                <ThemedText type="button" style={{ color: theme.buttonText }}>Add Product</ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function PickerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"orders" | "inventory">("orders");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [updatingInventoryId, setUpdatingInventoryId] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);

  const { data: dashboard, isLoading, refetch, isRefetching } = useQuery<PickerDashboardData>({
    queryKey: ["/api/picker/dashboard", user?.id],
    queryFn: async () => {
      const response = await fetch(new URL(`/api/picker/dashboard?userId=${user?.id}`, getApiUrl()).toString());
      if (!response.ok) throw new Error("Failed to fetch dashboard");
      return response.json();
    },
    enabled: !!user?.id && user?.role === "picker",
    refetchInterval: 15000,
  });

  const { data: inventory, refetch: refetchInventory } = useQuery<InventoryItem[]>({
    queryKey: ["/api/picker/inventory", user?.id],
    queryFn: async () => {
      const response = await fetch(new URL(`/api/picker/inventory?userId=${user?.id}`, getApiUrl()).toString());
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

  const updateInventoryMutation = useMutation({
    mutationFn: async ({ inventoryId, stockCount }: { inventoryId: string; stockCount: number }) => {
      setUpdatingInventoryId(inventoryId);
      const response = await apiRequest("PUT", `/api/picker/inventory/${inventoryId}`, { 
        userId: user?.id, 
        stockCount 
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update inventory");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/picker/inventory", user?.id] });
      setUpdatingInventoryId(null);
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
      setUpdatingInventoryId(null);
    },
  });

  const addProductMutation = useMutation({
    mutationFn: async ({ productId, stockCount }: { productId: string; stockCount: number }) => {
      const response = await apiRequest("POST", "/api/picker/inventory", { 
        userId: user?.id, 
        productId,
        stockCount 
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add product");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/picker/inventory", user?.id] });
      setShowAddProduct(false);
      Alert.alert("Success", "Product added to inventory");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
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
  const existingProductIds = inventory?.map(i => i.productId) || [];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); if (activeTab === "inventory") refetchInventory(); }} tintColor={theme.primary} />}
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
          <>
            <Pressable 
              style={[styles.addProductButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowAddProduct(true)}
            >
              <Feather name="plus" size={18} color={theme.buttonText} />
              <ThemedText type="button" style={{ color: theme.buttonText, marginLeft: Spacing.xs }}>
                Add Product
              </ThemedText>
            </Pressable>

            <Card style={styles.inventoryCard}>
              {inventory && inventory.length > 0 ? (
                inventory.map(item => (
                  <InventoryItemRow 
                    key={item.id} 
                    item={item}
                    onUpdateStock={(id, newStock) => updateInventoryMutation.mutate({ inventoryId: id, stockCount: newStock })}
                    isUpdating={updatingInventoryId === item.id}
                    onEditComplete={() => setUpdatingInventoryId(null)}
                  />
                ))
              ) : (
                <View style={styles.emptyInventory}>
                  <Feather name="box" size={32} color={theme.textSecondary} />
                  <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                    No inventory items. Add products to get started.
                  </ThemedText>
                </View>
              )}
            </Card>
          </>
        )}
      </ScrollView>

      <AddProductModal
        visible={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        onAddProduct={(productId, stock) => addProductMutation.mutate({ productId, stockCount: stock })}
        existingProductIds={existingProductIds}
        isAdding={addProductMutation.isPending}
      />
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
  addProductButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md },
  inventoryCard: { padding: Spacing.md },
  inventoryRow: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  inventoryInfo: { flex: 1 },
  stockBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm, minWidth: 60 },
  editStockContainer: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  stockInput: { width: 60, height: 36, borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, textAlign: "center" },
  stockSaveButton: { width: 36, height: 36, borderRadius: BorderRadius.sm, alignItems: "center", justifyContent: "center" },
  stockCancelButton: { width: 36, height: 36, borderRadius: BorderRadius.sm, alignItems: "center", justifyContent: "center" },
  emptyCard: { alignItems: "center", padding: Spacing.xxl },
  emptyInventory: { alignItems: "center", padding: Spacing.xl },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg },
  productList: { maxHeight: 300 },
  productOption: { flexDirection: "row", alignItems: "center", padding: Spacing.md, borderWidth: 1, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  productOptionInfo: { flex: 1 },
  emptyProducts: { alignItems: "center", padding: Spacing.xl },
  stockInputSection: { marginTop: Spacing.lg },
  stockInputLarge: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: 16 },
  modalActions: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.lg },
  modalButton: { flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, alignItems: "center" },
});
