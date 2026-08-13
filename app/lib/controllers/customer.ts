"use server";

import { db } from "../db";
import { authenticatedAction } from "../auth-middleware";
import { checkPermission } from "./utils/checkPermission";
import { Prisma } from "@prisma/client";
import { CustomerWithRelations } from "../type/customer";
import {
  CUSTOMER_CACHE_TTL,
} from "../redis";
import { calcTrend, daysAgo } from "./utils/trendUtils";

import { controllerGuard } from "./utils/controllerGuard";
import { createCacheManager } from "./utils/cacheFactory";
import { createCustomerSchema, updateCustomerSchema } from "../validation/serverSchemas";
import { ConflictError, NotFoundError } from "../errors";

const customerCache = createCacheManager("customers", CUSTOMER_CACHE_TTL);

/**
 * tr-yeni bir müşteri oluşturur
 * en-creates a new customer
 * input (user: AuthenticatedUser, name: string, code: string, industry?: string, taxId?: string, email?: string, phone?: string, locations?: array)
 * output (Promise<{ customer: Customer }>)
 */
export const createCustomer = authenticatedAction(
  async (
    user,
    name: string,
    code: string,
    industry?: string,
    taxId?: string,
    email?: string,
    phone?: string,
    locations?: { name: string; address: string; lat?: number | undefined; lng?: number | undefined; isDefault?: boolean | undefined }[]
  ) => {
    return controllerGuard("createCustomer", async () => {
      await checkPermission(user, user.companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);
      const companyId = user.companyId!;

      const parsed = createCustomerSchema.parse({
        name,
        code,
        industry,
        taxId,
        email,
        phone,
        locations,
      });

      const existingCode = await db.customer.findFirst({
        where: { ...(parsed.code !== undefined ? { code: parsed.code } : {}), companyId },
      });

      if (parsed.code && existingCode) {
        throw new ConflictError("Customer with this code already exists");
      }

      // Auto-generate code if not provided
      const customerCode = parsed.code || `CUST-${Math.random().toString(36).substring(2, 7).toLocaleUpperCase('en-US')}`;

      const newCustomer = await db.customer.create({
        data: {
          name: parsed.name,
          code: customerCode,
          industry: parsed.industry ?? null,
          taxId: parsed.taxId ?? null,
          email: parsed.email ?? null,
          phone: parsed.phone ?? null,
          companyId,
          locations: {
            create: parsed.locations?.map((loc) => ({
              companyId,
              name: loc.name,
              address: loc.address,
              lat: loc.lat ?? null,
              lng: loc.lng ?? null,
              isDefault: loc.isDefault ?? false,
            })) || [],
          },
        },
        include: {
          locations: true,
        },
      });

      await customerCache.invalidate(companyId);
      return { customer: newCustomer };
    });
  }
);

/**
 * tr-şirkete ait tüm müşterileri getirir
 * en-retrieves all customers belonging to the company
 * input (user: AuthenticatedUser)
 * output (Promise<Customer[]>)
 */
export const getCustomers = authenticatedAction(async (user) => {
  return controllerGuard("getCustomers", async () => {
    const companyId = user?.companyId || "";
    await checkPermission(user, companyId, [
      "role_admin",
      "role_manager",
      "role_dispatcher",
    ]);
    return await customerCache.cached(companyId, customerCache.hashFilters({}), async () => {
      const customers = await db.customer.findMany({
        where: { companyId },
        include: {
          locations: true,
          _count: {
            select: { shipments: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return customers;
    });
  });
});

/**
 * tr-müşterileri sayfalama ve arama ile dashboard istatistikleriyle birlikte getirir
 * en-retrieves customers with pagination, search, and dashboard statistics
 * input (user: AuthenticatedUser, page?: number, pageSize?: number, search?: string)
 * output (Promise<{ customers: CustomerWithRelations[], totalCount: number, stats: object, statsTrends?: object }>)
 */
export const getCustomersWithDashboardData = authenticatedAction(
  async (
    user,
    page: number = 1,
    pageSize: number = 10,
    search?: string
  ): Promise<{
    customers: CustomerWithRelations[];
    totalCount: number;
    stats: {
      totalCustomers: number;
      activeCustomers: number;
      totalShipments: number;
    };
    statsTrends?: {
      totalCustomers?: { value: number; isUp: boolean } | undefined;
    };
  }> => {
    return controllerGuard("getCustomersWithDashboardData", async () => {
      const companyId = user?.companyId;
      if (!companyId) throw new Error("User has no company");

      const skip = (page - 1) * pageSize;

      const where: Prisma.CustomerWhereInput = { companyId };
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
        ];
      }

      // ── Parallel Orchestration ──────────────────────────────────────────
      return await customerCache.cachedDashboard(
        companyId,
        customerCache.hashFilters({ page, pageSize, search }),
        async () => {
          const [
            ,
            customers,
            totalCount,
            statsRaw,
            prevTotalCustomers,
          ] = await Promise.all([
        checkPermission(user, companyId, ["role_admin", "role_manager", "role_dispatcher"]),
        db.customer.findMany({
          where,
          include: {
            locations: true,
            _count: {
              select: { shipments: true },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
        }),
        db.customer.count({ where }),
        db.customer.findMany({
          where: { companyId },
          select: {
            _count: {
              select: { shipments: true },
            },
          },
        }),
        db.customer.count({ where: { companyId, createdAt: { lt: daysAgo(30) } } }),
      ]);

      // Stats Calculation
      const totalCustomers = totalCount;
      const totalShipments = statsRaw.reduce((acc, c) => acc + c._count.shipments, 0);
      const activeCustomers = statsRaw.filter((c) => c._count.shipments > 0).length;

      const typedCustomers: CustomerWithRelations[] = customers;

      return {
        customers: typedCustomers,
        totalCount,
        stats: {
          totalCustomers,
          activeCustomers,
          totalShipments,
        },
        statsTrends: {
          totalCustomers: calcTrend(totalCustomers, prevTotalCustomers as number),
        },
      };
      });
    });
  }
);


/**
 * tr-belirtilen kimliğe sahip müşteriyi getirir
 * en-retrieves the customer with the specified ID
 * input (user: AuthenticatedUser, customerId: string)
 * output (Promise<Customer>)
 */
export const getCustomerById = authenticatedAction(
  async (user, customerId: string) => {
    return controllerGuard("getCustomerById", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const foundCustomer = await db.customer.findFirst({
        where: { id: customerId, companyId },
        include: {
          locations: true,
          shipments: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });

      if (!foundCustomer) {
        throw new NotFoundError("Customer");
      }

      return foundCustomer;
    });
  }
);

/**
 * tr-belirtilen müşterinin bilgilerini günceller
 * en-updates the information of the specified customer
 * input (user: AuthenticatedUser, customerId: string, data: object)
 * output (Promise<Customer>)
 */
export const updateCustomer = authenticatedAction(
  async (
    user,
    customerId: string,
    data: {
      name?: string;
      code?: string;
      industry?: string;
      taxId?: string;
      email?: string;
      phone?: string;
      locations?: {
        id?: string;
        name: string;
        address: string;
        lat?: number | undefined;
        lng?: number | undefined;
        isDefault?: boolean | undefined;
      }[];
    }
  ) => {
    return controllerGuard("updateCustomer", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const parsed = updateCustomerSchema.parse(data);

      const existingCustomer = await db.customer.findFirst({
        where: { id: customerId, companyId },
        select: { companyId: true },
      });

      if (!existingCustomer) {
        throw new NotFoundError("Customer");
      }

      let finalCode = parsed.code;
      if (finalCode === "") {
        finalCode = `CUST-${Math.random().toString(36).substring(2, 7).toLocaleUpperCase('en-US')}`;
      }

      // Omit undefined keys so an unspecified field is left unchanged.
      const updateData: Prisma.CustomerUpdateInput = {
        ...(parsed.name !== undefined ? { name: parsed.name } : {}),
        ...(finalCode !== undefined ? { code: finalCode } : {}),
        ...(parsed.industry !== undefined ? { industry: parsed.industry } : {}),
        ...(parsed.taxId !== undefined ? { taxId: parsed.taxId } : {}),
        ...(parsed.email !== undefined ? { email: parsed.email } : {}),
        ...(parsed.phone !== undefined ? { phone: parsed.phone } : {}),
      };

      if (parsed.locations) {
        const currentLocations = await db.customerLocation.findMany({
          where: { customerId }
        });
        
        const incomingIds = parsed.locations.map(l => l.id).filter(Boolean);
        const locationsToDelete = currentLocations.filter((cl) => !incomingIds.includes(cl.id));
        const locationsToCreate = parsed.locations.filter(l => !l.id);
        const locationsToUpdate = parsed.locations.filter(l => l.id);

        updateData.locations = {
          deleteMany: {
            id: { in: locationsToDelete.map((l) => l.id) }
          },
          create: locationsToCreate.map(loc => ({
            companyId: companyId!,
            name: loc.name,
            address: loc.address,
            lat: loc.lat ?? null,
            lng: loc.lng ?? null,
            isDefault: loc.isDefault ?? false,
          })),
          update: locationsToUpdate.map(loc => ({
            where: { id: loc.id! },
            data: {
              name: loc.name,
              address: loc.address,
              lat: loc.lat ?? null,
              lng: loc.lng ?? null,
              isDefault: loc.isDefault ?? false,
            }
          }))
        };
      }

      const updatedCustomer = await db.customer.update({
        where: { id: customerId },
        data: updateData,
        include: { locations: true }
      });
      await customerCache.invalidate(companyId, customerId);
      return updatedCustomer;
    });
  }
);



/**
 * tr-belirtilen müşteriyi siler
 * en-deletes the specified customer
 * input (user: AuthenticatedUser, customerId: string)
 * output (Promise<{ success: boolean }>)
 */
export const deleteCustomer = authenticatedAction(
  async (user, customerId: string) => {
    return controllerGuard("deleteCustomer", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      const existingCustomer = await db.customer.findFirst({
        where: { id: customerId, companyId },
        select: { companyId: true },
      });

      if (!existingCustomer) {
        throw new NotFoundError("Customer");
      }

      await db.customer.delete({
        where: { id: customerId },
      });
      await customerCache.invalidate(companyId, customerId);
      return { success: true };
    });
  }
);
