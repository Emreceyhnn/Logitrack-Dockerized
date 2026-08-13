"use server";

import { db } from "../db";
import { authenticatedAction } from "../auth-middleware";
import { stripUndefined } from "../utils/stripUndefined";
import { checkPermission } from "./utils/checkPermission";
import type { MaintenanceStatus, MaintenanceType, Prisma } from "@prisma/client";
import dayjs from "dayjs";
import { sendNotificationAction as createNotification } from "@/app/lib/actions/notifications";
import { getExchangeRates } from "@/app/lib/services/exchangeRate";
import { logger } from "../logger";
import { controllerGuard } from "./utils/controllerGuard";
import { createMaintenanceRecordSchema, updateMaintenanceRecordSchema } from "../validation/serverSchemas";
import { NotFoundError } from "../errors";

/** Decimal columns are not serializable across the server-action boundary. */
function serializeRecord<T extends { cost: Prisma.Decimal; originalCost: Prisma.Decimal | null }>(
  record: T
) {
  return {
    ...record,
    cost: Number(record.cost),
    originalCost: record.originalCost === null ? null : Number(record.originalCost),
  };
}

/**
 * tr-yeni bir bakım kaydı oluşturur
 * en-creates a new maintenance record
 * input (user: AuthenticatedUser, vehicleId: string, type: MaintenanceType, date: Date, cost: number, description?: string, currency?: string, documentUrl?: string)
 * output (Promise<{ maintenanceRecord: any }>)
 */
export const createMaintenanceRecord = authenticatedAction(
  async (
    user,
    vehicleId: string,
    type: MaintenanceType,
    date: Date,
    cost: number,
    description?: string,
    currency: string = "USD",
    documentUrl?: string
  ) => {
    return controllerGuard("createMaintenanceRecord", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const parsed = createMaintenanceRecordSchema.parse({
        vehicleId,
        type,
        date,
        cost,
        description,
        currency,
        documentUrl,
      });

      const vehicle = await db.vehicle.findFirst({
        where: { id: parsed.vehicleId, companyId },
        select: { companyId: true },
      });

      if (!vehicle) {
        throw new NotFoundError("Vehicle");
      }

      let normalizedCost = parsed.cost;
      if (parsed.currency && parsed.currency !== "USD") {
        try {
          const rates = await getExchangeRates();
          const rate = rates.rates[parsed.currency] || 1;
          normalizedCost = parsed.cost / rate;
        } catch (err) {
          logger.warn("[maintenance] Currency conversion failed", err);
        }
      }

      const newRecord = await db.maintenanceRecord.create({
        data: {
          vehicleId: parsed.vehicleId,
          companyId,
          type: parsed.type,
          date: parsed.date,
          cost: normalizedCost,
          originalCost: parsed.cost,
          originalCurrency: parsed.currency || "USD",
          description: parsed.description ?? null,
          currency: "USD",
          documentUrl: parsed.documentUrl ?? null,
        },
        include: { vehicle: { select: { plate: true } } },
      });

      await createNotification(
        { companyId },
        {
          title: "Yeni Bakım Kaydı 👨‍🔧",
          message: `${newRecord.vehicle.plate} plakalı araç için ${parsed.type} bakımı planlandı.`,
          type: "INFO",
          category: "MAINTENANCE_ALERT",
          link: `/vehicle?id=${parsed.vehicleId}`,
        }
      );

      return { maintenanceRecord: serializeRecord(newRecord) };
    });
  }
);

/**
 * tr-araca veya şirkete ait bakım kayıtlarını getirir
 * en-retrieves maintenance records for a vehicle or the company
 * input (user: AuthenticatedUser, vehicleId?: string)
 * output (Promise<any[]>)
 */
export const getMaintenanceRecords = authenticatedAction(
  async (user, vehicleId?: string) => {
    return controllerGuard("getMaintenanceRecords", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      const whereClause: Prisma.MaintenanceRecordWhereInput = { companyId };
      if (vehicleId) {
        whereClause.vehicleId = vehicleId;
      }

      const records = await db.maintenanceRecord.findMany({
        where: whereClause,
        include: {
          vehicle: {
            select: { plate: true, brand: true, model: true },
          },
        },
        orderBy: { date: "desc" },
      });
      return records.map(serializeRecord);
    });
  }
);

/**
 * tr-belirtilen kimliğe sahip bakım kaydını getirir
 * en-retrieves the maintenance record with the specified ID
 * input (user: AuthenticatedUser, recordId: string)
 * output (Promise<any>)
 */
export const getMaintenanceRecordById = authenticatedAction(
  async (user, recordId: string) => {
    return controllerGuard("getMaintenanceRecordById", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);
      
      const record = await db.maintenanceRecord.findFirst({
        where: { id: recordId, companyId },
        include: { vehicle: true },
      });

      if (!record) {
        throw new NotFoundError("Maintenance record");
      }

      return serializeRecord(record);
    });
  }
);

export interface MaintenanceRecordUpdateData {
  type?: MaintenanceType;
  date?: Date;
  cost?: number;
  currency?: string;
  status?: MaintenanceStatus;
  description?: string;
  documentUrl?: string;
}

/**
 * tr-belirtilen bakım kaydını günceller
 * en-updates the specified maintenance record
 * input (user: AuthenticatedUser, recordId: string, data: MaintenanceRecordUpdateData)
 * output (Promise<any>)
 */
export const updateMaintenanceRecord = authenticatedAction(
  async (user, recordId: string, data: MaintenanceRecordUpdateData) => {
    return controllerGuard("updateMaintenanceRecord", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      const parsed = updateMaintenanceRecordSchema.parse(data);

      const existingRecord = await db.maintenanceRecord.findFirst({
        where: { id: recordId, companyId },
        select: {
          status: true,
          type: true,
          companyId: true,
          vehicle: { select: { plate: true } },
        },
      });

      if (!existingRecord) {
        throw new NotFoundError("Maintenance record");
      }

      const finalData: Prisma.MaintenanceRecordUpdateInput = stripUndefined(parsed);

      if (parsed.cost !== undefined && parsed.currency && parsed.currency !== "USD") {
        try {
          const rates = await getExchangeRates();
          const rate = rates.rates[parsed.currency] || 1;
          finalData.cost = parsed.cost / rate;
          finalData.originalCost = parsed.cost;
          finalData.originalCurrency = parsed.currency;
          finalData.currency = "USD";
        } catch (err) {
          logger.warn("[maintenance] Currency conversion failed in update", err);
        }
      } else if (parsed.cost !== undefined) {
        finalData.originalCost = parsed.cost;
        finalData.originalCurrency = parsed.currency || "USD";
        finalData.currency = "USD";
      } else if (parsed.currency) {
        finalData.currency = "USD";
      }

      const updatedRecord = await db.maintenanceRecord.update({
        where: { id: recordId },
        data: finalData,
        include: { vehicle: { select: { plate: true, id: true } } },
      });

      const oldStatus = existingRecord.status;
      const newStatus = parsed.status || updatedRecord.status;

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
          { companyId },
          {
            title,
            message,
            type,
            category: "MAINTENANCE_ALERT",
            link: `/vehicle?id=${updatedRecord.vehicle.id}`,
          }
        );
      }

      return serializeRecord(updatedRecord);
    });
  }
);

/**
 * tr-belirtilen bakım kaydını siler
 * en-deletes the specified maintenance record
 * input (user: AuthenticatedUser, recordId: string)
 * output (Promise<{ success: boolean }>)
 */
export const deleteMaintenanceRecord = authenticatedAction(
  async (user, recordId: string) => {
    return controllerGuard("deleteMaintenanceRecord", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);
      
      const existingRecord = await db.maintenanceRecord.findFirst({
        where: { id: recordId, companyId },
        select: {
          type: true,
          vehicleId: true,
          companyId: true,
          vehicle: { select: { plate: true } },
        },
      });

      if (!existingRecord) {
        throw new NotFoundError("Maintenance record");
      }

      await db.maintenanceRecord.delete({ where: { id: recordId } });

      await createNotification(
        { companyId },
        {
          title: "Bakım Kaydı Silindi 🗑️",
          message: `${existingRecord.vehicle.plate} plakalı araca ait ${existingRecord.type} bakımı kaydı sistemden silindi.`,
          type: "WARNING",
          category: "MAINTENANCE_ALERT",
          link: `/vehicle?id=${existingRecord.vehicleId}`,
        }
      );

      return { success: true };
    });
  }
);

/**
 * tr-şirketin yıllık bakım istatistiklerini getirir
 * en-retrieves the company's annual maintenance statistics
 * input (user: AuthenticatedUser)
 * output (Promise<{ totalCost: number, costByType: Record<string, number>, recordCount: number }>)
 */
export const getMaintenanceStats = authenticatedAction(async (user) => {
  return controllerGuard("getMaintenanceStats", async () => {
    const companyId = user?.companyId || "";
    await checkPermission(user, companyId, [
      "role_admin",
      "role_manager",
      "role_driver",
      "role_warehouse",
    ]);

    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    const records = await db.maintenanceRecord.findMany({
      where: {
        companyId,
        date: { gte: startOfYear, lte: endOfYear },
      },
      select: { cost: true, type: true, date: true },
    });

    const totalCost = records.reduce((sum, record) => sum + Number(record.cost), 0);
    const costByType: Record<string, number> = {};
    
    records.forEach((record) => {
      costByType[record.type] = (costByType[record.type] || 0) + Number(record.cost);
    });

    return { totalCost, costByType, recordCount: records.length };
  });
});

/**
 * tr-yaklaşan bakım kayıtlarını kontrol eder ve bildirim oluşturur
 * en-checks upcoming maintenance records and creates notifications
 * input (user: AuthenticatedUser)
 * output (Promise<{ count: number }>)
 */
export const checkUpcomingMaintenance = authenticatedAction(async (user) => {
  return controllerGuard("checkUpcomingMaintenance", async () => {
    const companyId = user?.companyId;
    if (!companyId) return { count: 0 };

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const upcomingRecords = await db.maintenanceRecord.findMany({
      where: {
        companyId,
        status: "SCHEDULED",
        date: {
          gte: new Date(),
          lte: threeDaysFromNow,
        },
      },
      include: {
        vehicle: { select: { plate: true, id: true } },
      },
    });

    for (const record of upcomingRecords) {
      await createNotification(
        { companyId },
        {
          title: "Yaklaşan Bakım Uyarısı! ⏳",
          message: `${record.vehicle.plate} plakalı aracın ${record.type} bakımı yaklaşıyor (Tarih: ${dayjs(record.date).format("DD.MM.YYYY")}).`,
          type: "WARNING",
          category: "MAINTENANCE_ALERT",
          link: `/vehicle?id=${record.vehicle.id}`,
        }
      );
    }

    return { count: upcomingRecords.length };
  });
});
