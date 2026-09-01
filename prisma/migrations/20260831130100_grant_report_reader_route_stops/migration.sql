-- unassigned_jobs.unassigned_routes[].origin/destination and the weekly
-- otd.breakdown.by_route / worst_n_rankings.top_delayed_routes fields need
-- per-route origin/destination, which routes itself doesn't store — only its
-- ordered route_stops do (first stop = origin, last stop = destination). Same
-- public-schema grant pattern as 20260827135826/20260831120000.
GRANT SELECT ON "public"."route_stops" TO "report_reader";
