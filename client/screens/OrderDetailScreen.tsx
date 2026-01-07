import React from "react";
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Image,
  Pressable 
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { CallButton } from "@/components/CallButton";

type OrderDetailRouteProp = RouteProp<RootStackParamList, "OrderDetail">;
// Define the specific navigation type to avoid 'never' errors
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const route = useRoute<OrderDetailRouteProp>();
  const initialOrder = route.params.order;

  // Fetch fresh details to ensure productName and priceAtEntry are present
  const { data: order, isLoading } = useQuery({
    queryKey: ["order-detail", initialOrder.id],
    queryFn: async () => {
      const response = await fetch(`process.env.EXPO_PUBLIC_DOMAIN/api/orders/${initialOrder.id}`);
      if (!response.ok) throw new Error("Order not found");
      return response.json();
    },
    initialData: initialOrder,
  });

  const formatPrice = (price: any) => {
    const num = Number(price) || 0;
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  const formatDate = (dateInput: Date | string) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading && !order) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={[
        styles.scrollContent,
        { 
          paddingTop: headerHeight + Spacing.lg, 
          paddingBottom: insets.bottom + Spacing.xl 
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER SECTION: Order ID, Call, and Chat */}
      <View style={styles.header}>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>ORDER ID</ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <ThemedText type="body" style={{ fontWeight: '700', fontSize: 16 }}>{order.id}</ThemedText>
          {/* Functional Call Button */}
          <CallButton phoneNumber={order.storePhone} /> 
        </View>

        <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
          {formatDate(order.createdAt)}
        </ThemedText>

        {/* Chat Button with Store */}
      
      </View>
      
      {/* ITEMS SECTION */}
      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>Items</ThemedText>
        <Card>
          {order.items?.map((item: any, index: number) => {
            const price = Number(item.priceAtEntry) || 0;
            const quantity = Number(item.quantity) || 0;
            const itemTotal = price * quantity;

            return (
              <View key={index}>
                <View style={styles.itemRow}>
                  <View style={styles.itemImageContainer}>
                    {item.productImage ? (
                      <Image source={{ uri: item.productImage }} style={styles.productImage} />
                    ) : (
                      <View style={styles.placeholderIcon}>
                        <Feather name="package" size={20} color={theme.textSecondary} />
                      </View>
                    )}
                  </View>

                  <View style={styles.itemDetails}>
                    <ThemedText style={{ fontWeight: '600', fontSize: 15 }}>
                      {item.productName || "Product"}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      {quantity} x {formatPrice(price)}
                    </ThemedText>
                  </View>

                  <ThemedText style={{ fontWeight: '700', color: theme.text }}>
                    {formatPrice(itemTotal)}
                  </ThemedText>
                </View>

                {index < (order.items?.length || 0) - 1 && (
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                )}
              </View>
            );
          })}
        </Card>
      </View>

      {/* SUMMARY SECTION */}
      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>Order Summary</ThemedText>
        <Card>
          <View style={styles.summaryRow}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>Subtotal</ThemedText>
            <ThemedText type="body">{formatPrice(order.total)}</ThemedText>
          </View>
          <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: theme.border }]}>
            <ThemedText type="h3">Total Amount</ThemedText>
            <ThemedText type="h3" style={{ color: theme.primary }}>
              {formatPrice(order.total)}
            </ThemedText>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: Spacing.lg },
  header: { alignItems: "center", marginBottom: Spacing.xl },
  chatShortcut: { 
    marginTop: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    borderWidth: 1 
  },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { marginBottom: Spacing.md },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  itemImageContainer: { 
    width: 54, 
    height: 54, 
    borderRadius: BorderRadius.sm, 
    backgroundColor: '#F5F5F5', 
    overflow: 'hidden', 
    marginRight: 12 
  },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderIcon: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  itemDetails: { flex: 1 },
  divider: { height: 1, marginVertical: 4, opacity: 0.3 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.sm },
  totalRow: { marginTop: Spacing.sm, paddingTop: Spacing.md, borderTopWidth: 1 },
});