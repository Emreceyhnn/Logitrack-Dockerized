import "server-only";

import { db } from "@/app/lib/db";
import type {
  AdminKpi,
  AdminOverviewData,
  AdminSubscriptionSlice,
  AdminTenantSummary,
  AdminTimeRange,
  AdminTimeSeries,
  AdminTimeSeriesPoint,
} from "@/app/lib/type/admin/overview";

/**
 * PLATFORM OVERVIEW METRICS
 * =========================
 * Cross-tenant aggregates for the admin console. Callers MUST have passed
 * `platformAdminAction`, which supplies the `runAsSystem` context that lets the
 * tenant guard in db.ts run these queries unscoped.
 *
 * Every number here is computed from real rows. Host telemetry (CPU, RAM,
 * request counts, p99 latency) is deliberately absent — see the scope note in
 * `app/lib/type/admin/overview.ts`.
 */

/** Window length in milliseconds, and the bucket size used to chart it. */
const RANGE_CONFIG: Record<
  AdminTimeRange,
  { durationMs: number; bucketMs: number }
> = {
  "1h": { durationMs: 60 * 60_000, bucketMs: 5 * 60_000 },
  "24h": { durationMs: 24 * 60 * 60_000, bucketMs: 60 * 60_000 },
  "7d": { durationMs: 7 * 24 * 60 * 60_000, bucketMs: 24 * 60 * 60_000 },
  "30d": { durationMs: 30 * 24 * 60 * 60_000, bucketMs: 24 * 60 * 60_000 },
};

/** Cap on the tenant leaderboard. */
const TOP_TENANT_LIMIT = 8;

/**
 * tr-İki dönem arasındaki yüzde değişimi hesaplar.
 * en-Percentage change between two windows.
 *    A zero baseline has no defined percentage change, so it yields no trend
 *    rather than a misleading "+100%".
 * input (current: number, previous: number)
 * output (AdminKpiTrend | undefined)
 */
function computeTrend(
  current: number,
  previous: number
): { value: number; isUp: boolean } | undefined {
  if (previous <= 0) return undefined;
  const delta = ((current - previous) / previous) * 100;
  if (!Number.isFinite(delta)) return undefined;
  return { value: Math.abs(Math.round(delta)), isUp: delta >= 0 };
}

/**
 * tr-Zaman damgalarını sabit aralıklı kovalara böler.
 * en-Buckets timestamps into a dense, fixed-width series.
 *    Empty buckets are emitted as zeros so the chart shows a real gap instead
 *    of interpolating a straight line across missing time.
 * input (dates: Date[], from: Date, to: Date, bucketMs: number)
 * output (AdminTimeSeriesPoint[])
 */
function bucketByTime(
  dates: Date[],
  from: Date,
  to: Date,
  bucketMs: number
): AdminTimeSeriesPoint[] {
  const start = from.getTime();
  const end = to.getTime();
  const bucketCount = Math.max(1, Math.ceil((end - start) / bucketMs));

  const counts = new Array<number>(bucketCount).fill(0);
  for (const date of dates) {
    const index = Math.floor((date.getTime() - start) / bucketMs);
    if (index >= 0 && index < bucketCount) {
      counts[index] = (counts[index] ?? 0) + 1;
    }
  }

  return counts.map((value, i) => ({
    bucket: new Date(start + i * bucketMs).toISOString(),
    value,
  }));
}

/**
 * tr-Platform genel bakış verilerini toplar.
 * en-Collects every metric the overview dashboard renders, for one time range.
 * input (range: AdminTimeRange)
 * output (Promise<AdminOverviewData>)
 */
export async function getAdminOverview(
  range: AdminTimeRange
): Promise<AdminOverviewData> {
  const config = RANGE_CONFIG[range] ?? RANGE_CONFIG["24h"];
  const now = new Date();
  const from = new Date(now.getTime() - config.durationMs);
  // The equal-length window immediately before `from`, used for trend deltas.
  const prevFrom = new Date(from.getTime() - config.durationMs);

  const [
    tenantCount,
    tenantCountPrev,
    userCount,
    userCountPrev,
    activeSessionCount,
    signInLogs,
    failedSignInCount,
    failedSignInCountPrev,
    signupDates,
    shipmentCount,
    shipmentCountPrev,
    subscriptionGroups,
    tenants,
  ] = await Promise.all([
    db.company.count(),
    db.company.count({ where: { createdAt: { lt: from } } }),

    db.user.count(),
    db.user.count({ where: { createdAt: { lt: from } } }),

    // A session is "active" only if it is unrevoked AND unexpired; either alone
    // would overcount.
    db.session.count({
      where: { isRevoked: false, expiresAt: { gt: now } },
    }),

    // Timestamps only — the chart needs counts per bucket, not full rows.
    db.auditLog.findMany({
      where: { action: "LOGIN", createdAt: { gte: from, lte: now } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),

    db.auditLog.count({
      where: { action: "LOGIN_FAILED", createdAt: { gte: from, lte: now } },
    }),
    db.auditLog.count({
      where: {
        action: "LOGIN_FAILED",
        createdAt: { gte: prevFrom, lt: from },
      },
    }),

    db.user.findMany({
      where: { createdAt: { gte: from, lte: now } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),

    db.shipment.count({ where: { createdAt: { gte: from, lte: now } } }),
    db.shipment.count({
      where: { createdAt: { gte: prevFrom, lt: from } },
    }),

    db.subscription.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),

    db.company.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: { select: { users: true, shipments: true } },
      },
      orderBy: { createdAt: "desc" },
      // Over-fetch modestly, then rank in memory: Prisma cannot order by a
      // relation count directly, and the company table is small enough that a
      // capped scan is cheaper than a raw query.
      take: 100,
    }),
  ]);

  // Sign-ins inside the window, split into buckets for the activity chart.
  const signInPoints = bucketByTime(
    signInLogs.map((log) => log.createdAt),
    from,
    now,
    config.bucketMs
  );

  const signupPoints = bucketByTime(
    signupDates.map((user) => user.createdAt),
    from,
    now,
    config.bucketMs
  );

  const signInCount = signInLogs.length;

  /** Builds a KPI, attaching `trend` only when a comparison is meaningful.
   *  `exactOptionalPropertyTypes` forbids an explicit `trend: undefined`, so
   *  the key is spread in or left out entirely. */
  const kpi = (
    key: AdminKpi["key"],
    value: number,
    previous?: number
  ): AdminKpi => {
    const trend =
      previous === undefined ? undefined : computeTrend(value, previous);
    return trend ? { key, value, trend } : { key, value };
  };

  const kpis: AdminKpi[] = [
    kpi("tenants", tenantCount, tenantCountPrev),
    kpi("users", userCount, userCountPrev),
    // Point-in-time gauge: there is no prior value to compare against.
    kpi("activeSessions", activeSessionCount),
    kpi("signIns", signInCount),
    kpi("shipments", shipmentCount, shipmentCountPrev),
    kpi("failedSignIns", failedSignInCount, failedSignInCountPrev),
  ];

  const authActivity: AdminTimeSeries[] = [
    { key: "signIns", points: signInPoints },
  ];

  const subscriptions: AdminSubscriptionSlice[] = subscriptionGroups.map(
    (group) => ({
      status: group.status,
      count: group._count._all,
    })
  );

  const topTenants: AdminTenantSummary[] = tenants
    .map((company) => ({
      id: company.id,
      name: company.name,
      userCount: company._count.users,
      shipmentCount: company._count.shipments,
      createdAt: company.createdAt.toISOString(),
    }))
    .sort(
      (a, b) =>
        b.shipmentCount - a.shipmentCount || b.userCount - a.userCount
    )
    .slice(0, TOP_TENANT_LIMIT);

  return {
    kpis,
    authActivity,
    signups: signupPoints,
    subscriptions,
    topTenants,
    range,
    generatedAt: now.toISOString(),
  };
}
