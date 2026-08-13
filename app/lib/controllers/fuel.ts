"use server";

import { db } from "../db";
import { FuelType } from "@prisma/client";
import { checkPermission } from "./utils/checkPermission";
import { FuelLogWithRelations, FuelPageState } from "../type/fuel";
import { authenticatedAction } from "../auth-middleware";
import { controllerGuard } from "./utils/controllerGuard";
import { createFuelLogSchema } from "../validation/serverSchemas";

/**
 * tr-belirtilen filtrelere göre yakıt kayıtlarını getirir
 * en-retrieves fuel logs based on the specified filters
 * input (user: AuthenticatedUser, filters: FuelPageState["filters"])
 * output (Promise<FuelLogWithRelations[]>)
 */
export const getFuelLogs = authenticatedAction(
  async (user, filters: FuelPageState["filters"]) => {
    return controllerGuard("getFuelLogs", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId);
      
      const { vehicleId, driverId, startDate, endDate } = filters;

      const logs = await db.fuelLog.findMany({
        where: {
          companyId,
          ...(vehicleId && { vehicleId }),
          ...(driverId && { driverId }),
          ...(startDate &&
            endDate && {
              date: {
                gte: startDate,
                lte: endDate,
              },
            }),
        },
        include: {
          vehicle: {
            select: {
              id: true,
              plate: true,
              fleetNo: true,
            },
          },
          driver: {
            include: {
              user: {
                select: {
                  name: true,
                  surname: true,
                },
              },
            },
          },
        },
        orderBy: {
          date: "desc",
        },
      });

      const typedLogs: FuelLogWithRelations[] = logs.map((log) => ({
        ...log,
        cost: Number(log.cost),
      }));
      return typedLogs;
    });
  }
);

/**
 * tr-yeni bir yakıt kaydı oluşturur
 * en-creates a new fuel log
 * input (user: AuthenticatedUser, data: object)
 * output (Promise<FuelLog>)
 */
export const createFuelLog = authenticatedAction(
  async (
    user,
    data: {
      vehicleId: string;
      driverId: string;
      volumeLiter: number;
      cost: number;
      odometerKm: number;
      location?: string | undefined;
      fuelType: FuelType;
      date?: Date | undefined;
      receiptUrl?: string | undefined;
      currency?: string | undefined;
    }
  ) => {
    return controllerGuard("createFuelLog", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId);

      const parsed = createFuelLogSchema.parse(data);

      // Store the cost exactly as the user entered it, in their chosen currency.
      // The UI uses formatFrom(cost, currency) to convert to the viewer's currency at render time.
      const log = await db.fuelLog.create({
        data: {
          ...parsed,
          location: parsed.location ?? null,
          receiptUrl: parsed.receiptUrl ?? null,
          cost: parsed.cost,
          currency: parsed.currency,
          companyId,
        },
      });
      return { ...log, cost: Number(log.cost) };
    });
  }
);

/**
 * tr-yakıt tüketimi ve maliyet istatistiklerini getirir
 * en-retrieves fuel consumption and cost statistics
 * input (user: AuthenticatedUser)
 * output (Promise<{ totalCost: number, totalVolume: number, avgFuelPrice: number, efficiencyKml: number }>)
 */
export const getFuelStats = authenticatedAction(async (user) => {
  return controllerGuard("getFuelStats", async () => {
    const companyId = user?.companyId || "";
    await checkPermission(user, companyId);

    const logs = await db.fuelLog.findMany({
      where: { companyId },
      select: { cost: true, volumeLiter: true, odometerKm: true },
      orderBy: { date: "desc" },
    });

    if (logs.length === 0) {
      return {
        totalCost: 0,
        totalVolume: 0,
        avgFuelPrice: 0,
        efficiencyKml: 0,
      };
    }

    const totalCost = logs.reduce((sum: number, log) => sum + Number(log.cost), 0);
    const totalVolume = logs.reduce(
      (sum: number, log) => sum + log.volumeLiter,
      0
    );

    // Basic efficiency calculation if we have at least 2 logs with odometer readings
    let efficiencyKml = 0;
    if (logs.length >= 2) {
      const sortedLogs = [...logs].sort((a, b) => b.odometerKm - a.odometerKm);
      const highest = sortedLogs[0];
      const lowest = sortedLogs[sortedLogs.length - 1];
      if (highest && lowest) {
        const totalDist = highest.odometerKm - lowest.odometerKm;
        efficiencyKml = totalDist / totalVolume;
      }
    }

    return {
      totalCost,
      totalVolume,
      avgFuelPrice: totalCost / totalVolume,
      efficiencyKml,
    };
  });
});
