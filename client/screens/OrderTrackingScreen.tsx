import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, Linking, Pressable, Alert, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type OrderTrackingRouteProp = RouteProp<RootStackParamList, "OrderTracking">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ==================== PACKING ANIMATION COMPONENT ====================
function PackingAnimation() {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const scaleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    scaleAnimation.start();
    rotateAnimation.start();

    return () => {
      scaleAnimation.stop();
      rotateAnimation.stop();
    };
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.packingContainer}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View style={[styles.packingBox, { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Feather name="package" size={80} color={theme.primary} />
          </Animated.View>
        </View>
      </Animated.View>
      
      <ThemedText type="h2" style={{ marginTop: 32, textAlign: 'center' }}>
        Your order is being packed
      </ThemedText>
      <ThemedText type="body" style={{ marginTop: 12, textAlign: 'center', color: theme.textSecondary }}>
        Our team is carefully packing your items...
      </ThemedText>
      
      <View style={styles.loadingDots}>
        <View style={[styles.dot, { backgroundColor: theme.primary }]} />
        <View style={[styles.dot, { backgroundColor: theme.primary }]} />
        <View style={[styles.dot, { backgroundColor: theme.primary }]} />
      </View>
    </View>
  );
}

// ==================== WAITING FOR DRIVER COMPONENT ====================
function WaitingForDriver() {
  const { theme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.waitingContainer}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <View style={[styles.driverWaitCircle, { backgroundColor: theme.warning + '20', borderColor: theme.warning }]}>
          <Feather name="truck" size={64} color={theme.warning} />
        </View>
      </Animated.View>
      
      <ThemedText type="h2" style={{ marginTop: 32, textAlign: 'center' }}>
        Waiting for driver to confirm pickup
      </ThemedText>
      <ThemedText type="body" style={{ marginTop: 12, textAlign: 'center', color: theme.textSecondary }}>
        Your order is ready and packed. A driver will pick it up soon...
      </ThemedText>
    </View>
  );
}

// ==================== MAIN COMPONENT ====================
export default function OrderTrackingScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const route = useRoute<OrderTrackingRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const orderId = route.params.orderId;

  const [driverLocation, setDriverLocation] = useState({ lat: 13.7548, lng: 100.4990 });
  const [customerLocation] = useState({ lat: 13.7563, lng: 100.5018 });
  const [heading, setHeading] = useState(45);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch order details with real-time updates
  const { data: order, isLoading } = useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: async () => {
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/orders/${orderId}`);
      if (!response.ok) throw new Error("Failed to fetch order");
      return response.json();
    },
    refetchInterval: 3000,
  });

  // Fetch driver location
  const { data: locationData } = useQuery({
    queryKey: ["driver-location", orderId],
    queryFn: async () => {
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/driver/location/${orderId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: order?.status === "delivering",
    refetchInterval: 3000,
  });

  // Update driver location from real data
  useEffect(() => {
    if (locationData?.hasLocation && locationData.location) {
      setDriverLocation({
        lat: locationData.location.latitude,
        lng: locationData.location.longitude,
      });
      if (locationData.location.heading) {
        setHeading(locationData.location.heading);
      }
    }
  }, [locationData]);

  // Simulate movement for demo if no real location
  useEffect(() => {
    if (!locationData?.hasLocation && order?.status === "delivering") {
      const interval = setInterval(() => {
        setDriverLocation(prev => ({
          lat: prev.lat + (Math.random() - 0.5) * 0.0005,
          lng: prev.lng + (Math.random() - 0.5) * 0.0005
        }));
        setHeading(prev => (prev + 15) % 360);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [locationData, order?.status]);

  // Update map iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow && order?.status === "delivering") {
      iframeRef.current.contentWindow.postMessage({
        type: 'updateDriver',
        lat: driverLocation.lat,
        lng: driverLocation.lng,
        heading: heading
      }, '*');
    }
  }, [driverLocation, heading, order?.status]);

  const handleCallDriver = () => {
    if (order?.driverPhone) {
      Linking.openURL(`tel:${order.driverPhone}`);
    } else {
      Alert.alert("No Driver", "Driver contact not available yet");
    }
  };

  const handleChatDriver = () => {
    if (order?.id) {
      navigation.navigate("Chat", { 
        orderId: order.id
      });
    } else {
      Alert.alert("Chat Unavailable", "Order information not available");
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={{ marginTop: 16 }}>Loading order details...</ThemedText>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <Feather name="alert-circle" size={48} color={theme.error} />
        <ThemedText style={{ marginTop: 16 }}>Order not found</ThemedText>
      </View>
    );
  }

  const status = order.status;
  const isPacking = status === "confirmed" || status === "picking";
  const isWaitingDriver = status === "packed";
  const isDelivering = status === "delivering";
  const isDelivered = status === "delivered";

  // Show driver contact only when delivering
  const showDriverContact = isDelivering && order.driverId;

  // Map HTML - only show yellow line when delivering
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
      0% { transform: scale(1); opacity: 0.6; }
      50% { transform: scale(1.3); opacity: 0.3; }
      100% { transform: scale(1); opacity: 0.6; }
    }
    
    .pulse-ring {
      position: absolute;
      width: 60px;
      height: 60px;
      background: rgba(255, 215, 0, 0.3);
      border-radius: 50%;
      animation: pulse 2s infinite;
      top: -5px;
      left: -5px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const customerLat = ${customerLocation.lat};
    const customerLng = ${customerLocation.lng};
    const showRoute = ${isDelivering};
    
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([customerLat, customerLng], 15);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);
    
    const customerIcon = L.divIcon({
      html: \`
        <div style="position: relative; width: 40px; height: 48px;">
          <div style="
            background: #1E88E5; 
            width: 40px; 
            height: 40px; 
            border-radius: 50% 50% 50% 0; 
            transform: rotate(-45deg);
            border: 4px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style="transform: rotate(45deg);">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
        </div>
      \`,
      className: '',
      iconSize: [40, 48],
      iconAnchor: [20, 48]
    });
    L.marker([customerLat, customerLng], { icon: customerIcon }).addTo(map);
    
    let driverMarker = null;
    let routeLine = null;

    function updateDriverLocation(lat, lng, heading) {
      const driverPos = [lat, lng];
      const customerPos = [customerLat, customerLng];

      if (!driverMarker) {
        const driverIcon = L.divIcon({
          html: \`
            <div style="position: relative; width: 50px; height: 50px;">
              <div class="pulse-ring"></div>
              <div id="driver-icon" style="
                position: absolute;
                width: 50px;
                height: 50px;
                transform: rotate(\${heading}deg);
                transition: transform 0.5s ease;
              ">
                <svg width="50" height="50" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="22" fill="#FFD700" stroke="white" stroke-width="4"/>
                  <g transform="translate(50, 50)">
                    <circle cx="-8" cy="8" r="4" fill="#333"/>
                    <circle cx="8" cy="8" r="4" fill="#333"/>
                    <rect x="-10" y="0" width="20" height="6" rx="2" fill="#333"/>
                    <rect x="-2" y="-8" width="4" height="10" rx="2" fill="#666"/>
                  </g>
                </svg>
              </div>
            </div>
          \`,
          className: '',
          iconSize: [50, 50],
          iconAnchor: [25, 25]
        });
        driverMarker = L.marker(driverPos, { icon: driverIcon }).addTo(map);
      } else {
        driverMarker.setLatLng(driverPos);
        const icon = document.getElementById('driver-icon');
        if (icon) {
          icon.style.transform = 'rotate(' + heading + 'deg)';
        }
      }

      // Only show yellow line when delivering
      if (showRoute) {
        if (routeLine) map.removeLayer(routeLine);
        
        routeLine = L.polyline([driverPos, customerPos], {
          color: '#FFD700',
          weight: 6,
          opacity: 0.9,
          smoothFactor: 1
        }).addTo(map);

        const bounds = L.latLngBounds([driverPos, customerPos]);
        map.fitBounds(bounds, { 
          padding: [80, 80],
          maxZoom: 16
        });
      } else {
        // Just show driver and customer locations without line
        const bounds = L.latLngBounds([driverPos, customerPos]);
        map.fitBounds(bounds, { 
          padding: [100, 100],
          maxZoom: 14
        });
      }
    }
    
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'updateDriver') {
        updateDriverLocation(event.data.lat, event.data.lng, event.data.heading);
      }
    });
    
    updateDriverLocation(${driverLocation.lat}, ${driverLocation.lng}, ${heading});
  </script>
</body>
</html>
  `;

  const estimatedMinutes = locationData?.distance 
    ? Math.ceil(locationData.distance * 3) 
    : "5-8";

  // ==================== RENDER PACKING STAGE ====================
  if (isPacking) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }}>
          <PackingAnimation />
          
          {/* Order Info */}
          <Card style={{ margin: 24, padding: 20 }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Order #{order.orderNumber || order.id.slice(0, 8)}
              </ThemedText>
            </View>
            
            {/* Progress Timeline */}
            <View style={styles.timeline}>
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: theme.success }]}>
                  <Feather name="check" size={12} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ fontWeight: '600' }}>Confirmed</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>Order received</ThemedText>
                </View>
              </View>
              
              <View style={[styles.timelineConnector, { backgroundColor: theme.primary }]} />
              
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: theme.primary }]}>
                  <ActivityIndicator size="small" color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ fontWeight: '600', color: theme.primary }}>Packing</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>In progress...</ThemedText>
                </View>
              </View>
              
              <View style={[styles.timelineConnector, { backgroundColor: theme.border }]} />
              
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: theme.border }]} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ color: theme.textSecondary }}>Pickup</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>Waiting...</ThemedText>
                </View>
              </View>
              
              <View style={[styles.timelineConnector, { backgroundColor: theme.border }]} />
              
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: theme.border }]} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ color: theme.textSecondary }}>Delivered</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>Pending...</ThemedText>
                </View>
              </View>
            </View>
          </Card>
        </ScrollView>
      </View>
    );
  }

  // ==================== RENDER WAITING FOR DRIVER STAGE ====================
  if (isWaitingDriver) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }}>
          <WaitingForDriver />
          
          {/* Order Info */}
          <Card style={{ margin: 24, padding: 20 }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Order #{order.orderNumber || order.id.slice(0, 8)}
              </ThemedText>
            </View>
            
            {/* Progress Timeline */}
            <View style={styles.timeline}>
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: theme.success }]}>
                  <Feather name="check" size={12} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ fontWeight: '600' }}>Confirmed</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>Completed</ThemedText>
                </View>
              </View>
              
              <View style={[styles.timelineConnector, { backgroundColor: theme.success }]} />
              
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: theme.success }]}>
                  <Feather name="check" size={12} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ fontWeight: '600' }}>Packed</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>Ready for pickup</ThemedText>
                </View>
              </View>
              
              <View style={[styles.timelineConnector, { backgroundColor: theme.warning }]} />
              
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: theme.warning }]}>
                  <ActivityIndicator size="small" color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ fontWeight: '600', color: theme.warning }}>Waiting Pickup</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>Driver confirming...</ThemedText>
                </View>
              </View>
              
              <View style={[styles.timelineConnector, { backgroundColor: theme.border }]} />
              
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: theme.border }]} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ color: theme.textSecondary }}>Delivered</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>Pending...</ThemedText>
                </View>
              </View>
            </View>
          </Card>
        </ScrollView>
      </View>
    );
  }

  // ==================== RENDER MAP VIEW (DELIVERING/DELIVERED) ====================
  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      {/* Map Section */}
      <View style={{ height: '50%' }}>
        <iframe
          ref={iframeRef}
          srcDoc={mapHTML}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Delivery Map"
        />
        
        {/* GPS Badge - Only show when delivering */}
        {isDelivering && locationData?.hasLocation && (
          <View style={[styles.badge, { left: 16, backgroundColor: 'white' }]}>
            <Feather name="navigation" size={14} color="#10b981" />
            <ThemedText type="small" style={{ fontWeight: '600', color: '#065f46' }}>
              GPS: ±{locationData.location.accuracy?.toFixed(0) || 12}m
            </ThemedText>
          </View>
        )}
        
        {/* Distance Badge - Only show when delivering */}
        {isDelivering && locationData?.distance && (
          <View style={[styles.badge, { right: 16, backgroundColor: 'white' }]}>
            <Feather name="navigation" size={14} color="#1E88E5" />
            <ThemedText type="small" style={{ fontWeight: '600', color: '#1E88E5' }}>
              {locationData.distance.toFixed(1)} km
            </ThemedText>
          </View>
        )}
      </View>

      {/* Bottom Panel */}
      <ScrollView
        style={[styles.bottomPanel, { backgroundColor: theme.backgroundDefault }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Status Header */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          {isDelivering && (
            <View style={[styles.etaBadge, { backgroundColor: theme.primary + '15' }]}>
              <Feather name="clock" size={16} color={theme.primary} />
              <ThemedText type="body" style={{ fontWeight: '600', color: theme.primary }}>
                {estimatedMinutes} min
              </ThemedText>
            </View>
          )}
          <ThemedText type="h2" style={{ marginTop: 12, marginBottom: 8 }}>
            {isDelivered ? "Order Delivered!" : "Driver is on the way"}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Order #{order.orderNumber || order.id.slice(0, 8)}
          </ThemedText>
        </View>

        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <View style={[styles.stepCircle, { backgroundColor: theme.success }]}>
              <Feather name="check" size={14} color="white" />
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Confirmed</ThemedText>
          </View>
          
          <View style={[styles.progressLine, { backgroundColor: theme.success }]} />
          
          <View style={styles.progressStep}>
            <View style={[styles.stepCircle, { backgroundColor: theme.success }]}>
              <Feather name="check" size={14} color="white" />
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Packed</ThemedText>
          </View>
          
          <View style={[styles.progressLine, { backgroundColor: isDelivered ? theme.success : theme.primary }]} />
          
          <View style={styles.progressStep}>
            <View style={[styles.stepCircle, { backgroundColor: isDelivered ? theme.success : theme.primary }]}>
              {isDelivered ? (
                <Feather name="check" size={14} color="white" />
              ) : (
                <Feather name="truck" size={14} color="white" />
              )}
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {isDelivered ? "Picked Up" : "On Route"}
            </ThemedText>
          </View>
          
          <View style={[styles.progressLine, { backgroundColor: isDelivered ? theme.success : theme.border }]} />
          
          <View style={styles.progressStep}>
            <View style={[styles.stepCircle, { backgroundColor: isDelivered ? theme.success : theme.border }]}>
              {isDelivered && <Feather name="check" size={14} color="white" />}
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Delivered</ThemedText>
          </View>
        </View>

        {/* Driver Info - Only show when delivering */}
        {showDriverContact && (
          <Card style={{ marginBottom: 16, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={[styles.driverAvatar, { backgroundColor: theme.primary }]}>
                <ThemedText style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                  {order.driverName?.[0]?.toUpperCase() || 'D'}
                </ThemedText>
              </View>
              
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontWeight: '600', fontSize: 16 }}>
                  {order.driverName || "Driver"}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  {order.driverPhone || "Courier Partner"}
                </ThemedText>
              </View>
              
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable 
                  style={[styles.actionButton, { backgroundColor: theme.primary }]}
                  onPress={handleChatDriver}
                >
                  <Feather name="message-circle" size={20} color="white" />
                </Pressable>
                
                <Pressable 
                  style={[styles.actionButton, { backgroundColor: theme.success }]}
                  onPress={handleCallDriver}
                >
                  <Feather name="phone" size={20} color="white" />
                </Pressable>
              </View>
            </View>
          </Card>
        )}

        {/* Delivery PIN - Show when delivering or delivered */}
        {(isDelivering || isDelivered) && order.deliveryPin && (
          <Card style={styles.pinCard}>
            <View style={{ 
              backgroundColor: theme.success + '10',
              borderColor: isDelivered ? theme.success : theme.warning,
              borderWidth: 2,
              borderRadius: 16,
              padding: 24,
              alignItems: 'center'
            }}>
              <Feather name="shield" size={24} color={isDelivered ? theme.success : theme.warning} />
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 8 }}>
                {isDelivered ? "Delivery Confirmed" : "Delivery PIN Code"}
              </ThemedText>
              <ThemedText style={{ 
                fontSize: 36, 
                fontWeight: 'bold', 
                color: isDelivered ? theme.success : theme.warning,
                letterSpacing: 8,
                marginVertical: 8 
              }}>
                {order.deliveryPin}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center' }}>
                {isDelivered 
                  ? "This code was used to confirm delivery"
                  : "Share this code with the driver upon arrival"}
              </ThemedText>
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  // ===== PACKING STAGE =====
  packingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  packingBox: {
    width: 160,
    height: 160,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  
  // ===== WAITING STAGE =====
  waitingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  driverWaitCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // ===== TIMELINE =====
  timeline: {
    paddingVertical: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineConnector: {
    width: 2,
    height: 20,
    marginLeft: 15,
  },
  
  // ===== MAP VIEW =====
  badge: {
    position: 'absolute',
    bottom: 16,
    borderRadius: 20,
    padding: 8,
    paddingHorizontal: 12,
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomPanel: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    padding: 24,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  progressStep: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  progressLine: {
    width: 64,
    height: 2,
    marginHorizontal: 8,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCard: {
    marginBottom: 16,
  },
});