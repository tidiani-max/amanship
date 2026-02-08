import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import QRCode from 'react-native-qrcode-svg';

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/context/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type OrderSuccessRouteProp = RouteProp<RootStackParamList, "OrderSuccess">;

export default function OrderSuccessScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<OrderSuccessRouteProp>();
  const { orderId } = route.params;

  const orderIds = orderId.includes(',') ? orderId.split(',') : [orderId];
  const [qrisData, setQrisData] = useState<Record<string, any>>({});

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["order-success", orderIds],
    refetchInterval: 3000, // ✅ Poll every 3 seconds
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
          paymentMethod: orderData.paymentMethod,
          paymentStatus: orderData.paymentStatus,
          qrisConfirmed: orderData.qrisConfirmed,
          qrisUrl: orderData.qrisUrl,
          qrisExpiresAt: orderData.qrisExpiresAt,
          xenditInvoiceId: orderData.xenditInvoiceId,
        };
      });
      return Promise.all(orderPromises);
    },
  });

  // ✅ Generate QRIS for unpaid orders
// Generate QRIS for unpaid orders
// ✅ Generate QRIS for unpaid orders
useEffect(() => {
  orders.forEach(async (order) => {
    if (order.paymentMethod === "qris" && !order.qrisConfirmed && !qrisData[order.id]) {
      try {
        console.log(`🔄 Creating QRIS for order ${order.id}`);
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_DOMAIN}/api/orders/${order.id}/create-qris`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (res.ok) {
          const data = await res.json();
          console.log(`✅ QRIS created:`, data);
          
          // ✅ Save QRIS data with the correct field name
          setQrisData(prev => ({ 
            ...prev, 
            [order.id]: {
              ...data,
              qrCodeUrl: data.qr_string || data.qrCodeUrl // ✅ Handle both formats
            }
          }));
        } else {
          const errorText = await res.text();
          console.error(`❌ QRIS creation failed (${res.status}):`, errorText);
          Alert.alert(
            'QRIS Generation Failed',
            'Unable to generate QR code. Please try again or use COD payment.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error("Failed to create QRIS:", error);
      }
    }
  });
}, [orders, user?.id]);

  // ✅ Poll QRIS payment status
  useEffect(() => {
    const qrisOrders = orders.filter(o => 
      o.paymentMethod === "qris" && !o.qrisConfirmed
    );
    
    if (qrisOrders.length === 0) return;
    
    const interval = setInterval(async () => {
      for (const order of qrisOrders) {
        try {
          const res = await fetch(
            `${process.env.EXPO_PUBLIC_DOMAIN}/api/orders/${order.id}/qris-status?userId=${user?.id}`
          );
          
          if (res.ok) {
            const data = await res.json();
            console.log(`📊 QRIS status for ${order.orderNumber}:`, data.status);
            
            if (data.paid) {
              refetch(); // Refresh orders to show updated status
              Alert.alert(
                '✅ Payment Confirmed!', 
                `Your order #${order.orderNumber} is being prepared`,
                [{ text: 'OK' }]
              );
            }
          }
        } catch (error) {
          console.error('Failed to check QRIS status:', error);
        }
      }
    }, 3000); // Check every 3 seconds
    
    return () => clearInterval(interval);
  }, [orders, user?.id, refetch]);

  const formatPrice = (price: number) => `Rp ${price.toLocaleString("id-ID")}`;

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#f8fafc' }]}>
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40 }]} 
        showsVerticalScrollIndicator={false}
      >
        
        <View style={styles.checkCircle}>
          <LinearGradient colors={['#10b981', '#059669']} style={styles.gradientCircle}>
            <Feather name="check" size={60} color="#FFFFFF" />
          </LinearGradient>
        </View>
        
        <ThemedText style={styles.title}>Order Placed!</ThemedText>
        <ThemedText style={styles.subtitle}>
          {orders.length > 1 ? `${orders.length} orders placed successfully!` : "Order confirmed successfully"}
        </ThemedText>

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

              {/* ✅ QRIS Payment Section */}
              {order.paymentMethod === "qris" && !order.qrisConfirmed && (
                <View style={styles.qrisSection}>
                  <ThemedText style={styles.qrisTitle}>💳 Scan to Pay</ThemedText>
                  <ThemedText style={styles.qrisInstructions}>
                    Scan with GoPay, OVO, Dana, ShopeePay, or any banking app
                  </ThemedText>

                  {qrisData[order.id]?.qrCodeUrl ? (
                    <View style={styles.qrCodeContainer}>
                      <QRCode
                        value={qrisData[order.id].qrCodeUrl}
                        size={200}
                        backgroundColor="white"
                      />
                      <ThemedText style={styles.qrisExpiry}>
                        Expires in {Math.max(0, Math.floor((new Date(qrisData[order.id].expiresAt).getTime() - Date.now()) / 60000))} min
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                      <ActivityIndicator size="large" color="#4f46e5" />
                      <ThemedText style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>
                        Generating QR code...
                      </ThemedText>
                    </View>
                  )}

                  <View style={styles.qrisSteps}>
                    <View style={styles.step}>
                      <View style={styles.stepBadge}><ThemedText style={styles.stepText}>1</ThemedText></View>
                      <ThemedText style={styles.stepLabel}>Open payment app</ThemedText>
                    </View>
                    <View style={styles.step}>
                      <View style={styles.stepBadge}><ThemedText style={styles.stepText}>2</ThemedText></View>
                      <ThemedText style={styles.stepLabel}>Scan QR code</ThemedText>
                    </View>
                    <View style={styles.step}>
                      <View style={styles.stepBadge}><ThemedText style={styles.stepText}>3</ThemedText></View>
                      <ThemedText style={styles.stepLabel}>Confirm payment</ThemedText>
                    </View>
                  </View>

                  <View style={styles.qrisAlert}>
                    <Feather name="info" size={16} color="#f59e0b" />
                    <ThemedText style={styles.qrisAlertText}>
                      Your order will automatically proceed once payment is detected
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* ✅ Payment Confirmed */}
              {order.qrisConfirmed && (
                <View style={styles.qrisSuccess}>
                  <Feather name="check-circle" size={20} color="#10b981" />
                  <ThemedText style={styles.qrisSuccessText}>
                    ✅ Payment confirmed! Order is being prepared
                  </ThemedText>
                </View>
              )}

              {/* COD Info */}
              {order.paymentMethod === "cod" && (
                <View style={styles.codInfo}>
                  <Feather name="dollar-sign" size={16} color="#64748b" />
                  <ThemedText style={styles.codText}>
                    Pay cash when delivered: {formatPrice(order.total)}
                  </ThemedText>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
      
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable 
          onPress={() => navigation.reset({ index: 0, routes: [{ name: "Main" }] })} 
          style={styles.homeBtn}
        >
          <ThemedText style={styles.homeBtnText}>Back to Home</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 140, alignItems: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
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

  title: { fontSize: 28, fontWeight: '900', color: '#1e293b', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginTop: 8, marginBottom: 32, fontWeight: '600' },

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

  // QRIS Styles
  qrisSection: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  qrisTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  qrisInstructions: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  qrCodeContainer: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  qrisExpiry: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '700',
    marginTop: 12,
  },
  qrisSteps: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  step: {
    alignItems: 'center',
    gap: 8,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  stepLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  qrisAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  qrisAlertText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
  },

  qrisSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    gap: 12,
  },
  qrisSuccessText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
    flex: 1,
  },

  codInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  codText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24 },
  homeBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  homeBtnText: { color: '#64748b', fontWeight: '800', fontSize: 16 },
});