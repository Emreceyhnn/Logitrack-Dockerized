"use server";

import { db } from "../../db";
import { authenticatedAction } from "../../auth-middleware";
import { checkPermission } from "../utils/checkPermission";
import { ShipmentStatus } from "@prisma/client";
import { sendNotificationAction as createNotification } from "@/app/lib/actions/notifications";
import { assertShipmentTransition } from "../utils/shipmentTransitions";
import { assertRouteCapacity } from "../utils/routeCapacity";
import { invalidateShipmentCache } from "./cache";
import { controllerGuard } from "../utils/controllerGuard";

/**
 * tr-belirtilen sevkiyata bir sürücü atar ve durumunu günceller
 * en-assigns a driver to the specified shipment and updates its status
 * input (user: AuthenticatedUser, shipmentId: string, driverId: string)
 * output (Promise<Shipment>)
 */
export const assignDriverToShipment = authenticatedAction(
  async (user, shipmentId: string, driverId: string) => {
    const userId = user?.id;
    const companyId = user?.companyId;
    return controllerGuard("assignDriverToShipment", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const existingShipment = await db.shipment.findFirst({
        where: { id: shipmentId, companyId: companyId! },
        select: { companyId: true, status: true },
      });

      if (!existingShipment) {
        throw new Error("Shipment not found or unauthorized");
      }

      assertShipmentTransition(
        existingShipment.status,
        ShipmentStatus.ASSIGNED
      );

      const driver = await db.driver.findFirst({
        where: { id: driverId, companyId: companyId! },
        select: { status: true, userId: true },
      });
      if (!driver) {
        throw new Error("Driver not found or unauthorized");
      }
      if (driver.status === "ON_LEAVE") {
        throw new Error("Driver is on leave and cannot be assigned");
      }

      const updatedShipment = await db.shipment.update({
        where: { id: shipmentId },
        data: {
          driverId,
          status: ShipmentStatus.ASSIGNED,
          history: {
            create: {
              status: ShipmentStatus.ASSIGNED,
              companyId: companyId!,
              description: `Driver assigned`,
              createdById: userId,
            },
          },
        },
      });

      await invalidateShipmentCache(companyId!, shipmentId);

      // tr-Sürücüye doğrudan bildirim: şirket geneline giden duyuru ofisi haberdar eder ama
      //    işi asıl yapacak kişiye ulaşmaz. Ayrı bir hedefli bildirim, sürücünün kendi
      //    tercihlerine göre e-posta da almasını sağlar (uygulamayı açmasa bile).
      // en-Notify the driver directly: the company-wide announcement below informs the office
      //    but never reaches the person who has to do the work. A separately targeted
      //    notification also earns them an email under their own preferences, so the
      //    assignment lands even if they never open the app.
      if (driver.userId) {
        await createNotification(
          { userId: driver.userId, companyId: companyId! },
          {
            title: "Yeni Sevkiyat Atandı 📦",
            message: `${updatedShipment.trackingId} numaralı sevkiyat size atandı.`,
            type: "SUCCESS",
            category: "NEW_ASSIGNMENT",
            link: `/shipments?id=${updatedShipment.id}`,
          }
        );
      }

      // Dispatch Notification
      await createNotification(
        { companyId: companyId! },
        {
          title: "Sürücü Atandı 👤",
          message: `${updatedShipment.trackingId} numaralı sevkiyata bir sürücü atandı.`,
          type: "SUCCESS",
          category: "NEW_ASSIGNMENT",
          link: `/shipments?id=${updatedShipment.id}`,
        }
      );

      return updatedShipment;
    });
  }
);

/**
 * tr-belirtilen sevkiyatı bir rotaya atar ve rota kapasite kontrollerini yapar
 * en-assigns the specified shipment to a route and performs route capacity checks
 * input (user: AuthenticatedUser, shipmentId: string, routeId: string)
 * output (Promise<Shipment>)
 */
export const assignRouteToShipment = authenticatedAction(
  async (user, shipmentId: string, routeId: string) => {
    const userId = user?.id;
    const companyId = user?.companyId;
    return controllerGuard("assignRouteToShipment", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const existingShipment = await db.shipment.findFirst({
        where: { id: shipmentId, companyId: companyId! },
        select: {
          companyId: true,
          status: true,
          weightKg: true,
          volumeM3: true,
        },
      });

      if (!existingShipment) {
        throw new Error("Shipment not found or unauthorized");
      }

      assertShipmentTransition(
        existingShipment.status,
        ShipmentStatus.ASSIGNED
      );
      await assertRouteCapacity(
        db,
        routeId,
        companyId!,
        {
          weightKg: existingShipment.weightKg,
          volumeM3: existingShipment.volumeM3,
        },
        shipmentId
      );

      const updatedShipment = await db.shipment.update({
        where: { id: shipmentId },
        data: {
          routeId,
          status: ShipmentStatus.ASSIGNED,
          history: {
            create: {
              status: ShipmentStatus.ASSIGNED,
              companyId: companyId!,
              description: `Route assigned`,
              createdById: userId,
            },
          },
        },
      });

      await invalidateShipmentCache(companyId!, shipmentId);

      // Dispatch Notification
      await createNotification(
        { companyId: companyId! },
        {
          title: "Rota Planlandı 🚛",
          message: `${updatedShipment.trackingId} numaralı sevkiyat bir rotaya dahil edildi.`,
          type: "SUCCESS",
          category: "NEW_ASSIGNMENT",
          link: `/shipments?id=${updatedShipment.id}`,
        }
      );

      return updatedShipment;
    });
  }
);

/**
 * tr-sevkiyat durumunu ve konum bilgisini günceller; duruma göre bildirim gönderir
 * en-updates shipment status and location info; sends notifications based on the status
 * input (user: AuthenticatedUser, shipmentId: string, status: ShipmentStatus, location?: string, description?: string)
 * output (Promise<Shipment>)
 */
export const updateShipmentStatus = authenticatedAction(
  async (
    user,
    shipmentId: string,
    status: ShipmentStatus,
    location?: string,
    description?: string
  ) => {
    const userId = user?.id;
    const companyId = user?.companyId;
    return controllerGuard("updateShipmentStatus", async () => {
      await checkPermission(user, companyId);

      const existingShipment = await db.shipment.findFirst({
        where: { id: shipmentId, companyId: companyId! },
        select: { companyId: true, status: true },
      });

      if (!existingShipment) {
        throw new Error("Shipment not found or unauthorized");
      }

      assertShipmentTransition(existingShipment.status, status);
      if (existingShipment.status === status) {
        return db.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
      }
      if (status === ShipmentStatus.FAILED && !description?.trim()) {
        throw new Error(
          "A failure reason (description) is required when marking a shipment as FAILED"
        );
      }

      const updatedShipment = await db.shipment.update({
        where: { id: shipmentId },
        data: {
          status,
          history: {
            create: {
              status,
              companyId: companyId!,
              location: location ?? null,
              description: description || `Status updated to ${status}`,
              createdById: userId,
            },
          },
        },
      });

      await invalidateShipmentCache(companyId!, shipmentId);

      // Dispatch Notification for critical status changes
      if (
        status === ShipmentStatus.DELAYED ||
        status === ShipmentStatus.CANCELLED
      ) {
        await createNotification(
          { companyId: companyId! },
          {
            title:
              status === ShipmentStatus.DELAYED
                ? "Sevkiyat Gecikmesi ⚠️"
                : "Sevkiyat İptal Edildi ❌",
            message: `${updatedShipment.trackingId} numaralı sevkiyatın durumu ${status === ShipmentStatus.DELAYED ? "GECİKMİŞ" : "İPTAL EDİLDİ"} olarak güncellendi.`,
            type: status === ShipmentStatus.DELAYED ? "WARNING" : "ERROR",
            category:
              status === ShipmentStatus.DELAYED
                ? "DELAY_ALERT"
                : "SHIPMENT_UPDATE",
            link: `/shipments?id=${updatedShipment.id}`,
          }
        );
      } else if (status === ShipmentStatus.DELIVERED) {
        await createNotification(
          { companyId: companyId! },
          {
            title: "Sevkiyat Teslim Edildi ✅",
            message: `${updatedShipment.trackingId} numaralı sevkiyat başarıyla teslim edildi.`,
            type: "SUCCESS",
            category: "SHIPMENT_UPDATE",
            link: `/shipments?id=${updatedShipment.id}`,
          }
        );
      } else if (
        status === ShipmentStatus.PROCESSING ||
        status === ShipmentStatus.IN_TRANSIT
      ) {
        await createNotification(
          { companyId: companyId! },
          {
            title:
              status === ShipmentStatus.PROCESSING
                ? "Sevkiyat Hazırlanıyor ⚙️"
                : "Sevkiyat Yola Çıktı 🚚",
            message: `${updatedShipment.trackingId} numaralı sevkiyat ${status === ShipmentStatus.PROCESSING ? "işleme alındı" : "yola çıktı"}.`,
            type: "INFO",
            category: "SHIPMENT_UPDATE",
            link: `/shipments?id=${updatedShipment.id}`,
          }
        );
      }

      return updatedShipment;
    });
  }
);
