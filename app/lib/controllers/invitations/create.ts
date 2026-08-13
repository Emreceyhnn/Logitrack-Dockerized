"use server";

import { db } from "../../db";
import { checkPermission } from "../utils/checkPermission";
import { requireVerifiedEmail } from "../utils/requireVerifiedEmail";
import { authenticatedAction } from "../../auth-middleware";
import { controllerGuard } from "../utils/controllerGuard";
import { ensureStandardRoles } from "../company/shared";
import { getRoleLabel } from "../company/roleLabels";
import { rateLimit } from "../../rate-limiter";
import { generateRefreshToken, hashToken } from "../session/internal";
import { sendCompanyInviteEmail } from "../../services/email";
import { getBaseUrl } from "../../utils/baseUrl";
import { createDriverInvitationSchema, createCompanyInvitationSchema } from "../../validation/serverSchemas";
import { ConflictError, RateLimitError, ValidationError } from "../../errors";
import { logger } from "../../logger";

const INVITE_EXPIRY_DAYS = 7;

// tr-Depo ataması gerektiren roller: operatör (çalışan) ve depo yöneticisi
// en-Roles that require a warehouse assignment: operator (staff) and warehouse manager
const isWarehouseRole = (roleId: string) => roleId === "role_warehouse" || roleId === "role_manager";

/**
 * tr-yeni bir şirket davetiyesi oluşturur ve davet e-postası gönderir. Sürücü rolü
 *    driverData, depo rolleri warehouseId gerektirir; diğer roller ikisini de gerektirmez.
 * en-creates a new company invitation and sends an invitation email. The driver role
 *    requires driverData, warehouse roles require warehouseId; other roles require neither.
 * input (user: AuthenticatedUser, email: string, roleId: string, driverData?: object, warehouseId?: string)
 * output (Promise<{ id: string, email: string, expiresAt: Date }>)
 */
export const createCompanyInvitation = authenticatedAction(
  async (
    user,
    email: string,
    roleId: string,
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
    return controllerGuard("createCompanyInvitation", async () => {
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      // This action sends mail on the user's behalf. Requiring a proven address
      // first stops an unverified account from using us as a mail relay.
      await requireVerifiedEmail(user);

      const parsedBase = createCompanyInvitationSchema.safeParse({ email, roleId });
      if (!parsedBase.success) {
        throw new ValidationError(parsedBase.error.issues[0]?.message ?? "Invalid data");
      }
      const normalizedEmail = parsedBase.data.email;

      let parsedDriverData: import("zod").infer<typeof createDriverInvitationSchema> | null = null;

      if (roleId === "role_driver") {
        const parsed = createDriverInvitationSchema.safeParse({ email, ...driverData });
        if (!parsed.success) {
          throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid data");
        }
        parsedDriverData = parsed.data;
      }

      if (isWarehouseRole(roleId) && !warehouseId) {
        throw new ValidationError("Warehouse assignment is required for this role");
      }

      const limit = await rateLimit(user.id, 20, 3600, "rate-limit:send-invite:");
      if (!limit.success) throw new RateLimitError();

      await ensureStandardRoles();

      const existingUser = await db.user.findFirst({ where: { email: normalizedEmail } });
      if (existingUser?.companyId) {
        throw new ConflictError("This email is already associated with a company");
      }

      const existingInvite = await db.invitation.findFirst({
        where: { companyId, email: normalizedEmail, status: "PENDING", expiresAt: { gt: new Date() } },
      });
      if (existingInvite) throw new ConflictError("An invitation is already pending for this email");

      if (parsedDriverData) {
        const existingEmployee = await db.driver.findFirst({
          where: { companyId, employeeId: parsedDriverData.employeeId },
        });
        if (existingEmployee) throw new Error("A driver with this Employee ID already exists");
      }

      let resolvedWarehouseId: string | null = null;
      if (isWarehouseRole(roleId) && warehouseId) {
        const warehouse = await db.warehouse.findFirst({
          where: { id: warehouseId, companyId },
          select: { id: true },
        });
        if (!warehouse) throw new ValidationError("Warehouse not found or not in your company");
        resolvedWarehouseId = warehouse.id;
      }

      const rawToken = generateRefreshToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      const invitation = await db.invitation.create({
        data: {
          email: normalizedEmail,
          companyId,
          roleId,
          tokenHash,
          driverData: parsedDriverData
            ? {
                employeeId: parsedDriverData.employeeId,
                phone: parsedDriverData.phone,
                licenseType: parsedDriverData.licenseType || null,
                licenseNumber: parsedDriverData.licenseNumber || null,
                licenseExpiry: parsedDriverData.licenseExpiry || null,
              }
            : resolvedWarehouseId
              ? { warehouseId: resolvedWarehouseId }
              : {},
          invitedById: user.id,
          expiresAt,
        },
      });

      const company = await db.company.findUnique({ where: { id: companyId }, select: { name: true } });

      // Resolve the language: use the inviting user's language preference (tr or en).
      // The accept-invite page is lang-prefixed, so the URL must match.
      const lang: "en" | "tr" = user.language === "tr" ? "tr" : "en";
      const base = getBaseUrl();
      const inviteUrl = `${base}/${lang}/auth/accept-invite?token=${rawToken}`;

      // Email failure must NOT abort the invitation — the DB record is already written.
      // Log the error so it's visible in the terminal/monitoring, but continue.
      try {
        await sendCompanyInviteEmail(
          normalizedEmail,
          inviteUrl,
          company?.name || "Your company",
          getRoleLabel(roleId, lang),
          lang,
          INVITE_EXPIRY_DAYS
        );
      } catch (emailError) {
        const msg = emailError instanceof Error ? emailError.message : String(emailError);
        logger.warn(
          `[createCompanyInvitation] Email delivery failed for ${normalizedEmail}. ` +
          `The invitation was saved (id: ${invitation.id}) but the email was not sent. ` +
          `Reason: ${msg}`
        );
      }

      return { id: invitation.id, email: invitation.email, expiresAt: invitation.expiresAt };
    });
  }
);
