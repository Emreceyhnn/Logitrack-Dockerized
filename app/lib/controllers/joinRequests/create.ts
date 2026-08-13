"use server";

import { db } from "../../db";
import { authenticatedAction } from "../../auth-middleware";
import { controllerGuard } from "../utils/controllerGuard";
import { ConflictError, ForbiddenError, NotFoundError } from "../../errors";

/** Request, by a companyless user, to join an existing company. */
export const createJoinRequest = authenticatedAction(
  async (user, companyId: string) => {
    return controllerGuard("createJoinRequest", async () => {
      if (user.companyId) {
        throw new ForbiddenError("You already belong to a company");
      }

      const company = await db.company.findUnique({ where: { id: companyId } });
      if (!company) throw new NotFoundError("Company");

      const existing = await db.joinRequest.findUnique({
        where: { userId_companyId: { userId: user.id, companyId } },
      });
      if (existing?.status === "PENDING") {
        throw new ConflictError("A join request is already pending for this company");
      }

      const joinRequest = await db.joinRequest.upsert({
        where: { userId_companyId: { userId: user.id, companyId } },
        create: { userId: user.id, companyId, status: "PENDING" },
        update: { status: "PENDING", decidedAt: null, decidedById: null },
      });

      return { id: joinRequest.id, companyName: company.name };
    });
  }
);
