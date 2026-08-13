 
import { describe, it } from "node:test";
import { expect } from "expect";
import "dotenv/config"; // .env dosyasını yükleyip gerçek şifreleri alır
import {
  companyCacheKeys,
  customerCacheKeys,
  driverCacheKeys,
  exchangeRateCacheKeys,
  hashFilters,
  inventoryCacheKeys,
  overviewCacheKeys,
  redis,
  routeCacheKeys,
  shipmentCacheKeys,
  trailerCacheKeys,
  vehicleCacheKeys,
  warehouseCacheKeys,
} from "./redis";

describe("All redis tests", () => {
  describe("Redis Connection (Integration Test)", () => {
    it("should connect to redis using real .env credentials", async () => {
      const result = await redis.ping();
      console.log(result);

      expect(result).toBe("PONG");
      expect(redis).toBeDefined();
    });
  });
  describe("Vehicle Cache", () => {
    const mockVehicleId = "vehicle-123";
    const mockCompanyId = "company-456";
    const cacheKey = vehicleCacheKeys.detail(mockVehicleId);

    it("should add vehicle to cache and retrieve it", async () => {
      const mockData = {
        companyId: mockCompanyId,
        vehicleId: mockVehicleId,
        plate: "1234",
        type: "Truck",
        status: "Available",
      };

      // Upstash Redis nesneleri otomatik JSON'a çevirip geri çözer (parse/stringify yapmaya gerek yok)
      await redis.set(cacheKey, mockData);

      const result = await redis.get(cacheKey);

      // Objeleri karşılaştırırken .toBe() yerine .toEqual() kullanılır
      expect(result).toEqual(mockData);

      // Test bittikten sonra gerçek veritabanını kirletmemek için siliyoruz
      await redis.del(cacheKey);
    });

    it("should generate correct cache keys for vehicles", () => {
      // Key oluşturucu (Generator) fonksiyonların doğru string'leri ürettiğini test ediyoruz
      expect(vehicleCacheKeys.companyPattern(mockCompanyId)).toBe(
        `vehicles:${mockCompanyId}:*`
      );
      expect(vehicleCacheKeys.detail(mockVehicleId)).toBe(
        `vehicles:detail:${mockVehicleId}`
      );
      expect(vehicleCacheKeys.list(mockCompanyId, "hash123")).toBe(
        `vehicles:${mockCompanyId}:list:hash123`
      );
      expect(vehicleCacheKeys.dashboard(mockCompanyId, "hash123")).toBe(
        `vehicles:${mockCompanyId}:dashboard:hash123`
      );
      expect(vehicleCacheKeys.kpis(mockCompanyId)).toBe(
        `vehicles:${mockCompanyId}:kpis`
      );
    });
  });
  describe("Trailer Cache", () => {
    const mockTrailerId = "trailer-123";
    const mockCompanyId = "company-456";
    const cacheKey = trailerCacheKeys.detail(mockTrailerId);

    it("Should add trailer to cache and get the cache", async () => {
      const mockData = {
        companyId: mockCompanyId,
        trailerId: mockTrailerId,
        plate: "1234",
        type: "Trailer",
        status: "Available",
      };

      await redis.set(cacheKey, mockData);

      const result = await redis.get(cacheKey);
      expect(result).toEqual(mockData);

      await redis.del(cacheKey);
    });

    it("should generate correct cache key for trailer", () => {
      expect(trailerCacheKeys.companyPattern(mockCompanyId)).toBe(
        `trailers:${mockCompanyId}:*`
      );
      expect(trailerCacheKeys.detail(mockTrailerId)).toBe(
        `trailers:detail:${mockTrailerId}`
      );
      expect(trailerCacheKeys.list(mockCompanyId, "hash123")).toBe(
        `trailers:${mockCompanyId}:list_v2:hash123`
      );
      expect(trailerCacheKeys.dashboard(mockCompanyId, "hash123")).toBe(
        `trailers:${mockCompanyId}:dashboard:hash123`
      );
      expect(trailerCacheKeys.kpis(mockCompanyId)).toBe(
        `trailers:${mockCompanyId}:kpis`
      );
    });
  });
  describe("Driver Cache", () => {
    const mockCompanyId = "company-123";
    const mockDriverId = "driver-123";
    const cacheDriverKey = driverCacheKeys.detail(mockDriverId);

    it("Should add del get driver cache", async () => {
      const mockData = {
        companyId: mockCompanyId,
        driverId: mockDriverId,
        firstName: "test",
        lastName: "test",
        status: "Active",
      };

      await redis.set(cacheDriverKey, mockData);
      const result = await redis.get(cacheDriverKey);
      expect(result).toEqual(mockData);
      await redis.del(cacheDriverKey);
    });

    it("Shoul cache key generated well", () => {
      expect(driverCacheKeys.companyPattern(mockCompanyId)).toBe(
        `drivers:${mockCompanyId}:*`
      );
      expect(driverCacheKeys.detail(mockDriverId)).toBe(
        `drivers:detail:${mockDriverId}`
      );

      expect(driverCacheKeys.list(mockCompanyId, "hash123")).toBe(
        `drivers:${mockCompanyId}:list:hash123`
      );
      expect(driverCacheKeys.dashboard(mockCompanyId, "hash123")).toBe(
        `drivers:${mockCompanyId}:dashboard:hash123`
      );
      expect(driverCacheKeys.kpis(mockCompanyId)).toBe(
        `drivers:${mockCompanyId}:kpis`
      );
    });
  });
  describe("Route Cache", () => {
    const mockCompanyId = "company-123";
    const mockRouteId = "route-123";
    const cacheRouteKey = routeCacheKeys.detail(mockRouteId);

    it("Should add del get driver cache", async () => {
      const mockData = {
        companyId: mockCompanyId,
        routeId: mockRouteId,
        firstName: "test",
        lastName: "test",
        status: "Active",
      };

      await redis.set(cacheRouteKey, mockData);
      const result = await redis.get(cacheRouteKey);
      expect(result).toEqual(mockData);
      await redis.del(cacheRouteKey);
    });

    it("Shoul cache key generated well", () => {
      expect(routeCacheKeys.companyPattern(mockCompanyId)).toBe(
        `routes:${mockCompanyId}:*`
      );
      expect(routeCacheKeys.detail(mockRouteId)).toBe(
        `routes:detail:${mockRouteId}`
      );

      expect(routeCacheKeys.list(mockCompanyId, "hash123")).toBe(
        `routes:${mockCompanyId}:list:hash123`
      );
      expect(routeCacheKeys.dashboard(mockCompanyId, "hash123")).toBe(
        `routes:${mockCompanyId}:dashboard:hash123`
      );
      expect(routeCacheKeys.kpis(mockCompanyId)).toBe(
        `routes:${mockCompanyId}:kpis`
      );
    });
  });
  describe("Shipment Cache", () => {
    const mockCompanyId = "company-123";
    const mockShipmentId = "shipment-123";
    const cacheShipmentKey = shipmentCacheKeys.detail(mockShipmentId);

    it("Should add del get driver cache", async () => {
      const mockData = {
        companyId: mockCompanyId,
        shipmentId: mockShipmentId,
        name: "test",
        status: "Active",
      };

      await redis.set(cacheShipmentKey, mockData);
      const result = await redis.get(cacheShipmentKey);
      expect(result).toEqual(mockData);
      await redis.del(cacheShipmentKey);
    });

    it("Shoul cache key generated well", () => {
      expect(shipmentCacheKeys.companyPattern(mockCompanyId)).toBe(
        `shipments:${mockCompanyId}:*`
      );
      expect(shipmentCacheKeys.detail(mockShipmentId)).toBe(
        `shipments:detail:${mockShipmentId}`
      );

      expect(shipmentCacheKeys.list(mockCompanyId, "hash123")).toBe(
        `shipments:${mockCompanyId}:list:hash123`
      );
      expect(shipmentCacheKeys.dashboard(mockCompanyId, "hash123")).toBe(
        `shipments:${mockCompanyId}:dashboard:hash123`
      );
      expect(shipmentCacheKeys.kpis(mockCompanyId)).toBe(
        `shipments:${mockCompanyId}:kpis`
      );
    });
  });
  describe("Overview Cache", () => {
    const mockCompanyId = "company-123";
    const cacheOverviewKey = overviewCacheKeys.dashboard(mockCompanyId);
    it("Should add del get overview cache", async () => {
      const mockData = {
        companyId: mockCompanyId,
        overview: "test",
      };
      await redis.set(cacheOverviewKey, mockData);
      const result = await redis.get(cacheOverviewKey);
      expect(result).toEqual(mockData);
      await redis.del(cacheOverviewKey);
    });

    it("Shoul cache key generated well", () => {
      expect(overviewCacheKeys.dashboard(mockCompanyId)).toBe(
        `overview:${mockCompanyId}:dashboard`
      );
    });
  });
  describe("Warehouse Cache", () => {
    const mockCompanyId = "company-123";
    const mockWarehouseId = "warehouse-123";
    const cacheWarehouseKey = warehouseCacheKeys.detail(mockWarehouseId);
    it("Should add del get warehouse cache", async () => {
      const mockData = {
        companyId: mockCompanyId,
        warehouseId: mockWarehouseId,
        name: "test",
        status: "Active",
      };
      await redis.set(cacheWarehouseKey, mockData);
      const result = await redis.get(cacheWarehouseKey);
      expect(result).toEqual(mockData);
      await redis.del(cacheWarehouseKey);
    });

    it("Shoul cache key generated well", () => {
      expect(warehouseCacheKeys.companyPattern(mockCompanyId)).toBe(
        `warehouses:${mockCompanyId}:*`
      );
      expect(warehouseCacheKeys.detail(mockWarehouseId)).toBe(
        `warehouses:detail:${mockWarehouseId}`
      );

      expect(warehouseCacheKeys.list(mockCompanyId, "hash123")).toBe(
        `warehouses:${mockCompanyId}:list:hash123`
      );
      expect(warehouseCacheKeys.dashboard(mockCompanyId, "hash123")).toBe(
        `warehouses:${mockCompanyId}:dashboard:hash123`
      );
      expect(warehouseCacheKeys.kpis(mockCompanyId)).toBe(
        `warehouses:${mockCompanyId}:kpis`
      );
    });
  });
  describe("Inventory Cache", () => {
    const mockCompanyId = "company-123";
    const mockInventoryId = "inventory-123";
    const cacheInventoryKey = inventoryCacheKeys.detail(mockInventoryId);
    it("Should add del get inventory cache", async () => {
      const mockData = {
        companyId: mockCompanyId,
        inventoryId: mockInventoryId,
        name: "test",
        status: "Active",
      };
      await redis.set(cacheInventoryKey, mockData);
      const result = await redis.get(cacheInventoryKey);
      expect(result).toEqual(mockData);
      await redis.del(cacheInventoryKey);
    });

    it("Shoul cache key generated well", () => {
      expect(inventoryCacheKeys.companyPattern(mockCompanyId)).toBe(
        `inventories:${mockCompanyId}:*`
      );
      expect(inventoryCacheKeys.detail(mockInventoryId)).toBe(
        `inventories:detail:${mockInventoryId}`
      );

      expect(inventoryCacheKeys.list(mockCompanyId, "hash123")).toBe(
        `inventories:${mockCompanyId}:list:hash123`
      );
      expect(inventoryCacheKeys.dashboard(mockCompanyId, "hash123")).toBe(
        `inventories:${mockCompanyId}:dashboard:hash123`
      );
      expect(inventoryCacheKeys.kpis(mockCompanyId)).toBe(
        `inventories:${mockCompanyId}:kpis`
      );
    });
  });
  describe("Customer Cache", () => {
    const mockCompanyId = "company-123";
    const mockCustomerId = "customer-123";
    const cacheCustomerKey = customerCacheKeys.detail(mockCustomerId);
    it("Should add del get customer cache", async () => {
      const mockData = {
        companyId: mockCompanyId,
        customerId: mockCustomerId,
        name: "test",
        status: "Active",
      };
      await redis.set(cacheCustomerKey, mockData);
      const result = await redis.get(cacheCustomerKey);
      expect(result).toEqual(mockData);
      await redis.del(cacheCustomerKey);
    });

    it("Shoul cache key generated well", () => {
      expect(customerCacheKeys.companyPattern(mockCompanyId)).toBe(
        `customers:${mockCompanyId}:*`
      );
      expect(customerCacheKeys.detail(mockCustomerId)).toBe(
        `customers:detail:${mockCustomerId}`
      );

      expect(customerCacheKeys.list(mockCompanyId, "hash123")).toBe(
        `customers:${mockCompanyId}:list:hash123`
      );
      expect(customerCacheKeys.dashboard(mockCompanyId, "hash123")).toBe(
        `customers:${mockCompanyId}:dashboard:hash123`
      );
      expect(customerCacheKeys.kpis(mockCompanyId)).toBe(
        `customers:${mockCompanyId}:kpis`
      );
    });
  });
  describe("Company Cache", () => {
    const mockCompanyId = "company-123";
    const cacheCompanyKey = companyCacheKeys.detail(mockCompanyId);
    it("Should add del get company cache", async () => {
      const mockData = {
        companyId: mockCompanyId,
        name: "test",
        status: "Active",
      };
      await redis.set(cacheCompanyKey, mockData);
      const result = await redis.get(cacheCompanyKey);
      expect(result).toEqual(mockData);
      await redis.del(cacheCompanyKey);
    });

    it("Shoul cache key generated well", () => {
      expect(companyCacheKeys.companyPattern(mockCompanyId)).toBe(
        `companies:${mockCompanyId}:*`
      );
      expect(companyCacheKeys.detail(mockCompanyId)).toBe(
        `companies:detail:${mockCompanyId}`
      );

      expect(companyCacheKeys.list("hash123")).toBe(`companies:list:hash123`);
      expect(companyCacheKeys.dashboard(mockCompanyId, "hash123")).toBe(
        `companies:${mockCompanyId}:dashboard:hash123`
      );
      expect(companyCacheKeys.kpis(mockCompanyId)).toBe(
        `companies:${mockCompanyId}:kpis`
      );
    });
  });
  describe("Exchange Rate Cache", () => {
    const mockExchangeRateKey = exchangeRateCacheKeys.exchangeRate();
    it("Should add del get exchange rate cache", async () => {
      const mockData = {
        exchangeRate: 1,
      };
      await redis.set(mockExchangeRateKey, mockData);
      const result = await redis.get(mockExchangeRateKey);
      expect(result).toEqual(mockData);
      await redis.del(mockExchangeRateKey);
    });

    it("Shoul cache key generated well", () => {
      expect(exchangeRateCacheKeys.exchangeRate()).toBe(
        `exchange_rates:usd:v1`
      );
    });
  });
  describe("Utils", () => {
    it("Should hash filters well", () => {
      const filters = {
        name: "test",
        status: "Active",
      };
      const hash = hashFilters(filters);
      expect(hash).toBe(
        Buffer.from(JSON.stringify(filters)).toString("base64")
      );
    });
  });
});
