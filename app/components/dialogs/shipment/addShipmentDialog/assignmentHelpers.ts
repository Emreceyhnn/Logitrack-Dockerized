import type { TrailerWithRelations } from "@/app/lib/type/trailer";
import type { DriverWithRelations } from "@/app/lib/type/driver";

/** Weight/volume tolerance for capacity comparisons (floating-point slack). */
const TOLERANCE = 0.01;

export interface TrailerOption {
  trailer: TrailerWithRelations;
  /** Remaining weight capacity in kg (maxLoad − current load). */
  availableWeight: number;
  /** Remaining volume capacity in m³. */
  availableVolume: number;
  /** Operational: status AVAILABLE. */
  isAvailable: boolean;
  /** Fits the requested weight AND volume within tolerance. */
  fitsCapacity: boolean;
  /** Eligible = available AND fits — the ones we surface as selectable. */
  eligible: boolean;
}

/**
 * Annotate each trailer for the shipment picker: how much capacity is left,
 * whether it's operational, and whether it fits the requested load. The dialog
 * uses `eligible` to filter, and the badges use the individual flags/numbers so
 * the worker sees *why* a trailer is or isn't offered — status + capacity up
 * front instead of a post-selection warning.
 */
export function annotateTrailers(
  trailers: TrailerWithRelations[],
  requestedWeightKg: number,
  requestedVolumeM3: number
): TrailerOption[] {
  return trailers.map((trailer) => {
    const availableWeight = trailer.maxLoadKg - (trailer.currentWeightKg || 0);
    const availableVolume =
      trailer.capacityVolumeM3 - (trailer.currentVolumeM3 || 0);
    const isAvailable = trailer.status === "AVAILABLE" || trailer.status === "IN_USE";
    // maxLoadKg 0 = capacity untracked → don't block on it.
    const weightOk =
      trailer.maxLoadKg <= 0 ||
      Math.round(requestedWeightKg * 100) / 100 <= availableWeight + TOLERANCE;
    const volumeOk =
      trailer.capacityVolumeM3 <= 0 ||
      Math.round(requestedVolumeM3 * 100) / 100 <= availableVolume + TOLERANCE;
    const fitsCapacity = weightOk && volumeOk;
    return {
      trailer,
      availableWeight,
      availableVolume,
      isAvailable,
      fitsCapacity,
      eligible: isAvailable && fitsCapacity,
    };
  });
}

/** Eligible trailers first, then by most remaining weight capacity. */
export function sortTrailerOptions(options: TrailerOption[]): TrailerOption[] {
  return [...options].sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    return b.availableWeight - a.availableWeight;
  });
}

export interface DriverOption {
  driver: DriverWithRelations;
  /** Operational: not on leave or off duty (ON_JOB drivers can still take a
   *  queued shipment, so only OFF_DUTY/ON_LEAVE are treated as unavailable). */
  isAvailable: boolean;
  /** 0–5 rating, or null when unrated. Drives the score badge. */
  rating: number | null;
}

/** A driver is unavailable when off duty or on leave. */
export function isDriverAvailable(driver: DriverWithRelations): boolean {
  return driver.status !== "OFF_DUTY" && driver.status !== "ON_LEAVE";
}

/**
 * Annotate + order drivers for the picker: available first, then by rating
 * (highest first), so the best fit is at the top. Score/availability come from
 * the driver record so the badge is visible at assignment time.
 */
export function annotateDrivers(
  drivers: DriverWithRelations[]
): DriverOption[] {
  return drivers
    .map((driver) => ({
      driver,
      isAvailable: isDriverAvailable(driver),
      rating: driver.rating,
    }))
    .sort((a, b) => {
      if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
      return (b.rating ?? -1) - (a.rating ?? -1);
    });
}
