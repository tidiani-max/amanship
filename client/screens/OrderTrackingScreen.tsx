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
    .leaflet-container { background: #f5f5f5; }
    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.3); }
      100% { opacity: 1; transform: scale(1); }
    }
    .pulse-ring {
      animation: pulse 2s ease-in-out infinite;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    // Initialize map
    const customerLat = ${customerLocation?.lat || 13.7563};
    const customerLng = ${customerLocation?.lng || 100.5018};
    const storeLat = ${storeLocation?.lat || 13.7563};
    const storeLng = ${storeLocation?.lng || 100.5018};
    
    const map = L.map('map', {
      zoomControl: true,
      attributionControl: false
    }).setView([customerLat, customerLng], 14);
    
    // Add OpenStreetMap tiles with Grab-like styling
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      className: 'map-tiles'
    }).addTo(map);
    
    // Store marker (orange pin)
    const storeIcon = L.divIcon({
      html: \`
        <div style="position: relative;">
          <div style="background: #00B14F; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white" style="transform: rotate(45deg);">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          </div>
        </div>
      \`,
      className: 'store-marker',
      iconSize: [32, 40],
      iconAnchor: [16, 32]
    });
    L.marker([storeLat, storeLng], { icon: storeIcon }).addTo(map);
    
    // Customer marker (blue pin with house)
    const customerIcon = L.divIcon({
      html: \`
        <div style="position: relative;">
          <div style="background: #1E88E5; width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 3px 12px rgba(30,136,229,0.4); display: flex; align-items: center; justify-content: center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style="transform: rotate(45deg);">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
        </div>
      \`,
      className: 'customer-marker',
      iconSize: [36, 44],
      iconAnchor: [18, 36]
    });
    L.marker([customerLat, customerLng], { icon: customerIcon }).addTo(map);
    
    // Driver marker (will be updated) - Grab-style motorcycle
    let driverMarker = null;
    let routeLine = null;
    let pulseCircle = null;
    
    // Function to update driver location (called from React Native)
    window.updateDriverLocation = function(lat, lng, heading) {
      if (!driverMarker) {
        // Create driver marker - Grab green motorcycle icon
        const driverIcon = L.divIcon({
          html: \`
            <div style="position: relative; width: 50px; height: 50px;">
              <div class="pulse-ring" style="position: absolute; top: 5px; left: 5px; width: 40px; height: 40px; border-radius: 50%; background: rgba(0,177,79,0.3); border: 2px solid #00B14F;"></div>
              <div style="position: absolute; top: 8px; left: 8px; background: #00B14F; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(0,177,79,0.5); transform: rotate(\${heading}deg);">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M5 11L2 20h20l-3-9M12 4v8M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4"/>
                </svg>
              </div>
            </div>
          \`,
          className: 'driver-icon',
          iconSize: [50, 50],
          iconAnchor: [25, 25]
        });
        driverMarker = L.marker([lat, lng], { 
          icon: driverIcon,
          zIndexOffset: 1000 
        }).addTo(map);
      } else {
        // Smooth update
        driverMarker.setLatLng([lat, lng]);
        const iconHtml = driverMarker.getElement();
        if (iconHtml) {
          const innerDiv = iconHtml.querySelector('div > div:last-child');
          if (innerDiv) {
            innerDiv.style.transform = 'rotate(' + heading + 'deg)';
          }
        }
      }
      
      // Draw Grab-style route line (blue-green gradient)
      if (routeLine) {
        map.removeLayer(routeLine);
      }
      
      // Route from store to driver (green)
      const storeToDriver = L.polyline([
        [storeLat, storeLng],
        [lat, lng]
      ], {
        color: '#00B14F',
        weight: 6,
        opacity: 0.8,
        smoothFactor: 1,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
      
      // Route from driver to customer (blue gradient effect)
      routeLine = L.polyline([
        [lat, lng],
        [customerLat, customerLng]
      ], {
        color: '#1E88E5',
        weight: 6,
        opacity: 0.8,
        smoothFactor: 1,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: '0, 10',
        dashOffset: '0'
      }).addTo(map);
      
      // Add white border effect for better visibility
      L.polyline([
        [lat, lng],
        [customerLat, customerLng]
      ], {
        color: '#FFFFFF',
        weight: 8,
        opacity: 0.5,
        smoothFactor: 1,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
      
      // Re-add the blue line on top
      routeLine.bringToFront();
      storeToDriver.bringToFront();
      
      // Fit map to show all markers
      const bounds = L.latLngBounds([
        [storeLat, storeLng],
        [lat, lng],
        [customerLat, customerLng]
      ]);
      map.fitBounds(bounds, { 
        padding: [60, 60],
        maxZoom: 15 
      });
    };
    
    // Initial fit
    const initialBounds = L.latLngBounds([
      [storeLat, storeLng],
      [customerLat, customerLng]
    ]);
    map.fitBounds(initialBounds, { 
      padding: [60, 60],
      maxZoom: 14 
    });
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