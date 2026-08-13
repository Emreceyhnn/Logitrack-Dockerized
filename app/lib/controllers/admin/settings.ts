import "server-only";

import { redis } from "@/app/lib/redis";
import { logger } from "@/app/lib/logger";
import { ValidationError } from "@/app/lib/errors";
import type { EnvEntry, FeatureFlag } from "@/app/lib/type/admin/data";

/**
 * PLATFORM SETTINGS
 * =================
 * Feature flags (Redis-backed) and a masked environment viewer. Callers must
 * have passed `platformAdminAction`.
 */

// ─── Feature flags ──────────────────────────────────────────────────────────

/**
 * The flag registry. Flags are declared here rather than created ad hoc so a
 * typo cannot silently mint a new flag that nothing reads, and so every flag
 * carries a description explaining what it actually gates.
 */
const FLAG_REGISTRY: { key: string; description: string }[] = [
  {
    key: "maintenance_mode",
    description:
      "Show a maintenance banner to all users. Does not block requests on its own.",
  },
  {
    key: "signups_enabled",
    description: "Allow new companies to self-register.",
  },
  {
    key: "demo_mode_public",
    description: "Expose the public demo surface without authentication.",
  },
  {
    key: "email_delivery_enabled",
    description:
      "Master switch for outbound notification email (excludes security alerts).",
  },
];

const FLAG_KEY_PREFIX = "feature-flag:";
const FLAG_KEYS = new Set(FLAG_REGISTRY.map((flag) => flag.key));

/** Stored flag payload. */
interface StoredFlag {
  enabled: boolean;
  updatedAt: string;
}

/**
 * tr-Tüm özellik anahtarlarını okur.
 * en-Reads every registered flag. A flag that has never been written reads as
 *    disabled — the safe default, since a flag's whole point is that the
 *    feature is off until someone turns it on.
 * input ()
 * output (Promise<FeatureFlag[]>)
 */
export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  const results = await Promise.all(
    FLAG_REGISTRY.map(async (flag) => {
      try {
        const stored = await redis.get<StoredFlag>(
          `${FLAG_KEY_PREFIX}${flag.key}`
        );
        return {
          key: flag.key,
          description: flag.description,
          enabled: stored?.enabled === true,
          updatedAt: stored?.updatedAt ?? null,
        };
      } catch (error) {
        // A Redis blip must not blank the page; report the flag as off and
        // let the operator see the rest.
        logger.error(`[admin/settings] flag read failed: ${flag.key}`, error);
        return {
          key: flag.key,
          description: flag.description,
          enabled: false,
          updatedAt: null,
        };
      }
    })
  );

  return results;
}

/**
 * tr-Bir özellik anahtarını değiştirir.
 * en-Toggles a registered flag. Unknown keys are rejected so the console
 *    cannot write flags nothing reads.
 * input (key: string, enabled: boolean)
 * output (Promise<FeatureFlag>)
 */
export async function setFeatureFlag(
  key: string,
  enabled: boolean
): Promise<FeatureFlag> {
  if (!FLAG_KEYS.has(key)) {
    throw new ValidationError(`Unknown feature flag "${key}"`);
  }

  const entry = FLAG_REGISTRY.find((flag) => flag.key === key);
  const updatedAt = new Date().toISOString();

  // No TTL: a flag must survive until someone changes it. An expiring flag
  // would silently revert production behaviour.
  await redis.set(`${FLAG_KEY_PREFIX}${key}`, { enabled, updatedAt });

  logger.info(`[admin/settings] flag ${key} → ${enabled}`);

  return {
    key,
    description: entry?.description ?? "",
    enabled,
    updatedAt,
  };
}

// ─── Environment viewer ─────────────────────────────────────────────────────

/**
 * Environment variables surfaced to the console, as a closed allowlist.
 *
 * `secret: true` means the value is NEVER sent to the client — only whether it
 * is set, plus a short fingerprint. Anything not listed here is invisible, so
 * adding a new secret to the deployment cannot accidentally expose it.
 */
const ENV_REGISTRY: { key: string; secret: boolean }[] = [
  { key: "NODE_ENV", secret: false },
  { key: "NEXT_PUBLIC_BASE_URL", secret: false },
  { key: "VERCEL_ENV", secret: false },
  { key: "VERCEL_REGION", secret: false },
  { key: "DATABASE_URL", secret: true },
  { key: "JWT_SECRET", secret: true },
  { key: "RESEND_API_KEY", secret: true },
  { key: "RESEND_FROM_EMAIL", secret: false },
  { key: "REDIS_URL", secret: true },
  { key: "CLOUDINARY_CLOUD_NAME", secret: false },
  { key: "CLOUDINARY_API_KEY", secret: true },
  { key: "CLOUDINARY_API_SECRET", secret: true },
  { key: "NEXT_PUBLIC_FIREBASE_DATABASE_URL", secret: false },
  { key: "FIREBASE_SERVICE_ACCOUNT", secret: true },
  { key: "VALHALLA_URL", secret: false },
  { key: "PLATFORM_ADMIN_USER_IDS", secret: true },
];

/**
 * tr-Gizli değeri maskeler.
 * en-Masks a secret, revealing only its length class and last 4 characters so
 *    an operator can tell two keys apart without the value being readable.
 *    Short values are fully masked — revealing 4 of 8 characters would give
 *    away half the secret.
 * input (value: string)
 * output (string)
 */
function maskSecret(value: string): string {
  if (value.length <= 12) return "•".repeat(8);
  return `${"•".repeat(8)}${value.slice(-4)}`;
}

/**
 * tr-Ortam değişkenlerini maskelenmiş olarak listeler.
 * en-Lists allowlisted environment variables. Secrets are masked server-side;
 *    the raw value never enters the response payload.
 * input ()
 * output (EnvEntry[])
 */
export function listEnvEntries(): EnvEntry[] {
  return ENV_REGISTRY.map(({ key, secret }) => {
    const raw = process.env[key];
    const present = typeof raw === "string" && raw.length > 0;

    if (!present) {
      return { key, value: "(not set)", present: false, masked: false };
    }

    return {
      key,
      value: secret ? maskSecret(raw) : raw,
      present: true,
      masked: secret,
    };
  });
}
