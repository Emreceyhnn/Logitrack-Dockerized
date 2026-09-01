"use server";

import { db } from "../../db";
import { authenticatedAction } from "../../auth-middleware";
import { checkPermission } from "../utils/checkPermission";
import { stripUndefined } from "../../utils/stripUndefined";
import {
  ShipmentStatus,
  ShipmentPriority,
  ShipmentServiceType,
  ServiceTier,
} from "@prisma/client";
import { sendNotificationAction as createNotification } from "@/app/lib/actions/notifications";
import { InventoryShipmentItem } from "../../type/add-shipment";
import { invalidateInventoryCache } from "../inventory";
import { invalidateShipmentCache } from "./cache";
import { controllerGuard } from "../utils/controllerGuard";
import type { CustomerWithLocations, ShipmentStopInput } from "./types";
import { toBaseUnitQuantity } from "./types";
import { createShipmentSchema } from "../../validation/serverSchemas";
import { NotFoundError } from "../../errors";
import { logReportEvent } from "@/app/lib/services/reportEvents";
import { createPickTaskForAllocations } from "./warehouseTask";

/**
 * tr-yeni bir sevkiyat oluşturur, rota kapasitelerini kontrol eder ve gerekirse depo stoğunu ayırır
 * en-creates a new shipment, checks route capacities, and allocates warehouse stock if necessary
 * input (user: AuthenticatedUser, data: object)
 * output (Promise<{ shipment: Shipment }>)
 */
export const createShipment = authenticatedAction(
  async (
    user,
    data: {
      customerId?: string | null | undefined;
      origin: string;
      destination: string;
      status?: ShipmentStatus | undefined;
      itemsCount?: number | undefined;
      weightKg?: number | undefined;
      volumeM3?: number | undefined;
      palletCount?: number | undefined;
      cargoType?: string | undefined;
      destinationLat?: number | undefined;
      destinationLng?: number | undefined;
      originLat?: number | undefined;
      originLng?: number | undefined;
      trackingId?: string | undefined;
      referenceNumber?: string | null | undefined;
      customerLocationId?: string | undefined;
      priority?: ShipmentPriority | undefined;
      type?: ShipmentServiceType | undefined;
      serviceTier?: ServiceTier | null | undefined;
      slaDeadline?: Date | null | undefined;
      contactEmail?: string | undefined;
      billingAccount?: string | undefined;
      revenue?: number | undefined;
      extraCostAmount?: number | undefined;
      extraCostNote?: string | undefined;
      currency?: string | undefined;
      originWarehouseId?: string | undefined;
      trailerId?: string | null | undefined;
      driverId?: string | null | undefined;
      inventoryItems?: InventoryShipmentItem[] | undefined;
      stops?: ShipmentStopInput[] | undefined;
    }
  ) => {
    const userId = user?.id;
    const companyId = user?.companyId;

    // Validate the scalar fields; inventoryItems/stops keep their original
    // (non-Zod-inferred) types below so exactOptionalPropertyTypes stays
    // satisfied against InventoryShipmentItem/ShipmentStopInput.
    createShipmentSchema.parse(data);
    const {
      customerId,
      origin,
      destination,
      status = ShipmentStatus.PENDING,
      itemsCount = 1,
      weightKg = 0,
      volumeM3 = 0,
      palletCount = 0,
      cargoType = "General Cargo",
      destinationLat,
      destinationLng,
      originLat,
      originLng,
      trackingId,
      referenceNumber,
      customerLocationId,
      priority = ShipmentPriority.MEDIUM,
      type = ShipmentServiceType.STANDARD_FREIGHT,
      serviceTier,
      slaDeadline,
      contactEmail,
      billingAccount,
      revenue,
      extraCostAmount,
      extraCostNote,
      currency,
      originWarehouseId,
      trailerId,
      driverId,
      inventoryItems = [],
      stops = [],
    } = data;
    return controllerGuard("createShipment", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      if (!companyId) throw new Error("User has no company");

      const finalTrackingId =
        trackingId ||
        `TRK-${Math.random().toString(36).substring(2, 9).toLocaleUpperCase('en-US')}`;

      const existingShipment = await db.shipment.findFirst({
        where: { trackingId: finalTrackingId, companyId },
      });

      if (existingShipment) {
        throw new Error("Tracking ID already exists");
      }

      // Fetch customer details to potentially get default location if destination is not provided
      const customer = customerId
        ? ((await db.customer.findFirst({
            where: { id: customerId, companyId },
            include: { locations: true },
          })) as CustomerWithLocations | null)
        : null;

      if (customerId && !customer) {
        throw new NotFoundError("Customer");
      }

      const defaultCustomerLocation = customer?.locations?.find(
        (l) => l.isDefault
      );
      const firstCustomerLocation = customer?.locations?.[0];

      const finalDestination =
        destination ||
        defaultCustomerLocation?.address ||
        firstCustomerLocation?.address ||
        "";
      const finalDestinationLat =
        typeof destinationLat === "number"
          ? destinationLat
          : typeof defaultCustomerLocation?.lat === "number"
            ? defaultCustomerLocation.lat
            : typeof firstCustomerLocation?.lat === "number"
              ? firstCustomerLocation.lat
              : undefined;
      const finalDestinationLng =
        typeof destinationLng === "number"
          ? destinationLng
          : typeof defaultCustomerLocation?.lng === "number"
            ? defaultCustomerLocation.lng
            : typeof firstCustomerLocation?.lng === "number"
              ? firstCustomerLocation.lng
              : undefined;

      // ── Trailer Capacity Validation ──────────────────────────────────────────
      if (trailerId) {
        const trailer = await db.trailer.findFirst({
          where: { id: trailerId, companyId },
        });
        if (!trailer) {
          throw new NotFoundError("Trailer");
        }
        const currentLoad = await db.shipment.aggregate({
          where: {
            trailerId,
            status: {
              in: [
                ShipmentStatus.PENDING,
                ShipmentStatus.PROCESSING,
                ShipmentStatus.IN_TRANSIT,
                ShipmentStatus.ASSIGNED,
                ShipmentStatus.DELAYED,
              ],
            },
          },
          _sum: { weightKg: true, volumeM3: true },
        });

        const totalWeight = (currentLoad._sum.weightKg || 0) + weightKg;
        const totalVolume = (currentLoad._sum.volumeM3 || 0) + volumeM3;

        const tolerance = 0.01;
        if (
          Math.round(totalWeight * 100) / 100 >
          trailer.maxLoadKg + tolerance
        ) {
          throw new Error(
            `Trailer capacity exceeded: Current load ${totalWeight.toFixed(2)}kg > Max ${trailer.maxLoadKg}kg`
          );
        }
        if (
          Math.round(totalVolume * 100) / 100 >
          trailer.capacityVolumeM3 + tolerance
        ) {
          throw new Error(
            `Trailer capacity exceeded: Current volume ${totalVolume.toFixed(2)}m³ > Max ${trailer.capacityVolumeM3}m³`
          );
        }
      }

      // ── Driver Validation ────────────────────────────────────────────────────
      // Guard against cross-company assignment; the UI already filters to
      // available drivers, but the server is the authority.
      if (driverId) {
        const driver = await db.driver.findFirst({
          where: { id: driverId, companyId },
          select: { id: true, companyId: true },
        });
        if (!driver) {
          throw new NotFoundError("Driver");
        }
      }

      const calculatedItemsCount = inventoryItems.length > 0
        ? inventoryItems.reduce((sum, item) => sum + (item.quantity || 0), 0)
        : itemsCount;

      const newShipment = await db.$transaction(
        async (tx) => {
          const shipment = await tx.shipment.create({
            data: stripUndefined({
              trackingId: finalTrackingId,
              referenceNumber: referenceNumber || undefined,
              customerId: customerId || undefined,
              customerLocationId: customerLocationId || undefined,
              origin,
              originWarehouseId:
                originWarehouseId ||
                (origin.length === 36 ? origin : undefined),
              originLat,
              originLng,
              destination: finalDestination,
              destinationLat: finalDestinationLat,
              destinationLng: finalDestinationLng,
              status,
              itemsCount: calculatedItemsCount,
              weightKg,
              volumeM3,
              palletCount,
              cargoType,
              companyId,
              priority,
              type,
              serviceTier,
              slaDeadline,
              contactEmail,
              billingAccount,
              revenue,
              extraCostAmount,
              extraCostNote,
              currency,
              trailerId: trailerId || undefined,
              driverId: driverId || undefined,
              history: {
                create: {
                  status: status,
                  companyId: companyId!,
                  description: "Shipment created",
                  createdById: userId,
                },
              },
              items: {
                create: inventoryItems.map((item: InventoryShipmentItem) => ({
                  companyId: companyId!,
                  sku: item.sku,
                  name: item.name,
                  quantity: item.quantity,
                  unit: item.unit,
                  // Omit when undefined so Prisma applies the schema defaults.
                  ...(item.weightKg !== undefined ? { weightKg: item.weightKg } : {}),
                  ...(item.volumeM3 !== undefined ? { volumeM3: item.volumeM3 } : {}),
                  ...(item.palletCount !== undefined ? { palletCount: item.palletCount } : {}),
                  ...(item.cargoType !== undefined ? { cargoType: item.cargoType } : {}),
                })),
              },
              stops: {
                create: [
                  {
                    companyId: companyId!,
                    address: origin || originWarehouseId || "Bilinmeyen Kalkış",
                    lat: originLat || null,
                    lng: originLng || null,
                    sequence: 1,
                  },
                  ...stops.map((stop: ShipmentStopInput, index: number) => ({
                    companyId: companyId!,
                    customerId: stop.customerId || null,
                    customerLocationId: stop.customerLocationId || null,
                    address: stop.address,
                    lat: stop.lat,
                    lng: stop.lng,
                    sequence: index + 2,
                    contactEmail: stop.contactEmail || null,
                  })),
                ],
              },
            }),
          });

          // Decrement inventory stock if it's from a warehouse
          const finalWarehouseId = shipment.originWarehouseId;
          if (finalWarehouseId && inventoryItems.length > 0) {
            const allocations = (
              await Promise.all(
                inventoryItems.map(async (item: InventoryShipmentItem) => {
                  const invItem = await tx.inventory.findFirst({
                    where: {
                      warehouseId: finalWarehouseId,
                      sku: item.sku,
                      companyId,
                    },
                  });

                  if (!invItem) return null;

                  const baseUnitQuantity = toBaseUnitQuantity(item);

                  await tx.inventory.update({
                    where: { id: invItem.id },
                    data: {
                      allocatedQuantity: { increment: baseUnitQuantity },
                    },
                  });

                  await tx.inventoryMovement.create({
                    data: {
                      warehouseId: finalWarehouseId,
                      sku: item.sku,
                      quantity: -baseUnitQuantity,
                      type: "ALLOCATION",
                      userId,
                      companyId,
                    },
                  });

                  return {
                    name: item.name,
                    sku: item.sku,
                    zone: invItem.zone || "UNASSIGNED",
                    totalUnits: baseUnitQuantity,
                  };
                })
              )
            ).filter((a): a is NonNullable<typeof a> => a !== null);

            await createPickTaskForAllocations(tx, {
              companyId: companyId!,
              warehouseId: finalWarehouseId,
              orderRef: shipment.trackingId,
              allocations,
            });
          }

          await logReportEvent(tx, {
            eventType: "SHIPMENT_CREATED",
            occurredAt: shipment.createdAt,
            companyId,
            subjectType: "SHIPMENT",
            subjectId: shipment.id,
            warehouseId: shipment.originWarehouseId,
            driverId: shipment.driverId,
            customerId: shipment.customerId,
            quantity: calculatedItemsCount,
            weightKg,
            volumeM3,
            revenue: revenue ?? null,
            amount: extraCostAmount ?? null,
            payload: extraCostNote ? { extraCostNote } : null,
            sourceEventId: `shipment-created-${shipment.id}`,
          });

          return shipment;
        }
      );

      await Promise.all([
        invalidateShipmentCache(companyId!),
        invalidateInventoryCache(companyId!),
      ]);

      // Dispatch Notification
      await createNotification(
        { companyId: companyId! },
        {
          title: "Yeni Sevkiyat Kaydı 📦",
          message: `${newShipment.trackingId} takip numaralı yeni sevkiyat oluşturuldu.`,
          type: "INFO",
          category: "SHIPMENT_UPDATE",
          link: `/shipments?id=${newShipment.id}`,
        }
      );

      return { shipment: newShipment };
    });
  }
);
