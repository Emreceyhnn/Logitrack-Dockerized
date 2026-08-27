/**
 * Fixed taxonomy for why a stock count didn't match the system's on-hand
 * quantity. Client-safe (no Prisma import) so both the adjust-stock dialog
 * and the server controller share one source of truth — pick accuracy is
 * computed as (PICK_COMPLETED count − adjustments tagged PICK_ERROR) /
 * PICK_COMPLETED count, and pack accuracy the same way against PACK_ERROR,
 * which only works if the set is closed. The worker picks whichever applies
 * when logging the correction — nothing infers PICK vs PACK automatically,
 * since no link between a task and its later adjustment is tracked.
 */
export const STOCK_DISCREPANCY_TYPES = [
  "PICK_ERROR",
  "PACK_ERROR",
  "DAMAGE",
  "COUNT_DRIFT",
  "OTHER",
] as const;

export type StockDiscrepancyType = (typeof STOCK_DISCREPANCY_TYPES)[number];

export function isStockDiscrepancyType(
  value: unknown
): value is StockDiscrepancyType {
  return (
    typeof value === "string" &&
    (STOCK_DISCREPANCY_TYPES as readonly string[]).includes(value)
  );
}
