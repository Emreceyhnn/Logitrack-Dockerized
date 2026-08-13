"use server";

import { db } from "../../db";
import { MaintenanceStatus, MaintenanceType } from "@prisma/client";
import { sendNotificationAction as createNotification } from "@/app/lib/actions/notifications";
import { checkPermission } from "../utils/checkPermission";
import { authenticatedAction } from "../../auth-middleware";
import { invalidateVehicleCache } from "./cache";
import { controllerGuard } from "../utils/controllerGuard";

/**
 * tr-araca yeni bir bakım kaydı ekler, para birimini dönüştürür ve bildirim gönderir
 * en-adds a new maintenance record to the vehicle, converts the currency, and sends a notification
 * input (user: AuthenticatedUser, vehicleId: string, recordData: object)
 * output (Promise<MaintenanceRecord>)
 */
export const addMaintenanceRecord = authenticatedAction(
  async (
    user,
    vehicleId: string,
    recordData: {
      type: MaintenanceType;
      date: Date;
      cost: number;
      currency?: string;
      status?: MaintenanceStatus;
      description?: string;
      documentUrl?: string;
    }
  ) => {
    const companyId = user?.companyId || "";
    return controllerGuard("addMaintenanceRecord", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
        "role_driver",
      ]);

      const foundVehicle = await db.vehicle.findFirst({
        where: { id: vehicleId, companyId },
        select: { companyId: true, plate: true },
      });

      if (!foundVehicle) {
        throw new Error("Vehicle not found or unauthorized");
      }

      // Store the cost exactly as the user entered it, in their chosen currency.
      // The UI uses formatFrom(cost, currency) to convert to the viewer's currency at render time.
      const record = await db.maintenanceRecord.create({
        data: {
          vehicleId,
          companyId,
          ...recordData,
          cost: recordData.cost,
          originalCost: recordData.cost,
          originalCurrency: recordData.currency || "USD",
          currency: recordData.currency || "USD",
        },
      });

      await invalidateVehicleCache(companyId, vehicleId);

      // Dispatch Notification
      await createNotification(
        { companyId: companyId! },
        {
          title: "Bakım Kaydı Oluşturuldu 👨‍🔧",
          message: `${foundVehicle.plate} plakalı araç bakıma alındı. Tür: ${recordData.type}`,
          type: "INFO",
          category: "MAINTENANCE_ALERT",
          link: `/vehicle?id=${vehicleId}`,
        }
      );

      return record;
    });
  }
);

/**
 * tr-mevcut bir bakım kaydını günceller ve durum değişikliklerinde (örn. tamamlandı) bildirim gönderir
 * en-updates an existing maintenance record and sends notifications on status changes (e.g., completed)
 * input (user: AuthenticatedUser, recordId: string, data: object)
 * output (Promise<MaintenanceRecord>)
 */
export const updateMaintenanceRecord = authenticatedAction(
  async (
    user,
    recordId: string,
    data: {
      type?: MaintenanceType;
      date?: Date;
      cost?: number;
      currency?: string;
      status?: MaintenanceStatus;
      description?: string;
      documentUrl?: string;
    }
  ) => {
    const companyId = user?.companyId || "";
    return controllerGuard("updateMaintenanceRecord", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const foundRecord = await db.maintenanceRecord.findFirst({
        where: { id: recordId, companyId },
        include: {
          vehicle: {
            select: {
              companyId: true,
              id: true,
              plate: true,
            },
          },
        },
      });

      if (!foundRecord) {
        throw new Error("Record not found or unauthorized");
      }

      // Store the cost exactly as the user entered it, in their chosen currency.
      const finalData = { ...data };
      if (data.cost !== undefined && data.currency) {
        finalData.cost = data.cost;
        finalData.currency = data.currency;
      }

      const updatedRecord = await db.maintenanceRecord.update({
        where: { id: recordId },
        data: finalData,
        include: { vehicle: { select: { plate: true, id: true } } },
      });

      // Dispatch Notification if status changed
      const oldStatus = foundRecord.status;
      const newStatus = data.status || updatedRecord.status;

      if (newStatus !== oldStatus) {
        let title = "Bakım Güncellendi 👨‍🔧";
        let message = `${updatedRecord.vehicle.plate} plakalı aracın ${updatedRecord.type} bakımı durumu ${newStatus} olarak güncellendi.`;
        let type: "INFO" | "SUCCESS" | "WARNING" | "ERROR" = "INFO";

        switch (newStatus) {
          case "COMPLETED":
            title = "Bakım Tamamlandı! ✅";
            message = `${updatedRecord.vehicle.plate} plakalı aracın ${updatedRecord.type} bakımı başarıyla tamamlandı.`;
            type = "SUCCESS";
            break;
          case "CANCELLED":
            title = "Bakım İptal Edildi 🛑";
            message = `${updatedRecord.vehicle.plate} plakalı aracın ${updatedRecord.type} bakımı iptal edildi.`;
            type = "WARNING";
            break;
          case "IN_PROGRESS":
            title = "Bakım Devam Ediyor 🔧";
            message = `${updatedRecord.vehicle.plate} plakalı aracın ${updatedRecord.type} bakımı başladı.`;
            type = "INFO";
            break;
          case "SCHEDULED":
            title = "Bakım Planlandı 📅";
            message = `${updatedRecord.vehicle.plate} plakalı aracın ${updatedRecord.type} bakımı için tarih belirlendi.`;
            type = "INFO";
            break;
        }

        await createNotification(
          { companyId: foundRecord.vehicle.companyId! },
          {
            title,
            message,
            type,
            link: `/vehicle?id=${updatedRecord.vehicle.id}`,
          }
        );
      }

      await invalidateVehicleCache(companyId, foundRecord.vehicle.id);
      return updatedRecord;
    });
  }
);
