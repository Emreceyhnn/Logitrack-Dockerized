/**
 * Geodesic helpers for route corridor (buffer) checks.
 *
 * Pure functions with no I/O — safe to import from both server and client.
 *
 * Distances are in metres. Coordinates follow the Valhalla convention used by
 * `decodeShape`: tuples of [lat, lon].
 */

const EARTH_RADIUS_M = 6_371_008.8;

export type LatLon = readonly [number, number];

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * True when a coordinate is a finite, in-range WGS84 lat/lon.
 *
 * Worth checking explicitly: `@mapbox/polyline`'s decoder does not validate its
 * input and never throws — decoding a corrupted string yields well-formed
 * tuples holding absurd values (e.g. a longitude of -1_210_819). Those would
 * otherwise sail into the distance maths and produce a nonsense corridor.
 */
export function isValidLatLon(point: readonly [number, number]): boolean {
  const [lat, lon] = point;
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Great-circle distance between two points.
 */
export function haversineMeters(a: LatLon, b: LatLon): number {
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Perpendicular distance from `point` to the segment `a`→`b`.
 *
 * Works in a local equirectangular projection centred on the point: over the
 * length of a single route segment (tens of metres to a few km) the error is
 * far below GPS noise, and it avoids the cost/complexity of a full geodesic
 * solution. Longitude is scaled by cos(lat) so the projection stays metric at
 * any latitude — without this, a degree of longitude would be treated as a
 * degree of latitude and distances would be overstated by ~2x in Turkey.
 */
export function distanceToSegmentMeters(
  point: LatLon,
  a: LatLon,
  b: LatLon
): number {
  const latRef = toRad(point[0]);
  const cosLat = Math.cos(latRef);

  // Project to local metres relative to `a`.
  const toXY = (p: LatLon): [number, number] => [
    toRad(p[1] - a[1]) * cosLat * EARTH_RADIUS_M, // x = east
    toRad(p[0] - a[0]) * EARTH_RADIUS_M, // y = north
  ];

  const [px, py] = toXY(point);
  const [bx, by] = toXY(b);

  const segLenSq = bx * bx + by * by;

  // Degenerate segment (duplicate points in the shape): fall back to distance
  // from the single point.
  if (segLenSq === 0) return Math.hypot(px, py);

  // Projection scalar of `point` onto the segment, clamped so we measure to the
  // segment rather than the infinite line.
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / segLenSq));

  const projX = t * bx;
  const projY = t * by;

  return Math.hypot(px - projX, py - projY);
}

/**
 * Shortest distance from `point` to a polyline, i.e. how far the vehicle is
 * from the route corridor's centre line.
 *
 * Returns `Infinity` for an empty polyline so callers treat "no geometry" as
 * "cannot evaluate" rather than "on route".
 */
export function distanceToPolylineMeters(
  point: LatLon,
  polyline: readonly LatLon[]
): number {
  const first = polyline[0];
  if (!first) return Infinity;
  if (polyline.length === 1) return haversineMeters(point, first);

  let min = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];
    if (!a || !b) continue;
    const d = distanceToSegmentMeters(point, a, b);
    if (d < min) min = d;
    // Nothing can beat an exact hit; stop scanning the rest of the shape.
    if (min === 0) break;
  }
  return min;
}
