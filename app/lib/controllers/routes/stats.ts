"use server";

import { type Prisma, RouteStatus } from "@prisma/client";
import { db } from "../../db";
import { authenticatedAction } from "../../auth-middleware";
import { checkPermission } from "../utils/checkPermission";
import {
  RouteWithRelations,
  RouteStats,
  RouteEfficiencyStats,
  MapRouteData,
} from "../../type/routes";
import {
  withCache,
  hashFilters,
  routeCacheKeys,
  ROUTE_CACHE_TTL,
} from "../../redis";
import { calcTrend, daysAgo } from "../utils/trendUtils";
import { controllerGuard } from "../utils/controllerGuard";

/**
 * tr-şirkete ait güncel rota istatistiklerini (aktif, devam eden, tamamlanan, geciken) getirir
 * en-retrieves current route statistics (active, in progress, completed, delayed) for the company
 * input (user: AuthenticatedUser)
 * output (Promise<{ active: number, inProgress: number, completedToday: number, delayed: number }>)
 */
export const getRouteStats = authenticatedAction(async (user) => {
  return controllerGuard("getRouteStats", async () => {
    const companyId = user?.companyId || "";
    await checkPermission(user, companyId, [
      "role_admin",
      "role_manager",
      "role_dispatcher",
    ]);

    if (!user.companyId) throw new Error("User has no company");

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));

    const [activeRoutes, inProgress, completedToday, delayedRoutes] =
      await Promise.all([
        db.route.count({
          where: {
            companyId: user.companyId,
            status: { in: ["ACTIVE", "PLANNED"] },
          },
        }),
        db.route.count({
          where: {
            companyId: user.companyId,
            status: "ACTIVE",
          },
        }),
        db.route.count({
          where: {
            companyId: user.companyId,
            status: "COMPLETED",
            updatedAt: { gte: startOfDay },
          },
        }),
        db.route.count({
          where: {
            companyId: user.companyId,
            status: { not: "COMPLETED" },
            endTime: { lt: new Date() },
          },
        }),
      ]);

    return {
      active: activeRoutes,
      inProgress,
      completedToday,
      delayed: delayedRoutes,
    };
  }, { fallback: { active: 0, inProgress: 0, completedToday: 0, delayed: 0 } });
});

/**
 * tr-rota ve araç verimliliği istatistiklerini hesaplar (yakıt tüketimi, zamanında teslimat, araç kullanımı)
 * en-calculates route and vehicle efficiency statistics (fuel consumption, on-time performance, vehicle utilization)
 * input (user: AuthenticatedUser)
 * output (Promise<{ fuelConsumption: number, onTimePerformance: number, vehicleUtilization: number, recentNotifications: any[] }>)
 */
export const getRouteEfficiencyStats = authenticatedAction(async (user) => {
  return controllerGuard("getRouteEfficiencyStats", async () => {
    const companyId = user?.companyId || "";
    await checkPermission(user, companyId, [
      "role_admin",
      "role_manager",
      "role_dispatcher",
    ]);

    if (!user.companyId) throw new Error("User has no company");

    const [totalVehicles, vehiclesOnTrip, totalShipments, delayedShipments, allVehicles] = await Promise.all([
      db.vehicle.count({ where: { companyId: user.companyId, deletedAt: null } }),
      db.vehicle.count({
        where: { companyId: user.companyId, status: "ON_TRIP", deletedAt: null },
      }),
      db.shipment.count({ where: { companyId: user.companyId } }),
      db.shipment.count({ where: { companyId: user.companyId, status: "DELAYED" } }),
      db.vehicle.findMany({ where: { companyId: user.companyId, deletedAt: null }, select: { avgFuelConsumption: true } }),
    ]);

    const vehicleUtilization =
      totalVehicles > 0 ? (vehiclesOnTrip / totalVehicles) * 100 : 0;
    const onTimePerformance =
      totalShipments > 0 ? ((totalShipments - delayedShipments) / totalShipments) * 100 : 100;

    let totalFuelConsump = 0;
    let vehiclesWithFuelData = 0;
    for (const v of allVehicles) {
      if (v.avgFuelConsumption) {
        totalFuelConsump += v.avgFuelConsumption;
        vehiclesWithFuelData++;
      }
    }
    const avgFuelConsumption = vehiclesWithFuelData > 0 ? totalFuelConsump / vehiclesWithFuelData : 0;

    return {
      fuelConsumption: avgFuelConsumption,
      onTimePerformance: onTimePerformance,
      vehicleUtilization: vehicleUtilization,
      recentNotifications: [],
    };
  }, {
    fallback: {
      fuelConsumption: 0,
      onTimePerformance: 0,
      vehicleUtilization: 0,
      recentNotifications: [],
    },
  });
});

/**
 * tr-aktif olan rotalardaki araçların konum bilgilerini haritada göstermek üzere getirir
 * en-retrieves location information of vehicles on active routes for display on the map
 * input (user: AuthenticatedUser)
 * output (Promise<MapRouteData[]>)
 */
export const getActiveRoutesLocations = authenticatedAction(async (user) => {
  return controllerGuard("getActiveRoutesLocations", async () => {
    const companyId = user?.companyId || "";
    await checkPermission(user, companyId, [
      "role_admin",
      "role_manager",
      "role_dispatcher",
    ]);

    if (!user.companyId) throw new Error("User has no company");

    const activeRoutes = await db.route.findMany({
      where: {
        companyId: user.companyId,
        status: { in: ["ACTIVE", "PLANNED"] },
      },
      select: {
        id: true,
        status: true,
        vehicle: {
          select: {
            id: true,
            plate: true,
            currentLat: true,
            currentLng: true,
            status: true,
            type: true,
          },
        },
        name: true,
        stops: true,
      },
    });

    const mapData = activeRoutes
      .filter(
        (r) =>
          r.vehicle &&
          r.vehicle.currentLat !== null &&
          r.vehicle.currentLng !== null
      )
      .map((r: typeof activeRoutes[number]) => ({
        position: {
          lat: r.vehicle!.currentLat!,
          lng: r.vehicle!.currentLng!,
        },
        name: r.vehicle!.plate,
        id: r.vehicle!.id,
        type: "V",
        routeId: r.id,
        routeName: r.name,
      }));

    return mapData;
  }, { fallback: [] });
});

/**
 * tr-rotaları (sayfalama ve filtreleme ile) ve rota dashboard verilerini birlikte getirir
 * en-retrieves routes (with pagination and filtering) alongside route dashboard data
 * input (user: AuthenticatedUser, page?: number, pageSize?: number, status?: string | string[])
 * output (Promise<{ routes: any[], totalCount: number, stats: RouteStats, efficiency: RouteEfficiencyStats, mapData: MapRouteData[] }>)
 */
export const getRoutesWithDashboardData = authenticatedAction(
  async (
    user,
    page: number = 1,
    pageSize: number = 10,
    status?: string | string[]
  ): Promise<{
    routes: RouteWithRelations[];
    totalCount: number;
    stats: RouteStats;
    efficiency: RouteEfficiencyStats;
    mapData: MapRouteData[];
  }> => {
    const companyId = user?.companyId;

    return controllerGuard("getRoutesWithDashboardData", async () => {
      if (!companyId) throw new Error("User has no company");

      const skip = (page - 1) * pageSize;
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));

      const where: Prisma.RouteWhereInput = { companyId };
      if (status && status !== "ALL") {
        if (Array.isArray(status)) {
          if (status.length > 0) {
            where.status = { in: status as RouteStatus[] };
          }
        } else {
          where.status = status as RouteStatus;
        }
      }

      // ── Parallel Orchestration ──────────────────────────────────────────
      // This pattern ensures that checkPermission and all DB fetches start
      // simultaneously for sub-second performance.
      const cacheKey = routeCacheKeys.dashboard(
        companyId,
        hashFilters({ page, pageSize, status })
      );

      return await withCache(cacheKey, ROUTE_CACHE_TTL, async () => {
        const [
          ,
          routes,
        totalCount,
        activeCount,
        inProgressCount,
        completedCount,
        delayedCount,
        totalVehicles,
        vehiclesOnTrip,
        locationsData,
        prevActiveCount,
        prevCompletedCount,
        prevDelayedCount,
      ] = await Promise.all([
        checkPermission(user, companyId, [
          "role_admin",
          "role_manager",
          "role_dispatcher",
        ]),
        db.route.findMany({
          where,
          include: {
            vehicle: {
              select: {
                id: true,
                plate: true,
                type: true,
                brand: true,
                model: true,
                currentLat: true,
                currentLng: true,
                fuelLevel: true,
              },
            },
            driver: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    surname: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            shipments: {
              select: {
                id: true,
                status: true,
                origin: true,
                destination: true,
              },
            },
            stops: { orderBy: { sequence: "asc" } },
          },
          orderBy: [
            { date: "desc" },
            { id: "desc" },
          ],
          skip,
          take: pageSize,
        }),
        db.route.count({ where }),
        db.route.count({
          where: { companyId, status: { in: ["ACTIVE", "PLANNED"] } },
        }),
        db.route.count({
          where: { companyId, status: "ACTIVE" },
        }),
        db.route.count({
          where: {
            companyId,
            status: "COMPLETED",
            updatedAt: { gte: startOfDay },
          },
        }),
        db.route.count({
          where: {
            companyId,
            status: { not: "COMPLETED" },
            endTime: { lt: new Date() },
          },
        }),
        db.vehicle.count({ where: { companyId } }),
        db.vehicle.count({ where: { companyId, status: "ON_TRIP" } }),
        db.route.findMany({
          where: { companyId, status: { in: ["ACTIVE", "PLANNED"] } },
          select: {
            id: true,
            status: true,
            vehicle: {
              select: {
                id: true,
                plate: true,
                currentLat: true,
                currentLng: true,
                status: true,
                type: true,
              },
            },
            name: true,
            stops: true,
          },
        }),
        // Previous period counts (30–60 days ago) for trend calculation
        db.route.count({
          where: { companyId, status: { in: ["ACTIVE", "PLANNED"] }, createdAt: { gte: daysAgo(60), lt: daysAgo(30) } },
        }),
        db.route.count({
          where: { companyId, status: "COMPLETED", createdAt: { gte: daysAgo(60), lt: daysAgo(30) } },
        }),
        db.route.count({
          where: { companyId, status: { not: "COMPLETED" }, endTime: { lt: daysAgo(30) }, createdAt: { gte: daysAgo(60) } },
        }),
      ]);

      const utilization =
        totalVehicles > 0 ? (vehiclesOnTrip / totalVehicles) * 100 : 0;

      const typedRoutes: RouteWithRelations[] = routes.map((route) => ({
        ...route,
        stops: route.stops.map((stop) => ({
          address: stop.address,
          lat: stop.lat ?? undefined,
          lng: stop.lng ?? undefined,
        })),
      }));

      return {
        routes: typedRoutes,
        totalCount,
        stats: {
          active: activeCount,
          inProgress: inProgressCount,
          completedToday: completedCount,
          delayed: delayedCount,
        },
        statsTrends: {
          active: calcTrend(activeCount, prevActiveCount),
          completedToday: calcTrend(completedCount, prevCompletedCount),
          delayed: calcTrend(delayedCount, prevDelayedCount),
        },
        efficiency: {
          fuelConsumption: 24.5,
          onTimePerformance: 89,
          vehicleUtilization: utilization,
          recentNotifications: [],
        },
        mapData: locationsData
          .filter((r: typeof locationsData[number]) => !!(r.vehicle?.currentLat && r.vehicle?.currentLng))
          .map((r: typeof locationsData[number]) => ({
            position: {
              lat: r.vehicle!.currentLat!,
              lng: r.vehicle!.currentLng!,
            },
            name: r.vehicle!.plate,
            id: r.vehicle!.id,
            type: "V",
            routeId: r.id,
            routeName: r.name,
          })),
      };
      });
    });
  }
);
