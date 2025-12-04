import { Coordinates } from '../types';

export function calculateDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371;
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

export function calculatePrice(distanceKm: number): number {
  const basePrice = 2.5;
  const pricePerKm = 1.2;
  return basePrice + distanceKm * pricePerKm;
}

export function calculateETA(distanceKm: number): number {
  const averageSpeedKmh = 30;
  return (distanceKm / averageSpeedKmh) * 60;
}

export function interpolateCoordinates(
  start: Coordinates,
  end: Coordinates,
  fraction: number
): Coordinates {
  return {
    latitude: start.latitude + (end.latitude - start.latitude) * fraction,
    longitude: start.longitude + (end.longitude - start.longitude) * fraction,
  };
}
