"use server";

import { db } from "../../db";
import { checkPermission } from "../utils/checkPermission";
import { authenticatedAction } from "../../auth-middleware";
import { controllerGuard } from "../utils/controllerGuard";

/** Pending join requests for the caller's own company — admin/manager only. */
export const getPendingJoinRequests = authenticatedAction(async (user) => {
  const companyId = user?.companyId || "";
  return controllerGuard("getPendingJoinRequests", async () => {
    await checkPermission(user, companyId, ["role_admin", "role_manager"]);

    return db.joinRequest.findMany({
      where: { companyId, status: "PENDING" },
      include: {
        user: { select: { name: true, surname: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  });
});

/** All join requests for the caller's own company — admin/manager only. */
export const getAllJoinRequests = authenticatedAction(async (user) => {
  const companyId = user?.companyId || "";
  return controllerGuard("getAllJoinRequests", async () => {
    await checkPermission(user, companyId, ["role_admin", "role_manager"]);

    return db.joinRequest.findMany({
      where: { companyId },
      include: {
        user: { select: { name: true, surname: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  });
});


/** The caller's own pending join request, if any — used to hydrate the
 * onboarding page's pending-approval state across a refresh. */
export const getMyJoinRequest = authenticatedAction(async (user) => {
  return controllerGuard("getMyJoinRequest", async () => {
    if (user.companyId) return null;
    return db.joinRequest.findFirst({
      where: { userId: user.id, status: "PENDING" },
      include: { company: { select: { name: true } } },
    });
  });
});
