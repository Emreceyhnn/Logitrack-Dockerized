-- Structured failure-reason taxonomy for DELIVERY_FAILED events. A closed
-- set of codes (see app/lib/type/deliveryFailureReasons.ts), pulled out of
-- payload JSONB into its own column so the daily report's
-- failure_reasons_breakdown can GROUP BY it directly instead of unpacking
-- JSONB on every aggregation.

ALTER TABLE "reporting"."report_events" ADD COLUMN "reasonCode" TEXT;

CREATE INDEX "report_events_reason_code_idx"
  ON "reporting"."report_events" ("companyId", "businessDate", "eventType", "reasonCode")
  WHERE "reasonCode" IS NOT NULL;
