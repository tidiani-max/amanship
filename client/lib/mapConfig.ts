/**
 * lib/mapConfig.ts
 * GrabMaps + OpenStreetMap tile configuration for Indonesia hyperlocal precision
 */

export type TileProvider = "grabmaps" | "carto" | "osm";

export const GRABMAPS_CONFIG = {
  maxZoom: 21,          // GrabMaps supports up to 21 vs OSM's 19
  confirmPinZoom: 18,   // Minimum for building-entrance precision
  defaultZoom: 15,
  driverTrackingZoom: 16,

  // Indonesia bounding box
  indonesiaBounds: {
    sw: { lat: -11.0, lng: 94.0 },
    ne: { lat:   6.5, lng: 141.0 },
  },

  // Urban centers that get a +2 zoom boost
  urbanCenters: [
    { name: "Jakarta",   lat: -6.2088,  lng: 106.8456, radius: 0.5 },
    { name: "Surabaya",  lat: -7.2575,  lng: 112.7521, radius: 0.4 },
    { name: "Bandung",   lat: -6.9175,  lng: 107.6191, radius: 0.35 },
    { name: "Medan",     lat:  3.5952,  lng:  98.6722, radius: 0.35 },
    { name: "Semarang",  lat: -6.9932,  lng: 110.4203, radius: 0.3 },
    { name: "Makassar",  lat: -5.1477,  lng: 119.4327, radius: 0.3 },
    { name: "Palembang", lat: -2.9761,  lng: 104.7754, radius: 0.3 },
    { name: "Tangerang", lat: -6.1702,  lng: 106.6402, radius: 0.3 },
    { name: "Depok",     lat: -6.4025,  lng: 106.7942, radius: 0.25 },
    { name: "Bekasi",    lat: -6.2349,  lng: 107.0000, radius: 0.3 },
  ],
};

/**
 * Get tile URL for given provider.
 * Keep GRABMAPS_API_KEY server-side – fetch tiles via /api/grabmaps/tiles proxy.
 */
export function getTileUrl(provider: TileProvider, apiKey?: string): string {
  switch (provider) {
    case "grabmaps":
      // Route through server proxy to hide API key from client
      return "/api/grabmaps/tiles/{z}/{x}/{y}.png";

    case "carto":
      return "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";

    case "osm":
    default:
      return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  }
}

/**
 * Check whether coordinates are within Indonesia's bounding box
 */
export function isInIndonesia(lat: number, lng: number): boolean {
  const { sw, ne } = GRABMAPS_CONFIG.indonesiaBounds;
  return lat >= sw.lat && lat <= ne.lat && lng >= sw.lng && lng <= ne.lng;
}

/**
 * Return optimal map zoom level for a location.
 * Urban centers in Indonesia get +2 over the base.
 */
export function getSmartZoom(
  lat: number,
  lng: number,
  baseZoom: number = GRABMAPS_CONFIG.defaultZoom
): number {
  if (!isInIndonesia(lat, lng)) return baseZoom;

  for (const city of GRABMAPS_CONFIG.urbanCenters) {
    const distance = Math.sqrt(
      Math.pow(lat - city.lat, 2) + Math.pow(lng - city.lng, 2)
    );
    if (distance <= city.radius) {
      return Math.min(baseZoom + 2, GRABMAPS_CONFIG.maxZoom);
    }
  }

  return baseZoom;
}

/**
 * Tile provider priority for Indonesia
 * Try GrabMaps → fallback Carto → fallback OSM
 */
export function getProviderPriority(): TileProvider[] {
  return ["grabmaps", "carto", "osm"];
}