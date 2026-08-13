import type { Db } from "../../db";
import { TERMINAL_SHIPMENT_STATUSES } from "./shipmentTransitions";

type DbClient = Db;

/**
 * tr-bir rotaya fazladan yük eklendiğinde atanan aracın (ve varsa dorsenin) kapasitesinin aşılmadığını doğrular
 * en-asserts that adding extra load to a route does not exceed the capacity of the assigned vehicle (and trailer, if any)
 * input (db: DbClient, routeId: string, companyId: string, extra?: { weightKg?: number | null, volumeM3?: number | null }, excludeShipmentId?: string)
 * output (Promise<void>)
 */
export async function assertRouteCapacity(
  db: DbClient,
  routeId: string,
  companyId: string,
  extra: { weightKg?: number | null; volumeM3?: number | null } = {},
  excludeShipmentId?: string
): Promise<void> {
  const route = await db.route.findFirst({
    where: { id: routeId, companyId },
    select: {
      vehicle: {
        select: {
          fleetNo: true,
          maxLoadKg: true,
          currentTrailer: {
            select: { maxLoadKg: true, capacityVolumeM3: true },
          },
        },
      },
      shipments: {
        where: {
          status: { notIn: TERMINAL_SHIPMENT_STATUSES },
          ...(excludeShipmentId ? { id: { not: excludeShipmentId } } : {}),
        },
        select: { weightKg: true, volumeM3: true },
      },
    },
  });

  if (!route) {
    throw new Error("Route not found or unauthorized");
  }
  if (!route.vehicle) return;

  const totalWeight =
    route.shipments.reduce((sum, s) => sum + (s.weightKg || 0), 0) +
    (extra.weightKg || 0);
  const totalVolume =
    route.shipments.reduce((sum, s) => sum + (s.volumeM3 || 0), 0) +
    (extra.volumeM3 || 0);

  const trailer = route.vehicle.currentTrailer;
  const maxWeight = route.vehicle.maxLoadKg + (trailer?.maxLoadKg || 0);

  const tolerance = 0.01;
  if (totalWeight > maxWeight + tolerance) {
    throw new Error(
      `Vehicle capacity exceeded on route: total load ${totalWeight.toFixed(2)}kg > max ${maxWeight}kg (vehicle ${route.vehicle.fleetNo}${trailer ? " + trailer" : ""})`
    );
  }
  // Volume is only bounded when a trailer is attached (vehicles have no volume spec).
  if (trailer && totalVolume > trailer.capacityVolumeM3 + tolerance) {
    throw new Error(
      `Trailer volume exceeded on route: total volume ${totalVolume.toFixed(2)}m³ > max ${trailer.capacityVolumeM3}m³`
    );
  }
}
