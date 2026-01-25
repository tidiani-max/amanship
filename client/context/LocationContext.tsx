import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/query-client";

interface StoreInfo {
  id: string;
  name: string;
  address: string;
  distanceKm: number;
  codAllowed: boolean;
}

interface ManualLocation {
  latitude: number;
  longitude: number;
  address: string;
  label: string;
  isManual: true;
}

interface LocationContextType {
  location: { latitude: number; longitude: number } | null;
  locationStatus: "loading" | "granted" | "denied" | "unavailable";
  store: StoreInfo | null;
  storeAvailable: boolean;
  codAllowed: boolean;
  estimatedDeliveryMinutes: number | null;
  isCheckingAvailability: boolean;
  errorMessage: string | null;
  isManualLocation: boolean;
  manualAddress: string | null;
  addressLabel: string | null;
  gpsLocationName: string | null;
  accuracy: number | null; // GPS accuracy in meters
  heading: number | null; // Direction user/driver is facing
  requestLocationPermission: () => Promise<boolean>;
  refreshStoreAvailability: () => void;
  setManualLocation: (location: ManualLocation) => void;
  clearManualLocation: () => void;
  useCurrentLocation: () => Promise<void>;
  startContinuousTracking: () => void; // For drivers
  stopContinuousTracking: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"loading" | "granted" | "denied" | "unavailable">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isManualLocation, setIsManualLocation] = useState(false);
  const [manualAddress, setManualAddress] = useState<string | null>(null);
  const [addressLabel, setAddressLabel] = useState<string | null>(null);
  const [gpsLocationName, setGpsLocationName] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);

  const {
    data: availabilityData,
    isLoading: isCheckingAvailability,
    refetch: refreshStoreAvailability,
  } = useQuery({
    queryKey: ["/api/stores/available", userLocation?.latitude, userLocation?.longitude],
    queryFn: async () => {
      if (!userLocation) return null;
      const url = new URL("/api/stores/available", getApiUrl());
      url.searchParams.set("lat", String(userLocation.latitude));
      url.searchParams.set("lng", String(userLocation.longitude));
      const res = await fetch(url.toString());
      return res.json();
    },
    enabled: !!userLocation,
    staleTime: 30000,
  });

  // Reverse geocode function
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
        { headers: { "User-Agent": "KilatGoApp" } }
      );
      const data = await response.json();
      
      const address = data.address || {};
      const locationName = 
        address.neighbourhood || 
        address.suburb || 
        address.village ||
        address.city_district ||
        address.city ||
        address.county ||
        "Current Location";
      
      return String(locationName);
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return "Current Location";
    }
  };

  // ===== HIGH ACCURACY LOCATION REQUEST =====
  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === "web") {
        setLocationStatus("loading");
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0, // Force fresh location
          });
        });
        
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setUserLocation({ latitude: lat, longitude: lng });
        setAccuracy(position.coords.accuracy);
        setHeading(position.coords.heading);
        
        const placeName = await reverseGeocode(lat, lng);
        setGpsLocationName(placeName);
        
        setLocationStatus("granted");
        setIsManualLocation(false);
        setManualAddress(null);
        setAddressLabel(null);
        return true;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationStatus("denied");
        setErrorMessage("Location permission is required to find nearby stores");
        return false;
      }

      // ✅ REQUEST HIGHEST ACCURACY POSSIBLE
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation, // Highest accuracy
      });

      const lat = currentLocation.coords.latitude;
      const lng = currentLocation.coords.longitude;

      setUserLocation({ latitude: lat, longitude: lng });
      setAccuracy(currentLocation.coords.accuracy);
      setHeading(currentLocation.coords.heading || null);
      
      const placeName = await reverseGeocode(lat, lng);
      setGpsLocationName(placeName);
      
      setLocationStatus("granted");
      setIsManualLocation(false);
      setManualAddress(null);
      setAddressLabel(null);
      
      console.log("📍 GPS Accuracy:", currentLocation.coords.accuracy, "meters");
      
      return true;
    } catch (error) {
      console.error("Location error:", error);
      setLocationStatus("unavailable");
      setErrorMessage("Unable to get your location. Please try again.");
      return false;
    }
  }, []);

  // ===== CONTINUOUS TRACKING (For Drivers) =====
  const startContinuousTracking = useCallback(async () => {
    try {
      console.log("🚗 Starting continuous location tracking...");
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.error("❌ Location permission denied");
        return;
      }

      // Subscribe to location updates
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 3000, // Update every 3 seconds
          distanceInterval: 10, // Or every 10 meters moved
        },
        (location) => {
          const { latitude, longitude, heading, speed, accuracy } = location.coords;
          
          setUserLocation({ latitude, longitude });
          setAccuracy(accuracy);
          setHeading(heading || null);
          
          console.log("📍 Location update:", {
            lat: latitude.toFixed(6),
            lng: longitude.toFixed(6),
            accuracy: accuracy?.toFixed(1),
            speed: speed?.toFixed(1),
          });
        }
      );

      setLocationSubscription(subscription);
      console.log("✅ Continuous tracking started");
    } catch (error) {
      console.error("❌ Failed to start tracking:", error);
    }
  }, []);

  const stopContinuousTracking = useCallback(() => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
      console.log("🛑 Continuous tracking stopped");
    }
  }, [locationSubscription]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [locationSubscription]);

  const setManualLocationFunc = useCallback((manualLoc: ManualLocation) => {
    setUserLocation({
      latitude: manualLoc.latitude,
      longitude: manualLoc.longitude,
    });
    setIsManualLocation(true);
    setManualAddress(manualLoc.address);
    setAddressLabel(manualLoc.label);
    setGpsLocationName(null);
    setLocationStatus("granted");
    setErrorMessage(null);
  }, []);

  const clearManualLocation = useCallback(() => {
    setIsManualLocation(false);
    setManualAddress(null);
    setAddressLabel(null);
  }, []);

  const useCurrentLocation = useCallback(async () => {
    await requestLocationPermission();
  }, [requestLocationPermission]);

  // Initial permission check
  useEffect(() => {
    const checkInitialPermission = async () => {
      if (Platform.OS === "web") {
        if ("geolocation" in navigator) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000,
              });
            });
            
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            setUserLocation({ latitude: lat, longitude: lng });
            setAccuracy(position.coords.accuracy);
            
            const placeName = await reverseGeocode(lat, lng);
            setGpsLocationName(placeName);
            
            setLocationStatus("granted");
          } catch {
            setLocationStatus("denied");
          }
        } else {
          setLocationStatus("unavailable");
        }
        return;
      }

      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === "granted") {
        try {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation,
          });
          
          const lat = currentLocation.coords.latitude;
          const lng = currentLocation.coords.longitude;
          
          setUserLocation({ latitude: lat, longitude: lng });
          setAccuracy(currentLocation.coords.accuracy);
          
          const placeName = await reverseGeocode(lat, lng);
          setGpsLocationName(placeName);
          
          setLocationStatus("granted");
        } catch {
          setLocationStatus("unavailable");
        }
      } else {
        setLocationStatus("denied");
      }
    };

    if (!isManualLocation) {
      checkInitialPermission();
    }
  }, [isManualLocation]);

  const store: StoreInfo | null = availabilityData?.available && availabilityData?.store
    ? {
        id: String(availabilityData.store.id || ''),
        name: String(availabilityData.store.name || 'Store'),
        address: String(availabilityData.store.address || ''),
        distanceKm: Number(availabilityData.store.distanceKm) || 0,
        codAllowed: Boolean(availabilityData.store.codAllowed),
      }
    : null;

  const storeAvailable = Boolean(availabilityData?.available);
  const codAllowed = Boolean(availabilityData?.codAllowed);
  const estimatedDeliveryMinutes = availabilityData?.estimatedDeliveryMinutes ? Number(availabilityData.estimatedDeliveryMinutes) : null;

  const contextValue: LocationContextType = {
    location: userLocation,
    locationStatus,
    store,
    storeAvailable,
    codAllowed,
    estimatedDeliveryMinutes,
    isCheckingAvailability,
    errorMessage,
    isManualLocation,
    manualAddress,
    addressLabel,
    gpsLocationName,
    accuracy,
    heading,
    requestLocationPermission,
    refreshStoreAvailability,
    setManualLocation: setManualLocationFunc,
    clearManualLocation,
    useCurrentLocation,
    startContinuousTracking,
    stopContinuousTracking,
  };

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}