import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, Linking, Pressable, Image, Animated, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const BRAND_PURPLE = "#6338f2";
const MAP_UPDATE_INTERVAL = 2000; // 2 seconds
const DRIVER_ANIMATION_DURATION = 2000; // Smooth 2-second transitions

type OrderTrackingRouteProp = RouteProp<RootStackParamList, "OrderTracking">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function OrderTrackingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<OrderTrackingRouteProp>();
  const { orderId } = route.params;
  const mapRef = useRef<any>(null);

  // Fetch order data every 3 seconds
  const { data: order, isLoading } = useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/orders/${orderId}`);
      return res.json();
    },
    refetchInterval: 3000,
  });

  const getSimpleStatus = () => {
    const status = order?.status?.toLowerCase() || 'pending';
    if (status === 'pending' || status === 'confirmed') return 'pending';
    if (status === 'picking') return 'picking';
    if (status === 'packed') return 'packed';
    if (status === 'delivering' || status === 'delivered') return 'delivering';
    return 'pending';
  };

  const simpleStatus = getSimpleStatus();

  // Fetch driver location with faster updates
  const { data: driverData } = useQuery({
    queryKey: ["driver-location", orderId],
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/driver/location/${orderId}`);
      return res.json();
    },
    enabled: simpleStatus === 'delivering' && !!order?.driverId,
    refetchInterval: MAP_UPDATE_INTERVAL,
  });

  const orderNumber = order?.orderNumber || `#${order?.id?.slice(0, 8).toUpperCase() || 'PENDING'}`;
  const subtotal = order?.subtotal || 0;
  const deliveryFee = order?.deliveryFee || 10000;
  const total = order?.total || (subtotal + deliveryFee);
  
  const customerLat = order?.customerLat ? parseFloat(order.customerLat) : null;
  const customerLng = order?.customerLng ? parseFloat(order.customerLng) : null;
  const driverLat = driverData?.location?.latitude || null;
  const driverLng = driverData?.location?.longitude || null;
  const driverHeading = driverData?.location?.heading || 0;
  const driverSpeed = driverData?.location?.speed || 0;
  const distance = driverData?.distance || null;
  const eta = driverData?.estimatedArrival || null;

  const showMap = (simpleStatus === 'packed' || simpleStatus === 'delivering') && customerLat && customerLng;
  const showDriver = simpleStatus === 'delivering' && driverLat && driverLng;
  const searchingDriver = simpleStatus === 'packed' && !order?.driverId;

  if (isLoading && !order) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND_PURPLE} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* TOP: Map or Illustration */}
      <View style={{ height: '52%' }}>
        {showMap ? (
          Platform.OS === "web" ? (
            <WebMapView 
              customerLat={customerLat!}
              customerLng={customerLng!}
              driverLat={driverLat}
              driverLng={driverLng}
              searchingDriver={searchingDriver}
              showDriver={showDriver}
              distance={distance}
            />
          ) : (
            <NativeMapView
              mapRef={mapRef}
              customerLat={customerLat!}
              customerLng={customerLng!}
              driverLat={driverLat}
              driverLng={driverLng}
              driverHeading={driverHeading}
              driverSpeed={driverSpeed}
              searchingDriver={searchingDriver}
              showDriver={showDriver}
            />
          )
        ) : (
          <View style={styles.illustrationContainer}>
            <Image 
              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3081/3081986.png' }} 
              style={styles.illustration}
              resizeMode="contain"
            />
            <ThemedText style={styles.illustrationText}>
              {simpleStatus === 'pending' ? 'Order Confirmed!' : 'Preparing your order...'}
            </ThemedText>
          </View>
        )}
        
        <Pressable 
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { top: insets.top + 10 }]}
        >
          <Feather name="arrow-left" size={24} color="#1e293b" />
        </Pressable>

        {/* ETA Badge */}
        {showDriver && distance && (
          <View style={[styles.etaBadge, { top: insets.top + 10 }]}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="white" />
            <ThemedText style={styles.etaText}>
              {distance} km • {Math.ceil(distance * 3)} min
            </ThemedText>
          </View>
        )}
      </View>

      {/* BOTTOM: Order Info */}
      <ScrollView
        style={styles.bottomSheet}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingHorizontal: 20 }}
      >
        <View style={styles.handle} />

        {/* Order number + Status */}
        <View style={styles.statusHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.orderNumber}>Order {orderNumber}</ThemedText>
            <ThemedText style={styles.statusText}>
              {simpleStatus === 'pending' && 'Order Placed'}
              {simpleStatus === 'picking' && 'Picking Items'}
              {simpleStatus === 'packed' && 'Ready for Pickup'}
              {simpleStatus === 'delivering' && 'On the Way'}
            </ThemedText>
            <ThemedText style={styles.pinText}>
              PIN: <ThemedText style={styles.pinBold}>{order?.deliveryPin || 'N/A'}</ThemedText>
            </ThemedText>
          </View>
          <View style={styles.statusBadge}>
            <ThemedText style={styles.statusLabel}>{simpleStatus.toUpperCase()}</ThemedText>
          </View>
        </View>

        {/* 4-Step Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <View style={[styles.progressDot, styles.progressDotActive]}>
              <Feather name="check" size={12} color="white" />
            </View>
            <ThemedText style={styles.progressLabelActive}>Placed</ThemedText>
          </View>
          
          <View style={[styles.progressLine, simpleStatus !== 'pending' && styles.progressLineActive]} />
          
          <View style={styles.progressStep}>
            <View style={[
              styles.progressDot, 
              simpleStatus !== 'pending' && styles.progressDotActive,
              simpleStatus === 'picking' && styles.progressDotCurrent
            ]}>
              {simpleStatus !== 'pending' && <Feather name="check" size={12} color="white" />}
            </View>
            <ThemedText style={simpleStatus !== 'pending' ? styles.progressLabelActive : styles.progressLabel}>
              Picking
            </ThemedText>
          </View>
          
          <View style={[
            styles.progressLine, 
            (simpleStatus === 'packed' || simpleStatus === 'delivering') && styles.progressLineActive
          ]} />
          
          <View style={styles.progressStep}>
            <View style={[
              styles.progressDot, 
              (simpleStatus === 'packed' || simpleStatus === 'delivering') && styles.progressDotActive,
              simpleStatus === 'packed' && styles.progressDotCurrent
            ]}>
              {(simpleStatus === 'packed' || simpleStatus === 'delivering') && (
                <Feather name="check" size={12} color="white" />
              )}
            </View>
            <ThemedText style={
              (simpleStatus === 'packed' || simpleStatus === 'delivering') 
                ? styles.progressLabelActive 
                : styles.progressLabel
            }>
              Ready
            </ThemedText>
          </View>
          
          <View style={[styles.progressLine, simpleStatus === 'delivering' && styles.progressLineActive]} />
          
          <View style={styles.progressStep}>
            <View style={[
              styles.progressDot, 
              simpleStatus === 'delivering' && styles.progressDotActive,
              simpleStatus === 'delivering' && styles.progressDotCurrent
            ]}>
              {order?.status === 'delivered' && <Feather name="check" size={12} color="white" />}
            </View>
            <ThemedText style={simpleStatus === 'delivering' ? styles.progressLabelActive : styles.progressLabel}>
              On Way
            </ThemedText>
          </View>
        </View>

        {/* Driver card */}
        {order?.driverName && (
          <Card style={styles.driverCard}>
            <View style={styles.driverRow}>
              <View style={styles.driverAvatar}>
                <FontAwesome5 name="motorcycle" size={20} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.driverName}>{order.driverName}</ThemedText>
                <ThemedText style={styles.vehicleInfo}>
                  {distance ? `${distance} km away` : 'On the way'}
                </ThemedText>
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

        {/* Order summary */}
        <View style={styles.summarySection}>
          <ThemedText style={styles.sectionTitle}>Order Summary</ThemedText>
          <View style={styles.divider} />
          
          {order?.items?.map((item: any, i: number) => (
            <View key={i} style={styles.itemRow}>
              <ThemedText style={styles.itemQty}>{item.quantity}x</ThemedText>
              <ThemedText style={styles.itemName}>{item.productName}</ThemedText>
              <ThemedText style={styles.itemPrice}>
                Rp {(Number(item.priceAtEntry || 0) * Number(item.quantity || 1)).toLocaleString('id-ID')}
              </ThemedText>
            </View>
          ))}

          {/* Subtotal + Total */}
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <ThemedText style={styles.priceLabel}>Subtotal</ThemedText>
              <ThemedText style={styles.priceValue}>Rp {subtotal.toLocaleString('id-ID')}</ThemedText>
            </View>
            <View style={styles.priceRow}>
              <ThemedText style={styles.priceLabel}>Delivery Fee</ThemedText>
              <ThemedText style={styles.priceValue}>Rp {deliveryFee.toLocaleString('id-ID')}</ThemedText>
            </View>
            <View style={[styles.priceRow, styles.totalRow]}>
              <ThemedText style={styles.totalLabel}>Total Payment</ThemedText>
              <ThemedText style={styles.totalValue}>Rp {total.toLocaleString('id-ID')}</ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ==================== WEB MAP COMPONENT ====================
function WebMapView({ customerLat, customerLng, driverLat, driverLng, searchingDriver, showDriver, distance }: any) {
  return (
    <View style={styles.webMapContainer}>
      <View style={styles.webMapPlaceholder}>
        <MaterialCommunityIcons name="map-marker" size={60} color={BRAND_PURPLE} />
        <ThemedText style={styles.webMapText}>
          {searchingDriver ? 'Searching for driver...' : 'Your delivery location'}
        </ThemedText>
        {customerLat && customerLng && (
          <ThemedText style={styles.webMapCoords}>
            📍 {customerLat.toFixed(5)}, {customerLng.toFixed(5)}
          </ThemedText>
        )}
        {showDriver && driverLat && driverLng && (
          <View style={styles.webDriverInfo}>
            <MaterialCommunityIcons name="motorbike" size={24} color={BRAND_PURPLE} />
            <ThemedText style={styles.webDriverText}>
              Driver: {driverLat.toFixed(5)}, {driverLng.toFixed(5)}
            </ThemedText>
            {distance && (
              <ThemedText style={styles.webDistance}>{distance} km away</ThemedText>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ==================== NATIVE MAP COMPONENT WITH ANIMATIONS ====================
function NativeMapView({ 
  mapRef, 
  customerLat, 
  customerLng, 
  driverLat, 
  driverLng, 
  driverHeading, 
  driverSpeed,
  searchingDriver, 
  showDriver 
}: any) {
  const [MapComponents, setMapComponents] = useState<any>(null);
  const [prevDriverPos, setPrevDriverPos] = useState<{lat: number, lng: number} | null>(null);
  
  // Animated values for smooth driver movement
  const animatedLat = useRef(new Animated.Value(driverLat || 0)).current;
  const animatedLng = useRef(new Animated.Value(driverLng || 0)).current;
  const animatedRotation = useRef(new Animated.Value(driverHeading || 0)).current;

  useEffect(() => {
    if (Platform.OS !== "web") {
      import("react-native-maps").then((maps) => {
        setMapComponents(maps);
      });
    }
  }, []);

  // Smooth animation when driver position updates
  useEffect(() => {
    if (driverLat && driverLng && prevDriverPos) {
      Animated.parallel([
        Animated.timing(animatedLat, {
          toValue: driverLat,
          duration: DRIVER_ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(animatedLng, {
          toValue: driverLng,
          duration: DRIVER_ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(animatedRotation, {
          toValue: driverHeading,
          duration: DRIVER_ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (driverLat && driverLng) {
      // First position - set immediately
      animatedLat.setValue(driverLat);
      animatedLng.setValue(driverLng);
      animatedRotation.setValue(driverHeading);
    }
    
    if (driverLat && driverLng) {
      setPrevDriverPos({ lat: driverLat, lng: driverLng });
    }
  }, [driverLat, driverLng, driverHeading]);

  // Auto-zoom to fit both markers
  useEffect(() => {
    if (mapRef.current && customerLat && customerLng && driverLat && driverLng) {
      setTimeout(() => {
        mapRef.current.fitToCoordinates(
          [
            { latitude: customerLat, longitude: customerLng },
            { latitude: driverLat, longitude: driverLng },
          ],
          {
            edgePadding: { top: 120, right: 60, bottom: 60, left: 60 },
            animated: true,
          }
        );
      }, 100);
    }
  }, [driverLat, driverLng, customerLat, customerLng]);

  if (!MapComponents) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND_PURPLE} />
      </View>
    );
  }

  const MapView = MapComponents.default;
  const { Marker, Polyline, PROVIDER_GOOGLE, Circle } = MapComponents;

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      style={styles.map}
      initialRegion={{
        latitude: customerLat,
        longitude: customerLng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }}
      customMapStyle={mapStyle}
      showsUserLocation={false}
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
    >
      {/* Customer Marker with Pulse */}
      <Marker coordinate={{ latitude: customerLat, longitude: customerLng }} anchor={{ x: 0.5, y: 0.5 }}>
        <View style={styles.customerMarkerContainer}>
          {searchingDriver && <PulsingCircle />}
          <View style={styles.customerMarker}>
            <View style={styles.customerMarkerInner} />
          </View>
        </View>
      </Marker>

      {/* Customer Delivery Zone Circle */}
      <Circle
        center={{ latitude: customerLat, longitude: customerLng }}
        radius={50}
        fillColor="rgba(99, 56, 242, 0.1)"
        strokeColor={BRAND_PURPLE}
        strokeWidth={2}
      />

      {/* Driver Animated Marker */}
      {showDriver && (
        <Marker.Animated
          coordinate={{
            latitude: animatedLat,
            longitude: animatedLng,
          }}
          anchor={{ x: 0.5, y: 0.5 }}
          flat
        >
          <DriverMarker 
            heading={driverHeading} 
            speed={driverSpeed}
            isMoving={driverSpeed > 0.5}
          />
        </Marker.Animated>
      )}

      {/* Animated Route Line */}
      {showDriver && (
        <>
          {/* Main route */}
          <Polyline
            coordinates={[
              { latitude: driverLat, longitude: driverLng },
              { latitude: customerLat, longitude: customerLng },
            ]}
            strokeColor={BRAND_PURPLE}
            strokeWidth={5}
            lineDashPattern={[1, 10]}
          />
          
          {/* Glow effect */}
          <Polyline
            coordinates={[
              { latitude: driverLat, longitude: driverLng },
              { latitude: customerLat, longitude: customerLng },
            ]}
            strokeColor="rgba(99, 56, 242, 0.2)"
            strokeWidth={12}
          />
        </>
      )}
    </MapView>
  );
}

// ==================== DRIVER MARKER WITH MOTION INDICATOR ====================
function DriverMarker({ heading, speed, isMoving }: { heading: number; speed: number; isMoving: boolean }) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isMoving) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0);
    }
  }, [isMoving]);

  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View style={styles.driverMarkerContainer}>
      {/* Glow effect when moving */}
      {isMoving && (
        <Animated.View style={[styles.driverGlow, { opacity: glowOpacity }]} />
      )}
      
      {/* Main marker */}
      <View style={[styles.driverMarker, { transform: [{ rotate: `${heading}deg` }] }]}>
        <View style={styles.driverIconContainer}>
          <MaterialCommunityIcons name="motorbike" size={24} color="white" />
        </View>
        {/* Direction arrow */}
        <View style={styles.directionArrow} />
      </View>
      
      {/* Speed indicator */}
      {speed > 0 && (
        <View style={styles.speedBadge}>
          <ThemedText style={styles.speedText}>{Math.round(speed * 3.6)} km/h</ThemedText>
        </View>
      )}
    </View>
  );
}

// ==================== PULSING CIRCLE ANIMATION ====================
function PulsingCircle() {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { 
          toValue: 1, 
          duration: 2000, 
          useNativeDriver: true 
        }),
        Animated.timing(pulseAnim, { 
          toValue: 0, 
          duration: 0, 
          useNativeDriver: true 
        }),
      ])
    ).start();
  }, []);

  const scale = pulseAnim.interpolate({ 
    inputRange: [0, 1], 
    outputRange: [0.8, 2.5] 
  });
  
  const opacity = pulseAnim.interpolate({ 
    inputRange: [0, 1], 
    outputRange: [0.6, 0] 
  });

  return (
    <Animated.View 
      style={[
        styles.pulsingCircle, 
        { 
          transform: [{ scale }], 
          opacity 
        }
      ]} 
    />
  );
}

// ==================== CUSTOM MAP STYLE (Optional - Clean look) ====================
const mapStyle = [
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
];

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  map: { flex: 1 },
  
  // Illustration
  illustrationContainer: { 
    flex: 1, 
    backgroundColor: '#f8fafc', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  illustration: { width: 200, height: 200 },
  illustrationText: { 
    marginTop: 20, 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#64748b' 
  },
  
  // Buttons
  backButton: { 
    position: 'absolute', 
    left: 15, 
    width: 44, 
    height: 44, 
    backgroundColor: 'white', 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 8, 
    shadowColor: '#000', 
    shadowOpacity: 0.25, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowRadius: 12 
  },
  
  etaBadge: {
    position: 'absolute',
    right: 15,
    backgroundColor: BRAND_PURPLE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  etaText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  
  // Bottom Sheet
  bottomSheet: { 
    flex: 1, 
    backgroundColor: 'white', 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    marginTop: -30,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 20,
  },
  handle: { 
    width: 40, 
    height: 4, 
    backgroundColor: '#e2e8f0', 
    borderRadius: 2, 
    alignSelf: 'center', 
    marginTop: 12 
  },
  
  // Status Header
  statusHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 20, 
    alignItems: 'flex-start' 
  },
  orderNumber: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: '#1e293b', 
    marginBottom: 4 
  },
  statusText: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: BRAND_PURPLE, 
    marginBottom: 4 
  },
  pinText: { color: '#94a3b8', fontSize: 13 },
  pinBold: { color: BRAND_PURPLE, fontWeight: 'bold', fontSize: 15 },
  statusBadge: { 
    backgroundColor: '#f1f5f9', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 10 
  },
  statusLabel: { 
    fontSize: 11, 
    fontWeight: '800', 
    color: '#475569' 
  },
  
  // Progress Bar
  progressContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 24, 
    marginBottom: 20 
  },
  progressStep: { alignItems: 'center', flex: 1 },
  progressDot: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: '#e2e8f0', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  progressDotActive: { 
    backgroundColor: BRAND_PURPLE,
    elevation: 4,
  },
  progressDotCurrent: { 
    borderWidth: 3, 
    borderColor: '#e9d5ff',
    elevation: 6,
  },
  progressLabel: { 
    fontSize: 10, 
    color: '#94a3b8', 
    textAlign: 'center', 
    fontWeight: '600' 
  },
  progressLabelActive: { 
    fontSize: 10, 
    color: '#1e293b', 
    textAlign: 'center', 
    fontWeight: '700' 
  },
  progressLine: { 
    height: 3, 
    flex: 1, 
    backgroundColor: '#e2e8f0', 
    marginHorizontal: -10 
  },
  progressLineActive: { backgroundColor: BRAND_PURPLE },
  
  // Driver Card
  driverCard: { 
    marginTop: 20, 
    padding: 16, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverAvatar: { 
    width: 52, 
    height: 52, 
    borderRadius: 16, 
    backgroundColor: BRAND_PURPLE, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 4,
    shadowColor: BRAND_PURPLE,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  driverName: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
  vehicleInfo: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  contactActions: { flexDirection: 'row', gap: 10 },
  iconBtn: { 
    width: 42, 
    height: 42, 
    borderRadius: 21, 
    backgroundColor: '#f5f3ff', 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  
  // Summary
  summarySection: { marginTop: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 15 },
  itemRow: { 
    flexDirection: 'row', 
    marginBottom: 12, 
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemQty: { 
    width: 32, 
    fontWeight: '800', 
    color: BRAND_PURPLE,
    fontSize: 14,
  },
  itemName: { 
    flex: 1, 
    color: '#475569', 
    fontSize: 15,
    fontWeight: '500',
  },
  itemPrice: { 
    fontWeight: '700',
    color: '#1e293b',
  },
  
  priceContainer: { 
    marginTop: 20, 
    padding: 16, 
    backgroundColor: '#f8fafc', 
    borderRadius: 16 
  },
  priceRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 8 
  },
  priceLabel: { color: '#64748b', fontSize: 14, fontWeight: '500' },
  priceValue: { fontWeight: '600', fontSize: 14, color: '#475569' },
  totalRow: { 
    marginTop: 12, 
    paddingTop: 12, 
    borderTopWidth: 2, 
    borderTopColor: '#e2e8f0' 
  },
  totalLabel: { fontSize: 17, fontWeight: '900', color: '#1e293b' },
  totalValue: { fontSize: 17, fontWeight: '900', color: BRAND_PURPLE },
  
  // ==================== MAP MARKERS ====================
  
  // Customer Marker
  customerMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerMarker: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    backgroundColor: 'white', 
    borderWidth: 4, 
    borderColor: BRAND_PURPLE, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 8,
    shadowColor: BRAND_PURPLE,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  customerMarkerInner: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    backgroundColor: BRAND_PURPLE 
  },
  
  // Driver Marker
  driverMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BRAND_PURPLE,
  },
  driverMarker: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: BRAND_PURPLE, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    borderWidth: 3,
    borderColor: 'white',
  },
  driverIconContainer: {
    transform: [{ rotate: '0deg' }], // Keep icon upright
  },
  directionArrow: {
    position: 'absolute',
    top: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: BRAND_PURPLE,
  },
  speedBadge: {
    position: 'absolute',
    bottom: -20,
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  speedText: {
    fontSize: 10,
    fontWeight: '700',
    color: BRAND_PURPLE,
  },
  
  // Pulsing Circle
  pulsingCircle: { 
    position: 'absolute',
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    borderWidth: 2, 
    borderColor: BRAND_PURPLE, 
    backgroundColor: 'rgba(99, 56, 242, 0.15)',
  },
  
  // ==================== WEB-SPECIFIC STYLES ====================
  webMapContainer: { 
    flex: 1, 
    backgroundColor: '#f8fafc', 
    position: 'relative' 
  },
  webMapPlaceholder: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  webMapText: { 
    marginTop: 15, 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#64748b', 
    textAlign: 'center' 
  },
  webMapCoords: { 
    marginTop: 8, 
    fontSize: 13, 
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  webDriverInfo: { 
    marginTop: 20, 
    alignItems: 'center',
    gap: 8,
    padding: 16, 
    backgroundColor: 'white', 
    borderRadius: 16, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  webDriverText: { 
    fontSize: 14, 
    color: '#475569', 
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  webDistance: {
    fontSize: 12,
    color: BRAND_PURPLE,
    fontWeight: '700',
  },
});