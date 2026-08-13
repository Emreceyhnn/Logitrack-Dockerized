"use server";

import { getAuthenticatedUser } from "../auth-middleware";
import { LogoutUser } from "../controllers/users";
import { refreshSession } from "../controllers/session";
import { logger } from "@/app/lib/logger";


/**
 * tr-kullanıcının aktif oturum (session) bilgilerini getirir
 * en-retrieves the active session information of the user
 * input ()
 * output (Promise<User>)
 */
export async function getUserSession() {
  try {
    const user = await getAuthenticatedUser();
    return user;
  } catch (error) {
    logger.error("CRITICAL ERROR in getUserSession:", error);
    throw error;
  }
}

/**
 * tr-kullanıcının oturumunu sonlandırır (çıkış yapar)
 * en-terminates the user's session (logs out)
 * input ()
 * output (Promise<LogoutResult>)
 */
export async function logoutAction() {
  const result = await LogoutUser();
  return result;
}

/**
 * tr-kullanıcının mevcut oturumunun süresini yeniler
 * en-refreshes the duration of the user's current session
 * input ()
 * output (Promise<{ success: boolean }>)
 */
export async function refreshSessionAction() {
  const success = await refreshSession();
  return { success };
}
