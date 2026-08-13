import { db } from "../../db";
import { ShipmentStatus, RouteStatus, VehicleStatus } from "@prisma/client";

export interface WeeklyReportStats {
  newShipments: number;
  deliveredShipments: number;
  delayedShipments: number;
  completedRoutes: number;
  activeVehicles: number;
  totalVehicles: number;
  upcomingMaintenance: number;
}

/**
 * tr-belirtilen şirket için son 7 güne ait haftalık özet istatistiklerini hesaplar
 * en-computes the weekly summary statistics for the given company over the last 7 days
 * input (companyId: string, since: Date)
 * output (Promise<WeeklyReportStats>)
 */
export async function getWeeklyReportStats(
  companyId: string,
  since: Date
): Promise<WeeklyReportStats> {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    newShipments,
    deliveredShipments,
    delayedShipments,
    completedRoutes,
    activeVehicles,
    totalVehicles,
    upcomingMaintenance,
  ] = await Promise.all([
    db.shipment.count({
      where: { companyId, createdAt: { gte: since } },
    }),
    db.shipment.count({
      where: {
        companyId,
        status: ShipmentStatus.DELIVERED,
        updatedAt: { gte: since },
      },
    }),
    db.shipment.count({
      where: { companyId, status: ShipmentStatus.DELAYED },
    }),
    db.route.count({
      where: {
        companyId,
        status: RouteStatus.COMPLETED,
        updatedAt: { gte: since },
      },
    }),
    db.vehicle.count({
      where: { companyId, deletedAt: null, status: { not: VehicleStatus.OUT_OF_ORDER } },
    }),
    db.vehicle.count({
      where: { companyId, deletedAt: null },
    }),
    db.maintenanceRecord.count({
      where: {
        companyId,
        status: "SCHEDULED",
        date: { gte: now, lte: thirtyDaysFromNow },
      },
    }),
  ]);

  return {
    newShipments,
    deliveredShipments,
    delayedShipments,
    completedRoutes,
    activeVehicles,
    totalVehicles,
    upcomingMaintenance,
  };
}
