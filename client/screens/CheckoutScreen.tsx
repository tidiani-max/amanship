import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { mockAddresses } from "@/data/mockData";
import { useCart } from "@/context/CartContext";
import { useLocation } from "@/context/LocationContext";
import { apiRequest } from "@/lib/query-client";
import { useLanguage } from "@/context/LanguageContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PaymentOption {
  id: string;
  name: string;
  icon: string;
  type: "ewallet" | "bank" | "card" | "cod";
}

const paymentMethods: PaymentOption[] = [
  { id: "gopay", name: "GoPay", icon: "credit-card", type: "ewallet" },
  { id: "ovo", name: "OVO", icon: "credit-card", type: "ewallet" },
  { id: "shopeepay", name: "ShopeePay", icon: "credit-card", type: "ewallet" },
  { id: "dana", name: "DANA", icon: "credit-card", type: "ewallet" },
  { id: "bca", name: "BCA Virtual Account", icon: "briefcase", type: "bank" },
  { id: "card", name: "Credit Card", icon: "credit-card", type: "card" },
];

const codPaymentOption: PaymentOption = {
  id: "cod",
  name: "Cash on Delivery",
  icon: "dollar-sign",
  type: "cod",
};

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { items, subtotal, clearCart } = useCart();
  const { location, store, codAllowed, estimatedDeliveryMinutes } = useLocation();
  const { t } = useLanguage();
  
  const [selectedAddress] = useState(mockAddresses[0]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentOption>(paymentMethods[0]);

  const deliveryFee = 10000;
  const total = subtotal + deliveryFee;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const availablePayments = codAllowed 
    ? [...paymentMethods, codPaymentOption] 
    : paymentMethods;

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  const orderMutation = useMutation({
    mutationFn: async () => {
      const orderItems = items.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      }));

      const res = await apiRequest("POST", "/api/orders", {
        customerLat: location?.latitude,
        customerLng: location?.longitude,
        paymentMethod: selectedPayment.type === "cod" ? "cod" : "midtrans",
        items: orderItems,
        total,
        deliveryFee,
        addressId: selectedAddress.id,
      });
      return res.json();
    },
    onSuccess: (data) => {
      navigation.navigate("OrderSuccess", { orderId: data.orderNumber || data.id });
    },
    onError: (error: any) => {
      Alert.alert(
        "Order Failed",
        error?.message || "Unable to place order. Please try again.",
        [{ text: "OK" }]
      );
    },
  });

  const handlePlaceOrder = () => {
    if (!location) {
      Alert.alert("Location Required", "Please enable location to place an order.");
      return;
    }
    if (items.length === 0) {
      Alert.alert("Empty Cart", "Please add items to your cart first.");
      return;
    }
    orderMutation.mutate();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: 180,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h3">{t.checkout.deliveryAddress}</ThemedText>
            <Pressable onPress={() => navigation.navigate("EditAddress", { address: selectedAddress })}>
              <ThemedText type="caption" style={{ color: theme.primary }}>
                {t.home.change}
              </ThemedText>
            </Pressable>
          </View>
          <Card>
            <View style={styles.addressContent}>
              <View style={[styles.addressIcon, { backgroundColor: theme.primary + "20" }]}>
                <Feather name="map-pin" size={20} color={theme.primary} />
              </View>
              <View style={styles.addressDetails}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {selectedAddress.label}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  {selectedAddress.fullAddress}
                </ThemedText>
                {selectedAddress.details ? (
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {selectedAddress.details}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          </Card>
        </View>
        
        <View style={styles.section}>
          <View style={styles.deliveryBadge}>
            <View style={[styles.badgeIcon, { backgroundColor: theme.primary }]}>
              <Feather name="zap" size={16} color={theme.buttonText} />
            </View>
            <View>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {estimatedDeliveryMinutes ? `${estimatedDeliveryMinutes}-${t.home.minuteDelivery}` : `15-${t.home.minuteDelivery}`}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {store ? `${t.home.fromStore} ${store.name}` : t.home.findingStore}
              </ThemedText>
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            {t.checkout.paymentMethod}
          </ThemedText>
          <View style={styles.paymentMethods}>
            {availablePayments.map((method) => (
              <Pressable
                key={method.id}
                style={[
                  styles.paymentOption,
                  { backgroundColor: theme.cardBackground },
                  selectedPayment.id === method.id && {
                    borderColor: theme.primary,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setSelectedPayment(method)}
              >
                <View style={[styles.paymentIcon, { backgroundColor: method.type === "cod" ? theme.success + "20" : theme.backgroundDefault }]}>
                  <Feather name={method.icon as any} size={20} color={method.type === "cod" ? theme.success : theme.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body">
                    {method.name}
                  </ThemedText>
                  {method.type === "cod" ? (
                    <ThemedText type="small" style={{ color: theme.success }}>
                      {t.home.payWhenDelivered}
                    </ThemedText>
                  ) : null}
                </View>
                {selectedPayment.id === method.id ? (
                  <Feather name="check-circle" size={20} color={theme.primary} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
        
        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            {t.checkout.orderSummary}
          </ThemedText>
          <Card>
            <View style={styles.summaryRow}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                {t.checkout.subtotal} ({itemCount} {itemCount === 1 ? t.home.item : t.home.items})
              </ThemedText>
              <ThemedText type="body">{formatPrice(subtotal)}</ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                {t.checkout.deliveryFee}
              </ThemedText>
              <ThemedText type="body">{formatPrice(deliveryFee)}</ThemedText>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <ThemedText type="h3">{t.checkout.total}</ThemedText>
              <ThemedText type="h3" style={{ color: theme.primary }}>
                {formatPrice(total)}
              </ThemedText>
            </View>
          </Card>
        </View>
      </ScrollView>
      
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.backgroundRoot,
            paddingBottom: insets.bottom + Spacing.lg,
          },
          Shadows.medium,
        ]}
      >
        <View style={styles.footerContent}>
          <View>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {t.home.totalPayment}
            </ThemedText>
            <ThemedText type="h2" style={{ color: theme.primary }}>
              {formatPrice(total)}
            </ThemedText>
          </View>
          <Button
            onPress={handlePlaceOrder}
            style={styles.placeOrderButton}
            disabled={orderMutation.isPending || items.length === 0}
          >
            {orderMutation.isPending ? t.checkout.processing : t.checkout.placeOrder}
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  addressContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  addressDetails: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  deliveryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentMethods: {
    gap: Spacing.sm,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.md,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
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
    borderTopColor: "#E0E0E0",
    marginBottom: 0,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  footerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  placeOrderButton: {
    flex: 1,
    marginLeft: Spacing.xl,
  },
});
