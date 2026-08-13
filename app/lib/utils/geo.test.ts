import { describe, it } from "node:test";
import { expect } from "expect";
import {
  haversineMeters,
  distanceToSegmentMeters,
  distanceToPolylineMeters,
  isValidLatLon,
  type LatLon,
} from "./geo";

// ─── Fixtures ────────────────────────────────────────────────────────────────
// A short west→east leg along the Istanbul waterfront, and a north-offset point.
const WEST: LatLon = [41.0, 29.0];
const EAST: LatLon = [41.0, 29.1];

describe("isValidLatLon", () => {
  it("accepts in-range coordinates including the poles and antimeridian", () => {
    expect(isValidLatLon(WEST)).toBe(true);
    expect(isValidLatLon([90, 180])).toBe(true);
    expect(isValidLatLon([-90, -180])).toBe(true);
    expect(isValidLatLon([0, 0])).toBe(true);
  });

  it("rejects out-of-range coordinates", () => {
    expect(isValidLatLon([91, 0])).toBe(false);
    expect(isValidLatLon([0, 181])).toBe(false);
    // The shape of value @mapbox/polyline yields when fed a corrupted string.
    expect(isValidLatLon([0.000227, -1_210_819.16776])).toBe(false);
  });

  it("rejects non-finite coordinates", () => {
    expect(isValidLatLon([NaN, 0])).toBe(false);
    expect(isValidLatLon([0, Infinity])).toBe(false);
  });
});

describe("haversineMeters", () => {
  it("returns zero for identical points", () => {
    expect(haversineMeters(WEST, WEST)).toBe(0);
  });

  it("measures one degree of latitude as ~111km", () => {
    const d = haversineMeters([41.0, 29.0], [42.0, 29.0]);
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });

  it("shrinks a degree of longitude by cos(latitude)", () => {
    // At 41°N a degree of longitude is ~111km * cos(41°) ≈ 84km.
    const d = haversineMeters([41.0, 29.0], [41.0, 30.0]);
    expect(d).toBeGreaterThan(83_000);
    expect(d).toBeLessThan(85_500);
  });

  it("is symmetric", () => {
    expect(haversineMeters(WEST, EAST)).toBeCloseTo(
      haversineMeters(EAST, WEST),
      6
    );
  });
});

describe("distanceToSegmentMeters", () => {
  it("returns ~0 for a point on the segment", () => {
    const midpoint: LatLon = [41.0, 29.05];
    expect(distanceToSegmentMeters(midpoint, WEST, EAST)).toBeLessThan(1);
  });

  it("measures perpendicular offset from the middle of the segment", () => {
    // ~0.01° north of the line ≈ 1.11km, perpendicular to an east-west segment.
    const offset: LatLon = [41.01, 29.05];
    const d = distanceToSegmentMeters(offset, WEST, EAST);
    expect(d).toBeGreaterThan(1_050);
    expect(d).toBeLessThan(1_170);
  });

  it("clamps beyond the segment end rather than measuring to the infinite line", () => {
    // Due east of EAST: the nearest point on the segment is the EAST endpoint,
    // so distance should match the endpoint distance, not collapse to zero.
    const beyond: LatLon = [41.0, 29.2];
    const d = distanceToSegmentMeters(beyond, WEST, EAST);
    const toEndpoint = haversineMeters(beyond, EAST);
    expect(d).toBeCloseTo(toEndpoint, -1);
    expect(d).toBeGreaterThan(8_000);
  });

  it("handles a degenerate zero-length segment", () => {
    const d = distanceToSegmentMeters(EAST, WEST, WEST);
    expect(d).toBeCloseTo(haversineMeters(EAST, WEST), -1);
  });

  it("does not overstate longitude offsets at high latitude", () => {
    // Guards the cos(lat) scaling: without it, an east offset would be
    // measured as if it were a latitude offset (~2x too large at 60°N).
    const a: LatLon = [60.0, 10.0];
    const b: LatLon = [60.5, 10.0]; // north-south segment
    const east: LatLon = [60.0, 10.1];
    const d = distanceToSegmentMeters(east, a, b);
    // 0.1° lon at 60°N ≈ 5.6km, not the ~11.1km an unscaled projection gives.
    expect(d).toBeGreaterThan(5_000);
    expect(d).toBeLessThan(6_200);
  });
});

describe("distanceToPolylineMeters", () => {
  // An L-shaped corridor: east along 41.0, then north up 29.1.
  const CORRIDOR: LatLon[] = [
    [41.0, 29.0],
    [41.0, 29.1],
    [41.1, 29.1],
  ];

  it("returns Infinity for an empty polyline so callers cannot read it as on-route", () => {
    expect(distanceToPolylineMeters(WEST, [])).toBe(Infinity);
  });

  it("falls back to point distance for a single-point polyline", () => {
    expect(distanceToPolylineMeters(EAST, [WEST])).toBeCloseTo(
      haversineMeters(EAST, WEST),
      -1
    );
  });

  it("returns ~0 for a point sitting on a vertex", () => {
    expect(distanceToPolylineMeters([41.0, 29.1], CORRIDOR)).toBeLessThan(1);
  });

  it("picks the nearest leg, not the first", () => {
    // Near the northern (second) leg; the first leg is far away.
    const nearSecondLeg: LatLon = [41.09, 29.105];
    const d = distanceToPolylineMeters(nearSecondLeg, CORRIDOR);
    expect(d).toBeLessThan(500);
  });

  it("measures a genuine excursion from the corridor", () => {
    // ~0.05° south of the first leg ≈ 5.5km off route.
    const strayed: LatLon = [40.95, 29.05];
    const d = distanceToPolylineMeters(strayed, CORRIDOR);
    expect(d).toBeGreaterThan(5_000);
    expect(d).toBeLessThan(6_000);
  });

  it("treats a point inside the L's corner as off-route", () => {
    // The corner's inside diagonal is not covered by either leg.
    const insideCorner: LatLon = [41.05, 29.05];
    const d = distanceToPolylineMeters(insideCorner, CORRIDOR);
    expect(d).toBeGreaterThan(1_000);
  });
});
