-- cutoff_performance (warehouses.cutoffTime), dead_stock.warehouse_space_occupied_percentage
-- and capacity_projection.warehouse_capacity (warehouses.capacityVolumeM3) need the reporting
-- microservice to read warehouses. by_customer breakdowns and top_return_customers need
-- customer names/codes, not just the customerId already carried on report_events. Same
-- public-schema grant pattern as 20260827135826/20260829162200/20260829160730.
GRANT SELECT ON "public"."warehouses" TO "report_reader";
GRANT SELECT ON "public"."customers" TO "report_reader";
