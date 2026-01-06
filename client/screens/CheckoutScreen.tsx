import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useCart } from "@/context/CartContext";
import { useLocation } from "@/context/LocationContext";
import { apiRequest } from "@/lib/query-client";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { Address } from "../shared/schema"

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PaymentOption {
  id: string;
  name: string;
  icon: string;
  type: "ewallet" | "bank" | "card" | "cod";
}

const PAYMENT_METHODS: PaymentOption[] = [
  { id: "gopay", name: "GoPay", icon: "credit-card", type: "ewallet" },
  { id: "ovo", name: "OVO", icon: "credit-card", type: "ewallet" },
  { id: "shopeepay", name: "ShopeePay", icon: "credit-card", type: "ewallet" },
  { id: "dana", name: "DANA", icon: "credit-card", type: "ewallet" },
  { id: "bca", name: "BCA Virtual Account", icon: "briefcase", type: "bank" },
  { id: "card", name: "Credit Card", icon: "credit-card", type: "card" },
];

const COD_OPTION: PaymentOption = {
  id: "cod",
  name: "Cash on Delivery",
  icon: "dollar-sign",
  type: "cod",
};

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { theme } = useTheme();

  const { items, subtotal } = useCart();
  const { location, store, codAllowed, estimatedDeliveryMinutes } = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [selectedPayment, setSelectedPayment] = useState<PaymentOption>(
    PAYMENT_METHODS[0]
  );

  const { data: addresses = [] } = useQuery<Address[]>({
    queryKey: ["/api/addresses", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/addresses?userId=${user!.id}`);
      return res.json();
    },
  });

  const selectedAddress = addresses[0] ?? null;

  const deliveryFee = 10000;
  const total = subtotal + deliveryFee;

  const availablePayments = codAllowed
    ? [...PAYMENT_METHODS, COD_OPTION]
    : PAYMENT_METHODS;

  const saveAddressMutation = useMutation({
    mutationFn: async () => {
      if (!location || !user?.id) {
        throw new Error("Location or user missing");
      }

      const res = await apiRequest("POST", "/api/addresses", {
        userId: user.id,
        label: "Current Location",
        fullAddress: "Detected automatically from GPS",
        latitude: location.latitude,
        longitude: location.longitude,
        isDefault: true,
      });

      if (!res.ok) throw new Error("Failed to save address");
      return res.json();
    },
    onSuccess: (addr) => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses", user?.id] });
      orderMutation.mutate(addr.id);
    },
  });

  const orderMutation = useMutation({
    mutationFn: async (addressId?: string) => {
      if (!user?.id || !location) throw new Error("Missing data");

      const itemsPayload = items.map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        price: i.product.price,
        quantity: i.quantity,
      }));

      const res = await apiRequest("POST", "/api/orders", {
        customerLat: location.latitude.toString(),
        customerLng: location.longitude.toString(),
        paymentMethod: selectedPayment.type === "cod" ? "cod" : "midtrans",
        items: itemsPayload,
        total,
        deliveryFee,
        addressId,
        userId: user.id,
        storeId: store?.id,
      });

      if (!res.ok) throw new Error("Order failed");
      return res.json();
    },
    onSuccess: (data) => {
      navigation.navigate("OrderSuccess", {
        orderId: data.orderNumber || data.id,
      });
    },
    onError: (e: any) => Alert.alert("Order Failed", e.message),
  });

  const handlePlaceOrder = () => {
    if (!user?.id) return Alert.alert("Login required");
    if (!location) return Alert.alert("Enable GPS to continue");

    if (!selectedAddress) {
      saveAddressMutation.mutate();
    } else {
      orderMutation.mutate(selectedAddress.id);
    }
  };

  const isProcessing =
    saveAddressMutation.isPending || orderMutation.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: 180,
        }}
      >
        {/* Address */}
        <View style={styles.section}>
          <ThemedText type="h3">{t.checkout.deliveryAddress}</ThemedText>
          <Card>
            <View style={styles.addressRow}>
              <View
                style={[
                  styles.addressIcon,
                  { backgroundColor: theme.primary + "20" },
                ]}
              >
                <Feather name="map-pin" size={20} color={theme.primary} />
              </View>
              <View>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  Current Location
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Location detected automatically from GPS
                </ThemedText>
              </View>
            </View>
          </Card>
        </View>

        {/* Delivery */}
        <View style={styles.section}>
          <View style={styles.deliveryBadge}>
            <View
              style={[
                styles.badgeIcon,
                { backgroundColor: theme.primary },
              ]}
            >
              <Feather name="zap" size={16} color={theme.buttonText} />
            </View>
            <View>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {estimatedDeliveryMinutes ?? 15}-{t.home.minuteDelivery}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {store
                  ? `${t.home.fromStore} ${store.name}`
                  : t.home.findingStore}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Payment */}
        <View style={styles.paymentMethods}>
          {availablePayments.map((method) => {
            const selected = selectedPayment.id === method.id;

            return (
              <Pressable
                key={method.id}
                onPress={() => setSelectedPayment(method)}
                disabled={isProcessing}
                style={{
                  ...styles.paymentOption,
                  backgroundColor: theme.cardBackground,
                  ...(selected
                    ? {
                        borderColor: theme.primary,
                        borderWidth: 2,
                      }
                    : {}),
                }}
              >
                <Feather name={method.icon as any} size={20} color={theme.text} />
                <ThemedText type="body" style={{ flex: 1 }}>
                  {method.name}
                </ThemedText>
                {selected && (
                  <Feather
                    name="check-circle"
                    size={20}
                    color={theme.primary}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          Shadows.medium,
          { paddingBottom: insets.bottom + Spacing.md },
        ]}
      >
        <View style={styles.footerRow}>
          <View>
            <ThemedText type="caption">{t.home.totalPayment}</ThemedText>
            <ThemedText type="h2" style={{ color: theme.primary }}>
              Rp {total.toLocaleString("id-ID")}
            </ThemedText>
          </View>
          <Button
            onPress={handlePlaceOrder}
            loading={isProcessing}
            disabled={!location || items.length === 0}
          >
            {isProcessing ? t.checkout.processing : t.checkout.placeOrder}
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.xl,
  },

  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },

  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: Spacing.xl,
  },

  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },

  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
