"use server";

import { db } from "../../db";
import { checkPermission } from "../utils/checkPermission";
import { DriverStatus, Prisma } from "@prisma/client";
import { authenticatedAction } from "../../auth-middleware";
import {
  DriverHistory,
  DriverActivity,
  DriverWithRelations,
  PaginatedResponse,
} from "../../type/driver";
import { controllerGuard } from "../utils/controllerGuard";
import { NotFoundError } from "../../errors";
import { driverCache } from "./shared";
import {
  computeDocumentStatus,
  withLiveDocumentStatus,
} from "../../utils/documentStatus";

/**
 * tr-sürücü olarak atanmaya uygun olan, henüz sürücü rolü olmayan kullanıcıları getirir
 * en-retrieves users eligible to be assigned as drivers, who do not yet have the driver role
 * input (user: AuthenticatedUser)
 * output (Promise<User[]>)
 */
export const getEligibleUsersForDriver = authenticatedAction(async (user) => {
  return controllerGuard("getEligibleUsersForDriver", async () => {
    const companyId = user?.companyId || "";
    await checkPermission(user, companyId, [
      "role_admin",
      "role_manager",
      "role_dispatcher",
    ]);

    const users = await db.user.findMany({
      where: {
        companyId,
        roleId: { contains: "default", mode: "insensitive" },
      },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
      },
    });

    return users;
  });
});

/**
 * tr-belirtilen sürücünün geçmiş aktivitelerini, tamamladığı rotaları ve sevkiyatları getirir
 * en-retrieves past activities, completed routes, and shipments of the specified driver
 * input (user: AuthenticatedUser, driverId: string)
 * output (Promise<DriverHistory>)
 */
export const getDriverHistory = authenticatedAction(
  async (user, driverId: string): Promise<DriverHistory> => {
    return controllerGuard("getDriverHistory", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const driver = await db.driver.findFirst({
        where: { id: driverId, companyId },
        include: {
          user: {
            include: {
              auditLogs: {
                where: {
                  action: { in: ["LOGIN", "LOGOUT"] },
                },
                orderBy: { createdAt: "desc" },
                take: 50,
              },
            },
          },
          routes: {
            where: { status: "COMPLETED" },
            orderBy: { endTime: "desc" },
            take: 20,
            include: { stops: { orderBy: { sequence: "asc" } } },
          },
          shipments: {
            where: { status: "DELIVERED" },
            orderBy: { updatedAt: "desc" },
            take: 20,
          },
          // tr-`status: "ACTIVE"` ile filtrelemek yanıltıcıydı: saklı durum hiç güncellenmediği
          //    için süresi dolmuş belgeler de ACTIVE olarak kayıtlı ve bu filtreden geçiyordu.
          //    Tüm belgeler çekilip durum aşağıda tarihten türetiliyor.
          // en-Filtering on `status: "ACTIVE"` was misleading: the stored status is never
          //    updated, so lapsed documents are still recorded as ACTIVE and passed this
          //    filter. Fetch them all and derive status from the date below.
          documents: true,
        },
      });

      if (!driver) {
        throw new NotFoundError("Driver");
      }

      const activities: DriverActivity[] = [];

      // Add completed routes
      driver.routes.forEach((route) => {
        const stopsArr = route.stops;
        const startAddr = stopsArr.length > 0 ? stopsArr[0]?.address : null;
        const endAddr = stopsArr.length > 0 ? stopsArr[stopsArr.length - 1]?.address : null;
        activities.push({
          id: route.id,
          type: "ROUTE_COMPLETED",
          title: "Route Completed",
          description: `Finished route ${route.name || route.id} from ${startAddr || "Start"} to ${endAddr || "End"}`,
          timestamp: route.endTime || route.updatedAt,
          metadata: { routeId: route.id },
        });
      });

      // Add job completions (shipments)
      driver.shipments.forEach((shipment) => {
        activities.push({
          id: shipment.id,
          type: "JOB_COMPLETED",
          title: "Job Delivered",
          description: `Successfully delivered shipment ${shipment.trackingId} to ${shipment.destination}`,
          timestamp: shipment.updatedAt,
          metadata: { shipmentId: shipment.id },
        });
      });

      // Sort activities by timestamp descending
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return {
        activities,
        completedRoutes: driver.routes.length,
        completedShipments: driver.shipments.length,
        // tr-"Aktif" sayısı yalnızca gerçekten geçerli belgeleri kapsamalı; süresi dolmuş
        //    olanlar saklı durumda hâlâ ACTIVE göründüğü için tarihten kontrol ediyoruz.
        // en-The "active" count must only include genuinely valid documents; lapsed ones
        //    still read ACTIVE in the stored status, so we check the date instead.
        activePermissions: driver.documents.filter(
          (doc) => computeDocumentStatus(doc.expiryDate) === "ACTIVE"
        ).length,
      };
    });
  }
);

/**
 * tr-sürücüleri (sayfalama, arama ve filtreleme ile) getirir
 * en-retrieves drivers with pagination, search, and filtering
 * input (user: AuthenticatedUser, page?: number, limit?: number, search?: string, status?: DriverStatus[], hasVehicle?: boolean, sortField?: string, sortOrder?: "asc" | "desc")
 * output (Promise<PaginatedResponse<DriverWithRelations>>)
 */
export const getDrivers = authenticatedAction(
  async (
    user,
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: DriverStatus[],
    hasVehicle?: boolean,
    sortField?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<PaginatedResponse<DriverWithRelations>> => {
    return controllerGuard("getDrivers", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const skip = (page - 1) * limit;

      const where: Prisma.DriverWhereInput = {
        companyId,
      };

      if (search) {
        where.OR = [
          {
            user: {
              name: { contains: search, mode: "insensitive" },
            },
          },
          {
            user: {
              surname: { contains: search, mode: "insensitive" },
            },
          },
          {
            licenseNumber: { contains: search, mode: "insensitive" },
          },
          {
            phone: { contains: search, mode: "insensitive" },
          },
        ];
      }

      if (status && status.length > 0) {
        where.status = { in: status };
      }

      if (hasVehicle !== undefined) {
        if (hasVehicle) {
          where.currentVehicleId = { not: null };
        } else {
          where.currentVehicleId = null;
        }
      }

      let orderBy: Prisma.DriverOrderByWithRelationInput = {
        createdAt: "desc",
      };
      if (sortField && sortOrder) {
        if (sortField === "name") {
          orderBy = { user: { name: sortOrder } };
        } else if (sortField === "vehicle") {
          orderBy = { currentVehicle: { plate: sortOrder } };
        } else {
          orderBy = {
            [sortField]: sortOrder,
          } as Prisma.DriverOrderByWithRelationInput;
        }
      }

      return await driverCache.cached(
        companyId,
        driverCache.hashFilters({ page, limit, search, status, hasVehicle, sortField, sortOrder }),
        async () => {
          const [drivers, total] = await Promise.all([
            db.driver.findMany({
            where,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  surname: true,
                  email: true,
                  avatarUrl: true,
                  roleId: true,
                },
              },
              currentVehicle: {
                select: {
                  id: true,
                  plate: true,
                  brand: true,
                  model: true,
                },
              },
              homeBaseWarehouse: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
              _count: {
                select: {
                  shipments: true,
                  issues: true,
                },
              },
              documents: true,
            },
            orderBy: orderBy,
            skip,
            take: limit,
          }),
          db.driver.count({ where }),
        ]);

        // tr-Saklı belge durumu bayat; arayüze vermeden önce tarihten türetilenle değiştir.
        // en-The stored document status is stale; swap in the date-derived one before the UI.
        const typedDrivers: DriverWithRelations[] = drivers.map((driver) => ({
          ...driver,
          documents: withLiveDocumentStatus(driver.documents),
        }));

        return {
          data: typedDrivers,
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        };
        }
      );
    });
  }
);
