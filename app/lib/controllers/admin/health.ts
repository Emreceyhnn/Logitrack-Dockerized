import "server-only";

import { db } from "@/app/lib/db";
import { redis } from "@/app/lib/redis";
import { logger } from "@/app/lib/logger";
import type {
  ServiceHealth,
  ServiceKey,
  ServiceStatus,
} from "@/app/lib/type/admin/shell";

/**
 * HEALTH CHECK MATRIX
 * ===================
 * Probes each dependency the platform relies on. Every probe:
 *   - is bounded by a timeout, so one hanging dependency cannot stall the page;
 *   - never throws — a failed probe becomes a "down" tile, not a 500;
 *   - returns a sanitised `detail`. Connection strings, credentials and raw
 *     driver errors must never reach the client, so failures are reduced to a
 *     generic message and the real error goes to the server log only.
 */

/** Above this, a dependency is reachable but unhealthy enough to flag. */
const DEGRADED_THRESHOLD_MS = 1_000;
const PROBE_TIMEOUT_MS = 5_000;

/**
 * tr-Bir probe'u zaman aşımıyla sınırlar.
 * en-Races a probe against a timeout so a hung dependency cannot block the
 *    whole matrix.
 * input (fn: () => Promise<T>, timeoutMs: number)
 * output (Promise<T>)
 */
async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = PROBE_TIMEOUT_MS
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Probe timed out after ${timeoutMs}ms`)),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * tr-Gecikmeye göre durum belirler.
 * en-Classifies a successful probe by its latency.
 * input (latencyMs: number)
 * output (ServiceStatus)
 */
function classify(latencyMs: number): ServiceStatus {
  return latencyMs > DEGRADED_THRESHOLD_MS ? "degraded" : "up";
}

/**
 * tr-Tek bir servisi ölçer ve hataları yutarak sonuç döndürür.
 * en-Runs a single probe, timing it and converting any failure into a "down"
 *    result. Never throws.
 * input (key, label, probe)
 * output (Promise<ServiceHealth>)
 */
async function probe(
  key: ServiceKey,
  label: string,
  fn: () => Promise<void>
): Promise<ServiceHealth> {
  const startedAt = Date.now();
  try {
    await withTimeout(fn);
    const latencyMs = Date.now() - startedAt;
    return {
      key,
      label,
      status: classify(latencyMs),
      latencyMs,
      detail: null,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    // The real error can carry a connection string or credentials; keep it on
    // the server and hand the client a generic, non-revealing message.
    logger.error(`[admin/health] probe failed: ${key}`, error);
    return {
      key,
      label,
      status: "down",
      latencyMs: Date.now() - startedAt,
      detail: "Probe failed — see server logs",
      checkedAt: new Date().toISOString(),
    };
  }
}

/**
 * tr-Yapılandırılmamış servisleri "bilinmiyor" olarak işaretler.
 * en-Marks a dependency that is simply not configured in this environment.
 *    Distinct from "down": nothing is broken, the integration is just absent.
 * input (key, label)
 * output (ServiceHealth)
 */
function notConfigured(key: ServiceKey, label: string): ServiceHealth {
  return {
    key,
    label,
    status: "unknown",
    latencyMs: null,
    detail: "Not configured",
    checkedAt: new Date().toISOString(),
  };
}

/**
 * tr-Tüm bağımlılıkların sağlık durumunu paralel olarak ölçer.
 * en-Probes every dependency in parallel and returns the health matrix.
 *    Callers must already have passed the platform-admin guard.
 * input ()
 * output (Promise<ServiceHealth[]>)
 */
export async function getHealthMatrix(): Promise<ServiceHealth[]> {
  const checks: Promise<ServiceHealth>[] = [
    // Postgres via Prisma/Neon. `SELECT 1` is the cheapest round trip that
    // still proves the pool and the network path are alive.
    probe("database", "PostgreSQL (Neon)", async () => {
      await db.$queryRaw`SELECT 1`;
    }),

    // Upstash Redis. A round-tripped write+read proves more than PING: it
    // confirms the token actually has write scope.
    probe("redis", "Redis (Upstash)", async () => {
      const key = "health:probe";
      await redis.set(key, Date.now(), { ex: 30 });
      const value = await redis.get(key);
      if (value === null || value === undefined) {
        throw new Error("Redis readback returned empty");
      }
    }),
  ];

  // Resend — verify the API key is accepted. This lists domains rather than
  // sending mail, so the probe costs nothing and spams nobody.
  if (process.env.RESEND_API_KEY) {
    checks.push(
      probe("email", "Email (Resend)", async () => {
        const res = await fetch("https://api.resend.com/domains", {
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Resend responded ${res.status}`);
        }
      })
    );
  } else {
    checks.push(Promise.resolve(notConfigured("email", "Email (Resend)")));
  }

  // Cloudinary — the ping endpoint is purpose-built for health checks.
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const cloudKey = process.env.CLOUDINARY_API_KEY;
  const cloudSecret = process.env.CLOUDINARY_API_SECRET;
  if (cloudName && cloudKey && cloudSecret) {
    checks.push(
      probe("storage", "Storage (Cloudinary)", async () => {
        const auth = Buffer.from(`${cloudKey}:${cloudSecret}`).toString(
          "base64"
        );
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/ping`,
          { headers: { Authorization: `Basic ${auth}` }, cache: "no-store" }
        );
        if (!res.ok) {
          throw new Error(`Cloudinary responded ${res.status}`);
        }
      })
    );
  } else {
    checks.push(
      Promise.resolve(notConfigured("storage", "Storage (Cloudinary)"))
    );
  }

  // Firebase Realtime Database — used for live vehicle tracking.
  const firebaseDbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  if (firebaseDbUrl) {
    checks.push(
      probe("firebase", "Firebase RTDB", async () => {
        const res = await fetch(`${firebaseDbUrl}/.json?shallow=true`, {
          cache: "no-store",
        });
        // 401 still proves the endpoint is reachable and serving; database
        // rules simply reject an unauthenticated read.
        if (!res.ok && res.status !== 401) {
          throw new Error(`Firebase responded ${res.status}`);
        }
      })
    );
  } else {
    checks.push(Promise.resolve(notConfigured("firebase", "Firebase RTDB")));
  }

  // Valhalla routing service.
  const valhallaUrl = process.env.VALHALLA_URL;
  if (valhallaUrl) {
    checks.push(
      probe("valhalla", "Valhalla Routing", async () => {
        const res = await fetch(`${valhallaUrl}/status`, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Valhalla responded ${res.status}`);
        }
      })
    );
  } else {
    checks.push(
      Promise.resolve(notConfigured("valhalla", "Valhalla Routing"))
    );
  }

  // allSettled is belt-and-braces: `probe` already swallows failures, but a
  // rejection here must still not take down the whole matrix.
  const settled = await Promise.allSettled(checks);
  return settled.map((result, index) =>
    result.status === "fulfilled"
      ? result.value
      : notConfigured(`unknown-${index}` as ServiceKey, "Unknown service")
  );
}
