 
import { describe, it, mock, beforeEach, before, afterEach } from "node:test";
import { expect } from "expect";

// 1. MOCK'LAR (Imports'dan ÖNCE tanımlanmalı!)

// Auth & Permission Mock
const authMiddlewareMock = {
  authenticatedAction: mock.fn((cb) => cb),
};

const checkPermissionMock = {
  checkPermission: mock.fn(),
};

// Global Fetch Mock
const fetchMock = mock.fn();
(globalThis as unknown).fetch = fetchMock;

// Modülleri Sisteme Enjekte Etme
mock.module("../auth-middleware.ts", {
  namedExports: authMiddlewareMock,
});

mock.module("./utils/checkPermission.ts", {
  namedExports: checkPermissionMock,
});

// 2. TEST GRUPLARI
describe("Map Controller", () => {
  let mapController: unknown;

  before(async () => {
    // Test edilecek modülü mocklardan SONRA dinamik import ile alıyoruz
    mapController = await import("./map");
    
    // Set a fake Google Maps API key for the test environment
    process.env.GOOGLE_MAPS_API_KEY = "test-api-key";
  });

  beforeEach(() => {
    // Her testten önce mockları sıfırla
    checkPermissionMock.checkPermission.mock.resetCalls();
    fetchMock.mock.resetCalls();
  });

  afterEach(() => {
    // Clean up
  });

  describe("getDirections() metodu", () => {
    const mockUser = { id: "user-1", companyId: "company-1" };

    it("should_ReturnNull_WhenOriginOrDestinationIsMissing", async () => {
      // Act
      const result = await mapController.getDirections(mockUser, null as unknown, "Dest");

      // Assert
      expect(result).toBeNull();
      expect(fetchMock.mock.calls.length).toBe(0);
    });

    it("should_ReturnDirectionsData_WhenValidRequestIsMade", async () => {
      // Arrange
      fetchMock.mock.mockImplementation(async () => ({
        ok: true,
        json: async () => ({ routes: [{ summary: "Test Route" }] }),
      }));

      // Act
      const result = await mapController.getDirections(
        mockUser, 
        "Istanbul", 
        { lat: 41.0, lng: 28.9 }, 
        [{ location: "Ankara", stopover: true }]
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result.routes[0].summary).toBe("Test Route");
      expect(fetchMock.mock.calls.length).toBe(1);
      
      const fetchUrl = fetchMock.mock.calls[0].arguments[0] as string;
      expect(fetchUrl).toContain("origin=Istanbul");
      expect(fetchUrl).toContain("destination=41,28.9");
      expect(fetchUrl).toContain("waypoints=Ankara");
      expect(fetchUrl).toContain("key=test-api-key");
    });

    it("should_ReturnNull_WhenFetchFails", async () => {
      // Arrange
      fetchMock.mock.mockImplementation(async () => ({
        ok: false,
        statusText: "Not Found",
      }));

      // Act
      const result = await mapController.getDirections(mockUser, "Istanbul", "Ankara");

      // Assert
      expect(result).toBeNull();
      expect(fetchMock.mock.calls.length).toBe(1);
    });
  });
});
