-- Freight revenue, kept separate from `amount` (which now carries ad-hoc
-- extra costs — handling/customs/insurance). Two columns rather than
-- overloading `amount` with a sign convention, so a query can sum revenue
-- and cost independently (profit = revenue - amount - fuel - maintenance)
-- without depending on every writer getting a +/- sign right.

ALTER TABLE "reporting"."report_events" ADD COLUMN "revenue" DECIMAL(14,2);
