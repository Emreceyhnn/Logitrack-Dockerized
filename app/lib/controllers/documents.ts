"use server";

import { db } from "../db";
import { authenticatedAction } from "../auth-middleware";
import { checkPermission } from "./utils/checkPermission";
import { DocumentType, Prisma } from "@prisma/client";
import {
  computeDocumentStatus,
  withLiveDocumentStatus,
} from "../utils/documentStatus";
import { sendNotificationAction as createNotification } from "@/app/lib/actions/notifications";
import { driverCacheKeys, invalidatePattern, vehicleCacheKeys } from "../redis";
import { controllerGuard } from "./utils/controllerGuard";
import { NotFoundError, ValidationError } from "../errors";

/**
 * tr-sürücü veya araç için yeni bir belge oluşturur
 * en-creates a new document for a driver or a vehicle
 * input (user: AuthenticatedUser, type: DocumentType, name: string, url: string, expiryDate?: Date, driverId?: string, vehicleId?: string)
 * output (Promise<{ document: Document }>)
 */
export const createDocument = authenticatedAction(
  async (
    user,
    type: DocumentType,
    name: string,
    url: string,
    expiryDate?: Date,
    driverId?: string,
    vehicleId?: string
  ) => {
    const companyId = user?.companyId || "";
    return controllerGuard("createDocument", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      if (!driverId && !vehicleId) {
        throw new ValidationError(
          "Document must be associated with a driver or a vehicle"
        );
      }

      if (driverId) {
        const driver = await db.driver.findFirst({
          where: { id: driverId, companyId },
          select: { companyId: true },
        });
        if (!driver)
          throw new NotFoundError("Driver");
      }

      if (vehicleId) {
        const vehicle = await db.vehicle.findFirst({
          where: { id: vehicleId, companyId },
          select: { companyId: true },
        });
        if (!vehicle)
          throw new NotFoundError("Vehicle");
      }

      // tr-Aynı mantık okuma tarafında da kullanılıyor; tek kaynaktan gelsin diye ortak
      //    yardımcıya taşındı (bkz. app/lib/utils/documentStatus.ts).
      // en-The same logic runs on the read path too, so it comes from one shared helper
      //    (see app/lib/utils/documentStatus.ts).
      const docStatus = computeDocumentStatus(expiryDate ?? null);

      const newDocument = await db.document.create({
        data: {
          type,
          name,
          url,
          expiryDate: expiryDate ?? null,
          status: docStatus,
          companyId,
          driverId: driverId ?? null,
          vehicleId: vehicleId ?? null,
        },
      });
      if (vehicleId) {
        await invalidatePattern(vehicleCacheKeys.companyPattern(companyId));
      }
      if (driverId) {
        await invalidatePattern(driverCacheKeys.companyPattern(companyId));
      }

      // Dispatch Notification for expiration alerts
      if (docStatus === "EXPIRED" || docStatus === "EXPIRING_SOON") {
        await createNotification(
          { companyId },
          {
            title:
              docStatus === "EXPIRED"
                ? "Belge Süresi Dolmuş! 🚫"
                : "Belge Süresi Yaklaşıyor! ⏳",
            message: `${name} isimli belgenin durumu: ${docStatus}. Lütfen yenileyiniz.`,
            type: docStatus === "EXPIRED" ? "ERROR" : "WARNING",
            // tr-Ayrı bir "documents" sayfası yok; belgeler araç detayının bir sekmesi.
            //    Bu bildirimde araç kimliği bağlamı bulunmadığı için araç listesine gider.
            // en-There is no standalone "documents" page; documents are a tab inside the
            //    vehicle detail dialog. This notification has no vehicle id in scope, so it
            //    lands on the vehicle list instead.
            link: "/vehicle",
          }
        );
      }

      return { document: newDocument };
    });
  }
);

/**
 * tr-şirkete ait tüm belgeleri getirir, istenirse araç veya sürücüye göre filtrelenir
 * en-retrieves all documents belonging to the company, optionally filtered by vehicle or driver
 * input (user: AuthenticatedUser, entityType?: "driver" | "vehicle", entityId?: string)
 * output (Promise<Document[]>)
 */
export const getDocuments = authenticatedAction(
  async (user, entityType?: "driver" | "vehicle", entityId?: string) => {
    const companyId = user?.companyId || "";
    return controllerGuard("getDocuments", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const whereClause: Prisma.DocumentWhereInput = { companyId };

      if (entityType === "driver" && entityId) {
        whereClause.driverId = entityId;
      } else if (entityType === "vehicle" && entityId) {
        whereClause.vehicleId = entityId;
      }

      const documents = await db.document.findMany({
        where: whereClause,
        include: {
          driver: {
            select: { user: { select: { name: true, surname: true } } },
          },
          vehicle: { select: { plate: true, brand: true, model: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      // tr-Saklı durum yalnızca oluşturmada yazılır; okurken tarihten yeniden türetilir,
      //    aksi halde süresi dolmuş bir belge ACTIVE görünmeye devam eder.
      // en-The stored status is only written at creation; re-derive it on read, otherwise a
      //    lapsed document keeps reporting ACTIVE.
      return withLiveDocumentStatus(documents);
    });
  }
);

/**
 * tr-belirtilen kimliğe sahip belgeyi getirir
 * en-retrieves the document with the specified ID
 * input (user: AuthenticatedUser, documentId: string)
 * output (Promise<Document>)
 */
export const getDocumentById = authenticatedAction(
  async (user, documentId: string) => {
    const companyId = user?.companyId || "";
    return controllerGuard("getDocumentById", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);
      const document = await db.document.findFirst({
        where: { id: documentId, companyId },
        include: {
          driver: true,
          vehicle: true,
        },
      });

      if (!document) throw new NotFoundError("Document");

      // tr-Bkz. getDocuments: saklı durum bayat, tarihten türetiliyor.
      // en-See getDocuments: the stored status is stale, so derive it from the date.
      return { ...document, status: computeDocumentStatus(document.expiryDate) };
    });
  }
);

/**
 * tr-belirtilen belgeyi siler
 * en-deletes the specified document
 * input (user: AuthenticatedUser, documentId: string)
 * output (Promise<{ success: boolean }>)
 */
export const deleteDocument = authenticatedAction(
  async (user, documentId: string) => {
    const companyId = user?.companyId || "";
    return controllerGuard("deleteDocument", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);
      const existingDocument = await db.document.findFirst({
        where: { id: documentId, companyId },
        select: { companyId: true, vehicleId: true, driverId: true },
      });

      if (!existingDocument?.companyId) throw new NotFoundError("Document");

      await checkPermission(user, existingDocument.companyId, [
        "role_admin",
        "role_manager",
      ]);

      await db.document.delete({
        where: { id: documentId },
      });

      if (existingDocument.vehicleId) {
        await invalidatePattern(
          vehicleCacheKeys.companyPattern(existingDocument.companyId)
        );
      }
      if (existingDocument.driverId) {
        await invalidatePattern(
          driverCacheKeys.companyPattern(existingDocument.companyId)
        );
      }

      return { success: true };
    });
  }
);

/**
 * tr-süresi dolmak üzere olan belgeleri getirir
 * en-retrieves documents that are expiring soon
 * input (user: AuthenticatedUser, daysThreshold?: number)
 * output (Promise<Document[]>)
 */
export const getExpiringDocuments = authenticatedAction(
  async (user, daysThreshold: number = 30) => {
    const companyId = user?.companyId || "";
    return controllerGuard("getExpiringDocuments", async () => {
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

      const expiringDocuments = await db.document.findMany({
        where: {
          companyId,
          expiryDate: {
            lte: thresholdDate,
            gte: new Date(),
          },
        },
        include: {
          driver: {
            select: { user: { select: { name: true, surname: true } } },
          },
          vehicle: { select: { plate: true } },
        },
        orderBy: { expiryDate: "asc" },
      });

      return expiringDocuments;
    });
  }
);
