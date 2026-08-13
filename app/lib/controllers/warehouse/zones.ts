"use server";

import { db } from "../../db";
import { authenticatedAction } from "../../auth-middleware";
import { checkPermission } from "../utils/checkPermission";
import { controllerGuard } from "../utils/controllerGuard";
import { invalidateWarehouseCache } from "./cache";

const ZONE_MANAGE_ROLES = ["role_admin", "role_manager", "role_warehouse"];

/**
 * tr-belirtilen depoya ait tüm bölgeleri (zone) kod sırasına göre listeler
 * en-lists all zones belonging to the specified warehouse, ordered by code
 * input (user: AuthenticatedUser, warehouseId: string)
 * output (Promise<WarehouseZone[]>)
 */
export const getWarehouseZones = authenticatedAction(
  async (user, warehouseId: string) => {
    return controllerGuard("getWarehouseZones", async () => {
      await checkPermission(user, user.companyId);
      if (!user.companyId) throw new Error("User has no company");

      const warehouse = await db.warehouse.findFirst({
        where: { id: warehouseId, companyId: user.companyId },
        select: { id: true },
      });
      if (!warehouse) throw new Error("Warehouse not found or unauthorized");

      return db.warehouseZone.findMany({
        where: { warehouseId, companyId: user.companyId },
        orderBy: { code: "asc" },
      });
    });
  }
);

/**
 * tr-bir depo için yeni bir bölge (zone) tanımlar; kod o depo içinde benzersiz olmalıdır
 * en-defines a new zone for a warehouse; the code must be unique within that warehouse
 * input (user: AuthenticatedUser, warehouseId: string, code: string, name?: string, capacityPallets?: number)
 * output (Promise<WarehouseZone>)
 */
export const createWarehouseZone = authenticatedAction(
  async (
    user,
    warehouseId: string,
    code: string,
    name?: string,
    capacityPallets?: number
  ) => {
    return controllerGuard("createWarehouseZone", async () => {
      await checkPermission(user, user.companyId, ZONE_MANAGE_ROLES);
      if (!user.companyId) throw new Error("User has no company");

      const trimmedCode = code?.trim().toLocaleUpperCase("en-US");
      if (!trimmedCode) throw new Error("Zone code is required");

      const warehouse = await db.warehouse.findFirst({
        where: { id: warehouseId, companyId: user.companyId },
        select: { id: true },
      });
      if (!warehouse) throw new Error("Warehouse not found or unauthorized");

      const existing = await db.warehouseZone.findFirst({
        where: { warehouseId, code: trimmedCode },
        select: { id: true },
      });
      if (existing) {
        throw new Error("A zone with this code already exists in this warehouse");
      }

      const zone = await db.warehouseZone.create({
        data: {
          warehouseId,
          companyId: user.companyId,
          code: trimmedCode,
          name: name?.trim() || null,
          capacityPallets:
            Number.isFinite(capacityPallets) && (capacityPallets as number) >= 0
              ? Math.floor(capacityPallets as number)
              : 0,
        },
      });

      await invalidateWarehouseCache(user.companyId, warehouseId);
      return zone;
    });
  }
);

/**
 * tr-mevcut bir bölgenin adını ve/veya kapasitesini günceller
 * en-updates an existing zone's name and/or capacity
 * input (user: AuthenticatedUser, zoneId: string, data: { name?: string; capacityPallets?: number })
 * output (Promise<WarehouseZone>)
 */
export const updateWarehouseZone = authenticatedAction(
  async (
    user,
    zoneId: string,
    data: { name?: string; capacityPallets?: number }
  ) => {
    return controllerGuard("updateWarehouseZone", async () => {
      await checkPermission(user, user.companyId, ZONE_MANAGE_ROLES);
      if (!user.companyId) throw new Error("User has no company");

      const existing = await db.warehouseZone.findFirst({
        where: { id: zoneId, companyId: user.companyId },
        select: { id: true, warehouseId: true },
      });
      if (!existing) throw new Error("Zone not found or unauthorized");

      const zone = await db.warehouseZone.update({
        where: { id: zoneId },
        data: {
          ...(data.name !== undefined ? { name: data.name.trim() || null } : {}),
          ...(data.capacityPallets !== undefined &&
          Number.isFinite(data.capacityPallets) &&
          data.capacityPallets >= 0
            ? { capacityPallets: Math.floor(data.capacityPallets) }
            : {}),
        },
      });

      await invalidateWarehouseCache(user.companyId, existing.warehouseId);
      return zone;
    });
  }
);

/**
 * tr-bir bölgeyi siler; bölge halihazırda ürünlere atanmışsa reddeder
 * en-deletes a zone; refuses if the zone is still assigned to inventory items
 * input (user: AuthenticatedUser, zoneId: string)
 * output (Promise<{ success: boolean }>)
 */
export const deleteWarehouseZone = authenticatedAction(
  async (user, zoneId: string) => {
    return controllerGuard("deleteWarehouseZone", async () => {
      await checkPermission(user, user.companyId, ZONE_MANAGE_ROLES);
      if (!user.companyId) throw new Error("User has no company");

      const existing = await db.warehouseZone.findFirst({
        where: { id: zoneId, companyId: user.companyId },
        select: { id: true, warehouseId: true, code: true },
      });
      if (!existing) throw new Error("Zone not found or unauthorized");

      // Deleting a zone still referenced by inventory would silently strand
      // those items in an "UNASSIGNED" state with no way back to this code —
      // require the operator to re-zone them first.
      const inUse = await db.inventory.findFirst({
        where: {
          warehouseId: existing.warehouseId,
          companyId: user.companyId,
          zone: existing.code,
        },
        select: { id: true },
      });
      if (inUse) {
        throw new Error(
          "This zone still has inventory assigned to it — reassign those items before deleting"
        );
      }

      await db.warehouseZone.delete({ where: { id: zoneId } });
      await invalidateWarehouseCache(user.companyId, existing.warehouseId);
      return { success: true };
    });
  }
);
