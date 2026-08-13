/**
 * Route deviation (anomaly) detection.
 *
 * A planned route is stored as an encoded polyline (`Route.shape`). Around that
 * centre line sits a corridor of half-width `Route.bufferMeters`. A GPS ping
 * outside the corridor is "off-route".
 *
 * A single off-route ping is not an anomaly: GPS drift, tunnels and multi-path
 * error in urban canyons routinely throw a fix hundreds of metres off. So an
 * alert requires DEVIATION_CONSECUTIVE_PINGS successive off-route pings, and
 * fires once per excursion — the vehicle must return to the corridor before a
 * new alert can be raised for the same route.
 *
 * Excursion state lives in Redis, keyed per route+vehicle. It is disposable:
 * losing it re-arms the detector (worst case, one duplicate alert), which is
 * why it is not in Postgres.
 */

import { redis } from "@/app/lib/redis";
import { decodeShape } from "@/app/lib/valhalla";
import {
  distanceToPolylineMeters,
  isValidLatLon,
  type LatLon,
} from "@/app/lib/utils/geo";
import { logger } from "@/app/lib/logger";

/**
 * Corridor tuning. Re-exported from `@/app/lib/type/routeDeviation` for client
 * components — importing this module from the browser would pull in Redis.
 */
export {
  DEFAULT_ROUTE_BUFFER_METERS,
  MIN_ROUTE_BUFFER_METERS,
  MAX_ROUTE_BUFFER_METERS,
} from "@/app/lib/type/routeDeviation";

import { DEFAULT_ROUTE_BUFFER_METERS } from "@/app/lib/type/routeDeviation";

/** Consecutive off-route pings required before an alert fires. */
export const DEVIATION_CONSECUTIVE_PINGS = 3;

/**
 * Excursion state TTL. Long enough to span a stationary vehicle's ping gap,
 * short enough that a finished route cleans itself up.
 */
const DEVIATION_STATE_TTL_SECONDS = 6 * 60 * 60;

export interface DeviationState {
  /** Consecutive off-route pings observed so far. */
  strikes: number;
  /** Whether an alert has already fired for the current excursion. */
  alerted: boolean;
}

export type DeviationOutcome =
  /** No shape, no buffer, or nothing to evaluate. */
  | { status: "skipped"; reason: string }
  /** Inside the corridor. */
  | { status: "on_route"; distanceMeters: number }
  /** Outside, but not yet enough strikes to alert. */
  | { status: "pending"; distanceMeters: number; strikes: number }
  /** Outside long enough — caller should notify. */
  | { status: "anomaly"; distanceMeters: number; strikes: number }
  /** Outside, already alerted for this excursion — stay silent. */
  | { status: "muted"; distanceMeters: number };

/**
 * tr-Rastgele bir rota kimliği ve araç kimliği için durum anahtarını döndürür. Anahtar biçimi: route-deviation:{routeId}:{vehicleId}
 * en-Returns the state key for a random route ID and vehicle ID. The key format is route-deviation:{routeId}:{vehicleId}
 * input (routeId: string, vehicleId: string)
 * output (string)
 *
 */
const stateKey = (routeId: string, vehicleId: string): string =>
  `route-deviation:${routeId}:${vehicleId}`;

/**
 * tr-Redis'ten bir anahtar için durum nesnesini okur. Anahtar yoksa veya okuma başarısız olursa varsayılan bir durum nesnesi döndürülür.
 * en-Reads the state object for a key from Redis. Returns a default state object if the key does not exist or reading fails.
 * input (key: string)
 * output (Promise<DeviationState>)
 *
 */
async function readState(key: string): Promise<DeviationState> {
  try {
    const raw = await redis.get(key);
    if (!raw) return { strikes: 0, alerted: false };
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return {
      strikes: Number(parsed?.strikes) || 0,
      alerted: Boolean(parsed?.alerted),
    };
  } catch (error) {
    // A degraded cache must not break location ingestion; re-arm instead.
    logger.warn("[routeDeviation] Failed to read state, resetting:", error);
    return { strikes: 0, alerted: false };
  }
}

/**
 * tr-Belirtilen durum nesnesini bir anahtar için Redis'e yazar. Redis hatası olursa günlüğe kaydeder ancak durmaz.
 * en-Writes the specified state object for a key to Redis. Logs if Redis fails but does not fail the caller.
 * input (key: string, state: DeviationState)
 * output (Promise<void>)
 *
 */
async function writeState(key: string, state: DeviationState): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(state), {
      ex: DEVIATION_STATE_TTL_SECONDS,
    });
  } catch (error) {
    logger.warn("[routeDeviation] Failed to persist state:", error);
  }
}

/**
 * tr-Rota kimliği ve araç kimliği için durum nesnesini Redis'ten temizler.
 * en-Clears the state object for a route ID and vehicle ID from Redis.
 * input (routeId: string, vehicleId: string)
 * output (Promise<void>)
 *
 */
export async function clearDeviationState(
  routeId: string,
  vehicleId: string
): Promise<void> {
  try {
    await redis.del(stateKey(routeId, vehicleId));
  } catch (error) {
    logger.warn("[routeDeviation] Failed to clear state:", error);
  }
}

/**
 * tr-Bir ping'i bir rota koridoruyla ölçer ve sapma durum makinesini ilerletir. Çağrıcının ne yapması gerektiğini döndürür; bildirimi kendisi göndermez.
 * en-Measures a ping against a route corridor and advances the excursion state machine. Returns what the caller should do; sends no notification itself.
 * input (params: { routeId: string; vehicleId: string; shape: string | null; bufferMeters: number | null; point: LatLon; })
 * output (Promise<DeviationOutcome>)
 *
 */
export async function evaluateDeviation(params: {
  routeId: string;
  vehicleId: string;
  shape: string | null;
  bufferMeters: number | null;
  point: LatLon;
}): Promise<DeviationOutcome> {
  const { routeId, vehicleId, shape, bufferMeters, point } = params;

  if (!shape) {
    return { status: "skipped", reason: "route has no shape geometry" };
  }

  if (!isValidLatLon(point)) {
    return { status: "skipped", reason: "ping is not a valid coordinate" };
  }

  let polyline: [number, number][];
  try {
    polyline = decodeShape(shape);
  } catch (error) {
    logger.warn(
      `[routeDeviation] Undecodable shape on route ${routeId}:`,
      error
    );
    return { status: "skipped", reason: "shape could not be decoded" };
  }

  if (polyline.length === 0) {
    return { status: "skipped", reason: "shape decoded to zero points" };
  }

  // The polyline decoder does not validate: a corrupted shape decodes to
  // out-of-range junk instead of throwing. Refuse to measure against a corridor
  // we cannot trust, rather than alerting a driver off garbage geometry.
  if (!polyline.every(isValidLatLon)) {
    logger.warn(
      `[routeDeviation] Route ${routeId} shape decoded to out-of-range coordinates; skipping.`
    );
    return {
      status: "skipped",
      reason: "shape decoded to invalid coordinates",
    };
  }

  const buffer =
    bufferMeters && bufferMeters > 0
      ? bufferMeters
      : DEFAULT_ROUTE_BUFFER_METERS;
  const distanceMeters = distanceToPolylineMeters(point, polyline);
  const key = stateKey(routeId, vehicleId);

  // Inside the corridor: close any open excursion so the next one can alert.
  if (distanceMeters <= buffer) {
    const state = await readState(key);
    if (state.strikes > 0 || state.alerted) {
      await writeState(key, { strikes: 0, alerted: false });
    }
    return { status: "on_route", distanceMeters };
  }

  const state = await readState(key);
  const strikes = state.strikes + 1;

  if (state.alerted) {
    // Still out, already reported this excursion.
    await writeState(key, { strikes, alerted: true });
    return { status: "muted", distanceMeters };
  }

  if (strikes < DEVIATION_CONSECUTIVE_PINGS) {
    await writeState(key, { strikes, alerted: false });
    return { status: "pending", distanceMeters, strikes };
  }

  await writeState(key, { strikes, alerted: true });
  return { status: "anomaly", distanceMeters, strikes };
}
