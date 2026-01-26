import React, { useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
} from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type OrderSuccessRouteProp = RouteProp<RootStackParamList, "OrderSuccess">;

interface OrderData {
  id: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  total: number;
  estimatedDelivery: number;
}

export default function OrderSuccessScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<OrderSuccessRouteProp>();
  const { orderId } = route.params;

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  // Parse order IDs (could be comma-separated for multiple stores)
  const orderIds = orderId.includes(',') ? orderId.split(',') : [orderId];

  // Fetch all orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["order-success", orderIds],
    queryFn: async () => {
      const orderPromises = orderIds.map(async (id) => {
        const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/orders/${id.trim()}`);
        if (!response.ok) throw new Error("Order not found");
        const orderData = await response.json();
        
        // Fetch store name
        const storeResponse = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/stores/${orderData.storeId}`);
        const storeData = await storeResponse.json();
        
        return {
          id: orderData.id,
          orderNumber: orderData.orderNumber,
          storeId: orderData.storeId,
          storeName: storeData.name,
          total: orderData.total,
          estimatedDelivery: 15, // You can calculate this based on distance if needed
        };
      });
      
      return Promise.all(orderPromises);
    },
  });

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.2, { damping: 8 }),
      withSpring(1, { damping: 12 })
    );
    opacity.value = withDelay(300, withSpring(1));
  }, []);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleTrackOrder = (trackOrderId: string) => {
    navigation.replace("OrderTracking", { orderId: trackOrderId });
  };

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Main" }],
    });
  };

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  const totalAmount = orders.reduce((sum, order) => sum + order.total, 0);

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
        <ThemedText type="body">Loading...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={[
        styles.container,
        { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Animated.View
            style={[styles.iconContainer, { backgroundColor: theme.success }, iconAnimatedStyle]}
          >
            <Feather name="check" size={64} color="#FFFFFF" />
          </Animated.View>
          
          <Animated.View style={[styles.textContent, contentAnimatedStyle]}>
            <View style={[styles.lightningBadge, { backgroundColor: theme.primary }]}>
              <Feather name="zap" size={20} color={theme.buttonText} />
            </View>
            
            <ThemedText type="h1" style={styles.title}>
              {t.orderSuccess.title}
            </ThemedText>
            
            <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
              {orders.length > 1 
                ? `${orders.length} orders confirmed from different stores`
                : t.orderSuccess.orderConfirmed
              }
            </ThemedText>

            {/* Total Amount Summary */}
            {orders.length > 1 && (
              <View style={[styles.totalContainer, { backgroundColor: theme.backgroundDefault }]}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Total Amount
                </ThemedText>
                <ThemedText type="h2" style={{ color: theme.primary }}>
                  {formatPrice(totalAmount)}
                </ThemedText>
              </View>
            )}

            {/* Individual Order Cards */}
            <View style={styles.ordersContainer}>
              {orders.map((order, index) => (
                <Card key={order.id} style={styles.orderCard}>
                  {/* Store Info */}
                  <View style={styles.storeHeader}>
                    <View style={[styles.storeIcon, { backgroundColor: theme.primary + "20" }]}>
                      <Feather name="shopping-bag" size={18} color={theme.primary} />
                    </View>
                    <ThemedText type="body" style={{ fontWeight: "600", flex: 1 }}>
                      {order.storeName}
                    </ThemedText>
                  </View>

                  {/* Order Number */}
                  <View style={styles.orderInfo}>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      Order Number
                    </ThemedText>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      {order.orderNumber}
                    </ThemedText>
                  </View>

                  {/* Amount */}
                  <View style={styles.orderInfo}>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      Amount
                    </ThemedText>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      {formatPrice(order.total)}
                    </ThemedText>
                  </View>

                  {/* Estimated Delivery */}
                  <View style={styles.estimateContainer}>
                    <Feather name="clock" size={16} color={theme.primary} />
                    <View>
                      <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                        Estimated Delivery
                      </ThemedText>
                      <ThemedText type="body" style={{ fontWeight: "600", color: theme.primary }}>
                        {order.estimatedDelivery} {t.orderSuccess.minutes}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Track Order Button */}
                  <Button 
                    onPress={() => handleTrackOrder(order.id)}
                    style={styles.trackButton}
                  >
                    {t.orderSuccess.trackOrder}
                  </Button>
                </Card>
              ))}
            </View>
          </Animated.View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <Button variant="text" onPress={handleGoHome}>
          {t.orderSuccess.backToHome}
        </Button>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xxl,
    marginTop: Spacing.xl,
  },
  textContent: {
    alignItems: "center",
    width: "100%",
  },
  lightningBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  totalContainer: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },
  ordersContainer: {
    width: "100%",
    gap: Spacing.md,
  },
  orderCard: {
    padding: Spacing.lg,
  },
  storeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  storeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  orderInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  estimateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  trackButton: {
    marginTop: Spacing.sm,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
});