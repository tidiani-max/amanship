// components/MapWrapper.web.tsx
import React from 'react';
import { View } from 'react-native';

export const MapView = ({ children, style }: any) => <View style={style}>{children}</View>;
export const Marker = ({ children }: any) => <>{children}</>;
export const Polyline = () => null;
export const Circle = () => null;
export const PROVIDER_GOOGLE = null;

export const MapComponents = { MapView, Marker, Polyline, Circle, PROVIDER_GOOGLE };