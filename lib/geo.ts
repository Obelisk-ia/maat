// Shared geolocation helpers for proximity push notifications and nearby audiences.

export type Coordinates = {
  lat: number;
  lng: number;
};

export const minProximityRadiusMeters = 100;
export const maxProximityRadiusMeters = 5000;
export const defaultProximityRadiusMeters = 500;
export const proximityRadiusOptions = [200, 500, 1000, 2000, 5000] as const;

export const minProximityCooldownDays = 1;
export const maxProximityCooldownDays = 30;
export const defaultProximityCooldownDays = 1;
export const proximityCooldownOptions = [1, 3, 7, 15, 30] as const;

export const defaultProximityMessage = "{nombre}, estás cerca de {negocio}. ¡Pasa por tu sello!";

export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Great-circle distance between two coordinates in meters (Haversine). */
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Extracts coordinates from raw "lat, lng" text or a Google Maps URL
 * (supports @lat,lng, ?q=lat,lng, &ll=lat,lng, and !3dlat!4dlng).
 */
export function parseLocationInput(input: string): Coordinates | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const patterns = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|ll|query|center)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (!match) continue;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (isValidCoordinates(lat, lng)) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }
  return null;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${Number.isInteger(km) ? km : km.toFixed(1)} km`;
}

export function formatCoordinates({ lat, lng }: Coordinates): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
