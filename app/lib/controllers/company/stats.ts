"use server";

import { db } from "../../db";
import { checkPermission } from "../utils/checkPermission";
import { authenticatedAction } from "../../auth-middleware";
import { Prisma } from "@prisma/client";
import {
  withCache,
  hashFilters,
  companyCacheKeys,
  COMPANY_CACHE_TTL,
} from "../../redis";
import { calcTrend, daysAgo } from "../utils/trendUtils";
import { controllerGuard } from "../utils/controllerGuard";

/**
 * tr-şirket profilini, istatistiklerini ve üyelerini getirir
 * en-retrieves the company profile, statistics, and members
 * input (user: AuthenticatedUser)
 * output (Promise<{ profile: object, stats: object, members: object[] }>)
 */
export const getCompanyProfile = authenticatedAction(async (user) => {
  const companyId = user?.companyId || "";

  return controllerGuard("getCompanyProfile", async () => {
    await checkPermission(user, companyId, ["role_admin", "role_manager"]);

    const company = await db.company.findUnique({
      where: { id: companyId, users: { some: { id: user.id } } },
      include: {
        users: {
          include: { role: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const [
      vehicleCount,
      driverCount,
      warehouseCount,
      customerCount,
      shipmentCount,
    ] = await Promise.all([
      db.vehicle.count({ where: { companyId } }),
      db.driver.count({ where: { companyId } }),
      db.warehouse.count({ where: { companyId } }),
      db.customer.count({ where: { companyId } }),
      db.shipment.count({ where: { companyId } }),
    ]);

    return {
      profile: {
        id: company?.id,
        name: company?.name,
        avatarUrl: company?.avatarUrl ?? null,
        createdAt: company?.createdAt.toISOString(),
        updatedAt: company?.updatedAt.toISOString(),
      },
      stats: {
        users: company?.users.length,
        vehicles: vehicleCount,
        drivers: driverCount,
        warehouses: warehouseCount,
        customers: customerCount,
        shipments: shipmentCount,
      },
      members: company?.users.map((u) => ({
        id: u.id,
        name: u.name,
        surname: u.surname,
        email: u.email,
        avatarUrl: u.avatarUrl ?? null,
        status: u.status,
        roleId: u.role?.id ?? null,
        roleName: u.role?.name ?? null,
        assignedWarehouseId: u.assignedWarehouseId ?? null,
        createdAt: u.createdAt.toISOString(),
      })),
    };
  });
});

/**
 * tr-şirketin temel sayım istatistiklerini getirir (kullanıcı, araç, depo vb.)
 * en-retrieves basic count statistics for the company (users, vehicles, warehouses, etc.)
 * input (user: AuthenticatedUser)
 * output (Promise<{ users: number, vehicles: number, drivers: number, warehouses: number, customers: number, shipments: number }>)
 */
export const getCompanyStats = authenticatedAction(async (user) => {
  const companyId = user?.companyId || "";

  return controllerGuard("getCompanyStats", async () => {
    await checkPermission(user, companyId, ["role_admin", "role_manager"]);

    const [
      userCount,
      vehicleCount,
      driverCount,
      warehouseCount,
      customerCount,
      shipmentCount,
    ] = await Promise.all([
      db.user.count({ where: { companyId } }),
      db.vehicle.count({ where: { companyId } }),
      db.driver.count({ where: { companyId } }),
      db.warehouse.count({ where: { companyId } }),
      db.customer.count({ where: { companyId } }),
      db.shipment.count({ where: { companyId } }),
    ]);

    return {
      users: userCount,
      vehicles: vehicleCount,
      drivers: driverCount,
      warehouses: warehouseCount,
      customers: customerCount,
      shipments: shipmentCount,
    };
  });
});

/**
 * tr-şirket profili, takım üyeleri ve gösterge paneli istatistiklerini (sayfalama ve arama ile) getirir
 * en-retrieves company profile, team members, and dashboard statistics with pagination and search
 * input (user: AuthenticatedUser, filters: { page: number, pageSize: number, search?: string })
 * output (Promise<{ profile: object, members: object[], totalCount: number, meta: object, stats: object, statsTrends: object }>)
 */
export const getCompanyWithDashboardData = authenticatedAction(
  async (user, filters: { page: number; pageSize: number; search?: string | undefined }) => {
    const companyId = user?.companyId || "";

    if (!companyId) {
      throw new Error("User is not associated with any company");
    }

    return controllerGuard("getCompanyWithDashboardData", async () => {
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      const page = Math.max(1, filters.page || 1);
      const pageSize = Math.max(1, filters.pageSize || 10);
      const skip = (page - 1) * pageSize;

      const queryWhere: Prisma.UserWhereInput = {
        companyId,
        ...(filters.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: "insensitive" } },
                { surname: { contains: filters.search, mode: "insensitive" } },
                { email: { contains: filters.search, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const cacheKey = companyCacheKeys.dashboard(
        companyId,
        hashFilters({ page, pageSize, search: filters.search })
      );

      return await withCache(cacheKey, COMPANY_CACHE_TTL, async () => {
        const [
          company,
          members,
        filteredCount,
        totalUserCount,
        vehicleCount,
        driverCount,
        warehouseCount,
        customerCount,
        shipmentCount,
        prevUserCount,
        prevVehicleCount,
        prevDriverCount,
        prevWarehouseCount,
        prevCustomerCount,
        prevShipmentCount,
      ] = await Promise.all([
        db.company.findUnique({
          where: { id: companyId },
        }),
        db.user.findMany({
          where: queryWhere,
          include: { role: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
          skip,
          take: pageSize,
        }),
        db.user.count({ where: queryWhere }),
        db.user.count({ where: { companyId } }),
        db.vehicle.count({ where: { companyId } }),
        db.driver.count({ where: { companyId } }),
        db.warehouse.count({ where: { companyId } }),
        db.customer.count({ where: { companyId } }),
        db.shipment.count({ where: { companyId } }),
        db.user.count({ where: { companyId, createdAt: { lt: daysAgo(30) } } }),
        db.vehicle.count({ where: { companyId, createdAt: { lt: daysAgo(30) } } }),
        db.driver.count({ where: { companyId, createdAt: { lt: daysAgo(30) } } }),
        db.warehouse.count({ where: { companyId, createdAt: { lt: daysAgo(30) } } }),
        db.customer.count({ where: { companyId, createdAt: { lt: daysAgo(30) } } }),
        db.shipment.count({ where: { companyId, createdAt: { lt: daysAgo(30) } } }),
      ]);

      if (!company) {
        throw new Error("Company not found");
      }

      return {
        profile: {
          id: company.id,
          name: company.name,
          avatarUrl: company.avatarUrl ?? null,
          createdAt: company.createdAt.toISOString(),
          updatedAt: company.updatedAt.toISOString(),
        },
        members: members.map((u) => ({
          id: u.id,
          name: u.name,
          surname: u.surname,
          email: u.email,
          avatarUrl: u.avatarUrl ?? null,
          status: u.status,
          roleId: u.role?.id ?? null,
          roleName: u.role?.name ?? null,
          createdAt: u.createdAt.toISOString(),
        })),
        totalCount: filteredCount,
        meta: {
          page,
          limit: pageSize,
          total: filteredCount,
        },
        stats: {
          users: totalUserCount,
          vehicles: vehicleCount,
          drivers: driverCount,
          warehouses: warehouseCount,
          customers: customerCount,
          shipments: shipmentCount,
          },
          statsTrends: {
            users: calcTrend(totalUserCount, prevUserCount as number),
            vehicles: calcTrend(vehicleCount, prevVehicleCount as number),
            drivers: calcTrend(driverCount, prevDriverCount as number),
            warehouses: calcTrend(warehouseCount, prevWarehouseCount as number),
            customers: calcTrend(customerCount, prevCustomerCount as number),
            shipments: calcTrend(shipmentCount, prevShipmentCount as number),
          },
        };
      });
    });
  }
);
