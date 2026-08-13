"use server";

import { type Prisma, RouteStatus } from "@prisma/client";
import { db } from "../../db";
import { authenticatedAction } from "../../auth-middleware";
import { checkPermission } from "../utils/checkPermission";
import {
  withCache,
  hashFilters,
  routeCacheKeys,
  ROUTE_CACHE_TTL,
} from "../../redis";
import { controllerGuard } from "../utils/controllerGuard";

/**
 * tr-şirkete ait rotaları sayfalama ve durum filtresi ile getirir
 * en-retrieves company routes with pagination and status filtering
 * input (user: AuthenticatedUser, page?: number, pageSize?: number, status?: string)
 * output (Promise<{ routes: any[], totalCount: number }>)
 */
export const getRoutes = authenticatedAction(
  async (user, page: number = 1, pageSize: number = 10, status?: string) => {
    const companyId = user?.companyId || "";
    return controllerGuard("getRoutes", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const skip = (page - 1) * pageSize;
      const where: Prisma.RouteWhereInput = {
        companyId,
      };

      if (status && status !== "ALL") {
        where.status = status as RouteStatus;
      }

      const cacheKey = routeCacheKeys.list(
        companyId!,
        hashFilters({ page, pageSize, status })
      );

      return await withCache(cacheKey, ROUTE_CACHE_TTL, async () => {
        const [routes, totalCount] = await Promise.all([
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
          },
          orderBy: [
            { date: "desc" },
            { id: "desc" },
          ],
          skip,
          take: pageSize,
        }),
        db.route.count({ where }),
      ]);

      return { routes, totalCount };
      });
    });
  }
);

/**
 * tr-belirtilen rotanın tüm detaylarını (araç, sürücü, sevkiyat ve duraklar dahil) getirir
 * en-retrieves all details of the specified route (including vehicle, driver, shipments, and stops)
 * input (user: AuthenticatedUser, routeId: string)
 * output (Promise<Route>)
 */
export const getRouteById = authenticatedAction(
  async (user, routeId: string) => {
    const companyId = user?.companyId || "";
    return controllerGuard("getRouteById", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const route = await db.route.findFirst({
        where: { id: routeId, companyId },
        include: {
          driver: {
            include: {
              user: {
                select: { name: true, surname: true, avatarUrl: true },
              },
            },
          },
          vehicle: {
            include: {
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
            },
          },
          shipments: {
            include: {
              stops: {
                orderBy: { sequence: "asc" }
              }
            }
          }
        },
      });

      if (!route) {
        throw new Error("Route not found or unauthorized");
      }

      return route;
    });
  }
);

/**
 * tr-belirtilen sürücüye atanmış olan tüm rotaları getirir
 * en-retrieves all routes assigned to the specified driver
 * input (user: AuthenticatedUser, driverId: string)
 * output (Promise<Route[]>)
 */
export const getDriverRoutes = authenticatedAction(
  async (user, driverId: string) => {
    const companyId = user?.companyId || "";
    return controllerGuard("getDriverRoutes", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const routes = await db.route.findMany({
        where: { driverId, companyId },
        orderBy: { date: "desc" },
      });
      return routes;
    });
  }
);

/**
 * tr-belirtilen araca atanmış olan tüm rotaları getirir
 * en-retrieves all routes assigned to the specified vehicle
 * input (user: AuthenticatedUser, vehicleId: string)
 * output (Promise<Route[]>)
 */
export const getVehicleRoutes = authenticatedAction(
  async (user, vehicleId: string) => {
    const companyId = user?.companyId || "";
    return controllerGuard("getVehicleRoutes", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const routes = await db.route.findMany({
        where: { vehicleId, companyId },
        orderBy: { date: "desc" },
      });
      return routes;
    });
  }
);

/**
 * tr-şirkete ait tüm rotaları listeler
 * en-lists all routes belonging to the company
 * input (user: AuthenticatedUser)
 * output (Promise<Route[]>)
 */
export const getCompanyRoutes = authenticatedAction(async (user) => {
  const companyId = user?.companyId;
  return controllerGuard("getCompanyRoutes", async () => {
    await checkPermission(user, companyId, [
      "role_admin",
      "role_manager",
      "role_dispatcher",
    ]);

    if (!user.companyId) throw new Error("User has no company");

    const routes = await db.route.findMany({
      where: { companyId: user.companyId },
      orderBy: { date: "desc" },
    });
    return routes;
  });
});
