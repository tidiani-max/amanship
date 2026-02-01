import React, { useEffect, useRef } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, Linking, Pressable, Image, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
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
  const mapRef = useRef<MapView>(null);

  // Fetch order data every 3 seconds
  const { data: order, isLoading } = useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/orders/${orderId}`);
      return res.json();
    },
    refetchInterval: 3000,
  });

  // FIX #1: Simplify status to 4 steps
  // Backend: pending, confirmed, picking, packed, delivering, delivered
  // Frontend: pending → picking → packed → delivering
  const getSimpleStatus = () => {
    const status = order?.status?.toLowerCase() || 'pending';
    if (status === 'pending' || status === 'confirmed') return 'pending';
    if (status === 'picking') return 'picking';
    if (status === 'packed') return 'packed';
    if (status === 'delivering' || status === 'delivered') return 'delivering';
    return 'pending';
  };

  const simpleStatus = getSimpleStatus();

  // Fetch driver location only when delivering
  const { data: driverData } = useQuery({
    queryKey: ["driver-location", orderId],
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/driver/location/${orderId}`);
      return res.json();
    },
    enabled: simpleStatus === 'delivering' && !!order?.driverId,
    refetchInterval: 2000,
  });

  // FIX #2: Order number with fallback
  const orderNumber = order?.orderNumber || `#${order?.id?.slice(0, 8).toUpperCase() || 'PENDING'}`;
  
  // FIX #3: Subtotal and total with safe fallbacks
  const subtotal = order?.subtotal || 0;
  const deliveryFee = order?.deliveryFee || 10000;
  const total = order?.total || (subtotal + deliveryFee);
  
  // Get customer and driver locations
  const customerLat = order?.customerLat ? parseFloat(order.customerLat) : null;
  const customerLng = order?.customerLng ? parseFloat(order.customerLng) : null;
  const driverLat = driverData?.location?.latitude || null;
  const driverLng = driverData?.location?.longitude || null;
  const driverHeading = driverData?.location?.heading || 0;

  // Auto-fit map when driver location updates
  useEffect(() => {
    if (mapRef.current && customerLat && customerLng && driverLat && driverLng) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: customerLat, longitude: customerLng },
          { latitude: driverLat, longitude: driverLng },
        ],
        {
          edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
          animated: true,
        }
      );
    }
  }, [driverLat, driverLng]);

  // Decide what to show
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
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: customerLat!,
              longitude: customerLng!,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
          >
            {/* Customer purple dot */}
            <Marker coordinate={{ latitude: customerLat!, longitude: customerLng! }}>
              <View style={styles.customerMarker}>
                <View style={styles.customerMarkerInner} />
              </View>
            </Marker>

            {/* Pulsing circle when searching */}
            {searchingDriver && (
              <Marker coordinate={{ latitude: customerLat!, longitude: customerLng! }}>
                <PulsingCircle />
              </Marker>
            )}

            {/* Driver bike marker */}
            {showDriver && (
              <Marker
                coordinate={{ latitude: driverLat!, longitude: driverLng! }}
                rotation={driverHeading}
                flat
              >
                <View style={styles.driverMarker}>
                  <MaterialCommunityIcons name="motorbike" size={28} color="white" />
                </View>
              </Marker>
            )}

            {/* Blue dashed route line */}
            {showDriver && (
              <Polyline
                coordinates={[
                  { latitude: driverLat!, longitude: driverLng! },
                  { latitude: customerLat!, longitude: customerLng! },
                ]}
                strokeColor={BRAND_PURPLE}
                strokeWidth={4}
                lineDashPattern={[10, 10]}
              />
            )}
          </MapView>
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
                  {driverData?.distance ? `${driverData.distance} km away` : 'On the way'}
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

function PulsingCircle() {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2] });
  const opacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return <Animated.View style={[styles.pulsingCircle, { transform: [{ scale }], opacity }]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1 },
  illustrationContainer: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  illustration: { width: 200, height: 200 },
  illustrationText: { marginTop: 20, fontSize: 16, fontWeight: '700', color: '#64748b' },
  backButton: { position: 'absolute', left: 15, width: 42, height: 42, backgroundColor: 'white', borderRadius: 21, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8 },
  bottomSheet: { flex: 1, backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30 },
  handle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, alignItems: 'flex-start' },
  orderNumber: { fontSize: 24, fontWeight: '900', color: '#1e293b', marginBottom: 4 },
  statusText: { fontSize: 15, fontWeight: '600', color: BRAND_PURPLE, marginBottom: 4 },
  pinText: { color: '#94a3b8', fontSize: 13 },
  pinBold: { color: BRAND_PURPLE, fontWeight: 'bold' },
  statusBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusLabel: { fontSize: 11, fontWeight: '800', color: '#475569' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 20 },
  progressStep: { alignItems: 'center', flex: 1 },
  progressDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  progressDotActive: { backgroundColor: BRAND_PURPLE },
  progressDotCurrent: { borderWidth: 3, borderColor: '#e9d5ff' },
  progressLabel: { fontSize: 10, color: '#94a3b8', textAlign: 'center', fontWeight: '600' },
  progressLabelActive: { fontSize: 10, color: '#1e293b', textAlign: 'center', fontWeight: '700' },
  progressLine: { height: 2, flex: 1, backgroundColor: '#e2e8f0', marginHorizontal: -10 },
  progressLineActive: { backgroundColor: BRAND_PURPLE },
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
  priceLabel: { color: '#64748b', fontSize: 14 },
  priceValue: { fontWeight: '600', fontSize: 14 },
  totalRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  totalLabel: { fontSize: 17, fontWeight: '900' },
  totalValue: { fontSize: 17, fontWeight: '900', color: BRAND_PURPLE },
  customerMarker: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'white', borderWidth: 3, borderColor: BRAND_PURPLE, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 5 },
  customerMarkerInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: BRAND_PURPLE },
  driverMarker: { width: 50, height: 50, borderRadius: 25, backgroundColor: BRAND_PURPLE, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 5 },
  pulsingCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: BRAND_PURPLE, backgroundColor: 'rgba(99, 56, 242, 0.1)' },
});