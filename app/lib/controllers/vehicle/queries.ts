"use server";

import { db } from "../../db";
import { Prisma, IssueStatus } from "@prisma/client";
import { checkPermission } from "../utils/checkPermission";
import { authenticatedAction } from "../../auth-middleware";
import {
  VehicleCapacityConverter,
  VehicleDocumentConverter,
  VehicleKpiConverter,
  VehicleServiceConverter,
} from "../utils/vehicleUtils";
import {
  VehicleFilters,
  VehicleWithRelations,
  VehicleDashboardProps,
} from "../../type/vehicle";
import {
  withCache,
  hashFilters,
  vehicleCacheKeys,
  VEHICLE_CACHE_TTL,
} from "../../redis";
import { calcTrend, daysAgo } from "../utils/trendUtils";
import { controllerGuard } from "../utils/controllerGuard";
import { withLiveDocumentStatus } from "../../utils/documentStatus";

/**
 * tr-kullanıcının şirketine ait araçları, uygulanan filtrelere (arama, durum, tip vb.) göre ilişkili verilerle listeler
 * en-lists the user's company vehicles with related data based on applied filters (search, status, type, etc.)
 * input (user: AuthenticatedUser, filters?: VehicleFilters)
 * output (Promise<VehicleWithRelations[]>)
 */
export const getVehicles = authenticatedAction(
  async (user, filters?: VehicleFilters): Promise<VehicleWithRelations[]> => {
    const companyId = user?.companyId || "";
    return controllerGuard("getVehicles", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      if (!companyId) throw new Error("User has no company");

      const whereClause: Prisma.VehicleWhereInput = { companyId, deletedAt: null };

      if (filters) {
        if (filters.search) {
          whereClause.OR = [
            { plate: { contains: filters.search, mode: "insensitive" } },
            { brand: { contains: filters.search, mode: "insensitive" } },
            { model: { contains: filters.search, mode: "insensitive" } },
          ];
        }

        if (filters.status && filters.status.length > 0) {
          whereClause.status = { in: filters.status };
        }

        if (filters.type && filters.type.length > 0) {
          whereClause.type = { in: filters.type };
        }

        if (filters.hasIssues) {
          whereClause.issues = {
            some: {
              status: { in: [IssueStatus.OPEN, IssueStatus.IN_PROGRESS] },
            },
          };
        }

        if (filters.hasDriver === true) {
          whereClause.driver = { isNot: null };
        } else if (filters.hasDriver === false) {
          whereClause.driver = { is: null };
        }
      }

      const vehicles = await db.vehicle.findMany({
        where: whereClause,
        include: {
          driver: {
            select: {
              id: true,
              rating: true,
              user: {
                select: { name: true, surname: true, avatarUrl: true },
              },
            },
          },
          issues: true,
          documents: true,
          maintenanceRecords: true,
          routes: { include: { stops: { orderBy: { sequence: "asc" } } } },
        },
        orderBy: { createdAt: "desc" },
      });
      const result: VehicleWithRelations[] = vehicles.map((vehicle) => ({
        ...vehicle,
        // tr-Saklı `status` oluşturma anında donuyor; süresi dolmuş belge ACTIVE görünmesin.
        // en-The stored `status` is frozen at creation; don't let a lapsed document read ACTIVE.
        documents: withLiveDocumentStatus(vehicle.documents),
        maintenanceRecords: vehicle.maintenanceRecords.map((record) => ({
          ...record,
          cost: Number(record.cost),
          originalCost:
            record.originalCost === null ? null : Number(record.originalCost),
        })),
        routes: vehicle.routes.map((route) => ({
          ...route,
          stops: route.stops.map((stop) => ({
            address: stop.address,
            lat: stop.lat ?? undefined,
            lng: stop.lng ?? undefined,
          })),
        })),
      }));
      return result;
    });
  }
);

/**
 * tr-araç gösterge paneli (dashboard) için gerekli KPI, kapasite, belge ve servis özet verilerini trendlerle birlikte getirir
 * en-fetches KPI, capacity, document, and service summary data along with trends for the vehicle dashboard
 * input (user: AuthenticatedUser)
 * output (Promise<{ vehiclesKpis, vehiclesCapacity, expiringDocs, plannedServices, kpiTrends }>)
 */
export const getVehiclesDashboardData = authenticatedAction(async (user) => {
  const companyId = user?.companyId || "";
  return controllerGuard("getVehiclesDashboardData", async () => {
    await checkPermission(user, companyId, [
      "role_admin",
      "role_manager",
      "role_dispatcher",
    ]);

    if (!companyId) throw new Error("User has no company");

    const cacheKey = vehicleCacheKeys.kpis(companyId);

    return await withCache(cacheKey, VEHICLE_CACHE_TTL, async () => {
      const vehicles = await db.vehicle.findMany({
        where: { companyId, deletedAt: null },
        select: {
          id: true,
          plate: true,
          status: true,
          maxLoadKg: true,

          issues: {
            where: {
              status: {
                in: ["OPEN", "IN_PROGRESS"],
              },
            },
            select: { id: true },
          },

          documents: {
            select: {
              type: true,
              expiryDate: true,
            },
          },
          maintenanceRecords: {
            where: {
              status: { in: ["SCHEDULED"] },
            },
            select: {
              type: true,
              date: true,
              status: true,
            },
          },
        },
      });

      // Previous period snapshot for trend calculation
      const prevPeriodEnd = daysAgo(30);
      const prevVehicleCount = await db.vehicle.count({
        where: { companyId, createdAt: { lt: prevPeriodEnd } },
      });

      const dashboardInput: VehicleDashboardProps[] = vehicles;
      const vehiclesKpis = VehicleKpiConverter(dashboardInput);
      const vehiclesCapacity = VehicleCapacityConverter(dashboardInput);
      const expiringDocs = VehicleDocumentConverter(dashboardInput);
      const plannedServices = VehicleServiceConverter(dashboardInput);

      const kpiTrends = {
        totalVehicles: calcTrend(vehiclesKpis.totalVehicles, prevVehicleCount),
      };

      return {
        vehiclesKpis,
        vehiclesCapacity,
        expiringDocs,
        plannedServices,
        kpiTrends,
      };
    });
  });
});

/**
 * tr-araçları listelerken aynı anda gösterge paneli (dashboard) özet verilerini tek bir istekte döndürür (önbelleklemeli)
 * en-returns both the list of vehicles and dashboard summary data in a single request (cached)
 * input (user: AuthenticatedUser, filters?: VehicleFilters)
 * output (Promise<{ vehicles: VehicleWithRelations[], vehiclesKpis, vehiclesCapacity, expiringDocs, plannedServices }>)
 */
export const getVehiclesWithDashboard = authenticatedAction(
  async (
    user,
    filters?: VehicleFilters
  ): Promise<{
    vehicles: VehicleWithRelations[];
    vehiclesKpis: ReturnType<typeof VehicleKpiConverter>;
    vehiclesCapacity: ReturnType<typeof VehicleCapacityConverter>;
    expiringDocs: ReturnType<typeof VehicleDocumentConverter>;
    plannedServices: ReturnType<typeof VehicleServiceConverter>;
  }> => {
    const companyId = user?.companyId || "";

    return controllerGuard("getVehiclesWithDashboard", async () => {
      if (!companyId) throw new Error("User has no company");

      const cacheKey = vehicleCacheKeys.dashboard(
        companyId,
        hashFilters(filters as Record<string, unknown>)
      );

      return await withCache(cacheKey, VEHICLE_CACHE_TTL, async () => {
        const whereClause: Prisma.VehicleWhereInput = { companyId, deletedAt: null };

        if (filters) {
          if (filters.search) {
            whereClause.OR = [
              { plate: { contains: filters.search, mode: "insensitive" } },
              { brand: { contains: filters.search, mode: "insensitive" } },
              { model: { contains: filters.search, mode: "insensitive" } },
            ];
          }
          if (filters.status && filters.status.length > 0) {
            whereClause.status = { in: filters.status };
          }
          if (filters.type && filters.type.length > 0) {
            whereClause.type = { in: filters.type };
          }
          if (filters.hasIssues) {
            whereClause.issues = {
              some: {
                status: { in: [IssueStatus.OPEN, IssueStatus.IN_PROGRESS] },
              },
            };
          }
          if (filters.hasDriver === true) {
            whereClause.driver = { isNot: null };
          } else if (filters.hasDriver === false) {
            whereClause.driver = { is: null };
          }
        }

        // ── Promise.all: checkPermission + findMany in parallel ─────────────────
        // Both DB calls start at once; checkPermission (~200ms) completes while
        // findMany (~400-800ms) is awaited → total time is max(), not the sum.
        // If checkPermission fails, Promise.all rejects immediately.
        const [, vehicles] = await Promise.all([
          checkPermission(user, companyId, [
            "role_admin",
            "role_manager",
            "role_dispatcher",
          ]),
          db.vehicle.findMany({
            where: whereClause,
            select: {
              // ── Scalars (VehicleWithRelations) ──────────────────────────────
              id: true,
              fleetNo: true,
              plate: true,
              brand: true,
              model: true,
              year: true,
              type: true,
              fuelType: true,
              maxLoadKg: true,
              nextServiceKm: true,
              avgFuelConsumption: true,
              status: true,
              odometerKm: true,
              fuelLevel: true,
              fuelCapacity: true,
              currentLat: true,
              currentLng: true,
              photo: true,
              createdAt: true,
              updatedAt: true,
              engineSize: true,
              transmission: true,
              techNotes: true,

              // ── Driver ──────────────────────────────────────────────────────
              driver: {
                select: {
                  id: true,
                  rating: true,
                  user: {
                    select: { name: true, surname: true, avatarUrl: true },
                  },
                },
              },

              // ── Issues ──────────────────────────────────────────────────────
              issues: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                  priority: true,
                  status: true,
                  description: true,
                  vehicleId: true,
                  companyId: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },

              // ── Documents ───────────────────────────────────────────────────
              documents: {
                select: {
                  id: true,
                  type: true,
                  name: true,
                  url: true,
                  expiryDate: true,
                  status: true,
                  vehicleId: true,
                  companyId: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },

              // ── Maintenance records ──────────────────────────────────────────
              maintenanceRecords: {
                select: {
                  id: true,
                  type: true,
                  date: true,
                  cost: true,
                  currency: true,
                  status: true,
                  description: true,
                  vehicleId: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },

              // ── Routes ──────────────────────────────────────────────────────
              routes: {
                select: {
                  id: true,
                  status: true,
                  date: true,
                  stops: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
        ]);

        const vehiclesWithRelations: VehicleWithRelations[] = vehicles.map(
          (vehicle) => ({
            ...vehicle,
            // tr-Saklı belge durumu bayat; tarihten türetilenle değiştir (bkz. documentStatus.ts)
            // en-Stored document status is stale; swap in the date-derived one
            documents: withLiveDocumentStatus(vehicle.documents),
            maintenanceRecords: vehicle.maintenanceRecords.map((record) => ({
              ...record,
              cost: Number(record.cost),
            })),
            routes: vehicle.routes.map((route) => ({
              ...route,
              stops: route.stops.map((stop) => ({
                address: stop.address,
                lat: stop.lat ?? undefined,
                lng: stop.lng ?? undefined,
              })),
            })),
          })
        );
        const dashboardInput: VehicleDashboardProps[] = vehicles;

        return {
          vehicles: vehiclesWithRelations,
          vehiclesKpis: VehicleKpiConverter(dashboardInput),
          vehiclesCapacity: VehicleCapacityConverter(dashboardInput),
          expiringDocs: VehicleDocumentConverter(dashboardInput),
          plannedServices: VehicleServiceConverter(dashboardInput),
        };
      }); // end withCache
    });
  }
);
