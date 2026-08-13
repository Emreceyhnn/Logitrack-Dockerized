"use server";

import { cookies } from "next/headers";
import { redis } from "../redis";
import { getAuthenticatedUser } from "../auth-middleware";
import { logger } from "@/app/lib/logger";


const THEME_COOKIE = "logitrack-theme";
const VALID_THEMES = ["light", "dark", "system"] as const;
export type ThemeValue = (typeof VALID_THEMES)[number];

/**
 * tr-verilen değerin geçerli bir tema olup olmadığını kontrol eder
 * en-checks if the given value is a valid theme
 * input (value: string)
 * output (value is ThemeValue)
 */
function isValidTheme(value: string): value is ThemeValue {
  return (VALID_THEMES as readonly string[]).includes(value);
}

/**
 * Saves the user's theme preference.
 * - Sets an HTTP cookie immediately (fast, read on next SSR request without
 *   any network call).
 * - Syncs to Redis in the background for cross-device persistence.
 * 
 * tr-kullanıcının tema tercihini kaydeder
 * en-saves the user's theme preference
 * input (mode: string)
 * output (Promise<{ success: boolean; error?: string }>)
 */
export async function saveUserTheme(mode: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // 1. Set cookie immediately so next SSR skips the Redis call
    const cookieStore = await cookies();
    cookieStore.set(THEME_COOKIE, mode, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60, // 1 year
      sameSite: "lax",
      httpOnly: false, // readable by client JS as well
    });

    // 2. Background Redis sync (fire-and-forget, non-blocking)
    redis.set(`user:${user.id}:theme`, mode).catch((err) =>
      logger.error("[saveUserTheme] Redis sync error", err)
    );

    return { success: true };
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      err.digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw err;
    }
    logger.error("Failed to save theme to Redis", err);
    return { success: false, error: "Failed to save theme" };
  }
}

/**
 * Reads the user's stored theme preference.
 * Priority: HTTP cookie (zero-latency) → Redis fallback (first visit / cross-device).
 * 
 * tr-kullanıcının kaydedilmiş tema tercihini okur
 * en-reads the user's stored theme preference
 * input ()
 * output (Promise<ThemeValue | null>)
 */
export async function getUserTheme(): Promise<ThemeValue | null> {
  try {
    // 1. Cookie-first: no network call needed
    const cookieStore = await cookies();
    const cookieTheme = cookieStore.get(THEME_COOKIE)?.value;
    if (cookieTheme && isValidTheme(cookieTheme)) {
      return cookieTheme;
    }

    // 2. Redis fallback (only on first visit or cleared cookies)
    const user = await getAuthenticatedUser();
    if (!user) return null;

    const redisTheme = await redis.get<string>(`user:${user.id}:theme`);
    if (redisTheme && isValidTheme(redisTheme)) {
      // NOTE: Cannot set a cookie here — this runs inside a Server Component
      // (layout), where cookies are read-only. The cookie will be written
      // naturally the next time the user changes their theme via saveUserTheme().
      return redisTheme;
    }

    return null;
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      err.digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw err;
    }
    logger.error("Failed to get theme", err);
    return null;
  }
}
