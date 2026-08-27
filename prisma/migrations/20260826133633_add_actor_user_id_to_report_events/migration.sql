-- "Who did this" needs its own column, separate from driverId: a driver is
-- specifically the person a shipment/route is assigned to, but the actor on
-- a PICK_COMPLETED/PACK_COMPLETED/PUTAWAY_COMPLETED event is a warehouse
-- worker — a User with no Driver row at all. Forcing that into driverId
-- would either be wrong or force a fake Driver record just to satisfy the
-- column. actorUserId is the generic "who performed this" — usable for any
-- event type, not just warehouse tasks — while driverId stays specific to
-- "which driver this shipment/route belongs to".

ALTER TABLE "reporting"."report_events" ADD COLUMN "actorUserId" TEXT;

-- Powers "per-worker throughput this week" style queries without a full
-- table scan.
CREATE INDEX "report_events_actor_lookup_idx"
  ON "reporting"."report_events" ("companyId", "actorUserId", "businessDate")
  WHERE "actorUserId" IS NOT NULL;
