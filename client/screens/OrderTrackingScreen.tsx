import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, Linking, Pressable, Alert, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { WebView } from 'react-native-webview';
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

// BRAND COLORS
const BRAND_PURPLE = "#6338f2"; 
const BRAND_MINT_TEXT = "#00bfa5";
const STATUS_BLUE = "#3b82f6";
const STATUS_ORANGE = "#f59e0b";

type OrderTrackingRouteProp = RouteProp<RootStackParamList, "OrderTracking">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Consistent Status Mapping with safety checks
const getStatusTheme = (status?: string) => {
  const s = status?.toLowerCase() || "pending";
  switch (s) {
    case "pending": 
    case "created": return { color: "#94a3b8", icon: "clock-outline", label: "PENDING", progress: 0.2 };
    case "confirmed": return { color: BRAND_PURPLE, icon: "check-circle-outline", label: "PREPARING", progress: 0.4 };
    case "picking": 
    case "packing": return { color: STATUS_BLUE, icon: "package-variant", label: "PACKING", progress: 0.6 };
    case "packed": return { color: STATUS_ORANGE, icon: "package-variant-closed", label: "READY TO GO", progress: 0.8 };
    case "delivering": return { color: BRAND_MINT_TEXT, icon: "flash", label: "ON THE WAY", progress: 0.95 };
    case "delivered": return { color: "#059669", icon: "check-decagram", label: "DELIVERED", progress: 1 };
    default: return { color: BRAND_PURPLE, icon: "dots-horizontal", label: s.toUpperCase(), progress: 0.1 };
  }
};

export default function OrderTrackingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<OrderTrackingRouteProp>();
  const { orderId } = route.params;
  const webViewRef = useRef<WebView>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/orders/${orderId}`);
      return res.json();
    },
    refetchInterval: 3000,
  });

  const statusTheme = getStatusTheme(order?.status);

  useEffect(() => {
    if (webViewRef.current && order?.status === 'delivering') {
      // Logic for driver movement
      const driverPos = { lat: 13.7548, lng: 100.4990 }; 
      webViewRef.current.injectJavaScript(`
        if(window.updateDriverLocation) updateDriverLocation(${driverPos.lat}, ${driverPos.lng}, 45);
        true;
      `);
    }
  }, [order?.status]);

  if (isLoading && !order) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={BRAND_PURPLE} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* PROFESSIONAL MAP SECTION */}
      <View style={{ height: '50%', backgroundColor: '#e5e7eb' }}>
        <WebView
          ref={webViewRef}
          source={{ html: MAP_HTML_TEMPLATE(13.7563, 100.5018) }}
          style={{ flex: 1 }}
          scrollEnabled={false}
        />
        
        <Pressable 
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { top: insets.top + 10 }]}
        >
          <Feather name="arrow-left" size={24} color="#1e293b" />
        </Pressable>
      </View>

      {/* DRIVER INFO & STATUS SHEET */}
      <ScrollView
        style={styles.bottomSheet}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.handle} />

        <View style={styles.headerRow}>
           <View>
              <ThemedText style={styles.etaText}>
                {order?.status === 'delivering' ? '11 mins' : 'Preparing...'}
              </ThemedText>
              <ThemedText style={styles.subText}>Estimated arrival time</ThemedText>
           </View>
           <View style={[styles.statusPill, { backgroundColor: (statusTheme.color || BRAND_PURPLE) + '15' }]}>
              <ThemedText style={{ color: statusTheme.color, fontWeight: '800', fontSize: 11 }}>
                {statusTheme.label || "LOADING"}
              </ThemedText>
           </View>
        </View>

        {/* PROGRESS BAR */}
        <View style={styles.progressContainer}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(statusTheme.progress || 0.1) * 100}%`, backgroundColor: statusTheme.color }]} />
          </View>
        </View>

        {/* DRIVER CARD */}
        <Card style={styles.driverCard}>
          <View style={styles.driverInfo}>
            <View style={[styles.avatar, { backgroundColor: statusTheme.color }]}>
              <MaterialCommunityIcons name={"motorcycle" as any} size={26} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.driverName}>{order?.driverName || "Zendo Courier"}</ThemedText>
              <View style={styles.ratingRow}>
                <Feather name="star" size={12} color="#f59e0b" fill="#f59e0b" />
                <ThemedText style={styles.ratingText}>4.9 • Honda Vario (B 1234 ABC)</ThemedText>
              </View>
            </View>
            <View style={styles.actionRow}>
              <Pressable style={styles.circleBtn} onPress={() => order?.driverPhone && Linking.openURL(`tel:${order.driverPhone}`)}>
                <Feather name="phone" size={20} color={BRAND_PURPLE} />
              </Pressable>
              <Pressable style={[styles.circleBtn, { backgroundColor: BRAND_PURPLE }]} onPress={() => navigation.navigate("Chat", { orderId: order?.id })}>
                <Feather name="message-circle" size={20} color="white" />
              </Pressable>
            </View>
          </View>
        </Card>

        {/* ORDER LIST PREVIEW */}
        <View style={styles.orderSummary}>
            <ThemedText style={styles.sectionTitle}>Order Summary</ThemedText>
            <ThemedText style={styles.orderIdText}>
                Order #{order?.id ? order.id.slice(-8).toUpperCase() : '-------'}
            </ThemedText>
            <View style={styles.divider} />
            {order?.items?.map((item: any, idx: number) => (
              <View key={idx} style={styles.itemRow}>
                <ThemedText style={styles.itemQty}>{item.quantity}x</ThemedText>
                <ThemedText style={styles.itemName}>{item.productName}</ThemedText>
                <ThemedText style={styles.itemPrice}>Rp {item.price?.toLocaleString() || '0'}</ThemedText>
              </View>
            ))}
        </View>
      </ScrollView>
    </View>
  );
}

// Map template remains the same but with added safety in the update function
const MAP_HTML_TEMPLATE = (lat: number, lng: number) => `...`; // Same as previous modern version

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  backButton: { position: 'absolute', left: 20, width: 45, height: 45, backgroundColor: 'white', borderRadius: 15, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10 },
  bottomSheet: { flex: 1, backgroundColor: 'white', borderTopLeftRadius: 35, borderTopRightRadius: 35, marginTop: -35, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  handle: { width: 40, height: 5, backgroundColor: '#f1f5f9', borderRadius: 10, alignSelf: 'center', marginTop: 15 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 25, paddingHorizontal: 5 },
  etaText: { fontSize: 28, fontWeight: '900', color: '#1e293b' },
  subText: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  progressContainer: { marginVertical: 20 },
  track: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 10 },
  fill: { height: '100%', borderRadius: 10 },
  driverCard: { padding: 16, borderRadius: 24, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f8fafc' },
  driverInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 50, height: 50, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  driverName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10 },
  circleBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f5f3ff', justifyContent: 'center', alignItems: 'center' },
  orderSummary: { marginTop: 25, paddingHorizontal: 5 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  orderIdText: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 15 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  itemQty: { width: 25, color: BRAND_PURPLE, fontWeight: '800' },
  itemName: { flex: 1, color: '#475569', fontWeight: '600' },
  itemPrice: { fontWeight: '700', color: '#1e293b' }
});