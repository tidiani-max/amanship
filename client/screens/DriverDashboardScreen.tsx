// Replace your entire driver dashboard file with this

import React, { useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable, Alert, Linking, Platform, TextInput, Modal, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing } from "@/constants/theme";

function PINModal({ 
  visible, 
  onClose, 
  onSubmit,
  isLoading 
}: { 
  visible: boolean; 
  onClose: () => void;
  onSubmit: (pin: string) => void;
  isLoading: boolean;
}) {
  const { theme } = useTheme();
  const [pin, setPin] = useState("");

  const handleSubmit = () => {
    if (pin.length !== 4) {
      Alert.alert("Invalid PIN", "Please enter the 4-digit code");
      return;
    }
    onSubmit(pin);
    setPin("");
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
          <ThemedText type="h3" style={{ marginBottom: 12 }}>Enter Delivery PIN</ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: 20, textAlign: "center" }}>
            Ask the customer for their 4-digit PIN
          </ThemedText>

          <TextInput
            style={[styles.pinInput, { 
              backgroundColor: theme.backgroundRoot, 
              color: theme.text,
              borderColor: theme.border 
            }]}
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
              onPress={() => {
                setPin("");
                onClose();
              }}
              disabled={isLoading}
            >
              <ThemedText type="button">Cancel</ThemedText>
            </Pressable>

            <Pressable
              style={[styles.modalButton, { 
                backgroundColor: theme.primary,
                opacity: (pin.length === 4 && !isLoading) ? 1 : 0.5 
              }]}
              onPress={handleSubmit}
              disabled={pin.length !== 4 || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <ThemedText type="button" style={{ color: "#FFF" }}>Confirm</ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function OrderCard({ 
  order, 
  onPickup,
  onComplete,
  isUpdating,
  disabled
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
    if (isDelivered) return theme.success;
    if (isAtStore) return theme.warning;
    if (isOnWay) return theme.primary;
    return theme.textSecondary;
  };

  const openMaps = () => {
    const lat = order.customer_lat || order.customerLat;
    const lng = order.customer_lng || order.customerLng;
    
    if (!lat || !lng) {
      Alert.alert("Error", "Location data missing");
      return;
    }

    const label = encodeURIComponent("Customer Drop-off");

    if (Platform.OS === 'android') {
      Linking.openURL(`google.navigation:q=${lat},${lng}`).catch(() => {
        Linking.openURL(`geo:${lat},${lng}?q=${lat},${lng}(${label})`);
      });
    } else {
      Linking.openURL(`maps://?ll=${lat},${lng}&q=${label}&t=m`).catch(() => {
        Linking.openURL(`http://maps.google.com/?q=${lat},${lng}`);
      });
    }
  };

  return (
    <Card style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <ThemedText type="h3">{order.orderNumber || order.id.slice(0, 8).toUpperCase()}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {isDelivered ? "✅ Delivered" : isAtStore ? "📍 Waiting at Store" : "🚚 In Transit"}
          </ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + "20" }]}>
          <ThemedText type="small" style={{ color: getStatusColor() }}>
            {order.status.toUpperCase()}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      {/* ✅ NEW: Customer Address Section */}
      {order.address && (
        <View style={[styles.addressSection, { 
          backgroundColor: theme.backgroundDefault, 
          borderRadius: 8,
          padding: 12,
          marginBottom: 12 
        }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Feather name="map-pin" size={16} color={theme.primary} />
            <ThemedText type="body" style={{ fontWeight: '600', marginLeft: 6 }}>
              Delivery Address
            </ThemedText>
          </View>
          
          {/* Address Label */}
          {order.address.label && (
            <ThemedText type="h3" style={{ marginBottom: 4 }}>
              {order.address.label}
            </ThemedText>
          )}
          
          {/* Full Address */}
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            {order.address.fullAddress}
          </ThemedText>
          
          {/* Additional Details */}
          {order.address.details && (
            <View style={{ 
              marginTop: 8, 
              paddingTop: 8, 
              borderTopWidth: 1, 
              borderTopColor: theme.border 
            }}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                📝 {order.address.details}
              </ThemedText>
            </View>
          )}
        </View>
      )}


      <View style={styles.orderDetails}>
        {!isDelivered && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8 }}>
            <Feather name="home" size={14} color={theme.textSecondary} />
            <View style={{ flex: 1, height: 2, backgroundColor: isAtStore ? theme.border : theme.primary }} />
            <Feather name="truck" size={16} color={isOnWay ? theme.primary : theme.textSecondary} />
            <View style={{ flex: 1, height: 2, backgroundColor: theme.border }} />
            <Feather name="map-pin" size={14} color={theme.textSecondary} />
          </View>
        )}

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

        {isDelivered && order.deliveredAt && (
          <View style={{ marginTop: 8 }}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Delivered: {new Date(order.deliveredAt).toLocaleString()}
            </ThemedText>
          </View>
        )}
      </View>

      {!isDelivered && (
        <View style={styles.orderActions}>
          <Pressable style={[styles.mapButton, { borderColor: theme.border }]} onPress={openMaps}>
            <Feather name="navigation" size={18} color={theme.secondary} />
          </Pressable>

          <Pressable style={[styles.mapButton, { borderColor: theme.border }]} onPress={() => navigation.navigate("Chat", { orderId: order.id })}>
            <Feather name="message-square" size={18} color={theme.primary} />
          </Pressable>
          
          {isAtStore && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: disabled ? "#999" : theme.primary, flex: 1 }]}
              onPress={() => onPickup(order.id)}
              disabled={isUpdating || disabled}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="package" size={16} color="#FFF" />
                  <ThemedText type="button" style={{ color: "#FFF" }}>Pick Up</ThemedText>
                </View>
              )}
            </Pressable>
          )}

          {isOnWay && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: disabled ? "#999" : theme.success, flex: 1 }]}
              onPress={() => onComplete(order.id)}
              disabled={isUpdating || disabled}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="check-circle" size={16} color="#FFF" />
                  <ThemedText type="button" style={{ color: "#FFF" }}>Enter PIN</ThemedText>
                </View>
              )}
            </Pressable>
          )}
        </View>
      )}
    </Card>
  );
}

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

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const { data: dashboard, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["/api/driver/dashboard", user?.id],
    queryFn: async () => {
      const baseUrl = process.env.EXPO_PUBLIC_DOMAIN!;
      const response = await fetch(`${baseUrl}/api/driver/dashboard?userId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch dashboard");
      return response.json();
    },
    enabled: !!user?.id && user?.role === "driver",
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

  const pickupMutation = useMutation({
    mutationFn: async (orderId: string) => {
      setUpdatingOrderId(orderId);
      const response = await apiRequest("PUT", `/api/driver/orders/${orderId}/status`, { 
        userId: user?.id, 
        status: "delivering" 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/dashboard"] });
      setUpdatingOrderId(null);
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
      setUpdatingOrderId(null);
    }
  });

  const completeMutation = useMutation({
    mutationFn: async ({ orderId, pin }: { orderId: string; pin: string }) => {
      setUpdatingOrderId(orderId);
      const response = await apiRequest("PUT", `/api/driver/orders/${orderId}/complete`, {
        userId: user?.id,
        deliveryPin: pin
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to complete delivery");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver/dashboard"] });
      setPinModalVisible(false);
      setSelectedOrderId(null);
      setUpdatingOrderId(null);
      Alert.alert("✅ Success", "Order delivered successfully!");
    },
    onError: (error: Error) => {
      Alert.alert("❌ Incorrect PIN", error.message || "The PIN you entered is incorrect. Please try again.");
      setUpdatingOrderId(null);
    }
  });

  const handleComplete = (orderId: string) => {
    setSelectedOrderId(orderId);
    setPinModalVisible(true);
  };

  const handlePinSubmit = (pin: string) => {
    if (selectedOrderId) {
      completeMutation.mutate({ orderId: selectedOrderId, pin });
    }
  };

  if (!user || user.role !== "driver") {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Feather name="lock" size={48} color={theme.error} />
          <ThemedText type="h3" style={{ marginTop: Spacing.md }}>Access Denied</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  const readyOrders = dashboard?.orders?.ready || [];
  const activeOrders = dashboard?.orders?.active || [];
  const completedOrders = dashboard?.orders?.completed || [];
  const hasActiveDelivery = activeOrders.length > 0;
  
  const allActiveOrders = (hasActiveDelivery ? activeOrders : readyOrders)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const sortedCompletedOrders = completedOrders
    .sort((a: any, b: any) => new Date(b.deliveredAt || b.createdAt).getTime() - new Date(a.deliveredAt || a.createdAt).getTime());
  
  const todayEarnings = completedOrders.reduce((sum: number, order: any) => sum + order.total, 0);

  return (
    <ThemedView style={styles.container}>
      {/* ✅ HEADER WITH BUTTONS AT TOP */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.backgroundDefault, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
        {/* Top row: Title + Buttons */}
        <View style={styles.titleRow}>
          <ThemedText type="h2">Delivery Hub</ThemedText>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.iconButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Feather name="bell" size={20} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.iconButton, { backgroundColor: '#ff4444' }]}
              onPress={handleLogout}
            >
              <Feather name="log-out" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Status row */}
        <View style={[styles.statusRow, { marginTop: 8, marginBottom: 16 }]}>
          <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 6 }}>
            Online & Ready
          </ThemedText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      >
        <View style={styles.sectionHeader}>
          <Feather name="truck" size={20} color={theme.primary} />
          <ThemedText type="h3" style={styles.sectionTitle}>
            Active Deliveries ({allActiveOrders.length})
          </ThemedText>
        </View>

        {allActiveOrders.length > 0 ? (
          allActiveOrders.map((order: any) => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onPickup={(orderId) => pickupMutation.mutate(orderId)}
              onComplete={handleComplete}
              isUpdating={updatingOrderId === order.id}
              disabled={hasActiveDelivery && order.status === "packed"}
            />
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Feather name="inbox" size={48} color={theme.textSecondary} />
            <ThemedText type="h3" style={{ marginTop: Spacing.md, color: theme.textSecondary }}>No Deliveries</ThemedText>
            <ThemedText type="body" style={{ marginTop: 8, color: theme.textSecondary }}>
              New orders will appear here
            </ThemedText>
          </Card>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xl, marginBottom: 12 }}>
          <View style={styles.sectionHeader}>
            <Feather name="check-circle" size={20} color={theme.success} />
            <ThemedText type="h3" style={styles.sectionTitle}>
              Today's Completed ({sortedCompletedOrders.length})
            </ThemedText>
          </View>
          <Pressable onPress={() => setShowCompleted(!showCompleted)}>
            <Feather name={showCompleted ? "chevron-up" : "chevron-down"} size={24} color={theme.text} />
          </Pressable>
        </View>

        {showCompleted && (
          <>
            {sortedCompletedOrders.length > 0 ? (
              <>
                <Card style={{ padding: 16, marginBottom: 12, backgroundColor: theme.success + "15" }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <ThemedText type="body">💰 Total Earnings Today</ThemedText>
                    <ThemedText type="h2" style={{ color: theme.success }}>
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
                <Feather name="check-circle" size={48} color={theme.textSecondary} />
                <ThemedText type="body" style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
                  No deliveries completed today
                </ThemedText>
              </Card>
            )}
          </>
        )}
      </ScrollView>

      <PINModal
        visible={pinModalVisible}
        onClose={() => {
          setPinModalVisible(false);
          setSelectedOrderId(null);
        }}
        onSubmit={handlePinSubmit}
        isLoading={completeMutation.isPending}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  headerActions: { flexDirection: 'row', gap: 10 },
  iconButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { marginBottom: 0 },
  orderCard: { marginBottom: 12, padding: 16 },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  divider: { height: 1, marginVertical: 12 },
  orderDetails: { marginBottom: 12 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  codBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 8 },
  orderActions: { flexDirection: "row", gap: 8 },
  mapButton: { padding: 10, borderWidth: 1, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  actionButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  emptyCard: { alignItems: "center", padding: 40 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "80%", padding: 24, borderRadius: 16, alignItems: "center" },
  pinInput: { fontSize: 32, fontWeight: "bold", letterSpacing: 12, textAlign: "center", paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, borderWidth: 2, width: "100%" },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  addressSection: {
    // Added inline in component
  },
});