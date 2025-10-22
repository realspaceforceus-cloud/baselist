/**
 * Calculate distance between two coordinates in miles
 * Uses the Haversine formula
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3959; // Earth's radius in miles

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Get user's current coordinates using geolocation API
 * @returns Promise resolving to {latitude, longitude} or null if denied/unavailable
 */
export async function getUserLocation(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        // User denied permission or error occurred
        resolve(null);
      },
      {
        timeout: 5000,
        enableHighAccuracy: false,
      },
    );
  });
}

/**
 * Interface for a base with distance information
 */
export interface BaseWithDistance {
  id: string;
  name: string;
  abbreviation: string;
  region: string;
  timezone: string;
  latitude: number;
  longitude: number;
  distance?: number;
}

/**
 * Get the 3 closest bases to user location
 * @param userLocation User's current {latitude, longitude}
 * @param bases Array of bases
 * @returns Top 3 closest bases with distance, sorted by distance
 */
export function getClosestBases(
  userLocation: { latitude: number; longitude: number } | null,
  bases: BaseWithDistance[],
): BaseWithDistance[] {
  if (!userLocation) {
    return [];
  }

  const basesWithDistance = bases.map((base) => ({
    ...base,
    distance: calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      base.latitude,
      base.longitude,
    ),
  }));

  return basesWithDistance
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
    .slice(0, 3);
}
