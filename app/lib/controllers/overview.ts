"use server";

import { db } from "../db";
import { authenticatedAction } from "../auth-middleware";
import { checkPermission } from "./utils/checkPermission";
import { controllerGuard } from "./utils/controllerGuard";
import {
  ShipmentStatus,
  VehicleStatus,
  RouteStatus,
  IssueStatus,
  IssuePriority,
} from "@prisma/client";
import {
  DashboardData,
  ActionRequiredItems,
  OverviewStats,
  DailyOperationsData,
  LowStockItemStat,
  PicksAndPacksData,
} from "../type/overview";
import {
  withCache,
  overviewCacheKeys,
  OVERVIEW_CACHE_TTL,
} from "../redis";
import { getExchangeRates } from "../services/exchangeRate";
import { calcTrend, daysAgo } from "./utils/trendUtils";
import {
  buildAlerts,
  buildFuelStats,
  buildWarehouseCapacity,
  buildShipmentVolume,
  buildMapData,
} from "./overview/transforms";

/**
 * Aggregates all data required for the Overview Dashboard in a single server-side pass.
 * This replaces 10 separate server actions to minimize network overhead and database connections.
 * 
 * tr-genel bakış paneli için gerekli tüm verileri tek bir sunucu tarafı işleminde toplar
 * en-aggregates all data required for the Overview Dashboard in a single server-side pass
 * input (user: AuthenticatedUser)
 * output (Promise<DashboardData & { alerts: ActionRequiredItems[] }>)
 */
export const getOverviewDashboardData = authenticatedAction(async (user): Promise<DashboardData & { alerts: ActionRequiredItems[] }> => {
  return controllerGuard("getOverviewDashboardData", async () => {
    if (!user.companyId) {
      return {
        stats: null,
        dailyOps: null,
        fuelStats: [],
        fuelLogs: [],
        warehouseCapacity: [],
        lowStockItems: [],
        shipmentStatus: [],
        picksAndPacks: null,
        trends: [],
        shipmentVolume: [],
        mapData: [],
        alerts: []
      };
    }

    const companyId = user.companyId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneHundredEightyDaysAgo = new Date();
    oneHundredEightyDaysAgo.setDate(oneHundredEightyDaysAgo.getDate() - 179);
    oneHundredEightyDaysAgo.setHours(0, 0, 0, 0);

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Trend windows: current = last 30 days, previous = 30–60 days ago
    const prevPeriodStart = daysAgo(60);
    const prevPeriodEnd = daysAgo(30);

    const cacheKey = overviewCacheKeys.dashboard(companyId);

    return await withCache(cacheKey, OVERVIEW_CACHE_TTL, async () => {
      // Run all queries in parallel, including the permission check
      const [
        , // permission check only needs to resolve, no value needed
      statsCounts,
      openIssues,
      expiringDocs,
      dailyOpsMetrics,
      fuelLogsRaw,
      exchangeRates,
      vehiclePlates,
      warehousesRaw,
      palletSumsRaw,
      lowStockItemsData,
      shipmentStatusRaw,
      inventoryMovements,
      shipmentVolumeRaw,
      mapDataRaw,
      prevStatsCounts,
    ] = await Promise.all([
      // 0. Parallel Permission Check
      checkPermission(user, companyId, [], { allowNoCompany: true }),

      // 1. Basic Stats
      Promise.all([
        db.shipment.count({
          where: {
            companyId,
            status: { notIn: [ShipmentStatus.DELIVERED, ShipmentStatus.CANCELLED] },
          },
        }),
        db.shipment.count({
          where: { companyId, status: ShipmentStatus.DELAYED },
        }),
        db.vehicle.count({
          where: { companyId, status: VehicleStatus.ON_TRIP },
        }),
        db.vehicle.count({
          where: { companyId, status: VehicleStatus.MAINTENANCE },
        }),
        db.vehicle.count({
          where: { companyId, status: VehicleStatus.AVAILABLE },
        }),
        db.driver.count({
          where: { companyId, status: "ON_JOB" },
        }),
        db.warehouse.count({ where: { companyId } }),
        db.inventory.count({ where: { companyId } }),
      ]),

      // 2. Alerts: Open Issues
      db.issue.findMany({
        where: {
          companyId,
          status: { in: [IssueStatus.OPEN, IssueStatus.IN_PROGRESS] },
          priority: { in: [IssuePriority.HIGH, IssuePriority.CRITICAL] },
        },
        select: {
          type: true,
          title: true,
          priority: true,
          status: true,
          vehicleId: true,
          driverId: true,
          shipmentId: true,
          createdAt: true,
        },
        take: 10,
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      }),

      // 3. Alerts: Expiring and already-expired docs
      //
      // The `status` column is NOT filtered on, deliberately. Nothing in the app
      // ever writes DocumentStatus.EXPIRED — the check-expirations cron sends
      // notifications but never updates the row — so a lapsed document still
      // reads ACTIVE. Excluding `status: EXPIRED` therefore hid nothing while
      // making the list look like it only held upcoming renewals. Expiry is
      // derived from `expiryDate` alone (see deriveDocumentUrgency), which is
      // the only field that is actually maintained.
      db.document.findMany({
        where: {
          companyId,
          expiryDate: { not: null, lte: thirtyDaysFromNow },
        },
        select: {
          name: true,
          type: true,
          expiryDate: true,
          driverId: true,
          vehicleId: true,
          // The owner is what makes an alert actionable: "the inspection
          // certificate expired" is useless without knowing whose.
          vehicle: { select: { plate: true } },
          driver: {
            select: { user: { select: { name: true, surname: true } } },
          },
        },
        take: 5,
        // Most overdue first: something that lapsed weeks ago outranks a
        // renewal that is merely approaching.
        orderBy: { expiryDate: "asc" },
      }),

      // 4. Daily Operations
      Promise.all([
        db.route.count({
          where: { companyId, status: RouteStatus.PLANNED },
        }),
        db.shipment.count({
          where: {
            companyId,
            status: ShipmentStatus.DELIVERED,
            updatedAt: { gte: today },
          },
        }),
        db.shipment.count({
          where: {
            companyId,
            status: ShipmentStatus.CANCELLED,
            updatedAt: { gte: today },
          },
        }),
        db.fuelLog.aggregate({
          where: {
            companyId,
            date: { gte: today },
          },
          _sum: { volumeLiter: true },
        }),
        db.route.aggregate({
          where: {
            companyId,
            status: RouteStatus.COMPLETED,
            updatedAt: { gte: today },
            durationMin: { not: null },
          },
          _avg: { durationMin: true },
        }),
      ]),

      // 5. Fuel Logs (Top 8 vehicles, last 30 days)
      db.fuelLog.findMany({
        where: {
          companyId,
          date: { gte: oneHundredEightyDaysAgo },
        },
      }),

      // 5b. Exchange Rates for processing
      getExchangeRates(),

      // 5b. Parallel Vehicle Plate Fetching (Eliminate waterfall)
      db.vehicle.findMany({
        where: { companyId, deletedAt: null },
        select: { id: true, plate: true },
      }),

      // 6. Warehouses
      db.warehouse.findMany({
        where: { companyId },
        include: {
          _count: { select: { inventory: true } },
        },
      }),

      // 6b. Parallel warehouse pallet rows (eliminate waterfall). Rows, not a
      // groupBy _sum: occupancy is quantity ÷ units-per-pallet per row.
      db.inventory.findMany({
        where: { companyId },
        select: {
          warehouseId: true,
          quantity: true,
          palletCount: true,
          volumeM3: true,
        },
      }),

      // 7. Low Stock Items
      db.inventory.findMany({
        where: {
          companyId,
          quantity: { lte: db.inventory.fields.minStock },
        },
        take: 8,
        include: { warehouse: true },
        orderBy: { quantity: "asc" },
      }),

      // 8. Shipment Status
      db.shipment.findMany({
        where: { companyId },
        select: { status: true },
      }),

      // 9. Picks & Packs (Inventory Movements)
      db.inventoryMovement.groupBy({
        by: ["type"],
        where: {
          companyId,
          date: { gte: today },
          type: { in: ["PICK", "PACK"] },
        },
        _sum: { quantity: true },
      }),

      // 10. Shipment Volume (7-day history)
      db.shipment.findMany({
        where: {
          companyId,
          createdAt: { gte: oneHundredEightyDaysAgo },
        },
        select: { createdAt: true },
      }),

      // 11. Optimized Map Data (Select only required fields)
      Promise.all([
        db.warehouse.findMany({
          where: { companyId },
          select: { id: true, name: true, lat: true, lng: true }
        }),
        db.vehicle.findMany({
          where: { companyId, deletedAt: null },
          select: { id: true, plate: true, currentLat: true, currentLng: true }
        }),
        db.customer.findMany({
          where: { companyId },
          select: {
            id: true,
            name: true,
            locations: {
              select: {
                lat: true,
                lng: true,
                isDefault: true,
              }
            }
          }
        }),
      ]),

      // 12. Previous period counts for trend calculations (30–60 days ago)
      Promise.all([
        db.shipment.count({
          where: {
            companyId,
            status: { notIn: [ShipmentStatus.DELIVERED, ShipmentStatus.CANCELLED] },
            createdAt: { gte: prevPeriodStart, lt: prevPeriodEnd },
          },
        }),
        db.shipment.count({
          where: { companyId, status: ShipmentStatus.DELAYED, createdAt: { gte: prevPeriodStart, lt: prevPeriodEnd } },
        }),
        db.vehicle.count({ where: { companyId, status: VehicleStatus.ON_TRIP } }),
        db.vehicle.count({ where: { companyId, status: VehicleStatus.MAINTENANCE } }),
        db.vehicle.count({ where: { companyId, status: VehicleStatus.AVAILABLE } }),
        db.driver.count({ where: { companyId, status: "ON_JOB", createdAt: { lte: prevPeriodEnd } } }),
        db.warehouse.count({ where: { companyId, createdAt: { lte: prevPeriodEnd } } }),
        db.inventory.count({ where: { companyId, updatedAt: { lte: prevPeriodEnd } } }),
      ]),
    ]);

    // ── Data Processing ─────────────────────────────────────────────────────

    // 1. Stats
    const stats: OverviewStats = {
      activeShipments: statsCounts[0],
      delayedShipments: statsCounts[1],
      vehiclesOnTrip: statsCounts[2],
      vehiclesInService: statsCounts[3],
      availableVehicles: statsCounts[4],
      activeDrivers: statsCounts[5],
      warehouses: statsCounts[6],
      inventorySkus: statsCounts[7],
    };

    // Trend data: current vs. previous 30-day period
    const statsTrends = {
      activeShipments: calcTrend(statsCounts[0], prevStatsCounts[0]),
      delayedShipments: calcTrend(statsCounts[1], prevStatsCounts[1]),
      vehiclesOnTrip: calcTrend(statsCounts[2], prevStatsCounts[2]),
      vehiclesInService: calcTrend(statsCounts[3], prevStatsCounts[3]),
      availableVehicles: calcTrend(statsCounts[4], prevStatsCounts[4]),
      activeDrivers: calcTrend(statsCounts[5], prevStatsCounts[5]),
      warehouses: calcTrend(statsCounts[6], prevStatsCounts[6]),
      inventorySkus: calcTrend(statsCounts[7], prevStatsCounts[7]),
    };

    // 2 & 3. Alerts (Issues + Docs)
    const alerts = buildAlerts(openIssues, expiringDocs);

    // 4. Daily Ops
    const dailyOps: DailyOperationsData = {
      plannedRoutes: dailyOpsMetrics[0],
      completedDeliveries: dailyOpsMetrics[1],
      failedDeliveries: dailyOpsMetrics[2],
      fuelConsumedLiters: Math.round(dailyOpsMetrics[3]._sum.volumeLiter ?? 0),
      avgDeliveryTimeMin: Math.round(dailyOpsMetrics[4]._avg.durationMin ?? 0),
    };

    // 5. Fuel Stats
    const vehicleMap = new Map(vehiclePlates.map((v) => [v.id, v.plate]));
    const fuelStats = buildFuelStats(fuelLogsRaw, vehicleMap, exchangeRates.rates);

    // 6. Warehouse Capacity
    const warehouseCapacity = buildWarehouseCapacity(warehousesRaw, palletSumsRaw);

    // 7. Low Stock
    const lowStockItems: LowStockItemStat[] = lowStockItemsData.map((i) => ({
      item: i.name,
      sku: i.sku,
      warehouseId: i.warehouse.name,
      onHand: i.quantity,
      minStock: i.minStock,
    }));

    // 8. Shipment Status
    const shipmentStatus = shipmentStatusRaw.map((s) => s.status);

    // 9. Picks & Packs
    let picks = 0;
    let packs = 0;
    inventoryMovements.forEach((m) => {
      if (m.type === "PICK") picks = m._sum.quantity || 0;
      if (m.type === "PACK") packs = m._sum.quantity || 0;
    });
    const picksAndPacks: PicksAndPacksData = { picks, packs };

    // 10. Shipment Volume History
    const shipmentVolume = buildShipmentVolume(shipmentVolumeRaw, user.timezone || "UTC");

    // 11. Map Data
    const mapData = buildMapData(mapDataRaw);

    return {
      stats,
      statsTrends,
      dailyOps,
      fuelStats,
      fuelLogs: fuelLogsRaw.map((log) => ({
        plate: vehicleMap.get(log.vehicleId) ?? "N/A",
        amount: log.volumeLiter,
        date: log.date.toISOString(),
      })),
      warehouseCapacity,
      lowStockItems,
      shipmentStatus,
      picksAndPacks,
      trends: [], // Keeping empty for backward compat if needed
      shipmentVolume,
      mapData,
        alerts
      };
    });
  });
});
