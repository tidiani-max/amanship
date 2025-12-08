import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type OrderDetailRouteProp = RouteProp<RootStackParamList, "OrderDetail">;

export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const route = useRoute<OrderDetailRouteProp>();
  const { order } = route.params;

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: theme.success + "20" }]}>
          <Feather name="check-circle" size={16} color={theme.success} />
          <ThemedText type="caption" style={{ color: theme.success, fontWeight: "600" }}>
            Delivered
          </ThemedText>
        </View>
        <ThemedText type="h2">{order.id}</ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {formatDate(order.createdAt)}
        </ThemedText>
      </View>
      
      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Items
        </ThemedText>
        <Card>
          {order.items.map((item, index) => (
            <View key={index}>
              <View style={styles.itemRow}>
                <View style={[styles.itemImage, { backgroundColor: theme.backgroundDefault }]}>
                  <Feather name="package" size={20} color={theme.textSecondary} />
                </View>
                <View style={styles.itemDetails}>
                  <ThemedText type="body" numberOfLines={1}>
                    {item.product.name}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    {item.quantity} x {formatPrice(item.product.price)}
                  </ThemedText>
                </View>
                <ThemedText type="body" style={{ fontWeight: "500" }}>
                  {formatPrice(item.product.price * item.quantity)}
                </ThemedText>
              </View>
              {index < order.items.length - 1 ? (
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
              ) : null}
            </View>
          ))}
        </Card>
      </View>
      
      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Delivery Address
        </ThemedText>
        <Card>
          <View style={styles.addressRow}>
            <View style={[styles.addressIcon, { backgroundColor: theme.primary + "20" }]}>
              <Feather name="map-pin" size={18} color={theme.primary} />
            </View>
            <View style={styles.addressDetails}>
              <ThemedText type="body" style={{ fontWeight: "500" }}>
                {order.address.label}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {order.address.fullAddress}
              </ThemedText>
            </View>
          </View>
        </Card>
      </View>
      
      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Payment
        </ThemedText>
        <Card>
          <View style={styles.paymentRow}>
            <View style={[styles.paymentIcon, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="credit-card" size={18} color={theme.text} />
            </View>
            <ThemedText type="body">{order.paymentMethod.name}</ThemedText>
          </View>
        </Card>
      </View>
      
      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Order Summary
        </ThemedText>
        <Card>
          <View style={styles.summaryRow}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Subtotal
            </ThemedText>
            <ThemedText type="body">{formatPrice(order.total)}</ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Delivery Fee
            </ThemedText>
            <ThemedText type="body">{formatPrice(order.deliveryFee)}</ThemedText>
          </View>
          <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: theme.border }]}>
            <ThemedText type="h3">Total</ThemedText>
            <ThemedText type="h3" style={{ color: theme.primary }}>
              {formatPrice(order.total + order.deliveryFee)}
            </ThemedText>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  itemImage: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  itemDetails: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  addressIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  addressDetails: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  totalRow: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    marginBottom: 0,
  },
});
