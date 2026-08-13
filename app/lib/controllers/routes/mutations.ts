"use server";

import { type Prisma } from "@prisma/client";
import { sendNotificationAction as createNotification } from "@/app/lib/actions/notifications";
import { db } from "../../db";
import { stripUndefined } from "../../utils/stripUndefined";
import { authenticatedAction } from "../../auth-middleware";
import { checkPermission } from "../utils/checkPermission";
import { invalidateShipmentCache } from "../shipments/cache";
import {
  assertDriverAvailableForRoute,
  assertVehicleAvailableForRoute,
} from "../utils/assignmentGuards";
import { assertShipmentTransition } from "../utils/shipmentTransitions";
import { invalidateRouteCache } from "./cache";
import type { RouteUpdateData } from "./types";
import { controllerGuard } from "../utils/controllerGuard";
import { NotFoundError } from "../../errors";
import { isValidBufferMeters } from "../../type/routeDeviation";

/**
 * tr-yeni bir rota oluşturur ve atanmışsa araç/sürücü/sevkiyat işlemlerini yapar
 * en-creates a new route and processes vehicle/driver/shipment assignments if provided
 * input (user: AuthenticatedUser, name: string, date: Date, startTime: Date, endTime: Date, distanceKm: number, durationMin: number, driverId: string, vehicleId: string, shipmentId?: string, stops?: object[], shape?: string, bufferMeters?: number)
 * output (Promise<{ route: object }>)
 */
export const createRoute = authenticatedAction(
  async (
    user,
    name: string,
    date: Date,
    startTime: Date,
    endTime: Date,
    distanceKm: number,
    durationMin: number,
    driverId: string,
    vehicleId: string,
    shipmentId?: string,
    stops?: { address: string; lat?: number | undefined; lng?: number | undefined }[],
    shape?: string,
    bufferMeters?: number
  ) => {
    return controllerGuard("createRoute", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const finalName =
        name && name.trim() !== ""
          ? name
          : `ROUTE-${Math.random().toString(36).substring(2, 7).toLocaleUpperCase('en-US')}`;

      // The client's Yup schema also checks this, but a server action is a
      // public entry point: an out-of-range corridor would silently disable or
      // spam deviation alerts, so re-validate rather than trust the caller.
      if (bufferMeters !== undefined && !isValidBufferMeters(bufferMeters)) {
        throw new Error("Invalid route buffer");
      }

      const existingRoute = await db.route.findFirst({
        where: { name: finalName, companyId },
      });

      if (existingRoute && name && name.trim() !== "") {
        throw new Error("Route name already exists");
      }

      if (driverId) {
        await assertDriverAvailableForRoute(db, { driverId, companyId, date });
      }
      if (vehicleId) {
        await assertVehicleAvailableForRoute(db, {
          vehicleId,
          companyId,
          date,
        });
      }

      let shipmentToAssign: {
        status: import("@prisma/client").ShipmentStatus;
        weightKg: number | null;
        volumeM3: number | null;
      } | null = null;
      if (shipmentId) {
        shipmentToAssign = await db.shipment.findFirst({
          where: { id: shipmentId, companyId },
          select: { status: true, weightKg: true, volumeM3: true },
        });
        if (!shipmentToAssign) {
          throw new NotFoundError("Shipment");
        }
        assertShipmentTransition(shipmentToAssign.status, "ASSIGNED");

        if (vehicleId) {
          const vehicle = await db.vehicle.findFirst({
            where: { id: vehicleId, companyId },
            select: {
              fleetNo: true,
              maxLoadKg: true,
              currentTrailer: { select: { maxLoadKg: true } },
            },
          });
          const maxWeight =
            (vehicle?.maxLoadKg || 0) +
            (vehicle?.currentTrailer?.maxLoadKg || 0);
          if (vehicle && (shipmentToAssign.weightKg || 0) > maxWeight + 0.01) {
            throw new Error(
              `Vehicle capacity exceeded: shipment weight ${shipmentToAssign.weightKg}kg > max ${maxWeight}kg (vehicle ${vehicle.fleetNo})`
            );
          }
        }
      }

      const newRoute = await db.$transaction(async (tx) => {
        const route = await tx.route.create({
          data: {
            name: finalName,
            date,
            startTime,
            endTime,
            distanceKm,
            durationMin,
            driverId: driverId || null,
            vehicleId: vehicleId || null,
            companyId,
            shape: shape || null,
            bufferMeters: bufferMeters ?? null,
            stops: {
              create: (stops ?? []).map((stop, index) => ({
                companyId,
                sequence: index,
                address: stop.address,
                lat: stop.lat ?? null,
                lng: stop.lng ?? null,
              })),
            },
          },
        });

        if (driverId && vehicleId) {
          await tx.driver.update({
            where: { id: driverId },
            data: { currentVehicleId: vehicleId },
          });
        }

        if (shipmentId) {
          await tx.shipment.update({
            where: { id: shipmentId },
            data: {
              routeId: route.id,
              status: "ASSIGNED",
              history: {
                create: {
                  status: "ASSIGNED",
                  companyId,
                  description: `Assigned to route: ${finalName}`,
                  createdById: user.id,
                },
              },
            },
          });
        }

        return route;
      });

      await Promise.all([
        invalidateRouteCache(companyId),
        shipmentId ? invalidateShipmentCache(companyId, shipmentId) : Promise.resolve(),
      ]);

      // tr-Rotaya bir sürücü atandıysa doğrudan kendisine de bildirilir: aşağıdaki şirket
      //    geneli duyuru ofisi haberdar eder ama rotayı sürecek kişiye ulaşmaz.
      // en-When the route has a driver, notify them directly: the company-wide announcement
      //    below informs the office but never reaches the person who has to drive it.
      if (driverId) {
        const routeDriver = await db.driver.findFirst({
          where: { id: driverId, companyId },
          select: { userId: true },
        });

        if (routeDriver?.userId) {
          await createNotification(
            { userId: routeDriver.userId, companyId },
            {
              title: "Yeni Rota Atandı 🗺️",
              message: `${finalName} numaralı rota size atandı.`,
              type: "SUCCESS",
              category: "NEW_ASSIGNMENT",
              link: `/routes`,
            }
          );
        }
      }

      await createNotification(
        { companyId },
        {
          title: "Yeni Rota Planlandı 📋",
          message: `${finalName} numaralı yeni bir rota planlandı. Sürücü: ${driverId ? 'Atandı' : 'Bekleniyor'}.`,
          type: "SUCCESS",
          category: "NEW_ASSIGNMENT",
          link: `/routes`,
        }
      );

      return { route: newRoute };
    });
  }
);

/**
 * tr-mevcut bir rotanın bilgilerini günceller
 * en-updates the information of an existing route
 * input (user: AuthenticatedUser, routeId: string, data: RouteUpdateData)
 * output (Promise<Route>)
 */
export const updateRoute = authenticatedAction(
  async (user, routeId: string, data: RouteUpdateData) => {
    return controllerGuard("updateRoute", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const existingRoute = await db.route.findFirst({
        where: { id: routeId, companyId },
      });

      if (!existingRoute) {
        throw new NotFoundError("Route");
      }

      // Same reasoning as createRoute: null clears the override back to the
      // default, but a supplied number must be in range.
      if (
        data.bufferMeters !== undefined &&
        data.bufferMeters !== null &&
        !isValidBufferMeters(data.bufferMeters)
      ) {
        throw new Error("Invalid route buffer");
      }

      const { stops, ...scalarData } = data;
      const updateData: Prisma.RouteUncheckedUpdateInput = stripUndefined(scalarData);
      // companyId must never come from client input â€” RouteUpdateData doesn't
      // declare it, but a caller bypassing the TS type at runtime could still
      // smuggle it in; strip defensively so a route can't be reassigned
      // to a company the caller doesn't belong to.
      delete (updateData as Record<string, unknown>).companyId;
      if (updateData.name === "") {
        updateData.name = `ROUTE-${Math.random().toString(36).substring(2, 7).toLocaleUpperCase('en-US')}`;
      }
      if (stops) {
        updateData.stops = {
          deleteMany: {},
          create: stops.map((stop, index) => ({
            companyId,
            sequence: index,
            address: stop.address,
            lat: stop.lat ?? null,
            lng: stop.lng ?? null,
          })),
        };
      }

      const updatedRoute = await db.route.update({
        where: { id: routeId },
        data: updateData,
      });

      await invalidateRouteCache(companyId, routeId);
      return updatedRoute;
    });
  }
);

/**
 * tr-belirtilen rotayı siler
 * en-deletes the specified route
 * input (user: AuthenticatedUser, routeId: string)
 * output (Promise<{ success: boolean }>)
 */
export const deleteRoute = authenticatedAction(
  async (user, routeId: string) => {
    return controllerGuard("deleteRoute", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const existingRoute = await db.route.findFirst({
        where: { id: routeId, companyId },
        include: { shipments: { select: { id: true, status: true } } },
      });

      if (!existingRoute) {
        throw new NotFoundError("Route");
      }

      // shipments.routeId is a Restrict FK — deleting the route with linked
      // shipments still attached would 500 on the DB constraint. Release them
      // first: a shipment mid-lifecycle (not yet delivered/returned/cancelled)
      // goes back to the unassigned PENDING pool per the same "route canceled"
      // transition the status-update path already allows (see
      // shipmentTransitions.ts); a terminal shipment just loses the now-gone
      // route reference without its (already-final) status being touched.
      await db.$transaction(async (tx) => {
        for (const shipment of existingRoute.shipments) {
          const isTerminal = ["DELIVERED", "RETURNED", "CANCELLED"].includes(
            shipment.status
          );
          await tx.shipment.update({
            where: { id: shipment.id },
            data: isTerminal
              ? { routeId: null }
              : { routeId: null, status: "PENDING" },
          });
        }
        await tx.route.delete({ where: { id: routeId } });
      });

      await Promise.all([
        invalidateRouteCache(companyId, routeId),
        invalidateShipmentCache(companyId),
      ]);
      return { success: true };
    });
  }
);
