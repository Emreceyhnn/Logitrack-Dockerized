"use server";

import { db } from "../../db";
import { authenticatedAction } from "../../auth-middleware";
import { checkPermission } from "../utils/checkPermission";
import { Prisma } from "@prisma/client";
import { controllerGuard } from "../utils/controllerGuard";
import { NotFoundError } from "../../errors";
import { LowStockItem } from "../../type/inventory";
import {
  withCache,
  hashFilters,
  inventoryCacheKeys,
  INVENTORY_CACHE_TTL,
} from "../../redis";

/**
 * tr-şirketin genel veya belirli bir depoya ait tüm stoklarını getirir
 * en-retrieves all inventory of the company, overall or for a specific warehouse
 * input (user: AuthenticatedUser, warehouseId?: string)
 * output (Promise<any[]>)
 */
export const getInventory = authenticatedAction(
  async (user, warehouseId?: string) => {
    return controllerGuard("getInventory", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId);

      const whereClause: Prisma.InventoryWhereInput = { companyId };
      if (warehouseId) {
        whereClause.warehouseId = warehouseId;
      }

      const cacheKey = inventoryCacheKeys.list(companyId, hashFilters({ warehouseId }));
      return await withCache(cacheKey, INVENTORY_CACHE_TTL, async () => {
        const inventory = await db.inventory.findMany({
          where: whereClause,
          include: {
            warehouse: { select: { name: true, code: true } },
          },
          orderBy: { name: "asc" },
        });
        return inventory.map((item) => ({
          ...item,
          unitValue: item.unitValue === null ? null : Number(item.unitValue),
        }));
      });
    });
  }
);

/**
 * tr-belirtilen kimliğe sahip stok kalemini getirir
 * en-retrieves the inventory item with the specified ID
 * input (user: AuthenticatedUser, inventoryId: string)
 * output (Promise<Inventory>)
 */
export const getInventoryItemById = authenticatedAction(
  async (user, inventoryId: string) => {
    return controllerGuard("getInventoryItemById", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId);

      const cacheKey = inventoryCacheKeys.detail(inventoryId);

      return await withCache(cacheKey, INVENTORY_CACHE_TTL, async () => {
        const item = await db.inventory.findFirst({
          where: { id: inventoryId, companyId },
          include: { warehouse: true },
        });

        if (!item) {
          throw new NotFoundError("Inventory item");
        }

        return item;
      });
    });
  }
);

/**
 * tr-belirtilen SKU'ya sahip ürünlerin farklı depolardaki stok bilgilerini getirir
 * en-retrieves stock information of products with the specified SKU across different warehouses
 * input (user: AuthenticatedUser, sku: string)
 * output (Promise<any[]>)
 */
export const getInventoryBySku = authenticatedAction(
  async (user, sku: string) => {
    return controllerGuard("getInventoryBySku", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId);

      const items = await db.inventory.findMany({
        where: { sku, companyId },
        include: {
          warehouse: { select: { name: true, code: true } },
        },
      });
      return items.map((item) => ({
        ...item,
        unitValue: item.unitValue === null ? null : Number(item.unitValue),
      }));
    });
  }
);

/**
 * tr-şirket genelinde kritik stok seviyesinin altına düşen ürünleri getirir
 * en-retrieves items across the company that have fallen below the critical stock level
 * input (user: AuthenticatedUser)
 * output (Promise<LowStockItem[]>)
 */
export const getLowStockItems = authenticatedAction(async (user) => {
  return controllerGuard("getLowStockItems", async () => {
    const companyId = user?.companyId || "";
    await checkPermission(user, companyId, [
      "role_admin",
      "role_manager",
      "role_warehouse",
    ]);

    const cacheKey = inventoryCacheKeys.kpis(companyId);

    return await withCache(cacheKey, INVENTORY_CACHE_TTL, async () => {
      const allItems = await db.inventory.findMany({
        where: { companyId },
        include: { warehouse: { select: { name: true } } },
      });

      const lowStockItems = allItems.filter((item) => item.quantity <= item.minStock);

      const typedLowStock: LowStockItem[] = lowStockItems.map((item) => ({
        ...item,
        unitValue: item.unitValue === null ? null : Number(item.unitValue),
      }));
      return typedLowStock;
    });
  });
});

/**
 * tr-belirtilen depoda ve SKU'ya sahip ürünün stok hareket geçmişini getirir
 * en-retrieves the stock movement history of the product with the specified SKU in the given warehouse
 * input (user: AuthenticatedUser, sku: string, warehouseId: string)
 * output (Promise<any[]>)
 */
export const getInventoryMovements = authenticatedAction(
  async (user, sku: string, warehouseId: string) => {
    return controllerGuard("getInventoryMovements", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId);

      const cacheKey = inventoryCacheKeys.movements(companyId, warehouseId, sku);

      return await withCache(cacheKey, INVENTORY_CACHE_TTL, async () => {
        const movements = await db.inventoryMovement.findMany({
          where: { sku, warehouseId, companyId },
          include: { user: { select: { name: true, surname: true } } },
          orderBy: { date: "desc" },
          take: 20,
        });

        return movements;
      });
    });
  }
);
