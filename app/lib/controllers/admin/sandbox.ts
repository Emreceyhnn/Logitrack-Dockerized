import "server-only";

import { headers } from "next/headers";
import { redis } from "@/app/lib/redis";
import { logger } from "@/app/lib/logger";
import { ValidationError } from "@/app/lib/errors";
import { sendEmail } from "@/app/lib/services/email";
import { buildEmailVerificationEmail } from "@/app/lib/templates/emailVerificationEmail";
import { buildPasswordResetEmail } from "@/app/lib/templates/passwordResetEmail";
import { buildCompanyWelcomeEmail } from "@/app/lib/templates/companyWelcomeEmail";
import { buildSecurityAlertEmail } from "@/app/lib/templates/securityAlertEmail";
import { buildNotificationEmail } from "@/app/lib/templates/notificationEmail";
import type {
  ApiRequestPayload,
  ApiResponseResult,
  EmailTestPayload,
  EmailTestResult,
  QueueNamespace,
  QueueSnapshot,
} from "@/app/lib/type/admin/sandbox";

/**
 * SERVICE SANDBOX
 * ===============
 * Server-side execution for the admin console's testing laboratory. Callers
 * must already have passed `platformAdminAction`.
 */

// ─── API Tester ─────────────────────────────────────────────────────────────

/**
 * Response headers that must never be echoed back to the browser. `set-cookie`
 * in particular can carry a freshly minted session for another user when the
 * tester replays an auth route.
 */
const REDACTED_HEADERS = new Set([
  "set-cookie",
  "authorization",
  "proxy-authorization",
  "www-authenticate",
]);

/** Request headers the caller may not override — they are ours to control. */
const FORBIDDEN_REQUEST_HEADERS = new Set([
  "host",
  "cookie",
  "content-length",
  "connection",
  "transfer-encoding",
  // Spoofing these would let the tester forge a client identity in logs and
  // defeat the IP-based rate limiter.
  "x-forwarded-for",
  "x-real-ip",
]);

const MAX_RESPONSE_BYTES = 512 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * tr-Yolun yalnızca bu uygulamanın /api rotalarını hedeflediğini doğrular.
 * en-Validates that a tester path targets this app's own /api surface.
 *
 *    THIS IS THE SSRF BOUNDARY. Without it the console would be an
 *    authenticated request proxy: an admin (or anyone who steals an admin
 *    session) could reach internal services, cloud metadata endpoints
 *    (169.254.169.254) or arbitrary external hosts using the server's network
 *    position and egress IP. So the path must be app-relative, must start with
 *    "/api/", and must not smuggle a scheme or host.
 * input (rawPath: string)
 * output (string) — normalised path + query
 */
export function assertSafeApiPath(rawPath: string): string {
  const path = rawPath.trim();

  if (!path) {
    throw new ValidationError("Path is required", { path: ["Path is required"] });
  }

  // Reject anything carrying a scheme or authority before parsing: "http://",
  // "//evil.com" (protocol-relative) and "\\evil.com" all resolve to a remote
  // host rather than a local path.
  if (
    /^[a-z][a-z0-9+.-]*:/i.test(path) ||
    path.startsWith("//") ||
    path.startsWith("\\")
  ) {
    throw new ValidationError("Only app-relative /api paths are allowed", {
      path: ["Absolute URLs and external hosts are not permitted"],
    });
  }

  if (!path.startsWith("/api/")) {
    throw new ValidationError("Only /api/* paths are allowed", {
      path: ["Path must start with /api/"],
    });
  }

  // Resolve against a dummy origin so traversal ("/api/../../etc") collapses
  // and can be re-checked; URL parsing also rejects malformed input here.
  let resolved: URL;
  try {
    resolved = new URL(path, "http://localhost");
  } catch {
    throw new ValidationError("Malformed path", { path: ["Malformed path"] });
  }

  if (!resolved.pathname.startsWith("/api/")) {
    throw new ValidationError("Path escapes the /api namespace", {
      path: ["Path escapes the /api namespace"],
    });
  }

  // The console's own endpoints are excluded: replaying them through the
  // tester would recurse and muddy the audit trail.
  if (resolved.pathname.startsWith("/api/admin/")) {
    throw new ValidationError("Admin endpoints cannot be replayed", {
      path: ["Admin console endpoints are not testable from the sandbox"],
    });
  }

  return resolved.pathname + resolved.search;
}

/**
 * tr-Sandbox'tan gelen bir isteği uygulamanın kendi API'sine iletir.
 * en-Executes a sandbox request against this app's own API and returns a
 *    sanitised result. The caller's session cookie is forwarded so the request
 *    runs with the admin's real identity — the tester exercises the API as it
 *    actually behaves, rather than bypassing auth.
 * input (payload: ApiRequestPayload)
 * output (Promise<ApiResponseResult>)
 */
export async function executeApiRequest(
  payload: ApiRequestPayload
): Promise<ApiResponseResult> {
  const safePath = assertSafeApiPath(payload.path);

  const headerStore = await headers();
  const host = headerStore.get("host");
  if (!host) {
    throw new ValidationError("Cannot resolve request host");
  }
  // Same host as the incoming request, so the call never leaves this origin.
  const protocol = headerStore.get("x-forwarded-proto") ?? "https";
  const target = new URL(safePath, `${protocol}://${host}`);

  for (const [key, value] of Object.entries(payload.query)) {
    if (key.trim()) target.searchParams.set(key, value);
  }

  const outboundHeaders = new Headers();
  for (const [key, value] of Object.entries(payload.headers)) {
    const name = key.trim().toLowerCase();
    if (!name || FORBIDDEN_REQUEST_HEADERS.has(name)) continue;
    outboundHeaders.set(name, value);
  }

  // Forward the admin's session so the target route authenticates normally.
  const cookie = headerStore.get("cookie");
  if (cookie) outboundHeaders.set("cookie", cookie);

  const hasBody = payload.method !== "GET" && payload.method !== "DELETE";
  if (hasBody && payload.body?.trim()) {
    // Validate before dispatch so a JSON typo surfaces as a clear error rather
    // than a confusing 400 from the target route.
    try {
      JSON.parse(payload.body);
    } catch {
      throw new ValidationError("Request body is not valid JSON", {
        body: ["Body must be valid JSON"],
      });
    }
    if (!outboundHeaders.has("content-type")) {
      outboundHeaders.set("content-type", "application/json");
    }
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(target, {
      method: payload.method,
      headers: outboundHeaders,
      ...(hasBody && payload.body?.trim() ? { body: payload.body } : {}),
      // A redirect could leave the origin; surface it instead of following it.
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
    });

    const raw = await response.text();
    const sizeBytes = Buffer.byteLength(raw, "utf8");
    const truncated =
      sizeBytes > MAX_RESPONSE_BYTES
        ? raw.slice(0, MAX_RESPONSE_BYTES) + "\n… response truncated"
        : raw;

    let body = truncated;
    let isJson = false;
    try {
      body = JSON.stringify(JSON.parse(truncated), null, 2);
      isJson = true;
    } catch {
      // Not JSON — show it verbatim.
    }

    const safeHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      safeHeaders[key] = REDACTED_HEADERS.has(key.toLowerCase())
        ? "«redacted»"
        : value;
    });

    return {
      status: response.status,
      statusText: response.statusText,
      durationMs: Date.now() - startedAt,
      headers: safeHeaders,
      body,
      isJson,
      sizeBytes,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ValidationError(
        `Request timed out after ${REQUEST_TIMEOUT_MS}ms`
      );
    }
    logger.error("[admin/sandbox] api request failed", error);
    throw new ValidationError("Request failed — see server logs");
  } finally {
    clearTimeout(timer);
  }
}

// ─── Email Tester ───────────────────────────────────────────────────────────

/** Placeholder links used when rendering a template for a test send. The URLs
 *  are intentionally inert — a test must never mint a usable credential. */
const SAMPLE_URL = "https://example.invalid/sandbox-test-link";

/**
 * tr-Seçilen şablonu gerçek builder ile render eder.
 * en-Renders the chosen template using the app's real builders, so the tester
 *    proves what production actually sends rather than an approximation.
 * input (payload: EmailTestPayload)
 * output ({ subject: string; html: string; text?: string })
 */
function renderTemplate(payload: EmailTestPayload): {
  subject: string;
  html: string;
  text?: string;
} {
  const lang = payload.lang;

  switch (payload.template) {
    case "verification":
      return buildEmailVerificationEmail({
        verifyUrl: SAMPLE_URL,
        userName: "Sandbox Tester",
        lang,
        expiryHours: 24,
      });
    case "passwordReset":
      return buildPasswordResetEmail({
        resetUrl: SAMPLE_URL,
        userName: "Sandbox Tester",
        lang,
        expiryMinutes: 60,
      });
    case "companyWelcome":
      return buildCompanyWelcomeEmail({
        companyName: "Sandbox Logistics",
        roleName: "Administrator",
        addedByName: "Admin Console",
        lang,
      });
    case "securityAlert":
      return buildSecurityAlertEmail({
        kind: "PASSWORD_CHANGED",
        userName: "Sandbox Tester",
        ipAddress: "203.0.113.7",
        deviceInfo: "Admin Console Sandbox",
        lang,
      });
    case "notification":
      return buildNotificationEmail({
        title: "Sandbox notification",
        message:
          "This is a test notification dispatched from the admin console.",
        type: "INFO",
        lang,
      });
    case "custom": {
      const subject = payload.subject?.trim();
      const html = payload.html?.trim();
      if (!subject || !html) {
        throw new ValidationError("Custom emails need a subject and body", {
          subject: subject ? [] : ["Subject is required"],
          html: html ? [] : ["Body is required"],
        });
      }
      return { subject, html };
    }
    default:
      throw new ValidationError("Unknown template");
  }
}

/**
 * tr-Gerçek bir test e-postası gönderir.
 * en-Sends a REAL email through Resend. This is not a simulation: the address
 *    receives an actual message, which is why the UI labels it as such.
 * input (payload: EmailTestPayload)
 * output (Promise<EmailTestResult>)
 */
export async function sendTestEmail(
  payload: EmailTestPayload
): Promise<EmailTestResult> {
  const to = payload.to.trim();
  // Deliberately permissive: full RFC 5322 validation belongs to the provider,
  // which rejects bad addresses far more accurately than a regex can.
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new ValidationError("A valid recipient address is required", {
      to: ["Enter a valid email address"],
    });
  }

  if (!process.env.RESEND_API_KEY) {
    throw new ValidationError(
      "Email delivery is not configured (RESEND_API_KEY is unset)"
    );
  }

  const rendered = renderTemplate(payload);
  const startedAt = Date.now();

  try {
    await sendEmail({
      to,
      subject: `[Sandbox] ${rendered.subject}`,
      html: rendered.html,
      ...(rendered.text ? { text: rendered.text } : {}),
    });

    return {
      ok: true,
      // sendEmail does not surface the provider id; the send either completed
      // or threw, and claiming an id we do not have would be a lie.
      messageId: null,
      durationMs: Date.now() - startedAt,
      message: `Email dispatched to ${to}`,
      sentAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("[admin/sandbox] test email failed", message);
    return {
      ok: false,
      messageId: null,
      durationMs: Date.now() - startedAt,
      message,
      sentAt: new Date().toISOString(),
    };
  }
}

// ─── Queue / Redis Monitor ──────────────────────────────────────────────────

/** Cap on keys examined per refresh, so a large keyspace cannot stall the
 *  request or blow the response size. */
const SCAN_KEY_CAP = 2_000;
const SCAN_BATCH = 250;

/**
 * tr-Redis anahtar uzayının anlık görüntüsünü çıkarır.
 * en-Snapshots the Redis keyspace: how many keys exist, grouped by namespace.
 *
 *    NOTE: this app has no BullMQ/queue library, so there are no jobs to list,
 *    retry or drain. Rather than fake a job board, the monitor reports the real
 *    cache and rate-limit state that Redis actually holds. SCAN is used instead
 *    of KEYS so a large keyspace is never blocked in one call.
 * input ()
 * output (Promise<QueueSnapshot>)
 */
export async function getQueueSnapshot(): Promise<QueueSnapshot> {
  const startedAt = Date.now();

  try {
    const namespaceCounts = new Map<string, number>();
    let cursor = 0;
    let scanned = 0;
    let rateLimitKeys = 0;
    let truncated = false;

    do {
      const [next, keys] = await redis.scan(cursor, { count: SCAN_BATCH });
      cursor = Number(next) || 0;

      for (const key of keys ?? []) {
        scanned++;
        if (key.startsWith("rate-limit:")) rateLimitKeys++;

        // First segment is the namespace ("shipments:…", "lock:…").
        const namespace = key.split(":")[0] ?? "(root)";
        namespaceCounts.set(
          namespace,
          (namespaceCounts.get(namespace) ?? 0) + 1
        );
      }

      if (scanned >= SCAN_KEY_CAP) {
        truncated = cursor !== 0;
        break;
      }
    } while (cursor !== 0);

    const namespaces: QueueNamespace[] = [...namespaceCounts.entries()]
      .map(([name, keyCount]) => ({ name, keyCount }))
      .sort((a, b) => b.keyCount - a.keyCount);

    return {
      reachable: true,
      totalKeys: scanned,
      truncated,
      namespaces,
      latencyMs: Date.now() - startedAt,
      rateLimitKeys,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("[admin/sandbox] redis snapshot failed", error);
    return {
      reachable: false,
      totalKeys: 0,
      truncated: false,
      namespaces: [],
      latencyMs: Date.now() - startedAt,
      rateLimitKeys: 0,
      checkedAt: new Date().toISOString(),
    };
  }
}
