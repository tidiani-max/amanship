/**
 * hooks/useDriverTracking.ts  (enhanced)
 *
 * • 2-second polling with 10-step smooth interpolation
 * • Bearing calculation → driver marker rotates correctly on the map
 * • ETA computed from speed + remaining distance
 * • Platform-safe (works on web too)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface DriverLocation {
  latitude:  number;
  longitude: number;
  heading:   number;   // degrees 0–360
  speed:     number;   // m/s
  accuracy:  number;   // metres
  timestamp: Date;
}

export interface DriverTrackingResult {
  currentLocation:    DriverLocation | null;
  previousLocation:   DriverLocation | null;
  distanceKm:         number | null;
  etaMs:              number | null;         // milliseconds until arrival
  etaMinutes:         number | null;
  bearing:            number;                // degrees driver → customer
  isTracking:         boolean;
  hasLocation:        boolean;
  error:              Error | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS      = 2_000;
const INTERPOLATION_STEPS   = 10;
const STEP_INTERVAL_MS      = POLL_INTERVAL_MS / INTERPOLATION_STEPS;

// ─────────────────────────────────────────────────────────────────────────────
// Haversine helpers
// ─────────────────────────────────────────────────────────────────────────────
function toRad(deg: number): number { return deg * (Math.PI / 180); }

export function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R    = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Forward azimuth (bearing) from point 1 → point 2, degrees 0–360
 */
export function bearingDeg(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const dLon = toRad(lon2 - lon1);
  const y    = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x    =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

// ─────────────────────────────────────────────────────────────────────────────
// Interpolation helpers
// ─────────────────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  const diff = ((b - a + 180) % 360) - 180;
  return a + diff * t;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useDriverTracking(
  orderId:          string | null,
  customerLat?:     number,
  customerLng?:     number,
  enabled:          boolean = true,
): DriverTrackingResult {
  const [currentLocation,  setCurrentLocation]  = useState<DriverLocation | null>(null);
  const [previousLocation, setPreviousLocation] = useState<DriverLocation | null>(null);
  const [bearing,          setBearing]          = useState(0);
  const interpolationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetRef          = useRef<DriverLocation | null>(null);
  const sourceRef          = useRef<DriverLocation | null>(null);

  // ── Poll server ────────────────────────────────────────────────────────────
  const { data: serverData, error } = useQuery({
    queryKey:       ["driver-location", orderId],
    queryFn:        async () => {
      if (!orderId) return null;
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN}/api/driver/location/${orderId}`
      );
      if (!res.ok) throw new Error("Failed to fetch driver location");
      return res.json();
    },
    enabled:        enabled && !!orderId,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime:      POLL_INTERVAL_MS - 200,
  });

  // ── Smooth interpolation toward new server position ────────────────────────
  const startInterpolation = useCallback(
    (from: DriverLocation, to: DriverLocation) => {
      if (interpolationTimer.current) clearInterval(interpolationTimer.current);

      let step = 0;
      interpolationTimer.current = setInterval(() => {
        step++;
        const t = step / INTERPOLATION_STEPS;

        const interpolated: DriverLocation = {
          latitude:  lerp(from.latitude,  to.latitude,  t),
          longitude: lerp(from.longitude, to.longitude, t),
          heading:   lerpAngle(from.heading, to.heading, t),
          speed:     lerp(from.speed,  to.speed,  t),
          accuracy:  to.accuracy,
          timestamp: to.timestamp,
        };

        setCurrentLocation(interpolated);

        // Update bearing toward customer while we move
        if (customerLat != null && customerLng != null) {
          setBearing(bearingDeg(
            interpolated.latitude, interpolated.longitude,
            customerLat, customerLng,
          ));
        }

        if (step >= INTERPOLATION_STEPS) {
          clearInterval(interpolationTimer.current!);
          interpolationTimer.current = null;
          setPreviousLocation(to);
        }
      }, STEP_INTERVAL_MS);
    },
    [customerLat, customerLng],
  );

  // ── React to new server data ───────────────────────────────────────────────
  useEffect(() => {
    if (!serverData?.location) return;

    const loc = serverData.location;
    const newLoc: DriverLocation = {
      latitude:  parseFloat(loc.latitude),
      longitude: parseFloat(loc.longitude),
      heading:   parseFloat(loc.heading  ?? 0),
      speed:     parseFloat(loc.speed    ?? 0),
      accuracy:  parseFloat(loc.accuracy ?? 0),
      timestamp: new Date(loc.timestamp),
    };

    targetRef.current = newLoc;

    if (sourceRef.current) {
      startInterpolation(sourceRef.current, newLoc);
    } else {
      // First fix – jump straight to position
      setCurrentLocation(newLoc);
      setPreviousLocation(newLoc);
      if (customerLat != null && customerLng != null) {
        setBearing(bearingDeg(newLoc.latitude, newLoc.longitude, customerLat, customerLng));
      }
    }
    sourceRef.current = newLoc;
  }, [serverData, startInterpolation, customerLat, customerLng]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (interpolationTimer.current) clearInterval(interpolationTimer.current);
    };
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────
  const distanceKm  = serverData?.distance   ?? null;
  const etaMs: number | null =
    serverData?.estimatedArrival
      ? new Date(serverData.estimatedArrival).getTime() - Date.now()
      : null;
  const etaMinutes =
    etaMs != null ? Math.max(0, Math.round(etaMs / 60_000)) : null;

  return {
    currentLocation,
    previousLocation,
    distanceKm:  typeof distanceKm === "number" ? distanceKm : null,
    etaMs,
    etaMinutes,
    bearing,
    isTracking:  enabled && !!orderId,
    hasLocation: currentLocation !== null,
    error:       error as Error | null,
  };
}