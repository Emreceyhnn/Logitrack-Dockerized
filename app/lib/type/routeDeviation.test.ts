import { describe, it } from "node:test";
import { expect } from "expect";
import {
  DEFAULT_ROUTE_BUFFER_METERS,
  MIN_ROUTE_BUFFER_METERS,
  MAX_ROUTE_BUFFER_METERS,
  isValidBufferMeters,
} from "./routeDeviation";

describe("route deviation buffer bounds", () => {
  it("keeps the default inside the accepted range", () => {
    // The UI offers the default as a placeholder; if it fell outside the
    // bounds, submitting an untouched form would be rejected server-side.
    expect(isValidBufferMeters(DEFAULT_ROUTE_BUFFER_METERS)).toBe(true);
  });

  it("accepts the inclusive bounds", () => {
    expect(isValidBufferMeters(MIN_ROUTE_BUFFER_METERS)).toBe(true);
    expect(isValidBufferMeters(MAX_ROUTE_BUFFER_METERS)).toBe(true);
  });

  it("rejects values just outside the bounds", () => {
    expect(isValidBufferMeters(MIN_ROUTE_BUFFER_METERS - 1)).toBe(false);
    expect(isValidBufferMeters(MAX_ROUTE_BUFFER_METERS + 1)).toBe(false);
  });

  it("rejects zero and negative corridors", () => {
    // A 0m corridor would alert on every ping; a negative one is meaningless.
    expect(isValidBufferMeters(0)).toBe(false);
    expect(isValidBufferMeters(-100)).toBe(false);
  });

  it("rejects non-integer and non-finite values", () => {
    // The column is an INTEGER; a float would be silently truncated.
    expect(isValidBufferMeters(500.5)).toBe(false);
    expect(isValidBufferMeters(NaN)).toBe(false);
    expect(isValidBufferMeters(Infinity)).toBe(false);
  });

  it("orders the bounds sensibly", () => {
    expect(MIN_ROUTE_BUFFER_METERS).toBeLessThan(DEFAULT_ROUTE_BUFFER_METERS);
    expect(DEFAULT_ROUTE_BUFFER_METERS).toBeLessThan(MAX_ROUTE_BUFFER_METERS);
  });
});
