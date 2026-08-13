"use server";

import { headers } from "next/headers";
import { db } from "../../db";
import { authenticatedAction } from "../../auth-middleware";
import { controllerGuard } from "../utils/controllerGuard";
import { refreshSession, logAuditEvent, invalidateUserSessionCache } from "../session";
import { invalidatePattern, driverCacheKeys } from "../../redis";
import { invalidateCompanyCache } from "../company/shared";
import { notifyInviterOfOutcome } from "./notifyInviter";

interface InvitationDriverData {
  employeeId: string;
  phone: string;
  licenseType: string | null;
  licenseNumber: string | null;
  licenseExpiry: string | null;
}

/**
 * tr-mevcut bir kullanıcının kendisine gönderilen şirket davetini kabul etmesini sağlar
 * en-allows an existing user to accept a company invitation sent to them
 * input (user: AuthenticatedUser, invitationId: string)
 * output (Promise<{ success: boolean }>)
 */
export const acceptExistingUserInvitation = authenticatedAction(
  async (user, invitationId: string) => {
    return controllerGuard("acceptExistingUserInvitation", async () => {
      if (user.companyId) {
        throw new Error("You are already associated with a company.");
      }

      const invitation = await db.invitation.findUnique({ where: { id: invitationId } });
      if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
        throw new Error("This invitation is invalid or has expired.");
      }

      const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { email: true } });
      if (!dbUser) throw new Error("User not found.");

      if (invitation.email !== dbUser.email) {
        throw new Error("This invitation was sent to a different email address.");
      }

      const headerStore = await headers();
      const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "127.0.0.1";
      const userAgent = headerStore.get("user-agent") || "Unknown Device";

      const updatedUser = await db.$transaction(async (tx) => {
        // Handle driver data if applicable
        if (invitation.roleId === "role_driver" && invitation.driverData) {
          const driverData = invitation.driverData as unknown as InvitationDriverData;
          const existingEmployee = await tx.driver.findFirst({
            where: { companyId: invitation.companyId, employeeId: driverData.employeeId },
          });
          if (existingEmployee) throw new Error("A driver with this Employee ID already exists");

          await tx.driver.create({
            data: {
              companyId: invitation.companyId,
              userId: user.id,
              phone: driverData.phone,
              employeeId: driverData.employeeId,
              licenseType: driverData.licenseType,
              licenseNumber: driverData.licenseNumber,
              licenseExpiry: driverData.licenseExpiry ? new Date(driverData.licenseExpiry) : null,
              status: "OFF_DUTY",
              safetyScore: 100,
              efficiencyScore: 100,
              rating: 5.0,
            },
          });
        }

        const patchedUser = await tx.user.update({
          where: { id: user.id },
          data: {
            companyId: invitation.companyId,
            roleId: invitation.roleId,
          },
        });

        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: "ACCEPTED", acceptedAt: new Date() },
        });

        return patchedUser;
      });

      await invalidatePattern(driverCacheKeys.companyPattern(invitation.companyId));
      await invalidateCompanyCache(invitation.companyId);

      // Re-mint the CURRENT session rather than creating a second one: the user
      // is already signed in, and createSession would insert a duplicate session
      // row while leaving the original live and un-revoked. refreshSession
      // rotates the existing row's tokens and rebuilds the JWT from the row we
      // just updated, so the new companyId/roleId land in the cookie. If cookies
      // can't be written here, the stale-claims marker below still guarantees
      // the proxy re-mints on the next request.
      await invalidateUserSessionCache(user.id);
      await refreshSession();
      await logAuditEvent({
        userId: updatedUser.id,
        action: "SETTINGS_UPDATE",
        ipAddress: ip,
        deviceInfo: userAgent,
        metadata: { invitationId: invitation.id },
      });

      await notifyInviterOfOutcome({
        invitationId: invitation.id,
        outcome: "ACCEPTED",
        inviteeName: `${updatedUser.name} ${updatedUser.surname}`.trim(),
      });

      return { success: true };
    });
  }
);

/**
 * tr-mevcut bir kullanıcının kendisine gönderilen şirket davetini reddetmesini sağlar
 * en-allows an existing user to decline a company invitation sent to them
 * input (user: AuthenticatedUser, invitationId: string)
 * output (Promise<{ success: boolean }>)
 */
export const declineExistingUserInvitation = authenticatedAction(
  async (user, invitationId: string) => {
    return controllerGuard("declineExistingUserInvitation", async () => {
      const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { email: true } });
      if (!dbUser) throw new Error("User not found.");

      const invitation = await db.invitation.findUnique({ where: { id: invitationId } });
      if (!invitation || invitation.email !== dbUser.email || invitation.status !== "PENDING") {
        throw new Error("Invalid invitation.");
      }

      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: "REVOKED" },
      });

      const invitee = await db.user.findUnique({
        where: { id: user.id },
        select: { name: true, surname: true },
      });

      await notifyInviterOfOutcome({
        invitationId: invitation.id,
        outcome: "DECLINED",
        inviteeName: invitee
          ? `${invitee.name} ${invitee.surname}`.trim()
          : undefined,
      });

      return { success: true };
    });
  }
);
