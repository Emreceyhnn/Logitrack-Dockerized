"use server";

import { db } from "../../db";
import { checkPermission } from "../utils/checkPermission";
import { authenticatedAction } from "../../auth-middleware";
import { UserStatus } from "@prisma/client";
import { invalidatePattern, driverCacheKeys } from "../../redis";
import { invalidateCompanyCache, ensureStandardRoles } from "./shared";
import { invalidateWarehouseCache } from "../warehouse/cache";
import { controllerGuard } from "../utils/controllerGuard";
import { revokeAllUserSessions, invalidateUserSessionCache } from "../session/manage";
import { sendCompanyWelcomeEmail } from "../../services/email";
import { logger } from "../../logger";

/**
 * tr-belirtilen kullanıcıyı şirketten çıkarır
 * en-removes the specified user from the company
 * input (user: AuthenticatedUser, targetUserId: string)
 * output (Promise<User>)
 */
export const removeCompanyUser = authenticatedAction(
  async (user, targetUserId: string) => {
    const companyId = user?.companyId || "";

    return controllerGuard("removeCompanyUser", async () => {
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      const targetUser = await db.user.findUnique({ where: { id: targetUserId } });
      if (!targetUser || targetUser.companyId !== companyId) {
        throw new Error("Unauthorized: User not found or not in your company");
      }

      // tr-Ayrılan kullanıcının hangi depoları yönettiğini, çıkarmadan ÖNCE topla:
      //    bağı kopardıktan sonra bu depoları tekrar bulmanın bir yolu kalmaz ve
      //    önbellekleri bayat "yönetici" adıyla asılı kalır.
      // en-Collect the warehouses this user manages BEFORE detaching: once the link is
      //    cut there is no way to find them again, and their caches would stay pinned
      //    to a stale manager name.
      const managedWarehouses = await db.warehouse.findMany({
        where: { managerId: targetUserId, companyId },
        select: { id: true },
      });

      // tr-Şirketten çıkarmak, kullanıcı kaydını nullamaktan ibaret değildir: kişi
      //    şirkete ait her atamadan da düşmelidir. Aksi halde depo yöneticisi,
      //    görev sorumlusu veya sürücü olarak — artık erişimi olmadığı halde —
      //    ekranlarda görünmeye devam eder. Hepsi tek transaction'da yapılır ki
      //    yarıda kalan bir hata kullanıcıyı şirketsiz ama hâlâ atanmış bırakmasın.
      // en-Removing someone from a company is more than nulling their user row: they must
      //    also drop off every company-scoped assignment. Otherwise they keep showing up
      //    as a warehouse manager, task assignee, or driver long after their access is
      //    gone. All of it runs in one transaction so a mid-way failure cannot leave the
      //    user company-less but still assigned.
      const updatedUser = await db.$transaction(async (tx) => {
        // tr-Yönettiği depolar "atanmamış"a döner
        // en-Warehouses they managed fall back to unassigned
        await tx.warehouse.updateMany({
          where: { managerId: targetUserId, companyId },
          data: { managerId: null },
        });

        // tr-Bitmemiş depo görevleri havuza geri döner; tamamlanmış görevler tarihsel
        //    kayıt olduğu için kime ait olduğunu korur.
        // en-Unfinished warehouse tasks return to the pool; completed ones keep their
        //    assignee because they are historical record.
        await tx.warehouseTask.updateMany({
          where: {
            assignedToId: targetUserId,
            companyId,
            status: { in: ["OPEN", "IN_PROGRESS"] },
          },
          data: { assignedToId: null },
        });

        // tr-Sürücü kaydı yumuşak silinir: sefer ve yakıt geçmişi ona bağlı kaldığı
        //    için kayıt tamamen kaldırılamaz, ama aktif listelerden düşmeli ve
        //    üstündeki araç serbest bırakılmalı.
        // en-Soft-delete the driver record: route and fuel history hang off it so it
        //    cannot be dropped outright, but it must leave the active lists and release
        //    whatever vehicle it was holding.
        await tx.driver.updateMany({
          where: { userId: targetUserId, companyId, deletedAt: null },
          data: {
            deletedAt: new Date(),
            status: "OFF_DUTY",
            currentVehicleId: null,
            homeBaseWarehouseId: null,
          },
        });

        // tr-Bekleyen katılma talebi varsa, kullanıcı zaten çıkarıldığı için
        //    yeniden kabul edilmeyi bekleyen bir istek olarak asılı kalmamalı.
        // en-Any pending join request must not linger as an open invitation to re-admit
        //    someone who was just removed.
        await tx.joinRequest.updateMany({
          where: { userId: targetUserId, companyId, status: "PENDING" },
          data: { status: "REJECTED", decidedById: user.id, decidedAt: new Date() },
        });

        return tx.user.update({
          where: { id: targetUserId },
          data: {
            companyId: null,
            roleId: null,
            assignedWarehouseId: null,
          },
        });
      });

      await invalidateCompanyCache(companyId);
      // tr-Etkilenen her depo ayrı ayrı temizlenmeli: liste önbelleği şirket
      //    genelinde, detay önbelleği depo bazında tutuluyor.
      // en-Each touched warehouse needs its own invalidation: the list cache is
      //    company-wide but detail caches are keyed per warehouse.
      await invalidateWarehouseCache(companyId);
      await Promise.all(
        managedWarehouses.map((w) => invalidateWarehouseCache(companyId, w.id))
      );
      if (targetUser.assignedWarehouseId) {
        await invalidateWarehouseCache(companyId, targetUser.assignedWarehouseId);
      }
      await invalidatePattern(driverCacheKeys.companyPattern(companyId));
      await revokeAllUserSessions(targetUserId);
      return updatedUser;
    });
  }
);

/**
 * tr-belirtilen kullanıcıyı şirkete ekler ve rol atar
 * en-adds the specified user to the company and assigns a role
 * input (user: AuthenticatedUser, targetUserId: string, roleName: string, driverData?: object)
 * output (Promise<User>)
 */
export const addCompanyUser = authenticatedAction(
  async (
    user,
    targetUserId: string,
    roleName: string,
    driverData?: {
      employeeId: string;
      phone: string;
      licenseType?: string;
      licenseNumber?: string;
      licenseExpiry?: string;
    },
    warehouseId?: string
  ) => {
    const companyId = user?.companyId || "";

    // tr-Depo ataması gerektiren roller: operatör (çalışan) ve depo yöneticisi
    // en-Roles that require a warehouse assignment: operator (staff) and warehouse manager
    const isWarehouseRole = roleName === "role_warehouse" || roleName === "role_manager";

    return controllerGuard("addCompanyUser", async () => {
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      const targetUser = await db.user.findUnique({ where: { id: targetUserId } });
      if (!targetUser) throw new Error("User not found");
      if (targetUser.companyId && targetUser.companyId !== companyId) {
        throw new Error("Unauthorized: User is already associated with another company");
      }

      await ensureStandardRoles();

      let updatedUser;

      if (isWarehouseRole && warehouseId) {
        // tr-Deponun bu şirkete ait olduğunu doğrula, sonra atamaları tek transaction'da yap
        // en-Verify the warehouse belongs to this company, then apply assignments in one transaction
        const warehouse = await db.warehouse.findFirst({
          where: { id: warehouseId, companyId },
          select: { id: true },
        });
        if (!warehouse) {
          throw new Error("Warehouse not found or not in your company");
        }

        updatedUser = await db.$transaction(async (tx) => {
          const userUpdate = await tx.user.update({
            where: { id: targetUserId },
            data: {
              companyId,
              roleId: roleName,
              assignedWarehouseId: warehouseId,
            },
          });

          // tr-Depo yöneticisi ise aynı zamanda deponun manager'ı olarak bağla
          // en-If the user is a warehouse manager, also set them as the warehouse's manager
          if (roleName === "role_manager") {
            await tx.warehouse.update({
              where: { id: warehouseId },
              data: { managerId: targetUserId },
            });
          }

          return userUpdate;
        });

        await invalidateWarehouseCache(companyId, warehouseId);
      } else if (roleName === "role_driver" && driverData) {
        // Run as a transaction to ensure both user update and driver creation succeed
        updatedUser = await db.$transaction(async (tx) => {
          // Check if employeeId is already taken
          if (driverData.employeeId) {
            const existingEmployee = await tx.driver.findFirst({
              where: {
                companyId,
                employeeId: driverData.employeeId,
              },
            });
            if (existingEmployee) {
              throw new Error("A driver with this Employee ID already exists");
            }
          }

          // Check if user already has a driver record
          const existingDriver = await tx.driver.findFirst({
            where: { userId: targetUserId, companyId },
          });
          if (existingDriver) {
            throw new Error("This user is already registered as a driver");
          }

          const userUpdate = await tx.user.update({
            where: { id: targetUserId },
            data: {
              companyId,
              roleId: roleName,
            },
          });

          await tx.driver.create({
            data: {
              companyId,
              userId: targetUserId,
              phone: driverData.phone,
              employeeId: driverData.employeeId,
              licenseType: driverData.licenseType || null,
              licenseNumber: driverData.licenseNumber || null,
              licenseExpiry: driverData.licenseExpiry ? new Date(driverData.licenseExpiry) : null,
              status: "OFF_DUTY",
              safetyScore: 100,
              efficiencyScore: 100,
              rating: 5.0,
            },
          });

          return userUpdate;
        });

        // Invalidate driver lists cache
        await invalidatePattern(driverCacheKeys.companyPattern(companyId));
      } else {
        updatedUser = await db.user.update({
          where: { id: targetUserId },
          data: {
            companyId,
            roleId: roleName,
          },
        });
      }

      await invalidateCompanyCache(companyId);
      // Do NOT revoke the target's sessions here: their access token now holds a
      // stale companyId (null), but revoking would kill their refresh token too
      // and trap them on /onboarding with a valid-but-dead cookie. Instead mark
      // their claims stale — the proxy routes their very next request through
      // /api/auth/refresh, which re-mints the JWT with the new companyId and
      // lands them on the dashboard without signing out and back in.
      await invalidateUserSessionCache(targetUserId);

      // tr-Kullanıcı bir şirkete eklendiğinde bundan haberdar edilmeli: hesabı artık başka
      //    birinin filosuna bağlı ve bir sonraki girişinde farklı bir arayüz görecek.
      //    E-posta hatası üyeliği geri almaz — kayıt zaten yazıldı, sadece günlüğe alınır.
      // en-Someone added to a company must learn about it: their account is now attached to
      //    another party's fleet and their next sign-in lands somewhere different. An email
      //    failure must not undo the membership — the record is already written, so we log only.
      try {
        const [company, role] = await Promise.all([
          db.company.findUnique({ where: { id: companyId }, select: { name: true } }),
          db.role.findUnique({ where: { id: roleName }, select: { name: true } }),
        ]);

        await sendCompanyWelcomeEmail(
          {
            email: updatedUser.email,
            lang: updatedUser.language === "tr" ? "tr" : "en",
          },
          {
            companyName: company?.name ?? "your company",
            roleName: role?.name ?? roleName,
            addedByName: [user.name, user.surname].filter(Boolean).join(" ").trim(),
          }
        );
      } catch (emailError) {
        const msg = emailError instanceof Error ? emailError.message : String(emailError);
        logger.warn(
          `[addCompanyUser] Welcome email failed for ${targetUserId}. ` +
            `The user was added to company ${companyId} regardless. Reason: ${msg}`
        );
      }

      return updatedUser;
    });
  }
);

/**
 * tr-şirket üyesinin bilgilerini günceller
 * en-updates the information of a company member
 * input (user: AuthenticatedUser, targetUserId: string, data: { name: string, surname: string, roleId: string, status: UserStatus, warehouseId?: string })
 * output (Promise<User>)
 */
export const updateCompanyMember = authenticatedAction(
  async (
    user,
    targetUserId: string,
    data: { name: string; surname: string; roleId: string; status: UserStatus; warehouseId?: string }
  ) => {
    const companyId = user?.companyId || "";

    // tr-Depo ataması gerektiren roller: operatör (çalışan) ve depo yöneticisi
    // en-Roles that require a warehouse assignment: operator (staff) and warehouse manager
    const isWarehouseRole = data.roleId === "role_warehouse" || data.roleId === "role_manager";

    return controllerGuard("updateCompanyMember", async () => {
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      const targetUser = await db.user.findUnique({ where: { id: targetUserId } });
      if (!targetUser || targetUser.companyId !== companyId) {
        throw new Error("Unauthorized: User not found or not in your company");
      }

      await ensureStandardRoles();

      let warehouseId: string | null = null;
      if (isWarehouseRole) {
        if (!data.warehouseId) {
          throw new Error("Warehouse assignment is required for this role");
        }
        const warehouse = await db.warehouse.findFirst({
          where: { id: data.warehouseId, companyId },
          select: { id: true },
        });
        if (!warehouse) {
          throw new Error("Warehouse not found or not in your company");
        }
        warehouseId = warehouse.id;
      }

      const previousWarehouseId = targetUser.assignedWarehouseId;

      const updatedUser = await db.$transaction(async (tx) => {
        // tr-Rol artık depo gerektirmiyorsa veya farklı bir depoya taşındıysa,
        //    kullanıcının önceki depodaki yöneticilik bağı düşürülmeli.
        // en-If the role no longer requires a warehouse, or moved to a different
        //    one, drop the user's manager link on the previous warehouse.
        if (previousWarehouseId && previousWarehouseId !== warehouseId) {
          await tx.warehouse.updateMany({
            where: { id: previousWarehouseId, companyId, managerId: targetUserId },
            data: { managerId: null },
          });
        }

        const userUpdate = await tx.user.update({
          where: { id: targetUserId },
          data: {
            name: data.name,
            surname: data.surname,
            roleId: data.roleId,
            status: data.status,
            assignedWarehouseId: warehouseId,
          },
        });

        if (data.roleId === "role_manager" && warehouseId) {
          await tx.warehouse.update({
            where: { id: warehouseId },
            data: { managerId: targetUserId },
          });
        } else if (warehouseId) {
          // tr-Operatör olarak atandıysa ve önceden bu deponun yöneticisiyse bağ düşürülür
          // en-If assigned as an operator and was previously this warehouse's manager, drop the link
          await tx.warehouse.updateMany({
            where: { id: warehouseId, companyId, managerId: targetUserId },
            data: { managerId: null },
          });
        }

        return userUpdate;
      });

      await invalidateCompanyCache(companyId);
      await invalidateWarehouseCache(companyId);
      if (previousWarehouseId) await invalidateWarehouseCache(companyId, previousWarehouseId);
      if (warehouseId) await invalidateWarehouseCache(companyId, warehouseId);

      return updatedUser;
    });
  }
);
