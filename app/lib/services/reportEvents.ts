/**
 * The minimal surface logReportEvent needs from a Prisma client/transaction
 * client. Both `db` and the `tx` handed to `db.$transaction(async (tx) => ...)`
 * satisfy this structurally, without pinning to either type's exact (and
 * mutually incompatible, once `db` has $extends applied) shape.
 */
type SqlExecutor = {
  $executeRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<number>;
};

/**
 * Writer for the reporting.report_events fact table (see
 * prisma/migrations/20260824125309_add_reporting_schema).
 *
 * That schema is intentionally not modeled in schema.prisma, so writes go
 * through raw SQL on the SAME Prisma client/connection the caller is already
 * using — critically, the same `tx` inside a `db.$transaction(...)` block.
 * Postgres transactions are pinned to one connection, so writing through a
 * separate pool (e.g. an app_writer-scoped client) would not be atomic with
 * the domain write it's describing: a rollback of the domain write would not
 * roll back the event. Call this only from inside the same transaction as
 * the write it records.
 */

export type ReportEventInput = {
  eventType: string;
  occurredAt: Date;
  companyId: string;
  subjectType: string;
  subjectId: string;
  /** Idempotency key. Reusing one silently no-ops the insert (ON CONFLICT DO NOTHING). */
  sourceEventId: string;
  warehouseId?: string | null;
  carrierId?: string | null;
  driverId?: string | null;
  customerId?: string | null;
  zoneId?: string | null;
  quantity?: number | null;
  weightKg?: number | null;
  volumeM3?: number | null;
  amount?: number | null;
  durationSec?: number | null;
  payload?: Record<string, unknown> | null;
  /** Cut-off-adjusted operating day. Defaults to occurredAt's UTC calendar date. */
  businessDate?: Date;
};

function resolveBusinessDate(occurredAt: Date): Date {
  return new Date(
    Date.UTC(
      occurredAt.getUTCFullYear(),
      occurredAt.getUTCMonth(),
      occurredAt.getUTCDate()
    )
  );
}

/**
 * tr-Aynı transaction içinde reporting.report_events tablosuna tek bir olay satırı yazar
 * en-Writes a single event row to reporting.report_events, inside the caller's transaction
 * input (tx: Db, event: ReportEventInput)
 * output (Promise<void>)
 */
export async function logReportEvent(
  tx: SqlExecutor,
  event: ReportEventInput
): Promise<void> {
  const businessDate = event.businessDate ?? resolveBusinessDate(event.occurredAt);

  await tx.$executeRaw`
    INSERT INTO reporting.report_events (
      id, "eventType", "occurredAt", "businessDate",
      "companyId", "warehouseId", "carrierId", "driverId", "customerId", "zoneId",
      "subjectType", "subjectId",
      quantity, "weightKg", "volumeM3", amount, "durationSec",
      payload, "sourceEventId"
    ) VALUES (
      ${crypto.randomUUID()}, ${event.eventType}, ${event.occurredAt}, ${businessDate},
      ${event.companyId}, ${event.warehouseId ?? null}, ${event.carrierId ?? null},
      ${event.driverId ?? null}, ${event.customerId ?? null}, ${event.zoneId ?? null},
      ${event.subjectType}, ${event.subjectId},
      ${event.quantity ?? null}, ${event.weightKg ?? null}, ${event.volumeM3 ?? null},
      ${event.amount ?? null}, ${event.durationSec ?? null},
      ${event.payload ? JSON.stringify(event.payload) : null}::jsonb,
      ${event.sourceEventId}
    )
    ON CONFLICT ("sourceEventId") DO NOTHING
  `;
}
