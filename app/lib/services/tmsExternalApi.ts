/**
 * ============================================================================
 * TMS (Transportation Management System) External Integration Layer
 * ============================================================================
 *
 * Companies choose ONE of two transport-management modes:
 *
 *   • "internal"  → LogiTrack's own routing/shipment engine (existing Route,
 *                   Shipment, Driver services). Nothing here is used.
 *   • "external"  → the company's OWN TMS (SAP TM, Oracle OTM, MercuryGate,
 *                   Alpega, a generic REST TMS, …), reached through the adapter
 *                   in this file.
 *
 * Both paths speak the SAME neutral DTOs so callers can switch modes without
 * changing their code. This mirrors `warehouseExternalApi.ts` (WMS) and
 * `vehicleTrackingExternalApi.ts` (tracking) — one consistent pattern across
 * every external system LogiTrack can plug into.
 *
 * Best practices baked in:
 *  - Provider-agnostic adapter behind `TmsAdapter` (+ registry/factory).
 *  - Timeouts on every request, bounded retries w/ jittered backoff.
 *  - Idempotent writes (idempotency keys) so retries never double-book loads.
 *  - Typed `TmsError` (retryable flag + upstream status).
 *  - HMAC-verified inbound status webhooks (constant-time compare).
 *  - Redis-cached reads that fail-open when the cache is unavailable.
 *  - Multi-tenant: every op scoped by `companyId`.
 *  - Self-contained: does NOT import the DB or internal services.
 *
 * Supported TMS operation groups:
 *   1. Load / shipment dispatch   → dispatchLoad / cancelLoad
 *   2. Carrier rate shopping      → getRateQuotes
 *   3. Shipment tracking status   → getLoadStatus (cached)
 *   4. Status webhooks (inbound)  → parseStatusWebhook (+ signature verify)
 *   5. Master data (carriers)     → pushCarrier
 *
 * IMPORTANT: server-only. Do not import from client components.
 */

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { redis } from "@/app/lib/redis";
import { logger } from "@/app/lib/logger";
import { AppError, ErrorCode } from "@/app/lib/errors";

// ─── Cache config ───────────────────────────────────────────────────────────
export const TMS_LOAD_STATUS_CACHE_TTL = 30; // seconds — status changes fast
export const TMS_RATE_QUOTE_CACHE_TTL = 300; // seconds — quotes are short-lived

const tmsCacheKeys = {
  loadStatus: (companyId: string, externalRef: string) =>
    `tms:${companyId}:load:${externalRef}`,
  rateQuote: (companyId: string, requestHash: string) =>
    `tms:${companyId}:quote:${requestHash}`,
};

// ─── Errors ─────────────────────────────────────────────────────────────────
export class TmsError extends AppError {
  public readonly provider: string;
  public readonly upstreamStatus?: number;
  public readonly retryable: boolean;

  constructor(
    message: string,
    opts: {
      provider: string;
      upstreamStatus?: number;
      retryable?: boolean;
      status?: number;
    }
  ) {
    super(message, ErrorCode.INTERNAL, opts.status ?? 502);
    this.name = "TmsError";
    this.provider = opts.provider;
    if (opts.upstreamStatus !== undefined)
      this.upstreamStatus = opts.upstreamStatus;
    this.retryable = opts.retryable ?? false;
  }
}

// ─── DTOs ───────────────────────────────────────────────────────────────────
// Neutral, provider-independent shapes. Adapters translate to/from these.
// Callers map these to Prisma models; this module never does DB work itself.

export type TmsMode = "internal" | "external";

export interface TmsAddress {
  name?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  country: string;
  postalCode?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface TmsStop {
  sequence: number;
  type: "PICKUP" | "DELIVERY";
  address: TmsAddress;
  /** Requested arrival window, ISO-8601. */
  windowStart?: string | null;
  windowEnd?: string | null;
  contactEmail?: string | null;
  notes?: string | null;
}

export type TmsServiceType = "STANDARD_FREIGHT" | "EXPRESS" | "HAZARDOUS";
export type TmsPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TmsEquipment = "DRY_VAN" | "REEFER" | "FLATBED" | "CONTAINER";

/** Cargo dimensions used for both rating and dispatch. */
export interface TmsFreight {
  weightKg?: number | null;
  volumeM3?: number | null;
  palletCount?: number | null;
  itemsCount?: number | null;
  cargoType?: string | null;
  hazmat?: boolean | null;
}

/** A load to dispatch to the external TMS. */
export interface TmsLoadRequest {
  /** LogiTrack's own reference — used as the idempotency key. */
  referenceNumber: string;
  serviceType?: TmsServiceType;
  priority?: TmsPriority;
  equipment?: TmsEquipment;
  freight: TmsFreight;
  stops: TmsStop[];
  /** Preferred carrier SCAC/id, if the shipper already picked one. */
  carrierRef?: string | null;
  slaDeadline?: string | null; // ISO-8601
  billingAccount?: string | null;
  notes?: string | null;
}

export type TmsLoadState =
  | "TENDERED"
  | "ACCEPTED"
  | "ASSIGNED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "DELAYED"
  | "CANCELLED"
  | "EXCEPTION"
  | "UNKNOWN";

export interface TmsLoadAck {
  /** The id the TMS assigned to the load. Persist for status lookups. */
  externalRef: string;
  state: TmsLoadState;
  carrierRef?: string | null;
  acceptedAt: string; // ISO-8601
}

export interface TmsLoadStatus {
  externalRef: string;
  state: TmsLoadState;
  carrierRef?: string | null;
  trackingNumber?: string | null;
  /** Latest known position, if the TMS relays telematics. */
  lat?: number | null;
  lng?: number | null;
  estimatedDelivery?: string | null; // ISO-8601
  updatedAt: string; // ISO-8601
}

// ── Rate shopping ──
export interface TmsRateRequest {
  origin: TmsAddress;
  destination: TmsAddress;
  freight: TmsFreight;
  serviceType?: TmsServiceType;
  equipment?: TmsEquipment;
  /** Requested pickup date, ISO-8601. */
  pickupDate?: string | null;
}

export interface TmsRateQuote {
  carrierRef: string;
  carrierName: string;
  /** Total price in minor units (e.g. cents) to avoid float drift. */
  totalAmountMinor: number;
  currency: string;
  transitDays?: number | null;
  serviceLevel?: string | null;
  /** Opaque token to book THIS quote, if the TMS supports quote→book. */
  quoteToken?: string | null;
  expiresAt?: string | null; // ISO-8601
}

// ── Master data ──
export interface TmsCarrier {
  ref: string; // SCAC / carrier id
  name: string;
  scac?: string | null;
  mcNumber?: string | null;
  contactEmail?: string | null;
}

// ── Webhook ──
export interface TmsStatusEvent {
  /** Provider's event id — use it for dedupe/idempotency on ingest. */
  eventId: string;
  externalRef: string;
  state: TmsLoadState;
  lat?: number | null;
  lng?: number | null;
  occurredAt: string; // ISO-8601
  raw?: unknown;
}

// ─── Adapter contract ───────────────────────────────────────────────────────
export interface TmsAdapter {
  readonly provider: string;

  /** (1) Tender/dispatch a load to the TMS. Idempotent on referenceNumber. */
  dispatchLoad(companyId: string, request: TmsLoadRequest): Promise<TmsLoadAck>;

  /** (1) Cancel a previously-dispatched load. */
  cancelLoad(
    companyId: string,
    externalRef: string,
    reason?: string
  ): Promise<void>;

  /** (2) Shop carrier rates for a lane. */
  getRateQuotes(
    companyId: string,
    request: TmsRateRequest
  ): Promise<TmsRateQuote[]>;

  /** (3) Poll a load's tracking status. */
  getLoadStatus(companyId: string, externalRef: string): Promise<TmsLoadStatus>;

  /** (5) Upsert carrier master data into the TMS. */
  pushCarrier(companyId: string, carrier: TmsCarrier): Promise<void>;

  /**
   * (4) Verify a webhook signature and decode its body into status events.
   * Return `null` when the signature is invalid — callers MUST reject then.
   */
  parseStatusWebhook(
    rawBody: string,
    headers: Record<string, string>
  ): TmsStatusEvent[] | null;
}

// ─── Shared HTTP helper (timeout + retry + typed errors) ────────────────────
interface TmsHttpConfig {
  baseUrl: string;
  apiKey: string;
  provider: string;
  timeoutMs: number;
  maxRetries: number;
}

interface TmsRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  idempotencyKey?: string;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * tr-API isteği atar
 * en-API isteği atar
 * input (cfg: TmsHttpConfig, opts: TmsRequestOptions)
 * output (Promise<T>)
 *
 */
async function tmsFetch<T>(
  cfg: TmsHttpConfig,
  opts: TmsRequestOptions
): Promise<T> {
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/${opts.path.replace(/^\//, "")}`;
  const method = opts.method ?? "GET";

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      const init: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${cfg.apiKey}`,
          ...(opts.idempotencyKey
            ? { "Idempotency-Key": opts.idempotencyKey }
            : {}),
          ...opts.headers,
        },
        signal: AbortSignal.timeout(cfg.timeoutMs),
      };
      if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
      const response = await fetch(url, init);

      if (response.ok) {
        const text = await response.text();
        return (text ? JSON.parse(text) : undefined) as T;
      }

      const retryable = RETRYABLE_STATUS.has(response.status);
      if (retryable && attempt < cfg.maxRetries) {
        logger.warn(`[tms:${cfg.provider}] retryable ${response.status}`, {
          path: opts.path,
          attempt,
        });
        await backoff(attempt);
        continue;
      }

      const detail = await safeReadText(response);
      throw new TmsError(
        `TMS ${method} ${opts.path} failed: ${response.status} ${response.statusText} ${detail}`.trim(),
        {
          provider: cfg.provider,
          upstreamStatus: response.status,
          retryable,
          status: response.status === 429 ? 429 : 502,
        }
      );
    } catch (err) {
      if (err instanceof TmsError && !err.retryable) throw err;
      if (attempt < cfg.maxRetries) {
        logger.warn(`[tms:${cfg.provider}] request failed, retrying`, {
          path: opts.path,
          attempt,
        });
        await backoff(attempt);
        continue;
      }
    }
  }

  throw new TmsError(
    `TMS ${cfg.provider} request to ${opts.path} exhausted retries`,
    { provider: cfg.provider, retryable: true }
  );
}

/**
 * tr-Tam jitter ile üssel geri çekilme: taban 200ms, maksimum 3s.
 * en-Exponential backoff with full jitter: base 200ms, capped at 3s.
 * input (attempt: number)
 * output (Promise<void>)
 *
 */
function backoff(attempt: number): Promise<void> {
  const capped = Math.min(200 * 2 ** attempt, 3000);
  return new Promise((resolve) => setTimeout(resolve, Math.random() * capped));
}

/**
 * tr-Aşağıdaki yanıt gövdesini güvenli bir şekilde okur (hataları yakalar ve ilk 500 karakterle sınırlı tutar)
 * en-Safely reads the response body below (catches errors and limits to first 500 characters)
 * input (response: Response)
 * output (Promise<string>)
 *
 */
async function safeReadText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return "";
  }
}

/**
 * tr-Sabit zamanlı HMAC-SHA256 imza kontrolü.
 * en-Constant-time HMAC-SHA256 signature check for webhooks.
 * input (rawBody: string, signature: string | undefined, secret: string)
 * output (boolean)
 *
 */
function verifyHmacSignature(
  rawBody: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signature.replace(/^sha256=/i, "").trim();
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * tr-Sabit hash of a rate request for cache keying.
 * en-Stable hash of a rate request for cache keying.
 * input (req: TmsRateRequest)
 * output (string)
 *
 */
function hashRateRequest(req: TmsRateRequest): string {
  return Buffer.from(JSON.stringify(req)).toString("base64").slice(0, 64);
}

// ─── Adapter: Generic REST TMS ──────────────────────────────────────────────
/**
 * Reference adapter for any TMS exposing a conventional JSON/REST API. Also a
 * good template: copy it and adjust paths/field mapping for a specific vendor
 * (SAP TM, Oracle OTM, MercuryGate, Alpega, project44, …).
 *
 * Env:
 *   TMS_BASE_URL, TMS_API_KEY, TMS_WEBHOOK_SECRET,
 *   TMS_TIMEOUT_MS (default 10000), TMS_MAX_RETRIES (default 2)
 */
class GenericRestTmsAdapter implements TmsAdapter {
  readonly provider: string = "generic-rest";
  private readonly cfg: TmsHttpConfig;
  private readonly webhookSecret: string;

  constructor(env: TmsEnv) {
    this.cfg = {
      baseUrl: env.baseUrl,
      apiKey: env.apiKey,
      provider: this.provider,
      timeoutMs: env.timeoutMs,
      maxRetries: env.maxRetries,
    };
    this.webhookSecret = env.webhookSecret;
  }

  /**
   * tr-Yükü harici TMS'ye gönderir.
   * en-Dispatches a load to the external TMS.
   * input (companyId: string, request: TmsLoadRequest)
   * output (Promise<TmsLoadAck>)
   *
   */
  async dispatchLoad(
    companyId: string,
    request: TmsLoadRequest
  ): Promise<TmsLoadAck> {
    const data = await tmsFetch<{
      externalRef: string;
      state?: string;
      carrierRef?: string;
    }>(this.cfg, {
      method: "POST",
      path: `/v1/loads`,
      headers: { "X-Tenant-Id": companyId },
      idempotencyKey: request.referenceNumber,
      body: request,
    });
    return {
      externalRef: data.externalRef,
      state: normalizeLoadState(data.state),
      carrierRef: data.carrierRef ?? null,
      acceptedAt: new Date().toISOString(),
    };
  }

  /**
   * tr-Yükü iptal eder.
   * en-Cancels a load.
   * input (companyId: string, externalRef: string, reason: string)
   * output (Promise<void>)
   *
   */
  async cancelLoad(
    companyId: string,
    externalRef: string,
    reason?: string
  ): Promise<void> {
    await tmsFetch<void>(this.cfg, {
      method: "DELETE",
      path: `/v1/loads/${encodeURIComponent(externalRef)}`,
      headers: { "X-Tenant-Id": companyId },
      body: reason ? { reason } : undefined,
    });
  }

  /**
   * tr-Nakliye teklifi alır.
   * en-Gets a rate quote.
   * input (companyId: string, request: TmsRateRequest)
   * output (Promise<TmsRateQuote[]>)
   *
   */
  async getRateQuotes(
    companyId: string,
    request: TmsRateRequest
  ): Promise<TmsRateQuote[]> {
    const data = await tmsFetch<{ quotes?: TmsRateQuote[] }>(this.cfg, {
      method: "POST",
      path: `/v1/rates`,
      headers: { "X-Tenant-Id": companyId },
      body: request,
    });
    return (data?.quotes ?? []).map((q) => ({
      carrierRef: q.carrierRef,
      carrierName: q.carrierName,
      totalAmountMinor: Number(q.totalAmountMinor ?? 0),
      currency: q.currency ?? "USD",
      transitDays: q.transitDays ?? null,
      serviceLevel: q.serviceLevel ?? null,
      quoteToken: q.quoteToken ?? null,
      expiresAt: q.expiresAt ?? null,
    }));
  }

  /**
   * tr-Yükün durumunu getirir.
   * en-Gets the status of a load.
   * input (companyId: string, externalRef: string)
   * output (Promise<TmsLoadStatus>)
   *
   */
  async getLoadStatus(
    companyId: string,
    externalRef: string
  ): Promise<TmsLoadStatus> {
    const data = await tmsFetch<{
      state?: string;
      carrierRef?: string;
      trackingNumber?: string;
      lat?: number;
      lng?: number;
      estimatedDelivery?: string;
      updatedAt?: string;
    }>(this.cfg, {
      method: "GET",
      path: `/v1/loads/${encodeURIComponent(externalRef)}`,
      headers: { "X-Tenant-Id": companyId },
    });
    return {
      externalRef,
      state: normalizeLoadState(data.state),
      carrierRef: data.carrierRef ?? null,
      trackingNumber: data.trackingNumber ?? null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      estimatedDelivery: data.estimatedDelivery ?? null,
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    };
  }

  /**
   * tr-Taşıyıcıyı harici TMS'ye gönderir.
   * en-Pushes a carrier to the external TMS.
   * input (companyId: string, carrier: TmsCarrier)
   * output (Promise<void>)
   *
   */
  async pushCarrier(companyId: string, carrier: TmsCarrier): Promise<void> {
    await tmsFetch<void>(this.cfg, {
      method: "PUT",
      path: `/v1/carriers/${encodeURIComponent(carrier.ref)}`,
      headers: { "X-Tenant-Id": companyId },
      idempotencyKey: `carrier:${carrier.ref}`,
      body: carrier,
    });
  }

  /**
   * tr-Durum webhook'unu ayrıştırır.
   * en-Parses the status webhook.
   * input (rawBody: string, headers: Record<string, string>)
   * output (TmsStatusEvent[] | null)
   *
   */
  parseStatusWebhook(
    rawBody: string,
    headers: Record<string, string>
  ): TmsStatusEvent[] | null {
    const sig =
      headers["x-tms-signature"] ??
      headers["X-Tms-Signature"] ??
      headers["x-signature"];
    if (!verifyHmacSignature(rawBody, sig, this.webhookSecret)) {
      logger.warn(
        `[tms:${this.provider}] webhook signature verification failed`
      );
      return null;
    }

    let payload: { events?: unknown[] };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      logger.warn(`[tms:${this.provider}] webhook body is not valid JSON`);
      return null;
    }

    const events = Array.isArray(payload.events) ? payload.events : [];
    return events.map((e) => {
      const ev = e as Record<string, unknown>;
      return {
        eventId: String(ev.id ?? ev.eventId ?? crypto.randomUUID()),
        externalRef: String(ev.externalRef ?? ev.loadRef ?? ""),
        state: normalizeLoadState(ev.state ?? ev.status),
        lat: numOrNull(ev.lat),
        lng: numOrNull(ev.lng),
        occurredAt: String(ev.occurredAt ?? new Date().toISOString()),
        raw: ev,
      };
    });
  }
}

// ─── Adapter: SAP TM (skeleton) ─────────────────────────────────────────────
/**
 * SAP TM speaks OData rather than the generic REST shape above. This adapter
 * isolates that — only paths/field mapping differ; the resilient transport,
 * DTOs and error handling are shared. Extend the overrides to match your SAP TM
 * OData services as the integration matures.
 *
 * Env: TMS_SAP_BASE_URL, TMS_SAP_API_KEY (reuses TMS_WEBHOOK_SECRET).
 */
class SapTmAdapter extends GenericRestTmsAdapter {
  override readonly provider = "sap-tm";
  // SAP-specific OData overrides go here (e.g. dispatchLoad → freight order).
}

// ─── Env / provider registry ────────────────────────────────────────────────
interface TmsEnv {
  baseUrl: string;
  apiKey: string;
  webhookSecret: string;
  timeoutMs: number;
  maxRetries: number;
}

/**
 * tr-Ortamı okur
 * en-Reads the environment
 * input (providerOverride: string)
 * output ({ provider: string; env: TmsEnv })
 *
 */
function readTmsEnv(providerOverride?: string): {
  provider: string;
  env: TmsEnv;
} {
  const provider = (
    providerOverride ??
    process.env.TMS_PROVIDER ??
    "generic-rest"
  ).toLowerCase();

  const isSap = provider === "sap-tm";
  const baseUrl =
    (isSap ? process.env.TMS_SAP_BASE_URL : process.env.TMS_BASE_URL) ?? "";
  const apiKey =
    (isSap ? process.env.TMS_SAP_API_KEY : process.env.TMS_API_KEY) ?? "";

  if (!baseUrl || !apiKey) {
    throw new TmsError(
      `TMS provider "${provider}" is not configured (missing base URL or API key).`,
      { provider, status: 500 }
    );
  }

  return {
    provider,
    env: {
      baseUrl,
      apiKey,
      webhookSecret: process.env.TMS_WEBHOOK_SECRET ?? "",
      timeoutMs: Number(process.env.TMS_TIMEOUT_MS ?? 10_000),
      maxRetries: Number(process.env.TMS_MAX_RETRIES ?? 2),
    },
  };
}

/**
 * tr-Bir şirketin TMS modunu çözer. Varsayılan olarak "internal" (LogiTrack'in kendi rota/gönderi motoru) kullanılır, `EXTERNAL_TMS_ENABLED=true` aksi belirtilmedikçe. Her şirket için geçersiz kılmak üzere açık bir mod geçersiz kılınabilir.
 * en-Resolve a company's TMS mode. Defaults to "internal" (LogiTrack's own routing/shipment engine) unless `EXTERNAL_TMS_ENABLED=true`. Pass an explicit mode to override per-company.
 * input (override: TmsMode)
 * output (TmsMode)
 *
 */
export function resolveTmsMode(override?: TmsMode): TmsMode {
  if (override) return override;
  return process.env.EXTERNAL_TMS_ENABLED === "true" ? "external" : "internal";
}

/**
 * tr-Ayarlanan (veya açıkça istenen) TMS adaptörü için factory. Bir tenant birden fazla TMS kullanıyorsa, belirli bir TMS'yi hedeflemek için `provider` geçersiz kılınabilir.
 * en-Factory for the configured (or explicitly requested) TMS adapter. Pass `provider` to target a specific TMS when a tenant uses more than one.
 * input (provider: string)
 * output (TmsAdapter)
 *
 */
export function getTmsAdapter(provider?: string): TmsAdapter {
  const { provider: resolved, env } = readTmsEnv(provider);
  switch (resolved) {
    case "sap-tm":
      return new SapTmAdapter(env);
    case "generic-rest":
      return new GenericRestTmsAdapter(env);
    default:
      throw new TmsError(`Unknown TMS provider "${resolved}"`, {
        provider: resolved,
        status: 500,
      });
  }
}

// ─── Normalizers ────────────────────────────────────────────────────────────
/**
 * tr-Yük durumunu normalleştirir
 * en-Normalizes the load state
 * input (state: unknown)
 * output (TmsLoadState)
 *
 */
function normalizeLoadState(state: unknown): TmsLoadState {
  const s = String(state ?? "").toUpperCase();
  switch (s) {
    case "TENDERED":
    case "CREATED":
    case "PENDING":
      return "TENDERED";
    case "ACCEPTED":
    case "CONFIRMED":
      return "ACCEPTED";
    case "ASSIGNED":
    case "DISPATCHED":
      return "ASSIGNED";
    case "IN_TRANSIT":
    case "PICKED_UP":
    case "ENROUTE":
      return "IN_TRANSIT";
    case "DELIVERED":
    case "POD":
      return "DELIVERED";
    case "DELAYED":
      return "DELAYED";
    case "CANCELLED":
    case "CANCELED":
      return "CANCELLED";
    case "EXCEPTION":
    case "ERROR":
    case "FAILED":
      return "EXCEPTION";
    default:
      return "UNKNOWN";
  }
}

/**
 * tr-Bir değerin sayısal değerini kontrol eder, sayısal değilse null döner
 * en-Checks a value for numeric value, returns null if not numeric
 * input (v: unknown)
 * output (number | null)
 *
 */
function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ─── High-level, cached convenience wrappers ────────────────────────────────
// These are the functions callers usually reach for. Writes are idempotent;
// reads are Redis-cached and degrade gracefully if Redis is unavailable.

/**
 * tr-Yükü aktif TMS'ye gönderir. `referenceNumber` üzerinden idempotent.
 * en-Dispatch a load to the active TMS. Idempotent on `referenceNumber`.
 * input (companyId: string, request: TmsLoadRequest, opts: { provider?: string })
 * output (Promise<TmsLoadAck>)
 *
 */
export async function dispatchLoadToTms(
  companyId: string,
  request: TmsLoadRequest,
  opts?: { provider?: string }
): Promise<TmsLoadAck> {
  const ack = await getTmsAdapter(opts?.provider).dispatchLoad(
    companyId,
    request
  );
  logger.info("[tms] load dispatched", {
    companyId,
    referenceNumber: request.referenceNumber,
    externalRef: ack.externalRef,
    state: ack.state,
  });
  return ack;
}

/**
 * tr-Gönderilen yükü iptal eder ve durumunu önbellekten siler.
 * en-Cancel a dispatched load and drop its cached status.
 * input (companyId: string, externalRef: string, reason: string, opts: { provider?: string })
 * output (Promise<void>)
 *
 */
export async function cancelTmsLoad(
  companyId: string,
  externalRef: string,
  reason?: string,
  opts?: { provider?: string }
): Promise<void> {
  await getTmsAdapter(opts?.provider).cancelLoad(
    companyId,
    externalRef,
    reason
  );
  try {
    await redis.del(tmsCacheKeys.loadStatus(companyId, externalRef));
  } catch {
    // Non-fatal: cache expires on its own TTL.
  }
}

/**
 * tr-Nakliye için taşıyıcı tarifelerini alır, kısa süreliğine önbelleğe alınır (teklifler kısa ömürlüdür).
 * en-Shop carrier rates for a lane, cached briefly (quotes are short-lived).
 * input (companyId: string, request: TmsRateRequest, opts: { provider?: string; forceRefresh?: boolean })
 * output (Promise<TmsRateQuote[]>)
 *
 */
export async function getTmsRateQuotes(
  companyId: string,
  request: TmsRateRequest,
  opts?: { provider?: string; forceRefresh?: boolean }
): Promise<TmsRateQuote[]> {
  const key = tmsCacheKeys.rateQuote(companyId, hashRateRequest(request));

  if (!opts?.forceRefresh) {
    try {
      const cached = await redis.get<TmsRateQuote[]>(key);
      if (cached) return cached;
    } catch (err) {
      logger.warn("[tms] rate quote cache get failed", err);
    }
  }

  const quotes = await getTmsAdapter(opts?.provider).getRateQuotes(
    companyId,
    request
  );

  try {
    await redis.set(key, quotes, { ex: TMS_RATE_QUOTE_CACHE_TTL });
  } catch (err) {
    logger.warn("[tms] rate quote cache set failed", err);
  }
  return quotes;
}

/**
 * tr-Yükün durumunu kontrol eder, kısa süreliğine önbelleğe alınır.
 * en-Poll a load's tracking status, cached briefly.
 * input (companyId: string, externalRef: string, opts: { provider?: string; forceRefresh?: boolean })
 * output (Promise<TmsLoadStatus>)
 *
 */
export async function getTmsLoadStatus(
  companyId: string,
  externalRef: string,
  opts?: { provider?: string; forceRefresh?: boolean }
): Promise<TmsLoadStatus> {
  const key = tmsCacheKeys.loadStatus(companyId, externalRef);

  if (!opts?.forceRefresh) {
    try {
      const cached = await redis.get<TmsLoadStatus>(key);
      if (cached) return cached;
    } catch (err) {
      logger.warn("[tms] load status cache get failed", err);
    }
  }

  const status = await getTmsAdapter(opts?.provider).getLoadStatus(
    companyId,
    externalRef
  );

  try {
    await redis.set(key, status, { ex: TMS_LOAD_STATUS_CACHE_TTL });
  } catch (err) {
    logger.warn("[tms] load status cache set failed", err);
  }
  return status;
}

/**
 * tr-Taşıyıcı ana verilerini TMS'ye kaydeder.
 * en-Upsert carrier master data into the TMS.
 * input (companyId: string, carrier: TmsCarrier, opts: { provider?: string })
 * output (Promise<void>)
 *
 */
export async function syncCarrierToTms(
  companyId: string,
  carrier: TmsCarrier,
  opts?: { provider?: string }
): Promise<void> {
  await getTmsAdapter(opts?.provider).pushCarrier(companyId, carrier);
  logger.info("[tms] carrier synced", { companyId, ref: carrier.ref });
}

/**
 * tr-Doğrula ve gelen TMS durum webhook'unu çöz. İmza geçersizse `null` döner — yönlendirme işleyicisi o zaman 401 yanıt vermelidir ve hiçbir şey almamalıdır. Başarılı olursa, normalize edilmiş durum olayları döndürür; çağıran, kendi sistemimize toplu işleme (dedupe by `eventId`) sorumluluğundadır.
 * en-Verify + decode an inbound TMS status webhook. Returns `null` when the signature is invalid — the route handler MUST then respond 401 and ingest nothing. On success it returns normalized status events; the caller is responsible for idempotent persistence (dedupe by `eventId`) into our own system.
 * input (rawBody: string, headers: Record<string, string>, opts: { provider?: string })
 * output (TmsStatusEvent[] | null)
 *
 */
export function ingestTmsStatusWebhook(
  rawBody: string,
  headers: Record<string, string>,
  opts?: { provider?: string }
): TmsStatusEvent[] | null {
  return getTmsAdapter(opts?.provider).parseStatusWebhook(rawBody, headers);
}
