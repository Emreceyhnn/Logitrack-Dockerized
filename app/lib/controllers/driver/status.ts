"use server";

import { db } from "../../db";
import { checkPermission } from "../utils/checkPermission";
import { DriverStatus } from "@prisma/client";
import { sendNotificationAction as createNotification } from "@/app/lib/actions/notifications";
import { authenticatedAction } from "../../auth-middleware";
import { controllerGuard } from "../utils/controllerGuard";
import { ConflictError, NotFoundError } from "../../errors";
import { driverCache } from "./shared";

/**
 * tr-belirtilen sürücünün durumunu (mesaide, izinli vb.) günceller ve bildirim gönderir
 * en-updates the status of the specified driver (on duty, on leave, etc.) and sends a notification
 * input (user: AuthenticatedUser, driverId: string, status: DriverStatus)
 * output (Promise<Driver>)
 */
export const updateDriverStatus = authenticatedAction(
  async (user, driverId: string, status: DriverStatus) => {
    return controllerGuard("updateDriverStatus", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const foundDriver = await db.driver.findFirst({
        where: { id: driverId, companyId },
        select: { companyId: true },
      });

      if (!foundDriver) {
        throw new NotFoundError("Driver");
      }

      const updatedDriver = await db.driver.update({
        where: { id: driverId },
        data: { status },
      });

      await driverCache.invalidate(companyId, driverId);

      // Dispatch Notification for status changes
      const driver = await db.driver.findFirst({
        where: { id: driverId, companyId },
        include: { user: { select: { name: true, surname: true } } }
      });

      const statusMap: Record<DriverStatus, { label: string, type: "INFO" | "WARNING" | "ERROR" | "SUCCESS", emoji: string }> = {
        ON_JOB: { label: "Görevde", type: "INFO", emoji: "🚛" },
        OFF_DUTY: { label: "Mesai Dışı / İstirahat", type: "WARNING", emoji: "😴" },
        ON_LEAVE: { label: "İzinli", type: "INFO", emoji: "🏖️" },
      };

      const statusInfo = statusMap[status] || { label: status, type: "INFO", emoji: "ℹ️" };

      await createNotification(
        { companyId },
        {
          title: `Sürücü Durumu Değişti: ${statusInfo.label} ${statusInfo.emoji}`,
          message: `${driver?.user.name} ${driver?.user.surname} isimli sürücü şu an ${statusInfo.label} durumunda.`,
          type: statusInfo.type,
          link: `/drivers?id=${driverId}`,
        }
      );

      return updatedDriver;
    });
  }
);

/**
 * tr-bir aracı belirli bir sürücüye atar
 * en-assigns a vehicle to a specific driver
 * input (user: AuthenticatedUser, driverId: string, vehicleId: string)
 * output (Promise<Driver>)
 */
export const assignVehicleToDriver = authenticatedAction(
  async (user, driverId: string, vehicleId: string) => {
    return controllerGuard("assignVehicleToDriver", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const vehicle = await db.vehicle.findFirst({
        where: { id: vehicleId, companyId },
        include: { driver: true },
      });

      if (!vehicle) {
        throw new NotFoundError("Vehicle");
      }

      if (vehicle.driver && vehicle.driver.id !== driverId) {
        throw new ConflictError("Vehicle is already assigned to another driver");
      }

      const updatedDriver = await db.driver.update({
        where: { id: driverId },
        data: {
          currentVehicleId: vehicleId,
        },
      });

      await driverCache.invalidate(companyId, driverId);
      return updatedDriver;
    });
  }
);

/**
 * tr-sürücünün üzerindeki aracı kaldırır (atamasını iptal eder)
 * en-removes the vehicle from the driver (unassigns it)
 * input (user: AuthenticatedUser, driverId: string)
 * output (Promise<Driver>)
 */
export const unassignVehicleFromDriver = authenticatedAction(
  async (user, driverId: string) => {
    return controllerGuard("unassignVehicleFromDriver", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const foundDriver = await db.driver.findFirst({
        where: { id: driverId, companyId },
        select: { companyId: true },
      });

      if (!foundDriver) {
        throw new NotFoundError("Driver");
      }

      const updatedDriver = await db.driver.update({
        where: { id: driverId },
        data: {
          currentVehicleId: null,
        },
      });

      await driverCache.invalidate(companyId, driverId);
      return updatedDriver;
    });
  }
);
