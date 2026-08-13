"use server";

import { type Prisma, RouteStatus } from "@prisma/client";
import { sendNotificationAction as createNotification } from "@/app/lib/actions/notifications";
import { db } from "../../db";
import { authenticatedAction } from "../../auth-middleware";
import { checkPermission } from "../utils/checkPermission";
import { isTerminalShipmentStatus } from "../utils/shipmentTransitions";
import { invalidateRouteCache } from "./cache";
import { ROUTE_TRANSITIONS } from "./types";
import { controllerGuard } from "../utils/controllerGuard";

/**
 * tr-belirtilen rotanın durumunu günceller ve ilgili sevkiyat, araç ve sürücü durumlarını eşzamanlı olarak değiştirir
 * en-updates the status of the specified route and simultaneously changes related shipment, vehicle, and driver statuses
 * input (user: AuthenticatedUser, routeId: string, status: RouteStatus)
 * output (Promise<Route>)
 */
export const updateRouteStatus = authenticatedAction(
  async (user, routeId: string, status: RouteStatus) => {
    const userId = user?.id;
    const companyId = user?.companyId || "";
    return controllerGuard("updateRouteStatus", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const route = await db.route.findFirst({
        where: { id: routeId, companyId },
        include: { shipments: true, stops: { orderBy: { sequence: "asc" } } },
      });

      if (!route) {
        throw new Error("Route not found or unauthorized");
      }

      if (route.status === status) {
        return route;
      }

      if (!ROUTE_TRANSITIONS[route.status].includes(status)) {
        throw new Error(
          `Invalid route status transition: ${route.status} -> ${status}`
        );
      }

      // Only shipments still in an active lifecycle state follow the route's
      // bulk transitions; DELIVERED / FAILED / RETURNED / CANCELLED keep their
      // individually recorded outcome.
      const activeShipments = route.shipments.filter(
        (s) =>
          !isTerminalShipmentStatus(s.status) && s.status !== "FAILED"
      );
      const activeShipmentIds = activeShipments.map((s) => s.id);

      const updatedRoute = await db.$transaction(async (tx) => {
        const updateData: Prisma.RouteUpdateInput = { status };

        if (status === "ACTIVE" && !route.startTime) {
          updateData.startTime = new Date();
        } else if (status === "COMPLETED") {
          updateData.endTime = new Date();
        }

        const newRoute = await tx.route.update({
          where: { id: routeId },
          data: updateData,
        });

        // side-effects based on target status
        if (status === "ACTIVE") {
          // Vehicle to ON_TRIP, Driver to ON_JOB, Shipments to IN_TRANSIT
          if (route.vehicleId) {
            await tx.vehicle.update({
              where: { id: route.vehicleId },
              data: { status: "ON_TRIP" },
            });
          }
          if (route.driverId) {
            await tx.driver.update({
              where: { id: route.driverId },
              data: { status: "ON_JOB" },
            });
          }
            if (activeShipmentIds.length > 0) {
              await tx.shipment.updateMany({
                where: { id: { in: activeShipmentIds } },
                data: { status: "IN_TRANSIT" },
              });
              for (const shipment of activeShipments) {
                await tx.shipmentHistory.create({
                  data: {
                    shipmentId: shipment.id,
                    companyId,
                    status: "IN_TRANSIT",
                    description: "Route started - Shipment in transit",
                    createdById: userId || null,
                  },
                });
              }
            }

            // Dispatch Notification
            await createNotification(
              { companyId: companyId! },
              {
                title: "Rota Başlatıldı 🚛",
                message: `${route.name || route.id} numaralı rota şu an aktif durumda. Araç yola çıktı.`,
                type: "SUCCESS",
                link: `/routes`,
              }
            );
        } else if (status === "COMPLETED") {
          // Vehicle to AVAILABLE, Driver to OFF_DUTY, Shipments to DELIVERED
          if (route.vehicleId) {
            await tx.vehicle.update({
              where: { id: route.vehicleId },
              data: { status: "AVAILABLE" },
            });
          }
          if (route.driverId) {
            await tx.driver.update({
              where: { id: route.driverId },
              data: { status: "OFF_DUTY" },
            });
          }
            if (activeShipmentIds.length > 0) {
              await tx.shipment.updateMany({
                where: { id: { in: activeShipmentIds } },
                data: { status: "DELIVERED" },
              });
              for (const shipment of activeShipments) {
                await tx.shipmentHistory.create({
                  data: {
                    shipmentId: shipment.id,
                    companyId,
                    status: "DELIVERED",
                    location: route.stops[route.stops.length - 1]?.address || "Destination",
                    description: "Route completed - Shipment completed",
                    createdById: userId || null,
                  },
                });
              }
            }

            const failedCount = route.shipments.filter(
              (s) => s.status === "FAILED"
            ).length;

            // Dispatch Notification
            await createNotification(
              { companyId: companyId! },
              {
                title: "Rota Tamamlandı ✅",
                message:
                  failedCount > 0
                    ? `${route.name || route.id} numaralı rota tamamlandı. ${activeShipmentIds.length} sevkiyat teslim edildi, ${failedCount} sevkiyat teslim edilemedi.`
                    : `${route.name || route.id} numaralı rota başarıyla tamamlandı. Tüm sevkiyatlar teslim edildi.`,
                type: failedCount > 0 ? "WARNING" : "SUCCESS",
                link: `/routes`,
              }
            );
        } else if (status === "CANCELED") {
          // Vehicle to AVAILABLE, Driver to OFF_DUTY
          if (route.vehicleId) {
            await tx.vehicle.update({
              where: { id: route.vehicleId },
              data: { status: "AVAILABLE" },
            });
          }
          if (route.driverId) {
            await tx.driver.update({
              where: { id: route.driverId },
              data: { status: "OFF_DUTY" },
            });
          }
            if (activeShipmentIds.length > 0) {
              await tx.shipment.updateMany({
                where: { id: { in: activeShipmentIds } },
                data: { status: "PENDING" }, // revert to pending
              });
              for (const shipment of activeShipments) {
                await tx.shipmentHistory.create({
                  data: {
                    shipmentId: shipment.id,
                    companyId,
                    status: "PENDING",
                    description: "Route canceled - Shipment reverted to pending",
                    createdById: userId || null,
                  },
                });
              }
            }

            // Dispatch Notification
            await createNotification(
              { companyId: companyId! },
              {
                title: "Rota İptal Edildi ⚠️",
                message: `${route.name || route.id} numaralı rota iptal edildi. Araç müsait durumuna çekildi.`,
                type: "WARNING",
                link: `/routes`,
              }
            );
        }

        return newRoute;
      });

      await invalidateRouteCache(companyId!, routeId);
      return updatedRoute;
    });
  }
);
