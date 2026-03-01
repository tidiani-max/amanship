/**
 * components/MapWrapper.native.tsx
 * Native-only wrapper for react-native-maps
 * This file is ONLY loaded on iOS/Android, never on web
 */

import React from 'react';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps';

export { MapView, Marker, Polyline, Circle, PROVIDER_GOOGLE };

// Export all map components for easy use
export const MapComponents = {
  MapView,
  Marker,
  Polyline,
  Circle,
  PROVIDER_GOOGLE,
};