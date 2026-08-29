/**
 * Fixed reason taxonomy for an ORDER_RETURNED transition. Client-safe
 * (no Prisma import) so both the status-update dialog and the server
 * controller share one source of truth — main_return_reason grouping only
 * works if the set is closed and every RETURNED transition picks one.
 */
export const RETURN_REASONS = [
  "WRONG_ITEM_SHIPPED",
  "CUSTOMER_CHANGED_MIND",
  "DAMAGED_IN_TRANSIT",
  "QUALITY_ISSUE",
  "DUPLICATE_ORDER",
  "OTHER",
] as const;

export type ReturnReasonCode = (typeof RETURN_REASONS)[number];

export function isReturnReasonCode(value: unknown): value is ReturnReasonCode {
  return (
    typeof value === "string" &&
    (RETURN_REASONS as readonly string[]).includes(value)
  );
}
