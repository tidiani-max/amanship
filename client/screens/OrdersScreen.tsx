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
    ["pending", "picking", "packed", "delivering", "created", "confirmed"].includes(o.status?.toLowerCase())
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
      case "pending": return theme.warning;
      case "picking": return theme.secondary;
      case "packed": return theme.secondary;
      case "delivering": return theme.primary;
      case "delivered": return theme.success;
      default: return theme.textSecondary;
    }
  };

  const handleOrderPress = (order: any) => {
    if (order.status === "delivering" || order.status === "packed") {
      navigation.navigate("OrderTracking", { orderId: order.id });
    } else {
      navigation.navigate("OrderDetail", { order });
    }
  };

  const renderOrder = ({ item }: { item: any }) => {
    const firstItem = item.items?.[0];

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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText style={{ fontWeight: "700" }}>
                {firstItem?.productName || "Order"}
                {item.items?.length > 1 ? ` (+${item.items.length - 1})` : ""}
              </ThemedText>
              <ThemedText style={{ color: getStatusColor(item.status), fontWeight: 'bold', fontSize: 12 }}>
                {item.status.toUpperCase()}
              </ThemedText>
            </View>
            
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {formatDate(item.createdAt)}
            </ThemedText>
            
            {/* ✅ DELIVERY PIN BADGE - Only show when delivering */}
            {item.status === "delivering" && item.deliveryPin && (
              <View style={{ 
                backgroundColor: theme.primary + "15", 
                paddingHorizontal: 8, 
                paddingVertical: 4, 
                borderRadius: 4,
                marginTop: 6,
                alignSelf: 'flex-start'
              }}>
                <ThemedText type="small" style={{ color: theme.primary, fontWeight: "bold" }}>
                  PIN: {item.deliveryPin}
                </ThemedText>
              </View>
            )}
            
            <ThemedText style={{ fontWeight: "700", marginTop: 4 }}>
              {formatPrice(item.total)}
            </ThemedText>
          </View>
        </View>
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
            <Feather name="shopping-bag" size={48} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              No orders found
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
  emptyState: { alignItems: "center", justifyContent: "center", marginTop: 100 },
});