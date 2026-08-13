/**
 * ADMIN CONSOLE — OVERVIEW TYPES
 * ==============================
 * Client-safe types for the platform overview dashboard.
 *
 * SCOPE NOTE — what these metrics can and cannot be:
 * Everything here is derived from data the platform actually owns (Postgres
 * rows, Redis keys, audit records). Host-level telemetry the prompt asked for —
 * CPU %, RAM %, total HTTP requests, p99 latency, HTTP 2xx-vs-5xx ratio — is
 * NOT represented, because this stack runs serverless on Vercel with no APM or
 * metrics pipeline. Inventing those numbers would make the console lie about
 * production health, so they are omitted rather than mocked. Wiring a real
 * source (Vercel Analytics, OpenTelemetry, Sentry) is a separate integration.
 */

// ─── Domain Models ──────────────────────────────────────────────────────────

/** Time windows offered by the overview range selector. */
export type AdminTimeRange = "1h" | "24h" | "7d" | "30d";

/** Direction-aware delta against the preceding window of equal length. */
export interface AdminKpiTrend {
  /** Percentage change, already rounded. */
  value: number;
  isUp: boolean;
}

/**
 * A single KPI tile. `trend` is undefined when no comparison is meaningful
 * (e.g. a point-in-time count with no prior window).
 */
export interface AdminKpi {
  key: AdminKpiKey;
  value: number;
  trend?: AdminKpiTrend;
}

export type AdminKpiKey =
  | "tenants"
  | "users"
  | "activeSessions"
  | "signIns"
  | "shipments"
  | "failedSignIns";

/** One point on a time-series chart. */
export interface AdminTimeSeriesPoint {
  /** ISO timestamp marking the START of the bucket. */
  bucket: string;
  value: number;
}

/** Named series so the chart can render several lines from one payload. */
export interface AdminTimeSeries {
  key: string;
  points: AdminTimeSeriesPoint[];
}

/** Subscription mix across the platform, for the distribution chart. */
export interface AdminSubscriptionSlice {
  status: string;
  count: number;
}

/** A tenant ranked by activity, for the leaderboard table. */
export interface AdminTenantSummary {
  id: string;
  name: string;
  userCount: number;
  shipmentCount: number;
  createdAt: string;
}

/** Everything the overview page renders, fetched in one round trip. */
export interface AdminOverviewData {
  kpis: AdminKpi[];
  /** Sign-in activity bucketed over the selected range. */
  authActivity: AdminTimeSeries[];
  /** New-user signups bucketed over the selected range. */
  signups: AdminTimeSeriesPoint[];
  subscriptions: AdminSubscriptionSlice[];
  topTenants: AdminTenantSummary[];
  /** Range the payload was computed for; echoed back to detect races. */
  range: AdminTimeRange;
  generatedAt: string;
}

// ─── Page State ─────────────────────────────────────────────────────────────

export interface AdminOverviewState {
  data: AdminOverviewData | null;
  range: AdminTimeRange;
  loading: boolean;
  /** True during a range change while previous data is still on screen. */
  refreshing: boolean;
  error: string | null;
}

// ─── Page Actions ───────────────────────────────────────────────────────────

export interface AdminOverviewActions {
  fetchOverview: (range?: AdminTimeRange) => Promise<void>;
  setRange: (range: AdminTimeRange) => void;
}

// ─── Component Props ────────────────────────────────────────────────────────

export interface AdminOverviewPageProps {
  title: string;
  subtitle: string;
}

export interface AdminKpiGridProps {
  kpis: AdminKpi[];
  loading: boolean;
}

export interface AdminRangeSelectorProps {
  value: AdminTimeRange;
  onChange: (range: AdminTimeRange) => void;
  disabled?: boolean;
}

export interface AdminActivityChartProps {
  series: AdminTimeSeries[];
  signups: AdminTimeSeriesPoint[];
  range: AdminTimeRange;
  loading: boolean;
}

export interface AdminSubscriptionChartProps {
  slices: AdminSubscriptionSlice[];
  loading: boolean;
}

export interface AdminTenantTableProps {
  tenants: AdminTenantSummary[];
  loading: boolean;
  locale: string;
}
