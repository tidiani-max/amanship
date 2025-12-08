import React, { useState } from "react";
import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Order } from "@/types";
import { mockOrders } from "@/data/mockData";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  const activeOrders = mockOrders.filter(
    (o) => o.status === "pending" || o.status === "preparing" || o.status === "on_the_way"
  );
  const completedOrders = mockOrders.filter((o) => o.status === "delivered");

  const orders = activeTab === "active" ? activeOrders : completedOrders;

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return theme.warning;
      case "preparing":
        return theme.secondary;
      case "on_the_way":
        return theme.primary;
      case "delivered":
        return theme.success;
      default:
        return theme.textSecondary;
    }
  };

  const getStatusText = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "preparing":
        return "Preparing";
      case "on_the_way":
        return "On the way";
      case "delivered":
        return "Delivered";
      default:
        return status;
    }
  };

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleOrderPress = (order: Order) => {
    if (order.status === "on_the_way") {
      navigation.navigate("OrderTracking", { orderId: order.id });
    } else {
      navigation.navigate("OrderDetail", { order });
    }
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <Card style={styles.orderCard} onPress={() => handleOrderPress(item)}>
      <View style={styles.orderHeader}>
        <ThemedText type="body" style={{ fontWeight: "600" }}>
          {item.id}
        </ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
          <ThemedText
            type="small"
            style={{ color: getStatusColor(item.status), fontWeight: "500" }}
          >
            {getStatusText(item.status)}
          </ThemedText>
        </View>
      </View>
      
      <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
        {formatDate(item.createdAt)} • {item.items.length} items
      </ThemedText>
      
      <View style={styles.orderItems}>
        {item.items.slice(0, 2).map((cartItem, index) => (
          <ThemedText key={index} type="small" style={{ color: theme.textSecondary }}>
            {cartItem.quantity}x {cartItem.product.name}
          </ThemedText>
        ))}
        {item.items.length > 2 ? (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            +{item.items.length - 2} more items
          </ThemedText>
        ) : null}
      </View>
      
      <View style={styles.orderFooter}>
        <ThemedText type="body" style={{ fontWeight: "600" }}>
          {formatPrice(item.total + item.deliveryFee)}
        </ThemedText>
        {item.status === "on_the_way" ? (
          <View style={styles.trackButton}>
            <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600" }}>
              Track Order
            </ThemedText>
            <Feather name="chevron-right" size={16} color={theme.primary} />
          </View>
        ) : null}
      </View>
    </Card>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <ThemedText type="h2">My Orders</ThemedText>
      </View>
      
      <View style={styles.tabsContainer}>
        <Pressable
          style={[
            styles.tab,
            activeTab === "active" && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab("active")}
        >
          <ThemedText
            type="body"
            style={{
              fontWeight: activeTab === "active" ? "600" : "400",
              color: activeTab === "active" ? theme.primary : theme.textSecondary,
            }}
          >
            Active ({activeOrders.length})
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            activeTab === "completed" && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab("completed")}
        >
          <ThemedText
            type="body"
            style={{
              fontWeight: activeTab === "completed" ? "600" : "400",
              color: activeTab === "completed" ? theme.primary : theme.textSecondary,
            }}
          >
            Completed ({completedOrders.length})
          </ThemedText>
        </Pressable>
      </View>
      
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="shopping-bag" size={48} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              No {activeTab} orders yet
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  orderCard: {
    marginBottom: Spacing.sm,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  orderItems: {
    marginBottom: Spacing.md,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl * 2,
  },
});
