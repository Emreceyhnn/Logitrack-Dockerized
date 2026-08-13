"use server";

import { db } from "../../db";
import { FuelType, Prisma, VehicleStatus } from "@prisma/client";
import { stripUndefined } from "../../utils/stripUndefined";
import { vehicleSchema } from "../../validation/serverSchemas";
import { sendNotificationAction as createNotification } from "@/app/lib/actions/notifications";
import { checkPermission } from "../utils/checkPermission";
import { authenticatedAction } from "../../auth-middleware";
import { syncVehicleToFirebaseAction as syncVehicleToFirebase } from "../../actions/vehicleTracking";
import { invalidateVehicleCache } from "./cache";
import { controllerGuard } from "../utils/controllerGuard";
import { logger } from "@/app/lib/logger";
import { withLiveDocumentStatus } from "../../utils/documentStatus";


/**
 * tr-sisteme yeni bir araç ekler ve Firebase ile senkronize eder
 * en-creates a new vehicle in the system and synchronizes it with Firebase
 * input (user: AuthenticatedUser, vehicleData: unknown)
 * output (Promise<Vehicle>)
 */
export const createVehicle = authenticatedAction(
  // `unknown` on purpose: the payload is validated by vehicleSchema.parse()
  // below, so callers can pass their own typed shapes without casting.
  async (user, vehicleData: unknown) => {
    const companyId = user?.companyId || "";
    return controllerGuard("createVehicle", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      if (!companyId) throw new Error("User has no company");

      const parsedData = vehicleSchema.parse(vehicleData);

      const vehicleFleetNo =
        parsedData.fleetNo ||
        `FLEET-${Math.random().toString(36).substring(2, 7).toLocaleUpperCase('en-US')}`;

      const newVehicle = await db.vehicle.create({
        data: stripUndefined({
          ...parsedData,
          fuelType: parsedData.fuelType as FuelType,
          fleetNo: vehicleFleetNo,
          companyId,
        }),
      });

      await invalidateVehicleCache(companyId);
      // Sync to Firebase (background)
      syncVehicleToFirebase(newVehicle).catch((err) =>
        logger.error("Firebase sync failed:", err)
      );

      return newVehicle;
    });
  }
);

/**
 * tr-verilen kimlik numarasına (id) göre araç detaylarını (sürücü, sorunlar, bakım ve yakıt kayıtları ile) getirir
 * en-retrieves vehicle details by its ID (including driver, issues, maintenance, and fuel logs)
 * input (user: AuthenticatedUser, vehicleId: string)
 * output (Promise<Vehicle>)
 */
export const getVehicleById = authenticatedAction(
  async (user, vehicleId: string) => {
    const companyId = user?.companyId || "";
    return controllerGuard("getVehicleById", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const foundVehicle = await db.vehicle.findFirst({
        where: { id: vehicleId, companyId },
        include: {
          driver: {
            include: {
              user: {
                select: { name: true, surname: true, avatarUrl: true },
              },
            },
          },
          issues: {
            orderBy: { createdAt: "desc" },
          },
          maintenanceRecords: {
            orderBy: { date: "desc" },
            take: 5,
          },
          fuelLogs: {
            orderBy: { date: "desc" },
            take: 10,
          },
          // tr-`VehicleWithRelations` bu iki ilişkiyi zorunlu tutuyor ve detay dialog'u
          //    (belgeler sekmesi, rota listesi) ikisini de okuyor; çekilmedikleri için
          //    tek araç sorgusu tipe uymuyordu.
          // en-`VehicleWithRelations` requires both relations and the detail dialog reads
          //    them (documents tab, route list); leaving them out made this single-vehicle
          //    query fail to satisfy the type.
          documents: true,
          routes: { include: { stops: { orderBy: { sequence: "asc" } } } },
        },
      });

      if (!foundVehicle) {
        throw new Error("Vehicle not found or unauthorized");
      }

      return {
        ...foundVehicle,
        // tr-Saklı belge durumu bayat; tarihten türetilenle değiştir (bkz. documentStatus.ts)
        // en-Stored document status is stale; swap in the date-derived one
        documents: withLiveDocumentStatus(foundVehicle.documents),
        // tr-Prisma `cost`u Decimal döndürür ama istemci tipi `number` bekler; diğer araç
        //    sorguları da aynı dönüşümü yapıyor (bkz. vehicle/queries.ts).
        // en-Prisma returns `cost` as Decimal while the client type expects `number`; the
        //    other vehicle queries do the same conversion (see vehicle/queries.ts).
        maintenanceRecords: foundVehicle.maintenanceRecords.map((record) => ({
          ...record,
          cost: Number(record.cost),
          originalCost:
            record.originalCost === null ? null : Number(record.originalCost),
        })),
        fuelLogs: foundVehicle.fuelLogs.map((log) => ({
          ...log,
          cost: Number(log.cost),
        })),
        // tr-İstemci tipi durakları sade {address, lat?, lng?} olarak bekliyor; Prisma satırı
        //    olduğu gibi geçirilemez (bkz. vehicle/queries.ts'deki aynı dönüşüm).
        // en-The client type expects plain {address, lat?, lng?} stops; the raw Prisma row
        //    can't be passed through (same conversion as in vehicle/queries.ts).
        routes: foundVehicle.routes.map((route) => ({
          ...route,
          stops: route.stops.map((stop) => ({
            address: stop.address,
            lat: stop.lat ?? undefined,
            lng: stop.lng ?? undefined,
          })),
        })),
      };
    });
  }
);

const vehicleUpdateSchema = vehicleSchema.partial();

/**
 * tr-belirtilen aracın bilgilerini günceller ve Firebase ile senkronize eder
 * en-updates the specified vehicle's information and synchronizes it with Firebase
 * input (user: AuthenticatedUser, vehicleId: string, data: Record<string, unknown>)
 * output (Promise<Vehicle>)
 */
export const updateVehicle = authenticatedAction(
  async (user, vehicleId: string, data: Record<string, unknown>) => {
    const companyId = user?.companyId || "";
    return controllerGuard("updateVehicle", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const foundVehicle = await db.vehicle.findFirst({
        where: { id: vehicleId, companyId },
        select: { companyId: true },
      });

      if (!foundVehicle) {
        throw new Error("Vehicle not found or unauthorized");
      }

      const parsedData = vehicleUpdateSchema.parse(data);

      const updateData = { ...parsedData };
      if (updateData.fleetNo === "") {
        updateData.fleetNo = `FLEET-${Math.random().toString(36).substring(2, 7).toLocaleUpperCase('en-US')}`;
      }

      const updatedVehicle = await db.vehicle.update({
        where: { id: vehicleId },
        data: updateData as Prisma.VehicleUpdateInput,
      });

      await invalidateVehicleCache(companyId, vehicleId);
      // Sync to Firebase (background)
      syncVehicleToFirebase(updatedVehicle).catch((err) =>
        logger.error("Firebase sync failed:", err)
      );

      return updatedVehicle;
    });
  }
);

/**
 * tr-belirtilen aracı sistemden (geçici olarak/soft-delete) siler ve ilişkili sürücünün atamasını kaldırır
 * en-soft-deletes the specified vehicle and unassigns its associated driver
 * input (user: AuthenticatedUser, vehicleId: string)
 * output (Promise<{ success: boolean }>)
 */
export const deleteVehicle = authenticatedAction(
  async (user, vehicleId: string) => {
    const companyId = user?.companyId || "";
    return controllerGuard("deleteVehicle", async () => {
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      const foundVehicle = await db.vehicle.findFirst({
        where: { id: vehicleId, companyId },
        select: { companyId: true },
      });

      if (!foundVehicle) {
        throw new Error("Vehicle not found or unauthorized");
      }

      // Soft delete: financial/compliance history (fuel, maintenance,
      // documents) must survive, so the row is only marked as deleted.
      await db.driver.updateMany({
        where: { currentVehicleId: vehicleId },
        data: { currentVehicleId: null },
      });
      await db.vehicle.update({
        where: { id: vehicleId },
        data: { deletedAt: new Date(), status: "OUT_OF_ORDER" },
      });

      await invalidateVehicleCache(companyId, vehicleId);
      return { success: true };
    });
  }
);

/**
 * tr-aracın durumunu günceller ve duruma göre bildirim gönderir (örn: bakıma alındıysa)
 * en-updates the vehicle's status and dispatches notifications accordingly (e.g., if put in maintenance)
 * input (user: AuthenticatedUser, vehicleId: string, status: VehicleStatus)
 * output (Promise<Vehicle>)
 */
export const updateVehicleStatus = authenticatedAction(
  async (user, vehicleId: string, status: VehicleStatus) => {
    const companyId = user?.companyId || "";
    return controllerGuard("updateVehicleStatus", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const foundVehicle = await db.vehicle.findFirst({
        where: { id: vehicleId, companyId },
        select: { companyId: true, plate: true },
      });

      if (!foundVehicle) {
        throw new Error("Vehicle not found or unauthorized");
      }

      const updatedVehicle = await db.vehicle.update({
        where: { id: vehicleId },
        data: { status: status as VehicleStatus },
      });

      await invalidateVehicleCache(companyId, vehicleId);

      // Dispatch Notification for specific status changes
      if (status === "MAINTENANCE") {
        await createNotification(
          { companyId: companyId! },
          {
            title: "Araç Bakıma Alındı! ⛔",
            message: `${updatedVehicle.plate} plakalı araç şu an bakım durumunda.`,
            type: "ERROR",
            category: "MAINTENANCE_ALERT",
            link: `/vehicle?id=${vehicleId}`,
          }
        );
      }

      return updatedVehicle;
    });
  }
);
