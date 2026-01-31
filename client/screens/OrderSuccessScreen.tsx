import React, { useEffect } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, Pressable} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type OrderSuccessRouteProp = RouteProp<RootStackParamList, "OrderSuccess">;

export default function OrderSuccessScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<OrderSuccessRouteProp>();
  const { orderId } = route.params;

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  const orderIds = orderId.includes(',') ? orderId.split(',') : [orderId];

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["order-success", orderIds],
    queryFn: async () => {
      const orderPromises = orderIds.map(async (id) => {
        const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/orders/${id.trim()}`);
        if (!response.ok) throw new Error("Order not found");
        const orderData = await response.json();
        
        const storeResponse = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/stores/${orderData.storeId}`);
        const storeData = await storeResponse.json();
        
        return {
          id: orderData.id,
          orderNumber: orderData.orderNumber,
          storeId: orderData.storeId,
          storeName: storeData.name,
          total: orderData.total,
          estimatedDelivery: 15,
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
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  };

  const formatPrice = (price: number) => `Rp ${price.toLocaleString("id-ID")}`;
  const totalAmount = orders.reduce((sum, order) => sum + order.total, 0);

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#f8fafc' }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40 }]} showsVerticalScrollIndicator={false}>
        
        {/* Animated Celebration Icon */}
        <Animated.View style={[styles.checkCircle, iconAnimatedStyle]}>
          <LinearGradient colors={['#10b981', '#059669']} style={styles.gradientCircle}>
            <Feather name="check" size={60} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>
        
        <Animated.View style={[styles.content, contentAnimatedStyle]}>
          <ThemedText style={styles.title}>{t.orderSuccess.title}</ThemedText>
          <ThemedText style={styles.subtitle}>
            {orders.length > 1 ? `${orders.length} orders are being prepared!` : t.orderSuccess.orderConfirmed}
          </ThemedText>

          {/* Grand Total Summary */}
          {orders.length > 1 && (
            <View style={styles.grandTotalCard}>
              <ThemedText style={styles.totalLabel}>TOTAL PAID</ThemedText>
              <ThemedText style={styles.totalValue}>{formatPrice(totalAmount)}</ThemedText>
            </View>
          )}

          {/* Individual Store Cards */}
          <View style={styles.ordersList}>
            {orders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.storeIconBox}>
                    <Feather name="shopping-bag" size={18} color="#4f46e5" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <ThemedText style={styles.storeName}>{order.storeName}</ThemedText>
                    <ThemedText style={styles.orderNumber}>#{order.orderNumber}</ThemedText>
                  </View>
                  <View style={styles.priceTag}>
                    <ThemedText style={styles.priceText}>{formatPrice(order.total)}</ThemedText>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.etaBox}>
                    <Feather name="clock" size={14} color="#64748b" />
                    <ThemedText style={styles.etaText}>Arriving in {order.estimatedDelivery} mins</ThemedText>
                  </View>
                  <Pressable onPress={() => handleTrackOrder(order.id)}>
                    <LinearGradient colors={['#4f46e5', '#7c3aed']} style={styles.trackMiniBtn}>
                      <ThemedText style={styles.trackBtnText}>Track</ThemedText>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
      
      {/* Floating Bottom Action */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable onPress={handleGoHome} style={styles.homeBtn}>
          <ThemedText style={styles.homeBtnText}>{t.orderSuccess.backToHome}</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 140, alignItems: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Celebration Icon
  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 24,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  gradientCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: { width: '100%', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: '#1e293b', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginTop: 8, marginBottom: 32, fontWeight: '600' },

  // Grand Total Card
  grandTotalCard: {
    backgroundColor: '#ffffff',
    width: '100%',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  totalLabel: { fontSize: 12, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  totalValue: { fontSize: 28, fontWeight: '900', color: '#4f46e5', marginTop: 4 },

  // Individual Order Cards
  ordersList: { width: '100%', gap: 16 },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  storeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  orderNumber: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  priceTag: { backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  priceText: { fontSize: 13, fontWeight: '800', color: '#1e293b' },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  etaBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  etaText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  trackMiniBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  trackBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24 },
  homeBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  homeBtnText: { color: '#64748b', fontWeight: '800', fontSize: 16 },
});