import type { DashboardData, ActionRequiredItems } from "@/app/lib/type/overview";

/**
 * Fixed mock data for the Live Demo overview dashboard. Shape mirrors
 * DashboardData & { alerts: ActionRequiredItems[] } exactly as returned by
 * getOverviewDashboardData() / app/api/overview/dashboard/route.ts, so the
 * real OverviewContent.tsx (reused verbatim via DemoOverviewContent) renders
 * identically to a populated real account.
 */
export function getOverviewMock(): DashboardData & { alerts: ActionRequiredItems[] } {
  return {
    stats: {
      activeShipments: 42,
      delayedShipments: 3,
      vehiclesOnTrip: 18,
      vehiclesInService: 4,
      availableVehicles: 12,
      activeDrivers: 26,
      warehouses: 5,
      inventorySkus: 1284,
    },
    statsTrends: {
      activeShipments: { value: 12, isUp: true },
      delayedShipments: { value: 8, isUp: false },
      vehiclesOnTrip: { value: 5, isUp: true },
      vehiclesInService: { value: 2, isUp: false },
      availableVehicles: { value: 3, isUp: true },
      activeDrivers: { value: 4, isUp: true },
      warehouses: { value: 0, isUp: true },
      inventorySkus: { value: 6, isUp: true },
    },
    alerts: [
      {
        type: "SHIPMENT_DELAY",
        title: "Shipment SHP-10432 delayed",
        message: "Delayed by 2h 15m on route to Ankara",
        link: "/shipments?status=DELAYED",
      },
      {
        type: "vehicle",
        title: "Vehicle 34 ABC 123 needs service",
        message: "Next service due in 300 km",
        link: "/vehicle",
      },
      {
        type: "DOCUMENT_DUE",
        title: "Insurance document expiring soon",
        message: "Expires in 5 days for fleet no. 12",
        link: "/vehicle",
      },
      {
        type: "warehouse",
        title: "İstanbul Merkez warehouse near capacity",
        message: "Pallet utilization at 91%",
        link: "/warehouses",
      },
      {
        type: "driver",
        title: "Driver license renewal due",
        message: "Ahmet Yılmaz — license expires in 12 days",
        link: "/drivers",
      },
    ],
    dailyOps: {
      plannedRoutes: 24,
      completedDeliveries: 156,
      failedDeliveries: 3,
      avgDeliveryTimeMin: 47,
      fuelConsumedLiters: 892,
    },
    fuelStats: [
      { id: "fs-1", plate: "34 ABC 123", value: 320, totalCost: 6100 },
      { id: "fs-2", plate: "06 DEF 456", value: 275, totalCost: 5250 },
      { id: "fs-3", plate: "35 GHI 789", value: 410, totalCost: 7800 },
    ],
    fuelLogs: [
      { plate: "34 ABC 123", amount: 80, date: "2026-07-15" },
      { plate: "06 DEF 456", amount: 65, date: "2026-07-16" },
      { plate: "35 GHI 789", amount: 95, date: "2026-07-17" },
      { plate: "34 ABC 123", amount: 72, date: "2026-07-18" },
    ],
    warehouseCapacity: [
      {
        warehouseName: "İstanbul Merkez",
        warehouseId: "wh-1",
        capacity: 91,
        volume: 78,
        palletUsed: 910,
        palletCapacity: 1000,
        volumeUsed: 3900,
        volumeCapacity: 5000,
      },
      {
        warehouseName: "Ankara Depo",
        warehouseId: "wh-2",
        capacity: 64,
        volume: 55,
        palletUsed: 640,
        palletCapacity: 1000,
        volumeUsed: 2750,
        volumeCapacity: 5000,
      },
      {
        warehouseName: "İzmir Liman",
        warehouseId: "wh-3",
        capacity: 47,
        volume: 39,
        palletUsed: 470,
        palletCapacity: 1000,
        volumeUsed: 1950,
        volumeCapacity: 5000,
      },
    ],
    lowStockItems: [
      { item: "Pallet Wrap Film", sku: "SKU-2231", warehouseId: "İstanbul Merkez", onHand: 12, minStock: 50 },
      { item: "Cardboard Boxes M", sku: "SKU-1094", warehouseId: "Ankara Depo", onHand: 30, minStock: 100 },
      { item: "Fragile Stickers", sku: "SKU-5521", warehouseId: "İzmir Liman", onHand: 8, minStock: 40 },
    ],
    shipmentStatus: [
      "IN_TRANSIT", "IN_TRANSIT", "IN_TRANSIT", "IN_TRANSIT", "IN_TRANSIT", "IN_TRANSIT",
      "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED",
      "PENDING", "PENDING", "PENDING",
      "PROCESSING", "PROCESSING",
      "ASSIGNED", "ASSIGNED",
      "DELAYED", "DELAYED", "DELAYED",
      "CANCELLED",
    ],
    picksAndPacks: { picks: 342, packs: 298 },
    trends: [
      { date: "2026-07-13", value: 120 },
      { date: "2026-07-14", value: 135 },
      { date: "2026-07-15", value: 128 },
      { date: "2026-07-16", value: 150 },
      { date: "2026-07-17", value: 142 },
      { date: "2026-07-18", value: 160 },
      { date: "2026-07-19", value: 156 },
    ],
    shipmentVolume: [
      { date: "Mon", count: 22 },
      { date: "Tue", count: 28 },
      { date: "Wed", count: 19 },
      { date: "Thu", count: 33 },
      { date: "Fri", count: 41 },
      { date: "Sat", count: 15 },
      { date: "Sun", count: 9 },
    ],
    mapData: [
      { position: { lat: 41.0082, lng: 28.9784 }, name: "İstanbul Merkez", id: "wh-1", type: "W" },
      { position: { lat: 39.9334, lng: 32.8597 }, name: "Ankara Depo", id: "wh-2", type: "W" },
      { position: { lat: 38.4237, lng: 27.1428 }, name: "İzmir Liman", id: "wh-3", type: "W" },
      { position: { lat: 40.1826, lng: 29.0665 }, name: "34 ABC 123", id: "veh-1", type: "V" },
      { position: { lat: 39.6501, lng: 30.4833 }, name: "06 DEF 456", id: "veh-2", type: "V" },
      { position: { lat: 37.8746, lng: 32.4932 }, name: "35 GHI 789", id: "veh-3", type: "V" },
      { position: { lat: 40.7648, lng: 29.9236 }, name: "Bursa Müşteri Deposu", id: "cust-1", type: "C" },
    ],
  };
}
