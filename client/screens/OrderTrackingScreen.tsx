import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, Linking, Pressable, Alert, Animated, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { WebView } from 'react-native-webview';
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type OrderTrackingRouteProp = RouteProp<RootStackParamList, "OrderTracking">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isSmallDevice = SCREEN_WIDTH < 375;
const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 768;
const isTablet = SCREEN_WIDTH >= 768;

// ==================== PENDING ANIMATION COMPONENT ====================
function PendingAnimation() {
  const { theme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );

    pulse.start();
    rotate.start();

    return () => {
      pulse.stop();
      rotate.stop();
    };
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const iconSize = isSmallDevice ? 50 : isTablet ? 100 : 70;
  const circleSize = isSmallDevice ? 120 : isTablet ? 200 : 150;

  return (
    <View style={styles.pendingContainer}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <View style={[styles.pendingCircle, { 
          backgroundColor: theme.warning + '20', 
          borderColor: theme.warning,
          width: circleSize,
          height: circleSize,
        }]}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Feather name="clock" size={iconSize} color={theme.warning} />
          </Animated.View>
        </View>
      </Animated.View>
      
      <ThemedText type="h2" style={[styles.centerText, { marginTop: isTablet ? 40 : isSmallDevice ? 24 : 32, fontSize: isSmallDevice ? 20 : undefined }]}>
        Order Pending
      </ThemedText>
      <ThemedText type="body" style={[styles.centerText, { color: theme.textSecondary, marginTop: 8, fontSize: isSmallDevice ? 13 : undefined, paddingHorizontal: 16 }]}>
        Waiting for restaurant confirmation...
      </ThemedText>
      
      <View style={styles.loadingDots}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, { backgroundColor: theme.warning }]} />
        ))}
      </View>
    </View>
  );
}

// ==================== PICKING ANIMATION COMPONENT ====================
function PickingAnimation() {
  const { theme } = useTheme();
  const moveAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const moveAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(moveAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(moveAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );

    moveAnimation.start();
    rotateAnimation.start();

    return () => {
      moveAnimation.stop();
      rotateAnimation.stop();
    };
  }, []);

  const translateX = moveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 30],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '-10deg', '0deg'],
  });

  const iconSize = isSmallDevice ? 50 : isTablet ? 100 : 70;
  const containerSize = isSmallDevice ? 120 : isTablet ? 200 : 150;

  return (
    <View style={styles.pickingContainer}>
      <View style={[styles.pickingScene, { width: containerSize * 2.2, height: containerSize }]}>
        <View style={[styles.warehouse, { 
          backgroundColor: theme.backgroundDefault, 
          borderColor: theme.border,
          width: containerSize * 0.85,
          height: containerSize * 0.85,
        }]}>
          <Feather name="home" size={iconSize * 0.5} color={theme.textSecondary} />
          <View style={styles.shelfRow}>
            <View style={[styles.box, { backgroundColor: theme.primary + '40', width: isSmallDevice ? 16 : 20, height: isSmallDevice ? 16 : 20 }]} />
            <View style={[styles.box, { backgroundColor: theme.secondary + '40', width: isSmallDevice ? 16 : 20, height: isSmallDevice ? 16 : 20 }]} />
            <View style={[styles.box, { backgroundColor: theme.warning + '40', width: isSmallDevice ? 16 : 20, height: isSmallDevice ? 16 : 20 }]} />
          </View>
        </View>

        <Animated.View style={[
          styles.pickerIcon,
          { 
            transform: [{ translateX }, { rotate }],
            left: containerSize * 0.75,
          }
        ]}>
          <View style={[styles.pickerCircle, { 
            backgroundColor: theme.primary + '20', 
            borderColor: theme.primary,
            width: containerSize * 0.65,
            height: containerSize * 0.65,
          }]}>
            <Feather name="user" size={iconSize * 0.55} color={theme.primary} />
            <View style={[styles.cart, { backgroundColor: theme.primary, marginTop: 6 }]}>
              <Feather name="shopping-cart" size={iconSize * 0.3} color="white" />
            </View>
          </View>
        </Animated.View>
      </View>
      
      <ThemedText type="h2" style={[styles.centerText, { marginTop: isTablet ? 40 : isSmallDevice ? 24 : 32, fontSize: isSmallDevice ? 20 : undefined }]}>
        Picking your items
      </ThemedText>
      <ThemedText type="body" style={[styles.centerText, { color: theme.textSecondary, marginTop: 8, fontSize: isSmallDevice ? 13 : undefined, paddingHorizontal: 16 }]}>
        Our team is collecting items from the warehouse...
      </ThemedText>
      
      <View style={styles.loadingDots}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, { backgroundColor: theme.primary }]} />
        ))}
      </View>
    </View>
  );
}

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

  const iconSize = isSmallDevice ? 50 : isTablet ? 100 : 70;
  const boxSize = isSmallDevice ? 120 : isTablet ? 200 : 150;

  return (
    <View style={styles.packingContainer}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View style={[styles.packingBox, { 
          backgroundColor: theme.primary + '20', 
          borderColor: theme.primary,
          width: boxSize,
          height: boxSize,
        }]}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Feather name="package" size={iconSize} color={theme.primary} />
          </Animated.View>
        </View>
      </Animated.View>
      
      <ThemedText type="h2" style={[styles.centerText, { marginTop: isTablet ? 40 : isSmallDevice ? 24 : 32, fontSize: isSmallDevice ? 20 : undefined }]}>
        Packing your order
      </ThemedText>
      <ThemedText type="body" style={[styles.centerText, { color: theme.textSecondary, marginTop: 8, fontSize: isSmallDevice ? 13 : undefined, paddingHorizontal: 16 }]}>
        Our team is carefully packing your items...
      </ThemedText>
      
      <View style={styles.loadingDots}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, { backgroundColor: theme.primary }]} />
        ))}
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

  const circleSize = isSmallDevice ? 100 : isTablet ? 180 : 130;
  const iconSize = isSmallDevice ? 40 : isTablet ? 80 : 60;

  return (
    <View style={styles.waitingContainer}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <View style={[styles.driverWaitCircle, { 
          backgroundColor: theme.warning + '20', 
          borderColor: theme.warning,
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
        }]}>
          <Feather name="truck" size={iconSize} color={theme.warning} />
        </View>
      </Animated.View>
      
      <ThemedText type="h2" style={[styles.centerText, { marginTop: isTablet ? 40 : isSmallDevice ? 24 : 32, fontSize: isSmallDevice ? 20 : undefined }]}>
        Waiting for driver
      </ThemedText>
      <ThemedText type="body" style={[styles.centerText, { color: theme.textSecondary, marginTop: 8, fontSize: isSmallDevice ? 13 : undefined, paddingHorizontal: 16 }]}>
        Your order is packed and ready. Waiting for driver confirmation...
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
  const webViewRef = useRef<WebView>(null);

  const fetchWithErrorHandling = async (url: string) => {
    try {
      console.log('Fetching:', url);
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Fetch error:', error);
      
      if (error.message?.includes('CORS')) {
        throw new Error('Connection blocked. Please check server CORS settings.');
      } else if (error.message?.includes('502')) {
        throw new Error('Server temporarily unavailable. Please try again.');
      } else if (error.message?.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your connection.');
      }
      
      throw error;
    }
  };

  const { data: order, isLoading, error: orderError } = useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: () => fetchWithErrorHandling(`${process.env.EXPO_PUBLIC_DOMAIN}/api/orders/${orderId}`),
    refetchInterval: 3000,
    retry: 3,
    retryDelay: 1000,
  });

  const { data: locationData } = useQuery({
    queryKey: ["driver-location", orderId],
    queryFn: async () => {
      try {
        return await fetchWithErrorHandling(`${process.env.EXPO_PUBLIC_DOMAIN}/api/driver/location/${orderId}`);
      } catch {
        return null;
      }
    },
    enabled: order?.status === "delivering",
    refetchInterval: 3000,
    retry: 2,
  });

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

  useEffect(() => {
    if (webViewRef.current && (order?.status === "delivering" || order?.status === "packed")) {
      const message = JSON.stringify({
        type: 'updateDriver',
        lat: driverLocation.lat,
        lng: driverLocation.lng,
        heading: heading
      });
      webViewRef.current.injectJavaScript(`
        window.postMessage(${message}, '*');
        true;
      `);
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
        <ThemedText style={{ marginTop: 16, textAlign: 'center' }}>Loading order details...</ThemedText>
      </View>
    );
  }

  if (orderError || !order) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot, padding: 24 }]}>
        <Feather name="alert-circle" size={48} color={theme.error} />
        <ThemedText style={{ marginTop: 16, textAlign: 'center', fontSize: 18, fontWeight: '600' }}>
          {orderError ? 'Connection Error' : 'Order Not Found'}
        </ThemedText>
        <ThemedText style={{ marginTop: 8, textAlign: 'center', color: theme.textSecondary, paddingHorizontal: 24 }}>
          {orderError instanceof Error ? orderError.message : 'Unable to load order details'}
        </ThemedText>
        <Pressable 
          style={[styles.retryButton, { backgroundColor: theme.primary, marginTop: 24 }]}
          onPress={() => navigation.goBack()}
        >
          <ThemedText style={{ color: 'white', fontWeight: '600' }}>Go Back</ThemedText>
        </Pressable>
      </View>
    );
  }

  const status = order.status;
  const isPending = status === "pending";
  const isConfirmed = status === "confirmed";
  const isPicking = status === "picking";
  const isPacking = status === "packing";
  const isPacked = status === "packed";
  const isDelivering = status === "delivering";
  const isDelivered = status === "delivered";
  const showDriverContact = isDelivering && order.driverId;
  const showMap = isPacked || isDelivering || isDelivered;
  const showRoute = isDelivering || isDelivered;

  // Updated mapHTML with motorcycle icon
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
      width: 70px;
      height: 70px;
      background: rgba(255, 215, 0, 0.3);
      border-radius: 50%;
      animation: pulse 2s infinite;
      top: -10px;
      left: -10px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const customerLat = ${customerLocation.lat};
    const customerLng = ${customerLocation.lng};
    const showRoute = ${showRoute};
    
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
                <svg width="50" height="50" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <!-- Pulse shadow/glow -->
                  <ellipse cx="60" cy="90" rx="25" ry="8" fill="rgba(255, 215, 0, 0.2)"/>
                  
                  <!-- Back wheel -->
                  <circle cx="35" cy="75" r="12" fill="#333" stroke="#FFD700" stroke-width="2"/>
                  <circle cx="35" cy="75" r="6" fill="#666"/>
                  
                  <!-- Front wheel -->
                  <circle cx="85" cy="75" r="12" fill="#333" stroke="#FFD700" stroke-width="2"/>
                  <circle cx="85" cy="75" r="6" fill="#666"/>
                  
                  <!-- Motorcycle body -->
                  <path d="M 35 75 Q 45 60 60 55 L 75 55 Q 85 60 85 75" 
                        fill="#FFD700" stroke="#333" stroke-width="2"/>
                  
                  <!-- Seat -->
                  <ellipse cx="55" cy="52" rx="15" ry="6" fill="#444"/>
                  
                  <!-- Handlebars -->
                  <path d="M 75 55 L 82 45" stroke="#666" stroke-width="3" stroke-linecap="round"/>
                  <circle cx="82" cy="43" r="3" fill="#888"/>
                  
                  <!-- Front fairing -->
                  <path d="M 75 55 L 85 50 L 90 55 L 85 60 Z" fill="#FFB700" stroke="#333" stroke-width="1.5"/>
                  
                  <!-- Headlight -->
                  <circle cx="88" cy="55" r="3" fill="#FFF" stroke="#FFD700" stroke-width="1"/>
                  
                  <!-- Rider helmet -->
                  <circle cx="52" cy="38" r="10" fill="#FFD700" stroke="#333" stroke-width="2"/>
                  <ellipse cx="52" cy="38" rx="8" ry="5" fill="rgba(0,0,0,0.3)"/>
                  
                  <!-- Rider body -->
                  <ellipse cx="52" cy="50" rx="8" ry="12" fill="#E8E8E8"/>
                  
                  <!-- Delivery box -->
                  <rect x="28" y="48" width="18" height="18" rx="2" fill="#FFD700" stroke="#333" stroke-width="2"/>
                  <path d="M 28 57 L 46 57" stroke="#333" stroke-width="1"/>
                  <path d="M 37 48 L 37 66" stroke="#333" stroke-width="1"/>
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

      if (showRoute) {
        if (routeLine) map.removeLayer(routeLine);
        routeLine = L.polyline([driverPos, customerPos], {
          color: '#FFD700',
          weight: 6,
          opacity: 0.9,
          smoothFactor: 1,
          dashArray: '10, 10',
          dashOffset: '0'
        }).addTo(map);
        const bounds = L.latLngBounds([driverPos, customerPos]);
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
      } else {
        if (routeLine) {
          map.removeLayer(routeLine);
          routeLine = null;
        }
        const bounds = L.latLngBounds([driverPos, customerPos]);
        map.fitBounds(bounds, { padding: [100, 100], maxZoom: 14 });
      }
    }
    
    window.addEventListener('message', function(event) {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.type === 'updateDriver') {
          updateDriverLocation(data.lat, data.lng, data.heading);
        }
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    });
    
    document.addEventListener('message', function(event) {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.type === 'updateDriver') {
          updateDriverLocation(data.lat, data.lng, data.heading);
        }
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    });
    
    updateDriverLocation(${driverLocation.lat}, ${driverLocation.lng}, ${heading});
  </script>
</body>
</html>
  `;

  const estimatedMinutes = locationData?.distance ? Math.ceil(locationData.distance * 3) : "5-8";
  const horizontalPadding = isSmallDevice ? 16 : isTablet ? 40 : 24;
  const verticalPadding = isSmallDevice ? 32 : isTablet ? 40 : 36;

  // NEW: Pending status screen
  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
        <ScrollView contentContainerStyle={{ 
          paddingTop: insets.top + verticalPadding, 
          paddingBottom: insets.bottom + verticalPadding,
          paddingHorizontal: horizontalPadding,
        }}>
          <View style={StyleSheet.flatten([styles.confirmationContainer, { maxWidth: isTablet ? 600 : '100%', alignSelf: 'center', width: '100%' }])}>
            <PendingAnimation />
          </View>
          
          <Card style={StyleSheet.flatten([styles.infoCard, { maxWidth: isTablet ? 600 : '100%', alignSelf: 'center', width: '100%' }])}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Order #{order.orderNumber || order.id.slice(0, 8)}
              </ThemedText>
            </View>
            
            <View style={styles.timeline}>
              <TimelineItem icon="clock" iconColor={theme.warning} title="Pending" subtitle="Awaiting confirmation..." isActive showSpinner theme={theme} />
              <TimelineConnector color={theme.border} />
              <TimelineItem icon="loader" iconColor={theme.border} title="Picking" subtitle="Not started" theme={theme} />
              <TimelineConnector color={theme.border} />
              <TimelineItem icon="package" iconColor={theme.border} title="Packed" subtitle="Not started" theme={theme} />
              <TimelineConnector color={theme.border} />
              <TimelineItem icon="truck" iconColor={theme.border} title="Delivering" subtitle="Not started" theme={theme} />
            </View>
          </Card>
        </ScrollView>
      </View>
    );
  }

  if (isConfirmed) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
        <ScrollView contentContainerStyle={{ 
          paddingTop: insets.top + verticalPadding, 
          paddingBottom: insets.bottom + verticalPadding,
          paddingHorizontal: horizontalPadding,
        }}>
          <View style={StyleSheet.flatten([styles.confirmationContainer, { maxWidth: isTablet ? 600 : '100%', alignSelf: 'center', width: '100%' }])}>
            <View style={[styles.successCircle, { 
              backgroundColor: theme.success + '20', 
              borderColor: theme.success,
              width: isSmallDevice ? 100 : isTablet ? 140 : 120,
              height: isSmallDevice ? 100 : isTablet ? 140 : 120,
            }]}>
              <Feather name="check-circle" size={isSmallDevice ? 50 : isTablet ? 70 : 60} color={theme.success} />
            </View>
            
            <ThemedText type="h2" style={[styles.centerText, { marginTop: isTablet ? 32 : isSmallDevice ? 20 : 24, fontSize: isSmallDevice ? 22 : undefined }]}>
              Order Confirmed!
            </ThemedText>
            <ThemedText type="body" style={[styles.centerText, { color: theme.textSecondary, marginTop: 12, fontSize: isSmallDevice ? 14 : undefined }]}>
              We've received your order and will start picking soon...
            </ThemedText>
          </View>
          
          <Card style={StyleSheet.flatten([styles.infoCard, { maxWidth: isTablet ? 600 : '100%', alignSelf: 'center', width: '100%' }])}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Order #{order.orderNumber || order.id.slice(0, 8)}
              </ThemedText>
            </View>
            
            <View style={styles.timeline}>
              <TimelineItem icon="check" iconColor={theme.success} title="Confirmed" subtitle="Order received" isCompleted theme={theme} />
              <TimelineConnector color={theme.border} />
              <TimelineItem icon="loader" iconColor={theme.border} title="Picking" subtitle="Pending..." theme={theme} />
              <TimelineConnector color={theme.border} />
              <TimelineItem icon="package" iconColor={theme.border} title="Packed" subtitle="Pending..." theme={theme} />
              <TimelineConnector color={theme.border} />
              <TimelineItem icon="truck" iconColor={theme.border} title="Delivering" subtitle="Pending..." theme={theme} />
            </View>
          </Card>
        </ScrollView>
      </View>
    );
  }

  if (isPicking) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
        <ScrollView contentContainerStyle={{ 
          paddingTop: insets.top + verticalPadding, 
          paddingBottom: insets.bottom + verticalPadding,
          paddingHorizontal: horizontalPadding,
        }}>
          <View style={{ maxWidth: isTablet ? 700 : '100%', alignSelf: 'center', width: '100%' }}>
            <PickingAnimation />
            
            <Card style={styles.infoCard}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Order #{order.orderNumber || order.id.slice(0, 8)}
                </ThemedText>
              </View>
              
              <View style={styles.timeline}>
                <TimelineItem icon="check" iconColor={theme.success} title="Confirmed" subtitle="Completed" isCompleted theme={theme} />
                <TimelineConnector color={theme.success} />
                <TimelineItem icon="check" iconColor={theme.success} title="Picked" subtitle="Completed" isCompleted theme={theme} />
                <TimelineConnector color={theme.primary} />
                <TimelineItem icon="package" iconColor={theme.primary} title="Packing" subtitle="In progress..." isActive showSpinner theme={theme} />
                <TimelineConnector color={theme.border} />
                <TimelineItem icon="truck" iconColor={theme.border} title="Delivering" subtitle="Pending..." theme={theme} />
              </View>
            </Card>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (isPacked) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
        <View style={{ height: isTablet ? '60%' : '50%' }}>
          <WebView
            ref={webViewRef}
            source={{ html: mapHTML }}
            style={{ flex: 1 }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.mapLoadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            )}
          />
        </View>

        <ScrollView
          style={[styles.bottomPanel, { backgroundColor: theme.backgroundDefault }]}
          contentContainerStyle={{ 
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: horizontalPadding,
          }}
        >
          <View style={{ maxWidth: isTablet ? 800 : '100%', alignSelf: 'center', width: '100%' }}>
            <WaitingForDriver />
            
            <Card style={StyleSheet.flatten([styles.infoCard, { marginTop: 24 }])}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Order #{order.orderNumber || order.id.slice(0, 8)}
                </ThemedText>
              </View>
              
              <View style={styles.timeline}>
                <TimelineItem icon="check" iconColor={theme.success} title="Confirmed" subtitle="Completed" isCompleted theme={theme} />
                <TimelineConnector color={theme.success} />
                <TimelineItem icon="check" iconColor={theme.success} title="Picked" subtitle="Completed" isCompleted theme={theme} />
                <TimelineConnector color={theme.success} />
                <TimelineItem icon="check" iconColor={theme.success} title="Packed" subtitle="Ready for pickup" isCompleted theme={theme} />
                <TimelineConnector color={theme.warning} />
                <TimelineItem icon="truck" iconColor={theme.warning} title="Waiting Pickup" subtitle="Driver confirming..." isActive showSpinner theme={theme} />
              </View>
            </Card>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <View style={{ height: isTablet ? '60%' : '50%' }}>
        <WebView
          ref={webViewRef}
          source={{ html: mapHTML }}
          style={{ flex: 1 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.mapLoadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          )}
        />
        
        {isDelivering && locationData?.hasLocation && (
          <View style={[styles.badge, { 
            left: isTablet ? 24 : 16, 
            bottom: isTablet ? 24 : 16,
            backgroundColor: 'white' 
          }]}>
            <Feather name="navigation" size={14} color="#10b981" />
            <ThemedText type="small" style={{ fontWeight: '600', color: '#065f46' }}>
              GPS: ±{locationData.location.accuracy?.toFixed(0) || 12}m
            </ThemedText>
          </View>
        )}
        
        {isDelivering && locationData?.distance && (
          <View style={[styles.badge, { 
            right: isTablet ? 24 : 16, 
            bottom: isTablet ? 24 : 16,
            backgroundColor: 'white' 
          }]}>
            <Feather name="navigation" size={14} color="#1E88E5" />
            <ThemedText type="small" style={{ fontWeight: '600', color: '#1E88E5' }}>
              {locationData.distance.toFixed(1)} km
            </ThemedText>
          </View>
        )}
      </View>

      <ScrollView
        style={[styles.bottomPanel, { backgroundColor: theme.backgroundDefault }]}
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: horizontalPadding,
        }}
      >
        <View style={{ maxWidth: isTablet ? 800 : '100%', alignSelf: 'center', width: '100%' }}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            {isDelivering && (
              <View style={[styles.etaBadge, { backgroundColor: theme.primary + '15' }]}>
                <Feather name="clock" size={16} color={theme.primary} />
                <ThemedText type="body" style={{ fontWeight: '600', color: theme.primary }}>
                  {estimatedMinutes} min
                </ThemedText>
              </View>
            )}
            <ThemedText type="h2" style={{ marginTop: 12, marginBottom: 8, textAlign: 'center', fontSize: isSmallDevice ? 20 : undefined }}>
              {isDelivered ? "Order Delivered!" : "Driver is on the way"}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Order #{order.orderNumber || order.id.slice(0, 8)}
            </ThemedText>
          </View>

          <View style={[styles.progressContainer, { 
            flexWrap: isSmallDevice ? 'wrap' : 'nowrap',
            justifyContent: isSmallDevice ? 'space-around' : 'center',
          }]}>
            <ProgressStep icon="check" label="Confirmed" isCompleted theme={theme} />
            {!isSmallDevice && <ProgressLine color={theme.success} />}
            <ProgressStep icon="check" label="Packed" isCompleted theme={theme} />
            {!isSmallDevice && <ProgressLine color={isDelivered ? theme.success : theme.primary} />}
            <ProgressStep 
              icon={isDelivered ? "check" : "truck"} 
              label={isDelivered ? "Picked Up" : "On Route"} 
              isCompleted={isDelivered} 
              isActive={!isDelivered} 
              theme={theme} 
            />
            {!isSmallDevice && <ProgressLine color={isDelivered ? theme.success : theme.border} />}
            <ProgressStep 
              icon={isDelivered ? "check" : "home"} 
              label="Delivered" 
              isCompleted={isDelivered} 
              theme={theme} 
            />
          </View>

          {showDriverContact && (
            <Card style={StyleSheet.flatten([{ marginBottom: 16, padding: 16 }])}>
              <View style={{ 
                flexDirection: isSmallDevice ? 'column' : 'row', 
                alignItems: 'center', 
                gap: 16 
              }}>
                <View style={[styles.driverAvatar, { backgroundColor: theme.primary }]}>
                  <ThemedText style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                    {order.driverName?.[0]?.toUpperCase() || 'D'}
                  </ThemedText>
                </View>
                
                <View style={{ flex: 1, alignItems: isSmallDevice ? 'center' : 'flex-start' }}>
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

          {(isDelivering || isDelivered) && order.deliveryPin && (
            <Card style={styles.pinCard}>
              <View style={{ 
                backgroundColor: theme.success + '10',
                borderColor: isDelivered ? theme.success : theme.warning,
                borderWidth: 2,
                borderRadius: 16,
                padding: isTablet ? 32 : isSmallDevice ? 20 : 24,
                alignItems: 'center'
              }}>
                <Feather name="shield" size={isTablet ? 32 : isSmallDevice ? 20 : 24} color={isDelivered ? theme.success : theme.warning} />
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 8, textAlign: 'center', fontSize: isSmallDevice ? 11 : undefined }}>
                  {isDelivered ? "Delivery Confirmed" : "Delivery PIN Code"}
                </ThemedText>
                <ThemedText style={{ 
                  fontSize: isSmallDevice ? 28 : isTablet ? 48 : 36, 
                  fontWeight: 'bold', 
                  color: isDelivered ? theme.success : theme.warning,
                  letterSpacing: isSmallDevice ? 6 : isTablet ? 12 : 8,
                  marginVertical: 8 
                }}>
                  {order.deliveryPin}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center', maxWidth: 300, fontSize: isSmallDevice ? 12 : undefined }}>
                  {isDelivered 
                    ? "This code was used to confirm delivery"
                    : "Share this code with the driver upon arrival"}
                </ThemedText>
              </View>
            </Card>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function TimelineItem({ icon, iconColor, title, subtitle, isCompleted, isActive, showSpinner, theme }: any) {
  return (
    <View style={styles.timelineItem}>
      <View style={[styles.timelineDot, { backgroundColor: iconColor }]}>
        {showSpinner ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Feather name={icon as any} size={12} color="white" />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText type="body" style={{ 
          fontWeight: isActive || isCompleted ? '600' : '400',
          color: isActive ? iconColor : (isCompleted ? theme.text : theme.textSecondary),
          fontSize: isSmallDevice ? 14 : undefined
        }}>
          {title}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, fontSize: isSmallDevice ? 11 : undefined }}>{subtitle}</ThemedText>
      </View>
    </View>
  );
}

function TimelineConnector({ color }: { color: string }) {
  return <View style={[styles.timelineConnector, { backgroundColor: color }]} />;
}

function ProgressStep({ icon, label, isCompleted, isActive, theme }: any) {
  const color = isCompleted ? theme.success : isActive ? theme.primary : theme.border;
  
  return (
    <View style={styles.progressStep}>
      <View style={[styles.stepCircle, { backgroundColor: color }]}>
        <Feather name={icon as any} size={14} color="white" />
      </View>
      <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 4, fontSize: isSmallDevice ? 11 : undefined }}>
        {label}
      </ThemedText>
    </View>
  );
}

function ProgressLine({ color }: { color: string }) {
  return <View style={[styles.progressLine, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 24,
  },
  
  mapLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  
  centerText: {
    textAlign: 'center',
  },
  
  confirmationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: isTablet ? 60 : isSmallDevice ? 32 : 40,
  },
  successCircle: {
    borderRadius: 1000,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // NEW: Pending styles
  pendingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: isTablet ? 60 : isSmallDevice ? 32 : 40,
  },
  pendingCircle: {
    borderRadius: 1000,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  pickingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: isTablet ? 60 : isSmallDevice ? 32 : 40,
  },
  pickingScene: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  warehouse: {
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: isSmallDevice ? 12 : 16,
  },
  shelfRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  box: {
    borderRadius: 4,
  },
  pickerIcon: {
    position: 'absolute',
  },
  pickerCircle: {
    borderRadius: 1000,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    padding: isSmallDevice ? 8 : 12,
  },
  cart: {
    padding: 6,
    borderRadius: 8,
  },
  
  packingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: isTablet ? 60 : isSmallDevice ? 32 : 40,
  },
  packingBox: {
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
  
  waitingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: isTablet ? 60 : isSmallDevice ? 32 : 40,
  },
  driverWaitCircle: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  infoCard: {
    margin: isSmallDevice ? 16 : 24,
    padding: isSmallDevice ? 16 : 20,
  },
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
  
  badge: {
    position: 'absolute',
    borderRadius: 20,
    padding: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomPanel: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: 24,
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
    marginBottom: 24,
    paddingHorizontal: isSmallDevice ? 0 : 16,
  },
  progressStep: {
    alignItems: 'center',
    minWidth: isSmallDevice ? 70 : 80,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressLine: {
    width: isSmallDevice ? 40 : isTablet ? 80 : 64,
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
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
});