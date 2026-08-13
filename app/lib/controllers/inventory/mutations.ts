"use server";

import { db } from "../../db";
import { authenticatedAction } from "../../auth-middleware";
import { checkPermission } from "../utils/checkPermission";
import { MovementType, Prisma } from "@prisma/client";
import { controllerGuard } from "../utils/controllerGuard";
import { NotFoundError } from "../../errors";
import {
  createInventorySchema,
  updateInventorySchema,
  adjustInventoryStockSchema,
  logWarehouseFulfillmentSchema,
} from "../../validation/serverSchemas";
import {
  CreateInventoryInput,
  UpdateInventoryInput,
} from "../../type/inventory";
import { invalidateInventoryCache } from "./cache";

/**
 * tr-yeni bir stok kalemi oluşturur
 * en-creates a new inventory item
 * input (user: AuthenticatedUser, data: CreateInventoryInput)
 * output (Promise<{ inventory: object }>)
 */
export const createInventoryItem = authenticatedAction(
  async (user, data: CreateInventoryInput) => {
    return controllerGuard("createInventoryItem", async () => {
      const companyId = user?.companyId || "";
      const userId = user?.id || "";
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_warehouse",
      ]);

      const parsed = createInventorySchema.parse(data);

      const warehouse = await db.warehouse.findFirst({
        where: { id: parsed.warehouseId, companyId },
      });

      if (!warehouse) {
        throw new NotFoundError("Warehouse");
      }

      const itemSku = parsed.sku || `SKU-${Math.random().toString(36).substring(2, 7).toLocaleUpperCase('en-US')}`;

      const existingItem = await db.inventory.findFirst({
        where: {
          warehouseId: parsed.warehouseId,
          sku: itemSku,
          companyId,
        },
      });

      if (existingItem) {
        throw new Error("Item with this SKU already exists in this warehouse");
      }

      const { newItem } = await db.$transaction(async (tx) => {
        const item = await tx.inventory.create({
          data: {
            warehouseId: parsed.warehouseId,
            sku: itemSku,
            name: parsed.name,
            quantity: parsed.quantity,
            minStock: parsed.minStock,
            weightKg: parsed.weightKg,
            volumeM3: parsed.volumeM3,
            palletCount: parsed.palletCount,
            cargoType: parsed.cargoType,
            unitValue: parsed.unitValue,
            currency: parsed.currency,
            unit: "Each",
            companyId,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            warehouseId: parsed.warehouseId,
            sku: itemSku,
            quantity: parsed.quantity,
            type: "STOCK_IN",
            notes: "Açılış Bakiyesi (Initial Stock)",
            userId,
            companyId,
          },
        });

        return { newItem: item };
      });

      await invalidateInventoryCache(companyId, newItem.id);
      return { inventory: newItem };
    });
  }
);

/**
 * tr-mevcut bir stok kaleminin bilgilerini günceller
 * en-updates the information of an existing inventory item
 * input (user: AuthenticatedUser, inventoryId: string, data: UpdateInventoryInput)
 * output (Promise<Inventory>)
 */
export const updateInventoryItem = authenticatedAction(
  async (user, inventoryId: string, data: UpdateInventoryInput) => {
    return controllerGuard("updateInventoryItem", async () => {
      const companyId = user?.companyId || "";
      const userId = user?.id || "";
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_warehouse",
      ]);

      const parsed = updateInventorySchema.parse(data);

      const currentItem = await db.inventory.findFirst({
        where: { id: inventoryId, companyId },
        select: { sku: true, warehouseId: true, companyId: true, quantity: true },
      });

      if (!currentItem) {
        throw new NotFoundError("Inventory item");
      }

      const newSku = parsed.sku !== undefined ? parsed.sku : currentItem.sku;
      const newWarehouseId = parsed.warehouseId !== undefined ? parsed.warehouseId : currentItem.warehouseId;

      if (newSku !== currentItem.sku || newWarehouseId !== currentItem.warehouseId) {
        const duplicate = await db.inventory.findFirst({
          where: {
            warehouseId: newWarehouseId,
            sku: newSku,
            companyId,
          },
        });

        if (duplicate && duplicate.id !== inventoryId) {
          throw new Error("Item with this SKU already exists in the target warehouse");
        }
      }

      const updateData = { ...parsed } as Prisma.InventoryUpdateInput;
      if (typeof parsed.zone === "string") {
        const trimmedZone = parsed.zone.trim().toLocaleUpperCase("en-US");
        if (trimmedZone) {
          const zoneExists = await db.warehouseZone.findFirst({
            where: { warehouseId: newWarehouseId, code: trimmedZone },
            select: { id: true },
          });
          if (!zoneExists) {
            throw new Error("Selected zone does not exist in this warehouse");
          }
        }
        updateData.zone = trimmedZone || null;
      }

      const updatedItem = await db.$transaction(async (tx) => {
        const item = await tx.inventory.update({
          where: { id: inventoryId },
          data: updateData,
        });

        if (parsed.quantity !== undefined && parsed.quantity !== currentItem.quantity) {
          await tx.inventoryMovement.create({
            data: {
              warehouseId: newWarehouseId,
              sku: newSku,
              quantity: parsed.quantity - currentItem.quantity,
              type: "ADJUSTMENT",
              userId,
              companyId,
            },
          });
        }

        return item;
      });

      await invalidateInventoryCache(companyId, inventoryId);
      return updatedItem;
    });
  }
);

/**
 * tr-belirtilen stok kaleminin miktarını ayarlar (artırır veya azaltır) ve hareket kaydı oluşturur
 * en-adjusts the quantity of the specified inventory item (increases or decreases) and creates a movement record
 * input (user: AuthenticatedUser, inventoryId: string, delta: number, type?: MovementType, notes?: string)
 * output (Promise<Inventory>)
 */
export const adjustInventoryStock = authenticatedAction(
  async (user, inventoryId: string, delta: number, type: MovementType = "ADJUSTMENT", notes?: string) => {
    return controllerGuard("adjustInventoryStock", async () => {
      const companyId = user?.companyId || "";
      const userId = user?.id || "";
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_warehouse",
      ]);

      const parsed = adjustInventoryStockSchema.parse({
        inventoryId,
        delta,
        type,
        notes,
      });

      const currentItem = await db.inventory.findFirst({
        where: { id: parsed.inventoryId, companyId },
        select: { sku: true, warehouseId: true, companyId: true, quantity: true },
      });

      if (!currentItem) {
        throw new NotFoundError("Inventory item");
      }

      const updatedItem = await db.$transaction(async (tx) => {
        const item = await tx.inventory.update({
          where: { id: parsed.inventoryId },
          data: {
            quantity: { increment: parsed.delta },
          },
        });

        if (item.quantity < 0) {
          throw new Error("Insufficient stock: adjustment would result in negative quantity");
        }

        await tx.inventoryMovement.create({
          data: {
            warehouseId: item.warehouseId,
            sku: item.sku,
            quantity: parsed.delta,
            type: parsed.type,
            notes: parsed.notes ?? null,
            userId,
            companyId,
          },
        });

        return item;
      });

      await invalidateInventoryCache(companyId, parsed.inventoryId);
      return updatedItem;
    });
  }
);

/**
 * tr-belirtilen stok kalemini siler
 * en-deletes the specified inventory item
 * input (user: AuthenticatedUser, inventoryId: string)
 * output (Promise<{ success: boolean }>)
 */
export const deleteInventoryItem = authenticatedAction(
  async (user, inventoryId: string) => {
    return controllerGuard("deleteInventoryItem", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_warehouse",
      ]);

      const existingItem = await db.inventory.findFirst({
        where: { id: inventoryId, companyId },
        select: { companyId: true },
      });

      if (!existingItem) {
        throw new NotFoundError("Inventory item");
      }

      await db.inventory.delete({ where: { id: inventoryId } });
      await invalidateInventoryCache(companyId, inventoryId);
      return { success: true };
    });
  }
);

/**
 * tr-depo içerisindeki toplama (pick) veya paketleme (pack) işlemlerini kaydeder ve stokları düşürür
 * en-logs pick or pack operations within the warehouse and deducts stock
 * input (user: AuthenticatedUser, warehouseId: string, sku: string, quantity: number, type: "PICK" | "PACK")
 * output (Promise<{ success: boolean, movement: object }>)
 */
export const logWarehouseFulfillment = authenticatedAction(
  async (
    user,
    warehouseId: string,
    sku: string,
    quantity: number,
    type: "PICK" | "PACK"
  ) => {
    return controllerGuard("logWarehouseFulfillment", async () => {
      const companyId = user?.companyId || "";
      const userId = user?.id || "";
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_warehouse",
        "role_dispatcher",
      ]);

      const parsed = logWarehouseFulfillmentSchema.parse({
        warehouseId,
        sku,
        quantity,
        type,
      });

      const inventoryNode = await db.inventory.findFirst({
        where: { warehouseId: parsed.warehouseId, sku: parsed.sku, companyId }
      });

      if (!inventoryNode) {
        throw new NotFoundError("Inventory SKU");
      }

      const movement = await db.inventoryMovement.create({
        data: {
          warehouseId: parsed.warehouseId,
          sku: parsed.sku,
          quantity: parsed.type === "PICK" ? -parsed.quantity : parsed.quantity,
          type: parsed.type,
          userId,
          companyId,
          date: new Date(),
        }
      });

      if (parsed.type === "PICK") {
         await db.inventory.update({
            where: { id: inventoryNode.id },
            data: {
              quantity: { decrement: parsed.quantity },
              allocatedQuantity: { decrement: parsed.quantity }
            }
         });
      }

      await invalidateInventoryCache(companyId, inventoryNode.id);
      return { success: true, movement };
    });
  }
);
