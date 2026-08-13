import { describe, it, mock, beforeEach, before } from "node:test";
import { expect } from "expect";
import { encodeShape } from "@/app/lib/valhalla";

// ─── Mocks ───────────────────────────────────────────────────────────────────
// An in-memory stand-in for Upstash Redis. Only the three commands the module
// uses are implemented; `get` returns the raw string, matching a cache miss →
// hit round trip.
const store = new Map<string, string>();

const redisMock = {
  get: mock.fn(async (key: string) => store.get(key) ?? null),
  set: mock.fn(async (key: string, value: string) => {
    store.set(key, value);
    return "OK";
  }),
  del: mock.fn(async (key: string) => {
    store.delete(key);
    return 1;
  }),
};

mock.module("@/app/lib/redis", { namedExports: { redis: redisMock } });

// ─── Fixtures ────────────────────────────────────────────────────────────────
// A straight west→east corridor along 41.0°N, ~8.4km long.
const SHAPE = encodeShape([
  [41.0, 29.0],
  [41.0, 29.1],
]);

const ROUTE_ID = "route-1";
const VEHICLE_ID = "vehicle-1";
const BUFFER = 500;

// On the centre line.
const ON_ROUTE: [number, number] = [41.0, 29.05];
// ~1.1km north of the line — comfortably outside a 500m buffer.
const OFF_ROUTE: [number, number] = [41.01, 29.05];

describe("routeDeviation", () => {
  let evaluateDeviation: typeof import("./routeDeviation").evaluateDeviation;
  let clearDeviationState: typeof import("./routeDeviation").clearDeviationState;
  let DEVIATION_CONSECUTIVE_PINGS: number;

  before(async () => {
    const mod = await import("./routeDeviation");
    evaluateDeviation = mod.evaluateDeviation;
    clearDeviationState = mod.clearDeviationState;
    DEVIATION_CONSECUTIVE_PINGS = mod.DEVIATION_CONSECUTIVE_PINGS;
  });

  beforeEach(() => {
    store.clear();
    redisMock.get.mock.resetCalls();
    redisMock.set.mock.resetCalls();
    redisMock.del.mock.resetCalls();
  });

  const ping = (
    point: [number, number],
    bufferMeters: number | null = BUFFER
  ) =>
    evaluateDeviation({
      routeId: ROUTE_ID,
      vehicleId: VEHICLE_ID,
      shape: SHAPE,
      bufferMeters,
      point,
    });

  describe("geometry gating", () => {
    it("should_Skip_WhenRouteHasNoShape", async () => {
      const result = await evaluateDeviation({
        routeId: ROUTE_ID,
        vehicleId: VEHICLE_ID,
        shape: null,
        bufferMeters: BUFFER,
        point: OFF_ROUTE,
      });

      expect(result.status).toBe("skipped");
    });

    it("should_Skip_WhenShapeDecodesToOutOfRangeCoordinates", async () => {
      // @mapbox/polyline does not validate and never throws: this string
      // decodes to tuples with a longitude near -1_210_819. Measuring against
      // that corridor would alert drivers off pure garbage.
      const result = await evaluateDeviation({
        routeId: ROUTE_ID,
        vehicleId: VEHICLE_ID,
        shape: "!!!not-a-polyline!!!",
        bufferMeters: BUFFER,
        point: OFF_ROUTE,
      });

      expect(result.status).toBe("skipped");
    });

    it("should_Skip_WhenShapeIsEmpty", async () => {
      const result = await evaluateDeviation({
        routeId: ROUTE_ID,
        vehicleId: VEHICLE_ID,
        shape: "",
        bufferMeters: BUFFER,
        point: OFF_ROUTE,
      });

      expect(result.status).toBe("skipped");
    });

    it("should_Skip_WhenPingIsNotAValidCoordinate", async () => {
      const result = await evaluateDeviation({
        routeId: ROUTE_ID,
        vehicleId: VEHICLE_ID,
        shape: SHAPE,
        bufferMeters: BUFFER,
        point: [NaN, 29.05],
      });

      expect(result.status).toBe("skipped");
    });

    it("should_ReportOnRoute_WhenInsideBuffer", async () => {
      const result = await ping(ON_ROUTE);

      expect(result.status).toBe("on_route");
    });

    it("should_UseDefaultBuffer_WhenRouteBufferIsNull", async () => {
      // 1.1km off-route with the 500m default still counts as outside.
      const result = await ping(OFF_ROUTE, null);

      expect(result.status).toBe("pending");
    });

    it("should_ReportOnRoute_WhenBufferIsWideEnoughToCoverTheOffset", async () => {
      // Same point, but a 2km corridor legitimately contains it.
      const result = await ping(OFF_ROUTE, 2_000);

      expect(result.status).toBe("on_route");
    });
  });

  describe("hysteresis", () => {
    it("should_StayPending_UntilConsecutiveThresholdIsReached", async () => {
      const results = [];
      for (let i = 0; i < DEVIATION_CONSECUTIVE_PINGS - 1; i++) {
        results.push(await ping(OFF_ROUTE));
      }

      expect(results.every((r) => r.status === "pending")).toBe(true);
    });

    it("should_RaiseAnomaly_OnTheNthConsecutiveOffRoutePing", async () => {
      let last;
      for (let i = 0; i < DEVIATION_CONSECUTIVE_PINGS; i++) {
        last = await ping(OFF_ROUTE);
      }

      expect(last?.status).toBe("anomaly");
    });

    it("should_MuteFurtherPings_AfterAlertingOnce", async () => {
      for (let i = 0; i < DEVIATION_CONSECUTIVE_PINGS; i++) {
        await ping(OFF_ROUTE);
      }

      // The excursion continues; the driver should not be re-alerted per ping.
      const next = await ping(OFF_ROUTE);
      const afterThat = await ping(OFF_ROUTE);

      expect(next.status).toBe("muted");
      expect(afterThat.status).toBe("muted");
    });

    it("should_ResetStrikes_WhenVehicleReturnsToCorridor", async () => {
      // Two strikes, then back on route: the counter must not carry over.
      await ping(OFF_ROUTE);
      await ping(OFF_ROUTE);
      await ping(ON_ROUTE);

      const afterReturn = await ping(OFF_ROUTE);

      expect(afterReturn.status).toBe("pending");
      if (afterReturn.status === "pending") {
        expect(afterReturn.strikes).toBe(1);
      }
    });

    it("should_AlertAgain_OnASecondExcursionAfterReturning", async () => {
      for (let i = 0; i < DEVIATION_CONSECUTIVE_PINGS; i++) {
        await ping(OFF_ROUTE);
      }
      await ping(ON_ROUTE); // excursion closed

      let last;
      for (let i = 0; i < DEVIATION_CONSECUTIVE_PINGS; i++) {
        last = await ping(OFF_ROUTE);
      }

      expect(last?.status).toBe("anomaly");
    });

    it("should_ReportDistance_OnEveryEvaluatedPing", async () => {
      const result = await ping(OFF_ROUTE);

      expect(result.status).toBe("pending");
      if (result.status === "pending") {
        expect(result.distanceMeters).toBeGreaterThan(1_000);
        expect(result.distanceMeters).toBeLessThan(1_200);
      }
    });
  });

  describe("state isolation", () => {
    it("should_TrackVehiclesIndependently_OnTheSameRoute", async () => {
      // One vehicle strays to the alert threshold...
      for (let i = 0; i < DEVIATION_CONSECUTIVE_PINGS; i++) {
        await ping(OFF_ROUTE);
      }

      // ...a different vehicle's first off-route ping must start from zero.
      const other = await evaluateDeviation({
        routeId: ROUTE_ID,
        vehicleId: "vehicle-2",
        shape: SHAPE,
        bufferMeters: BUFFER,
        point: OFF_ROUTE,
      });

      expect(other.status).toBe("pending");
    });

    it("should_ReArmDetector_WhenStateIsCleared", async () => {
      for (let i = 0; i < DEVIATION_CONSECUTIVE_PINGS; i++) {
        await ping(OFF_ROUTE);
      }
      await clearDeviationState(ROUTE_ID, VEHICLE_ID);

      const afterClear = await ping(OFF_ROUTE);

      expect(afterClear.status).toBe("pending");
    });

    it("should_TreatCacheFailureAsReArm_RatherThanThrowing", async () => {
      redisMock.get.mock.mockImplementationOnce(async () => {
        throw new Error("redis down");
      });

      // A degraded cache must not break GPS ingestion.
      const result = await ping(OFF_ROUTE);

      expect(result.status).toBe("pending");
    });
  });
});
