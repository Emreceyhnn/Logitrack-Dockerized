"use server";

import { db } from "../../db";
import { checkPermission } from "../utils/checkPermission";
import { authenticatedAction } from "../../auth-middleware";
import { controllerGuard } from "../utils/controllerGuard";
import { ConflictError, NotFoundError } from "../../errors";
import { addCompanyUser } from "../company/members";

/** Accept a pending join request — admin/manager only, scoped to their own company. */
export const acceptJoinRequest = authenticatedAction(
  async (
    user,
    joinRequestId: string,
    roleName: string,
    driverData?: {
      employeeId: string;
      phone: string;
      licenseType?: string;
      licenseNumber?: string;
      licenseExpiry?: string;
    }
  ) => {
    const companyId = user?.companyId || "";
    return controllerGuard("acceptJoinRequest", async () => {
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      const joinRequest = await db.joinRequest.findUnique({ where: { id: joinRequestId } });
      if (!joinRequest || joinRequest.companyId !== companyId) {
        throw new NotFoundError("Join request");
      }
      if (joinRequest.status !== "PENDING") {
        throw new ConflictError("This join request has already been decided");
      }

      const updatedUser = await addCompanyUser(joinRequest.userId, roleName, driverData);

      await db.joinRequest.update({
        where: { id: joinRequestId },
        data: { status: "ACCEPTED", decidedAt: new Date(), decidedById: user.id },
      });

      return updatedUser;
    });
  }
);
