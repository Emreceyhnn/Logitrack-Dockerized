/**
 * Seeds reporting.report_events with realistic mock data covering every
 * eventType/column/payload key the daily/weekly/monthly report mocks need
 * (see REPORTING_DATA_MAP.md). Idempotent — every sourceEventId is prefixed
 * "seed-" so re-running just no-ops via ON CONFLICT DO NOTHING.
 *
 * Run:  npx dotenv -e .env -- npx tsx scripts/seed-report-events.ts
 * Wipe: npx dotenv -e .env -- npx tsx scripts/seed-report-events.ts --clear
 */
import { db } from "../app/lib/db";
import { logReportEvent } from "../app/lib/services/reportEvents";

const COMPANY_ID = "cmt5yad0c000a01samw5fg0k4";

// ---- Reference ids MUST match the real rows created by seed-public-schema.ts
// (event columns don't enforce FK, but report queries join against public.*) ----
const WAREHOUSES = ["seed-wh-istanbul", "seed-wh-ankara", "seed-wh-izmir"];
const ZONES = ["A1", "A2", "B1", "B2", "C1"];
const DRIVERS = ["seed-driver-1", "seed-driver-2", "seed-driver-3", "seed-driver-4", "seed-driver-5"];
const CUSTOMERS = ["seed-cust-acme", "seed-cust-globex", "seed-cust-initech", "seed-cust-umbrella", "seed-cust-soylent"];
const ROUTES = ["seed-route-unassigned-1", "seed-route-unassigned-2", "seed-route-today-1", "seed-route-today-2"];
const WORKERS = ["user-worker1", "user-worker2", "user-worker3"];
const SKUS = ["SKU-1001", "SKU-1002", "SKU-1003", "SKU-1004", "SKU-1005"];
const SERVICE_TIERS = ["SAME_DAY", "NEXT_DAY", "STANDARD_48H"] as const;
const FAILURE_REASONS = [
  "CUSTOMER_NOT_AT_ADDRESS",
  "INCORRECT_INCOMPLETE_ADDRESS",
  "CUSTOMER_REJECTED_DAMAGED",
  "CUSTOMER_REJECTED_OTHER",
  "TIME_WINDOW_EXCEEDED",
] as const;
const RETURN_REASONS = [
  "WRONG_ITEM_SHIPPED",
  "CUSTOMER_CHANGED_MIND",
  "DAMAGED_IN_TRANSIT",
  "QUALITY_ISSUE",
  "DUPLICATE_ORDER",
  "OTHER",
] as const;
const PICK_DISCREPANCY_REASONS = ["MISCOUNT", "WRONG_LOCATION", "DAMAGED_ON_SHELF"];

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!;
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randFloat(min: number, max: number, decimals = 2): number {
  const v = Math.random() * (max - min) + min;
  return Number(v.toFixed(decimals));
}
function dateAt(daysAgo: number, hour = 10, minute = 0): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}
function addMinutes(d: Date, min: number): Date {
  return new Date(d.getTime() + min * 60_000);
}
function addHours(d: Date, h: number): Date {
  return new Date(d.getTime() + h * 3_600_000);
}

let seq = 0;
function nextSeq(): number {
  return seq++;
}

async function seedForDay(daysAgo: number, shipmentCount: number) {
  await db.$transaction(async (tx) => {
    for (let i = 0; i < shipmentCount; i++) {
      const idx = nextSeq();
      const shipmentId = `seed-shp-${daysAgo}-${i}`;
      const warehouseId = pick(WAREHOUSES, idx);
      const driverId = pick(DRIVERS, idx);
      const customerId = pick(CUSTOMERS, idx);
      const routeId = pick(ROUTES, idx);
      const serviceTier = pick(SERVICE_TIERS, idx);
      const weightKg = randFloat(50, 900);
      const volumeM3 = randFloat(0.5, 6);
      const revenue = randFloat(300, 4500);
      const extraCost = Math.random() < 0.4 ? randFloat(20, 300) : 0;

      const createdAt = dateAt(daysAgo, randInt(6, 10), randInt(0, 59));
      const slaHours = serviceTier === "SAME_DAY" ? 8 : serviceTier === "NEXT_DAY" ? 24 : 48;
      const slaDeadline = addHours(createdAt, slaHours);

      // SHIPMENT_CREATED
      await logReportEvent(tx, {
        eventType: "SHIPMENT_CREATED",
        occurredAt: createdAt,
        companyId: COMPANY_ID,
        subjectType: "SHIPMENT",
        subjectId: shipmentId,
        warehouseId,
        driverId,
        customerId,
        routeId,
        quantity: randInt(1, 40),
        weightKg,
        volumeM3,
        revenue,
        amount: extraCost || null,
        serviceTier,
        payload: extraCost ? { extraCostNote: "Hamaliye + sigorta" } : null,
        sourceEventId: `seed-shipment-created-${shipmentId}`,
      });

      // SHIPMENT_DISPATCHED (cutoff performance depends on this vs warehouse cutoffTime)
      const dispatchedAt = addMinutes(createdAt, randInt(30, 240));
      await logReportEvent(tx, {
        eventType: "SHIPMENT_DISPATCHED",
        occurredAt: dispatchedAt,
        companyId: COMPANY_ID,
        subjectType: "SHIPMENT",
        subjectId: shipmentId,
        warehouseId,
        driverId,
        customerId,
        routeId,
        sourceEventId: `seed-shipment-dispatched-${shipmentId}`,
      });

      // Outcome distribution: 70% delivered, 15% failed, 10% returned, 5% still in transit (no terminal event)
      const roll = Math.random();
      if (roll < 0.70) {
        const isLate = Math.random() < 0.22; // ~22% late deliveries
        const deliveredAt = isLate
          ? addHours(slaDeadline, randFloat(0.5, 6))
          : addMinutes(slaDeadline, -randInt(30, 600));
        const isPartial = Math.random() < 0.12;
        const hasDocumentIssue = Math.random() < 0.08;

        await logReportEvent(tx, {
          eventType: "ORDER_DELIVERED",
          occurredAt: deliveredAt,
          companyId: COMPANY_ID,
          subjectType: "SHIPMENT",
          subjectId: shipmentId,
          warehouseId,
          driverId,
          customerId,
          routeId,
          durationSec: Math.max(0, Math.floor((deliveredAt.getTime() - createdAt.getTime()) / 1000)),
          slaDeadline,
          isPartial,
          hasDocumentIssue,
          serviceTier,
          sourceEventId: `seed-order-delivered-${shipmentId}`,
        });
      } else if (roll < 0.85) {
        const failedAt = addMinutes(dispatchedAt, randInt(60, 480));
        const reasonCode = pick(FAILURE_REASONS, idx);
        await logReportEvent(tx, {
          eventType: "DELIVERY_FAILED",
          occurredAt: failedAt,
          companyId: COMPANY_ID,
          subjectType: "SHIPMENT",
          subjectId: shipmentId,
          warehouseId,
          driverId,
          customerId,
          routeId,
          reasonCode,
          serviceTier,
          payload: { reason: "Teslimat başarısız oldu" },
          sourceEventId: `seed-delivery-failed-${shipmentId}`,
        });
      } else if (roll < 0.95) {
        // Deliver then return
        const deliveredAt = addMinutes(slaDeadline, -randInt(30, 300));
        await logReportEvent(tx, {
          eventType: "ORDER_DELIVERED",
          occurredAt: deliveredAt,
          companyId: COMPANY_ID,
          subjectType: "SHIPMENT",
          subjectId: shipmentId,
          warehouseId,
          driverId,
          customerId,
          routeId,
          durationSec: Math.max(0, Math.floor((deliveredAt.getTime() - createdAt.getTime()) / 1000)),
          slaDeadline,
          isPartial: false,
          hasDocumentIssue: false,
          serviceTier,
          sourceEventId: `seed-order-delivered-for-return-${shipmentId}`,
        });
        const returnedAt = addHours(deliveredAt, randInt(6, 48));
        const returnReason = pick(RETURN_REASONS, idx);
        await logReportEvent(tx, {
          eventType: "ORDER_RETURNED",
          occurredAt: returnedAt,
          companyId: COMPANY_ID,
          subjectType: "SHIPMENT",
          subjectId: shipmentId,
          warehouseId,
          driverId,
          customerId,
          routeId,
          reasonCode: returnReason,
          payload: { reason: "Müşteri iade talep etti" },
          sourceEventId: `seed-order-returned-${shipmentId}`,
        });
      }
      // else: left dispatched only (in-transit, no terminal event) — 5%

      // DRIVER_ASSIGNED (most shipments)
      if (Math.random() < 0.9) {
        await logReportEvent(tx, {
          eventType: "DRIVER_ASSIGNED",
          occurredAt: addMinutes(createdAt, 5),
          companyId: COMPANY_ID,
          subjectType: "SHIPMENT",
          subjectId: shipmentId,
          driverId,
          sourceEventId: `seed-driver-assigned-${shipmentId}`,
        });
      }
    }

    // ---- Route-level events (ROUTE_STARTED / ROUTE_COMPLETED) ----
    for (let r = 0; r < 3; r++) {
      const idx = nextSeq();
      const routeId = pick(ROUTES, idx);
      const driverId = pick(DRIVERS, idx);
      const startAt = dateAt(daysAgo, randInt(6, 8));
      const loadedWeightKg = randFloat(400, 3800);
      const maxLoadKg = 4000;
      const loadedVolumeM3 = randFloat(3, 28);
      const capacityVolumeM3 = 30;
      const isEmptyReturn = Math.random() < 0.15;
      const distanceKm = randFloat(20, 260);

      await logReportEvent(tx, {
        eventType: "ROUTE_STARTED",
        occurredAt: startAt,
        companyId: COMPANY_ID,
        subjectType: "ROUTE",
        subjectId: `seed-route-${daysAgo}-${r}`,
        driverId,
        routeId,
        weightKg: loadedWeightKg,
        volumeM3: loadedVolumeM3,
        payload: {
          maxLoadKg,
          fillRate: loadedWeightKg / maxLoadKg,
          capacityVolumeM3,
          volumeFillRate: loadedVolumeM3 / capacityVolumeM3,
          isEmptyReturn,
        },
        sourceEventId: `seed-route-started-${daysAgo}-${r}`,
      });

      const endAt = addHours(startAt, randFloat(2, 9));
      await logReportEvent(tx, {
        eventType: "ROUTE_COMPLETED",
        occurredAt: endAt,
        companyId: COMPANY_ID,
        subjectType: "ROUTE",
        subjectId: `seed-route-${daysAgo}-${r}`,
        driverId,
        routeId,
        quantity: randInt(3, 12),
        weightKg: loadedWeightKg,
        volumeM3: isEmptyReturn ? 0 : loadedVolumeM3,
        payload: {
          distanceKm,
          maxLoadKg,
          fillRate: isEmptyReturn ? 0 : loadedWeightKg / maxLoadKg,
          capacityVolumeM3,
          volumeFillRate: isEmptyReturn ? 0 : loadedVolumeM3 / capacityVolumeM3,
          isEmptyReturn,
        },
        sourceEventId: `seed-route-completed-${daysAgo}-${r}`,
      });
    }

    // ---- Warehouse floor events: INBOUND_ARRIVED -> INBOUND_RECEIVED (dock-to-stock pairing) ----
    for (let w = 0; w < WAREHOUSES.length; w++) {
      const idx = nextSeq();
      const warehouseId = WAREHOUSES[w]!;
      const actorUserId = pick(WORKERS, idx);
      const arrivedAt = dateAt(daysAgo, randInt(7, 9));
      await logReportEvent(tx, {
        eventType: "INBOUND_ARRIVED",
        occurredAt: arrivedAt,
        companyId: COMPANY_ID,
        subjectType: "WAREHOUSE",
        subjectId: warehouseId,
        warehouseId,
        actorUserId,
        payload: { note: "Tedarikçi aracı vardı" },
        sourceEventId: `seed-inbound-arrived-${daysAgo}-${w}`,
      });

      const dockToStockMinutes = randInt(15, 90);
      const receivedAt = addMinutes(arrivedAt, dockToStockMinutes);
      const sku = pick(SKUS, idx);
      const receivedQty = randInt(50, 500);
      await logReportEvent(tx, {
        eventType: "INBOUND_RECEIVED",
        occurredAt: receivedAt,
        companyId: COMPANY_ID,
        subjectType: "INVENTORY_MOVEMENT",
        subjectId: `seed-mv-inbound-${daysAgo}-${w}`,
        warehouseId,
        zoneId: pick(ZONES, idx),
        quantity: receivedQty,
        actorUserId,
        payload: { sku, kind: "STOCK_IN" },
        sourceEventId: `seed-inbound-received-${daysAgo}-${w}`,
      });
    }

    // ---- Pick / Pack / Putaway completions + occasional STOCK_ADJUSTED (accuracy errors) ----
    for (let p = 0; p < 8; p++) {
      const idx = nextSeq();
      const warehouseId = pick(WAREHOUSES, idx);
      const actorUserId = pick(WORKERS, idx);
      const occurredAt = dateAt(daysAgo, randInt(9, 17), randInt(0, 59));
      const kind = p % 3 === 0 ? "PICK_COMPLETED" : p % 3 === 1 ? "PACK_COMPLETED" : "PUTAWAY_COMPLETED";
      const sku = pick(SKUS, idx);
      const orderRef = `seed-order-ref-${daysAgo}-${p}`;
      await logReportEvent(tx, {
        eventType: kind,
        occurredAt,
        companyId: COMPANY_ID,
        subjectType: "WAREHOUSE_TASK",
        subjectId: `seed-task-${daysAgo}-${p}`,
        warehouseId,
        zoneId: pick(ZONES, idx),
        quantity: randInt(5, 60),
        actorUserId,
        payload: { sku, orderRef },
        sourceEventId: `seed-task-completed-${daysAgo}-${p}`,
      });
    }

    // A handful of STOCK_ADJUSTED with discrepancy reasonCode / PACK_ERROR (drives pick/pack accuracy)
    for (let a = 0; a < 3; a++) {
      const idx = nextSeq();
      const warehouseId = pick(WAREHOUSES, idx);
      const actorUserId = pick(WORKERS, idx);
      const occurredAt = dateAt(daysAgo, randInt(9, 17), randInt(0, 59));
      const isPack = a === 2;
      const reasonCode = isPack ? "PACK_ERROR" : pick(PICK_DISCREPANCY_REASONS, idx);
      const delta = -randInt(1, 5);
      const sku = pick(SKUS, idx);
      await logReportEvent(tx, {
        eventType: "STOCK_ADJUSTED",
        occurredAt,
        companyId: COMPANY_ID,
        subjectType: "INVENTORY_MOVEMENT",
        subjectId: `seed-mv-adjust-${daysAgo}-${a}`,
        warehouseId,
        zoneId: pick(ZONES, idx),
        quantity: delta,
        actorUserId,
        reasonCode,
        payload: { sku, reason: "Fiziksel sayım farkı", counted: 10 + delta, systemExpected: 10 },
        sourceEventId: `seed-stock-adjusted-${daysAgo}-${a}`,
      });
    }

    // ---- Damage / other issues ----
    for (let d = 0; d < 2; d++) {
      const idx = nextSeq();
      const isVehicleSource = d % 2 === 0;
      const warehouseId = isVehicleSource ? null : pick(WAREHOUSES, idx);
      const occurredAt = dateAt(daysAgo, randInt(8, 18), randInt(0, 59));
      const actorUserId = pick(WORKERS, idx);
      await logReportEvent(tx, {
        eventType: "ISSUE_OPENED",
        occurredAt,
        companyId: COMPANY_ID,
        subjectType: "ISSUE",
        subjectId: `seed-issue-${daysAgo}-${d}`,
        warehouseId,
        zoneId: warehouseId ? pick(ZONES, idx) : null,
        actorUserId,
        payload: {
          source: isVehicleSource ? "vehicle" : "warehouse",
          type: "DAMAGE",
          priority: "MEDIUM",
        },
        sourceEventId: `seed-issue-opened-${daysAgo}-${d}`,
      });
    }

    // ---- Fuel + maintenance ----
    const fuelAt = dateAt(daysAgo, randInt(6, 20));
    await logReportEvent(tx, {
      eventType: "FUEL_LOGGED",
      occurredAt: fuelAt,
      companyId: COMPANY_ID,
      subjectType: "FUEL_LOG",
      subjectId: `seed-fuel-${daysAgo}`,
      driverId: pick(DRIVERS, nextSeq()),
      amount: randFloat(300, 1800),
      quantity: randFloat(40, 220),
      payload: { vehicleId: "seed-vehicle-1", fuelType: "DIESEL", odometerKm: randInt(10000, 90000), currency: "TRY" },
      sourceEventId: `seed-fuel-logged-${daysAgo}`,
    });

    if (Math.random() < 0.3) {
      await logReportEvent(tx, {
        eventType: "MAINTENANCE_COMPLETED",
        occurredAt: dateAt(daysAgo, randInt(7, 19)),
        companyId: COMPANY_ID,
        subjectType: "MAINTENANCE_RECORD",
        subjectId: `seed-maint-${daysAgo}`,
        amount: randFloat(500, 4500),
        payload: { vehicleId: "seed-vehicle-2", type: "ROUTINE_MAINTENANCE" },
        sourceEventId: `seed-maintenance-completed-${daysAgo}`,
      });
    }

    // ---- Operating expenses (labor/warehouse rent/packaging) — a few times per month, not daily ----
    if (daysAgo % 7 === 0) {
      const categories = ["LABOR", "WAREHOUSE_RENT", "PACKAGING"] as const;
      for (const category of categories) {
        const amount =
          category === "LABOR" ? randFloat(15000, 45000) :
          category === "WAREHOUSE_RENT" ? randFloat(8000, 20000) :
          randFloat(1000, 5000);
        await logReportEvent(tx, {
          eventType: "OPERATING_EXPENSE_LOGGED",
          occurredAt: dateAt(daysAgo, 9),
          companyId: COMPANY_ID,
          subjectType: "OPERATING_EXPENSE",
          subjectId: `seed-opex-${daysAgo}-${category}`,
          amount,
          payload: { category, currency: "TRY" },
          sourceEventId: `seed-operating-expense-${daysAgo}-${category}`,
        });
      }
    }
  });
}

async function clear() {
  const res: unknown = await db.$executeRawUnsafe(
    `DELETE FROM reporting.report_events WHERE "companyId" = '${COMPANY_ID}' AND "sourceEventId" LIKE 'seed-%'`
  );
  console.log("Cleared seed events:", res);
}

async function main() {
  if (process.argv.includes("--clear")) {
    await clear();
    process.exit(0);
  }

  console.log(`Seeding reporting.report_events for company ${COMPANY_ID} ...`);

  // Cover: yesterday (daily report), last 8 days (weekly + comparison),
  // and a spread across the current + previous month + same month last year
  // (monthly report + YoY comparison + historical trend).
  const days: number[] = [];

  // Last 35 days, denser near "yesterday" (day 1) so daily/weekly numbers are rich.
  for (let d = 1; d <= 35; d++) days.push(d);

  // Historical monthly trend + YoY: sprinkle a few days per month for the
  // last 13 months so historical_monthly_trend / yoy_comparison have data.
  const now = new Date();
  for (let m = 1; m <= 13; m++) {
    const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m, 15));
    const daysAgoFromToday = Math.floor((now.getTime() - base.getTime()) / 86_400_000);
    if (daysAgoFromToday > 35) days.push(daysAgoFromToday);
  }

  for (const daysAgo of days) {
    const shipmentCount = daysAgo <= 7 ? randInt(8, 14) : randInt(3, 7);
    await seedForDay(daysAgo, shipmentCount);
    console.log(`  day -${daysAgo}: seeded ${shipmentCount} shipments + route/warehouse/fuel/opex events`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
