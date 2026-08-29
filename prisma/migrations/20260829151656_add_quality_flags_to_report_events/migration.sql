-- Perfect Order Rate needs "delivered on time AND complete AND no document
-- issue" as one boolean check. isOnTime already exists (Madde 1); these two
-- add the remaining components, captured optionally when a shipment is
-- marked DELIVERED. Nullable like isOnTime: a shipment where neither was
-- reported defaults to "no known issue" (false), not "unknown" (null) —
-- unlike isOnTime, these two are worker-reported opt-in flags, not a
-- deadline comparison, so silence genuinely means "nothing was flagged".

ALTER TABLE "reporting"."report_events" ADD COLUMN "isPartial" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "reporting"."report_events" ADD COLUMN "hasDocumentIssue" BOOLEAN NOT NULL DEFAULT false;
