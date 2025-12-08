import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { mockAddresses, mockPaymentMethods, mockProducts } from "@/data/mockData";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  
  const [selectedAddress] = useState(mockAddresses[0]);
  const [selectedPayment, setSelectedPayment] = useState(mockPaymentMethods[0]);
  const [isLoading, setIsLoading] = useState(false);

  const subtotal = 69000;
  const deliveryFee = 10000;
  const total = subtotal + deliveryFee;

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  const handlePlaceOrder = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigation.navigate("OrderSuccess", { orderId: "KG-" + Math.random().toString().slice(2, 8) });
    }, 1500);
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
            <ThemedText type="h3">Delivery Address</ThemedText>
            <Pressable onPress={() => navigation.navigate("EditAddress", { address: selectedAddress })}>
              <ThemedText type="caption" style={{ color: theme.primary }}>
                Change
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
                15-Minute Delivery
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Estimated arrival: 10:45 AM
              </ThemedText>
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            Payment Method
          </ThemedText>
          <View style={styles.paymentMethods}>
            {mockPaymentMethods.map((method) => (
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
                <View style={[styles.paymentIcon, { backgroundColor: theme.backgroundDefault }]}>
                  <Feather name={method.icon as any} size={20} color={theme.text} />
                </View>
                <ThemedText type="body" style={{ flex: 1 }}>
                  {method.name}
                </ThemedText>
                {selectedPayment.id === method.id ? (
                  <Feather name="check-circle" size={20} color={theme.primary} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
        
        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            Order Summary
          </ThemedText>
          <Card>
            <View style={styles.summaryRow}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                Subtotal (4 items)
              </ThemedText>
              <ThemedText type="body">{formatPrice(subtotal)}</ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                Delivery Fee
              </ThemedText>
              <ThemedText type="body">{formatPrice(deliveryFee)}</ThemedText>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <ThemedText type="h3">Total</ThemedText>
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
              Total Payment
            </ThemedText>
            <ThemedText type="h2" style={{ color: theme.primary }}>
              {formatPrice(total)}
            </ThemedText>
          </View>
          <Button
            onPress={handlePlaceOrder}
            style={styles.placeOrderButton}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Place Order"}
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
