-- Time-commitment tier promised to the customer (SAME_DAY/NEXT_DAY/STANDARD_48H),
-- copied from Shipment.serviceTier at event-write time. Kept as its own column
-- (not payload JSON) so sla_performance.service_tier_breakdown can GROUP BY it
-- directly, matching the routeId/reasonCode pattern already used here.
ALTER TABLE reporting.report_events ADD COLUMN "serviceTier" TEXT;
