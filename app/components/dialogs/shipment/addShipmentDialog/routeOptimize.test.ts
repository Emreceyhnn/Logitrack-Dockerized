import { describe, it } from "node:test";
import { expect } from "expect";
import {
  optimizeStopOrder,
  canOptimize,
  sameOrder,
} from "./routeOptimize";
import type { ShipmentStopWithRelations } from "@/app/lib/type/shipment";

function stop(
  id: string,
  lat: number | null,
  lng: number | null
): ShipmentStopWithRelations {
  return {
    id,
    customerId: null,
    customerLocationId: null,
    address: id,
    lat,
    lng,
    sequence: 0,
    contactEmail: "",
  } as ShipmentStopWithRelations;
}

const origin = { lat: 0, lng: 0 };

describe("optimizeStopOrder()", () => {
  it("should_OrderNearestFirstFromOrigin", () => {
    // Deliberately out of order: far, near, mid.
    const stops = [stop("far", 3, 0), stop("near", 1, 0), stop("mid", 2, 0)];
    const out = optimizeStopOrder(stops, origin);
    expect(out.map((s) => s.id)).toEqual(["near", "mid", "far"]);
  });

  it("should_ReturnOriginalOrder_WhenNoOrigin", () => {
    const stops = [stop("b", 2, 0), stop("a", 1, 0)];
    expect(optimizeStopOrder(stops, null).map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("should_ReturnOriginalOrder_WithFewerThanTwoLocatedStops", () => {
    const stops = [stop("only", 1, 0), stop("nocoord", null, null)];
    expect(optimizeStopOrder(stops, origin).map((s) => s.id)).toEqual([
      "only",
      "nocoord",
    ]);
  });

  it("should_KeepUnlocatedStopsAtTheEnd", () => {
    const stops = [
      stop("far", 3, 0),
      stop("nocoord", null, null),
      stop("near", 1, 0),
    ];
    const out = optimizeStopOrder(stops, origin);
    expect(out.map((s) => s.id)).toEqual(["near", "far", "nocoord"]);
  });

  it("should_NotMutateInput", () => {
    const stops = [stop("far", 3, 0), stop("near", 1, 0)];
    const before = stops.map((s) => s.id);
    optimizeStopOrder(stops, origin);
    expect(stops.map((s) => s.id)).toEqual(before);
  });
});

describe("canOptimize()", () => {
  it("should_BeFalse_WithoutOrigin", () => {
    expect(canOptimize([stop("a", 1, 0), stop("b", 2, 0)], null)).toBe(false);
  });
  it("should_BeFalse_WithOneLocatedStop", () => {
    expect(canOptimize([stop("a", 1, 0)], origin)).toBe(false);
  });
  it("should_BeTrue_WithOriginAndTwoLocatedStops", () => {
    expect(canOptimize([stop("a", 1, 0), stop("b", 2, 0)], origin)).toBe(true);
  });
});

describe("sameOrder()", () => {
  it("should_DetectIdenticalOrder", () => {
    const a = [stop("x", 1, 1), stop("y", 2, 2)];
    expect(sameOrder(a, [...a])).toBe(true);
  });
  it("should_DetectDifferentOrder", () => {
    const a = [stop("x", 1, 1), stop("y", 2, 2)];
    expect(sameOrder(a, [a[1]!, a[0]!])).toBe(false);
  });
});
