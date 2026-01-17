import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  Image,
  ActivityIndicator,
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
import { Address } from "../../shared/schema";
import { getImageUrl } from "@/lib/image-url";

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
  const { location, codAllowed, estimatedDeliveryMinutes } = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [selectedPayment, setSelectedPayment] = useState<PaymentOption>(
    PAYMENT_METHODS[0]
  );
  const [itemsWithStore, setItemsWithStore] = useState<any[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);

  const { data: addresses = [] } = useQuery<Address[]>({
    queryKey: ["/api/addresses", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/addresses?userId=${user!.id}`);
      return res.json();
    },
  });

  const selectedAddress = addresses[0] ?? null;
  const DELIVERY_FEE_PER_STORE = 10000;

  // Enrich items with store data
  useEffect(() => {
    async function enrichItemsWithStores() {
      if (items.length === 0) {
        setItemsWithStore([]);
        setIsLoadingStores(false);
        return;
      }

      try {
        setIsLoadingStores(true);
        console.log("🔍 Enriching", items.length, "items with store data...");

        const enriched = await Promise.all(
          items.map(async (item) => {
            try {
              const res = await apiRequest("GET", `/api/products/${item.product.id}/store`);
              
              if (!res.ok) {
                console.error(`❌ HTTP ${res.status} for product ${item.product.id}`);
                return {
                  ...item,
                  storeId: "unknown",
                  storeName: "Unknown Store",
                };
              }
              
              const storeData = await res.json();
              console.log(`✅ Product ${item.product.name} -> Store ${storeData.storeName}`);
              
              return {
                ...item,
                storeId: storeData.storeId,
                storeName: storeData.storeName,
              };
            } catch (error) {
              console.error(`❌ Failed to get store for product ${item.product.id}:`, error);
              return {
                ...item,
                storeId: "unknown",
                storeName: "Unknown Store",
              };
            }
          })
        );

        console.log("✅ Enriched items:", enriched);
        setItemsWithStore(enriched);
      } catch (error) {
        console.error("❌ Failed to enrich items:", error);
        setItemsWithStore(items);
      } finally {
        setIsLoadingStores(false);
      }
    }

    enrichItemsWithStores();
  }, [items]);

  // Group items by store
  const itemsByStore = itemsWithStore.reduce((acc: any, item) => {
    const storeId = item.storeId;
    if (!storeId || storeId === "unknown") {
      console.warn("⚠️ Item without valid storeId:", item.product.name);
      return acc;
    }
    if (!acc[storeId]) acc[storeId] = [];
    acc[storeId].push(item);
    return acc;
  }, {});

  console.log("📦 Items grouped by store:", Object.keys(itemsByStore).length, "stores");

  // Calculate totals per store
  const storeTotals = Object.entries(itemsByStore).map(
    ([storeId, storeItems]: any) => {
      const storeName = storeItems[0]?.storeName || `Store ${storeId.slice(0, 8)}`;
      
      const subtotal = storeItems.reduce(
        (sum: number, i: any) => sum + i.product.price * i.quantity,
        0
      );

      return {
        storeId,
        storeName,
        items: storeItems,
        subtotal,
        deliveryFee: DELIVERY_FEE_PER_STORE,
        total: subtotal + DELIVERY_FEE_PER_STORE,
        estimatedDelivery: estimatedDeliveryMinutes || 15,
      };
    }
  );

  // Final totals
  const total = storeTotals.reduce((sum, s) => sum + s.total, 0);
  const totalDeliveryFee = storeTotals.length * DELIVERY_FEE_PER_STORE;

  const availablePayments = codAllowed
    ? [...PAYMENT_METHODS, COD_OPTION]
    : PAYMENT_METHODS;

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

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
        addressId,
        userId: user.id,
      });

      if (!res.ok) throw new Error("Order failed");
      return res.json();
    },
    onSuccess: (data) => {
      const orderIds = Array.isArray(data) ? data.map(o => o.id).join(',') : data.id;
      navigation.navigate("OrderSuccess", {
        orderId: orderIds,
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

  const isProcessing = saveAddressMutation.isPending || orderMutation.isPending;

  if (isLoadingStores) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundRoot, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText type="body" style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
          Loading store details...
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: 200,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Address Section */}
        <View style={styles.section}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
            {t.checkout.deliveryAddress}
          </ThemedText>
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
              <View style={{ flex: 1 }}>
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

        {/* Per-Store Order Breakdown */}
        <View style={styles.section}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
            Order Summary ({storeTotals.length} {storeTotals.length === 1 ? 'Store' : 'Stores'})
          </ThemedText>

          {storeTotals.length === 0 ? (
            <Card>
              <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
                No items grouped by store. Please check your cart.
              </ThemedText>
            </Card>
          ) : (
            storeTotals.map((storeData, index) => (
              <Card key={storeData.storeId} style={{ marginBottom: Spacing.lg }}>
                {/* Store Header */}
                <View style={styles.storeHeader}>
                  <View style={[styles.storeIcon, { backgroundColor: theme.primary + "20" }]}>
                    <Feather name="shopping-bag" size={18} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      {storeData.storeName}
                    </ThemedText>
                    <View style={styles.deliveryBadge}>
                      <Feather name="zap" size={12} color={theme.success} />
                      <ThemedText type="caption" style={{ color: theme.success }}>
                        {storeData.estimatedDelivery}-{storeData.estimatedDelivery + 5} min
                      </ThemedText>
                    </View>
                  </View>
                </View>

                {/* Store Items */}
                <View style={styles.itemsList}>
                  {storeData.items.map((item: any, idx: number) => (
                    <View key={item.product.id} style={styles.itemRow}>
                      <View style={styles.itemImageContainer}>
                        {item.product.image ? (
                          <Image
                            source={{ uri: getImageUrl(item.product.image) }}
                            style={styles.itemImage}
                          />
                        ) : (
                          <View style={[styles.itemImagePlaceholder, { backgroundColor: theme.backgroundDefault }]}>
                            <Feather name="package" size={16} color={theme.textSecondary} />
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="body" numberOfLines={1}>
                          {item.product.name}
                        </ThemedText>
                        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                          {item.quantity}x {formatPrice(item.product.price)}
                        </ThemedText>
                      </View>
                      <ThemedText type="body" style={{ fontWeight: "600" }}>
                        {formatPrice(item.product.price * item.quantity)}
                      </ThemedText>
                    </View>
                  ))}
                </View>

                {/* Store Totals */}
                <View style={styles.storeTotals}>
                  <View style={styles.totalRow}>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      Subtotal
                    </ThemedText>
                    <ThemedText type="caption">
                      {formatPrice(storeData.subtotal)}
                    </ThemedText>
                  </View>
                  <View style={styles.totalRow}>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      Delivery Fee
                    </ThemedText>
                    <ThemedText type="caption">
                      {formatPrice(storeData.deliveryFee)}
                    </ThemedText>
                  </View>
                  <View style={[styles.totalRow, styles.storeTotalRow]}>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      Store Total
                    </ThemedText>
                    <ThemedText type="body" style={{ fontWeight: "600", color: theme.primary }}>
                      {formatPrice(storeData.total)}
                    </ThemedText>
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
            Payment Method
          </ThemedText>
          <View style={styles.paymentMethods}>
            {availablePayments.map((method) => {
              const selected = selectedPayment.id === method.id;

              return (
                <Pressable
                  key={method.id}
                  onPress={() => setSelectedPayment(method)}
                  disabled={isProcessing}
                  style={[
                    styles.paymentOption,
                    {
                      backgroundColor: theme.cardBackground,
                      borderColor: selected ? theme.primary : theme.border || "#E0E0E0",
                      borderWidth: selected ? 2 : 1,
                    },
                  ]}
                >
                  <Feather name={method.icon as any} size={20} color={theme.text} />
                  <ThemedText type="body" style={{ flex: 1 }}>
                    {method.name}
                  </ThemedText>
                  {selected && (
                    <Feather name="check-circle" size={20} color={theme.primary} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Footer with Grand Total */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.backgroundRoot,
            paddingBottom: insets.bottom + Spacing.md,
          },
          Shadows.medium,
        ]}
      >
        <View style={styles.footerSummary}>
          <View style={styles.summaryRow}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Items Total
            </ThemedText>
            <ThemedText type="caption">
              {formatPrice(subtotal)}
            </ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Total Delivery ({storeTotals.length} {storeTotals.length === 1 ? 'store' : 'stores'})
            </ThemedText>
            <ThemedText type="caption">
              {formatPrice(totalDeliveryFee)}
            </ThemedText>
          </View>
          <View style={[styles.summaryRow, styles.grandTotalRow]}>
            <View>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Grand Total
              </ThemedText>
              <ThemedText type="h2" style={{ color: theme.primary }}>
                {formatPrice(total)}
              </ThemedText>
            </View>
            <Button
              onPress={handlePlaceOrder}
              loading={isProcessing}
              disabled={!location || items.length === 0 || storeTotals.length === 0}
              style={{ minWidth: 140 }}
            >
              {isProcessing ? t.checkout.processing : t.checkout.placeOrder}
            </Button>
          </View>
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

  storeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },

  storeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  deliveryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },

  itemsList: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },

  itemImageContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },

  itemImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  itemImagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  storeTotals: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    gap: Spacing.xs,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  storeTotalRow: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
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

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },

  footerSummary: {
    gap: Spacing.xs,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  grandTotalRow: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
});