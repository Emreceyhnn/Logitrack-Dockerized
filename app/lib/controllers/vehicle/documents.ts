"use server";

import { db } from "../../db";
import { DocumentType, DocumentStatus } from "@prisma/client";
import { sendNotificationAction as createNotification } from "@/app/lib/actions/notifications";
import { checkPermission } from "../utils/checkPermission";
import { authenticatedAction } from "../../auth-middleware";
import { invalidateVehicleCache } from "./cache";
import { controllerGuard } from "../utils/controllerGuard";
import { computeDocumentStatus } from "../../utils/documentStatus";

/**
 * tr-araca ait yeni bir belge yükler; belgenin süresi dolmuş veya yaklaşıyorsa bildirim gönderir
 * en-uploads a new document for the vehicle; sends notifications if the document is expired or expiring soon
 * input (user: AuthenticatedUser, vehicleId: string, documentData: object)
 * output (Promise<Document>)
 */
export const uploadVehicleDocument = authenticatedAction(
  async (
    user,
    vehicleId: string,
    documentData: {
      type: DocumentType;
      name: string;
      url: string;
      expiryDate?: Date | undefined;
      status: DocumentStatus;
    }
  ) => {
    const companyId = user?.companyId || "";
    return controllerGuard("uploadVehicleDocument", async () => {
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      const foundVehicle = await db.vehicle.findFirst({
        where: { id: vehicleId, companyId },
        select: { companyId: true },
      });

      if (!foundVehicle) {
        throw new Error("Vehicle not found or unauthorized");
      }

      const doc = await db.document.create({
        data: {
          vehicleId,
          companyId,
          ...documentData,
          expiryDate: documentData.expiryDate ?? null,
          // tr-Durum istemciden geliyordu; tarihle çelişen bir değer gönderilebiliyordu
          //    (ör. süresi dolmuş belge için ACTIVE). Sunucuda tarihten hesaplanır.
          // en-Status came from the client, which could contradict the date (e.g. ACTIVE for
          //    an already-lapsed document). Compute it server-side from the date instead.
          status: computeDocumentStatus(documentData.expiryDate ?? null),
        },
      });

      // Dispatch Notification if document is expired or expiring soon
      const now = new Date();
      const oneMonthLater = new Date();
      oneMonthLater.setMonth(now.getMonth() + 1);

      if (documentData.expiryDate) {
        const expiry = new Date(documentData.expiryDate);
        if (expiry < now) {
          await createNotification(
            { companyId: companyId! },
            {
              title: "Kritik Belge Uyarısı! 🚫",
              message: `${documentData.name} belgesinin süresi dolmuş! Hemen yenileyiniz.`,
              type: "ERROR",
              category: "MAINTENANCE_ALERT",
              link: `/vehicle?id=${vehicleId}`,
            }
          );
        } else if (expiry <= oneMonthLater) {
          await createNotification(
            { companyId: companyId! },
            {
              title: "Belge Süresi Yaklaşıyor ⏳",
              message: `${documentData.name} belgesinin süresi 1 ay içinde dolacak.`,
              type: "WARNING",
              link: `/vehicle?id=${vehicleId}`,
            }
          );
        }
      }

      await invalidateVehicleCache(companyId, vehicleId);
      return doc;
    });
  }
);
