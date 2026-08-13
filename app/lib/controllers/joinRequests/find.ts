"use server";

import { db } from "../../db";
import { authenticatedAction } from "../../auth-middleware";
import { controllerGuard } from "../utils/controllerGuard";
import { getEmailDomain } from "../../utils/emailDomain";

/** Companies whose registered domain matches the caller's own email domain. */
export const findCompaniesByDomain = authenticatedAction(async (user) => {
  return controllerGuard("findCompaniesByDomain", async () => {
    if (user.companyId) return [];

    const self = await db.user.findUnique({
      where: { id: user.id },
      select: { email: true },
    });
    const domain = self ? getEmailDomain(self.email) : "";
    if (!domain) return [];

    return db.company.findMany({
      where: { domain },
      select: { id: true, name: true, avatarUrl: true },
    });
  });
});
