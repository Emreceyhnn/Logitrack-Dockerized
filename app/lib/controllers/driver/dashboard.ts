"use server";

import { db } from "../../db";
import { checkPermission } from "../utils/checkPermission";
import { Prisma } from "@prisma/client";
import { authenticatedAction } from "../../auth-middleware";
import {
  DriverWithRelations,
  DriverFilters,
  DriverDashboardResponseType,
} from "../../type/driver";
import { calcTrend, daysAgo } from "../utils/trendUtils";
import { controllerGuard } from "../utils/controllerGuard";
import { driverCache } from "./shared";
import { withLiveDocumentStatus } from "../../utils/documentStatus";

interface WeeklyStat {
  delivered: number;
  delayed: number;
}

/**
 * Per-driver weekly delivery/delay counts for the given driver ids. "Delivered"
 * = shipments marked DELIVERED in the last 7 days (by updatedAt, the delivery
 * timestamp proxy); "delayed" = shipments currently in DELAYED status. Returns a
 * Map keyed by driverId so callers can look each driver up in O(1).
 */
async function getWeeklyShipmentStats(
  companyId: string,
  driverIds: string[]
): Promise<Map<string, WeeklyStat>> {
  const result = new Map<string, WeeklyStat>();
  if (driverIds.length === 0) return result;

  const weekAgo = daysAgo(7);
  const [delivered, delayed] = await Promise.all([
    db.shipment.groupBy({
      by: ["driverId"],
      where: {
        companyId,
        driverId: { in: driverIds },
        status: "DELIVERED",
        updatedAt: { gte: weekAgo },
      },
      _count: { _all: true },
    }),
    db.shipment.groupBy({
      by: ["driverId"],
      where: {
        companyId,
        driverId: { in: driverIds },
        status: "DELAYED",
      },
      _count: { _all: true },
    }),
  ]);

  for (const id of driverIds) result.set(id, { delivered: 0, delayed: 0 });
  for (const row of delivered) {
    if (row.driverId) {
      const stat = result.get(row.driverId);
      if (stat) stat.delivered = row._count._all;
    }
  }
  for (const row of delayed) {
    if (row.driverId) {
      const stat = result.get(row.driverId);
      if (stat) stat.delayed = row._count._all;
    }
  }
  return result;
}

/**
 * tr-sürücüler dashboard'u için KPI verilerini ve en iyi performans gösteren sürücüleri getirir
 * en-retrieves KPI data and top-performing drivers for the drivers dashboard
 * input (user: AuthenticatedUser)
 * output (Promise<DriverDashboardResponseType>)
 */
export const getDriverDashboardData = authenticatedAction(async (user) => {
  return controllerGuard("getDriverDashboardData", async () => {
    const companyId = user?.companyId || "";
    await checkPermission(user, companyId, [
      "role_admin",
      "role_manager",
      "role_dispatcher",
    ]);

    return await driverCache.cachedDashboard(
      companyId,
      "kpis",
      async () => {
        const [totalDrivers, onDuty, offDuty, onLeave, safetyScoreAgg, topDrivers] =
          await Promise.all([
          db.driver.count({ where: { companyId } }),
          db.driver.count({
            where: { companyId, status: "ON_JOB" },
          }),
          db.driver.count({
            where: { companyId, status: "OFF_DUTY" },
          }),
          db.driver.count({
            where: { companyId, status: "ON_LEAVE" },
          }),
          db.driver.aggregate({
            where: { companyId },
            _avg: { safetyScore: true, efficiencyScore: true },
          }),
          db.driver.findMany({
            where: { companyId },
            select: {
              id: true,
              user: { select: { name: true, surname: true } },
              rating: true,
              safetyScore: true,
              efficiencyScore: true,
              _count: { select: { shipments: true } },
            },
            orderBy: { rating: "desc" },
            take: 5,
          }),
        ]);

      // Weekly delivery / delay counts for the drivers on the chart, keyed by
      // driverId — the "this week's success & delays" context the rating alone
      // doesn't give.
      const weekly = await getWeeklyShipmentStats(
        companyId,
        topDrivers.map((d) => d.id)
      );

      const complianceIssuesCount = await db.driver.count({
        where: {
          companyId,
          OR: [
            { licenseExpiry: { lt: new Date() } },
            { safetyScore: { lt: 75 } },
          ],
        },
      });

      return {
        driversKpis: {
          totalDrivers,
          onDuty,
          offDuty,
          onLeave,
          complianceIssues: complianceIssuesCount,
          avgSafetyScore: safetyScoreAgg._avg.safetyScore || 0,
          avgEfficiencyScore: safetyScoreAgg._avg.efficiencyScore || 0,
        },
        topPerformers: topDrivers.map((d) => ({
          id: d.id,
          name: d.user.name,
          surname: d.user.surname,
          rating: d.rating || 0,
          tripsCompleted: d._count.shipments,
        })),
        performanceCharts: topDrivers.map((d) => ({
          name: d.user.name,
          rating: d.rating || 0,
          workingHours: d._count.shipments * 5 + 30,
          safetyScore: d.safetyScore || 0,
          efficiencyScore: d.efficiencyScore || 0,
          weeklyDelivered: weekly.get(d.id)?.delivered || 0,
          weeklyDelayed: weekly.get(d.id)?.delayed || 0,
          days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          values: [
            d._count.shipments,
            d._count.shipments + 1,
            Math.max(0, d._count.shipments - 1),
            d._count.shipments + 2,
            d._count.shipments,
          ],
        })),
        recentIncidents: [],
      };
      }
    );
  });
});

/**
 * tr-sürücüler listesini (sayfalama ve filtreleme ile) ve dashboard istatistiklerini birlikte getirir
 * en-retrieves the paginated/filtered list of drivers alongside dashboard statistics
 * input (user: AuthenticatedUser, filters?: DriverFilters)
 * output (Promise<{ drivers: any[], meta: object, driversKpis: object, topPerformers: object[], performanceCharts: object[] }>)
 */
export const getDriverWithDashboardData = authenticatedAction(
  async (
    user,
    filters?: DriverFilters
  ): Promise<{
    drivers: DriverWithRelations[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    driversKpis: DriverDashboardResponseType["driversKpis"];
    topPerformers: DriverDashboardResponseType["topPerformers"];
    performanceCharts: DriverDashboardResponseType["performanceCharts"];
  }> => {
    return controllerGuard("getDriverWithDashboardData", async () => {
      const companyId = user?.companyId || "";
      if (!companyId) throw new Error("User has no company");

      const whereClause: Prisma.DriverWhereInput = { companyId };
      const limit = filters?.limit || 10;
      const page = filters?.page || 1;
      const skip = (page - 1) * limit;

      if (filters) {
        if (filters.search) {
          whereClause.OR = [
            { user: { name: { contains: filters.search, mode: "insensitive" } } },
            { user: { surname: { contains: filters.search, mode: "insensitive" } } },
            { licenseNumber: { contains: filters.search, mode: "insensitive" } },
            { phone: { contains: filters.search, mode: "insensitive" } },
          ];
        }

        if (filters.status && filters.status.length > 0) {
          whereClause.status = { in: filters.status };
        }

        if (filters.hasVehicle !== undefined) {
          if (filters.hasVehicle) {
            whereClause.currentVehicleId = { not: null };
          } else {
            whereClause.currentVehicleId = null;
          }
        }
      }

      let orderBy: Prisma.DriverOrderByWithRelationInput = { createdAt: "desc" };
      if (filters?.sortField && filters?.sortOrder) {
        if (filters.sortField === "name") {
          orderBy = { user: { name: filters.sortOrder } };
        } else if (filters.sortField === "vehicle") {
          orderBy = { currentVehicle: { plate: filters.sortOrder } };
        } else {
          orderBy = { [filters.sortField]: filters.sortOrder } as Prisma.DriverOrderByWithRelationInput;
        }
      }

      return await driverCache.cachedDashboard(
        companyId,
        driverCache.hashFilters(filters || {}),
        async () => {
          const [
            ,
            drivers,
            totalDriversList,
            totalDrivers,
            onDuty,
            offDuty,
            onLeave,
            safetyScoreAgg,
            topDrivers,
            complianceIssuesCount,
            prevTotalDrivers,
          ] = await Promise.all([
            checkPermission(user, companyId, ["role_admin", "role_manager", "role_dispatcher"]),
            db.driver.findMany({
              where: whereClause,
              include: {
                user: {
                  select: { id: true, name: true, surname: true, email: true, avatarUrl: true, roleId: true },
                },
                currentVehicle: { select: { id: true, plate: true, brand: true, model: true } },
                homeBaseWarehouse: { select: { id: true, name: true, code: true } },
                _count: { select: { shipments: true, issues: true } },
                documents: true,
              },
              orderBy,
              skip,
              take: limit,
            }),
            db.driver.count({ where: whereClause }), // count for paginated list
            db.driver.count({ where: { companyId } }),
            db.driver.count({ where: { companyId, status: "ON_JOB" } }),
            db.driver.count({ where: { companyId, status: "OFF_DUTY" } }),
            db.driver.count({ where: { companyId, status: "ON_LEAVE" } }),
            db.driver.aggregate({ where: { companyId }, _avg: { safetyScore: true, efficiencyScore: true } }),
            db.driver.findMany({
              where: { companyId },
              select: { id: true, user: { select: { name: true, surname: true } }, rating: true, safetyScore: true, efficiencyScore: true, _count: { select: { shipments: true } } },
              orderBy: { rating: "desc" },
              take: 5,
            }),
            db.driver.count({
              where: { companyId, OR: [{ licenseExpiry: { lt: new Date() } }, { safetyScore: { lt: 75 } }] },
            }),
            db.driver.count({ where: { companyId, createdAt: { lt: daysAgo(30) } } }),
          ]);

          const kpiTrends = {
            totalDrivers: calcTrend(totalDrivers, prevTotalDrivers),
          };

          const weekly = await getWeeklyShipmentStats(
            companyId,
            topDrivers.map((d) => d.id)
          );

          return {
            // tr-Saklı belge durumu bayat; tarihten türetilenle değiştir (bkz. documentStatus.ts)
            // en-Stored document status is stale; swap in the date-derived one
            drivers: drivers.map((driver) => ({
              ...driver,
              documents: withLiveDocumentStatus(driver.documents),
            })) as DriverWithRelations[],
            meta: {
              total: totalDriversList,
              page,
              limit,
              totalPages: Math.ceil(totalDriversList / limit),
            },
            driversKpis: {
              totalDrivers,
              onDuty,
              offDuty,
              onLeave,
              complianceIssues: complianceIssuesCount,
              avgSafetyScore: safetyScoreAgg._avg.safetyScore || 0,
              avgEfficiencyScore: safetyScoreAgg._avg.efficiencyScore || 0,
            },
            kpiTrends,
            topPerformers: topDrivers.map((d) => ({
              id: d.id,
              name: d.user.name,
              surname: d.user.surname,
              rating: d.rating || 0,
              tripsCompleted: d._count.shipments,
            })),
            performanceCharts: topDrivers.map((d) => ({
              name: d.user.name,
              rating: d.rating || 0,
              workingHours: d._count.shipments * 5 + 30,
              safetyScore: d.safetyScore || 0,
              efficiencyScore: d.efficiencyScore || 0,
              weeklyDelivered: weekly.get(d.id)?.delivered || 0,
              weeklyDelayed: weekly.get(d.id)?.delayed || 0,
              days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
              values: [
                d._count.shipments,
                d._count.shipments + 1,
                Math.max(0, d._count.shipments - 1),
                d._count.shipments + 2,
                d._count.shipments,
              ],
            })),
          };
        }
      );
    });
  }
);
