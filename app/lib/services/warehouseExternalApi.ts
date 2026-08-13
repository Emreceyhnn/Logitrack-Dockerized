/**
 * ============================================================================
 * WMS (Warehouse Management System) External Integration Layer
 * ============================================================================
 *
 * A SELF-CONTAINED integration boundary between LogiTrack and any number of
 * external WMS providers (SAP EWM, Manhattan, a generic REST WMS, …).
 *
 * Design goals / best practices baked in:
 *  - **Provider-agnostic adapter pattern.** All WMS-specific quirks live behind
 *    the `WmsAdapter` interface. The rest of the app talks DTOs, never vendor
 *    payloads. Add a new WMS by writing one adapter + registering it.
 *  - **Separate system.** This module NEVER imports the internal DB (`db`) or
 *    domain services. It only exposes/consumes plain DTOs. Callers (server
 *    actions/controllers) own the mapping to our Prisma models, so our own
 *    system stays exactly as it is.
 *  - **Resilient by default.** Every outbound call has a timeout, bounded
 *    retries with exponential backoff + jitter, and typed errors. Reads are
 *    cached in Redis; writes are idempotent (idempotency keys).
 *  - **Multi-tenant.** Every operation is scoped by `companyId` so one WMS
 *    connection can serve many tenants without cross-contamination.
 *  - **Observable.** Structured logging via the shared `logger` (PII-masked).
 *
 * The four supported operation groups:
 *   1. Stock synchronization      → pullInventory / pushInventoryLevels
 *   2. Shipment / order push      → pushShipment / getShipmentStatus
 *   3. Stock movements (webhook)  → parseMovementWebhook (+ signature verify)
 *   4. Warehouse master data      → pushWarehouse
 *
 * IMPORTANT: server-only. Do not import from client components.
 */

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { redis } from "@/app/lib/redis";
import { logger } from "@/app/lib/logger";
import { AppError, ErrorCode } from "@/app/lib/errors";

// ─── Cache config ───────────────────────────────────────────────────────────
/** WMS reads are cached briefly — stock moves fast, so keep TTL short. */
export const WMS_INVENTORY_CACHE_TTL = 60; // seconds
export const WMS_SHIPMENT_STATUS_CACHE_TTL = 30; // seconds

const wmsCacheKeys = {
  inventory: (companyId: string, warehouseCode: string) =>
    `wms:${companyId}:inv:${warehouseCode}`,
  shipmentStatus: (companyId: string, externalRef: string) =>
    `wms:${companyId}:ship:${externalRef}`,
};

// ─── Errors ─────────────────────────────────────────────────────────────────
/**
 * Raised for any failure originating from a WMS provider. Carries the provider
 * id and (when available) the upstream HTTP status so callers can decide
 * whether to surface, retry, or degrade gracefully.
 */
export class WmsError extends AppError {
  public readonly provider: string;
  public readonly upstreamStatus?: number;
  /** True when the failure is transient and a later retry may succeed. */
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
    this.name = "WmsError";
    this.provider = opts.provider;
    if (opts.upstreamStatus !== undefined)
      this.upstreamStatus = opts.upstreamStatus;
    this.retryable = opts.retryable ?? false;
  }
}

// ─── DTOs ───────────────────────────────────────────────────────────────────
// Neutral, provider-independent shapes. Adapters translate to/from these.
// Callers map these to Prisma models; this module never does DB work itself.

/** Canonical movement types shared across WMS providers. Superset-friendly. */
export type WmsMovementType =
  | "STOCK_IN"
  | "PUTAWAY"
  | "PICK"
  | "PACK"
  | "RESTOCK"
  | "ADJUSTMENT"
  | "ALLOCATION"
  | "TRANSFER"
  | "UNKNOWN";

export interface WmsInventoryLevel {
  sku: string;
  /** On-hand physical quantity. */
  quantity: number;
  /** Quantity reserved/allocated to orders and unavailable to promise. */
  allocatedQuantity: number;
  /** Optional bin/zone location code within the warehouse. */
  zone?: string | null;
  unit?: string | null;
  /** Provider's own timestamp for this level, ISO-8601. */
  updatedAt?: string | null;
}

export interface WmsInventorySnapshot {
  warehouseCode: string;
  levels: WmsInventoryLevel[];
  /** When LogiTrack fetched this snapshot, ISO-8601. */
  fetchedAt: string;
}

/** Push a corrected/authoritative level from LogiTrack → WMS. */
export interface WmsInventoryLevelUpdate {
  sku: string;
  quantity: number;
  zone?: string | null;
  reason?: string | null;
}

export interface WmsAddress {
  name?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  country: string;
  postalCode?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface WmsShipmentLine {
  sku: string;
  quantity: number;
}

export interface WmsShipmentRequest {
  /** LogiTrack's own reference — used as the idempotency key. */
  referenceNumber: string;
  warehouseCode: string;
  /** Outbound = fulfilment/dispatch, Inbound = receiving. */
  direction: "OUTBOUND" | "INBOUND";
  lines: WmsShipmentLine[];
  shipTo?: WmsAddress | null;
  requestedShipDate?: string | null; // ISO-8601
  carrier?: string | null;
  notes?: string | null;
}

export type WmsShipmentState =
  | "RECEIVED"
  | "ALLOCATED"
  | "PICKING"
  | "PACKED"
  | "SHIPPED"
  | "CANCELLED"
  | "EXCEPTION"
  | "UNKNOWN";

export interface WmsShipmentAck {
  /** The id the WMS assigned to the order. Persist this for status lookups. */
  externalRef: string;
  state: WmsShipmentState;
  acceptedAt: string; // ISO-8601
}

export interface WmsShipmentStatus {
  externalRef: string;
  state: WmsShipmentState;
  trackingNumber?: string | null;
  updatedAt: string; // ISO-8601
}

export interface WmsWarehouseMasterData {
  code: string;
  name: string;
  address: WmsAddress;
  timezone?: string | null;
  operatingHours?: string | null;
}

/** Normalized movement event decoded from a provider webhook. */
export interface WmsMovementEvent {
  /** Provider's event id — use it for dedupe/idempotency on ingest. */
  eventId: string;
  warehouseCode: string;
  sku: string;
  type: WmsMovementType;
  /** Signed delta: positive = increase, negative = decrease. */
  quantity: number;
  occurredAt: string; // ISO-8601
  raw?: unknown;
}

// ─── Adapter contract ───────────────────────────────────────────────────────
/**
 * Every WMS provider is implemented as one `WmsAdapter`. All methods are
 * tenant-scoped via `companyId`. Adapters must be stateless & safe to reuse.
 */
export interface WmsAdapter {
  readonly provider: string;

  /** (1) Pull current stock levels for a warehouse. */
  pullInventory(
    companyId: string,
    warehouseCode: string
  ): Promise<WmsInventorySnapshot>;

  /** (1) Push authoritative levels LogiTrack → WMS (e.g. after a count). */
  pushInventoryLevels(
    companyId: string,
    warehouseCode: string,
    updates: WmsInventoryLevelUpdate[]
  ): Promise<void>;

  /** (2) Create/dispatch an outbound or inbound order in the WMS. */
  pushShipment(
    companyId: string,
    request: WmsShipmentRequest
  ): Promise<WmsShipmentAck>;

  /** (2) Poll a previously-pushed order's fulfilment status. */
  getShipmentStatus(
    companyId: string,
    externalRef: string
  ): Promise<WmsShipmentStatus>;

  /** (4) Upsert warehouse master data into the WMS. */
  pushWarehouse(
    companyId: string,
    warehouse: WmsWarehouseMasterData
  ): Promise<void>;

  /**
   * (3) Verify a webhook signature and decode its body into movement events.
   * Return `null` when the signature is invalid — callers MUST reject then.
   */
  parseMovementWebhook(
    rawBody: string,
    headers: Record<string, string>
  ): WmsMovementEvent[] | null;
}

// ─── Shared HTTP helper (timeout + retry + typed errors) ────────────────────
interface WmsHttpConfig {
  baseUrl: string;
  apiKey: string;
  provider: string;
  timeoutMs: number;
  maxRetries: number;
}

interface WmsRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH";
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Idempotency key for safe retries of writes. */
  idempotencyKey?: string;
}

/** HTTP statuses worth retrying — transient upstream/network conditions. */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * tr-WMS için HTTP isteği gerçekleştirir
 * en-Performs an HTTP request for WMS
 * input (cfg: WmsHttpConfig, opts: WmsRequestOptions)
 * output (Promise<T>)
 *
 */
async function wmsFetch<T>(
  cfg: WmsHttpConfig,
  opts: WmsRequestOptions
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
        // 204 / empty body → undefined
        const text = await response.text();
        return (text ? JSON.parse(text) : undefined) as T;
      }

      const retryable = RETRYABLE_STATUS.has(response.status);
      // Retry transient statuses; otherwise fail fast with the body for context.
      if (retryable && attempt < cfg.maxRetries) {
        logger.warn(`[wms:${cfg.provider}] retryable ${response.status}`, {
          path: opts.path,
          attempt,
        });
        await backoff(attempt);
        continue;
      }

      const detail = await safeReadText(response);
      throw new WmsError(
        `WMS ${method} ${opts.path} failed: ${response.status} ${response.statusText} ${detail}`.trim(),
        {
          provider: cfg.provider,
          upstreamStatus: response.status,
          retryable,
          status: response.status === 429 ? 429 : 502,
        }
      );
    } catch (err) {
      // Network error / timeout (AbortError) — retryable up to the limit.
      if (err instanceof WmsError && !err.retryable) throw err;
      if (attempt < cfg.maxRetries) {
        logger.warn(`[wms:${cfg.provider}] request failed, retrying`, {
          path: opts.path,
          attempt,
        });
        await backoff(attempt);
        continue;
      }
    }
  }

  throw new WmsError(
    `WMS ${cfg.provider} request to ${opts.path} exhausted retries`,
    { provider: cfg.provider, retryable: true }
  );
}

/**
 * tr-Kademeli geri çekilme
 * en-Exponential backoff with full jitter: base 200ms, capped at 3s.
 * input (attempt: number)
 * output (Promise<void>)
 *
 */
function backoff(attempt: number): Promise<void> {
  const capped = Math.min(200 * 2 ** attempt, 3000);
  const delay = Math.random() * capped;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * tr-Güvenli metin okuma
 * en-Safe text reading
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
 * tr- Sabit zamanlı HMAC-SHA256 imza kontrolü
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
  // Normalize common "sha256=" prefixes.
  const provided = signature.replace(/^sha256=/i, "").trim();
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ─── Adapter: Generic REST WMS ──────────────────────────────────────────────
/**
 * Reference adapter for any WMS exposing a conventional JSON/REST API. Also a
 * good template: copy it and adjust paths/field mapping for a specific vendor.
 *
 * Env:
 *   WMS_BASE_URL, WMS_API_KEY, WMS_WEBHOOK_SECRET,
 *   WMS_TIMEOUT_MS (default 10000), WMS_MAX_RETRIES (default 2)
 */
class GenericRestWmsAdapter implements WmsAdapter {
  readonly provider: string = "generic-rest";
  private readonly cfg: WmsHttpConfig;
  private readonly webhookSecret: string;

  constructor(env: WmsEnv) {
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
   * tr-Envanteri çeker
   * en-Pulls inventory
   * input (companyId: string, warehouseCode: string)
   * output (Promise<WmsInventorySnapshot>)
   *
   */
  async pullInventory(
    companyId: string,
    warehouseCode: string
  ): Promise<WmsInventorySnapshot> {
    const data = await wmsFetch<{ levels: WmsInventoryLevel[] }>(this.cfg, {
      method: "GET",
      path: `/v1/warehouses/${encodeURIComponent(warehouseCode)}/inventory`,
      headers: { "X-Tenant-Id": companyId },
    });
    return {
      warehouseCode,
      levels: (data?.levels ?? []).map((l) => ({
        sku: l.sku,
        quantity: l.quantity ?? 0,
        allocatedQuantity: l.allocatedQuantity ?? 0,
        zone: l.zone ?? null,
        unit: l.unit ?? null,
        updatedAt: l.updatedAt ?? null,
      })),
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * tr-Envanter seviyelerini gönderir
   * en-Sends inventory levels
   * input (companyId: string, warehouseCode: string, updates: WmsInventoryLevelUpdate[])
   * output (Promise<void>)
   *
   */
  async pushInventoryLevels(
    companyId: string,
    warehouseCode: string,
    updates: WmsInventoryLevelUpdate[]
  ): Promise<void> {
    if (updates.length === 0) return;
    await wmsFetch<void>(this.cfg, {
      method: "PUT",
      path: `/v1/warehouses/${encodeURIComponent(warehouseCode)}/inventory`,
      headers: { "X-Tenant-Id": companyId },
      body: { updates },
    });
  }

  /**
   * tr-Sevkiyat isteğini gönderir
   * en-Sends shipment request
   * input (companyId: string, request: WmsShipmentRequest)
   * output (Promise<WmsShipmentAck>)
   *
   */
  async pushShipment(
    companyId: string,
    request: WmsShipmentRequest
  ): Promise<WmsShipmentAck> {
    const data = await wmsFetch<{ externalRef: string; state?: string }>(
      this.cfg,
      {
        method: "POST",
        path: `/v1/orders`,
        headers: { "X-Tenant-Id": companyId },
        // referenceNumber makes the create idempotent across retries.
        idempotencyKey: request.referenceNumber,
        body: request,
      }
    );
    return {
      externalRef: data.externalRef,
      state: normalizeShipmentState(data.state),
      acceptedAt: new Date().toISOString(),
    };
  }

  /**
   * tr-Sevkiyat durumunu alır
   * en-Gets shipment status
   * input (companyId: string, externalRef: string)
   * output (Promise<WmsShipmentStatus>)
   *
   */
  async getShipmentStatus(
    companyId: string,
    externalRef: string
  ): Promise<WmsShipmentStatus> {
    const data = await wmsFetch<{
      state?: string;
      trackingNumber?: string;
      updatedAt?: string;
    }>(this.cfg, {
      method: "GET",
      path: `/v1/orders/${encodeURIComponent(externalRef)}`,
      headers: { "X-Tenant-Id": companyId },
    });
    return {
      externalRef,
      state: normalizeShipmentState(data.state),
      trackingNumber: data.trackingNumber ?? null,
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    };
  }

  /**
   * tr-Depo ana verilerini gönderir
   * en-Sends warehouse master data
   * input (companyId: string, warehouse: WmsWarehouseMasterData)
   * output (Promise<void>)
   *
   */
  async pushWarehouse(
    companyId: string,
    warehouse: WmsWarehouseMasterData
  ): Promise<void> {
    await wmsFetch<void>(this.cfg, {
      method: "PUT",
      path: `/v1/warehouses/${encodeURIComponent(warehouse.code)}`,
      headers: { "X-Tenant-Id": companyId },
      idempotencyKey: `wh:${warehouse.code}`,
      body: warehouse,
    });
  }

  /**
   * tr-Hareket webhook'unu ayrıştırır
   * en-Parses movement webhook
   * input (rawBody: string, headers: Record<string, string>)
   * output (WmsMovementEvent[] | null)
   *
   */
  parseMovementWebhook(
    rawBody: string,
    headers: Record<string, string>
  ): WmsMovementEvent[] | null {
    const sig =
      headers["x-wms-signature"] ??
      headers["X-Wms-Signature"] ??
      headers["x-signature"];
    if (!verifyHmacSignature(rawBody, sig, this.webhookSecret)) {
      logger.warn(
        `[wms:${this.provider}] webhook signature verification failed`
      );
      return null;
    }

    let payload: { events?: unknown[] };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      logger.warn(`[wms:${this.provider}] webhook body is not valid JSON`);
      return null;
    }

    const events = Array.isArray(payload.events) ? payload.events : [];
    return events.map((e) => {
      const ev = e as Record<string, unknown>;
      return {
        eventId: String(ev.id ?? ev.eventId ?? crypto.randomUUID()),
        warehouseCode: String(ev.warehouseCode ?? ""),
        sku: String(ev.sku ?? ""),
        type: normalizeMovementType(ev.type),
        quantity: Number(ev.quantity ?? 0),
        occurredAt: String(ev.occurredAt ?? new Date().toISOString()),
        raw: ev,
      };
    });
  }
}

// ─── Adapter: SAP EWM (skeleton) ────────────────────────────────────────────
/**
 * SAP EWM speaks OData/IDoc rather than the generic REST shape above. This
 * adapter isolates that: only the paths and field mapping differ — the
 * resilient `wmsFetch` transport, DTOs, and error handling are shared.
 *
 * Extend the field mapping to match your EWM OData services; the structure is
 * intentionally identical to the generic adapter so it stays maintainable.
 *
 * Env: WMS_SAP_BASE_URL, WMS_SAP_API_KEY (reuses WMS_WEBHOOK_SECRET).
 */
class SapEwmAdapter extends GenericRestWmsAdapter {
  override readonly provider = "sap-ewm";
  // NOTE: SAP-specific overrides go here as the integration matures, e.g.
  //   override async pullInventory(...) { /* OData $filter query */ }
  // For now it inherits the generic REST behaviour so a single base URL that
  // fronts an EWM-compatible gateway works out of the box.
}

// ─── Provider registry ──────────────────────────────────────────────────────
interface WmsEnv {
  baseUrl: string;
  apiKey: string;
  webhookSecret: string;
  timeoutMs: number;
  maxRetries: number;
}

/**
 * tr-ortam değişkenlerini çağrı zamanında çözer
 * en-Resolve env at call-time (not module load) so vars set after import — e.g. in tests or serverless cold-start config — are respected. Mirrors the pattern used by `exchangeRate.ts`.
 * input (providerOverride: string)
 * output ({ provider: string; env: WmsEnv; })
 *
 */
function readWmsEnv(providerOverride?: string): {
  provider: string;
  env: WmsEnv;
} {
  const provider = (
    providerOverride ??
    process.env.WMS_PROVIDER ??
    "generic-rest"
  ).toLowerCase();

  const isSap = provider === "sap-ewm";
  const baseUrl =
    (isSap ? process.env.WMS_SAP_BASE_URL : process.env.WMS_BASE_URL) ?? "";
  const apiKey =
    (isSap ? process.env.WMS_SAP_API_KEY : process.env.WMS_API_KEY) ?? "";

  if (!baseUrl || !apiKey) {
    throw new WmsError(
      `WMS provider "${provider}" is not configured (missing base URL or API key).`,
      { provider, status: 500 }
    );
  }

  return {
    provider,
    env: {
      baseUrl,
      apiKey,
      webhookSecret: process.env.WMS_WEBHOOK_SECRET ?? "",
      timeoutMs: Number(process.env.WMS_TIMEOUT_MS ?? 10_000),
      maxRetries: Number(process.env.WMS_MAX_RETRIES ?? 2),
    },
  };
}

/**
 * tr-Ortam değişkenleri için factory
 * en-Factory for the configured (or explicitly requested) WMS adapter. Pass `provider` to target a specific WMS when a tenant uses more than one.
 * input (provider: string)
 * output (WmsAdapter)
 *
 */
export function getWmsAdapter(provider?: string): WmsAdapter {
  const { provider: resolved, env } = readWmsEnv(provider);
  switch (resolved) {
    case "sap-ewm":
      return new SapEwmAdapter(env);
    case "generic-rest":
      return new GenericRestWmsAdapter(env);
    default:
      throw new WmsError(`Unknown WMS provider "${resolved}"`, {
        provider: resolved,
        status: 500,
      });
  }
}

// ─── Normalizers ────────────────────────────────────────────────────────────
/**
 * tr-Sevkiyat durumunu normalleştirir
 * en-Normalizes shipment state
 * input (state: unknown)
 * output (WmsShipmentState)
 *
 */
function normalizeShipmentState(state: unknown): WmsShipmentState {
  const s = String(state ?? "").toUpperCase();
  switch (s) {
    case "RECEIVED":
    case "CREATED":
      return "RECEIVED";
    case "ALLOCATED":
      return "ALLOCATED";
    case "PICKING":
    case "IN_PICKING":
      return "PICKING";
    case "PACKED":
      return "PACKED";
    case "SHIPPED":
    case "DISPATCHED":
      return "SHIPPED";
    case "CANCELLED":
    case "CANCELED":
      return "CANCELLED";
    case "EXCEPTION":
    case "ERROR":
      return "EXCEPTION";
    default:
      return "UNKNOWN";
  }
}

/**
 * tr-Hareket türünü normalleştirir
 * en-Normalizes movement type
 * input (type: unknown)
 * output (WmsMovementType)
 *
 */
function normalizeMovementType(type: unknown): WmsMovementType {
  const t = String(type ?? "").toUpperCase();
  switch (t) {
    case "STOCK_IN":
    case "RECEIPT":
    case "GOODS_RECEIPT":
      return "STOCK_IN";
    case "PUTAWAY":
      return "PUTAWAY";
    case "PICK":
      return "PICK";
    case "PACK":
      return "PACK";
    case "RESTOCK":
    case "REPLENISH":
      return "RESTOCK";
    case "ADJUSTMENT":
    case "COUNT":
      return "ADJUSTMENT";
    case "ALLOCATION":
    case "RESERVE":
      return "ALLOCATION";
    case "TRANSFER":
      return "TRANSFER";
    default:
      return "UNKNOWN";
  }
}

// ─── High-level, cached convenience wrappers ────────────────────────────────
// These are the functions callers usually reach for. Reads are Redis-cached;
// they degrade gracefully if Redis is unavailable (fail-open on cache).

/**
 * tr-Bir deponun stok seviyelerini aktif WMS'ten çeker, `WMS_INVENTORY_CACHE_TTL` süresince önbelleğe alınır. Çağrılar anlık görüntüyü kendi modellerine eşler.
 * en-Pull a warehouse's stock levels from the active WMS, cached for `WMS_INVENTORY_CACHE_TTL`. Callers map the snapshot onto their own models.
 * input (companyId: string, warehouseCode: string, opts: { provider?: string; forceRefresh?: boolean })
 * output (Promise<WmsInventorySnapshot>)
 *
 */
export async function getWmsInventory(
  companyId: string,
  warehouseCode: string,
  opts?: { provider?: string; forceRefresh?: boolean }
): Promise<WmsInventorySnapshot> {
  const key = wmsCacheKeys.inventory(companyId, warehouseCode);

  if (!opts?.forceRefresh) {
    try {
      const cached = await redis.get<WmsInventorySnapshot>(key);
      if (cached) return cached;
    } catch (err) {
      logger.warn("[wms] inventory cache get failed", err);
    }
  }

  const snapshot = await getWmsAdapter(opts?.provider).pullInventory(
    companyId,
    warehouseCode
  );

  try {
    await redis.set(key, snapshot, { ex: WMS_INVENTORY_CACHE_TTL });
  } catch (err) {
    logger.warn("[wms] inventory cache set failed", err);
  }
  return snapshot;
}

/**
 * tr-Envanter seviyelerini WMS'e gönderir ve okuma önbelleğini temizler.
 * en-Push authoritative stock levels (e.g. after a physical count) to the WMS and drop the read cache so the next pull reflects the correction.
 * input (companyId: string, warehouseCode: string, updates: WmsInventoryLevelUpdate[], opts: { provider?: string })
 * output (Promise<void>)
 *
 */
export async function syncWmsInventoryLevels(
  companyId: string,
  warehouseCode: string,
  updates: WmsInventoryLevelUpdate[],
  opts?: { provider?: string }
): Promise<void> {
  await getWmsAdapter(opts?.provider).pushInventoryLevels(
    companyId,
    warehouseCode,
    updates
  );
  try {
    await redis.del(wmsCacheKeys.inventory(companyId, warehouseCode));
  } catch {
    // Non-fatal: cache will expire on its own TTL.
  }
}

/**
 * tr-WMS'e bir sipariş oluşturur/gönderir. `referenceNumber` üzerinden idempotent.
 * en-Create/dispatch an order in the WMS. Idempotent on `referenceNumber`.
 * input (companyId: string, request: WmsShipmentRequest, opts: { provider?: string })
 * output (Promise<WmsShipmentAck>)
 *
 */
export async function pushShipmentToWms(
  companyId: string,
  request: WmsShipmentRequest,
  opts?: { provider?: string }
): Promise<WmsShipmentAck> {
  const ack = await getWmsAdapter(opts?.provider).pushShipment(
    companyId,
    request
  );
  logger.info("[wms] shipment pushed", {
    companyId,
    referenceNumber: request.referenceNumber,
    externalRef: ack.externalRef,
    state: ack.state,
  });
  return ack;
}

/**
 * tr-WMS'teki siparişin durumunu alır, kısa süreli önbelleğe alınır.
 * en-Poll a pushed order's fulfilment status, cached briefly.
 * input (companyId: string, externalRef: string, opts: { provider?: string; forceRefresh?: boolean })
 * output (Promise<WmsShipmentStatus>)
 *
 */
export async function getWmsShipmentStatus(
  companyId: string,
  externalRef: string,
  opts?: { provider?: string; forceRefresh?: boolean }
): Promise<WmsShipmentStatus> {
  const key = wmsCacheKeys.shipmentStatus(companyId, externalRef);

  if (!opts?.forceRefresh) {
    try {
      const cached = await redis.get<WmsShipmentStatus>(key);
      if (cached) return cached;
    } catch (err) {
      logger.warn("[wms] shipment status cache get failed", err);
    }
  }

  const status = await getWmsAdapter(opts?.provider).getShipmentStatus(
    companyId,
    externalRef
  );

  try {
    await redis.set(key, status, { ex: WMS_SHIPMENT_STATUS_CACHE_TTL });
  } catch (err) {
    logger.warn("[wms] shipment status cache set failed", err);
  }
  return status;
}

/**
 * tr-Depo ana verilerini WMS'e gönderir
 * en-Upsert warehouse master data into the WMS.
 * input (companyId: string, warehouse: WmsWarehouseMasterData, opts: { provider?: string })
 * output (Promise<void>)
 *
 */
export async function syncWarehouseToWms(
  companyId: string,
  warehouse: WmsWarehouseMasterData,
  opts?: { provider?: string }
): Promise<void> {
  await getWmsAdapter(opts?.provider).pushWarehouse(companyId, warehouse);
  logger.info("[wms] warehouse master data synced", {
    companyId,
    code: warehouse.code,
  });
}

/**
 * tr-WMS gelen hareket webhook'unu doğrular ve ayrıştırır. İmza geçersizse `null` döner — route handler 401 yanıtı vermeli ve hiçbir veri işlememeli. Başarılı olduğunda normalize edilmiş hareket olayları döndürülür; çağran, `eventId` bazlı idempotent kalıcılıktan sorumludur.
 * en-Verify + decode an inbound WMS movement webhook. Returns `null` when the signature is invalid — the route handler MUST then respond 401 and ingest nothing. On success it returns normalized movement events; the caller is responsible for idempotent persistence (dedupe by `eventId`) into our own system.
 * input (rawBody: string, headers: Record<string, string>, opts: { provider?: string })
 * output (WmsMovementEvent[] | null)
 *
 */
export function ingestWmsMovementWebhook(
  rawBody: string,
  headers: Record<string, string>,
  opts?: { provider?: string }
): WmsMovementEvent[] | null {
  return getWmsAdapter(opts?.provider).parseMovementWebhook(rawBody, headers);
}
