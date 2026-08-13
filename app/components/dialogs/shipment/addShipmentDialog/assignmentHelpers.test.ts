import { describe, it } from "node:test";
import { expect } from "expect";
import {
  annotateTrailers,
  sortTrailerOptions,
  annotateDrivers,
  isDriverAvailable,
} from "./assignmentHelpers";
import type { TrailerWithRelations } from "@/app/lib/type/trailer";
import type { DriverWithRelations } from "@/app/lib/type/driver";

function trailer(
  over: Partial<TrailerWithRelations> & { id: string }
): TrailerWithRelations {
  return {
    id: over.id,
    fleetNo: over.fleetNo ?? over.id,
    plate: over.plate ?? over.id,
    type: over.type ?? "DRY_VAN",
    capacityVolumeM3: over.capacityVolumeM3 ?? 50,
    maxLoadKg: over.maxLoadKg ?? 1000,
    isColdChain: over.isColdChain ?? false,
    status: over.status ?? "AVAILABLE",
    currentWeightKg: over.currentWeightKg ?? 0,
    currentVolumeM3: over.currentVolumeM3 ?? 0,
  } as TrailerWithRelations;
}

function driver(
  over: Partial<DriverWithRelations> & { id: string }
): DriverWithRelations {
  return {
    id: over.id,
    status: over.status ?? "ON_JOB",
    rating: over.rating ?? null,
    user: { name: over.id, surname: "" },
  } as unknown as DriverWithRelations;
}

describe("annotateTrailers()", () => {
  it("should_MarkAvailableFittingTrailer_AsEligible", () => {
    const [opt] = annotateTrailers(
      [trailer({ id: "t1", maxLoadKg: 1000, capacityVolumeM3: 50 })],
      500,
      20
    );
    expect(opt?.eligible).toBe(true);
    expect(opt?.availableWeight).toBe(1000);
  });

  it("should_NotBeEligible_WhenOutOfService", () => {
    const [opt] = annotateTrailers(
      [trailer({ id: "t1", status: "MAINTENANCE" })],
      100,
      1
    );
    expect(opt?.isAvailable).toBe(false);
    expect(opt?.eligible).toBe(false);
  });

  it("should_NotFitCapacity_WhenRequestExceedsHeadroom", () => {
    const [opt] = annotateTrailers(
      [trailer({ id: "t1", maxLoadKg: 1000, currentWeightKg: 800 })],
      500, // needs 500, only 200 free
      1
    );
    expect(opt?.fitsCapacity).toBe(false);
    expect(opt?.eligible).toBe(false);
  });

  it("should_IgnoreUntrackedCapacity_WhenMaxIsZero", () => {
    // maxLoadKg 0 = untracked → never blocks on weight.
    const [opt] = annotateTrailers(
      [trailer({ id: "t1", maxLoadKg: 0, capacityVolumeM3: 0 })],
      9999,
      9999
    );
    expect(opt?.fitsCapacity).toBe(true);
  });
});

describe("sortTrailerOptions()", () => {
  it("should_PutEligibleFirst_ThenMostCapacity", () => {
    const opts = sortTrailerOptions(
      annotateTrailers(
        [
          trailer({ id: "busy", status: "MAINTENANCE" }),
          trailer({ id: "small", maxLoadKg: 600 }),
          trailer({ id: "big", maxLoadKg: 2000 }),
        ],
        100,
        1
      )
    );
    expect(opts.map((o) => o.trailer.id)).toEqual(["big", "small", "busy"]);
  });
});

describe("isDriverAvailable()", () => {
  it("should_TreatOnJob_AsAvailable", () => {
    expect(isDriverAvailable(driver({ id: "d", status: "ON_JOB" }))).toBe(true);
  });
  it("should_TreatOffDutyAndOnLeave_AsUnavailable", () => {
    expect(isDriverAvailable(driver({ id: "d", status: "OFF_DUTY" }))).toBe(false);
    expect(isDriverAvailable(driver({ id: "d", status: "ON_LEAVE" }))).toBe(false);
  });
});

describe("annotateDrivers()", () => {
  it("should_OrderAvailableFirst_ThenByRatingDesc", () => {
    const opts = annotateDrivers([
      driver({ id: "leave", status: "ON_LEAVE", rating: 5 }),
      driver({ id: "low", status: "ON_JOB", rating: 3 }),
      driver({ id: "high", status: "ON_JOB", rating: 4.8 }),
    ]);
    // On-leave sinks despite its rating; among available, highest rating first.
    expect(opts.map((o) => o.driver.id)).toEqual(["high", "low", "leave"]);
  });
});
