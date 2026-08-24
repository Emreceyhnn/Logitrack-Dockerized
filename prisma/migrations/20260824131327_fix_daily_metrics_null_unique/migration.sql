-- daily_metrics_unique_cell was a plain UNIQUE btree index over columns that
-- include two nullable ones (dimensionId, warehouseId). Postgres treats NULL
-- as distinct from NULL in a unique constraint, so every TOTAL-dimension row
-- (where both are NULL) never collided with its own prior run — ON CONFLICT
-- never fired, and re-aggregating a day inserted duplicate rows instead of
-- overwriting them. Replaced with a unique expression index that folds NULL
-- to a fixed sentinel first, so two TOTAL rows for the same cell do collide.

DROP INDEX IF EXISTS "reporting"."daily_metrics_unique_cell";

CREATE UNIQUE INDEX "daily_metrics_unique_cell" ON "reporting"."daily_metrics" (
    "companyId",
    "businessDate",
    "metricKey",
    "dimension",
    (COALESCE("dimensionId", '')),
    (COALESCE("warehouseId", ''))
);
