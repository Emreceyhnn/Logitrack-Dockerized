import { describe, it, beforeEach, after, mock } from "node:test";
import { expect } from "expect";
import polyline from "@mapbox/polyline";
import { fetchRoute, decodeShape, type RoutingParams } from "./valhalla";

const originalFetch = globalThis.fetch;
const fetchMock = mock.fn<any>();

globalThis.fetch = fetchMock as unknown;

const baseParams: RoutingParams = {
  locations: [
    { lat: 41.0, lon: 29.0 },
    { lat: 39.9, lon: 32.8 },
  ],
  costing: "truck",
};

const okResponse = (payload: Record<string, unknown>) => ({
  ok: true,
  json: async () => payload,
  text: async () => JSON.stringify(payload),
});

describe("valhalla.ts", () => {
  beforeEach(() => {
    fetchMock.mock.resetCalls();
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  describe("fetchRoute", () => {
    it("should_PostToProxyAndReturnTrip_WhenUpstreamSucceeds", async () => {
      // Arrange
      const trip = {
        trip: {
          legs: [{ shape: "abc", summary: { length: 452.1, time: 18000 } }],
          summary: { length: 452.1, time: 18000 },
          status: 0,
          status_message: "Found route",
        },
      };
      fetchMock.mock.mockImplementation(async () => okResponse(trip));

      // Act
      const result = await fetchRoute(baseParams);

      // Assert
      expect(result).toEqual(trip);
      expect(fetchMock.mock.calls.length).toBe(1);
      const [url, init] = fetchMock.mock.calls[0].arguments;
      expect(url).toBe("/api/valhalla");
      expect(init.method).toBe("POST");
      const sentBody = JSON.parse(init.body);
      expect(sentBody.locations).toEqual(baseParams.locations);
      expect(sentBody.costing).toBe("truck");
    });

    it("should_OmitExcludeLocations_WhenListIsEmpty", async () => {
      // Arrange
      fetchMock.mock.mockImplementation(async () => okResponse({}));

      // Act
      await fetchRoute({ ...baseParams, exclude_locations: [] });

      // Assert
      const sentBody = JSON.parse(fetchMock.mock.calls[0].arguments[1].body);
      expect("exclude_locations" in sentBody).toBe(false);
    });

    it("should_ForwardExcludeLocations_WhenProvided", async () => {
      // Arrange
      fetchMock.mock.mockImplementation(async () => okResponse({}));
      const blocked = [{ lat: 40.5, lon: 30.5 }];

      // Act
      await fetchRoute({ ...baseParams, exclude_locations: blocked });

      // Assert
      const sentBody = JSON.parse(fetchMock.mock.calls[0].arguments[1].body);
      expect(sentBody.exclude_locations).toEqual(blocked);
    });

    it("should_ThrowWithUpstreamMessage_WhenResponseIsNotOk", async () => {
      // Arrange
      fetchMock.mock.mockImplementation(async () => ({
        ok: false,
        text: async () => "No route found between points",
        json: async () => ({}),
      }));

      // Act & Assert
      await expect(fetchRoute(baseParams)).rejects.toThrow(
        "Valhalla Hatası: No route found between points"
      );
    });

    it("should_PropagateNetworkErrors", async () => {
      // Arrange
      fetchMock.mock.mockImplementation(async () => {
        throw new Error("network down");
      });

      // Act & Assert
      await expect(fetchRoute(baseParams)).rejects.toThrow("network down");
    });
  });

  describe("decodeShape", () => {
    it("should_DecodePrecision6Polyline_ToLatLonPairs", () => {
      // Arrange — encode a known shape at precision 6 (Valhalla's format)
      const coords: [number, number][] = [
        [41.0082, 28.9784],
        [40.9923, 29.0275],
        [39.9334, 32.8597],
      ];
      const encoded = polyline.encode(coords, 6);

      // Act
      const decoded = decodeShape(encoded);

      // Assert
      expect(decoded.length).toBe(3);
      decoded.forEach(([lat, lon], i) => {
        expect(lat).toBeCloseTo(coords[i][0], 5);
        expect(lon).toBeCloseTo(coords[i][1], 5);
      });
    });

    it("should_ReturnEmptyArray_ForEmptyShape", () => {
      expect(decodeShape("")).toEqual([]);
    });
  });
});
