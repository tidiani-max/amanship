import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, Linking, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { WebView } from 'react-native-webview';
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const BRAND_PURPLE = "#6338f2"; 

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

  const status = order?.status?.toLowerCase() || "pending";
  
  // Status Flags
  const isPreparing = status === "confirmed" || status === "picking" || status === "packing";
  const isSearching = !order?.driverId && (status === "pending" || status === "packed");
  const isOnTheWay = status === "delivering";

  useEffect(() => {
    if (webViewRef.current && isOnTheWay) {
      // Mock live movement: Move driver toward customer
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
      {/* DYNAMIC TOP SECTION (MAP OR ILLUSTRATION) */}
      <View style={{ height: '52%' }}>
        {isPreparing ? (
          <View style={styles.illustrationContainer}>
             <Image 
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3081/3081986.png' }} 
                style={styles.illustration}
                resizeMode="contain"
             />
             <ThemedText style={styles.illustrationText}>Shop is picking your items...</ThemedText>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ html: MAP_HTML_TEMPLATE(13.7563, 100.5018, isSearching, isOnTheWay) }}
            style={{ flex: 1 }}
            scrollEnabled={false}
          />
        )}
        
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

        <View style={styles.statusHeader}>
          <View>
            <ThemedText style={styles.etaText}>
                {isOnTheWay ? '12 mins' : isPreparing ? 'Preparing' : 'Searching...'}
            </ThemedText>
            <ThemedText style={styles.subText}>Order PIN: <ThemedText style={styles.pinText}>{order?.pin || '8821'}</ThemedText></ThemedText>
          </View>
          <View style={styles.statusBadge}>
            <ThemedText style={styles.statusLabel}>{status.toUpperCase()}</ThemedText>
          </View>
        </View>

        {/* DRIVER CARD (Only if driver assigned) */}
        {order?.driverName && (
          <Card style={styles.driverCard}>
            <View style={styles.driverRow}>
              <View style={styles.driverAvatar}>
                <FontAwesome5 name="motorcycle" size={20} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.driverName}>{order.driverName}</ThemedText>
                <ThemedText style={styles.vehicleInfo}>Honda Vario • {order.vehiclePlate || 'B 1234 ABC'}</ThemedText>
              </View>
              <View style={styles.contactActions}>
                <Pressable style={styles.iconBtn} onPress={() => Linking.openURL(`tel:${order.driverPhone}`)}>
                  <Feather name="phone" size={18} color={BRAND_PURPLE} />
                </Pressable>
                <Pressable style={[styles.iconBtn, { backgroundColor: BRAND_PURPLE }]} onPress={() => navigation.navigate("Chat", { orderId })}>
                  <Feather name="message-circle" size={18} color="white" />
                </Pressable>
              </View>
            </View>
          </Card>
        )}

        {/* ORDER SUMMARY & TOTALS */}
        <View style={styles.summarySection}>
          <ThemedText style={styles.sectionTitle}>Order Summary</ThemedText>
          <View style={styles.divider} />
          
          {order?.items?.map((item: any, i: number) => (
            <View key={i} style={styles.itemRow}>
               <ThemedText style={styles.itemQty}>{item.quantity}x</ThemedText>
               <ThemedText style={styles.itemName}>{item.productName}</ThemedText>
               <ThemedText style={styles.itemPrice}>Rp {item.price?.toLocaleString()}</ThemedText>
            </View>
          ))}

          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
                <ThemedText style={styles.priceLabel}>Subtotal</ThemedText>
                <ThemedText style={styles.priceValue}>Rp {order?.subtotal?.toLocaleString() || '0'}</ThemedText>
            </View>
            <View style={styles.priceRow}>
                <ThemedText style={styles.priceLabel}>Delivery Fee</ThemedText>
                <ThemedText style={styles.priceValue}>Rp {order?.deliveryFee?.toLocaleString() || '10,000'}</ThemedText>
            </View>
            <View style={[styles.priceRow, { marginTop: 10 }]}>
                <ThemedText style={styles.totalLabel}>Total Payment</ThemedText>
                <ThemedText style={styles.totalValue}>Rp {order?.totalAmount?.toLocaleString() || '0'}</ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const MAP_HTML_TEMPLATE = (lat: number, lng: number, isSearching: boolean, isOnTheWay: boolean) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100%; height: 100vh; background: #f8fafc; }
    .leaflet-tile-pane { filter: grayscale(100%) brightness(102%) contrast(90%); }
    .radar {
      width: 120px; height: 120px; border: 2px solid #6338f2; border-radius: 50%;
      background: rgba(99, 56, 242, 0.1); animation: pulse 2s infinite;
    }
    @keyframes pulse { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${lat}, ${lng}], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map);

    const customerIcon = L.divIcon({
      html: '<div style="background:#6338f2; width:14px; height:14px; border-radius:50%; border:3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.2);"></div>',
      className: '', iconSize: [20, 20]
    });
    L.marker([${lat}, ${lng}], { icon: customerIcon }).addTo(map);

    if (${isSearching}) {
      L.marker([${lat}, ${lng}], {
        icon: L.divIcon({ html: '<div class="radar"></div>', className: '', iconSize:[120,120], iconAnchor:[60,60] })
      }).addTo(map);
    }

    let driverMarker = null;
    let polyline = null;

    window.updateDriverLocation = (dLat, dLng, heading) => {
      const driverPos = [dLat, dLng];
      const customerPos = [${lat}, ${lng}];

      if (!driverMarker) {
        const bikeIcon = L.divIcon({
          html: '<img src="https://cdn-icons-png.flaticon.com/512/713/713437.png" style="width:40px; transform:rotate('+heading+'deg)"/>',
          className: '', iconSize: [40, 40], iconAnchor: [20, 20]
        });
        driverMarker = L.marker(driverPos, { icon: bikeIcon }).addTo(map);
        
        // BLUE ROUTE LINE
        polyline = L.polyline([driverPos, customerPos], { color: '#6338f2', weight: 4, opacity: 0.6, dashArray: '10, 10' }).addTo(map);
      } else {
        driverMarker.setLatLng(driverPos);
        polyline.setLatLngs([driverPos, customerPos]);
      }
      
      const bounds = L.latLngBounds([driverPos, customerPos]);
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    };
  </script>
</body>
</html>
`;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  illustrationContainer: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  illustration: { width: 200, height: 200 },
  illustrationText: { marginTop: 20, fontSize: 16, fontWeight: '700', color: '#64748b' },
  backButton: { position: 'absolute', left: 15, width: 42, height: 42, backgroundColor: 'white', borderRadius: 21, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.2 },
  bottomSheet: { flex: 1, backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30 },
  handle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, alignItems: 'center' },
  etaText: { fontSize: 28, fontWeight: '900', color: '#1e293b' },
  subText: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  pinText: { color: BRAND_PURPLE, fontWeight: 'bold' },
  statusBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusLabel: { fontSize: 11, fontWeight: '800', color: '#475569' },
  driverCard: { marginTop: 20, padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverAvatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: BRAND_PURPLE, justifyContent: 'center', alignItems: 'center' },
  driverName: { fontSize: 16, fontWeight: '800' },
  vehicleInfo: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  contactActions: { flexDirection: 'row', gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5f3ff', justifyContent: 'center', alignItems: 'center' },
  summarySection: { marginTop: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 15 },
  itemRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'center' },
  itemQty: { width: 30, fontWeight: '800', color: BRAND_PURPLE },
  itemName: { flex: 1, color: '#475569', fontSize: 15 },
  itemPrice: { fontWeight: '700' },
  priceContainer: { marginTop: 20, padding: 15, backgroundColor: '#f8fafc', borderRadius: 16 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  priceLabel: { color: '#64748b' },
  priceValue: { fontWeight: '600' },
  totalLabel: { fontSize: 17, fontWeight: '900' },
  totalValue: { fontSize: 17, fontWeight: '900', color: BRAND_PURPLE }
});