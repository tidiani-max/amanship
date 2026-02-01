import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, Linking, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { WebView } from 'react-native-webview';
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const BRAND_PURPLE = "#6338f2"; 
const BRAND_MINT = "#00bfa5";

type OrderTrackingRouteProp = RouteProp<RootStackParamList, "OrderTracking">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

  const isSearching = !order?.driverId && (order?.status === "pending" || order?.status === "created");
  const isOnTheWay = order?.status === "delivering";

  useEffect(() => {
    if (webViewRef.current && isOnTheWay) {
      // Mock driver movement toward the customer lat/lng
      const driverPos = { lat: 13.7548, lng: 100.4990 }; 
      webViewRef.current.injectJavaScript(`
        if(window.updateDriverLocation) updateDriverLocation(${driverPos.lat}, ${driverPos.lng}, 45);
        true;
      `);
    }
  }, [isOnTheWay]);

  if (isLoading && !order) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND_PURPLE} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* MAP SECTION */}
      <View style={{ height: '55%', backgroundColor: '#e5e7eb' }}>
        <WebView
          ref={webViewRef}
          source={{ html: MAP_HTML_TEMPLATE(13.7563, 100.5018, isSearching) }}
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

      {/* BOTTOM INFO SHEET */}
      <ScrollView
        style={styles.bottomSheet}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingHorizontal: 20 }}
      >
        <View style={styles.handle} />

        {isSearching ? (
          <View style={styles.searchingContainer}>
            <ActivityIndicator color={BRAND_PURPLE} size="small" />
            <ThemedText style={styles.searchingText}>Finding the nearest driver...</ThemedText>
          </View>
        ) : (
          <View style={styles.statusHeader}>
            <View>
              <ThemedText style={styles.etaText}>{isOnTheWay ? '11 mins' : 'Preparing'}</ThemedText>
              <ThemedText style={styles.subText}>Order PIN: <ThemedText style={styles.pinText}>{order?.pin || '1234'}</ThemedText></ThemedText>
            </View>
            <View style={styles.statusBadge}>
              <ThemedText style={styles.statusLabel}>{order?.status?.toUpperCase() || 'PENDING'}</ThemedText>
            </View>
          </View>
        )}

        {/* DRIVER INFO (Only if assigned) */}
        {!isSearching && (
          <Card style={styles.driverCard}>
            <View style={styles.driverRow}>
              <View style={styles.driverAvatar}>
                <FontAwesome5 name="motorcycle" size={20} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.driverName}>{order?.driverName || "Zendo Partner"}</ThemedText>
                <ThemedText style={styles.vehicleInfo}>Honda Vario • B 1234 ABC</ThemedText>
              </View>
              <View style={styles.contactActions}>
                <Pressable style={styles.iconBtn} onPress={() => Linking.openURL(`tel:${order?.driverPhone}`)}>
                  <Feather name="phone" size={18} color={BRAND_PURPLE} />
                </Pressable>
                <Pressable style={[styles.iconBtn, { backgroundColor: BRAND_PURPLE }]} onPress={() => navigation.navigate("Chat", { orderId })}>
                  <Feather name="message-circle" size={18} color="white" />
                </Pressable>
              </View>
            </View>
          </Card>
        )}

        {/* ORDER SUMMARY PRICES */}
        <View style={styles.summarySection}>
          <ThemedText style={styles.sectionTitle}>Order Details</ThemedText>
          <View style={styles.priceRow}>
            <ThemedText style={styles.priceLabel}>Subtotal</ThemedText>
            <ThemedText style={styles.priceValue}>Rp {order?.subtotal?.toLocaleString() || '0'}</ThemedText>
          </View>
          <View style={styles.priceRow}>
            <ThemedText style={styles.priceLabel}>Delivery Fee</ThemedText>
            <ThemedText style={styles.priceValue}>Rp {order?.deliveryFee?.toLocaleString() || '10.000'}</ThemedText>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <ThemedText style={styles.totalLabel}>Total Amount</ThemedText>
            <ThemedText style={styles.totalValue}>Rp {order?.totalAmount?.toLocaleString() || '0'}</ThemedText>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const MAP_HTML_TEMPLATE = (lat: number, lng: number, isSearching: boolean) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100%; height: 100vh; }
    .leaflet-tile-pane { filter: grayscale(100%) brightness(105%) contrast(85%); }
    .searching-pulse {
      width: 100px; height: 100px; background: rgba(99, 56, 242, 0.2);
      border: 2px solid #6338f2; border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.5); opacity: 1; }
      100% { transform: scale(2.5); opacity: 0; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${lat}, ${lng}], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map);

    const destIcon = L.divIcon({
      html: '<div style="background:#6338f2; width:12px; height:12px; border-radius:50%; border:3px solid white;"></div>',
      className: ''
    });
    L.marker([${lat}, ${lng}], { icon: destIcon }).addTo(map);

    let driverMarker = null;

    if (${isSearching}) {
      L.marker([${lat}, ${lng}], {
        icon: L.divIcon({ html: '<div class="searching-pulse"></div>', className: '', iconSize:[100,100], iconAnchor:[50,50] })
      }).addTo(map);
    }

    window.updateDriverLocation = (dLat, dLng, heading) => {
      const pos = [dLat, dLng];
      if (!driverMarker) {
        const bikeIcon = L.divIcon({
          html: '<img src="https://cdn-icons-png.flaticon.com/512/713/713437.png" style="width:35px; transform:rotate('+heading+'deg)"/>',
          className: '', iconSize: [35, 35], iconAnchor: [17, 17]
        });
        driverMarker = L.marker(pos, { icon: bikeIcon }).addTo(map);
      } else {
        driverMarker.setLatLng(pos);
      }
      map.panTo(pos, { animate: true });
    };
  </script>
</body>
</html>
`;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { position: 'absolute', left: 15, width: 40, height: 40, backgroundColor: 'white', borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  bottomSheet: { flex: 1, backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30 },
  handle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  searchingContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 25 },
  searchingText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  etaText: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  subText: { color: '#94a3b8', fontSize: 13 },
  pinText: { color: BRAND_PURPLE, fontWeight: 'bold' },
  statusBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, height: 30 },
  statusLabel: { fontSize: 10, fontWeight: '800', color: '#475569' },
  driverCard: { marginTop: 20, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverAvatar: { width: 45, height: 45, borderRadius: 12, backgroundColor: BRAND_PURPLE, justifyContent: 'center', alignItems: 'center' },
  driverName: { fontSize: 15, fontWeight: '700' },
  vehicleInfo: { fontSize: 12, color: '#94a3b8' },
  contactActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f3ff', justifyContent: 'center', alignItems: 'center' },
  summarySection: { marginTop: 25 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 15 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { color: '#64748b' },
  priceValue: { fontWeight: '600' },
  totalRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  totalLabel: { fontSize: 16, fontWeight: '800' },
  totalValue: { fontSize: 16, fontWeight: '800', color: BRAND_PURPLE }
});