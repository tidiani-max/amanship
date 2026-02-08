import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  Image,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
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
  type: "ewallet" | "bank" | "card" | "cod" | "qris";
}

const PAYMENT_METHODS: PaymentOption[] = [
  { id: "qris", name: "QRIS (Scan QR)", icon: "smartphone", type: "qris" },
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
  const { 
    location, 
    codAllowed, 
    estimatedDeliveryMinutes,
    isManualLocation,
    manualAddress 
  } = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [selectedPayment, setSelectedPayment] = useState<PaymentOption>(PAYMENT_METHODS[0]); // QRIS by default
  const [itemsWithStore, setItemsWithStore] = useState<any[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
  const [autoAppliedPromotion, setAutoAppliedPromotion] = useState<any>(null);
  const [promotionDiscount, setPromotionDiscount] = useState(0);
  const [freeDelivery, setFreeDelivery] = useState(false);

  // Existing backend logic...
  const { data: addresses = [] } = useQuery<Address[]>({
    queryKey: ["/api/addresses", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/addresses?userId=${user!.id}`);
      return res.json();
    },
  });

  const { data: userClaimedPromotions = [] } = useQuery({
    queryKey: ["/api/promotions/claimed", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const res = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/promotions/claimed?userId=${user.id}`);
        if (!res.ok) return [];
        return res.json();
      } catch (error) {
        console.error("Failed to fetch claimed promotions:", error);
        return [];
      }
    },
  });

  const selectedAddress = addresses[0] ?? null;
  const DELIVERY_FEE_PER_STORE = 10000;

  useEffect(() => {
    async function enrichItemsWithStores() {
      if (items.length === 0) {
        setItemsWithStore([]);
        setIsLoadingStores(false);
        return;
      }
      try {
        setIsLoadingStores(true);
        const enriched = await Promise.all(
          items.map(async (item) => {
            try {
              const res = await apiRequest("GET", `/api/products/${item.product.id}/store`);
              if (!res.ok) return { ...item, storeId: "unknown", storeName: "Unknown Store" };
              const storeData = await res.json();
              return { ...item, storeId: storeData.storeId, storeName: storeData.storeName };
            } catch (error) {
              return { ...item, storeId: "unknown", storeName: "Unknown Store" };
            }
          })
        );
        setItemsWithStore(enriched);
      } catch (error) {
        setItemsWithStore(items);
      } finally {
        setIsLoadingStores(false);
      }
    }
    enrichItemsWithStores();
  }, [items]);

  const itemsByStore = itemsWithStore.reduce((acc: any, item) => {
    const storeId = item.storeId;
    if (!storeId || storeId === "unknown") return acc;
    if (!acc[storeId]) acc[storeId] = [];
    acc[storeId].push(item);
    return acc;
  }, {});

  const storeTotals = Object.entries(itemsByStore).map(([storeId, storeItems]: any) => {
    const storeName = storeItems[0]?.storeName || `Store ${storeId.slice(0, 8)}`;
    const storeSubtotal = storeItems.reduce((sum: number, i: any) => sum + i.product.price * i.quantity, 0);
    return {
      storeId,
      storeName,
      items: storeItems,
      subtotal: storeSubtotal,
      deliveryFee: DELIVERY_FEE_PER_STORE,
      total: storeSubtotal + DELIVERY_FEE_PER_STORE,
      estimatedDelivery: estimatedDeliveryMinutes || 15,
    };
  });

  useEffect(() => {
    if (userClaimedPromotions.length === 0) {
      setAutoAppliedPromotion(null);
      setPromotionDiscount(0);
      setFreeDelivery(false);
      return;
    }
    const applicablePromotions = userClaimedPromotions.filter((promo: any) => {
      if (subtotal < promo.minOrder) return false;
      if (promo.scope === 'store') {
        const hasItemFromStore = storeTotals.some((st: any) => st.storeId === promo.storeId);
        if (!hasItemFromStore) return false;
      }
      return true;
    });
    if (applicablePromotions.length === 0) {
      setAutoAppliedPromotion(null);
      setPromotionDiscount(0);
      setFreeDelivery(false);
      return;
    }
    const sorted = applicablePromotions.sort((a: any, b: any) => {
      const discountA = a.type === 'percentage' ? Math.floor((subtotal * (a.discountValue || 0)) / 100) : a.discountValue || 0;
      const discountB = b.type === 'percentage' ? Math.floor((subtotal * (b.discountValue || 0)) / 100) : b.discountValue || 0;
      return discountB - discountA;
    });
    const bestPromo = sorted[0];
    setAutoAppliedPromotion(bestPromo);
    if (bestPromo.type === 'percentage') {
      const discount = Math.floor((subtotal * (bestPromo.discountValue || 0)) / 100);
      const finalDiscount = bestPromo.maxDiscount && discount > bestPromo.maxDiscount ? bestPromo.maxDiscount : discount;
      setPromotionDiscount(finalDiscount);
      setFreeDelivery(false);
    } else if (bestPromo.type === 'fixed_amount') {
      setPromotionDiscount(bestPromo.discountValue || 0);
      setFreeDelivery(false);
    } else if (bestPromo.type === 'free_delivery') {
      setPromotionDiscount(0);
      setFreeDelivery(true);
    }
  }, [userClaimedPromotions, subtotal, storeTotals]);

  const totalDeliveryFee = freeDelivery ? 0 : (storeTotals.length * DELIVERY_FEE_PER_STORE);
  const totalBeforeDiscounts = subtotal + totalDeliveryFee;
  const finalTotal = totalBeforeDiscounts - promotionDiscount - voucherDiscount;
  const availablePayments = codAllowed ? [...PAYMENT_METHODS, COD_OPTION] : PAYMENT_METHODS;

  const formatPrice = (price: number) => `Rp ${price.toLocaleString("id-ID")}`;

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) { Alert.alert('Error', 'Please enter a voucher code'); return; }
    setIsValidatingVoucher(true);
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/vouchers/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: voucherCode.toUpperCase(), userId: user?.id, orderTotal: subtotal - promotionDiscount }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedVoucher(data.voucher);
        setVoucherDiscount(data.voucher.discount);
      } else {
        Alert.alert('Invalid Voucher', data.error || 'This voucher code is not valid');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to validate voucher.');
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => { setAppliedVoucher(null); setVoucherDiscount(0); setVoucherCode(''); };

  const saveAddressMutation = useMutation({
    mutationFn: async () => {
      if (!location || !user?.id) throw new Error("Location or user missing");
      const res = await apiRequest("POST", "/api/addresses", {
        userId: user.id, label: "Current Location", fullAddress: "Detected automatically from GPS",
        latitude: location.latitude, longitude: location.longitude, isDefault: true,
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
        productId: i.product.id, name: i.product.name, price: i.product.price, quantity: i.quantity,
      }));
      
      // ✅ Determine payment method type
      let paymentMethod = "midtrans"; // Default
      if (selectedPayment.type === "cod") {
        paymentMethod = "cod";
      } else if (selectedPayment.type === "qris") {
        paymentMethod = "qris";
      }
      
      const res = await apiRequest("POST", "/api/orders", {
        customerLat: location.latitude.toString(), 
        customerLng: location.longitude.toString(),
        paymentMethod, // ✅ Send correct payment method
        items: itemsPayload, 
        total: finalTotal, 
        voucherCode: appliedVoucher?.code,
        voucherDiscount, 
        promotionId: autoAppliedPromotion?.id, 
        promotionDiscount,
        freeDelivery, 
        addressId, 
        userId: user.id,
      });
      if (!res.ok) throw new Error("Order failed");
      return res.json();
    },
    onSuccess: (data) => {
      const orderIds = Array.isArray(data) ? data.map(o => o.id).join(',') : data.id;
      navigation.navigate("OrderSuccess", { orderId: orderIds });
    },
    onError: (e: any) => Alert.alert("Order Failed", e.message),
  });

  const handlePlaceOrder = () => {
    if (!user?.id) return Alert.alert("Login required");
    if (!location) return Alert.alert("Enable GPS to continue");
    if (!selectedAddress) saveAddressMutation.mutate();
    else orderMutation.mutate(selectedAddress.id);
  };

  const isProcessing = saveAddressMutation.isPending || orderMutation.isPending;

  if (isLoadingStores) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <ThemedText style={{ marginTop: 16, fontWeight: '700' }}>Preparing order...</ThemedText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: headerHeight + 10,
          paddingBottom: 250,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Address Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText style={styles.sectionTitle}>{t.checkout.deliveryAddress}</ThemedText>
          </View>
          
          <View style={styles.premiumCard}>
            <View style={[styles.addressIcon, { backgroundColor: '#4f46e515' }]}>
              <Feather name={isManualLocation ? "map-pin" : "navigation"} size={20} color="#4f46e5" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <ThemedText style={{ color: '#64748b', fontSize: 13 }} numberOfLines={2}>
                {isManualLocation && manualAddress ? manualAddress : "Location detected automatically"}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Store Breakdown */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.squircleIcon}>
              <Feather name="shopping-bag" size={20} color="#7c3aed" />
            </View>
            <ThemedText style={styles.sectionTitle}>Order Summary</ThemedText>
          </View>

          {storeTotals.map((storeData) => (
            <View key={storeData.storeId} style={styles.storeCard}>
              <View style={styles.storeNameRow}>
                <ThemedText style={{ fontWeight: '900', fontSize: 16 }}>{storeData.storeName}</ThemedText>
                <View style={styles.deliveryTag}>
                  <Feather name="zap" size={12} color="#10b981" />
                  <ThemedText style={styles.deliveryTagText}>{storeData.estimatedDelivery} min</ThemedText>
                </View>
              </View>

              {storeData.items.map((item: any) => (
                <View key={item.product.id} style={styles.itemRow}>
                  <View style={styles.itemSquircle}>
                    <Image source={{ uri: getImageUrl(item.product.image) }} style={{ width: '100%', height: '100%' }} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <ThemedText style={{ fontWeight: '800', fontSize: 14 }} numberOfLines={1}>{item.product.name}</ThemedText>
                    <ThemedText style={{ color: '#64748b', fontSize: 12 }}>{item.quantity}x {formatPrice(item.product.price)}</ThemedText>
                  </View>
                  <ThemedText style={{ fontWeight: '900' }}>{formatPrice(item.product.price * item.quantity)}</ThemedText>
                </View>
              ))}

              <View style={styles.storeFooter}>
                <View style={styles.miniTotalRow}>
                  <ThemedText style={styles.miniLabel}>Store Subtotal</ThemedText>
                  <ThemedText style={styles.miniValue}>{formatPrice(storeData.subtotal)}</ThemedText>
                </View>
                <View style={[styles.miniTotalRow, { marginTop: 4 }]}>
                  <ThemedText style={styles.miniLabel}>Delivery</ThemedText>
                  <ThemedText style={styles.miniValue}>{formatPrice(storeData.deliveryFee)}</ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Promo / Voucher Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.squircleIcon}>
              <Feather name="tag" size={20} color="#f59e0b" />
            </View>
            <ThemedText style={styles.sectionTitle}>Promo & Voucher</ThemedText>
          </View>

          {appliedVoucher ? (
            <View style={[styles.premiumCard, { borderColor: '#10b981', borderWidth: 2, backgroundColor: '#f0fdf4' }]}>
              <Feather name="check-circle" size={20} color="#10b981" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <ThemedText style={{ fontWeight: '900', color: '#10b981' }}>{appliedVoucher.code}</ThemedText>
                <ThemedText style={{ color: '#64748b', fontSize: 12 }}>Saved {formatPrice(voucherDiscount)}</ThemedText>
              </View>
              <Pressable onPress={handleRemoveVoucher}>
                <Feather name="x" size={20} color="#ef4444" />
              </Pressable>
            </View>
          ) : (
            <View style={styles.voucherContainer}>
              <TextInput
                style={styles.voucherInput}
                placeholder="Voucher code..."
                value={voucherCode}
                onChangeText={setVoucherCode}
                autoCapitalize="characters"
              />
              <Pressable onPress={handleApplyVoucher} disabled={isValidatingVoucher}>
                <LinearGradient colors={['#4f46e5', '#7c3aed']} style={styles.voucherBtn}>
                  {isValidatingVoucher ? <ActivityIndicator size="small" color="#fff" /> : <ThemedText style={styles.voucherBtnText}>Apply</ThemedText>}
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {autoAppliedPromotion && (
            <View style={styles.promoBadge}>
              <Feather name="gift" size={16} color="#4f46e5" />
              <ThemedText style={styles.promoBadgeText}>{autoAppliedPromotion.title} applied!</ThemedText>
            </View>
          )}
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.squircleIcon}>
              <Feather name="credit-card" size={20} color="#3b82f6" />
            </View>
            <ThemedText style={styles.sectionTitle}>Payment Method</ThemedText>
          </View>

          <View style={{ gap: 12 }}>
            {availablePayments.map((method) => (
              <Pressable
                key={method.id}
                onPress={() => setSelectedPayment(method)}
                style={[styles.paymentCard, selectedPayment.id === method.id && styles.paymentCardActive]}
              >
                <Feather name={method.icon as any} size={18} color={selectedPayment.id === method.id ? "#4f46e5" : "#64748b"} />
                <ThemedText style={[styles.paymentText, selectedPayment.id === method.id && { color: '#4f46e5' }]}>{method.name}</ThemedText>
                
                {/* ✅ QRIS Badge */}
                {method.type === "qris" && (
                  <View style={styles.qrisBadge}>
                    <ThemedText style={styles.qrisBadgeText}>Cheapest</ThemedText>
                  </View>
                )}
                
                <View style={[styles.radioOuter, selectedPayment.id === method.id && { borderColor: '#4f46e5' }]}>
                  {selectedPayment.id === method.id && <View style={styles.radioInner} />}
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Grand Total Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.footerDetails}>
          <View style={styles.summaryLine}>
            <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
            <ThemedText style={styles.summaryValue}>{formatPrice(subtotal)}</ThemedText>
          </View>
          <View style={styles.summaryLine}>
            <ThemedText style={styles.summaryLabel}>Delivery Total</ThemedText>
            <ThemedText style={[styles.summaryValue, freeDelivery && { color: '#10b981' }]}>{freeDelivery ? "FREE" : formatPrice(totalDeliveryFee)}</ThemedText>
          </View>
          {(promotionDiscount > 0 || voucherDiscount > 0) && (
            <View style={styles.summaryLine}>
              <ThemedText style={[styles.summaryLabel, { color: '#4f46e5' }]}>Total Savings</ThemedText>
              <ThemedText style={{ color: '#4f46e5', fontWeight: '900' }}>-{formatPrice(promotionDiscount + voucherDiscount)}</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.grandTotalRow}>
          <View>
            <ThemedText style={{ fontSize: 12, fontWeight: '800', color: '#64748b' }}>TOTAL AMOUNT</ThemedText>
            <ThemedText style={{ fontSize: 24, fontWeight: '900', color: '#1e293b' }}>{formatPrice(finalTotal)}</ThemedText>
          </View>
          
          <Pressable onPress={handlePlaceOrder} disabled={isProcessing || items.length === 0}>
            <LinearGradient colors={['#4f46e5', '#7c3aed']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.placeOrderBtn}>
              {isProcessing ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.placeOrderBtnText}>Place Order</ThemedText>}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
  },
  premiumCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  squircleIcon: {
    width: 44,
    height: 44,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  storeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  storeNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  deliveryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  deliveryTagText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '800',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  itemSquircle: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  storeFooter: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  miniTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  miniLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  miniValue: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  voucherContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 6,
    paddingLeft: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  voucherInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  voucherBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  voucherBtnText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
  },
  promoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#f5f3ff',
    padding: 10,
    borderRadius: 12,
    gap: 8,
  },
  promoBadgeText: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '800',
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 18,
    gap: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentCardActive: {
    borderColor: '#4f46e5',
    backgroundColor: '#f5f3ff',
  },
  paymentText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
  },
  qrisBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  qrisBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4f46e5',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 25,
  },
  footerDetails: {
    marginBottom: 20,
    gap: 8,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '700',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '800',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  placeOrderBtn: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 20,
    minWidth: 160,
    alignItems: 'center',
  },
  placeOrderBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  addressIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});