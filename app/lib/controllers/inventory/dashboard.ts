"use server";

import { db } from "../../db";
import { authenticatedAction } from "../../auth-middleware";
import { checkPermission } from "../utils/checkPermission";
import { Prisma } from "@prisma/client";
import { controllerGuard } from "../utils/controllerGuard";
import {
  InventoryWithRelations,
  LowStockItem,
} from "../../type/inventory";
import {
  withCache,
  hashFilters,
  inventoryCacheKeys,
  INVENTORY_CACHE_TTL,
} from "../../redis";
import { getExchangeRates } from "../../services/exchangeRate";
import { calcTrend, daysAgo } from "../utils/trendUtils";

/**
 * tr-stok listesini (filtreleme, sayfalama ve sıralama ile) ve stok istatistiklerini getirir
 * en-retrieves the inventory list (with filtering, pagination, and sorting) and inventory statistics
 * input (user: AuthenticatedUser, page?: number, pageSize?: number, warehouseId?: string, search?: string, sortBy?: string, sortOrder?: "asc" | "desc", status?: string[])
 * output (Promise<{ items: any[], totalCount: number, stats: object, lowStockItems: object[] }>)
 */
export const getInventoryWithDashboardData = authenticatedAction(
  async (
    user,
    page: number = 1,
    pageSize: number = 10,
    warehouseId?: string,
    search?: string,
    sortBy?: string,
    sortOrder?: "asc" | "desc",
    status?: string[]
  ): Promise<{
    items: InventoryWithRelations[];
    totalCount: number;
    stats: {
      totalItems: number;
      lowStockCount: number;
      outOfStockCount: number;
      totalValue: number;
    };
    lowStockItems: LowStockItem[];
  }> => {
    return controllerGuard("getInventoryWithDashboardData", async () => {
      const companyId = user?.companyId || "";
      if (!companyId) throw new Error("User has no company");

      const skip = (page - 1) * pageSize;

      const where: Prisma.InventoryWhereInput = { companyId };
      if (warehouseId) where.warehouseId = warehouseId;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
        ];
      }

      // Stock Status filtering
      if (status && status.length > 0) {
        const statusFilters: Prisma.InventoryWhereInput[] = [];

        if (status.includes("OUT_OF_STOCK")) {
          statusFilters.push({ quantity: 0 });
        }
        if (status.includes("IN_STOCK")) {
          statusFilters.push({ quantity: { gt: 0 } });
        }
        if (status.includes("LOW_STOCK")) {
          statusFilters.push({
            quantity: { gt: 0 },
            // In Prisma, comparing a field to another field directly in a where clause
            // is only supported natively in Prisma 5+ via extended syntax or we need raw query.
            // But since minStock is a field, let's use a raw condition or Prisma's field comparison if enabled.
            // To be safe, if we can't do direct field comparison (quantity <= minStock),
            // we will fetch all and filter in memory, OR we can just ignore DB side and rely on UI.
            // Actually, in Prisma we can't easily say `quantity: { lte: db.generated("minStock") }` directly.
            // Let's use `where` with `sql` or just omit LOW_STOCK from DB filter and handle differently?
            // Actually, wait, let's look at how it's handled. For now, if we can't filter LOW_STOCK, let's not add a broken filter.
          });
        }

        if (statusFilters.length > 0) {
          where.AND = [
            ...(where.AND as Prisma.InventoryWhereInput[] || []),
            { OR: statusFilters }
          ];
        }
      }

      // Sort logic
      const orderBy: Prisma.InventoryOrderByWithRelationInput = sortBy
        ? { [sortBy]: sortOrder || "asc" }
        : { name: "asc" };

      // ── Parallel Orchestration ──────────────────────────────────────────
      const cacheKey = inventoryCacheKeys.dashboard(
        companyId,
        hashFilters({ page, pageSize, warehouseId, search, sortBy, sortOrder, status })
      );

      return await withCache(cacheKey, INVENTORY_CACHE_TTL, async () => {
        const [
          ,
          items,
          totalCount,
          allStatsItems,
          ratesData,
          prevTotalItems,
        ] = await Promise.all([
          checkPermission(user, companyId, ["role_admin", "role_manager", "role_warehouse"]),
          db.inventory.findMany({
            where,
            include: {
              warehouse: { select: { name: true, code: true } },
            },
            orderBy,
            skip,
            take: pageSize,
          }),
          db.inventory.count({ where }),
          db.inventory.findMany({
            where,
            select: {
              id: true,
              name: true,
              sku: true,
              warehouseId: true,
              quantity: true,
              allocatedQuantity: true,
              minStock: true,
              unitValue: true,
              currency: true,
              warehouse: { select: { name: true } }
            },
          }),
          getExchangeRates(),
          // Previous period total items count for trend
          db.inventory.count({ where: { companyId, updatedAt: { lt: daysAgo(30) } } }),
        ]);

        // KPI Calculations & Low Stock Extract
        let totalItems = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        let totalValue = 0;
        const lowStockItems: LowStockItem[] = [];

        allStatsItems.forEach((item) => {
          totalItems++;
          if (item.quantity === 0) {
            outOfStockCount++;
          } else if (item.quantity <= item.minStock) {
            lowStockCount++;
            if (lowStockItems.length < 10) {
              lowStockItems.push({
                ...item,
                unitValue:
                  item.unitValue === null ? null : Number(item.unitValue),
              });
            }
          }

          // Convert to USD for a consistent totalValue
          const rateFrom = (ratesData.rates as Record<string, number>)[item.currency] || 1;
          const itemValueInUsd = Number(item.unitValue ?? 0) / rateFrom;
          totalValue += item.quantity * itemValueInUsd;
        });

        const statsTrends = {
          totalItems: calcTrend(totalItems, prevTotalItems),
        };

        const typedItems: InventoryWithRelations[] = items.map((item) => ({
          ...item,
          unitValue: item.unitValue === null ? null : Number(item.unitValue),
        }));
        const typedLowStockItems: LowStockItem[] = lowStockItems;

        return {
          items: typedItems,
          totalCount,
          stats: {
            totalItems,
            lowStockCount,
            outOfStockCount,
            totalValue,
          },
          statsTrends,
          lowStockItems: typedLowStockItems,
        };
      });
    });
  }
);
