// app/screens/DriverMapScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from 'expo-location';
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";

interface RouteParams {
  orderId: string;
  customerLat: number;
  customerLng: number;
  customerAddress?: string;
}

export default function DriverMapScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId, customerLat, customerLng, customerAddress } = route.params as RouteParams;
  
  const mapRef = useRef<MapView>(null);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [heading, setHeading] = useState(0);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  const [eta, setEta] = useState<number | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get initial driver location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        navigation.goBack();
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setDriverLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setHeading(location.coords.heading || 0);
      setIsLoading(false);

      // Fit map to show both driver and customer
      if (mapRef.current) {
        mapRef.current.fitToCoordinates(
          [
            { latitude: location.coords.latitude, longitude: location.coords.longitude },
            { latitude: customerLat, longitude: customerLng },
          ],
          {
            edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
            animated: true,
          }
        );
      }
    })();
  }, []);

  // Fetch route from Google Directions API
  useEffect(() => {
    if (!driverLocation) return;

    const fetchRoute = async () => {
      try {
        const origin = `${driverLocation.latitude},${driverLocation.longitude}`;
        const destination = `${customerLat},${customerLng}`;
        const GOOGLE_MAPS_KEY = 'YOUR_GOOGLE_MAPS_API_KEY'; // Replace with your API key

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${GOOGLE_MAPS_KEY}&mode=driving`
        );
        
        const data = await response.json();

        if (data.routes.length) {
          const route = data.routes[0];
          const points = decodePolyline(route.overview_polyline.points);
          setRouteCoordinates(points);
          
          // Get ETA and distance
          const leg = route.legs[0];
          setEta(Math.ceil(leg.duration.value / 60)); // Convert to minutes
          setDistance((leg.distance.value / 1000).toFixed(1)); // Convert to km
        }
      } catch (error) {
        console.error('Error fetching route:', error);
      }
    };

    fetchRoute();
  }, [driverLocation, customerLat, customerLng]);

  // Track driver location in real-time
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (location) => {
          setDriverLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          setHeading(location.coords.heading || 0);

          // Update backend with driver location
          fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/driver/location/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              driverId: user?.id,
              orderId: orderId,
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              heading: location.coords.heading || 0,
              speed: location.coords.speed || 0,
            }),
          });
        }
      );
    };

    startTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [orderId, user?.id]);

  // Center map on driver
  const centerOnDriver = () => {
    if (driverLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...driverLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  if (isLoading || !driverLocation) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText type="body" style={{ marginTop: 16 }}>Loading map...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsTraffic={true}
      >
        {/* Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#4285F4"
            strokeWidth={5}
            lineDashPattern={[1]}
          />
        )}

        {/* Driver Marker */}
        <Marker
          coordinate={driverLocation}
          anchor={{ x: 0.5, y: 0.5 }}
          rotation={heading}
          flat={true}
        >
          <View style={styles.driverMarker}>
            <View style={styles.driverIconContainer}>
              <Feather name="navigation" size={20} color="#FFF" />
            </View>
          </View>
        </Marker>

        {/* Customer Marker */}
        <Marker
          coordinate={{ latitude: customerLat, longitude: customerLng }}
          title="Customer Location"
          description={customerAddress}
        >
          <View style={styles.customerMarker}>
            <Feather name="map-pin" size={30} color="#E53935" />
          </View>
        </Marker>
      </MapView>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          style={[styles.backButton, { backgroundColor: theme.backgroundDefault }]}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>

        <View style={[styles.headerInfo, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h3">Delivering to Customer</ThemedText>
          {eta && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Feather name="clock" size={14} color={theme.primary} />
              <ThemedText type="caption" style={{ color: theme.primary }}>
                ETA: {eta} min • {distance} km
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      {/* Center on Driver Button */}
      <Pressable
        style={[styles.centerButton, { 
          bottom: insets.bottom + 100,
          backgroundColor: theme.backgroundDefault 
        }]}
        onPress={centerOnDriver}
      >
        <Feather name="navigation" size={24} color={theme.primary} />
      </Pressable>

      {/* Bottom Info Card */}
      <View style={[styles.bottomCard, { 
        paddingBottom: insets.bottom + 16,
        backgroundColor: theme.backgroundDefault 
      }]}>
        {customerAddress && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Feather name="map-pin" size={20} color={theme.primary} />
              <ThemedText type="body" style={{ flex: 1 }}>{customerAddress}</ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
          </>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 }}>
          <View style={{ alignItems: 'center' }}>
            <ThemedText type="h2" style={{ color: theme.primary }}>{eta || '--'}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>Minutes</ThemedText>
          </View>
          <View style={[styles.verticalDivider, { backgroundColor: theme.border }]} />
          <View style={{ alignItems: 'center' }}>
            <ThemedText type="h2" style={{ color: theme.primary }}>{distance || '--'}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>Kilometers</ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}

// Decode Google's encoded polyline format
function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerInfo: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  centerButton: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  verticalDivider: {
    width: 1,
    height: 40,
  },
  driverMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  customerMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});