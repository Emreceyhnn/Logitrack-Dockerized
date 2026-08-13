"use server";

import { db } from "../../db";
import { sendNotificationAction as createNotification } from "@/app/lib/actions/notifications";
import { checkPermission } from "../utils/checkPermission";
import { authenticatedAction } from "../../auth-middleware";
import { invalidateVehicleCache } from "./cache";
import { controllerGuard } from "../utils/controllerGuard";

/**
 * tr-belirtilen araca bir sürücü atar ve önceki sürücü/araç eşleşmelerini günceller
 * en-assigns a driver to the specified vehicle and updates previous driver/vehicle mappings
 * input (user: AuthenticatedUser, vehicleId: string, driverId: string | null)
 * output (Promise<{ success: boolean }>)
 */
export const assignDriverToVehicle = authenticatedAction(
  async (user, vehicleId: string, driverId: string | null) => {
    const companyId = user?.companyId || "";
    return controllerGuard("assignDriverToVehicle", async () => {
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

      if (driverId) {
        const foundDriver = await db.driver.findFirst({
          where: { id: driverId, companyId },
          select: { companyId: true },
        });
        if (!foundDriver) {
          throw new Error("Driver not found or belongs to another company");
        }
      }

      await db.$transaction(async (tx) => {
        if (driverId) {
          const currentDriverOfVehicle = await tx.driver.findFirst({
            where: { currentVehicleId: vehicleId, companyId },
          });

          if (currentDriverOfVehicle) {
            await tx.driver.update({
              where: { id: currentDriverOfVehicle.id },
              data: { currentVehicleId: null },
            });
          }

          await tx.driver.update({
            where: { id: driverId },
            data: { currentVehicleId: vehicleId },
          });
        } else {
          const currentDriverOfVehicle = await tx.driver.findFirst({
            where: { currentVehicleId: vehicleId, companyId },
          });
          if (currentDriverOfVehicle) {
            await tx.driver.update({
              where: { id: currentDriverOfVehicle.id },
              data: { currentVehicleId: null },
            });
          }
        }
      });

      await invalidateVehicleCache(companyId, vehicleId);

      // If a driver was assigned, notify them
      if (driverId) {
        const driverUser = await db.user.findFirst({
          where: { driver: { id: driverId } },
          select: { id: true },
        });

        if (driverUser) {
          const vehicle = await db.vehicle.findFirst({
            where: { id: vehicleId, companyId },
            select: { plate: true },
          });

          await createNotification(
            { userId: driverUser.id },
            {
              title: "Yeni Araç Atandı! 🚛",
              message: `${vehicle?.plate} plakalı araç size atandı. Yolculuğa başlamaya hazır mısınız?`,
              type: "SUCCESS",
              category: "NEW_ASSIGNMENT",
              link: `/vehicle?id=${vehicleId}`,
            }
          );
        }
      }

      return { success: true };
    });
  }
);

/**
 * tr-belirtilen araca atanmış olan mevcut sürücünün atamasını kaldırır
 * en-unassigns the currently assigned driver from the specified vehicle
 * input (user: AuthenticatedUser, vehicleId: string)
 * output (Promise<{ success: boolean }>)
 */
export const unassignDriverFromVehicle = authenticatedAction(
  async (user, vehicleId: string) => {
    const companyId = user?.companyId || "";
    return controllerGuard("unassignDriverFromVehicle", async () => {
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

      const foundDriver = await db.driver.findFirst({
        where: { currentVehicleId: vehicleId, companyId },
      });

      if (foundDriver) {
        await db.driver.update({
          where: { id: foundDriver.id },
          data: { currentVehicleId: null },
        });
      }

      await invalidateVehicleCache(companyId, vehicleId);
      return { success: true };
    });
  }
);

/**
 * tr-şu anda herhangi bir araca atanmamış ve durumu ON_JOB olan müsait sürücüleri listeler
 * en-lists available drivers whose status is ON_JOB and who are not currently assigned to any vehicle
 * input (user: AuthenticatedUser)
 * output (Promise<Array<{ id: string, rating: number, status: string, user: { name: string, surname: string, avatarUrl: string | null } }>>)
 */
export const getAvailableDrivers = authenticatedAction(async (user) => {
  const companyId = user?.companyId || "";
  return controllerGuard("getAvailableDrivers", async () => {
    await checkPermission(user, companyId, [
      "role_admin",
      "role_manager",
      "role_dispatcher",
    ]);

    if (!companyId) throw new Error("User has no company");

    const availableDrivers = await db.driver.findMany({
      where: {
        companyId,
        currentVehicleId: null,
        status: "ON_JOB",
      },
      select: {
        id: true,
        rating: true,
        status: true,
        user: {
          select: {
            name: true,
            surname: true,
            avatarUrl: true,
          },
        },
      },
    });

    return availableDrivers;
  });
});
