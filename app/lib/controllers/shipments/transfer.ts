"use server";

import { db } from "../../db";
import { authenticatedAction } from "../../auth-middleware";
import { checkPermission } from "../utils/checkPermission";
import { ShipmentStatus } from "@prisma/client";
import { sendNotificationAction as createNotification } from "@/app/lib/actions/notifications";
import { invalidateShipmentCache } from "./cache";
import { controllerGuard } from "../utils/controllerGuard";
import { NotFoundError } from "../../errors";

// Statuses that still occupy a trailer — the ones that must move when a vehicle
// breaks down. Delivered/failed/cancelled shipments are done and left alone.
const ACTIVE_SHIPMENT_STATUSES: ShipmentStatus[] = [
  ShipmentStatus.PENDING,
  ShipmentStatus.PROCESSING,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.ASSIGNED,
  ShipmentStatus.DELAYED,
];

export interface TrailerLinkedShipment {
  id: string;
  trackingId: string;
  status: ShipmentStatus;
  destination: string;
  weightKg: number;
  volumeM3: number;
  priority: string;
}

/**
 * tr-dorseye yüklenmiş olan aktif durumdaki sevkiyatları getirir (örn: araç arızalandığında etkilenenleri bulmak için)
 * en-retrieves active shipments currently loaded on a trailer (e.g., to find affected shipments when a vehicle breaks down)
 * input (user: AuthenticatedUser, trailerId: string)
 * output (Promise<TrailerLinkedShipment[]>)
 */
export const getShipmentsByTrailer = authenticatedAction(
  async (user, trailerId: string): Promise<TrailerLinkedShipment[]> => {
    const companyId = user?.companyId;
    return controllerGuard("getShipmentsByTrailer", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);
      if (!companyId) throw new Error("User has no company");

      const shipments = await db.shipment.findMany({
        where: {
          trailerId,
          companyId,
          status: { in: ACTIVE_SHIPMENT_STATUSES },
        },
        select: {
          id: true,
          trackingId: true,
          status: true,
          destination: true,
          weightKg: true,
          volumeM3: true,
          priority: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return shipments.map((s) => ({
        id: s.id,
        trackingId: s.trackingId,
        status: s.status,
        destination: s.destination,
        weightKg: s.weightKg ?? 0,
        volumeM3: s.volumeM3 ?? 0,
        priority: s.priority,
      }));
    });
  }
);

export interface VehicleLinkedShipments {
  /** The trailer currently hitched to the vehicle, or null if none. */
  trailerId: string | null;
  shipments: TrailerLinkedShipment[];
}

/**
 * tr-bir araca bağlı dorseyi ve o dorse üzerindeki aktif sevkiyatları döndürür
 * en-returns the trailer linked to a vehicle and the active shipments on that trailer
 * input (user: AuthenticatedUser, vehicleId: string)
 * output (Promise<VehicleLinkedShipments>)
 */
export const getVehicleLinkedShipments = authenticatedAction(
  async (user, vehicleId: string): Promise<VehicleLinkedShipments> => {
    const companyId = user?.companyId;
    return controllerGuard("getVehicleLinkedShipments", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);
      if (!companyId) throw new Error("User has no company");

      const vehicle = await db.vehicle.findFirst({
        where: { id: vehicleId, companyId },
        select: { companyId: true, currentTrailer: { select: { id: true } } },
      });
      if (!vehicle) {
        throw new NotFoundError("Vehicle");
      }

      const trailerId = vehicle.currentTrailer?.id ?? null;
      if (!trailerId) return { trailerId: null, shipments: [] };

      const shipments = await db.shipment.findMany({
        where: {
          trailerId,
          companyId,
          status: { in: ACTIVE_SHIPMENT_STATUSES },
        },
        select: {
          id: true,
          trackingId: true,
          status: true,
          destination: true,
          weightKg: true,
          volumeM3: true,
          priority: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        trailerId,
        shipments: shipments.map((s) => ({
          id: s.id,
          trackingId: s.trackingId,
          status: s.status,
          destination: s.destination,
          weightKg: s.weightKg ?? 0,
          volumeM3: s.volumeM3 ?? 0,
          priority: s.priority,
        })),
      };
    });
  }
);

export interface EligibleTargetTrailer {
  id: string;
  plate: string;
  type: string;
  maxLoadKg: number;
  capacityVolumeM3: number;
  /** Weight already committed to this trailer by active shipments. */
  usedWeightKg: number;
  usedVolumeM3: number;
  vehiclePlate: string | null;
}

/**
 * tr-sevkiyatların aktarılabileceği uygun ve kullanılabilir dorseleri listeler
 * en-lists eligible and available trailers to which shipments can be transferred
 * input (user: AuthenticatedUser, excludeTrailerId?: string)
 * output (Promise<EligibleTargetTrailer[]>)
 */
export const getEligibleTargetTrailers = authenticatedAction(
  async (user, excludeTrailerId?: string): Promise<EligibleTargetTrailer[]> => {
    const companyId = user?.companyId;
    return controllerGuard("getEligibleTargetTrailers", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);
      if (!companyId) throw new Error("User has no company");

      const trailers = await db.trailer.findMany({
        where: {
          companyId,
          status: "AVAILABLE",
          ...(excludeTrailerId ? { id: { not: excludeTrailerId } } : {}),
          // Either unassigned to a vehicle, or on a healthy one.
          OR: [
            { currentVehicle: null },
            {
              currentVehicle: {
                status: { notIn: ["OUT_OF_ORDER", "MAINTENANCE"] },
              },
            },
          ],
        },
        select: {
          id: true,
          plate: true,
          type: true,
          maxLoadKg: true,
          capacityVolumeM3: true,
          currentVehicle: { select: { plate: true } },
        },
        orderBy: { plate: "asc" },
      });

      // Current committed load per trailer, so the picker shows headroom.
      const loads = await db.shipment.groupBy({
        by: ["trailerId"],
        where: {
          companyId,
          trailerId: { in: trailers.map((t) => t.id) },
          status: { in: ACTIVE_SHIPMENT_STATUSES },
        },
        _sum: { weightKg: true, volumeM3: true },
      });
      const loadByTrailer = new Map(
        loads.map((l) => [
          l.trailerId,
          { w: l._sum.weightKg ?? 0, v: l._sum.volumeM3 ?? 0 },
        ])
      );

      return trailers.map((t) => {
        const load = loadByTrailer.get(t.id);
        return {
          id: t.id,
          plate: t.plate,
          type: t.type,
          maxLoadKg: t.maxLoadKg,
          capacityVolumeM3: t.capacityVolumeM3,
          usedWeightKg: load?.w ?? 0,
          usedVolumeM3: load?.v ?? 0,
          vehiclePlate: t.currentVehicle?.plate ?? null,
        };
      });
    });
  }
);

/**
 * tr-birden fazla sevkiyatı (toplu olarak) hedef dorseye atar (örn: araç arızasında transfer için)
 * en-reassigns multiple shipments to a target trailer in bulk (e.g., for transferring load during a vehicle breakdown)
 * input (user: AuthenticatedUser, shipmentIds: string[], targetTrailerId: string)
 * output (Promise<{ success: boolean, reassigned: number, movedFrom: number }>)
 */
export const bulkReassignTrailer = authenticatedAction(
  async (user, shipmentIds: string[], targetTrailerId: string) => {
    const userId = user?.id;
    const companyId = user?.companyId;
    return controllerGuard("bulkReassignTrailer", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);
      if (!companyId) throw new Error("User has no company");
      if (!shipmentIds.length) throw new Error("No shipments selected");

      // Target trailer must exist, be ours, and be operational.
      const target = await db.trailer.findFirst({
        where: { id: targetTrailerId, companyId },
        include: { currentVehicle: { select: { status: true } } },
      });
      if (!target) {
        throw new NotFoundError("Trailer");
      }
      if (target.status !== "AVAILABLE") {
        throw new Error("Target trailer is not available");
      }
      // A trailer hitched to a broken/out-of-service vehicle is not a valid
      // destination — that's the whole point of the reassignment.
      if (
        target.currentVehicle &&
        (target.currentVehicle.status === "OUT_OF_ORDER" ||
          target.currentVehicle.status === "MAINTENANCE")
      ) {
        throw new Error("Target trailer's vehicle is out of service");
      }

      // Load only the caller's active shipments from the requested set.
      const shipments = await db.shipment.findMany({
        where: {
          id: { in: shipmentIds },
          companyId,
          status: { in: ACTIVE_SHIPMENT_STATUSES },
        },
        select: { id: true, weightKg: true, volumeM3: true, trailerId: true },
      });
      if (!shipments.length) {
        throw new Error("No eligible shipments to reassign");
      }

      // Capacity check: existing load on the target (excluding any of the
      // moving shipments already there) + the incoming load must fit.
      const movingIds = new Set(shipments.map((s) => s.id));
      const currentLoad = await db.shipment.aggregate({
        where: {
          trailerId: targetTrailerId,
          status: { in: ACTIVE_SHIPMENT_STATUSES },
          id: { notIn: shipments.map((s) => s.id) },
        },
        _sum: { weightKg: true, volumeM3: true },
      });
      const incomingWeight = shipments.reduce((a, s) => a + (s.weightKg ?? 0), 0);
      const incomingVolume = shipments.reduce((a, s) => a + (s.volumeM3 ?? 0), 0);
      const totalWeight = (currentLoad._sum.weightKg || 0) + incomingWeight;
      const totalVolume = (currentLoad._sum.volumeM3 || 0) + incomingVolume;
      const tolerance = 0.01;
      if (
        target.maxLoadKg > 0 &&
        Math.round(totalWeight * 100) / 100 > target.maxLoadKg + tolerance
      ) {
        throw new Error(
          `Trailer capacity exceeded: ${totalWeight.toFixed(2)}kg > Max ${target.maxLoadKg}kg`
        );
      }
      if (
        target.capacityVolumeM3 > 0 &&
        Math.round(totalVolume * 100) / 100 > target.capacityVolumeM3 + tolerance
      ) {
        throw new Error(
          `Trailer capacity exceeded: ${totalVolume.toFixed(2)}m³ > Max ${target.capacityVolumeM3}m³`
        );
      }

      // Reassign every eligible shipment in one transaction, each with a history
      // entry so the trailer change is auditable.
      const idsToMove = shipments.map((s) => s.id);
      await db.$transaction(async (tx) => {
        await tx.shipment.updateMany({
          where: { id: { in: idsToMove } },
          data: { trailerId: targetTrailerId },
        });
        await tx.shipmentHistory.createMany({
          data: idsToMove.map((id) => ({
            shipmentId: id,
            status: ShipmentStatus.ASSIGNED,
            companyId,
            description: "Trailer reassigned (bulk transfer)",
            createdById: userId ?? null,
          })),
        });
      });

      await invalidateShipmentCache(companyId);

      await createNotification(
        { companyId },
        {
          title: "Sevkiyatlar Yeniden Atandı 🔄",
          message: `${idsToMove.length} sevkiyat yeni bir dorseye aktarıldı.`,
          type: "INFO",
          category: "NEW_ASSIGNMENT",
        }
      );

      return { success: true, reassigned: idsToMove.length, movedFrom: movingIds.size };
    });
  }
);
