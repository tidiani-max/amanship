// app/screens/OrderTrackingScreen.tsx
// Grab-style map with live driver tracking

import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Dimensions, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { WebView } from "react-native-webview";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
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
      
      // Get customer location (DELIVERY DESTINATION)
      if (data.customerLat && data.customerLng) {
        setCustomerLocation({
          lat: parseFloat(data.customerLat),
          lng: parseFloat(data.customerLng)
        });
      }
      
      // Get store location (PICKUP POINT)
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
    refetchInterval: 3000,
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
        <ActivityIndicator size="large" color="#00BFA6" />
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
      case "picked_up": return "Rider picked up your order";
      case "on_the_way": return "Rider is on the way";
      case "arriving": return "Arriving soon!";
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
      case "preparing": return "15 min";
      case "picked_up": return "12 min";
      case "on_the_way": return "8 min";
      case "arriving": return "2 min";
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
    .pulse {
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.5); opacity: 0.3; }
      100% { transform: scale(1); opacity: 1; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const customerLat = ${customerLocation?.lat || 13.7563};
    const customerLng = ${customerLocation?.lng || 100.5018};
    const storeLat = ${storeLocation?.lat || 13.7563};
    const storeLng = ${storeLocation?.lng || 100.5018};
    
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([customerLat, customerLng], 14);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);
    
    // Pickup point (Store - Green with building icon)
    const pickupIcon = L.divIcon({
      html: '<div style="position: relative;"><div style="background: #00BFA6; width: 12px; height: 12px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); position: absolute; top: 0; left: 50%; transform: translateX(-50%);"></div></div>',
      className: 'pickup-icon',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    L.marker([storeLat, storeLng], { icon: pickupIcon }).addTo(map);
    
    // Delivery destination (Customer - Blue with pin)
    const destinationIcon = L.divIcon({
      html: '<div style="position: relative;"><div style="width: 0; height: 0; border-left: 15px solid transparent; border-right: 15px solid transparent; border-top: 30px solid #1E88E5; position: absolute; top: -30px; left: 50%; transform: translateX(-50%);"></div><div style="background: #1E88E5; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; position: absolute; top: -28px; left: 50%; transform: translateX(-50%); box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div></div>',
      className: 'destination-icon',
      iconSize: [30, 30],
      iconAnchor: [15, 0]
    });
    L.marker([customerLat, customerLng], { icon: destinationIcon }).addTo(map);
    
    // Route line from pickup to destination
    const routeLine = L.polyline([
      [storeLat, storeLng],
      [customerLat, customerLng]
    ], {
      color: '#00BFA6',
      weight: 5,
      opacity: 0.8
    }).addTo(map);
    
    // Driver marker
    let driverMarker = null;
    let driverRouteLine = null;
    
    window.updateDriverLocation = function(lat, lng, heading) {
      if (!driverMarker) {
        const driverIcon = L.divIcon({
          html: '<div style="position: relative;"><div class="pulse" style="background: rgba(0, 191, 166, 0.3); width: 60px; height: 60px; border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div><div style="background: #00BFA6; width: 40px; height: 40px; border-radius: 50%; border: 4px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,191,166,0.6); position: relative; z-index: 10;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><circle cx="12" cy="12" r="1"></circle><path d="M19 12h-2M7 12H5M12 19v-2M12 7V5"></path></svg></div></div>',
          className: 'driver-icon',
          iconSize: [60, 60],
          iconAnchor: [30, 30]
        });
        driverMarker = L.marker([lat, lng], { icon: driverIcon }).addTo(map);
      } else {
        driverMarker.setLatLng([lat, lng]);
      }
      
      // Draw route from driver to destination
      if (driverRouteLine) {
        map.removeLayer(driverRouteLine);
      }
      driverRouteLine = L.polyline([
        [lat, lng],
        [customerLat, customerLng]
      ], {
        color: '#00BFA6',
        weight: 5,
        opacity: 0.8,
        dashArray: '10, 10'
      }).addTo(map);
      
      // Fit bounds to show all markers
      const bounds = L.latLngBounds([
        [storeLat, storeLng],
        [lat, lng],
        [customerLat, customerLng]
      ]);
      map.fitBounds(bounds, { padding: [80, 80] });
    };
    
    // Initial fit
    const initialBounds = L.latLngBounds([
      [storeLat, storeLng],
      [customerLat, customerLng]
    ]);
    map.fitBounds(initialBounds, { padding: [80, 80] });
  </script>
</body>
</html>
  `;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Full-height Map */}
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
          <View style={[styles.centered, { backgroundColor: '#F5F5F5' }]}>
            <ActivityIndicator size="large" color="#00BFA6" />
            <ThemedText style={{ marginTop: 10 }}>Loading map...</ThemedText>
          </View>
        )}

        {/* Floating Back Button */}
        <Pressable 
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { top: insets.top + 16 }]}
        >
          <Feather name="chevron-down" size={28} color="#000" />
        </Pressable>

        {/* Floating Action Buttons */}
        <View style={[styles.floatingActions, { top: insets.top + 16 }]}>
          <Pressable style={styles.floatingBtn}>
            <Feather name="cloud-rain" size={22} color="#00BFA6" />
          </Pressable>
          
          <Pressable 
            style={styles.floatingBtn}
            onPress={() => {
              if (webViewRef.current && storeLocation && customerLocation) {
                webViewRef.current.injectJavaScript(`
                  const bounds = L.latLngBounds([
                    [${storeLocation.lat}, ${storeLocation.lng}],
                    [${customerLocation.lat}, ${customerLocation.lng}]
                  ]);
                  map.fitBounds(bounds, { padding: [80, 80] });
                  true;
                `);
              }
            }}
          >
            <Feather name="crosshair" size={22} color="#000" />
          </Pressable>
        </View>
      </View>

      {/* Bottom Sheet */}
      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 20 }]}>
        {/* Handle Bar */}
        <View style={styles.handleBar} />

        {/* Pickup Location Card */}
        <Pressable style={styles.locationCard}>
          <View style={styles.locationIconContainer}>
            <View style={[styles.locationDot, { backgroundColor: '#00BFA6' }]} />
          </View>
          <View style={styles.locationInfo}>
            <ThemedText type="caption" style={{ color: '#666', fontSize: 12 }}>
              {status === "preparing" ? "Pickup point" : "Delivering to"}
            </ThemedText>
            <ThemedText type="body" style={{ fontWeight: '600', marginTop: 2, fontSize: 15 }}>
              {status === "preparing" ? (order.storeName || 'Store Location') : (order.customerAddress || 'Your Location')}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color="#999" />
        </Pressable>

        {/* Safety Centre Banner */}
        <Pressable style={styles.safetyBanner}>
          <View style={styles.safetyIcon}>
            <Feather name="shield" size={18} color="#00BFA6" />
          </View>
          <ThemedText type="caption" style={{ flex: 1, color: '#00BFA6', fontWeight: '700', fontSize: 13 }}>
            SAFETY CENTRE
          </ThemedText>
        </Pressable>

        {/* Driver Info Section */}
        <View style={styles.driverSection}>
          <View style={styles.driverHeader}>
            <View style={styles.riderAvatar}>
              <ThemedText type="h3" style={{ color: '#FFF', fontSize: 20 }}>
                {order.driverName?.charAt(0) || "D"}
              </ThemedText>
            </View>
            <View style={styles.driverInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ThemedText type="body" style={{ fontWeight: "700", fontSize: 16 }}>
                  {order.driverName || "Finding Driver..."}
                </ThemedText>
                <View style={styles.etaBadge}>
                  <ThemedText type="caption" style={{ color: '#00BFA6', fontWeight: "700", fontSize: 12 }}>
                    {getTimeEstimate()}
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="small" style={{ color: '#666', marginTop: 4, fontSize: 13 }}>
                {order.deliveryVehicle || "Motorcycle"} • {order.vehiclePlate || "ABC-1234"}
              </ThemedText>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {showMessageButton && (
              <Pressable 
                onPress={() => navigation.navigate("Chat", { orderId: order.id })}
                style={styles.actionBtn}
              >
                <Feather name="message-square" size={22} color="#000" />
              </Pressable>
            )}
            {order.driverPhone && (
              <View style={{ transform: [{ scale: 1.1 }] }}>
                <CallButton phoneNumber={order.driverPhone} />
              </View>
            )}
          </View>
        </View>

        {/* Status Text */}
        <ThemedText type="caption" style={{ color: '#666', marginTop: 16, paddingHorizontal: 20, fontSize: 13 }}>
          {getStatusText()}
        </ThemedText>

        {/* Delivery PIN */}
        {order.deliveryPin && (
          <View style={styles.pinContainer}>
            <ThemedText type="caption" style={{ color: '#666', fontSize: 12 }}>
              Delivery PIN:
            </ThemedText>
            <ThemedText type="h2" style={{ color: '#00BFA6', fontWeight: '800', letterSpacing: 6, fontSize: 28 }}>
              {order.deliveryPin}
            </ThemedText>
          </View>
        )}

        {/* Distance Badge */}
        {hasDriverLocation && (
          <View style={styles.distanceInfo}>
            <Feather name="navigation" size={14} color="#00BFA6" />
            <ThemedText type="caption" style={{ color: '#00BFA6', fontWeight: "600", fontSize: 12 }}>
              {driverData.distance.toFixed(1)} km away
            </ThemedText>
          </View>
        )}

        {/* Schedule Banner (like in the image) */}
        <Pressable style={styles.scheduleBanner}>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: '700', fontSize: 16, marginBottom: 4 }}>
              Schedule your airport ride ahead
            </ThemedText>
            <ThemedText type="caption" style={{ color: '#666', fontSize: 13 }}>
              And relax knowing we'll pick you on time.
            </ThemedText>
          </View>
          <View style={styles.scheduleIcon}>
            <Feather name="arrow-right" size={20} color="#000" />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  mapContainer: { 
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  floatingActions: {
    position: 'absolute',
    right: 16,
    gap: 12,
  },
  floatingBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 12,
  },
  locationIconContainer: {
    width: 8,
    marginRight: 16,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locationInfo: {
    flex: 1,
  },
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#E0F7F4',
    borderRadius: 8,
    marginBottom: 16,
  },
  safetyIcon: {
    marginRight: 12,
  },
  driverSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riderAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00BFA6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverInfo: {
    flex: 1,
  },
  etaBadge: {
    backgroundColor: '#E0F7F4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    position: 'absolute',
    right: 0,
    top: 16,
  },
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 8,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  scheduleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    marginTop: 16,
    marginHorizontal: -20,
  },
  scheduleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});