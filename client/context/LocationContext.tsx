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
  requestLocationPermission: () => Promise<boolean>;
  refreshStoreAvailability: () => void;
  setManualLocation: (location: ManualLocation) => void;
  clearManualLocation: () => void;
  useCurrentLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"loading" | "granted" | "denied" | "unavailable">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isManualLocation, setIsManualLocation] = useState(false);
  const [manualAddress, setManualAddress] = useState<string | null>(null);

  const {
    data: availabilityData,
    isLoading: isCheckingAvailability,
    refetch: refreshStoreAvailability,
  } = useQuery({
    queryKey: ["/api/stores/available", location?.latitude, location?.longitude],
    queryFn: async () => {
      if (!location) return null;
      const url = new URL("/api/stores/available", getApiUrl());
      url.searchParams.set("lat", String(location.latitude));
      url.searchParams.set("lng", String(location.longitude));
      const res = await fetch(url.toString());
      return res.json();
    },
    enabled: !!location,
    staleTime: 30000,
  });

  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === "web") {
        setLocationStatus("loading");
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          });
        });
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus("granted");
        setIsManualLocation(false);
        setManualAddress(null);
        return true;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationStatus("denied");
        setErrorMessage("Location permission is required to find nearby stores");
        return false;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
      setLocationStatus("granted");
      setIsManualLocation(false);
      setManualAddress(null);
      return true;
    } catch (error) {
      console.error("Location error:", error);
      setLocationStatus("unavailable");
      setErrorMessage("Unable to get your location. Please try again.");
      return false;
    }
  }, []);

  // New function to set manual location
  const setManualLocationFunc = useCallback((manualLoc: ManualLocation) => {
    setLocation({
      latitude: manualLoc.latitude,
      longitude: manualLoc.longitude,
    });
    setIsManualLocation(true);
    setManualAddress(manualLoc.address);
    setLocationStatus("granted");
    setErrorMessage(null);
  }, []);

  // Clear manual location and return to GPS
  const clearManualLocation = useCallback(() => {
    setIsManualLocation(false);
    setManualAddress(null);
    // This will trigger useCurrentLocation
  }, []);

  // Use current GPS location
  const useCurrentLocation = useCallback(async () => {
    await requestLocationPermission();
  }, [requestLocationPermission]);

  useEffect(() => {
    const checkInitialPermission = async () => {
      if (Platform.OS === "web") {
        if ("geolocation" in navigator) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 300000,
              });
            });
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
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
            accuracy: Location.Accuracy.Balanced,
          });
          setLocation({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          });
          setLocationStatus("granted");
        } catch {
          setLocationStatus("unavailable");
        }
      } else {
        setLocationStatus("denied");
      }
    };

    // Only auto-load GPS if not using manual location
    if (!isManualLocation) {
      checkInitialPermission();
    }
  }, [isManualLocation]);

  const store: StoreInfo | null = availabilityData?.available
    ? {
        id: availabilityData.store.id,
        name: availabilityData.store.name,
        address: availabilityData.store.address,
        distanceKm: availabilityData.store.distanceKm,
        codAllowed: availabilityData.store.codAllowed,
      }
    : null;

  const storeAvailable = !!availabilityData?.available;
  const codAllowed = availabilityData?.codAllowed ?? false;
  const estimatedDeliveryMinutes = availabilityData?.estimatedDeliveryMinutes ?? null;

  return (
    <LocationContext.Provider
      value={{
        location,
        locationStatus,
        store,
        storeAvailable,
        codAllowed,
        estimatedDeliveryMinutes,
        isCheckingAvailability,
        errorMessage,
        isManualLocation,
        manualAddress,
        requestLocationPermission,
        refreshStoreAvailability,
        setManualLocation: setManualLocationFunc,
        clearManualLocation,
        useCurrentLocation,
      }}
    >
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