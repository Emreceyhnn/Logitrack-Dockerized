"use server";

import { db } from "../../db";
import { checkPermission } from "../utils/checkPermission";
import { stripUndefined } from "../../utils/stripUndefined";
import { DocumentType } from "@prisma/client";
import { sendNotificationAction as createNotification } from "@/app/lib/actions/notifications";
import { authenticatedAction } from "../../auth-middleware";
import { CreateDriverFormData } from "../../type/driver";
import { controllerGuard } from "../utils/controllerGuard";
import { createDriverSchema, updateDriverSchema } from "../../validation/serverSchemas";
import { ConflictError, NotFoundError } from "../../errors";
import { driverCache } from "./shared";
import {
  computeDocumentStatus,
  withLiveDocumentStatus,
} from "../../utils/documentStatus";

/**
 * tr-belirtilen kimliğe sahip sürücünün detaylarını getirir
 * en-retrieves the details of the driver with the specified ID
 * input (user: AuthenticatedUser, driverId: string)
 * output (Promise<Driver>)
 */
export const getDriverById = authenticatedAction(
  async (user, driverId: string) => {
    return controllerGuard("getDriverById", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, [
        "role_admin",
        "role_manager",
        "role_dispatcher",
      ]);

      const foundDriver = await db.driver.findFirst({
        where: { id: driverId, companyId },
        include: {
          user: true,
          currentVehicle: true,
          company: true,
          homeBaseWarehouse: true,
          shipments: true,
          documents: true,
        },
      });

      if (!foundDriver) {
        throw new NotFoundError("Driver");
      }

      // tr-Saklı belge durumu bayat; tarihten türetilenle değiştir (bkz. documentStatus.ts)
      // en-Stored document status is stale; swap in the date-derived one
      return {
        ...foundDriver,
        documents: withLiveDocumentStatus(foundDriver.documents),
      };
    });
  }
);

/**
 * tr-sisteme yeni bir sürücü ekler
 * en-adds a new driver to the system
 * input (user: AuthenticatedUser, data: CreateDriverFormData)
 * output (Promise<{ success: boolean }>)
 */
export const createDriver = authenticatedAction(
  async (user, data: CreateDriverFormData) => {
    return controllerGuard("createDriver", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      const parsed = createDriverSchema.parse(data);

      const targetUser = await db.user.findUnique({
        where: { id: parsed.userId },
        include: { driver: true },
      });

      if (!targetUser || targetUser.companyId !== companyId) {
        throw new NotFoundError("User not found or unauthorized");
      }

      if (targetUser.driver) {
        throw new ConflictError("User is already assigned as a driver");
      }

      if (parsed.employeeId) {
        const existingEmployee = await db.driver.findFirst({
          where: { companyId, employeeId: parsed.employeeId },
        });
        if (existingEmployee) {
          throw new ConflictError("A driver with this Employee ID already exists");
        }
      }

      if (parsed.currentVehicleId) {
        const vehicle = await db.vehicle.findFirst({
          where: { id: parsed.currentVehicleId, companyId },
          include: { driver: true },
        });
        if (!vehicle || vehicle.deletedAt) {
          throw new NotFoundError("Selected vehicle");
        }
        if (vehicle.driver && vehicle.driver.userId !== parsed.userId) {
          throw new ConflictError("Vehicle is already assigned to another driver");
        }
      }

      await db.$transaction(async (tx) => {
        const finalEmployeeId =
          parsed.employeeId && parsed.employeeId.trim() !== ""
            ? parsed.employeeId
            : `EMP-${Math.random().toString(36).substring(2, 7).toLocaleUpperCase('en-US')}`;

        await tx.driver.create({
          data: stripUndefined({
            companyId: user.companyId!,
            userId: parsed.userId,
            phone: parsed.phone,
            employeeId: finalEmployeeId,
            licenseNumber: parsed.licenseNumber,
            licenseType: parsed.licenseType,
            licenseExpiry: parsed.licenseExpiry,
            status: parsed.status,
            currentVehicleId: parsed.currentVehicleId,
            homeBaseWarehouseId: parsed.homeBaseWarehouseId,
            languages: parsed.languages ?? [],
            hazmatCertified: parsed.hazmatCertified ?? false,
            safetyScore: 100,
            efficiencyScore: 100,
            rating: 5.0,
            documents: {
              create: [
                ...(parsed.licensePhotoUrl
                  ? [
                      {
                        type: DocumentType.LICENSE,
                        name: "License Scan",
                        url: parsed.licensePhotoUrl,
                        companyId,
                        // tr-Ehliyetin bitiş tarihi sürücüde zaten var; belgeye de yazılmazsa
                        //    kayıt tarihsiz kalıp süresi dolduğunda da geçerli görünürdü.
                        // en-The licence expiry already exists on the driver; without copying it
                        //    the document stays undated and reads valid even once it lapses.
                        expiryDate: parsed.licenseExpiry ?? null,
                        status: computeDocumentStatus(
                          parsed.licenseExpiry ?? null
                        ),
                      },
                    ]
                  : []),
                // tr-Sabit ACTIVE yazmak yanlıştı: geçmiş tarihli bir belge yüklendiğinde de
                //    geçerli görünüyordu. Durum tarihten hesaplanır.
                // en-Hard-coding ACTIVE was wrong: uploading an already-lapsed document still
                //    read as valid. Compute the status from the date.
                ...(parsed.documents?.map((doc) => ({
                  type: doc.type as DocumentType,
                  name: doc.name,
                  url: doc.url,
                  expiryDate: doc.expiryDate ?? null,
                  companyId: user.companyId!,
                  status: computeDocumentStatus(doc.expiryDate ?? null),
                })) ?? []),
              ],
            },
          }),
        });

        await tx.user.update({
          where: { id: parsed.userId },
          data: { roleId: "role_driver" },
        });
      });

      await driverCache.invalidate(companyId);

      // Dispatch Notification for new driver
      const driverUser = await db.user.findUnique({ where: { id: parsed.userId }, select: { name: true, surname: true } });
      await createNotification(
        { companyId },
        {
          title: "Yeni Sürücü Aramıza Katıldı! 🚛",
          message: `${driverUser?.name} ${driverUser?.surname} sisteme yeni sürücü olarak eklendi.`,
          type: "SUCCESS",
          link: `/drivers`,
        }
      );

      return { success: true };
    });
  }
);

/**
 * tr-belirtilen sürücünün bilgilerini günceller
 * en-updates the information of the specified driver
 * input (user: AuthenticatedUser, driverId: string, data: Partial<CreateDriverFormData>)
 * output (Promise<Driver>)
 */
export const updateDriver = authenticatedAction(
  async (user, driverId: string, data: Partial<CreateDriverFormData>) => {
    return controllerGuard("updateDriver", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      const parsed = updateDriverSchema.parse(data);

      const foundDriver = await db.driver.findFirst({
        where: { id: driverId, companyId },
      });

      if (!foundDriver) {
        throw new NotFoundError("Driver");
      }

      if (parsed.currentVehicleId) {
        const vehicle = await db.vehicle.findFirst({
          where: { id: parsed.currentVehicleId, companyId },
          include: { driver: true },
        });
        if (!vehicle || vehicle.deletedAt) {
          throw new NotFoundError("Selected vehicle");
        }
        if (vehicle.driver && vehicle.driver.userId !== foundDriver.userId) {
          throw new ConflictError("Vehicle is already assigned to another driver");
        }
      }

      const updatedDriver = await db.driver.update({
        where: { id: driverId },
        data: {
          // Omit undefined keys so unspecified fields are left unchanged.
          ...(parsed.phone !== undefined ? { phone: parsed.phone } : {}),
          employeeId:
            parsed.employeeId && parsed.employeeId.trim() !== ""
              ? parsed.employeeId
              : parsed.employeeId === ""
                ? `EMP-${Math.random().toString(36).substring(2, 7).toLocaleUpperCase('en-US')}`
                : foundDriver.employeeId,
          ...(parsed.licenseNumber !== undefined ? { licenseNumber: parsed.licenseNumber } : {}),
          ...(parsed.licenseType !== undefined ? { licenseType: parsed.licenseType } : {}),
          ...(parsed.licenseExpiry !== undefined ? { licenseExpiry: parsed.licenseExpiry } : {}),
          ...(parsed.status !== undefined ? { status: parsed.status } : {}),
          ...(parsed.currentVehicleId !== undefined
            ? { currentVehicleId: parsed.currentVehicleId }
            : {}),
          ...(parsed.homeBaseWarehouseId !== undefined
            ? { homeBaseWarehouseId: parsed.homeBaseWarehouseId }
            : {}),
          ...(parsed.languages !== undefined
            ? { languages: parsed.languages }
            : {}),
          ...(parsed.hazmatCertified !== undefined
            ? { hazmatCertified: parsed.hazmatCertified }
            : {}),
          ...(parsed.licensePhotoUrl
            ? {
                documents: {
                  create: [
                    {
                      type: DocumentType.LICENSE,
                      name: "License Scan",
                      url: parsed.licensePhotoUrl,
                      companyId: user.companyId!,
                      // tr-Bkz. createDriver: ehliyet bitiş tarihi belgeye de yazılır.
                      // en-See createDriver: the licence expiry is copied onto the document.
                      expiryDate:
                        parsed.licenseExpiry ?? foundDriver.licenseExpiry ?? null,
                      status: computeDocumentStatus(
                        parsed.licenseExpiry ?? foundDriver.licenseExpiry ?? null
                      ),
                    },
                  ],
                },
              }
            : {}),
          ...(parsed.documents && parsed.documents.length > 0
            ? {
                documents: {
                  create: parsed.documents.map((doc) => ({
                    type: doc.type as DocumentType,
                    name: doc.name,
                    url: doc.url,
                    expiryDate: doc.expiryDate ?? null,
                    companyId: user.companyId!,
                    // tr-Bkz. createDriver: durum tarihten hesaplanır, sabit ACTIVE değil.
                    // en-See createDriver: status comes from the date, not a hard-coded ACTIVE.
                    status: computeDocumentStatus(doc.expiryDate ?? null),
                  })),
                },
              }
            : {}),
        },
      });

      await driverCache.invalidate(companyId, driverId);
      return updatedDriver;
    });
  }
);

/**
 * tr-belirtilen sürücüyü sistemden siler (kullanıcı rolünü varsayılana çevirir)
 * en-deletes the specified driver from the system (resets user role to default)
 * input (user: AuthenticatedUser, driverId: string)
 * output (Promise<{ success: boolean }>)
 */
export const deleteDriver = authenticatedAction(
  async (user, driverId: string) => {
    return controllerGuard("deleteDriver", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      const foundDriver = await db.driver.findFirst({
        where: { id: driverId, companyId },
        select: { userId: true, companyId: true },
      });

      if (!foundDriver) {
        throw new NotFoundError("Driver");
      }

      await db.$transaction(async (tx) => {
        const defaultRole = await tx.role.findFirst({
          where: { name: { contains: "DEFAULT", mode: "insensitive" } },
        });

        await tx.driver.delete({
          where: { id: driverId },
        });

        await tx.user.update({
          where: { id: foundDriver.userId },
          data: { roleId: defaultRole?.id ?? null },
        });
      });

      await driverCache.invalidate(companyId, driverId);
      return { success: true };
    });
  }
);
