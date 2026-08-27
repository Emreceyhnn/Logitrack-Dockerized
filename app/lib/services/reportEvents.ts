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
  driverId?: string | null;
  customerId?: string | null;
  zoneId?: string | null;
  /**
   * Who performed the action — a User id, not a Driver id. Distinct from
   * driverId: a warehouse worker doing a pick has no Driver row at all, and
   * even when the actor happens to also be a driver, driverId means "whose
   * shipment/route this is", not "who clicked the button".
   */
  actorUserId?: string | null;
  quantity?: number | null;
  weightKg?: number | null;
  volumeM3?: number | null;
  /**
   * Ad-hoc cost for this event (e.g. handling/customs/insurance on a
   * shipment, or a maintenance/fuel bill) — kept separate from `revenue` so
   * profit queries can sum each side independently rather than relying on a
   * sign convention every writer would need to get right.
   */
  amount?: number | null;
  /** Freight price billed to the customer. Only meaningful on SHIPMENT_CREATED so far. */
  revenue?: number | null;
  durationSec?: number | null;
  payload?: Record<string, unknown> | null;
  /** Cut-off-adjusted operating day. Defaults to occurredAt's UTC calendar date. */
  businessDate?: Date;
  /**
   * The shipment's promised deadline, when it has one (Shipment.slaDeadline
   * is nullable — not every shipment is sold with an SLA). Pass it on
   * ORDER_DELIVERED / DELIVERY_FAILED and `isOnTime` is derived automatically
   * as `occurredAt <= slaDeadline`, so every call site computes it the same
   * way instead of each re-implementing the comparison (and risking one
   * getting the boundary wrong). Omit entirely when the shipment has no SLA —
   * isOnTime then stays null, which OTD% must treat as "not applicable", not
   * as a miss.
   */
  slaDeadline?: Date | null;
  /**
   * Structured failure-reason code (see deliveryFailureReasons.ts). Pulled
   * into its own column, not left inside payload, because
   * failure_reasons_breakdown needs to GROUP BY it directly.
   */
  reasonCode?: string | null;
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
  const slaDeadline = event.slaDeadline ?? null;
  const isOnTime = slaDeadline ? event.occurredAt.getTime() <= slaDeadline.getTime() : null;

  await tx.$executeRaw`
    INSERT INTO reporting.report_events (
      id, "eventType", "occurredAt", "businessDate",
      "companyId", "warehouseId", "driverId", "customerId", "zoneId",
      "subjectType", "subjectId",
      quantity, "weightKg", "volumeM3", amount, revenue, "durationSec",
      payload, "sourceEventId", "slaDeadline", "isOnTime", "actorUserId", "reasonCode"
    ) VALUES (
      ${crypto.randomUUID()}, ${event.eventType}, ${event.occurredAt}, ${businessDate},
      ${event.companyId}, ${event.warehouseId ?? null},
      ${event.driverId ?? null}, ${event.customerId ?? null}, ${event.zoneId ?? null},
      ${event.subjectType}, ${event.subjectId},
      ${event.quantity ?? null}, ${event.weightKg ?? null}, ${event.volumeM3 ?? null},
      ${event.amount ?? null}, ${event.revenue ?? null}, ${event.durationSec ?? null},
      ${event.payload ? JSON.stringify(event.payload) : null}::jsonb,
      ${event.sourceEventId}, ${slaDeadline}, ${isOnTime}, ${event.actorUserId ?? null},
      ${event.reasonCode ?? null}
    )
    ON CONFLICT ("sourceEventId") DO NOTHING
  `;
}
