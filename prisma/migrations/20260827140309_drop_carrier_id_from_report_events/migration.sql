-- Carrier (3rd-party transportation) was never a real concept in this
-- system — logistics runs entirely on the company's own fleet
-- (Driver/Vehicle/Trailer). carrierId was added speculatively when the
-- report_events schema was first designed and never populated by any
-- call site (confirmed: zero non-null rows). Dropping it rather than
-- leaving a dead, always-null column around.

ALTER TABLE "reporting"."report_events" DROP COLUMN "carrierId";
