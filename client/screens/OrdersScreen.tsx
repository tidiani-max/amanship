import React, { useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

// Components & Hooks
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  const userId = user?.id;

  const { data: allOrders = [], isLoading, refetch } = useQuery({
    queryKey: ["orders", userId], 
    queryFn: async () => {
      if (!userId) return [];
      
      const response = await fetch(
       `${process.env.EXPO_PUBLIC_DOMAIN}/api/orders?userId=${userId}&role=customer`
      );
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    },
    enabled: !!userId,
    refetchInterval: 5000,
  });

  const activeOrders = allOrders.filter((o: any) => 
    ["pending", "picking", "packing", "packed", "delivering", "created", "confirmed"].includes(o.status?.toLowerCase())
  );
  
  const completedOrders = allOrders.filter((o: any) => 
    o.status === "delivered"
  );

  const orders = activeTab === "active" ? activeOrders : completedOrders;

  const formatPrice = (price: any) => {
    const num = Number(price) || 0;
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  const formatDate = (dateInput: Date | string) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": 
      case "confirmed": return theme.success;
      case "picking": return theme.secondary;
      case "packing": return theme.secondary;
      case "packed": return theme.warning;
      case "delivering": return theme.primary;
      case "delivered": return theme.success;
      default: return theme.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "PENDING";
      case "confirmed": return "CONFIRMED";
      case "picking": return "PICKING";
      case "packing": return "PACKING";
      case "packed": return "PACKED";
      case "delivering": return "ON THE WAY";
      case "delivered": return "DELIVERED";
      default: return status.toUpperCase();
    }
  };

  const handleOrderPress = (order: any) => {
    // Only go to order detail if delivered, otherwise go to tracking
    if (order.status === "delivered") {
      navigation.navigate("OrderDetail", { order });
    } else {
      navigation.navigate("OrderTracking", { orderId: order.id });
    }
  };

  const renderOrder = ({ item }: { item: any }) => {
    const firstItem = item.items?.[0];
    const isActiveOrder = item.status !== "delivered";

    return (
      <Card style={styles.orderCard} onPress={() => handleOrderPress(item)}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {/* IMAGE CONTAINER */}
          <View style={styles.imageContainer}>
            {firstItem?.productImage ? (
              <Image source={{ uri: firstItem.productImage }} style={styles.productImage} />
            ) : (
              <Feather name="package" size={24} color="#999" />
            )}
          </View>

          {/* INFO CONTAINER */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <ThemedText style={{ fontWeight: "700", flex: 1, marginRight: 8 }}>
                {firstItem?.productName || "Order"}
                {item.items?.length > 1 ? ` (+${item.items.length - 1})` : ""}
              </ThemedText>
              <View style={{
                backgroundColor: getStatusColor(item.status) + '20',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
              }}>
                <ThemedText style={{ 
                  color: getStatusColor(item.status), 
                  fontWeight: 'bold', 
                  fontSize: 10 
                }}>
                  {getStatusLabel(item.status)}
                </ThemedText>
              </View>
            </View>
            
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
              {formatDate(item.createdAt)}
            </ThemedText>
            
            {/* Status indicator for active orders */}
            {isActiveOrder && (
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                gap: 6,
                marginTop: 8,
                backgroundColor: theme.primary + '10',
                paddingHorizontal: 8,
                paddingVertical: 6,
                borderRadius: 6,
                alignSelf: 'flex-start',
              }}>
                <Feather name="clock" size={12} color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.primary, fontWeight: '600' }}>
                  {item.status === "confirmed" && "Getting ready..."}
                  {item.status === "picking" && "Picking items..."}
                  {item.status === "packing" && "Packing..."}
                  {item.status === "packed" && "Waiting for driver"}
                  {item.status === "delivering" && "On the way"}
                </ThemedText>
              </View>
            )}
            
            {/* Delivery PIN Badge - Only show when delivering */}
            {item.status === "delivering" && item.deliveryPin && (
              <View style={{ 
                backgroundColor: theme.warning + "20", 
                paddingHorizontal: 10, 
                paddingVertical: 6, 
                borderRadius: 8,
                marginTop: 8,
                alignSelf: 'flex-start',
                borderWidth: 1,
                borderColor: theme.warning + '40',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="shield" size={12} color={theme.warning} />
                  <ThemedText type="small" style={{ color: theme.warning, fontWeight: "bold" }}>
                    PIN: {item.deliveryPin}
                  </ThemedText>
                </View>
              </View>
            )}
            
            <ThemedText style={{ fontWeight: "700", marginTop: 8, fontSize: 16 }}>
              {formatPrice(item.total)}
            </ThemedText>
          </View>
        </View>

        {/* Track Order Button for active orders */}
        {isActiveOrder && (
          <View style={{ 
            marginTop: 12, 
            paddingTop: 12, 
            borderTopWidth: 1, 
            borderTopColor: theme.border 
          }}>
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: 6,
            }}>
              <Feather name="navigation" size={14} color={theme.primary} />
              <ThemedText style={{ color: theme.primary, fontWeight: '600', fontSize: 13 }}>
                Track Order
              </ThemedText>
            </View>
          </View>
        )}
      </Card>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <ThemedText type="h2">My Orders</ThemedText>
      </View>
      
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, activeTab === "active" && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab("active")}
        >
          <ThemedText type="body" style={{ 
            fontWeight: activeTab === "active" ? "600" : "400", 
            color: activeTab === "active" ? theme.primary : theme.textSecondary 
          }}>
            Active ({activeOrders.length})
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "completed" && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab("completed")}
        >
          <ThemedText type="body" style={{ 
            fontWeight: activeTab === "completed" ? "600" : "400", 
            color: activeTab === "completed" ? theme.primary : theme.textSecondary 
          }}>
            History ({completedOrders.length})
          </ThemedText>
        </Pressable>
      </View>
      
      <FlatList
        data={orders}
        renderItem={renderOrder}
        onRefresh={refetch}
        refreshing={isLoading}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather 
              name={activeTab === "active" ? "shopping-bag" : "check-circle"} 
              size={48} 
              color={theme.textSecondary} 
            />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              {activeTab === "active" ? "No active orders" : "No order history"}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 8 }}>
              {activeTab === "active" 
                ? "Start shopping to see your orders here" 
                : "Completed orders will appear here"}
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  tabsContainer: { flexDirection: "row", paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  tab: { flex: 1, alignItems: "center", paddingVertical: Spacing.md },
  listContent: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  orderCard: { marginBottom: Spacing.sm, padding: Spacing.md },
  imageContainer: { 
    width: 60, 
    height: 60, 
    borderRadius: 8, 
    backgroundColor: '#f0f0f0', 
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center'
  },
  productImage: { width: '100%', height: '100%' },
  emptyState: { 
    alignItems: "center", 
    justifyContent: "center", 
    marginTop: 100,
    paddingHorizontal: 40,
  },
});