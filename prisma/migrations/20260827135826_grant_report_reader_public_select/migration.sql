-- today_actions (SLA monitoring, inactive shipments, unassigned jobs,
-- pending picking queue, inventory alerts, today's plan) cannot be answered
-- from reporting.report_events — those are "still open / still unassigned /
-- still low" questions, which are live-state queries, not facts an event log
-- can express. report_reader gets read-only access to exactly the public
-- tables those queries need; everything else in public stays off-limits, and
-- app_writer's own grants (INSERT-only on report_events) are untouched.

GRANT USAGE ON SCHEMA "public" TO "report_reader";

GRANT SELECT ON "public"."shipments" TO "report_reader";
GRANT SELECT ON "public"."routes" TO "report_reader";
GRANT SELECT ON "public"."vehicles" TO "report_reader";
GRANT SELECT ON "public"."drivers" TO "report_reader";
GRANT SELECT ON "public"."warehouse_tasks" TO "report_reader";
GRANT SELECT ON "public"."inventory" TO "report_reader";
