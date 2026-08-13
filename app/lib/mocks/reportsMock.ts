import type { ReportsData } from "@/app/lib/type/reports";

/**
 * Fixed mock data for the Live Demo reports dashboard. Shape mirrors the return
 * type of getReportsDataAction() / GET /api/reports/dashboard — ReportsData
 * ({ shipments, fleet, inventory, metrics }).
 */

export function getReportsDashboardMock(): ReportsData {
  return {
    shipments: {
      statusCounts: [
        { status: "DELIVERED", count: 1284 },
        { status: "IN_TRANSIT", count: 342 },
        { status: "PENDING", count: 178 },
        { status: "PROCESSING", count: 96 },
        { status: "DELAYED", count: 54 },
        { status: "RETURNED", count: 21 },
        { status: "CANCELLED", count: 33 },
      ],
      routeCounts: [
        { route: "İstanbul → Ankara", count: 214 },
        { route: "İzmir → Bursa", count: 168 },
        { route: "Ankara → Antalya", count: 143 },
        { route: "İstanbul → Adana", count: 121 },
        { route: "Bursa → Konya", count: 98 },
        { route: "Gaziantep → İstanbul", count: 76 },
        { route: "Konya → Mersin", count: 61 },
      ],
    },
    fleet: [
      { plate: "34 ABC 123", consumption: "28.4", odometer: 184320, maintenanceCost: 12450 },
      { plate: "06 XYZ 456", consumption: "31.2", odometer: 221840, maintenanceCost: 18900 },
      { plate: "35 DEF 789", consumption: "26.8", odometer: 143210, maintenanceCost: 8600 },
      { plate: "16 GHI 012", consumption: "33.5", odometer: 267500, maintenanceCost: 22100 },
      { plate: "07 JKL 345", consumption: "29.1", odometer: 98750, maintenanceCost: 5400 },
      { plate: "27 MNO 678", consumption: "30.7", odometer: 176300, maintenanceCost: 14750 },
      { plate: "42 PRS 901", consumption: "27.3", odometer: 132900, maintenanceCost: 9200 },
      { plate: "61 TUV 234", consumption: "34.0", odometer: 289600, maintenanceCost: 25300 },
    ],
    inventory: {
      categoryStats: {
        "General Cargo": { value: 842000, count: 640 },
        Electronics: { value: 1245000, count: 312 },
        Textile: { value: 386000, count: 528 },
        Automotive: { value: 674000, count: 274 },
        Perishable: { value: 219000, count: 196 },
        Hazardous: { value: 158000, count: 84 },
        Fragile: { value: 431000, count: 148 },
      },
    },
    metrics: {
      totalShipments: 2008,
      onTimeRate: 91.4,
      activeVehicles: 38,
      totalInventoryValue: 3955000,
      pendingOrders: 0,
      avgDeliveryTime: 0,
      avgFuelCons: 0,
      maintenanceCost: 0,
      totalDistance: 0,
      stockTurnover: 0,
      deadStock: 0,
      warehouseCapacity: 0,
    },
  };
}
