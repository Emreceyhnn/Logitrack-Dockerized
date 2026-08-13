/**
 * CLIENT-SAFE ROUTE DEVIATION CONSTANTS
 * =====================================
 * The corridor tuning lives here rather than in `services/routeDeviation.ts`
 * so the route dialogs can import it: that service pulls in Redis and Prisma,
 * which must never reach the browser bundle. The service re-exports these, so
 * server code can keep importing from one place.
 */

/** Corridor half-width applied when a route doesn't set its own. */
export const DEFAULT_ROUTE_BUFFER_METERS = 500;

/**
 * Floor for the corridor. Below ~50m the buffer sits inside normal urban GPS
 * error, so a vehicle driving the planned road would alert on multi-path drift
 * alone.
 */
export const MIN_ROUTE_BUFFER_METERS = 50;

/**
 * Ceiling for the corridor. Past ~20km the buffer is wide enough to swallow a
 * genuine wrong-turn, which makes the alert meaningless.
 */
export const MAX_ROUTE_BUFFER_METERS = 20_000;

/** True when `value` is a usable corridor half-width. */
export function isValidBufferMeters(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= MIN_ROUTE_BUFFER_METERS &&
    value <= MAX_ROUTE_BUFFER_METERS
  );
}
