-- SLA/OTD tracking: report_events gains two columns so on-time-delivery can
-- be computed with a plain SQL filter (WHERE "isOnTime" = true) instead of
-- reaching into payload JSONB, which is what every downstream OTD%, "SLA
-- breached", and Perfect Order Rate metric across the daily/weekly/monthly
-- reports needs.
--
-- Both columns are nullable and only ever populated on ORDER_DELIVERED and
-- DELIVERY_FAILED events for shipments that had a slaDeadline set — a
-- shipment without one (slaDeadline is nullable on the Shipment model) has
-- nothing to compare against, so isOnTime stays null rather than being
-- forced to a fake true/false that would silently inflate or deflate OTD%.

ALTER TABLE "reporting"."report_events" ADD COLUMN "slaDeadline" TIMESTAMP(3);
ALTER TABLE "reporting"."report_events" ADD COLUMN "isOnTime" BOOLEAN;

-- Partial index: only rows that actually carry an SLA verdict are ever
-- scanned for OTD%, so indexing the rest would be pure waste.
CREATE INDEX "report_events_otd_lookup_idx"
  ON "reporting"."report_events" ("companyId", "businessDate", "eventType")
  WHERE "isOnTime" IS NOT NULL;
