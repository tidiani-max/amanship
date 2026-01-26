// app/screens/OrderTrackingScreen.tsx
// Real GPS map with live driver tracking

import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Animated, Dimensions, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from 'expo-location';

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { CallButton } from "@/components/CallButton";

type OrderTrackingRouteProp = RouteProp<RootStackParamList, "OrderTracking">;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_MIN = 160;
const BOTTOM_SHEET_MAX = 420;

export default function OrderTrackingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const route = useRoute<OrderTrackingRouteProp>();
  const { orderId } = route.params;
  
  const mapRef = useRef<MapView>(null);
  const [customerLocation, setCustomerLocation] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Bottom sheet animation
  const sheetHeight = useRef(new Animated.Value(BOTTOM_SHEET_MIN)).current;

  // Get customer's current location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      
      const location = await Location.getCurrentPositionAsync({});
      setCustomerLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  // Fetch order details
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: async () => {
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/orders/${orderId}`);
      if (!response.ok) throw new Error("Order not found");
      return response.json();
    },
    refetchInterval: 5000,
  });

  // Fetch driver location (real-time)
  const { data: driverData } = useQuery({
    queryKey: ["driver-location", orderId],
    queryFn: async () => {
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/driver/location/${orderId}`);
      return response.json();
    },
    refetchInterval: 3000,
    enabled: order?.status === "delivering",
  });

  // Auto-zoom to fit both markers
  useEffect(() => {
    if (mapRef.current && driverData?.location && customerLocation) {
      const coordinates = [
        {
          latitude: parseFloat(driverData.location.latitude),
          longitude: parseFloat(driverData.location.longitude),
        },
        customerLocation,
      ];
      
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: BOTTOM_SHEET_MIN + 100, left: 50 },
        animated: true,
      });
    }
  }, [driverData?.location, customerLocation]);

  const toggleSheet = () => {
    const targetHeight = isExpanded ? BOTTOM_SHEET_MIN : BOTTOM_SHEET_MAX;
    Animated.spring(sheetHeight, {
      toValue: targetHeight,
      tension: 50,
      friction: 10,
      useNativeDriver: false,
    }).start();
    setIsExpanded(!isExpanded);
  };

  if (orderLoading || !order) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color="#00d47e" />
        <ThemedText style={{ marginTop: 10 }}>Loading order...</ThemedText>
      </View>
    );
  }

  const getTimeEstimate = () => {
    if (driverData?.estimatedArrival) {
      const eta = new Date(driverData.estimatedArrival);
      const now = new Date();
      const diff = Math.ceil((eta.getTime() - now.getTime()) / 60000);
      return diff > 0 ? `${diff} min` : "Arriving now";
    }
    return "15 min";
  };

  const getStatusText = () => {
    const s = order.status;
    if (s === "pending" || s === "picking") return "Preparing your order";
    if (s === "packed") return "Ready for pickup";
    if (s === "delivering") return "Driver is on the way";
    if (s === "delivered") return "Order delivered!";
    return "Processing";
  };

  const hasDriverLocation = driverData?.hasLocation && driverData.location;
  const showDriverInfo = order.status === "delivering" && order.driverId;

  const driverCoords = hasDriverLocation ? {
    latitude: parseFloat(driverData.location.latitude),
    longitude: parseFloat(driverData.location.longitude),
  } : null;

  return (
    <View style={styles.container}>
      {/* Real Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={customerLocation ? {
          latitude: customerLocation.latitude,
          longitude: customerLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        } : undefined}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        loadingEnabled={true}
      >
        {/* Customer Location Marker */}
        {customerLocation && (
          <Marker
            coordinate={customerLocation}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.customerMarker}>
              <View style={styles.customerMarkerInner}>
                <Feather name="home" size={16} color="#fff" />
              </View>
            </View>
          </Marker>
        )}

        {/* Driver Location Marker (animated bike) */}
        {driverCoords && (
          <Marker
            coordinate={driverCoords}
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={driverData.location.heading || 0}
            flat={true}
          >
            <View style={styles.driverMarkerWrapper}>
              {/* Pulse effect (only when moving) */}
              {driverData.location.speed > 0.5 && (
                <View style={styles.driverPulseMoving} />
              )}
              
              {/* Bike Icon Container */}
              <View style={[
                styles.bikeContainer,
                driverData.location.speed < 0.5 && styles.bikeContainerStopped
              ]}>
                {/* Custom Bike Icon */}
                <View style={styles.bikeIcon}>
                  {/* Bike Body */}
                  <View style={styles.bikeBody}>
                    {/* Handle bars */}
                    <View style={styles.handleBars} />
                    {/* Seat */}
                    <View style={styles.bikeSeat} />
                    {/* Wheels */}
                    <View style={styles.wheelLeft} />
                    <View style={styles.wheelRight} />
                  </View>
                  
                  {/* Driver/Rider */}
                  <View style={styles.rider}>
                    <View style={styles.riderHead} />
                    <View style={styles.riderBody} />
                  </View>
                </View>
                
                {/* Status Badge */}
                <View style={[
                  styles.driverStatusBadge,
                  { backgroundColor: driverData.location.speed > 0.5 ? '#00d47e' : '#f59e0b' }
                ]}>
                  <Feather 
                    name={driverData.location.speed > 0.5 ? "navigation" : "pause"} 
                    size={8} 
                    color="#fff" 
                  />
                </View>
              </View>
            </View>
          </Marker>
        )}

        {/* Route Line */}
        {driverCoords && customerLocation && (
          <Polyline
            coordinates={[driverCoords, customerLocation]}
            strokeColor="#00d47e"
            strokeWidth={4}
            lineDashPattern={[10, 5]}
          />
        )}
      </MapView>

      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#000" />
        </Pressable>
        
        <View style={styles.etaBadge}>
          <Feather name="clock" size={16} color="#00d47e" />
          <ThemedText style={styles.etaText}>{getTimeEstimate()}</ThemedText>
        </View>
      </View>

      {/* Distance Badge */}
      {driverData?.distance && (
        <View style={[styles.distanceBadge, { top: insets.top + 70 }]}>
          <Feather name="navigation" size={14} color="#00d47e" />
          <ThemedText style={styles.distanceText}>
            {driverData.distance.toFixed(1)} km away
          </ThemedText>
        </View>
      )}

      {/* Recenter Button */}
      <Pressable
        style={[styles.recenterButton, { bottom: BOTTOM_SHEET_MIN + 20 }]}
        onPress={() => {
          if (mapRef.current && driverCoords && customerLocation) {
            mapRef.current.fitToCoordinates([driverCoords, customerLocation], {
              edgePadding: { top: 100, right: 50, bottom: BOTTOM_SHEET_MIN + 100, left: 50 },
              animated: true,
            });
          }
        }}
      >
        <Feather name="crosshair" size={20} color="#000" />
      </Pressable>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            height: sheetHeight,
            paddingBottom: insets.bottom + 16,
            backgroundColor: theme.backgroundDefault,
          },
        ]}
      >
        <Pressable style={styles.sheetHandle} onPress={toggleSheet}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
        </Pressable>

        <ScrollView 
          style={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={isExpanded}
        >
          {/* Status */}
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <View style={{ flex: 1 }}>
              <ThemedText type="h3" style={{ fontSize: 18, fontWeight: '700' }}>
                {getStatusText()}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                Order #{order.orderNumber}
              </ThemedText>
            </View>
          </View>

          {/* Driver Info */}
          {showDriverInfo && (
            <Card style={styles.driverCard}>
              <View style={styles.driverInfo}>
                <View style={styles.driverAvatar}>
                  <ThemedText style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>
                    {order.driverName?.charAt(0).toUpperCase() || "D"}
                  </ThemedText>
                </View>
                <View style={styles.driverDetails}>
                  <ThemedText style={{ fontSize: 16, fontWeight: '600' }}>
                    {order.driverName || "Driver"}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    Delivery Partner
                  </ThemedText>
                  {driverData?.location?.speed > 0 && (
                    <View style={styles.speedBadge}>
                      <Feather name="zap" size={10} color="#00d47e" />
                      <ThemedText style={styles.speedText}>
                        {Math.round(driverData.location.speed * 3.6)} km/h
                      </ThemedText>
                    </View>
                  )}
                  {driverData?.location?.speed <= 0.5 && (
                    <View style={[styles.speedBadge, { backgroundColor: '#fef3c7' }]}>
                      <Feather name="pause" size={10} color="#f59e0b" />
                      <ThemedText style={[styles.speedText, { color: '#f59e0b' }]}>
                        Stopped
                      </ThemedText>
                    </View>
                  )}
                </View>
                <View style={styles.driverActions}>
                  <Pressable
                    onPress={() => navigation.navigate("Chat", { orderId: order.id })}
                    style={[styles.actionButton, { backgroundColor: theme.backgroundRoot }]}
                  >
                    <Feather name="message-circle" size={20} color={theme.text} />
                  </Pressable>
                  {order.driverPhone && <CallButton phoneNumber={order.driverPhone} />}
                </View>
              </View>
            </Card>
          )}

          {/* Delivery PIN */}
          <View style={styles.pinContainer}>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: 8 }}>
              Share PIN with driver upon arrival
            </ThemedText>
            <View style={styles.pinBox}>
              <ThemedText style={styles.pinText}>
                {order.deliveryPin}
              </ThemedText>
            </View>
          </View>

          {/* Progress Timeline */}
          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineIcon, { backgroundColor: '#00d47e' }]}>
                <Feather name="check" size={12} color="#fff" />
              </View>
              <View style={styles.timelineContent}>
                <ThemedText style={{ fontSize: 14, fontWeight: '600' }}>Order Confirmed</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Being prepared at store
                </ThemedText>
              </View>
            </View>

            <View style={[styles.timelineLine, { 
              backgroundColor: order.status !== "pending" ? '#00d47e' : '#e5e7eb' 
            }]} />

            <View style={styles.timelineItem}>
              <View style={[styles.timelineIcon, { 
                backgroundColor: order.status === "delivering" || order.status === "delivered" 
                  ? '#00d47e' : '#e5e7eb' 
              }]}>
                {(order.status === "delivering" || order.status === "delivered") && (
                  <Feather name="check" size={12} color="#fff" />
                )}
              </View>
              <View style={styles.timelineContent}>
                <ThemedText style={{ fontSize: 14, fontWeight: '600' }}>Out for Delivery</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Driver on the way
                </ThemedText>
              </View>
            </View>

            <View style={[styles.timelineLine, { 
              backgroundColor: order.status === "delivered" ? '#00d47e' : '#e5e7eb' 
            }]} />

            <View style={styles.timelineItem}>
              <View style={[styles.timelineIcon, { 
                backgroundColor: order.status === "delivered" ? '#00d47e' : '#e5e7eb' 
              }]}>
                {order.status === "delivered" && <Feather name="check" size={12} color="#fff" />}
              </View>
              <View style={styles.timelineContent}>
                <ThemedText style={{ fontSize: 14, fontWeight: '600' }}>Delivered</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Order completed
                </ThemedText>
              </View>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  map: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  etaText: { fontSize: 15, fontWeight: '700', color: '#00d47e' },
  distanceBadge: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  distanceText: { fontSize: 13, fontWeight: '600', color: '#065f46' },
  recenterButton: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  customerMarker: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerMarkerInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00d47e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  driverMarkerWrapper: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverPulseMoving: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00d47e20',
  },
  bikeContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#00d47e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    position: 'relative',
  },
  bikeContainerStopped: {
    borderColor: '#f59e0b',
  },
  bikeIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bikeBody: {
    width: 28,
    height: 20,
    position: 'relative',
  },
  handleBars: {
    position: 'absolute',
    top: 2,
    left: 10,
    width: 8,
    height: 2,
    backgroundColor: '#374151',
    borderRadius: 1,
  },
  bikeSeat: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 3,
    backgroundColor: '#374151',
    borderRadius: 2,
  },
  wheelLeft: {
    position: 'absolute',
    bottom: 0,
    left: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#374151',
  },
  wheelRight: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#374151',
  },
  rider: {
    position: 'absolute',
    top: -4,
    left: 14,
    alignItems: 'center',
  },
  riderHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00d47e',
  },
  riderBody: {
    width: 6,
    height: 10,
    backgroundColor: '#00d47e',
    borderRadius: 3,
    marginTop: 1,
  },
  driverStatusBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 16,
  },
  sheetHandle: { alignItems: 'center', paddingVertical: 8 },
  handle: { width: 40, height: 5, borderRadius: 3 },
  sheetContent: { flex: 1 },
  statusRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
    marginTop: 12,
    marginBottom: 20,
  },
  statusDot: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    backgroundColor: '#00d47e' 
  },
  driverCard: { 
    padding: 16, 
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  driverInfo: { flexDirection: 'row', alignItems: 'center' },
  driverAvatar: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: '#00d47e',
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  driverDetails: { flex: 1, marginLeft: 14 },
  speedBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    marginTop: 4 
  },
  speedText: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  driverActions: { flexDirection: 'row', gap: 10 },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  pinContainer: { 
    alignItems: 'center', 
    marginBottom: 24,
    paddingVertical: 16,
  },
  pinBox: {
    backgroundColor: '#ecfdf5',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#00d47e',
  },
  pinText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 12,
    color: '#00d47e',
  },
  timeline: { marginTop: 8, paddingBottom: 20 },
  timelineItem: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    gap: 14 
  },
  timelineIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineLine: { 
    width: 2, 
    height: 24, 
    marginLeft: 13, 
    marginVertical: 4 
  },
});