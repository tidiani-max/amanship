import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, Image } from "react-native";
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
import { Address } from "@shared/schema";

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
  const queryClient = useQueryClient();
  const { items, subtotal } = useCart();
  const { location, store, codAllowed, estimatedDeliveryMinutes } = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [selectedPayment, setSelectedPayment] = useState<PaymentOption>(paymentMethods[0]);

  // Fetch user addresses
  const { data: userAddresses, error, isLoading: isLoadingAddresses } = useQuery<Address[]>({
    queryKey: ["/api/addresses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await apiRequest("GET", `/api/addresses?userId=${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch addresses");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const selectedAddress = userAddresses && userAddresses.length > 0 ? userAddresses[0] : null;
  const deliveryFee = 10000;
  const total = subtotal + deliveryFee;

  const availablePayments = codAllowed 
    ? [...paymentMethods, codPaymentOption] 
    : paymentMethods;

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  // Mutation to save address from GPS location
  const saveAddressMutation = useMutation({
    mutationFn: async () => {
      console.log("FRONTEND: Save address mutation started");
      
      if (!location) {
        throw new Error("GPS Location not found. Please enable location services.");
      }
      
      if (!user?.id) {
        throw new Error("User not logged in");
      }

      console.log("FRONTEND: Sending address data:", {
        userId: user.id,
        label: "Current Location",
        fullAddress: "Auto-detected from GPS",
        latitude: location.latitude,
        longitude: location.longitude,
        isDefault: true
      });

      const res = await apiRequest("POST", "/api/addresses", {
        userId: user.id,
        label: "Current Location",
        fullAddress: "Auto-detected from GPS",
        latitude: location.latitude,
        longitude: location.longitude,
        isDefault: true
      });

      console.log("FRONTEND: Response status:", res.status);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("FRONTEND: Save address failed:", errorData);
        throw new Error(errorData.error || "Failed to save address");
      }

      const savedAddress = await res.json();
      console.log("FRONTEND: Address saved successfully:", savedAddress);
      return savedAddress;
    },
    onSuccess: (savedAddress) => {
      console.log("FRONTEND: Save Success, now placing order");
      // Invalidate addresses query to refetch
      queryClient.invalidateQueries({ queryKey: ["/api/addresses", user?.id] });
      // Trigger order placement with the newly saved address
      orderMutation.mutate(savedAddress.id);
    },
    onError: (err: any) => {
      console.error("FRONTEND: Save Error:", err);
      Alert.alert(
        "Address Save Failed", 
        err?.message || "Unable to save your location. Please check your GPS settings and try again."
      );
    }
  });

  // Mutation to place order
  const orderMutation = useMutation({
    mutationFn: async (addressId?: string) => {
      console.log("FRONTEND: Order mutation started");
      
      const finalAddressId = addressId || selectedAddress?.id;
      
      if (!finalAddressId) {
        throw new Error("No address available for delivery");
      }

      if (!user?.id) {
        throw new Error("User not logged in");
      }

      if (!location) {
        throw new Error("Location not available");
      }

      const orderItems = items.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      }));

      console.log("FRONTEND: Creating order with data:", {
        userId: user.id,
        addressId: finalAddressId,
        itemCount: orderItems.length,
        total,
      });
      console.log("SENDING TO DRIVER:", {
      lat: selectedAddress?.latitude || location.latitude,
      lng: selectedAddress?.longitude || location.longitude
    });

      // Inside orderMutation mutationFn
// Inside orderMutation mutationFn in CheckoutScreen.tsx
const res = await apiRequest("POST", "/api/orders", {
  // Use .toString() to ensure the backend receives the full decimal precision
  customerLat: (selectedAddress?.latitude || location.latitude).toString(),
  customerLng: (selectedAddress?.longitude || location.longitude).toString(),
  paymentMethod: selectedPayment.type === "cod" ? "cod" : "midtrans",
  items: orderItems,
  total,
  deliveryFee,
  addressId: finalAddressId,
  userId: user.id,
  storeId: store?.id
});

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to create order");
      }

      return res.json();
    },
    onSuccess: (data) => {
      console.log("FRONTEND: Order created successfully:", data);
      navigation.navigate("OrderSuccess", { orderId: data.orderNumber || data.id });
    },
    onError: (error: any) => {
      console.error("FRONTEND: Order Error:", error);
      Alert.alert("Order Failed", error?.message || "Unable to place order. Please try again.");
    },
  });

  const handlePlaceOrder = () => {
    console.log("FRONTEND: Place Order clicked");
    console.log("FRONTEND: Current state - User ID:", user?.id);
    console.log("FRONTEND: Current state - Location:", location);
    console.log("FRONTEND: Current state - Selected Address:", selectedAddress);
    
    // Check if user is logged in
    if (!user?.id) {
      Alert.alert("Not Logged In", "Please log in to place an order.");
      return;
    }

    // Check if location is available
    if (!location) {
      Alert.alert(
        "Location Required", 
        "Please enable location services to place an order."
      );
      return;
    }

    // If no address exists, save GPS location as address first
    if (!selectedAddress) {
      console.log("FRONTEND: No address found, saving GPS location...");
      saveAddressMutation.mutate();
      return;
    }

    // If address exists, place order directly
    console.log("FRONTEND: Address exists, placing order...");
    orderMutation.mutate(selectedAddress.id);
  };

  const isProcessing = saveAddressMutation.isPending || orderMutation.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: 180 },
        ]}
      >
        {/* Delivery Address Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h3">{t.checkout.deliveryAddress}</ThemedText>
            <Pressable 
              onPress={() => navigation.navigate("EditAddress", { address: selectedAddress as any })}
              disabled={isProcessing}
            >
              <ThemedText type="caption" style={{ color: theme.primary }}>
                {selectedAddress ? t.home.change : "Add"}
              </ThemedText>
            </Pressable>
          </View>
          <Card>
            {isLoadingAddresses ? (
              <ThemedText type="body" style={{ textAlign: 'center', padding: Spacing.md }}>
                Loading address...
              </ThemedText>
            ) : selectedAddress ? (
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
                </View>
              </View>
            ) : (
              <View style={{ padding: Spacing.md }}>
                <ThemedText type="body" style={{ textAlign: 'center', marginBottom: Spacing.sm }}>
                  No delivery address yet
                </ThemedText>
                <ThemedText type="caption" style={{ textAlign: 'center', color: theme.textSecondary }}>
                  We'll use your current GPS location when you place the order
                </ThemedText>
              </View>
            )}
          </Card>
        </View>

        {/* Delivery Time Badge */}
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

        {/* Payment Method Section */}
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
                    borderWidth: 2 
                  }
                ]}
                onPress={() => setSelectedPayment(method)}
                disabled={isProcessing}
              >
                <Feather name={method.icon as any} size={20} color={theme.text} />
                <ThemedText type="body" style={{ flex: 1 }}>{method.name}</ThemedText>
                {selectedPayment.id === method.id && (
                  <Feather name="check-circle" size={20} color={theme.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Order Summary Section */}
        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            {t.checkout.orderSummary}
          </ThemedText>
          <Card>
            <View style={styles.summaryRow}>
              <ThemedText type="body">{t.checkout.subtotal}</ThemedText>
              <ThemedText type="body">{formatPrice(subtotal)}</ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText type="body">Delivery Fee</ThemedText>
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

      {/* Footer with Place Order Button */}
      <View style={[
        styles.footer, 
        { 
          backgroundColor: theme.backgroundRoot, 
          paddingBottom: insets.bottom + Spacing.lg 
        }, 
        Shadows.medium
      ]}>
        <View style={styles.footerContent}>
          <View>
            <ThemedText type="caption">{t.home.totalPayment}</ThemedText>
            <ThemedText type="h2" style={{ color: theme.primary }}>
              {formatPrice(total)}
            </ThemedText>
          </View>
          <Button 
            onPress={handlePlaceOrder} 
            style={styles.placeOrderButton} 
            loading={isProcessing}
            disabled={isProcessing || items.length === 0}
          >
            {saveAddressMutation.isPending 
              ? "Detecting Location..." 
              : orderMutation.isPending 
                ? t.checkout.processing 
                : t.checkout.placeOrder}
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: Spacing.lg },
  section: { marginBottom: Spacing.xl },
  sectionHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: Spacing.md 
  },
  sectionTitle: { marginBottom: Spacing.md },
  addressContent: { flexDirection: "row", alignItems: "flex-start" },
  addressIcon: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  addressDetails: { flex: 1, marginLeft: Spacing.md },
  deliveryBadge: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: Spacing.md 
  },
  badgeIcon: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  paymentMethods: { gap: Spacing.sm },
  paymentOption: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: Spacing.md, 
    borderRadius: BorderRadius.sm, 
    gap: Spacing.md 
  },
  summaryRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: Spacing.sm 
  },
  totalRow: { 
    marginTop: Spacing.sm, 
    paddingTop: Spacing.md, 
    borderTopWidth: 1, 
    borderTopColor: "#E0E0E0" 
  },
  footer: { 
    position: "absolute", 
    bottom: 0, 
    left: 0, 
    right: 0, 
    paddingTop: Spacing.lg, 
    paddingHorizontal: Spacing.lg 
  },
  footerContent: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between" 
  },
  placeOrderButton: { flex: 1, marginLeft: Spacing.xl },
});