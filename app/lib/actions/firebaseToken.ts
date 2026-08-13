"use server";

import { adminAuth } from "@/app/lib/firebase-admin";
import { authenticatedAction } from "@/app/lib/auth-middleware";
import { logger } from "@/app/lib/logger";

/**
 * tr-aktif kullanıcı için kısa süreli bir Firebase özel token'ı oluşturur
 * en-mints a short-lived Firebase custom token for the currently authenticated user
 * input ()
 * output (Promise<{ token: string } | { error: string }>)
 */
export const getFirebaseCustomTokenAction = authenticatedAction(
  async (user): Promise<{ token: string } | { error: string }> => {
    if (!adminAuth) {
      return { error: "Firebase Admin is not initialized" };
    }
    if (!user.companyId) {
      return { error: "User has no company assigned" };
    }

    try {
      const claims: { companyId: string; roleId?: string } = {
        companyId: user.companyId,
      };
      if (user.roleId) claims.roleId = user.roleId;

      const token = await adminAuth.createCustomToken(user.id, claims);
      return { token };
    } catch (error) {
      logger.error("[getFirebaseCustomTokenAction] mint failed:", error);
      return { error: "Failed to mint Firebase token" };
    }
  }
);
