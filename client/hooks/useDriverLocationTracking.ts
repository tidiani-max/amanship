import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

interface DriverLocation {
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  accuracy: number;
  timestamp: Date;
}

interface UseDriverTrackingResult {
  currentLocation: DriverLocation | null;
  distance: number | null;
  eta: number | null;
  isTracking: boolean;
  error: Error | null;
}

const UPDATE_INTERVAL = 2000; // 2 seconds
const INTERPOLATION_STEPS = 10; // Smooth animation in 10 steps

/**
 * Custom hook for real-time driver location tracking with smooth interpolation
 * 
 * @param orderId - The order ID to track
 * @param enabled - Whether tracking should be active
 * @returns Driver location data with smooth position updates
 */
export function useDriverTracking(
  orderId: string | null,
  enabled: boolean = true
): UseDriverTrackingResult {
  const [currentLocation, setCurrentLocation] = useState<DriverLocation | null>(null);
  const [previousLocation, setPreviousLocation] = useState<DriverLocation | null>(null);
  const interpolationRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch driver location from server
  const { 
    data: serverData, 
    error,
    isLoading 
  } = useQuery({
    queryKey: ['driver-location', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN}/api/driver/location/${orderId}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch driver location');
      }
      
      return response.json();
    },
    enabled: enabled && !!orderId,
    refetchInterval: UPDATE_INTERVAL,
    staleTime: UPDATE_INTERVAL - 500, // Prevent unnecessary refetches
  });

  // Interpolate between previous and new location for smooth movement
  useEffect(() => {
    if (!serverData?.location) return;

    const newLocation: DriverLocation = {
      latitude: parseFloat(serverData.location.latitude),
      longitude: parseFloat(serverData.location.longitude),
      heading: parseFloat(serverData.location.heading || 0),
      speed: parseFloat(serverData.location.speed || 0),
      accuracy: parseFloat(serverData.location.accuracy || 0),
      timestamp: new Date(serverData.location.timestamp),
    };

    // If we have a previous location, interpolate smoothly
    if (currentLocation && previousLocation) {
      let step = 0;
      const stepInterval = UPDATE_INTERVAL / INTERPOLATION_STEPS;

      // Clear any existing interpolation
      if (interpolationRef.current) {
        clearInterval(interpolationRef.current);
      }

      // Interpolate position
      interpolationRef.current = setInterval(() => {
        step++;
        const progress = step / INTERPOLATION_STEPS;

        if (progress >= 1) {
          setCurrentLocation(newLocation);
          setPreviousLocation(newLocation);
          if (interpolationRef.current) {
            clearInterval(interpolationRef.current);
          }
          return;
        }

        // Linear interpolation (lerp)
        const interpolated: DriverLocation = {
          latitude: lerp(currentLocation.latitude, newLocation.latitude, progress),
          longitude: lerp(currentLocation.longitude, newLocation.longitude, progress),
          heading: lerpAngle(currentLocation.heading, newLocation.heading, progress),
          speed: lerp(currentLocation.speed, newLocation.speed, progress),
          accuracy: newLocation.accuracy,
          timestamp: newLocation.timestamp,
        };

        setCurrentLocation(interpolated);
      }, stepInterval);
    } else {
      // First location or no interpolation needed
      setCurrentLocation(newLocation);
      setPreviousLocation(newLocation);
    }

    return () => {
      if (interpolationRef.current) {
        clearInterval(interpolationRef.current);
      }
    };
  }, [serverData]);

  return {
    currentLocation,
    distance: serverData?.distance || null,
    eta: serverData?.estimatedArrival 
      ? new Date(serverData.estimatedArrival).getTime() - Date.now() 
      : null,
    isTracking: enabled && !isLoading,
    error: error as Error | null,
  };
}

/**
 * Linear interpolation between two values
 */
function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

/**
 * Interpolate between two angles (handles 360° wrapping)
 */
function lerpAngle(start: number, end: number, progress: number): number {
  const diff = ((end - start + 180) % 360) - 180;
  return start + diff * progress;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate bearing between two coordinates
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  
  const bearing = Math.atan2(y, x);
  return (bearing * 180 / Math.PI + 360) % 360;
}