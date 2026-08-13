/**
 * ADMIN CONSOLE — SANDBOX TYPES
 * =============================
 * Client-safe types for the Service Testing Laboratory.
 *
 * SCOPE NOTE — what the sandbox does and does not do:
 *   - API Tester    → replays this app's OWN /api/* routes. Arbitrary URLs are
 *                     rejected server-side; see the SSRF note on `endpoint`.
 *   - Email Tester  → sends REAL mail through Resend using the app's real
 *                     templates. Not a simulation.
 *   - Queue Monitor → reports REAL Redis/Upstash state (keys, memory, cache
 *                     namespaces). This app has no BullMQ, so there is no job
 *                     retry/drain surface to expose and none is faked.
 *   - WS/SSE Tester → connects to a real Server-Sent Events endpoint.
 * A payment-gateway sandbox is deliberately absent: no Stripe/Iyzico
 * integration exists in this codebase, and a fake one would imply coverage
 * that does not exist.
 */

// ─── API Tester ─────────────────────────────────────────────────────────────

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** A key/value row in the headers or query-params editor. */
export interface KeyValueRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

/**
 * One selectable endpoint. `path` is always app-relative ("/api/…") — the
 * server refuses anything else, so the tester can never be pointed at an
 * internal host or a cloud metadata endpoint (SSRF).
 */
export interface ApiEndpointPreset {
  id: string;
  label: string;
  method: HttpMethod;
  path: string;
  group: string;
  /** Optional pretty-printed JSON body seeded into the editor. */
  sampleBody?: string;
}

export interface ApiRequestPayload {
  method: HttpMethod;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  /** Raw JSON string; validated before dispatch. */
  body?: string;
}

export interface ApiResponseResult {
  status: number;
  statusText: string;
  durationMs: number;
  /** Response headers, with sensitive values already redacted server-side. */
  headers: Record<string, string>;
  /** Pretty-printed when the response parsed as JSON. */
  body: string;
  /** True when `body` is valid JSON and can be syntax-highlighted. */
  isJson: boolean;
  /** Byte length of the raw response. */
  sizeBytes: number;
}

// ─── Email Tester ───────────────────────────────────────────────────────────

/** Templates the tester can render, mapped to real builders server-side. */
export type EmailTemplateKey =
  | "verification"
  | "passwordReset"
  | "companyWelcome"
  | "securityAlert"
  | "notification"
  | "custom";

export interface EmailTestPayload {
  to: string;
  template: EmailTemplateKey;
  lang: "en" | "tr";
  /** Only used when `template` is "custom". */
  subject?: string;
  html?: string;
}

export interface EmailTestResult {
  ok: boolean;
  /** Resend message id when the send succeeded. */
  messageId: string | null;
  durationMs: number;
  message: string;
  sentAt: string;
}

// ─── Queue / Redis Monitor ──────────────────────────────────────────────────

/** One cache namespace and how many live keys it holds. */
export interface QueueNamespace {
  name: string;
  keyCount: number;
}

export interface QueueSnapshot {
  reachable: boolean;
  /** Total keys visible to the scan (may be capped — see `scanned`). */
  totalKeys: number;
  /** True when the scan hit its cap and `totalKeys` is a lower bound. */
  truncated: boolean;
  namespaces: QueueNamespace[];
  /** Round-trip latency of the probe. */
  latencyMs: number;
  /** Active rate-limit windows, a proxy for current traffic. */
  rateLimitKeys: number;
  checkedAt: string;
}

// ─── Event Stream Tester ────────────────────────────────────────────────────

export type StreamStatus = "idle" | "connecting" | "open" | "closed" | "error";

export interface StreamEvent {
  id: string;
  /** Receipt time, not server emit time. */
  receivedAt: string;
  type: string;
  data: string;
}

// ─── Page State ─────────────────────────────────────────────────────────────

export interface ApiTesterState {
  method: HttpMethod;
  path: string;
  headers: KeyValueRow[];
  query: KeyValueRow[];
  body: string;
  selectedPresetId: string | null;
  response: ApiResponseResult | null;
  loading: boolean;
  error: string | null;
}

export interface EmailTesterState {
  to: string;
  template: EmailTemplateKey;
  lang: "en" | "tr";
  subject: string;
  html: string;
  result: EmailTestResult | null;
  sending: boolean;
  error: string | null;
}

export interface QueueMonitorState {
  snapshot: QueueSnapshot | null;
  loading: boolean;
  error: string | null;
  /** Whether the monitor is auto-refreshing. */
  live: boolean;
}

export interface StreamTesterState {
  url: string;
  status: StreamStatus;
  events: StreamEvent[];
  error: string | null;
}

// ─── Page Actions ───────────────────────────────────────────────────────────

export interface ApiTesterActions {
  setMethod: (method: HttpMethod) => void;
  setPath: (path: string) => void;
  setBody: (body: string) => void;
  applyPreset: (preset: ApiEndpointPreset) => void;
  updateRows: (kind: "headers" | "query", rows: KeyValueRow[]) => void;
  send: () => Promise<void>;
  reset: () => void;
}

export interface EmailTesterActions {
  setField: <K extends keyof EmailTesterState>(
    key: K,
    value: EmailTesterState[K]
  ) => void;
  send: () => Promise<void>;
}

export interface QueueMonitorActions {
  refresh: () => Promise<void>;
  setLive: (live: boolean) => void;
}

export interface StreamTesterActions {
  setUrl: (url: string) => void;
  connect: () => void;
  disconnect: () => void;
  clear: () => void;
}

// ─── Component Props ────────────────────────────────────────────────────────

export interface SandboxPageProps {
  title: string;
  subtitle: string;
}

export interface KeyValueEditorProps {
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
}

export interface JsonViewerProps {
  value: string;
  isJson: boolean;
  maxHeight?: number;
}

export interface ResponsePanelProps {
  response: ApiResponseResult | null;
  loading: boolean;
  error: string | null;
}
