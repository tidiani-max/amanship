// app/screens/OrderTrackingScreen.tsx
// REAL MAP with live driver tracking like Uber/Grab

import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, ScrollView, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { WebView } from "react-native-webview";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { CallButton } from "@/components/CallButton";

type OrderTrackingRouteProp = RouteProp<RootStackParamList, "OrderTracking">;

const { width, height } = Dimensions.get("window");

export default function OrderTrackingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const route = useRoute<OrderTrackingRouteProp>();
  const { orderId } = route.params;
  const webViewRef = useRef<WebView>(null);

  const [storeLocation, setStoreLocation] = useState<{lat: number, lng: number} | null>(null);
  const [customerLocation, setCustomerLocation] = useState<{lat: number, lng: number} | null>(null);

  // Fetch order details
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: async () => {
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/orders/${orderId}`);
      if (!response.ok) throw new Error("Order not found");
      const data = await response.json();
      
      // Get customer location from order
      if (data.customerLat && data.customerLng) {
        setCustomerLocation({
          lat: parseFloat(data.customerLat),
          lng: parseFloat(data.customerLng)
        });
      }
      
      // Get store location
      if (data.storeId) {
        const storeRes = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/stores/${data.storeId}`);
        const storeData = await storeRes.json();
        if (storeData.latitude && storeData.longitude) {
          setStoreLocation({
            lat: parseFloat(storeData.latitude),
            lng: parseFloat(storeData.longitude)
          });
        }
      }
      
      return data;
    },
    refetchInterval: 5000,
  });

  // Fetch driver location (real-time polling)
  const { data: driverData } = useQuery({
    queryKey: ["driver-location", orderId],
    queryFn: async () => {
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/driver/location/${orderId}`);
      return response.json();
    },
    refetchInterval: 3000, // Update every 3 seconds
    enabled: order?.status === "delivering",
  });

  // Update map when driver location changes
  useEffect(() => {
    if (driverData?.hasLocation && webViewRef.current) {
      const updateScript = `
        if (window.updateDriverLocation) {
          window.updateDriverLocation(
            ${driverData.location.latitude},
            ${driverData.location.longitude},
            ${driverData.location.heading || 0}
          );
        }
        true;
      `;
      webViewRef.current.injectJavaScript(updateScript);
    }
  }, [driverData?.location]);

  if (orderLoading || !order) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={{ marginTop: 10 }}>Loading order details...</ThemedText>
      </View>
    );
  }

  const getUIStatus = () => {
    const s = order.status;
    if (s === "pending" || s === "picking") return "preparing";
    if (s === "packed") return "picked_up";
    if (s === "delivering") return "on_the_way";
    if (s === "delivered") return "arriving";
    return "preparing";
  };

  const status = getUIStatus();

  const getStatusText = () => {
    switch (status) {
      case "preparing": return "Preparing your order";
      case "picked_up": return "Rider picked up";
      case "on_the_way": return "Rider is on the way";
      case "arriving": return "Almost there!";
      default: return "Processing";
    }
  };

  const getTimeEstimate = () => {
    if (driverData?.estimatedArrival) {
      const eta = new Date(driverData.estimatedArrival);
      const now = new Date();
      const diff = Math.ceil((eta.getTime() - now.getTime()) / 60000);
      return diff > 0 ? `${diff} min` : "Arriving now";
    }
    
    switch (status) {
      case "preparing": return "12-15 min";
      case "picked_up": return "10-12 min";
      case "on_the_way": return "5-8 min";
      case "arriving": return "1-2 min";
      default: return "-- min";
    }
  };

  const showMessageButton = order.status === "delivering" && order.driverId;
  const hasDriverLocation = driverData?.hasLocation && driverData.location;

  // Create HTML for the map
// Create HTML for the map
  const mapHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100%; height: 100vh; }
    .leaflet-container { background: #f0f2f5; }
    
    /* Animation for the driver's path ripple */
    @keyframes pulse {
      0% { transform: scale(0.5); opacity: 0.8; }
      100% { transform: scale(2.5); opacity: 0; }
    }
    .pulse-effect {
      position: absolute;
      width: 40px;
      height: 40px;
      background: rgba(30, 136, 229, 0.3);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const customerLat = ${customerLocation?.lat || 13.7563};
    const customerLng = ${customerLocation?.lng || 100.5018};
    
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([customerLat, customerLng], 15);
    
    // Light-themed tiles for a clean delivery app look
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);
    
    // CUSTOMER ICON (Destination)
    const customerIcon = L.divIcon({
      html: \`
        <div style="background: #1E88E5; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          </svg>
        </div>
      \`,
      className: '',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
    L.marker([customerLat, customerLng], { icon: customerIcon }).addTo(map);
    
    let driverMarker = null;
    let routeLine = null;

    // UPDATE FUNCTION
    window.updateDriverLocation = function(lat, lng, heading = 0) {
      const driverPos = [lat, lng];
      const customerPos = [customerLat, customerLng];

      if (!driverMarker) {
        // DRIVER ICON (Motorcycle)
        const motorIcon = L.divIcon({
          html: \`
            <div style="position: relative; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center;">
              <div class="pulse-effect"></div>
              <div id="motor-ship" style="transform: rotate(\${heading}deg); transition: transform 0.3s ease;">
                <svg width="45" height="45" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="20" fill="#FFD700" stroke="black" stroke-width="2"/>
                  <rect x="45" y="20" width="10" height="40" rx="5" fill="black" />
                  <rect x="30" y="45" width="40" height="10" rx="2" fill="#333" />
                </svg>
              </div>
            </div>
          \`,
          className: '',
          iconSize: [50, 50],
          iconAnchor: [25, 25]
        });
        driverMarker = L.marker(driverPos, { icon: motorIcon }).addTo(map);
      } else {
        driverMarker.setLatLng(driverPos);
        const ship = document.getElementById('motor-ship');
        if(ship) ship.style.transform = 'rotate(' + heading + 'deg)';
      }

      // UPDATE THE LINE (From Driver to Customer only)
      if (routeLine) map.removeLayer(routeLine);
      
      routeLine = L.polyline([driverPos, customerPos], {
        color: '#1E88E5', // Blue line
        weight: 4,
        dashArray: '10, 10', // Dashed line looks better for "tracking"
        opacity: 0.7
      }).addTo(map);

      // Auto-zoom to keep both in view
      const bounds = L.latLngBounds([driverPos, customerPos]);
      map.fitBounds(bounds, { padding: [50, 50] });
    };
  </script>
</body>
</html>
`;

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      {/* Real Map View */}
      <View style={styles.mapContainer}>
        {storeLocation && customerLocation ? (
          <WebView
            ref={webViewRef}
            source={{ html: mapHTML }}
            style={styles.map}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        ) : (
          <View style={[styles.centered, { backgroundColor: theme.backgroundDefault }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={{ marginTop: 10 }}>Loading map...</ThemedText>
          </View>
        )}

        {/* GPS Accuracy Badge */}
        {hasDriverLocation && driverData.location.accuracy && (
          <View style={[styles.accuracyBadge, { backgroundColor: theme.cardBackground }]}>
            <Feather name="crosshair" size={12} color="#10b981" />
            <ThemedText style={styles.accuracyText}>
              GPS: ±{Math.round(driverData.location.accuracy)}m
            </ThemedText>
          </View>
        )}

        {/* Speed Badge */}
        {hasDriverLocation && driverData.location.speed && (
          <View style={[styles.speedBadge, { backgroundColor: theme.cardBackground }]}>
            <Feather name="navigation" size={12} color={theme.primary} />
            <ThemedText style={[styles.accuracyText, { color: theme.primary }]}>
              {Math.round(driverData.location.speed * 3.6)} km/h
            </ThemedText>
          </View>
        )}
      </View>

      {/* Bottom Panel */}
      <ScrollView 
        style={styles.bottomPanel}
        contentContainerStyle={{
          paddingBottom: insets.bottom + Spacing.lg,
          paddingHorizontal: Spacing.lg,
          paddingTop: Spacing.lg,
        }}
      >
        {/* Status Header */}
        <View style={styles.statusHeader}>
          <View style={[styles.statusBadge, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="zap" size={16} color={theme.primary} />
            <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600" }}>
              {getTimeEstimate()}
            </ThemedText>
          </View>
          <ThemedText type="h3">{getStatusText()}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Order #{order.orderNumber}
          </ThemedText>

          {/* Distance to Customer */}
          {hasDriverLocation && (
            <View style={styles.distanceBadge}>
              <Feather name="navigation" size={14} color={theme.success} />
              <ThemedText type="caption" style={{ color: theme.success, fontWeight: "600" }}>
                {driverData.distance.toFixed(1)} km away
              </ThemedText>
            </View>
          )}
        </View>

        {/* Progress Tracker */}
        <View style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <View style={[styles.progressDot, { backgroundColor: theme.success }]}>
              <Feather name="check" size={12} color="#FFF" />
            </View>
            <ThemedText type="small" style={styles.progressLabel}>Confirmed</ThemedText>
          </View>

          <View style={[styles.progressLine, { 
            backgroundColor: ["picked_up", "on_the_way", "arriving"].includes(status) 
              ? theme.success : theme.border 
          }]} />

          <View style={styles.progressStep}>
            <View style={[styles.progressDot, { 
              backgroundColor: ["picked_up", "on_the_way", "arriving"].includes(status)
                ? theme.success : theme.border 
            }]}>
              {["picked_up", "on_the_way", "arriving"].includes(status) && (
                <Feather name="check" size={12} color="#FFF" />
              )}
            </View>
            <ThemedText type="small" style={styles.progressLabel}>Picked Up</ThemedText>
          </View>

          <View style={[styles.progressLine, { 
            backgroundColor: status === "arriving" ? theme.success : theme.border 
          }]} />

          <View style={styles.progressStep}>
            <View style={[styles.progressDot, { 
              backgroundColor: status === "arriving" ? theme.success : theme.border 
            }]}>
              {status === "arriving" && <Feather name="check" size={12} color="#FFF" />}
            </View>
            <ThemedText type="small" style={styles.progressLabel}>Delivered</ThemedText>
          </View>
        </View>

        {/* Driver Info Card */}
        <Card style={styles.riderCard}>
          <View style={styles.riderInfo}>
            <View style={[styles.riderAvatar, { backgroundColor: theme.primary }]}>
              <ThemedText type="h3" style={{ color: '#FFF' }}>
                {order.driverName?.charAt(0) || "D"}
              </ThemedText>
            </View>
            <View style={styles.riderDetails}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {order.driverName || "Finding Driver..."}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Flash Courier Partner
              </ThemedText>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {showMessageButton && (
                <Pressable 
                  onPress={() => navigation.navigate("Chat", { orderId: order.id })}
                  style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                >
                  <Feather name="message-square" size={20} color="#FFFFFF" />
                </Pressable>
              )}
              {order.driverPhone && <CallButton phoneNumber={order.driverPhone} />}
            </View>
          </View>
        </Card>

        {/* Delivery PIN */}
        <Card style={styles.pinCard}>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: 4 }}>
            Delivery PIN Code
          </ThemedText>
          <ThemedText type="h1" style={{ letterSpacing: 8, color: theme.primary }}>
            {order.deliveryPin}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }}>
            Share this code with the driver upon arrival
          </ThemedText>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  mapContainer: { 
    flex: 0.5, 
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  accuracyBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  speedBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  accuracyText: { fontSize: 12, fontWeight: '600', color: '#065f46' },
  bottomPanel: { flex: 0.5 },
  statusHeader: { alignItems: "center", marginBottom: Spacing.xl },
  statusBadge: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: Spacing.md, 
    paddingVertical: Spacing.xs, 
    borderRadius: BorderRadius.xs, 
    gap: Spacing.xs, 
    marginBottom: Spacing.sm 
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  progressContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  progressStep: { alignItems: 'center' },
  progressDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  progressLine: { width: 60, height: 2, marginHorizontal: 8 },
  progressLabel: { fontSize: 10 },
  riderCard: { padding: 12, marginBottom: Spacing.md },
  riderInfo: { flexDirection: "row", alignItems: "center" },
  riderAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  riderDetails: { flex: 1, marginLeft: Spacing.md },
  actionBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  pinCard: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 2,
    borderColor: '#10b981',
  },
});