"use server";

import { db } from "../db";
import { ReportsData } from "../type/reports";
import { authenticatedAction } from "../auth-middleware";
import { controllerGuard } from "./utils/controllerGuard";

/**
 * tr-raporlar sayfası için gerekli tüm istatistik ve metrikleri getirir
 * en-retrieves all statistics and metrics required for the reports page
 * input (user: AuthenticatedUser)
 * output (Promise<ReportsData | null>)
 */
export const getReportsDataAction = authenticatedAction(async (user): Promise<ReportsData | null> => {
  return controllerGuard("getReportsDataAction", async () => {
    if (!user.companyId) return null;
    const companyId = user.companyId;

    const shipmentStatusCounts = await db.shipment.groupBy({
      by: ["status"],
      where: { companyId },
      _count: { status: true },
    });

    const shipmentRouteCounts = await db.shipment.groupBy({
      by: ["routeId"],
      where: {
        companyId,
        routeId: { not: null },
      },
      _count: { routeId: true },
      orderBy: {
        _count: {
          routeId: "desc",
        },
      },
      take: 10,
    });

    const routeNames = await Promise.all(
      shipmentRouteCounts.map(
        async (item: {
          routeId: string | null;
          _count: { routeId: number };
        }) => {
          if (!item.routeId)
            return { route: "Unassigned", count: item._count.routeId };
          const route = await db.route.findFirst({
            where: { id: item.routeId, companyId },
            select: { name: true },
          });
          return {
            route: route?.name || "Unknown",
            count: item._count.routeId,
          };
        }
      )
    );

    const vehicles = await db.vehicle.findMany({
      where: { companyId, deletedAt: null },
      select: {
        plate: true,
        currentLat: true,
        currentLng: true,
        status: true,
        avgFuelConsumption: true,
        odometerKm: true,
        maintenanceRecords: {
          select: { cost: true }
        }
      },
    });

    const fleetData = vehicles.map((v) => {
      const maintenanceCost = v.maintenanceRecords.reduce((sum, record) => sum + Number(record.cost), 0);
      return {
        plate: v.plate,
        consumption: (v.avgFuelConsumption ?? 0).toFixed(1),
        odometer: v.odometerKm ?? 0,
        maintenanceCost: maintenanceCost,
      };
    });

    const inventory = await db.inventory.findMany({
      where: { companyId },
      select: { name: true, quantity: true, warehouseId: true, cargoType: true, unitValue: true },
    });

    const enrichedInventory = inventory.map((i) => {
      return {
        ...i,
        category: i.cargoType || "Uncategorized",
        unitPrice: Number(i.unitValue ?? 0),
      };
    });

    const categoryStats = enrichedInventory.reduce(
      (acc, item) => {
        const entry = acc[item.category] ?? { value: 0, count: 0 };
        entry.value += item.quantity * item.unitPrice;
        entry.count += 1;
        acc[item.category] = entry;
        return acc;
      },
      {} as Record<string, { value: number; count: number }>
    );

    const totalShipments = await db.shipment.count({ where: { companyId } });
    const delayedShipments = await db.shipment.count({
      where: { companyId, status: "DELAYED" },
    });
    const pendingShipments = await db.shipment.count({
      where: { companyId, status: "PENDING" },
    });
    const onTimeRate =
      totalShipments > 0 ? ((totalShipments - delayedShipments) / totalShipments) * 100 : 100;

    const activeVehicles = await db.vehicle.count({
      where: { companyId, status: { not: "MAINTENANCE" } },
    });
    
    const avgFuelCons = vehicles.length > 0 
      ? vehicles.reduce((sum, v) => sum + (v.avgFuelConsumption || 0), 0) / vehicles.length 
      : 0;

    const totalMaintenanceCost = vehicles.reduce((sum, v) => 
      sum + v.maintenanceRecords.reduce((s, r) => s + Number(r.cost), 0), 
    0);

    const totalDistance = vehicles.reduce((sum, v) => sum + (v.odometerKm || 0), 0);

    const totalInventoryValue = enrichedInventory.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    return {
      shipments: {
        statusCounts: shipmentStatusCounts.map((s) => ({
          status: s.status,
          count: s._count.status,
        })),
        routeCounts: routeNames,
      },
      fleet: fleetData,
      inventory: {
        categoryStats,
      },
      metrics: {
        totalShipments: totalShipments,
        onTimeRate: parseFloat(onTimeRate.toFixed(1)),
        activeVehicles: activeVehicles,
        totalInventoryValue: totalInventoryValue,
        pendingOrders: pendingShipments,
        avgDeliveryTime: 0,
        avgFuelCons: parseFloat(avgFuelCons.toFixed(1)),
        maintenanceCost: totalMaintenanceCost,
        totalDistance: totalDistance,
        stockTurnover: 0,
        deadStock: 0,
        warehouseCapacity: 0,
      },
    };
  }, { fallback: null });
});
