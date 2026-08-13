"use server";

import { db } from "../../db";
import { authenticatedAction } from "../../auth-middleware";
import { checkPermission } from "../utils/checkPermission";
import { type Prisma, ShipmentStatus } from "@prisma/client";
import {
  ShipmentWithRelations,
  ShipmentStats,
  ShipmentVolumeData,
  ShipmentStatusData,
} from "../../type/shipment";
import {
  withCache,
  hashFilters,
  shipmentCacheKeys,
  SHIPMENT_CACHE_TTL,
} from "../../redis";
import { calcTrend, daysAgo } from "../utils/trendUtils";
import { controllerGuard } from "../utils/controllerGuard";
import { NoCompanyError } from "../../errors";

/**
 * tr-şirketin genel sevkiyat istatistiklerini (toplam, aktif, geciken, yolda) getirir
 * en-retrieves general shipment statistics (total, active, delayed, in transit) for the company
 * input (user: AuthenticatedUser)
 * output (Promise<{ total: number, active: number, delayed: number, inTransit: number }>)
 */
export const getShipmentStats = authenticatedAction(async (user) => {
  const companyId = user?.companyId;

  return controllerGuard("getShipmentStats", async () => {
    await checkPermission(user, companyId);

    if (!companyId) throw new NoCompanyError();

    const [total, active, delayed, inTransit] = await Promise.all([
      db.shipment.count({ where: { companyId } }),
      db.shipment.count({
        where: {
          companyId,
          status: {
            in: [
              ShipmentStatus.PENDING,
              ShipmentStatus.IN_TRANSIT,
              ShipmentStatus.PROCESSING,
            ],
          },
        },
      }),
      db.shipment.count({
        where: { companyId, status: ShipmentStatus.DELAYED },
      }),
      db.shipment.count({
        where: { companyId, status: ShipmentStatus.IN_TRANSIT },
      }),
    ]);

    return { total, active, delayed, inTransit };
  }, { fallback: { total: 0, active: 0, delayed: 0, inTransit: 0 } });
});

/**
 * tr-son 7 güne ait günlük sevkiyat hacmi geçmişini hesaplar
 * en-calculates the daily shipment volume history for the last 7 days
 * input (user: AuthenticatedUser)
 * output (Promise<ShipmentVolumeData[]>)
 */
export const getShipmentVolumeHistory = authenticatedAction(async (user) => {
  const companyId = user?.companyId;

  return controllerGuard("getShipmentVolumeHistory", async () => {
    await checkPermission(user, companyId, ["role_admin", "role_manager"]);

    if (!companyId) throw new NoCompanyError();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const rawShipments = await db.shipment.findMany({
      where: {
        companyId,
        createdAt: { gte: sevenDaysAgo },
      },
      select: { createdAt: true },
    });

    const volumeByDay: Record<string, number> = {};
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    rawShipments.forEach((s: { createdAt: Date }) => {
      const dayName = days[s.createdAt.getDay()] ?? "Sun";
      volumeByDay[dayName] = (volumeByDay[dayName] || 0) + 1;
    });

    return days.map((day) => ({
      day,
      volume: volumeByDay[day] || 0,
    }));
  }, { fallback: [] });
});

/**
 * tr-sevkiyatların durumlarına (PENDING, IN_TRANSIT vb.) göre dağılımını getirir
 * en-retrieves the distribution of shipments by their status (PENDING, IN_TRANSIT, etc.)
 * input (user: AuthenticatedUser)
 * output (Promise<ShipmentStatusData[]>)
 */
export const getShipmentStatusDistribution = authenticatedAction(
  async (user) => {
    const companyId = user?.companyId;

    return controllerGuard("getShipmentStatusDistribution", async () => {
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      if (!companyId) throw new NoCompanyError();

      const statusCounts = await db.shipment.groupBy({
        by: ["status"],
        where: { companyId },
        _count: { status: true },
      });

      return statusCounts.map((s) => ({
        status: s.status,
        count: s._count.status,
      }));
    }, { fallback: [] });
  }
);

/**
 * tr-sevkiyat listesini ve ilgili dashboard verilerini (istatistikler, hacim geçmişi, dağılım) birlikte getirir
 * en-retrieves the shipment list along with dashboard data (stats, volume history, status distribution)
 * input (user: AuthenticatedUser, page?: number, pageSize?: number, status?: ShipmentStatus | "ALL", search?: string)
 * output (Promise<{ shipments: ShipmentWithRelations[], totalCount: number, stats: ShipmentStats, statsTrends: any, volumeHistory: ShipmentVolumeData[], statusDistribution: ShipmentStatusData[] }>)
 */
export const getShipmentsWithDashboardData = authenticatedAction(
  async (
    user,
    page: number = 1,
    pageSize: number = 10,
    status?: ShipmentStatus | "ALL",
    search?: string
  ): Promise<{
    shipments: ShipmentWithRelations[];
    totalCount: number;
    stats: ShipmentStats;
    statsTrends: {
      total: { value: number; isUp: boolean } | undefined;
      active: { value: number; isUp: boolean } | undefined;
      delayed: { value: number; isUp: boolean } | undefined;
      inTransit: { value: number; isUp: boolean } | undefined;
    };
    volumeHistory: ShipmentVolumeData[];
    statusDistribution: ShipmentStatusData[];
  }> => {
    const companyId = user?.companyId;

    return controllerGuard("getShipmentsWithDashboardData", async () => {
      if (!companyId) throw new Error("User has no company");

      const skip = (page - 1) * pageSize;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Trend windows
      const periodStart = daysAgo(30);
      const prevPeriodStart = daysAgo(60);
      const prevPeriodEnd = periodStart;

      const where: Prisma.ShipmentWhereInput = { companyId };
      if (status && status !== "ALL") {
        where.status = status;
      }
      if (search) {
        where.OR = [
          { trackingId: { contains: search, mode: "insensitive" } },
          { origin: { contains: search, mode: "insensitive" } },
          { destination: { contains: search, mode: "insensitive" } },
          { customer: { name: { contains: search, mode: "insensitive" } } },
        ];
      }

      // ── Parallel Orchestration ──────────────────────────────────────────
      const cacheKey = shipmentCacheKeys.dashboard(
        companyId,
        hashFilters({ page, pageSize, status, search })
      );

      return await withCache(cacheKey, SHIPMENT_CACHE_TTL, async () => {
        const [
          ,
          shipments,
          totalCount,
          total,
          active,
          delayed,
          inTransit,
          rawVolumeHistory,
          statusCounts,
          prevTotal,
          prevActive,
          prevDelayed,
          prevInTransit,
        ] = await Promise.all([
          checkPermission(user, companyId, [
            "role_admin",
            "role_manager",
            "role_dispatcher",
          ]),
          db.shipment.findMany({
            where,
            include: {
              customer: {
                include: { locations: true },
              },
              driver: {
                include: {
                  user: {
                    select: { name: true, surname: true, avatarUrl: true },
                  },
                },
              },
              route: { include: { stops: { orderBy: { sequence: "asc" } } } },
              items: true,
              stops: {
                orderBy: {
                  sequence: "asc",
                },
              },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: pageSize,
          }),
          db.shipment.count({ where }),
          db.shipment.count({ where: { companyId } }),
          db.shipment.count({
            where: {
              companyId,
              status: {
                in: [
                  ShipmentStatus.PENDING,
                  ShipmentStatus.IN_TRANSIT,
                  ShipmentStatus.PROCESSING,
                ],
              },
            },
          }),
          db.shipment.count({
            where: { companyId, status: ShipmentStatus.DELAYED },
          }),
          db.shipment.count({
            where: { companyId, status: ShipmentStatus.IN_TRANSIT },
          }),
          db.shipment.findMany({
            where: {
              companyId,
              createdAt: { gte: sevenDaysAgo },
            },
            select: { createdAt: true },
          }),
          db.shipment.groupBy({
            by: ["status"],
            where: { companyId },
            _count: { status: true },
          }),
          // Previous period stats (30–60 days ago)
          db.shipment.count({
            where: {
              companyId,
              createdAt: { gte: prevPeriodStart, lt: prevPeriodEnd },
            },
          }),
          db.shipment.count({
            where: {
              companyId,
              status: {
                in: [
                  ShipmentStatus.PENDING,
                  ShipmentStatus.IN_TRANSIT,
                  ShipmentStatus.PROCESSING,
                ],
              },
              createdAt: { gte: prevPeriodStart, lt: prevPeriodEnd },
            },
          }),
          db.shipment.count({
            where: {
              companyId,
              status: ShipmentStatus.DELAYED,
              createdAt: { gte: prevPeriodStart, lt: prevPeriodEnd },
            },
          }),
          db.shipment.count({
            where: {
              companyId,
              status: ShipmentStatus.IN_TRANSIT,
              createdAt: { gte: prevPeriodStart, lt: prevPeriodEnd },
            },
          }),
        ]);

        // Volume History Transformation
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const volumeByDay: Record<string, number> = {};
        rawVolumeHistory.forEach((s: { createdAt: Date }) => {
          const dayName = days[s.createdAt.getDay()] ?? "Sun";
          volumeByDay[dayName] = (volumeByDay[dayName] || 0) + 1;
        });
        const volumeHistory = days.map((day) => ({
          day,
          volume: volumeByDay[day] || 0,
        }));

        const statsTrends = {
          total: calcTrend(total, prevTotal),
          active: calcTrend(active, prevActive),
          delayed: calcTrend(delayed, prevDelayed),
          inTransit: calcTrend(inTransit, prevInTransit),
        };

        const typedShipments: ShipmentWithRelations[] = shipments.map(
          (shipment) => ({
            ...shipment,
            route: shipment.route
              ? {
                  ...shipment.route,
                  stops: shipment.route.stops.map((stop) => ({
                    address: stop.address,
                    lat: stop.lat ?? undefined,
                    lng: stop.lng ?? undefined,
                  })),
                }
              : null,
          })
        );

        return {
          shipments: typedShipments,
          totalCount,
          stats: { total, active, delayed, inTransit },
          statsTrends,
          volumeHistory,
          statusDistribution: statusCounts.map(
            (s: { status: ShipmentStatus; _count: { status: number } }) => ({
              status: s.status as import("../../type/enums").ShipmentStatus,
              count: s._count.status,
            })
          ),
        };
      });
    });
  }
);
