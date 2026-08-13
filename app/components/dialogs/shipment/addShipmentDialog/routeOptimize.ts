import type { ShipmentStopWithRelations } from "@/app/lib/type/shipment";

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Squared great-circle-ish distance proxy. We only ever *compare* distances to
 * pick the nearest next stop, so the cheap equirectangular approximation (no
 * sqrt, latitude-corrected longitude) is enough and avoids trig per pair.
 */
function distanceProxy(a: LatLng, b: LatLng): number {
  const meanLatRad = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dLat = a.lat - b.lat;
  const dLng = (a.lng - b.lng) * Math.cos(meanLatRad);
  return dLat * dLat + dLng * dLng;
}

const hasCoords = (
  s: ShipmentStopWithRelations
): s is ShipmentStopWithRelations & { lat: number; lng: number } =>
  typeof s.lat === "number" && typeof s.lng === "number";

/**
 * Greedy nearest-neighbour ordering of stops starting from `origin`: repeatedly
 * append the closest not-yet-visited stop. A fast, dependency-free heuristic —
 * not a true TSP solver, but it turns an arbitrary drag order into a sensible
 * "visit the nearest next" sequence the dispatcher can accept or tweak.
 *
 * Stops without coordinates can't be placed geometrically, so they're kept in
 * their original relative order and appended after the optimised ones.
 * Returns a new array; never mutates the input.
 */
export function optimizeStopOrder(
  stops: ShipmentStopWithRelations[],
  origin: LatLng | null
): ShipmentStopWithRelations[] {
  const located = stops.filter(hasCoords);
  const unlocated = stops.filter((s) => !hasCoords(s));

  // Need an origin and at least two placeable stops for ordering to mean
  // anything; otherwise hand back the original order unchanged.
  if (!origin || located.length < 2) return [...stops];

  const remaining = [...located];
  const ordered: ShipmentStopWithRelations[] = [];
  let cursor: LatLng = origin;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const stop = remaining[i]!;
      const d = distanceProxy(cursor, { lat: stop.lat!, lng: stop.lng! });
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const [next] = remaining.splice(bestIdx, 1);
    ordered.push(next!);
    cursor = { lat: next!.lat!, lng: next!.lng! };
  }

  return [...ordered, ...unlocated];
}

/** True when optimisation could change something: an origin plus ≥2 located stops. */
export function canOptimize(
  stops: ShipmentStopWithRelations[],
  origin: LatLng | null
): boolean {
  if (!origin) return false;
  return stops.filter(hasCoords).length >= 2;
}

/** Whether two orderings are identical by stop id — used to detect a no-op. */
export function sameOrder(
  a: ShipmentStopWithRelations[],
  b: ShipmentStopWithRelations[]
): boolean {
  if (a.length !== b.length) return false;
  return a.every((stop, i) => stop.id === b[i]?.id);
}
