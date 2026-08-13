/**
 * ============================================================================
 * Vehicle Tracking — External Integration Layer
 * ============================================================================
 *
 * Companies choose ONE of two tracking modes:
 *
 *   • "internal"  → LogiTrack's own Firebase RTDB pipeline (see
 *                   `app/lib/vehicleTracking.ts`). Nothing here is used.
 *   • "external"  → the company's OWN GPS/telematics provider, reached over a
 *                   REST + WebSocket API through the adapter in this file.
 *
 * Both paths speak the SAME neutral DTOs (`VehicleLocation`, `VehicleTelemetry`,
 * `EmergencyEvent`) so callers can switch modes without changing their code.
 *
 * Best practices baked in (mirrors `warehouseExternalApi.ts`):
 *  - Provider-agnostic adapter behind `VehicleTrackingAdapter`.
 *  - Timeouts on every request, bounded retries w/ jittered backoff.
 *  - Typed `TrackingError` (retryable flag + upstream status).
 *  - Structured logging via the shared `logger` (never raw console).
 *  - Call-time env resolution so late-set vars/tests are respected.
 *  - Self-contained: does NOT import the DB or internal services.
 *
 * IMPORTANT: server-only. Do not import from client components.
 */

import "server-only";
import WebSocket from "ws";
import { logger } from "@/app/lib/logger";
import { AppError, ErrorCode } from "@/app/lib/errors";
import type { VehicleLocation } from "@/app/lib/type/vehicle";

// ─── DTOs ───────────────────────────────────────────────────────────────────
// `VehicleLocation` is reused from the internal type so both modes are
// interchangeable. Telemetry & emergency are neutral supersets.

export interface VehicleTelemetry {
  plate: string;
  speedKph?: number | null;
  heading?: number | null;
  fuelLevelPct?: number | null;
  engineOn?: boolean | null;
  odometerKm?: number | null;
  /** ISO-8601 provider timestamp. */
  updatedAt: string;
  /** Provider-specific extras preserved verbatim. */
  raw?: unknown;
}

export interface EmergencyEvent {
  plate: string;
  kind: string;
  message?: string | null;
  lat?: number | null;
  lng?: number | null;
  occurredAt: string; // ISO-8601
  raw?: unknown;
}

/** Which tracking backend a company uses. */
export type VehicleTrackingMode = "internal" | "external";

// ─── Errors ─────────────────────────────────────────────────────────────────
export class TrackingError extends AppError {
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
    this.name = "TrackingError";
    this.provider = opts.provider;
    if (opts.upstreamStatus !== undefined)
      this.upstreamStatus = opts.upstreamStatus;
    this.retryable = opts.retryable ?? false;
  }
}

// ─── Adapter contract ───────────────────────────────────────────────────────
export interface VehicleTrackingAdapter {
  readonly provider: string;

  /** Last known location for a plate. */
  getVehicleLocation(plate: string): Promise<VehicleLocation>;

  /** Full telemetry snapshot for a plate. */
  getVehicleTelemetry(plate: string): Promise<VehicleTelemetry>;

  /**
   * Subscribe to emergency notifications. Returns an unsubscribe function.
   * Handles reconnection internally; `onError` is advisory.
   */
  subscribeToEmergencies(
    onEmergency: (event: EmergencyEvent) => void,
    onError?: (error: Error) => void
  ): () => void;
}

// ─── Shared HTTP helper (timeout + retry + typed errors) ────────────────────
interface TrackingHttpConfig {
  baseUrl: string;
  apiKey: string;
  provider: string;
  timeoutMs: number;
  maxRetries: number;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * tr-Araç takip API'si için HTTP isteği gerçekleştirir
 * en-Performs an HTTP request for the vehicle tracking API
 * input (cfg: TrackingHttpConfig, path: string)
 * output (Promise<T>)
 *
 */
async function trackingFetch<T>(
  cfg: TrackingHttpConfig,
  path: string
): Promise<T> {
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        signal: AbortSignal.timeout(cfg.timeoutMs),
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      const retryable = RETRYABLE_STATUS.has(response.status);
      if (retryable && attempt < cfg.maxRetries) {
        logger.warn(`[tracking:${cfg.provider}] retryable ${response.status}`, {
          path,
          attempt,
        });
        await backoff(attempt);
        continue;
      }

      throw new TrackingError(
        `Tracking GET ${path} failed: ${response.status} ${response.statusText}`,
        {
          provider: cfg.provider,
          upstreamStatus: response.status,
          retryable,
          status: response.status === 429 ? 429 : 502,
        }
      );
    } catch (err) {
      if (err instanceof TrackingError && !err.retryable) throw err;
      if (attempt < cfg.maxRetries) {
        logger.warn(`[tracking:${cfg.provider}] request failed, retrying`, {
          path,
          attempt,
        });
        await backoff(attempt);
        continue;
      }
    }
  }

  throw new TrackingError(
    `Tracking ${cfg.provider} request to ${path} exhausted retries`,
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
  return new Promise((resolve) => setTimeout(resolve, Math.random() * capped));
}

// ─── Adapter: Generic REST/WS telematics ────────────────────────────────────
/**
 * Reference adapter for a conventional GPS/telematics provider exposing REST
 * for reads and a WebSocket for emergency push. Copy + adjust field mapping
 * for a specific vendor (Geotab, Samsara, Wialon, …).
 *
 * Env:
 *   EXTERNAL_SERVICE_URL, EXTERNAL_SERVICE_API_KEY, EXTERNAL_SERVICE_WS_URL,
 *   EXTERNAL_SERVICE_TIMEOUT_MS (default 10000),
 *   EXTERNAL_SERVICE_MAX_RETRIES (default 2)
 */
class GenericTelematicsAdapter implements VehicleTrackingAdapter {
  readonly provider = "generic-telematics";
  private readonly cfg: TrackingHttpConfig;
  private readonly wsUrl: string;
  private readonly apiKey: string;

  constructor(env: TrackingEnv) {
    this.cfg = {
      baseUrl: env.baseUrl,
      apiKey: env.apiKey,
      provider: this.provider,
      timeoutMs: env.timeoutMs,
      maxRetries: env.maxRetries,
    };
    this.wsUrl = env.wsUrl;
    this.apiKey = env.apiKey;
  }

  /**
   * tr-Araç konumunu alır
   * en-Gets vehicle location
   * input (plate: string)
   * output (Promise<VehicleLocation>)
   *
   */
  async getVehicleLocation(plate: string): Promise<VehicleLocation> {
    const data = await trackingFetch<Partial<VehicleLocation>>(
      this.cfg,
      `/vehicle-tracking/${encodeURIComponent(plate)}/location`
    );
    return {
      lat: Number(data.lat ?? 0),
      lng: Number(data.lng ?? 0),
      speed: data.speed ?? 0,
      heading: data.heading ?? 0,
      lastUpdated: data.lastUpdated ?? Date.now(),
    };
  }

  /**
   * tr-Araç telemetrisini alır
   * en-Gets vehicle telemetry
   * input (plate: string)
   * output (Promise<VehicleTelemetry>)
   *
   */
  async getVehicleTelemetry(plate: string): Promise<VehicleTelemetry> {
    const data = await trackingFetch<Record<string, unknown>>(
      this.cfg,
      `/vehicle-tracking/${encodeURIComponent(plate)}/telemetry`
    );
    return {
      plate,
      speedKph: numOrNull(data.speedKph ?? data.speed),
      heading: numOrNull(data.heading),
      fuelLevelPct: numOrNull(data.fuelLevelPct ?? data.fuel),
      engineOn: typeof data.engineOn === "boolean" ? data.engineOn : null,
      odometerKm: numOrNull(data.odometerKm ?? data.odometer),
      updatedAt: String(data.updatedAt ?? new Date().toISOString()),
      raw: data,
    };
  }

  /**
   * tr-Acil durum olaylarına abone olur
   * en-Subscribes to emergency events
   * input (onEmergency: (event: EmergencyEvent) => void, onError: (error: Error) => void)
   * output (() => void)
   *
   */
  subscribeToEmergencies(
    onEmergency: (event: EmergencyEvent) => void,
    onError?: (error: Error) => void
  ): () => void {
    let ws: WebSocket | null = null;
    let closedByCaller = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const connect = () => {
      if (closedByCaller) return;
      // 'ws' package is used (not the global) so we can send Authorization.
      ws = new WebSocket(this.wsUrl, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      ws.on("open", () => {
        attempt = 0;
        logger.info(`[tracking:${this.provider}] emergency stream connected`);
      });

      ws.on("message", (raw) => {
        try {
          const parsed = JSON.parse(raw.toString()) as Record<string, unknown>;
          onEmergency({
            plate: String(parsed.plate ?? ""),
            kind: String(parsed.kind ?? parsed.type ?? "EMERGENCY"),
            message: parsed.message ? String(parsed.message) : null,
            lat: numOrNull(parsed.lat),
            lng: numOrNull(parsed.lng),
            occurredAt: String(parsed.occurredAt ?? new Date().toISOString()),
            raw: parsed,
          });
        } catch (e) {
          logger.warn(
            `[tracking:${this.provider}] failed to parse emergency payload`,
            e
          );
        }
      });

      ws.on("error", (error) => {
        logger.error(
          `[tracking:${this.provider}] emergency stream error`,
          error
        );
        onError?.(error);
      });

      ws.on("close", () => {
        if (closedByCaller) return;
        // Reconnect with capped exponential backoff so a flapping provider
        // does not spin the process.
        const delay = Math.min(1000 * 2 ** attempt, 30_000);
        attempt++;
        logger.warn(
          `[tracking:${this.provider}] emergency stream closed, reconnecting in ${delay}ms`
        );
        reconnectTimer = setTimeout(connect, delay);
      });
    };

    connect();

    return () => {
      closedByCaller = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    };
  }
}

/**
 * tr-Sayısal değerleri kontrol eder
 * en-Checks a value for numeric value
 * input (v: unknown)
 * output (number | null)
 *
 */
function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ─── Env / provider registry ────────────────────────────────────────────────
interface TrackingEnv {
  baseUrl: string;
  apiKey: string;
  wsUrl: string;
  timeoutMs: number;
  maxRetries: number;
}

/**
 * tr-Ortamı okur
 * en-Reads the environment
 * input ()
 * output ({ provider: string; env: TrackingEnv })
 *
 */
function readTrackingEnv(): { provider: string; env: TrackingEnv } {
  const provider = (
    process.env.EXTERNAL_TRACKING_PROVIDER ?? "generic-telematics"
  ).toLowerCase();

  const baseUrl = process.env.EXTERNAL_SERVICE_URL ?? "";
  const apiKey = process.env.EXTERNAL_SERVICE_API_KEY ?? "";

  if (!baseUrl || !apiKey) {
    throw new TrackingError(
      `External tracking provider "${provider}" is not configured ` +
        `(missing EXTERNAL_SERVICE_URL or EXTERNAL_SERVICE_API_KEY).`,
      { provider, status: 500 }
    );
  }

  return {
    provider,
    env: {
      baseUrl,
      apiKey,
      wsUrl:
        process.env.EXTERNAL_SERVICE_WS_URL ??
        "wss://external-service.com/emergency",
      timeoutMs: Number(process.env.EXTERNAL_SERVICE_TIMEOUT_MS ?? 10_000),
      maxRetries: Number(process.env.EXTERNAL_SERVICE_MAX_RETRIES ?? 2),
    },
  };
}

/**
 * tr-Bir şirketin takip modunu çözer. Varsayılan olarak "internal" (LogiTrack'in kendi Firebase işlem hattı) kullanılır, `EXTERNAL_TRACKING_ENABLED=true` aksi belirtilmedikçe. Her şirket için geçersiz kılmak üzere açık bir mod geçersiz kılınabilir.
 * en-Resolve a company's tracking mode. Defaults to "internal" (LogiTrack's own Firebase pipeline) unless `EXTERNAL_TRACKING_ENABLED=true`. Pass an explicit mode to override per-company.
 * input (override: VehicleTrackingMode)
 * output (VehicleTrackingMode)
 *
 */
export function resolveTrackingMode(
  override?: VehicleTrackingMode
): VehicleTrackingMode {
  if (override) return override;
  return process.env.EXTERNAL_TRACKING_ENABLED === "true"
    ? "external"
    : "internal";
}

/**
 * tr-Harici takip bağdaştırıcısı için factory. Yalnızca "external" modda geçerlidir; "internal" mod istemcide `app/lib/vehicleTracking.ts` tarafından sağlanır.
 * en-Factory for the external tracking adapter. Only relevant in "external" mode; "internal" mode is served by `app/lib/vehicleTracking.ts` on the client.
 * input ()
 * output (VehicleTrackingAdapter)
 *
 */
export function getVehicleTrackingAdapter(): VehicleTrackingAdapter {
  const { provider, env } = readTrackingEnv();
  switch (provider) {
    case "generic-telematics":
      return new GenericTelematicsAdapter(env);
    default:
      throw new TrackingError(`Unknown tracking provider "${provider}"`, {
        provider,
        status: 500,
      });
  }
}

// ─── High-level convenience wrappers ────────────────────────────────────────
// Thin, typed entry points for callers that have opted into external tracking.

/**
 * tr-Araç konumunu harici sağlayıcıdan alır
 * en-Gets vehicle location from external provider
 * input (plate: string)
 * output (Promise<VehicleLocation>)
 *
 */
export async function getExternalVehicleLocation(
  plate: string
): Promise<VehicleLocation> {
  return getVehicleTrackingAdapter().getVehicleLocation(plate);
}

/**
 * tr-Araç telemetrisini harici sağlayıcıdan alır
 * en-Gets vehicle telemetry from external provider
 * input (plate: string)
 * output (Promise<VehicleTelemetry>)
 *
 */
export async function getExternalVehicleTelemetry(
  plate: string
): Promise<VehicleTelemetry> {
  return getVehicleTrackingAdapter().getVehicleTelemetry(plate);
}

/**
 * tr-Harici sağlayıcının acil durum bildirimlerine abone olur. Ayrılma fonksiyonu döndürür. Bağlantı koptuğunda otomatik yeniden bağlanır.
 * en-Subscribes to the external provider's emergency notifications. Returns an unsubscribe function. Auto-reconnects on drop.
 * input (onEmergency: (event: EmergencyEvent) => void, onError: (error: Error) => void)
 * output (() => void)
 *
 */
export function subscribeToExternalEmergencies(
  onEmergency: (event: EmergencyEvent) => void,
  onError?: (error: Error) => void
): () => void {
  return getVehicleTrackingAdapter().subscribeToEmergencies(
    onEmergency,
    onError
  );
}
