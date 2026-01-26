import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Dimensions, Pressable, ScrollView } from "react-native";
import { WebView } from "react-native-webview";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";

const { width } = Dimensions.get("window");

export default function OrderTrackingScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const { orderId } = route.params;
  const webViewRef = useRef<WebView>(null);

  // 1. Fetch Order & Customer Details from your backend
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/orders/${orderId}`);
      return res.json();
    }
  });

  // 2. Poll Driver Location every 3 seconds (as defined in your backend routes)
  const { data: driverData } = useQuery({
    queryKey: ["driver-location", orderId],
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/driver/location/${orderId}`);
      return res.json();
    },
    refetchInterval: 3000,
    enabled: !!order && order.status === "delivering"
  });

  // 3. Inject new coordinates into the WebView map
  useEffect(() => {
    if (driverData?.hasLocation && webViewRef.current) {
      const script = `
        if (window.updateDriverLocation) {
          window.updateDriverLocation(
            ${driverData.location.latitude}, 
            ${driverData.location.longitude}, 
            ${driverData.location.heading || 0}
          );
        }
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [driverData]);

  if (orderLoading || !order) {
    return (
      <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>
    );
  }

  const customerLocation = { 
    lat: parseFloat(order.customerLat || "13.7563"), 
    lng: parseFloat(order.customerLng || "100.5018") 
  };

  const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { width: 100%; height: 100vh; background: #f0f2f5; }
        @keyframes pulse { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.5); opacity: 0; } }
        .pulse { position: absolute; width: 40px; height: 40px; background: rgba(255, 215, 0, 0.4); border-radius: 50%; animation: pulse 2s infinite; top: -10px; left: -10px; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map', { zoomControl: false, attributionControl: false })
          .setView([${customerLocation.lat}, ${customerLocation.lng}], 15);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);

        // Customer Marker
        L.marker([${customerLocation.lat}, ${customerLocation.lng}], {
          icon: L.divIcon({
            html: '<div style="background:#1E88E5;width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div>',
            className: '', iconSize: [30, 30], iconAnchor: [15, 15]
          })
        }).addTo(map);

        let driverMarker = null;
        let routeLine = null;

        window.updateDriverLocation = function(lat, lng, heading) {
          const dPos = [lat, lng];
          const cPos = [${customerLocation.lat}, ${customerLocation.lng}];

          if (!driverMarker) {
            driverMarker = L.marker(dPos, {
              icon: L.divIcon({
                html: '<div style="position:relative;"><div class="pulse"></div><div id="m" style="transition:0.5s ease;"><img src="https://cdn-icons-png.flaticon.com/512/713/713401.png" style="width:40px;height:40px;"/></div></div>',
                className: '', iconSize: [40, 40], iconAnchor: [20, 20]
              })
            }).addTo(map);
          } else {
            driverMarker.setLatLng(dPos);
            document.getElementById('m').style.transform = 'rotate(' + heading + 'deg)';
          }

          if (routeLine) map.removeLayer(routeLine);
          routeLine = L.polyline([dPos, cPos], { color: '#FFD700', weight: 5, opacity: 0.8 }).addTo(map);
          map.fitBounds([dPos, cPos], { padding: [50, 50] });
        };
      </script>
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: mapHTML }}
          style={styles.map}
        />
        
        {/* Badges */}
        <View style={styles.badgeLeft}>
          <Feather name="crosshair" size={12} color="#10b981" />
          <ThemedText style={styles.badgeText}>GPS: ±{Math.round(driverData?.location?.accuracy || 12)}m</ThemedText>
        </View>
      </View>

      <ScrollView style={styles.bottomPanel} contentContainerStyle={{ padding: 24 }}>
        <View style={styles.header}>
          <View style={[styles.etaBadge, { backgroundColor: theme.primary + '20' }]}>
            <Feather name="zap" size={14} color={theme.primary} />
            <ThemedText style={{ color: theme.primary, fontWeight: 'bold' }}>5-8 min</ThemedText>
          </View>
          <ThemedText type="h2">Rider is on the way</ThemedText>
          <ThemedText style={{ color: theme.textSecondary }}>Order #{order.orderNumber || orderId.slice(0,8)}</ThemedText>
        </View>

        {/* Driver Info */}
        <Card style={styles.driverCard}>
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>{order.driverName?.[0] || 'D'}</ThemedText>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <ThemedText type="body" style={{ fontWeight: '600' }}>{order.driverName || "Assigning..."}</ThemedText>
              <ThemedText type="caption">Flash Courier Partner</ThemedText>
            </View>
            <Pressable style={[styles.iconBtn, { backgroundColor: theme.primary }]}>
              <Feather name="message-square" size={20} color="white" />
            </Pressable>
          </View>
        </Card>

        {/* PIN Section */}
        <View style={styles.pinBox}>
          <ThemedText type="caption">Delivery PIN Code</ThemedText>
          <ThemedText style={styles.pinText}>{order.deliveryPin || "----"}</ThemedText>
          <ThemedText type="small" style={{ textAlign: 'center' }}>Share this code with the driver</ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { height: '45%', width: '100%' },
  map: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bottomPanel: { 
    flex: 1, 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    marginTop: -24, 
    backgroundColor: 'white' 
  },
  header: { alignItems: 'center', marginBottom: 24 },
  etaBadge: { 
    flexDirection: 'row', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20, 
    gap: 6, 
    marginBottom: 8 
  },
  driverCard: { padding: 16, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  iconBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  pinBox: { 
    padding: 20, 
    backgroundColor: '#ecfdf5', 
    borderRadius: 16, 
    borderColor: '#10b981', 
    borderWidth: 2, // Corrected from borderWeight
    alignItems: 'center' 
  },
  pinText: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#10b981', 
    letterSpacing: 10, 
    marginVertical: 8 
  },
  badgeLeft: { 
    position: 'absolute', 
    bottom: 40, 
    left: 16, 
    backgroundColor: 'white', 
    padding: 8, 
    borderRadius: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4 
  },
  badgeText: { fontSize: 10, fontWeight: 'bold' }
});