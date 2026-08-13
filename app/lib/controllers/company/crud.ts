"use server";

import { db } from "../../db";
import { INCLUDE_DELETED } from "../../softDelete";
import { checkPermission } from "../utils/checkPermission";
import { authenticatedAction } from "../../auth-middleware";
import { createSession, revokeSession } from "../session";
import { invalidateCompanyCache, ensureStandardRoles } from "./shared";
import { controllerGuard } from "../utils/controllerGuard";
import { hasAccess } from "../../entitlement";
import { requireVerifiedEmail } from "../utils/requireVerifiedEmail";
import { ForbiddenError } from "../../errors";

/**
 * tr-yeni bir şirket oluşturur ve kullanıcıyı bu şirkete atar
 * en-creates a new company and assigns the user to this company
 * input (user: AuthenticatedUser, name: string, avatarUrl?: string, regional?: { timezone: string, currency: string, language: string }, domain?: string)
 * output (Promise<{ company: Company, user: User }>)
 */
export const createCompany = authenticatedAction(
  async (
    user,
    name: string,
    avatarUrl?: string,
    regional?: { timezone: string; currency: string; language: string },
    domain?: string
  ) => {
    // Server-side entitlement guard (the middleware gate is the first line of
    // defense; this closes the direct-action path). Only a live trial or an
    // active plan may create a company.
    if (!hasAccess(user.accessStatus, user.trialEndsAt)) {
      throw new ForbiddenError("An active plan or trial is required to create a company");
    }

    // A company is durable structure that other people get invited into, so the
    // founder's address must be proven before it exists.
    await requireVerifiedEmail(user);

    // INCLUDE_DELETED makes these checks see soft-deleted companies too.
    // `name` and `domain` stay `@unique` at the database level regardless of
    // deletion, so skipping them here would turn a clear message into a P2002
    // crash on the create below.
    const existingCompany = await db.company.findFirst({
      where: { name, ...INCLUDE_DELETED },
    });
    if (existingCompany) throw new Error("Company name already exists");

    if (domain) {
      const existingDomain = await db.company.findFirst({
        where: { domain, ...INCLUDE_DELETED },
      });
      if (existingDomain) throw new Error("This domain is already registered to another company");
    }

    const newCompany = await db.company.create({
      data: {
        name,
        avatarUrl: avatarUrl ?? null,
        domain: domain || null,
        users: { connect: { id: user.id } },
      },
    });

    await ensureStandardRoles();

    const role = await db.role.findFirst({
      where: { id: "role_admin" },
    });

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        companyId: newCompany.id,
        roleId: role?.id ?? "role_admin",
        ...(regional
          ? {
              timezone: regional.timezone,
              currency: regional.currency,
              language: regional.language.toLocaleLowerCase('en-US'),
            }
          : {}),
      },
    });

    await revokeSession(user.sessionId);
    await createSession({
      id: user.id,
      roleId: updatedUser.roleId,
      companyId: newCompany.id,
      name: updatedUser.name,
      surname: updatedUser.surname,
      avatarUrl: updatedUser.avatarUrl,
      timezone: updatedUser.timezone,
      dateFormat: updatedUser.dateFormat,
      timeFormat: updatedUser.timeFormat,
      currency: updatedUser.currency,
      language: updatedUser.language,
      notifEmailShipment: updatedUser.notifEmailShipment,
      notifEmailMaint: updatedUser.notifEmailMaint,
      notifEmailWeekly: updatedUser.notifEmailWeekly,
      notifEmailAssignment: updatedUser.notifEmailAssignment,
      notifEmailDelay: updatedUser.notifEmailDelay,
      notifPushAssignment: updatedUser.notifPushAssignment,
      notifPushDelay: updatedUser.notifPushDelay,
    });

    return { company: newCompany, user: updatedUser };
  }
);

/**
 * tr-kullanıcının ait olduğu şirketin bilgilerini getirir
 * en-retrieves the information of the company the user belongs to
 * input (user: AuthenticatedUser)
 * output (Promise<Company>)
 */
export const getCompanyById = authenticatedAction(async (user) => {
  const userId = user?.id || "";
  const companyId = user?.companyId || "";

  return controllerGuard("getCompanyById", async () => {
    await checkPermission(user, companyId, [
      "role_admin",
      "role_manager",
      "role_dispatcher",
      "role_driver",
      "role_warehouse",
    ]);

    const company = await db.company.findUnique({
      where: { id: companyId, users: { some: { id: userId } } },
    });

    if (!company) {
      throw new Error("User is not authorized to access this company");
    }

    return company;
  });
});

/**
 * tr-şirket bilgilerini günceller
 * en-updates company information
 * input (user: AuthenticatedUser, data: { name?: string, avatarUrl?: string })
 * output (Promise<Company>)
 */
export const updateCompany = authenticatedAction(
  async (user, data: { name?: string; avatarUrl?: string }) => {
    const companyId = user?.companyId || "";

    return controllerGuard("updateCompany", async () => {
      await checkPermission(user, companyId, ["role_admin"]);

      const updatedCompany = await db.company.update({
        where: { id: companyId },
        data: {
          // Omit undefined keys so unspecified fields are left unchanged.
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
        },
      });
      await invalidateCompanyCache(companyId);
      return updatedCompany;
    });
  }
);

/**
 * tr-şirketi ve ilişkili tüm verilerini siler
 * en-deletes the company and all its related data
 * input (user: AuthenticatedUser)
 * output (Promise<Company>)
 */
export const deleteCompany = authenticatedAction(async (user) => {
  const companyId = user?.companyId || "";

  return controllerGuard("deleteCompany", async () => {
    await checkPermission(user, companyId, ["role_admin"]);

    // All tenant FKs are ON DELETE RESTRICT, so tenant offboarding is an
    // explicit, ordered wipe inside one transaction — never an implicit
    // cascade. Children are deleted before their parents (FK order).
    const deletedCompany = await db.$transaction(async (tx) => {
      const where = { companyId };
      await tx.shipmentHistory.deleteMany({ where });
      await tx.shipmentItem.deleteMany({ where });
      await tx.shipmentStop.deleteMany({ where });
      await tx.issue.deleteMany({ where });
      await tx.fuelLog.deleteMany({ where });
      await tx.maintenanceRecord.deleteMany({ where });
      await tx.trailerAssignment.deleteMany({ where });
      await tx.document.deleteMany({ where });
      await tx.joinRequest.deleteMany({ where });
      await tx.shipment.deleteMany({ where });
      await tx.routeStop.deleteMany({ where });
      await tx.route.deleteMany({ where });
      await tx.inventoryMovement.deleteMany({ where });
      await tx.inventory.deleteMany({ where });
      await tx.warehouseTask.deleteMany({ where });
      await tx.warehouseZone.deleteMany({ where });
      await tx.customerLocation.deleteMany({ where });
      await tx.customer.deleteMany({ where });
      await tx.driver.deleteMany({ where });
      await tx.trailer.deleteMany({ where });
      await tx.vehicle.deleteMany({ where });
      await tx.warehouse.deleteMany({ where });
      await tx.user.updateMany({
        where,
        data: { companyId: null },
      });
      await tx.role.deleteMany({ where });
      return tx.company.delete({ where: { id: companyId } });
    });
    return deletedCompany;
  });
});
