-- Reporting schema: fact/metric/snapshot/run tables that back the daily,
-- weekly and monthly report microservice.
--
-- This schema is intentionally NOT modeled in schema.prisma / the main
-- PrismaClient. The report microservice reads it with raw SQL through a
-- read-only role; the main app writes to it explicitly (see
-- logReportEvent()) inside the same transaction as the domain write it
-- describes, also via raw SQL. Keeping it out of the generated client avoids
-- coupling the report tables' shape to Prisma's migration/introspection flow
-- for a schema that only ever needs INSERT/SELECT, never relations.

CREATE SCHEMA IF NOT EXISTS "reporting";

-- ============================================================================
-- ReportEvent — Layer 1 (fact): append-only raw event log.
-- One row per domain occurrence (a delivery, a driver assignment, a receipt).
-- Written explicitly at call sites, inside the same transaction as the
-- domain write. Never updated, never deleted by application code.
-- ============================================================================
CREATE TABLE "reporting"."report_events" (
    "id"             TEXT NOT NULL,

    "eventType"      TEXT NOT NULL,          -- ORDER_DELIVERED, DRIVER_ASSIGNED, PICK_COMPLETED, ...
    "occurredAt"     TIMESTAMP(3) NOT NULL,  -- real-world event time
    "businessDate"   DATE NOT NULL,          -- cut-off-adjusted operating day, fixed at write time

    "companyId"      TEXT NOT NULL,
    "warehouseId"    TEXT,
    "carrierId"      TEXT,
    "driverId"       TEXT,
    "customerId"     TEXT,
    "zoneId"         TEXT,

    "subjectType"    TEXT NOT NULL,          -- ORDER | SHIPMENT | TRIP | RECEIPT | PICK_TASK | ...
    "subjectId"      TEXT NOT NULL,

    "quantity"       DECIMAL(14,3),
    "weightKg"       DECIMAL(14,3),
    "volumeM3"       DECIMAL(14,4),
    "amount"         DECIMAL(14,2),
    "durationSec"    INTEGER,

    "payload"        JSONB,

    "sourceEventId"  TEXT NOT NULL,          -- idempotency key chosen by the writer
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "report_events_sourceEventId_key" ON "reporting"."report_events"("sourceEventId");
CREATE INDEX "report_events_companyId_businessDate_eventType_idx" ON "reporting"."report_events"("companyId", "businessDate", "eventType");
CREATE INDEX "report_events_companyId_businessDate_warehouseId_idx" ON "reporting"."report_events"("companyId", "businessDate", "warehouseId");
CREATE INDEX "report_events_subjectType_subjectId_idx" ON "reporting"."report_events"("subjectType", "subjectId");

-- ============================================================================
-- DailyMetric — Layer 2 (metric): pre-aggregated per-day numbers.
-- Long/EAV format (one row per metric x dimension), not wide columns, so new
-- metrics never require a migration. Weekly/monthly reports read only this
-- table for closed days — never report_events directly.
-- ============================================================================
CREATE TABLE "reporting"."daily_metrics" (
    "id"             TEXT NOT NULL,

    "businessDate"   DATE NOT NULL,
    "companyId"      TEXT NOT NULL,
    "warehouseId"    TEXT,

    "metricKey"      TEXT NOT NULL,          -- ORDERS_DELIVERED, OTD_RATE, PICK_ACCURACY, ...
    "dimension"      TEXT NOT NULL,          -- TOTAL | CARRIER | DRIVER | ZONE | CUSTOMER
    "dimensionId"    TEXT,                   -- null when dimension = TOTAL

    "value"          DECIMAL(18,4) NOT NULL,
    "numerator"      DECIMAL(18,4),          -- ratio metrics: keep parts separate so weekly/
    "denominator"    DECIMAL(18,4),          -- monthly rollups sum correctly instead of averaging %s
    "sampleCount"    INTEGER,

    "p50"            DECIMAL(18,4),          -- duration-style metrics
    "p90"            DECIMAL(18,4),

    "computedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFinal"        BOOLEAN NOT NULL DEFAULT false,  -- false while late-arriving events can still revise this day

    CONSTRAINT "daily_metrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "daily_metrics_unique_cell" ON "reporting"."daily_metrics"("companyId", "businessDate", "metricKey", "dimension", "dimensionId", "warehouseId");
CREATE INDEX "daily_metrics_companyId_metricKey_businessDate_idx" ON "reporting"."daily_metrics"("companyId", "metricKey", "businessDate");

-- ============================================================================
-- ReportSnapshot — Layer 3: point-in-time exception lists (SLA breaches,
-- stuck shipments, low stock...). Not aggregable, so JSON items are fine here
-- — this table is read to render, never to compute further.
-- ============================================================================
CREATE TABLE "reporting"."report_snapshots" (
    "id"             TEXT NOT NULL,

    "capturedAt"     TIMESTAMP(3) NOT NULL,
    "businessDate"   DATE NOT NULL,
    "companyId"      TEXT NOT NULL,
    "warehouseId"    TEXT,

    "snapshotKey"    TEXT NOT NULL,          -- SLA_BREACHED, STUCK_SHIPMENTS, LOW_STOCK, ...
    "severity"       TEXT NOT NULL,          -- CRITICAL | HIGH | MEDIUM

    "totalCount"     INTEGER NOT NULL,       -- true total, items below may be truncated
    "items"          JSONB NOT NULL,

    CONSTRAINT "report_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "report_snapshots_companyId_businessDate_snapshotKey_idx" ON "reporting"."report_snapshots"("companyId", "businessDate", "snapshotKey");

-- ============================================================================
-- ReportRun / ReportRecipient — delivery bookkeeping. Freezes the payload
-- that was actually sent (so "what did that email say" stays answerable even
-- after later re-aggregation), and guards against double-sending on cron
-- retries via the unique constraint below.
-- ============================================================================
CREATE TABLE "reporting"."report_runs" (
    "id"             TEXT NOT NULL,

    "definitionId"   TEXT NOT NULL,          -- which report config produced this run
    "companyId"      TEXT NOT NULL,
    "periodType"     TEXT NOT NULL,          -- DAILY | WEEKLY | MONTHLY
    "periodStart"    TIMESTAMP(3) NOT NULL,
    "periodEnd"      TIMESTAMP(3) NOT NULL,

    "status"         TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | GENERATED | SENT | FAILED
    "payload"        JSONB,                  -- frozen report body, as generated

    "generatedAt"    TIMESTAMP(3),
    "sentAt"         TIMESTAMP(3),
    "attemptCount"   INTEGER NOT NULL DEFAULT 0,
    "lastError"      TEXT,

    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "report_runs_dedupe_key" ON "reporting"."report_runs"("definitionId", "periodStart", "periodEnd");
CREATE INDEX "report_runs_companyId_periodType_periodStart_idx" ON "reporting"."report_runs"("companyId", "periodType", "periodStart");

CREATE TABLE "reporting"."report_recipients" (
    "id"             TEXT NOT NULL,
    "runId"          TEXT NOT NULL,

    "email"          TEXT NOT NULL,
    "status"         TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | SENT | BOUNCED | FAILED
    "messageId"      TEXT,                   -- ESP message id, for delivery tracing
    "sentAt"         TIMESTAMP(3),

    CONSTRAINT "report_recipients_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "report_recipients_runId_fkey" FOREIGN KEY ("runId") REFERENCES "reporting"."report_runs"("id") ON DELETE CASCADE
);

CREATE INDEX "report_recipients_runId_idx" ON "reporting"."report_recipients"("runId");

-- ============================================================================
-- Role grants
--
-- app_writer: the role the main Next.js app connects as. Gets INSERT only on
-- report_events (append-only fact log) and full read/write on the
-- operational run/recipient bookkeeping tables it manages directly. No
-- UPDATE/DELETE on report_events or daily_metrics — those are append-only /
-- owned by the aggregation job.
--
-- report_reader: the role the Express report microservice connects as.
-- SELECT only, across every table in the schema. No access to any table
-- outside "reporting" — that is enforced by never granting it anything on
-- "public".
--
-- Both roles are created IF NOT EXISTS so this migration is replayable
-- across environments that may already have provisioned them by hand. The
-- actual passwords are set separately via ALTER ROLE ... WITH PASSWORD,
-- outside this migration (they come from environment-specific secrets, not
-- version control).
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_writer') THEN
    CREATE ROLE "app_writer" LOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'report_reader') THEN
    CREATE ROLE "report_reader" LOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA "reporting" TO "app_writer";
GRANT INSERT ON "reporting"."report_events" TO "app_writer";
GRANT SELECT, INSERT, UPDATE ON "reporting"."report_runs" TO "app_writer";
GRANT SELECT, INSERT, UPDATE ON "reporting"."report_recipients" TO "app_writer";
GRANT SELECT ON "reporting"."daily_metrics" TO "app_writer";
GRANT SELECT ON "reporting"."report_snapshots" TO "app_writer";

GRANT USAGE ON SCHEMA "reporting" TO "report_reader";
GRANT SELECT ON ALL TABLES IN SCHEMA "reporting" TO "report_reader";
ALTER DEFAULT PRIVILEGES IN SCHEMA "reporting" GRANT SELECT ON TABLES TO "report_reader";
