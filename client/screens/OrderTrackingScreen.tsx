// app/screens/OrderTrackingScreen.tsx
// Real GPS map with live driver tracking - Draggable Bottom Sheet

import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Animated, Dimensions, PanResponder, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from 'expo-location';

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { CallButton } from "@/components/CallButton";

type OrderTrackingRouteProp = RouteProp<RootStackParamList, "OrderTracking">;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_MIN = 120;
const BOTTOM_SHEET_MID = 340;
const BOTTOM_SHEET_MAX = SCREEN_HEIGHT * 0.8;

export default function OrderTrackingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const route = useRoute<OrderTrackingRouteProp>();
  const { orderId } = route.params;
  
  const mapRef = useRef<MapView>(null);
  const [customerLocation, setCustomerLocation] = useState<any>(null);
  const [sheetPosition, setSheetPosition] = useState<'min' | 'mid' | 'max'>('mid');
  
  const sheetHeight = useRef(new Animated.Value(BOTTOM_SHEET_MID)).current;
  const panY = useRef(new Animated.Value(0)).current;

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

  // Pan responder for drag gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 200 && gestureState.dy > -200) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentHeight = sheetPosition === 'min' ? BOTTOM_SHEET_MIN : 
                             sheetPosition === 'mid' ? BOTTOM_SHEET_MID : 
                             BOTTOM_SHEET_MAX;
        
        let targetHeight = currentHeight;
        let targetPosition: 'min' | 'mid' | 'max' = sheetPosition;

        if (gestureState.dy < -80) {
          // Swipe up
          if (sheetPosition === 'min') {
            targetHeight = BOTTOM_SHEET_MID;
            targetPosition = 'mid';
          } else if (sheetPosition === 'mid') {
            targetHeight = BOTTOM_SHEET_MAX;
            targetPosition = 'max';
          }
        } else if (gestureState.dy > 80) {
          // Swipe down
          if (sheetPosition === 'max') {
            targetHeight = BOTTOM_SHEET_MID;
            targetPosition = 'mid';
          } else if (sheetPosition === 'mid') {
            targetHeight = BOTTOM_SHEET_MIN;
            targetPosition = 'min';
          }
        }

        panY.setValue(0);
        Animated.spring(sheetHeight, {
          toValue: targetHeight,
          tension: 50,
          friction: 10,
          useNativeDriver: false,
        }).start();
        setSheetPosition(targetPosition);
      },
    })
  ).current;

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
      
      const currentSheetHeight = sheetPosition === 'min' ? BOTTOM_SHEET_MIN : 
                                 sheetPosition === 'mid' ? BOTTOM_SHEET_MID : 
                                 BOTTOM_SHEET_MAX;
      
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: currentSheetHeight + 100, left: 50 },
        animated: true,
      });
    }
  }, [driverData?.location, customerLocation, sheetPosition]);

  if (orderLoading || !order) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color="#10b981" />
        <ThemedText style={{ marginTop: 10, color: theme.textSecondary }}>Loading order...</ThemedText>
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

        {/* Driver Location Marker */}
        {driverCoords && (
          <Marker
            coordinate={driverCoords}
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={driverData.location.heading || 0}
            flat={true}
          >
            <View style={styles.driverMarkerWrapper}>
              {driverData.location.speed > 0.5 && (
                <View style={styles.driverPulseMoving} />
              )}
              
              <View style={[
                styles.bikeContainer,
                driverData.location.speed < 0.5 && styles.bikeContainerStopped
              ]}>
                <View style={styles.bikeIcon}>
                  <View style={styles.bikeBody}>
                    <View style={styles.handleBars} />
                    <View style={styles.bikeSeat} />
                    <View style={styles.wheelLeft} />
                    <View style={styles.wheelRight} />
                  </View>
                  
                  <View style={styles.rider}>
                    <View style={styles.riderHead} />
                    <View style={styles.riderBody} />
                  </View>
                </View>
                
                <View style={[
                  styles.driverStatusBadge,
                  { backgroundColor: driverData.location.speed > 0.5 ? '#10b981' : '#f59e0b' }
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
            strokeColor="#10b981"
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
          <Feather name="clock" size={16} color="#10b981" />
          <ThemedText style={styles.etaText}>{getTimeEstimate()}</ThemedText>
        </View>
      </View>

      {/* Distance Badge */}
      {driverData?.distance && (
        <View style={[styles.distanceBadge, { top: insets.top + 70 }]}>
          <Feather name="navigation" size={14} color="#10b981" />
          <ThemedText style={styles.distanceText}>
            {driverData.distance.toFixed(1)} km away
          </ThemedText>
        </View>
      )}

      {/* Recenter Button */}
      <Pressable
        style={[styles.recenterButton, { 
          bottom: (sheetPosition === 'min' ? BOTTOM_SHEET_MIN : 
                  sheetPosition === 'mid' ? BOTTOM_SHEET_MID : 
                  BOTTOM_SHEET_MAX) + 20 
        }]}
        onPress={() => {
          if (mapRef.current && driverCoords && customerLocation) {
            const currentSheetHeight = sheetPosition === 'min' ? BOTTOM_SHEET_MIN : 
                                       sheetPosition === 'mid' ? BOTTOM_SHEET_MID : 
                                       BOTTOM_SHEET_MAX;
            mapRef.current.fitToCoordinates([driverCoords, customerLocation], {
              edgePadding: { top: 100, right: 50, bottom: currentSheetHeight + 100, left: 50 },
              animated: true,
            });
          }
        }}
      >
        <Feather name="crosshair" size={20} color="#000" />
      </Pressable>

      {/* Draggable Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            height: Animated.add(
              sheetHeight,
              panY.interpolate({
                inputRange: [-SCREEN_HEIGHT, SCREEN_HEIGHT],
                outputRange: [SCREEN_HEIGHT, -SCREEN_HEIGHT],
                extrapolate: 'clamp',
              })
            ),
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        {/* Drag Handle */}
        <View style={styles.sheetHandle} {...panResponder.panHandlers}>
          <View style={styles.handle} />
        </View>

        <ScrollView 
          style={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={sheetPosition === 'max'}
          bounces={false}
        >
          {/* Status Row - Always Visible */}
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.statusTitle}>
                {getStatusText()}
              </ThemedText>
              <ThemedText style={styles.orderNumber}>
                Order #{order.orderNumber}
              </ThemedText>
            </View>
          </View>

          {/* Mid & Max Content */}
          {sheetPosition !== 'min' && (
            <>
              {/* Driver Info Card */}
              {showDriverInfo && (
                <View style={styles.driverCard}>
                  <View style={styles.driverInfo}>
                    <View style={styles.driverAvatar}>
                      <ThemedText style={styles.avatarText}>
                        {order.driverName?.charAt(0).toUpperCase() || "D"}
                      </ThemedText>
                    </View>
                    
                    <View style={styles.driverDetails}>
                      <ThemedText style={styles.driverName}>
                        {order.driverName || "Driver"}
                      </ThemedText>
                      <ThemedText style={styles.driverRole}>
                        Delivery Partner
                      </ThemedText>
                      
                      {driverData?.location?.speed > 0.5 ? (
                        <View style={styles.speedBadge}>
                          <Feather name="zap" size={10} color="#10b981" />
                          <ThemedText style={styles.speedText}>
                            {Math.round(driverData.location.speed * 3.6)} km/h
                          </ThemedText>
                        </View>
                      ) : (
                        <View style={[styles.speedBadge, styles.stoppedBadge]}>
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
                        style={styles.actionButton}
                      >
                        <Feather name="message-circle" size={20} color="#111827" />
                      </Pressable>
                      {order.driverPhone && (
                        <CallButton phoneNumber={order.driverPhone} />
                      )}
                    </View>
                  </View>
                </View>
              )}

              {/* Delivery PIN */}
              <View style={styles.pinContainer}>
                <ThemedText style={styles.pinLabel}>
                  Share PIN with driver upon arrival
                </ThemedText>
                <View style={styles.pinBox}>
                  <ThemedText style={styles.pinText}>
                    {order.deliveryPin}
                  </ThemedText>
                </View>
              </View>

              {/* Timeline - Only in Max */}
              {sheetPosition === 'max' && (
                <View style={styles.timeline}>
                  <View style={styles.timelineItem}>
                    <View style={[styles.timelineIcon, styles.timelineIconActive]}>
                      <Feather name="check" size={12} color="#fff" />
                    </View>
                    <View style={styles.timelineContent}>
                      <ThemedText style={styles.timelineTitle}>Order Confirmed</ThemedText>
                      <ThemedText style={styles.timelineSubtitle}>
                        Being prepared at store
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.timelineLine} />

                  <View style={styles.timelineItem}>
                    <View style={[
                      styles.timelineIcon,
                      (order.status === "delivering" || order.status === "delivered") 
                        ? styles.timelineIconActive 
                        : styles.timelineIconInactive
                    ]}>
                      {(order.status === "delivering" || order.status === "delivered") && (
                        <Feather name="check" size={12} color="#fff" />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <ThemedText style={styles.timelineTitle}>Out for Delivery</ThemedText>
                      <ThemedText style={styles.timelineSubtitle}>
                        Driver on the way
                      </ThemedText>
                    </View>
                  </View>

                  <View style={[
                    styles.timelineLine,
                    order.status !== "delivered" && styles.timelineLineInactive
                  ]} />

                  <View style={styles.timelineItem}>
                    <View style={[
                      styles.timelineIcon,
                      order.status === "delivered" 
                        ? styles.timelineIconActive 
                        : styles.timelineIconInactive
                    ]}>
                      {order.status === "delivered" && (
                        <Feather name="check" size={12} color="#fff" />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <ThemedText style={styles.timelineTitle}>Delivered</ThemedText>
                      <ThemedText style={styles.timelineSubtitle}>
                        Order completed
                      </ThemedText>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  map: { flex: 1 },
  
  // Top Bar
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
  etaText: { fontSize: 15, fontWeight: '700', color: '#10b981' },
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
  
  // Map Markers
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
    backgroundColor: '#10b981',
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
    backgroundColor: '#10b98120',
  },
  bikeContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#10b981',
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
    backgroundColor: '#10b981',
  },
  riderBody: {
    width: 6,
    height: 10,
    backgroundColor: '#10b981',
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
  
  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  sheetHandle: { 
    alignItems: 'center', 
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: -20,
  },
  handle: { 
    width: 40, 
    height: 5, 
    borderRadius: 3,
    backgroundColor: '#d1d5db',
  },
  sheetContent: { flex: 1 },
  
  // Status
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
    backgroundColor: '#10b981' 
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  orderNumber: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
    fontWeight: '500',
  },
  
  // Driver Card
  driverCard: { 
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16, 
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  driverInfo: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  driverAvatar: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: '#10b981',
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  driverDetails: { 
    flex: 1, 
    marginLeft: 14 
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  driverRole: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 2,
  },
  speedBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    marginTop: 6,
    backgroundColor: '#d1fae5',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stoppedBadge: {
    backgroundColor: '#fef3c7',
  },
  speedText: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: '#065f46' 
  },
  driverActions: { 
    flexDirection: 'row', 
    gap: 10 
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  
  // PIN
  pinContainer: { 
    alignItems: 'center', 
    marginBottom: 24,
    paddingVertical: 16,
  },
  pinLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
    fontWeight: '600',
  },
  pinBox: {
    backgroundColor: '#ecfdf5',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  pinText: {fontSize: 32,
fontWeight: '800',
letterSpacing: 12,
color: '#10b981',
},
// Timeline
timeline: {
marginTop: 8,
paddingBottom: 20
},
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
timelineIconActive: {
backgroundColor: '#10b981',
},
timelineIconInactive: {
backgroundColor: '#e5e7eb',
},
timelineContent: {
flex: 1,
paddingBottom: 16
},
timelineTitle: {
fontSize: 14,
fontWeight: '700',
color: '#111827',
},
timelineSubtitle: {
fontSize: 12,
color: '#6b7280',
marginTop: 2,
fontWeight: '500',
},
timelineLine: {
width: 2,
height: 24,
marginLeft: 13,
marginVertical: 4,
backgroundColor: '#10b981',
},
timelineLineInactive: {
backgroundColor: '#e5e7eb',
},
});