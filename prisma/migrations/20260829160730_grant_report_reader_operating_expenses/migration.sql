-- cost_efficiency.cost_breakdown (labor/warehouse/packaging) needs the
-- reporting microservice to read manually-entered operating expenses, same
-- as the other public-schema tables granted in 20260827135826.
GRANT SELECT ON "public"."operating_expenses" TO "report_reader";
