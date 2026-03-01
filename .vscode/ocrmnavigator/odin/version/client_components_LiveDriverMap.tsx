/**
 * components/LiveDriverMap.tsx
 *
 * Real-time driver tracking map shown on the customer's order-tracking screen.
 * • Driver marker rotates to match heading
 * • Smooth interpolated movement every 200 ms
 * • Route polyline from driver → customer
 * • ETA / distance bannere
 */

import React, { useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import MapView, {
  Marker,
  Polyline,
  Circle,
  PROVIDER_GOOGLE,
  Region,
} from "react-native-maps";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useDriverTracking } from "@/hooks/useDriverLocationTracking";
import { getSmartZoom, GRABMAPS_CONFIG } from "@/lib/mapConfig";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const BRAND_PURPLE = "#6338f2";
const BRAND_MINT   = "#10b981";

// ─────────────────────────────────────────────────────────────────────────────
// Driver marker with heading rotation
// ─────────────────────────────────────────────────────────────────────────────
function DriverMarkerIcon({ heading }: { heading: number }) {
  return (
    <View
      style={[
        styles.driverMarker,
        { transform: [{ rotate: `${heading}deg` }] },
      ]}
    >
      <MaterialCommunityIcons name="navigation" size={28} color="#fff" />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ETA / distance banner
// ─────────────────────────────────────────────────────────────────────────────
function EtaBanner({
  etaMinutes,
  distanceKm,
}: {
  etaMinutes: number | null;
  distanceKm: number | null;
}) {
  const distLabel =
    distanceKm == null          ? "—"
    : distanceKm < 1            ? `${(distanceKm * 1000).toFixed(0)} m`
    :                             `${distanceKm.toFixed(1)} km`;

  const etaLabel =
    etaMinutes == null  ? "Calculating…"
    : etaMinutes <= 1   ? "Almost there!"
    :                     `~${etaMinutes} min away`;

  return (
    <View style={styles.etaBanner}>
      <View style={styles.etaItem}>
        <Feather name="clock" size={16} color={BRAND_PURPLE} />
        <ThemedText style={styles.etaValue}>{etaLabel}</ThemedText>
      </View>
      <View style={styles.etaDivider} />
      <View style={styles.etaItem}>
        <Feather name="map-pin" size={16} color={BRAND_MINT} />
        <ThemedText style={styles.etaValue}>{distLabel}</ThemedText>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
interface LiveDriverMapProps {
  orderId:     string;
  customerLat: number;
  customerLng: number;
  /** height of the map container */
  height?: number;
}

export function LiveDriverMap({
  orderId,
  customerLat,
  customerLng,
  height = 300,
}: LiveDriverMapProps) {
  const mapRef = useRef<MapView>(null);
  const {
    currentLocation,
    distanceKm,
    etaMinutes,
    bearing,
    hasLocation,
    isTracking,
    error,
  } = useDriverTracking(orderId, customerLat, customerLng, true);

  const smartZoom = getSmartZoom(
    customerLat,
    customerLng,
    GRABMAPS_CONFIG.driverTrackingZoom,
  );

  // Auto-fit map to show both driver and customer
  useEffect(() => {
    if (!currentLocation || !mapRef.current) return;

    mapRef.current.fitToCoordinates(
      [
        { latitude: currentLocation.latitude,  longitude: currentLocation.longitude },
        { latitude: customerLat,               longitude: customerLng },
      ],
      {
        edgePadding: { top: 80, right: 60, bottom: 160, left: 60 },
        animated:    true,
      },
    );
  }, [
    currentLocation?.latitude,
    currentLocation?.longitude,
    customerLat,
    customerLng,
  ]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (!isTracking || (!hasLocation && !error)) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <ActivityIndicator size="large" color={BRAND_PURPLE} />
        <ThemedText style={styles.placeholderText}>
          Connecting to driver…
        </ThemedText>
      </View>
    );
  }

  if (error || !currentLocation) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Feather name="wifi-off" size={32} color="#94a3b8" />
        <ThemedText style={styles.placeholderText}>
          Driver location unavailable
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude:       customerLat,
          longitude:      customerLng,
          latitudeDelta:  0.01,
          longitudeDelta: 0.01,
        }}
        maxZoomLevel={GRABMAPS_CONFIG.maxZoom}
        showsBuildings
        showsTraffic
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {/* Driver marker */}
        <Marker
          coordinate={{
            latitude:  currentLocation.latitude,
            longitude: currentLocation.longitude,
          }}
          anchor={{ x: 0.5, y: 0.5 }}
          flat
        >
          <DriverMarkerIcon heading={currentLocation.heading} />
        </Marker>

        {/* Customer destination pin */}
        <Marker
          coordinate={{ latitude: customerLat, longitude: customerLng }}
          anchor={{ x: 0.5, y: 1.0 }}
        >
          <View style={styles.customerMarker}>
            <Feather name="home" size={16} color="#fff" />
          </View>
        </Marker>

        {/* Route polyline */}
        <Polyline
          coordinates={[
            { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
            { latitude: customerLat,              longitude: customerLng },
          ]}
          strokeColor={BRAND_PURPLE}
          strokeWidth={3}
          lineDashPattern={[6, 4]}
        />

        {/* Accuracy circle around driver */}
        {currentLocation.accuracy > 0 && (
          <Circle
            center={{
              latitude:  currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            radius={currentLocation.accuracy}
            fillColor={BRAND_PURPLE + "18"}
            strokeColor={BRAND_PURPLE + "50"}
            strokeWidth={1}
          />
        )}
      </MapView>

      {/* ETA overlay */}
      <EtaBanner etaMinutes={etaMinutes} distanceKm={distanceKm} />

      {/* Live badge */}
      <View style={styles.liveBadge}>
        <View style={styles.liveDot} />
        <ThemedText style={styles.liveText}>LIVE</ThemedText>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    borderRadius:   20,
    overflow:       "hidden",
    position:       "relative",
  },

  placeholder: {
    borderRadius:   20,
    backgroundColor:"#f1f5f9",
    alignItems:     "center",
    justifyContent: "center",
    gap:            12,
  },
  placeholderText: {
    fontSize:  14,
    color:     "#64748b",
    fontWeight:"600",
  },

  // ── Driver marker ──────────────────────────────────────────────────────────
  driverMarker: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: BRAND_PURPLE,
    alignItems:      "center",
    justifyContent:  "center",
    elevation:       6,
    shadowColor:     BRAND_PURPLE,
    shadowOpacity:   0.4,
    shadowRadius:    6,
    shadowOffset:    { width: 0, height: 3 },
  },

  // ── Customer marker ────────────────────────────────────────────────────────
  customerMarker: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: BRAND_MINT,
    alignItems:      "center",
    justifyContent:  "center",
    elevation:       4,
    shadowColor:     BRAND_MINT,
    shadowOpacity:   0.35,
    shadowRadius:    5,
    shadowOffset:    { width: 0, height: 2 },
  },

  // ── ETA banner ─────────────────────────────────────────────────────────────
  etaBanner: {
    position:        "absolute",
    bottom:          16,
    left:            16,
    right:           16,
    backgroundColor: "#ffffffee",
    borderRadius:    16,
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "space-around",
    paddingVertical: 12,
    elevation:       6,
    shadowColor:     "#000",
    shadowOpacity:   0.1,
    shadowRadius:    8,
    shadowOffset:    { width: 0, height: 3 },
  },
  etaItem: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            6,
  },
  etaValue:  { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  etaDivider:{ width: 1, height: 24, backgroundColor: "#e2e8f0" },

  // ── Live badge ─────────────────────────────────────────────────────────────
  liveBadge: {
    position:        "absolute",
    top:             12,
    right:           12,
    flexDirection:   "row",
    alignItems:      "center",
    gap:             5,
    backgroundColor: "#ffffffee",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius:    20,
  },
  liveDot: {
    width:           7,
    height:          7,
    borderRadius:    4,
    backgroundColor: "#ef4444",
  },
  liveText: {
    fontSize:   11,
    fontWeight: "800",
    color:      "#ef4444",
    letterSpacing: 0.5,
  },
});