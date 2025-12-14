import { storage } from "./storage";
import type { Store } from "@shared/schema";

const EARTH_RADIUS_KM = 6371;
const MAX_DELIVERY_RADIUS_KM = 5;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

export interface StoreWithDistance extends Store {
  distanceKm: number;
  hasOnlinePicker: boolean;
  hasOnlineDriver: boolean;
  isAvailable: boolean;
}

export async function findNearestAvailableStore(
  customerLat: number,
  customerLng: number
): Promise<StoreWithDistance | null> {
  const stores = await storage.getStores();
  
  const storesWithDistance: StoreWithDistance[] = [];
  
  for (const store of stores) {
    if (!store.isActive) continue;
    
    const storeLat = parseFloat(String(store.latitude));
    const storeLng = parseFloat(String(store.longitude));
    
    const distanceKm = calculateHaversineDistance(
      customerLat,
      customerLng,
      storeLat,
      storeLng
    );
    
    if (distanceKm > MAX_DELIVERY_RADIUS_KM) continue;
    
    const onlineStaff = await storage.getOnlineStaffByStore(store.id);
    const hasOnlinePicker = onlineStaff.pickers.length > 0;
    const hasOnlineDriver = onlineStaff.drivers.length > 0;
    const isAvailable = hasOnlinePicker && hasOnlineDriver;
    
    storesWithDistance.push({
      ...store,
      distanceKm,
      hasOnlinePicker,
      hasOnlineDriver,
      isAvailable,
    });
  }
  
  const availableStores = storesWithDistance.filter(s => s.isAvailable);
  
  if (availableStores.length === 0) return null;
  
  availableStores.sort((a, b) => a.distanceKm - b.distanceKm);
  
  return availableStores[0];
}

export async function getStoresWithAvailability(
  customerLat: number,
  customerLng: number
): Promise<StoreWithDistance[]> {
  const stores = await storage.getStores();
  
  const storesWithDistance: StoreWithDistance[] = [];
  
  for (const store of stores) {
    if (!store.isActive) continue;
    
    const storeLat = parseFloat(String(store.latitude));
    const storeLng = parseFloat(String(store.longitude));
    
    const distanceKm = calculateHaversineDistance(
      customerLat,
      customerLng,
      storeLat,
      storeLng
    );
    
    const onlineStaff = await storage.getOnlineStaffByStore(store.id);
    const hasOnlinePicker = onlineStaff.pickers.length > 0;
    const hasOnlineDriver = onlineStaff.drivers.length > 0;
    const isAvailable = hasOnlinePicker && hasOnlineDriver && distanceKm <= MAX_DELIVERY_RADIUS_KM;
    
    storesWithDistance.push({
      ...store,
      distanceKm,
      hasOnlinePicker,
      hasOnlineDriver,
      isAvailable,
    });
  }
  
  storesWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);
  
  return storesWithDistance;
}

export function checkDeliveryAvailable(distanceKm: number): boolean {
  return distanceKm <= MAX_DELIVERY_RADIUS_KM;
}

export function estimateDeliveryTime(distanceKm: number): number {
  const basePickingTime = 5;
  const speedKmPerMin = 0.5;
  const deliveryTime = Math.ceil(distanceKm / speedKmPerMin);
  return basePickingTime + deliveryTime;
}
