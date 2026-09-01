-- inventory_turnover.inventory_turnover_ratio / total_cogs need a COGS proxy:
-- SUM(ABS(quantity)) WHERE type='PICK' (the only real stock-out movement —
-- PACK is ledger-only, ALLOCATION* are reservations, not outflow) joined
-- against public.inventory.unitValue (already granted). Same public-schema
-- grant pattern as 20260827135826/20260831120000/20260831130100.
GRANT SELECT ON "public"."inventory_movements" TO "report_reader";
