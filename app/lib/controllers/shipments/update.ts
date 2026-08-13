"use server";

import { db } from "../../db";
import { authenticatedAction } from "../../auth-middleware";
import { checkPermission } from "../utils/checkPermission";
import { type Prisma, ShipmentStatus } from "@prisma/client";
import { InventoryShipmentItem } from "../../type/add-shipment";
import { invalidateInventoryCache } from "../inventory";
import {
  assertShipmentTransition,
  isTerminalShipmentStatus,
} from "../utils/shipmentTransitions";
import { invalidateShipmentCache } from "./cache";
import { controllerGuard } from "../utils/controllerGuard";
import type { ShipmentStopInput } from "./types";
import { toBaseUnitQuantity } from "./types";
import { logger } from "@/app/lib/logger";
import { NotFoundError } from "../../errors";


/**
 * tr-sevkiyat bilgilerini ve bağlı stok öğelerini güvenli bir şekilde günceller
 * en-securely updates shipment information and its linked inventory items
 * input (user: AuthenticatedUser, shipmentId: string, data: object)
 * output (Promise<Shipment>)
 */
export const updateShipment = authenticatedAction(
  async (
    user,
    shipmentId: string,
    data: (Prisma.ShipmentUpdateInput | Prisma.ShipmentUncheckedUpdateInput) & {
      inventoryItems?: InventoryShipmentItem[];
      stops?: ShipmentStopInput[];
    }
  ) => {
    const userId = user?.id;
    const companyId = user?.companyId;
    return controllerGuard("updateShipment", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const existingShipment = await db.shipment.findFirst({
        where: { id: shipmentId, companyId: companyId! },
        select: { companyId: true, status: true, originWarehouseId: true },
      });

      if (!existingShipment) {
        throw new Error("Shipment not found or unauthorized");
      }

      // A status change coming through the generic edit path must still obey
      // the lifecycle state machine — the edit dialog is not a backdoor.
      const nextStatus = (data as { status?: ShipmentStatus }).status;
      if (nextStatus && nextStatus !== existingShipment.status) {
        assertShipmentTransition(existingShipment.status, nextStatus);
      }

      const updateData = { ...data } as Prisma.ShipmentUpdateInput & {
        inventoryItems?: InventoryShipmentItem[];
        stops?: ShipmentStopInput[];
      };
      // companyId must never come from client input — it's fixed to the
      // authenticated user's tenant, otherwise a caller could reassign a
      // shipment to a company they don't belong to (tenant hijacking).
      delete (updateData as Record<string, unknown>).companyId;
      delete (updateData as Record<string, unknown>).company;
      if (updateData.trackingId === "") {
        updateData.trackingId = `TRK-${Math.random().toString(36).substring(2, 9).toLocaleUpperCase('en-US')}`;
      }

      // Convert empty strings on FK fields to undefined (guards against Prisma P2003)
      const fkFields = [
        "customerId",
        "customerLocationId",
        "routeId",
        "originWarehouseId",
        "driverId",
        "trailerId",
      ];
      for (const field of fkFields) {
        const val = (updateData as Record<string, unknown>)[field];
        if (val === "" || val === null) {
          (updateData as Record<string, unknown>)[field] = undefined;
        }
      }

      // Every FK the client can set must resolve to a row owned by this same
      // tenant — otherwise a caller could bind their shipment to another
      // company's customer/driver/trailer/route/warehouse (read-only
      // cross-tenant linkage, mirrors the createShipment ownership checks).
      const updateFields = updateData as Record<string, unknown>;
      const asFkId = (field: string): string | undefined => {
        const val = updateFields[field];
        return typeof val === "string" && val ? val : undefined;
      };

      const customerIdFk = asFkId("customerId");
      const customerLocationIdFk = asFkId("customerLocationId");
      const routeIdFk = asFkId("routeId");
      const originWarehouseIdFk = asFkId("originWarehouseId");
      const driverIdFk = asFkId("driverId");
      const trailerIdFk = asFkId("trailerId");

      const [
        customerOwner,
        customerLocationOwner,
        routeOwner,
        warehouseOwner,
        driverOwner,
        trailerOwner,
      ] = await Promise.all([
        customerIdFk
          ? db.customer.findFirst({ where: { id: customerIdFk, companyId: companyId! }, select: { companyId: true } })
          : null,
        customerLocationIdFk
          ? db.customerLocation.findFirst({ where: { id: customerLocationIdFk, companyId: companyId! }, select: { companyId: true } })
          : null,
        routeIdFk
          ? db.route.findFirst({ where: { id: routeIdFk, companyId: companyId! }, select: { companyId: true } })
          : null,
        originWarehouseIdFk
          ? db.warehouse.findFirst({ where: { id: originWarehouseIdFk, companyId: companyId! }, select: { companyId: true } })
          : null,
        driverIdFk
          ? db.driver.findFirst({ where: { id: driverIdFk, companyId: companyId! }, select: { companyId: true } })
          : null,
        trailerIdFk
          ? db.trailer.findFirst({ where: { id: trailerIdFk, companyId: companyId! }, select: { companyId: true } })
          : null,
      ]);

      if (customerIdFk && !customerOwner) {
        throw new NotFoundError("Customer");
      }
      if (customerLocationIdFk && !customerLocationOwner) {
        throw new NotFoundError("Customer location");
      }
      if (routeIdFk && !routeOwner) {
        throw new NotFoundError("Route");
      }
      if (originWarehouseIdFk && !warehouseOwner) {
        throw new NotFoundError("Warehouse");
      }
      if (driverIdFk && !driverOwner) {
        throw new NotFoundError("Driver");
      }
      if (trailerIdFk && !trailerOwner) {
        throw new NotFoundError("Trailer");
      }

      // Handle items synchronization if provided
      const items = updateData.inventoryItems;
      if (items) {
        delete updateData.inventoryItems;

        // Selecting real inventory implies stock is coming out of a specific
        // warehouse — without one, the allocation, the InventoryMovement, and
        // the warehouse worker's pick task never get created, and the
        // shipment silently never shows up on the warehouse floor. Check
        // against the incoming value if the caller is setting it, otherwise
        // the shipment's existing one (a partial update might only touch
        // items while origin was set earlier).
        if (items.length > 0) {
          const nextOriginWarehouseId =
            (updateData as { originWarehouseId?: string | null }).originWarehouseId ??
            existingShipment.originWarehouseId;
          if (!nextOriginWarehouseId) {
            throw new Error(
              "Origin warehouse is required when inventory items are selected"
            );
          }
        }

        // Use a transaction for safety
        const updatedShipment = await db.$transaction(
          async (tx) => {
            // 1. Get old items to restore inventory
            const oldShipment = await tx.shipment.findFirst({
              where: { id: shipmentId, companyId: companyId! },
              include: { items: true },
            });

            if (!oldShipment) throw new Error("Shipment not found");

            // Check trackingId uniqueness if it's being updated
            if (
              updateData.trackingId &&
              updateData.trackingId !== oldShipment.trackingId
            ) {
              const duplicate = await tx.shipment.findFirst({
                where: { trackingId: updateData.trackingId as string, companyId: companyId! },
              });
              if (duplicate) {
                throw new Error(
                  "Tracking ID already exists in another shipment"
                );
              }
            }

            const oldWarehouseId = oldShipment.originWarehouseId;

            if (oldWarehouseId) {
              await Promise.all(
                oldShipment!.items.map(async (oldItem) => {
                  const invItem = await tx.inventory.findFirst({
                    where: {
                      warehouseId: oldWarehouseId,
                      sku: oldItem.sku,
                      companyId: companyId!,
                    },
                  });

                  if (invItem) {
                    const baseUnitQuantity = toBaseUnitQuantity(oldItem);

                    await tx.inventory.update({
                      where: { id: invItem.id },
                      data: {
                        allocatedQuantity: { decrement: baseUnitQuantity },
                      },
                    });

                    await tx.inventoryMovement.create({
                      data: {
                        warehouseId: oldWarehouseId,
                        sku: oldItem.sku,
                        quantity: baseUnitQuantity,
                        type: "ALLOCATION_REVERT",
                        userId,
                        companyId: companyId!,
                      },
                    });
                  }
                })
              );

              // Drop the pick tasks these items generated. Only tasks a
              // worker hasn't started yet (still OPEN) are removed — one
              // already IN_PROGRESS/COMPLETED reflects real picking work
              // that happened and shouldn't silently disappear because the
              // shipment's item list changed.
              await tx.warehouseTask.deleteMany({
                where: {
                  warehouseId: oldWarehouseId,
                  companyId: companyId!,
                  orderRef: oldShipment.trackingId,
                  status: "OPEN",
                },
              });
            }

            // 3. Delete existing shipment items and stops
            await tx.shipmentItem.deleteMany({
              where: { shipmentId },
            });
            await tx.shipmentStop.deleteMany({
              where: { shipmentId },
            });

            // 4. Update shipment and create new items/stops
            const stops = updateData.stops || [];
            delete updateData.stops;

            const calculatedItemsCount = items && items.length > 0
              ? items.reduce((sum, item) => sum + (item.quantity || 0), 0)
              : (updateData.itemsCount !== undefined ? updateData.itemsCount : oldShipment.itemsCount);

            const updated = await tx.shipment.update({
              where: { id: shipmentId },
              data: {
                ...updateData,
                itemsCount: calculatedItemsCount,
                items: {
                  create: items.map((item: InventoryShipmentItem) => ({
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
                  create: stops.map((stop: ShipmentStopInput) => ({
                    companyId: companyId!,
                    customerId: stop.customerId || null,
                    customerLocationId: stop.customerLocationId || null,
                    address: stop.address,
                    lat: stop.lat,
                    lng: stop.lng,
                    sequence: stop.sequence,
                    contactEmail: stop.contactEmail || null,
                  })),
                },
              },
              include: { items: true, stops: true },
            });

            // 5. Decrement new inventory if applicable
            const newWarehouseId = updated.originWarehouseId;
            if (newWarehouseId) {
              for (const item of items) {
                const invItem = await tx.inventory.findFirst({
                  where: {
                    warehouseId: newWarehouseId,
                    sku: item.sku,
                    companyId: companyId!,
                  },
                });

                if (invItem) {
                  const baseUnitQuantity = toBaseUnitQuantity(item);

                  await tx.inventory.update({
                    where: { id: invItem.id },
                    data: {
                      allocatedQuantity: {
                        increment: baseUnitQuantity,
                      },
                    },
                  });

                  await tx.inventoryMovement.create({
                    data: {
                      warehouseId: newWarehouseId,
                      sku: item.sku,
                      quantity: -baseUnitQuantity,
                      type: "ALLOCATION",
                      userId,
                      companyId: companyId!,
                    },
                  });

                  await tx.warehouseTask.create({
                    data: {
                      warehouseId: newWarehouseId,
                      companyId: companyId!,
                      kind: "PICK",
                      name: item.name,
                      sku: item.sku,
                      orderRef: updated.trackingId,
                      zone: invItem.zone || "UNASSIGNED",
                      totalUnits: baseUnitQuantity,
                    },
                  });
                }
              }
            }

            return updated;
          }
        );

        // Non-blocking invalidation to prevent hanging on slow Redis
        Promise.all([
          invalidateShipmentCache(companyId!, shipmentId),
          invalidateInventoryCache(companyId!),
        ]).catch((err) => logger.error("Cache invalidation failed:", err));

        return updatedShipment;
      }

      const updatedShipment = await db.shipment.update({
        where: { id: shipmentId },
        data: updateData,
      });

      // ── Trailer Status Management ──────────────────────────────────────────
      if (
        updatedShipment.trailerId &&
        isTerminalShipmentStatus(updatedShipment.status)
      ) {
        // Check if there are any other active shipments on this trailer
        const otherActiveShipments = await db.shipment.count({
          where: {
            trailerId: updatedShipment.trailerId,
            status: {
              in: [
                ShipmentStatus.PENDING,
                ShipmentStatus.PROCESSING,
                ShipmentStatus.IN_TRANSIT,
                ShipmentStatus.ASSIGNED,
                ShipmentStatus.DELAYED,
              ],
            },
            id: { not: shipmentId },
          },
        });

        if (otherActiveShipments === 0) {
          // If no other active shipments, we could potentially set trailer to AVAILABLE
          // but only if it's not currently attached to a vehicle in a way that implies it's still "IN_USE"
          // However, user specifically asked for "automatic AVAILABLE"
          await db.trailer.update({
            where: { id: updatedShipment.trailerId },
            data: { status: "AVAILABLE" },
          });
        }
      }

      invalidateShipmentCache(companyId!, shipmentId).catch((err) =>
        logger.error("Cache invalidation failed:", err)
      );
      return updatedShipment;
    });
  }
);

/**
 * tr-belirtilen sevkiyatı siler ve ilişkili stok miktarlarını depoya iade eder
 * en-deletes the specified shipment and restores the related allocated inventory stock
 * input (user: AuthenticatedUser, shipmentId: string)
 * output (Promise<{ success: boolean }>)
 */
export const deleteShipment = authenticatedAction(
  async (user, shipmentId: string) => {
    const userId = user?.id;
    const companyId = user?.companyId;
    return controllerGuard("deleteShipment", async () => {
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      const existingShipment = await db.shipment.findFirst({
        where: { id: shipmentId, companyId: companyId! },
        include: { items: true },
      });

      if (!existingShipment) {
        throw new Error("Shipment not found or unauthorized");
      }

      await db.$transaction(async (tx) => {
        // Restore inventory stock
        const warehouseId = existingShipment.originWarehouseId;
        if (warehouseId) {
          for (const item of existingShipment.items) {
            const invItem = await tx.inventory.findFirst({
              where: {
                warehouseId,
                sku: item.sku,
                companyId: companyId!,
              },
            });

            if (invItem) {
              const baseUnitQuantity = toBaseUnitQuantity(item);

              await tx.inventory.update({
                where: { id: invItem.id },
                data: {
                  allocatedQuantity: {
                    decrement: baseUnitQuantity,
                  },
                },
              });

              await tx.inventoryMovement.create({
                data: {
                  warehouseId,
                  sku: item.sku,
                  quantity: baseUnitQuantity,
                  type: "ALLOCATION_CANCEL",
                  userId,
                  companyId: companyId!,
                },
              });
            }
          }

          // Same OPEN-only rule as the update path: an in-progress/completed
          // pick is real work already done and shouldn't vanish silently.
          await tx.warehouseTask.deleteMany({
            where: {
              warehouseId,
              companyId: companyId!,
              orderRef: existingShipment.trackingId,
              status: "OPEN",
            },
          });
        }

        await tx.shipment.delete({
          where: { id: shipmentId },
        });
      });

      Promise.all([
        invalidateShipmentCache(companyId!, shipmentId),
        invalidateInventoryCache(companyId!),
      ]).catch((err) => logger.error("Cache invalidation failed:", err));
      return { success: true };
    });
  }
);
