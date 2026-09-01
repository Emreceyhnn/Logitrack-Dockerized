-- inventory_alerts.critical_stock_skus[].reorder_point (report service) had no
-- source column — only minStock (the "critical" threshold) existed. reorderPoint
-- is a separate, optional, lead-time-driven restock threshold; nullable because
-- most rows won't set it until a real reorder policy is defined per SKU.
ALTER TABLE "inventory" ADD COLUMN "reorderPoint" INTEGER;
