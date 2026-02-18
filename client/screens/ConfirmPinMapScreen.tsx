/**
 * screens/ConfirmPinMapScreen.tsx
 * Bolt/Grab-style confirm-pin map screen.
 * • User drags the MAP; the pin stays fixed at the center
 * • Zoom ≥ 18 for building-entrance precision
 * • Shows street name, accuracy circle, and "Confirm Location" CTA
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Animated,
  Platform,
  Alert,
} from "react-native";
import MapView, {
  Region,
  Circle,
  PROVIDER_GOOGLE,
  MapPressEvent,
} from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLocation } from "@/context/LocationContext";
import { getSmartZoom, GRABMAPS_CONFIG, isInIndonesia } from "@/lib/mapConfig";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type RootStackParamList = {
  ConfirmPinMap: {
    initialLat?: number;
    initialLng?: number;
    onConfirm?: (lat: number, lng: number, address: string) => void;
  };
};

type ConfirmPinRoute = RouteProp<RootStackParamList, "ConfirmPinMap">;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const BRAND_PURPLE = "#6338f2";
const BRAND_MINT   = "#10b981";
const PIN_HEIGHT   = 56;     // px the pin icon stands above center
const BOUNCE_DIST  = 12;     // px pin bounces up when map moves

// ─────────────────────────────────────────────────────────────────────────────
// Animated pin
// ─────────────────────────────────────────────────────────────────────────────
function AnimatedPin({ isDragging }: { isDragging: boolean }) {
  const bounce = useRef(new Animated.Value(0)).current;
  const shadow = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isDragging) {
      Animated.parallel([
        Animated.spring(bounce, { toValue: -BOUNCE_DIST, useNativeDriver: true }),
        Animated.spring(shadow, { toValue: 0.4,          useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(bounce, { toValue: 0,   useNativeDriver: true, tension: 300, friction: 10 }),
        Animated.spring(shadow, { toValue: 1,   useNativeDriver: true }),
      ]).start();
    }
  }, [isDragging]);

  return (
    <View style={styles.pinWrapper} pointerEvents="none">
      {/* Shadow dot on ground */}
      <Animated.View style={[styles.pinShadow, { transform: [{ scaleX: shadow }] }]} />

      {/* Pin icon */}
      <Animated.View style={[styles.pinIcon, { transform: [{ translateY: bounce }] }]}>
        <MaterialCommunityIcons name="map-marker" size={52} color={BRAND_PURPLE} />
        {/* White dot in center of pin head */}
        <View style={styles.pinDot} />
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom address card
// ─────────────────────────────────────────────────────────────────────────────
function AddressCard({
  address,
  accuracy,
  isLoading,
  onConfirm,
}: {
  address: string;
  accuracy: number | null;
  isLoading: boolean;
  onConfirm: () => void;
}) {
  const { theme } = useTheme();
  const insets    = useSafeAreaInsets();

  const accuracyColor =
    accuracy == null      ? "#94a3b8"
    : accuracy <= 5       ? BRAND_MINT
    : accuracy <= 15      ? "#f59e0b"
    :                       "#ef4444";

  const accuracyLabel =
    accuracy == null      ? "—"
    : accuracy <= 5       ? `±${accuracy.toFixed(0)} m – Excellent`
    : accuracy <= 15      ? `±${accuracy.toFixed(0)} m – Good`
    :                       `±${accuracy.toFixed(0)} m – Low`;

  return (
    <View style={[styles.card, { paddingBottom: insets.bottom + 16 }]}>
      {/* Drag handle */}
      <View style={styles.handle} />

      {/* Address */}
      <View style={styles.addressRow}>
        <View style={[styles.addressIconCircle, { backgroundColor: BRAND_PURPLE + "15" }]}>
          <Feather name="map-pin" size={20} color={BRAND_PURPLE} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <ThemedText style={styles.addressLabel}>Delivery Pin</ThemedText>
          {isLoading ? (
            <ActivityIndicator size="small" color={BRAND_PURPLE} style={{ marginTop: 4 }} />
          ) : (
            <ThemedText style={styles.addressText} numberOfLines={2}>
              {address || "Fetching address…"}
            </ThemedText>
          )}
        </View>
      </View>

      {/* Accuracy badge */}
      <View style={[styles.accuracyBadge, { backgroundColor: accuracyColor + "15" }]}>
        <MaterialCommunityIcons name="crosshairs-gps" size={14} color={accuracyColor} />
        <ThemedText style={[styles.accuracyText, { color: accuracyColor }]}>
          {accuracyLabel}
        </ThemedText>
      </View>

      {/* Confirm button */}
      <Pressable
        style={[styles.confirmButton, { backgroundColor: BRAND_PURPLE }]}
        onPress={onConfirm}
        disabled={isLoading}
      >
        <Feather name="check-circle" size={20} color="#fff" />
        <ThemedText style={styles.confirmText}>Confirm this location</ThemedText>
      </Pressable>

      {/* Hint */}
      <ThemedText style={styles.hint}>
        Drag the map to place the pin at your exact entrance
      </ThemedText>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────
export default function ConfirmPinMapScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route      = useRoute<ConfirmPinRoute>();
  const { theme }  = useTheme();
  const { location: contextLocation, setManualLocation, accuracy: ctxAccuracy } = useLocation();

  const mapRef   = useRef<MapView>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Starting coords: use route params → context → Jakarta fallback
  const initLat = route.params?.initialLat ?? contextLocation?.latitude  ?? -6.2088;
  const initLng = route.params?.initialLng ?? contextLocation?.longitude ?? 106.8456;

  const smartZoom = getSmartZoom(initLat, initLng, GRABMAPS_CONFIG.confirmPinZoom);

  const [pinCoords, setPinCoords]     = useState({ lat: initLat, lng: initLng });
  const [isDragging, setIsDragging]   = useState(false);
  const [address, setAddress]         = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [accuracy, setAccuracy]       = useState<number | null>(ctxAccuracy);

  // Initial reverse geocode
  useEffect(() => { reverseGeocode(initLat, initLng); }, []);

  // ── Reverse geocode via server proxy (avoids CORS on mobile) ──────────────
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN}/api/geocode/reverse?lat=${lat}&lng=${lng}`
      );
      const data = await res.json();
      setAddress(
        data.fullAddress
          || data.locationName
          || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      );
    } catch {
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // ── Map region change handlers ────────────────────────────────────────────
  const onRegionChange = useCallback((region: Region) => {
    setIsDragging(true);
    if (debounce.current) clearTimeout(debounce.current);
    
    setPinCoords({ lat: region.latitude, lng: region.longitude });

    // Debounce geocoding so we don't hammer the API on every pixel
    debounce.current = setTimeout(() => {
      setIsDragging(false);
      reverseGeocode(region.latitude, region.longitude);
    }, 500);
  }, [reverseGeocode]);

  // ── GPS recenter ──────────────────────────────────────────────────────────
  const handleRecenter = useCallback(async () => {
    if (Platform.OS === "web") return;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      const { latitude, longitude, accuracy: acc } = loc.coords;
      setAccuracy(acc ?? null);
      mapRef.current?.animateToRegion({
        latitude,
        longitude,
        latitudeDelta:  0.001,
        longitudeDelta: 0.001,
      }, 600);
    } catch (e) {
      Alert.alert("Location", "Could not get GPS position.");
    }
  }, []);

  // ── Confirm ───────────────────────────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    setManualLocation({
      latitude:  pinCoords.lat,
      longitude: pinCoords.lng,
      address,
      label:    "Confirmed Location",
      isManual: true,
    });

    // Fire callback if the caller passed one
    route.params?.onConfirm?.(pinCoords.lat, pinCoords.lng, address);

    navigation.goBack();
  }, [pinCoords, address, navigation, setManualLocation, route.params]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="chevron-left" size={28} color="#1e293b" />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Pin Your Location</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}           // Google Maps SDK used under the hood
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude:       initLat,
          longitude:      initLng,
          latitudeDelta:  0.001,
          longitudeDelta: 0.001,
        }}
        mapType="standard"
        showsUserLocation
        showsMyLocationButton={false}        // We have our own recenter button
        showsBuildings
        showsPointsOfInterest
        showsIndoors
        minZoomLevel={GRABMAPS_CONFIG.confirmPinZoom}
        maxZoomLevel={GRABMAPS_CONFIG.maxZoom}
        onRegionChange={onRegionChange}
      >
        {/* Accuracy circle */}
        {accuracy != null && (
          <Circle
            center={{ latitude: pinCoords.lat, longitude: pinCoords.lng }}
            radius={accuracy}
            fillColor={BRAND_PURPLE + "20"}
            strokeColor={BRAND_PURPLE + "60"}
            strokeWidth={1}
          />
        )}
      </MapView>

      {/* Fixed center pin (pointer-events none so map gestures pass through) */}
      <AnimatedPin isDragging={isDragging} />

      {/* Zoom level badge */}
      <View style={[styles.zoomBadge, { top: insets.top + 70 }]}>
        <Feather name="zoom-in" size={12} color="#64748b" />
        <ThemedText style={styles.zoomText}>
          {isInIndonesia(pinCoords.lat, pinCoords.lng)
            ? `Zoom ${smartZoom} · Hyperlocal`
            : `Zoom ${GRABMAPS_CONFIG.confirmPinZoom}`}
        </ThemedText>
      </View>

      {/* GPS recenter FAB */}
      <Pressable
        style={[styles.recenterBtn, { bottom: 280 + insets.bottom }]}
        onPress={handleRecenter}
      >
        <MaterialCommunityIcons name="crosshairs-gps" size={22} color={BRAND_PURPLE} />
      </Pressable>

      {/* Bottom address card */}
      <View style={styles.cardContainer}>
        <AddressCard
          address={address}
          accuracy={accuracy}
          isLoading={isGeocoding}
          onConfirm={handleConfirm}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },

  header: {
    position:        "absolute",
    top:             0, left: 0, right: 0,
    zIndex:          10,
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "space-between",
    paddingHorizontal: 16,
    paddingBottom:   12,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backBtn:    { padding: 4 },
  headerTitle:{ fontSize: 18, fontWeight: "800", color: "#1e293b" },

  // ── Pin ──────────────────────────────────────────────────────────────────
  pinWrapper: {
    position:        "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems:      "center",
    justifyContent:  "center",
    zIndex:          5,
  },
  pinIcon: {
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    PIN_HEIGHT / 2,
  },
  pinDot: {
    position:        "absolute",
    top:             13,
    width:           10,
    height:          10,
    borderRadius:    5,
    backgroundColor: "#fff",
  },
  pinShadow: {
    position:        "absolute",
    bottom:          PIN_HEIGHT / 2 - 6,
    width:           16,
    height:          6,
    borderRadius:    8,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  // ── Badges & FABs ────────────────────────────────────────────────────────
  zoomBadge: {
    position:        "absolute",
    right:           12,
    flexDirection:   "row",
    alignItems:      "center",
    gap:             4,
    backgroundColor: "rgba(255,255,255,0.88)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius:    20,
    borderWidth:     1,
    borderColor:     "#e2e8f0",
    zIndex:          6,
  },
  zoomText: { fontSize: 11, color: "#64748b", fontWeight: "600" },

  recenterBtn: {
    position:        "absolute",
    right:           16,
    width:           48,
    height:          48,
    borderRadius:    16,
    backgroundColor: "#fff",
    alignItems:      "center",
    justifyContent:  "center",
    elevation:       4,
    shadowColor:     "#000",
    shadowOpacity:   0.12,
    shadowRadius:    8,
    shadowOffset:    { width: 0, height: 3 },
    zIndex:          6,
  },

  // ── Bottom card ──────────────────────────────────────────────────────────
  cardContainer: {
    position:        "absolute",
    bottom:          0, left: 0, right: 0,
    zIndex:          7,
  },
  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop:        14,
    elevation:         16,
    shadowColor:       "#000",
    shadowOpacity:     0.15,
    shadowRadius:      20,
    shadowOffset:      { width: 0, height: -4 },
  },
  handle: {
    alignSelf:       "center",
    width:           40,
    height:          4,
    borderRadius:    2,
    backgroundColor: "#e2e8f0",
    marginBottom:    16,
  },

  addressRow: {
    flexDirection:  "row",
    alignItems:     "center",
    marginBottom:   14,
  },
  addressIconCircle: {
    width:          44,
    height:         44,
    borderRadius:   14,
    alignItems:     "center",
    justifyContent: "center",
  },
  addressLabel: {
    fontSize:  11,
    fontWeight:"700",
    color:     "#94a3b8",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  addressText: {
    fontSize:   14,
    fontWeight: "600",
    color:      "#1e293b",
    lineHeight: 20,
  },

  accuracyBadge: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            6,
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:   20,
    marginBottom:   16,
    alignSelf:      "flex-start",
  },
  accuracyText: { fontSize: 12, fontWeight: "700" },

  confirmButton: {
    height:         56,
    borderRadius:   18,
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            8,
    elevation:      4,
    shadowColor:    "#6338f2",
    shadowOpacity:  0.3,
    shadowRadius:   8,
    shadowOffset:   { width: 0, height: 4 },
    marginBottom:   10,
  },
  confirmText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  hint: {
    textAlign:  "center",
    fontSize:   12,
    color:      "#94a3b8",
    marginBottom: 4,
  },
});