-- OTD by_route breakdown and top_delayed_routes both need to GROUP BY the
-- route a delivery belongs to. Shipment.routeId exists on the domain model
-- but was never carried onto ORDER_DELIVERED/ROUTE_STARTED/ROUTE_COMPLETED
-- events — added as its own column (not payload) for the same reason as
-- warehouseId/driverId: it's a GROUP BY dimension, not display-only data.

ALTER TABLE "reporting"."report_events" ADD COLUMN "routeId" TEXT;

CREATE INDEX "report_events_route_lookup_idx"
  ON "reporting"."report_events" ("companyId", "routeId", "businessDate")
  WHERE "routeId" IS NOT NULL;
