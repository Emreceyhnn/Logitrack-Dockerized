import type { Db } from "../../db";

type DbClient = Db;

function dayRange(date: Date): { gte: Date; lt: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}

/**
 * tr-bir sürücünün belirli bir tarihte rotaya atanmaya uygun olup olmadığını (şirket aidiyeti, izin durumu, başka aktif/planlanmış rotası olmaması) doğrular
 * en-asserts whether a driver is available to be assigned to a route on a given date (checking company ownership, leave status, and conflicting planned/active routes)
 * input (db: DbClient, params: { driverId: string, companyId: string, date: Date, excludeRouteId?: string })
 * output (Promise<void>)
 */
export async function assertDriverAvailableForRoute(
  db: DbClient,
  params: {
    driverId: string;
    companyId: string;
    date: Date;
    excludeRouteId?: string;
  }
): Promise<void> {
  const { driverId, companyId, date, excludeRouteId } = params;

  const driver = await db.driver.findFirst({
    where: { id: driverId, companyId },
    select: { status: true, employeeId: true },
  });
  if (!driver) {
    throw new Error("Driver not found or unauthorized");
  }
  if (driver.status === "ON_LEAVE") {
    throw new Error("Driver is on leave and cannot be assigned to a route");
  }

  const conflict = await db.route.findFirst({
    where: {
      driverId,
      companyId,
      date: dayRange(date),
      status: { in: ["PLANNED", "ACTIVE"] },
      ...(excludeRouteId ? { id: { not: excludeRouteId } } : {}),
    },
    select: { id: true, name: true },
  });
  if (conflict) {
    throw new Error(
      `Driver is already assigned to route "${conflict.name || conflict.id}" on the same day`
    );
  }
}

/**
 * tr-bir aracın belirli bir tarihte rotaya atanmaya uygun olup olmadığını (şirket aidiyeti, arıza/bakım durumu, başka aktif/planlanmış rotası olmaması) doğrular
 * en-asserts whether a vehicle is available to be assigned to a route on a given date (checking company ownership, maintenance/out_of_order status, and conflicting planned/active routes)
 * input (db: DbClient, params: { vehicleId: string, companyId: string, date: Date, excludeRouteId?: string })
 * output (Promise<void>)
 */
export async function assertVehicleAvailableForRoute(
  db: DbClient,
  params: {
    vehicleId: string;
    companyId: string;
    date: Date;
    excludeRouteId?: string;
  }
): Promise<void> {
  const { vehicleId, companyId, date, excludeRouteId } = params;

  const vehicle = await db.vehicle.findFirst({
    where: { id: vehicleId, companyId, deletedAt: null },
    select: { status: true, fleetNo: true },
  });
  if (!vehicle) {
    throw new Error("Vehicle not found or unauthorized");
  }
  if (vehicle.status === "MAINTENANCE" || vehicle.status === "OUT_OF_ORDER") {
    throw new Error(
      `Vehicle ${vehicle.fleetNo} is ${vehicle.status === "MAINTENANCE" ? "in maintenance" : "out of order"} and cannot be assigned to a route`
    );
  }

  const conflict = await db.route.findFirst({
    where: {
      vehicleId,
      companyId,
      date: dayRange(date),
      status: { in: ["PLANNED", "ACTIVE"] },
      ...(excludeRouteId ? { id: { not: excludeRouteId } } : {}),
    },
    select: { id: true, name: true },
  });
  if (conflict) {
    throw new Error(
      `Vehicle ${vehicle.fleetNo} is already assigned to route "${conflict.name || conflict.id}" on the same day`
    );
  }
}
