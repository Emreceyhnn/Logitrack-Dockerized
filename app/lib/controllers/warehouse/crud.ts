"use server";

import { db } from "../../db";
import { authenticatedAction } from "../../auth-middleware";
import { stripUndefined } from "../../utils/stripUndefined";
import { checkPermission } from "../utils/checkPermission";
import { Prisma, WarehouseType } from "@prisma/client";
import { sendNotificationAction as createNotification } from "@/app/lib/actions/notifications";
import { updateWarehouseSchema } from "../../validation/serverSchemas";
import {
  withCache,
  hashFilters,
  warehouseCacheKeys,
  WAREHOUSE_CACHE_TTL,
} from "../../redis";
import { invalidateWarehouseCache } from "./cache";
import { controllerGuard } from "../utils/controllerGuard";
import {
  palletUsageByWarehouse,
  totalPalletsUsed,
} from "../../utils/palletOccupancy";

/**
 * tr-sisteme yeni bir depo ekler ve oluşturulduğuna dair bildirim gönderir
 * en-adds a new warehouse to the system and dispatches a creation notification
 * input (user: AuthenticatedUser, name: string, code: string, type: WarehouseType, address: string, city: string, country: string, lat?: number, lng?: number, managerId?: string | null, capacityPallets?: number, capacityVolumeM3?: number, operatingHours?: string, timezone?: string, specifications?: string[])
 * output (Promise<{ warehouse: Warehouse }>)
 */
export const createWarehouse = authenticatedAction(
  async (
    user,
    name: string,
    code: string | undefined,
    type: WarehouseType,
    address: string,
    city: string,
    country: string,
    lat?: number,
    lng?: number,
    managerId?: string | null,
    capacityPallets?: number,
    capacityVolumeM3?: number,
    operatingHours?: string,
    timezone?: string,
    specifications?: string[]
  ) => {
    return controllerGuard("createWarehouse", async () => {
      const companyId = user.companyId || "";

      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      let warehouseCode = code;
      if (!warehouseCode || warehouseCode.trim() === "") {
        warehouseCode = `WH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      }

      const existingWarehouse = await db.warehouse.findFirst({
        where: { companyId, code: warehouseCode },
      });

      if (existingWarehouse) {
        throw new Error("Warehouse code already exists");
      }

      // tr-"Atanmamış" seçeneği boş string gönderir; `?? null` bunu yakalamaz ve
      //    veritabanına managerId="" gider — hiçbir kullanıcıyla eşleşmediği için
      //    foreign key hatası verir. Boş/whitespace değerleri burada null'a çeviriyoruz.
      // en-The "unassigned" option submits an empty string, which `?? null` does not
      //    catch — the empty value reaches Postgres, matches no user, and trips the
      //    managerId foreign key. Normalise blank values to null here.
      const normalizedManagerId = managerId?.trim() ? managerId.trim() : null;

      // tr-Yönetici bu şirkete ait olmalı: aksi halde başka bir kiracının kullanıcısı
      //    depoya yönetici olarak bağlanabilirdi. Geçersiz kimlik de burada anlaşılır
      //    ve ham veritabanı hatası yerine anlamlı bir mesaj döner.
      // en-The manager must belong to this company: otherwise another tenant's user
      //    could be attached as a warehouse manager. This also catches a bogus id and
      //    surfaces a readable message instead of a raw foreign-key error.
      if (normalizedManagerId) {
        const manager = await db.user.findFirst({
          where: { id: normalizedManagerId, companyId },
          select: { id: true },
        });
        if (!manager) {
          throw new Error("Manager not found or not in your company");
        }
      }

      const newWarehouse = await db.warehouse.create({
        data: {
          name,
          code: warehouseCode,
          type,
          address,
          city,
          country,
          lat: lat ?? null,
          lng: lng ?? null,
          companyId: companyId,
          managerId: normalizedManagerId,
          capacityPallets: capacityPallets || 5000,
          capacityVolumeM3: capacityVolumeM3 || 100000,
          operatingHours: operatingHours || "08:00 - 18:00",
          timezone: timezone || "UTC",
          specifications: specifications || [],
        },
      });

      await invalidateWarehouseCache(companyId!);

      // Dispatch Notification
      await createNotification(
        { companyId: companyId! },
        {
          title: "Yeni Depo Oluşturuldu 🏗️",
          message: `${name} (${warehouseCode}) isimli yeni depo sisteme tanımlandı.`,
          type: "SUCCESS",
          link: `/warehouses?id=${newWarehouse.id}`,
        }
      );

      return { warehouse: newWarehouse };
    });
  }
);

/**
 * tr-kullanıcının şirketine ait tüm depoları yönetici bilgileri ve özet sayılarla birlikte getirir
 * en-retrieves all warehouses belonging to the user's company along with manager info and summary counts
 * input (user: AuthenticatedUser)
 * output (Promise<Warehouse[]>)
 */
export const getWarehouses = authenticatedAction(async (user) => {
  return controllerGuard("getWarehouses", async () => {
    await checkPermission(user, user.companyId);

    if (!user.companyId) throw new Error("User has no company");
    const companyId = user.companyId;

    const cacheKey = warehouseCacheKeys.list(companyId, hashFilters({}));
    return await withCache(cacheKey, WAREHOUSE_CACHE_TTL, async () => {
      const warehouses = await db.warehouse.findMany({
        where: { companyId },
        include: {
          manager: {
            select: {
              id: true,
              name: true,
              surname: true,
              email: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              inventory: true,
              drivers: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const warehouseIds = warehouses.map((w) => w.id);
      // Occupancy is quantity ÷ units-per-pallet per line (see palletOccupancy),
      // so it can't be a groupBy _sum of palletCount — the rows are fetched and
      // folded here instead.
      const inventoryRows = warehouseIds.length
        ? await db.inventory.findMany({
            where: { warehouseId: { in: warehouseIds } },
            select: {
              warehouseId: true,
              quantity: true,
              palletCount: true,
              volumeM3: true,
            },
          })
        : [];

      const palletMap = palletUsageByWarehouse(inventoryRows);

      return warehouses.map((w) => {
        const used = palletMap.get(w.id) ?? { pallets: 0, volume: 0 };
        return {
          ...w,
          usedPallets: Math.round(used.pallets),
          usedVolume: Math.round(used.volume),
        };
      });
    });
  });
});

/**
 * tr-belirtilen depo kimliğine (id) göre depo detaylarını, yöneticisini ve envanterini getirir
 * en-retrieves warehouse details, manager, and inventory based on the specified warehouse ID
 * input (user: AuthenticatedUser, warehouseId: string)
 * output (Promise<Warehouse>)
 */
export const getWarehouseById = authenticatedAction(
  async (user, warehouseId: string) => {
    return controllerGuard("getWarehouseById", async () => {
      await checkPermission(user, user.companyId);

      const warehouse = await db.warehouse.findFirst({
        where: { id: warehouseId, companyId: user.companyId! },
        include: {
          manager: {
            select: {
              id: true,
              name: true,
              surname: true,
              email: true,
              avatarUrl: true,
            },
          },
          inventory: true,
          drivers: {
            include: {
              user: {
                select: { name: true, surname: true, avatarUrl: true },
              },
            },
          },
        },
      });

      if (!warehouse) {
        throw new Error("Warehouse not found or unauthorized");
      }

      const usedPallets = totalPalletsUsed(warehouse.inventory);
      const usedVolume = Math.round(
        warehouse.inventory.reduce((acc, i) => acc + (i.volumeM3 ?? 0), 0)
      );

      return {
        ...warehouse,
        usedPallets,
        usedVolume,
      };
    });
  }
);

/**
 * tr-belirtilen deponun bilgilerini günceller ve yönetici (manager) atama işlemlerini yönetir
 * en-updates the specified warehouse's information and handles manager assignment operations
 * input (user: AuthenticatedUser, warehouseId: string, data: Record<string, unknown>)
 * output (Promise<Warehouse>)
 */
export const updateWarehouse = authenticatedAction(
  async (user, warehouseId: string, data: Record<string, unknown>) => {
    return controllerGuard("updateWarehouse", async () => {
      await checkPermission(user, user.companyId, [
        "role_admin",
        "role_manager",
      ]);

      const existingWarehouse = await db.warehouse.findFirst({
        where: { id: warehouseId, companyId: user.companyId! },
        select: { companyId: true, managerId: true },
      });

      if (!existingWarehouse) {
        throw new Error("Warehouse not found or unauthorized");
      }

      const parsedData = updateWarehouseSchema.parse(data);
      const { managerId, ...restData } = parsedData;

      const updateData: Prisma.WarehouseUpdateInput = stripUndefined(restData);

      if (managerId !== undefined) {
        if (managerId === null) {
          if (existingWarehouse.managerId) {
            updateData.manager = { disconnect: true };
          }
        } else {
          updateData.manager = { connect: { id: managerId } };
        }
      }

      const updatedWarehouse = await db.warehouse.update({
        where: { id: warehouseId },
        data: updateData,
      });

      await invalidateWarehouseCache(user.companyId!, warehouseId);
      return updatedWarehouse;
    });
  }
);

/**
 * tr-belirtilen depoyu sistemden kalıcı olarak siler
 * en-permanently deletes the specified warehouse from the system
 * input (user: AuthenticatedUser, warehouseId: string)
 * output (Promise<{ success: boolean }>)
 */
export const deleteWarehouse = authenticatedAction(
  async (user, warehouseId: string) => {
    return controllerGuard("deleteWarehouse", async () => {
      await checkPermission(user, user.companyId, ["role_admin"]);

      const existingWarehouse = await db.warehouse.findFirst({
        where: { id: warehouseId, companyId: user.companyId! },
        select: { companyId: true },
      });

      if (!existingWarehouse) {
        throw new Error("Warehouse not found or unauthorized");
      }

      await db.warehouse.delete({
        where: { id: warehouseId },
      });

      await invalidateWarehouseCache(user.companyId!, warehouseId);
      return { success: true };
    });
  }
);

/**
 * tr-belirtilen depoya bir yönetici atar ve yöneticiye bildirim gönderir
 * en-assigns a manager to the specified warehouse and sends a notification to the manager
 * input (user: AuthenticatedUser, warehouseId: string, managerId: string)
 * output (Promise<Warehouse>)
 */
export const assignManagerToWarehouse = authenticatedAction(
  async (user, warehouseId: string, managerId: string) => {
    return controllerGuard("assignManagerToWarehouse", async () => {
      await checkPermission(user, user.companyId, ["role_admin"]);

      const existingWarehouse = await db.warehouse.findFirst({
        where: { id: warehouseId, companyId: user.companyId! },
        select: { companyId: true },
      });

      if (!existingWarehouse) {
        throw new Error("Warehouse not found or unauthorized");
      }

      const updatedWarehouse = await db.warehouse.update({
        where: { id: warehouseId },
        data: {
          manager: { connect: { id: managerId } },
        },
      });

      await invalidateWarehouseCache(user.companyId!, warehouseId);

      // Dispatch Notification
      await createNotification(
        { companyId: user.companyId!, userId: managerId },
        {
          title: "Depo Yöneticisi Atandınız 👤",
          message: `${updatedWarehouse.name} deposu için yönetici olarak görevlendirildiniz.`,
          type: "INFO",
          link: `/warehouses?id=${updatedWarehouse.id}`,
        }
      );

      return updatedWarehouse;
    });
  }
);
