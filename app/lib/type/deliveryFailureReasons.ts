/**
 * Fixed failure-reason taxonomy for a FAILED delivery attempt. Client-safe
 * (no Prisma import) so both the status-update dialog and the server
 * controller share one source of truth — the daily report's
 * failure_reasons_breakdown groups by these codes, which only works if the
 * set is closed and every FAILED transition picks one.
 */
export const DELIVERY_FAILURE_REASONS = [
  "CUSTOMER_NOT_AT_ADDRESS",
  "INCORRECT_INCOMPLETE_ADDRESS",
  "CUSTOMER_REJECTED_DAMAGED",
  "CUSTOMER_REJECTED_OTHER",
  "TIME_WINDOW_EXCEEDED",
] as const;

export type DeliveryFailureReasonCode = (typeof DELIVERY_FAILURE_REASONS)[number];

export function isDeliveryFailureReasonCode(
  value: unknown
): value is DeliveryFailureReasonCode {
  return (
    typeof value === "string" &&
    (DELIVERY_FAILURE_REASONS as readonly string[]).includes(value)
  );
}
