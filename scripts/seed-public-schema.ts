/**
 * Seeds the `public` schema (live/current-state tables) with mock data for
 * the same company the reporting.report_events seed already targets — so
 * today_actions and the public-schema parts of the monthly report
 * (dead_stock, inventory_turnover, capacity_projection) have something to
 * query too. See REPORTING_DATA_MAP.md for which report field reads which
 * table.
 *
 * All rows are tagged so they're easy to find/remove:
 *   - Users:      email ends with "@seed.logitrack.local"
 *   - Everything else: id/employeeId/fleetNo/code/sku prefixed "seed-"
 *
 * Run:  npx dotenv -e .env -- npx tsx scripts/seed-public-schema.ts
 * Wipe: npx dotenv -e .env -- npx tsx scripts/seed-public-schema.ts --clear
 */
import { db } from "../app/lib/db";
import { runWithTenant } from "../app/lib/tenant-context";

const COMPANY_ID = "cmt5yad0c000a01samw5fg0k4";

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randFloat(min: number, max: number, decimals = 2): number {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
}
function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!;
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}
function daysFromNow(n: number): Date {
  return daysAgo(-n);
}

async function clear() {
  // Children first (FK order), all scoped to this company + seed prefix.
  await db.issue.deleteMany({ where: { companyId: COMPANY_ID, id: { startsWith: "seed-" } } });
  await db.routeStop.deleteMany({ where: { companyId: COMPANY_ID, id: { startsWith: "seed-" } } });
  await db.route.deleteMany({ where: { companyId: COMPANY_ID, id: { startsWith: "seed-" } } });
  await db.shipmentHistory.deleteMany({ where: { companyId: COMPANY_ID, id: { startsWith: "seed-" } } });
  await db.shipment.deleteMany({ where: { companyId: COMPANY_ID, id: { startsWith: "seed-" } } });
  await db.warehouseTask.deleteMany({ where: { companyId: COMPANY_ID, id: { startsWith: "seed-" } } });
  await db.inventoryMovement.deleteMany({ where: { companyId: COMPANY_ID, id: { startsWith: "seed-" } } });
  await db.inventory.deleteMany({ where: { companyId: COMPANY_ID, id: { startsWith: "seed-" } } });
  await db.operatingExpense.deleteMany({ where: { companyId: COMPANY_ID, id: { startsWith: "seed-" } } });
  await db.customerLocation.deleteMany({ where: { companyId: COMPANY_ID, id: { startsWith: "seed-" } } });
  await db.customer.deleteMany({ where: { companyId: COMPANY_ID, id: { startsWith: "seed-" } } });
  await db.driver.deleteMany({ where: { companyId: COMPANY_ID, id: { startsWith: "seed-" } } });
  await db.vehicle.deleteMany({ where: { companyId: COMPANY_ID, id: { startsWith: "seed-" } } });
  await db.warehouseZone.deleteMany({ where: { companyId: COMPANY_ID, id: { startsWith: "seed-" } } });
  await db.warehouse.deleteMany({ where: { companyId: COMPANY_ID, id: { startsWith: "seed-" } } });
  await db.user.deleteMany({ where: { companyId: COMPANY_ID, email: { endsWith: "@seed.logitrack.local" } } });
  console.log("Cleared seeded public-schema rows.");
}

async function main() {
  if (process.argv.includes("--clear")) {
    await clear();
    process.exit(0);
  }

  console.log(`Seeding public schema for company ${COMPANY_ID} ...`);

  // ---------------------------------------------------------------------
  // Warehouses (3) — capacityVolumeM3/cutoffTime feed cutoff_performance,
  // dead_stock.warehouse_space_occupied_percentage, capacity_projection.
  // ---------------------------------------------------------------------
  const warehouseDefs = [
    { id: "seed-wh-istanbul", code: "SEED-IST", name: "İstanbul Ana Depo", city: "İstanbul", cutoffTime: "17:00", capacityVolumeM3: 12000 },
    { id: "seed-wh-ankara", code: "SEED-ANK", name: "Ankara Depo", city: "Ankara", cutoffTime: "16:30", capacityVolumeM3: 8000 },
    { id: "seed-wh-izmir", code: "SEED-IZM", name: "İzmir Depo", city: "İzmir", cutoffTime: "18:00", capacityVolumeM3: 6000 },
  ];
  for (const w of warehouseDefs) {
    await db.warehouse.upsert({
      where: { id: w.id },
      create: {
        id: w.id,
        code: w.code,
        name: w.name,
        type: "WAREHOUSE",
        address: `${w.name} Cad. No:1`,
        city: w.city,
        country: "Türkiye",
        companyId: COMPANY_ID,
        cutoffTime: w.cutoffTime,
        capacityVolumeM3: w.capacityVolumeM3,
        capacityPallets: 4000,
        operatingHours: "06:00 - 22:00",
      },
      update: {},
    });
  }
  console.log(`  warehouses: ${warehouseDefs.length}`);

  const ZONES = ["A1", "A2", "B1", "B2", "C1"];
  for (const w of warehouseDefs) {
    for (const zone of ZONES) {
      await db.warehouseZone.upsert({
        where: { warehouseId_code: { warehouseId: w.id, code: zone } },
        create: {
          id: `seed-zone-${w.id}-${zone}`,
          warehouseId: w.id,
          companyId: COMPANY_ID,
          code: zone,
          name: `Zone ${zone}`,
          capacityPallets: 500,
          usedPallets: randInt(50, 450),
        },
        update: {},
      });
    }
  }
  console.log(`  warehouse zones: ${warehouseDefs.length * ZONES.length}`);

  // ---------------------------------------------------------------------
  // Users (drivers + warehouse workers) — needed as Driver.userId FK.
  // ---------------------------------------------------------------------
  const driverDefs = [
    { id: "seed-user-ahmet", first: "Ahmet", last: "Yılmaz" },
    { id: "seed-user-mehmet", first: "Mehmet", last: "Demir" },
    { id: "seed-user-ayse", first: "Ayşe", last: "Kaya" },
    { id: "seed-user-fatma", first: "Fatma", last: "Şahin" },
    { id: "seed-user-can", first: "Can", last: "Öztürk" },
  ];
  for (const d of driverDefs) {
    await db.user.upsert({
      where: { id: d.id },
      create: {
        id: d.id,
        email: `${d.id}@seed.logitrack.local`,
        name: d.first,
        surname: d.last,
        companyId: COMPANY_ID,
        currency: "TRY",
        roleId: "role_driver",
      },
      update: {},
    });
  }
  console.log(`  driver users: ${driverDefs.length}`);

  const workerDefs = [
    { id: "seed-user-worker1", first: "Elif", last: "Arslan" },
    { id: "seed-user-worker2", first: "Burak", last: "Koç" },
    { id: "seed-user-worker3", first: "Zeynep", last: "Aydın" },
  ];
  for (const w of workerDefs) {
    await db.user.upsert({
      where: { id: w.id },
      create: {
        id: w.id,
        email: `${w.id}@seed.logitrack.local`,
        name: w.first,
        surname: w.last,
        companyId: COMPANY_ID,
        currency: "TRY",
        roleId: "role_warehouse",
        assignedWarehouseId: warehouseDefs[0]!.id,
      },
      update: {},
    });
  }
  console.log(`  warehouse worker users: ${workerDefs.length}`);

  // ---------------------------------------------------------------------
  // Vehicles (6) — includes BREAKDOWN/MAINTENANCE/OUT_OF_ORDER with
  // estimatedAvailableDate for today_plan.non_available_fleet.
  // ---------------------------------------------------------------------
  const vehicleDefs = [
    { id: "seed-veh-1", fleetNo: "SEED-V1", plate: "34SEED01", status: "AVAILABLE" as const, estAvail: null },
    { id: "seed-veh-2", fleetNo: "SEED-V2", plate: "34SEED02", status: "ON_TRIP" as const, estAvail: null },
    { id: "seed-veh-3", fleetNo: "SEED-V3", plate: "34SEED03", status: "AVAILABLE" as const, estAvail: null },
    { id: "seed-veh-4", fleetNo: "SEED-V4", plate: "06SEED04", status: "MAINTENANCE" as const, estAvail: daysFromNow(2) },
    { id: "seed-veh-5", fleetNo: "SEED-V5", plate: "06SEED05", status: "BREAKDOWN" as const, estAvail: daysFromNow(5) },
    { id: "seed-veh-6", fleetNo: "SEED-V6", plate: "35SEED06", status: "OUT_OF_ORDER" as const, estAvail: daysFromNow(10) },
  ];
  for (const v of vehicleDefs) {
    await db.vehicle.upsert({
      where: { id: v.id },
      create: {
        id: v.id,
        fleetNo: v.fleetNo,
        plate: v.plate,
        type: "TRUCK",
        brand: "Mercedes-Benz",
        model: "Actros",
        year: 2021,
        status: v.status,
        estimatedAvailableDate: v.estAvail,
        maxLoadKg: 8000,
        fuelType: "DIESEL",
        odometerKm: randInt(20000, 150000),
        fuelLevel: randInt(20, 100),
        companyId: COMPANY_ID,
      },
      update: {},
    });
  }
  console.log(`  vehicles: ${vehicleDefs.length}`);

  // ---------------------------------------------------------------------
  // Drivers (5) — includes ON_LEAVE/SICK_LEAVE with returnDate.
  // ---------------------------------------------------------------------
  const driverStatusDefs = [
    { userId: "seed-user-ahmet", status: "ON_JOB" as const, returnDate: null },
    { userId: "seed-user-mehmet", status: "OFF_DUTY" as const, returnDate: null },
    { userId: "seed-user-ayse", status: "ON_JOB" as const, returnDate: null },
    { userId: "seed-user-fatma", status: "ON_LEAVE" as const, returnDate: daysFromNow(4) },
    { userId: "seed-user-can", status: "SICK_LEAVE" as const, returnDate: daysFromNow(2) },
  ];
  const driverIds: string[] = [];
  for (let i = 0; i < driverStatusDefs.length; i++) {
    const d = driverStatusDefs[i]!;
    const id = `seed-driver-${i + 1}`;
    driverIds.push(id);
    await db.driver.upsert({
      where: { id },
      create: {
        id,
        userId: d.userId,
        employeeId: `SEED-EMP-${i + 1}`,
        phone: `05001234${String(i).padStart(3, "0")}`,
        status: d.status,
        returnDate: d.returnDate,
        companyId: COMPANY_ID,
        homeBaseWarehouseId: pick(warehouseDefs, i).id,
        rating: randFloat(3.5, 5, 1),
        safetyScore: randInt(70, 100),
        efficiencyScore: randInt(70, 100),
      },
      update: {},
    });
  }
  console.log(`  drivers: ${driverIds.length}`);

  // ---------------------------------------------------------------------
  // Customers (5) + one location each — for by_customer / top_return_customers name resolution.
  // ---------------------------------------------------------------------
  const customerDefs = [
    { id: "seed-cust-acme", code: "SEED-ACME", name: "Acme Lojistik A.Ş." },
    { id: "seed-cust-globex", code: "SEED-GLBX", name: "Globex Dağıtım Ltd." },
    { id: "seed-cust-initech", code: "SEED-INIT", name: "Initech Ticaret" },
    { id: "seed-cust-umbrella", code: "SEED-UMBR", name: "Umbrella Market" },
    { id: "seed-cust-soylent", code: "SEED-SOYL", name: "Soylent Gıda San." },
  ];
  for (const c of customerDefs) {
    await db.customer.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        code: c.code,
        name: c.name,
        companyId: COMPANY_ID,
        email: `${c.code.toLowerCase()}@seed.logitrack.local`,
        phone: "02121234567",
      },
      update: {},
    });
  }
  console.log(`  customers: ${customerDefs.length}`);

  // ---------------------------------------------------------------------
  // Inventory (across all 3 warehouses) — includes zero-stock, critical
  // (<=minStock), healthy, and old/stale rows (dead stock via updatedAt).
  // ---------------------------------------------------------------------
  const categories = ["Electronics", "Textiles", "Food & Beverage", "Automotive Parts", "General Cargo"];
  let invSeq = 0;
  for (const w of warehouseDefs) {
    for (let i = 0; i < 10; i++) {
      invSeq++;
      const id = `seed-inv-${w.id}-${i}`;
      const category = pick(categories, invSeq);
      // Distribution: 2 zero-stock, 2 critical, 4 healthy, 2 dead-stock (old updatedAt)
      let quantity: number;
      const minStock = 20;
      if (i < 2) quantity = 0;
      else if (i < 4) quantity = randInt(1, 15);
      else quantity = randInt(50, 500);

      const isDeadStock = i >= 8;
      await db.inventory.upsert({
        where: { id },
        create: {
          id,
          warehouseId: w.id,
          sku: `SEED-SKU-${invSeq}`,
          name: `${category} Ürünü ${invSeq}`,
          zone: pick(ZONES, invSeq),
          quantity,
          minStock,
          allocatedQuantity: Math.min(quantity, randInt(0, 10)),
          unitValue: randFloat(50, 2000),
          currency: "TRY",
          unit: "Each",
          weightKg: randFloat(0.5, 50),
          volumeM3: randFloat(0.01, 2),
          palletCount: randInt(0, 5),
          cargoType: category,
          companyId: COMPANY_ID,
        },
        update: {},
      });
      if (isDeadStock) {
        // Force updatedAt far in the past so aging_inactivity_breakdown buckets populate.
        const staleDays = i === 8 ? 200 : 400; // one in 180-365, one in 365+
        await db.$executeRawUnsafe(
          `UPDATE "inventory" SET "updatedAt" = $1 WHERE id = $2`,
          daysAgo(staleDays),
          id
        );
      }
    }
  }
  console.log(`  inventory items: ${invSeq}`);

  // ---------------------------------------------------------------------
  // Inventory movements (PICK) — the only real stock-out movement type
  // (PACK is ledger-only, ALLOCATION* are reservations). Feeds the
  // inventory_turnover COGS proxy: SUM(ABS(quantity)) WHERE type='PICK'
  // joined against inventory.unitValue. Only on healthy (non-dead-stock)
  // rows, spread across the last 30 days so a turnover *rate* is meaningful.
  // ---------------------------------------------------------------------
  let movementSeq = 0;
  invSeq = 0;
  for (const w of warehouseDefs) {
    for (let i = 0; i < 10; i++) {
      invSeq++;
      if (i < 4 || i >= 8) continue; // skip zero-stock/critical/dead-stock rows
      const sku = `SEED-SKU-${invSeq}`;
      const pickCount = randInt(2, 5);
      for (let p = 0; p < pickCount; p++) {
        movementSeq++;
        const movementId = `seed-mov-${w.id}-${invSeq}-${p}`;
        await db.inventoryMovement.upsert({
          where: { id: movementId },
          create: {
            id: movementId,
            warehouseId: w.id,
            sku,
            quantity: -randInt(1, 20),
            type: "PICK",
            zone: pick(ZONES, invSeq),
            companyId: COMPANY_ID,
            date: daysAgo(randInt(0, 29)),
          },
          update: {},
        });
      }
    }
  }
  console.log(`  inventory movements (PICK): ${movementSeq}`);

  // ---------------------------------------------------------------------
  // Warehouse tasks (open PICK queue with varying ages for aging_breakdown).
  // itemCounts is parallel to taskAgesHours — indices 2, 4, 6 (1.5h/3h/5h old
  // tasks) get multiple SKUs so multi-item tasks are visible in the UI/seed.
  // ---------------------------------------------------------------------
  const taskAgesHours = [0.5, 1, 1.5, 2.5, 3, 3.5, 5, 6, 8];
  const itemCounts = [1, 1, 2, 1, 3, 1, 2, 1, 1];
  let taskSeq = 0;
  for (const ageHours of taskAgesHours) {
    taskSeq++;
    const id = `seed-task-${taskSeq}`;
    const createdAt = new Date(Date.now() - ageHours * 3_600_000);
    const nItems = itemCounts[taskSeq - 1] ?? 1;
    await db.warehouseTask.upsert({
      where: { id },
      create: {
        id,
        warehouseId: pick(warehouseDefs, taskSeq).id,
        companyId: COMPANY_ID,
        kind: "PICK",
        name:
          nItems > 1
            ? `Sipariş Toplama — SEED-ORD-${taskSeq}`
            : `Sipariş Toplama #${taskSeq}`,
        orderRef: `SEED-ORD-${taskSeq}`,
        status: "OPEN",
        priority: ageHours > 4 ? "HIGH" : "MEDIUM",
        items: {
          create: Array.from({ length: nItems }, (_, j) => ({
            id: `seed-task-${taskSeq}-item-${j}`,
            companyId: COMPANY_ID,
            sku: `SEED-SKU-${((taskSeq + j) % 5) + 1}`,
            zone: pick(ZONES, taskSeq + j),
            totalUnits: randInt(5, 40),
            doneUnits: 0,
          })),
        },
      },
      update: {},
    });
    await db.$executeRawUnsafe(`UPDATE "warehouse_tasks" SET "createdAt" = $1 WHERE id = $2`, createdAt, id);
  }
  console.log(`  open pick tasks: ${taskAgesHours.length}`);

  // ---------------------------------------------------------------------
  // Routes (unassigned + planned-today + in-progress) for unassigned_jobs /
  // today_plan.planned_routes_count.
  // ---------------------------------------------------------------------
  const routeDefs = [
    { id: "seed-route-unassigned-1", driverId: null, vehicleId: null, status: "PLANNED" as const },
    { id: "seed-route-unassigned-2", driverId: null, vehicleId: vehicleDefs[2]!.id, status: "PLANNED" as const },
    { id: "seed-route-today-1", driverId: driverIds[0]!, vehicleId: vehicleDefs[0]!.id, status: "PLANNED" as const },
    { id: "seed-route-today-2", driverId: driverIds[2]!, vehicleId: vehicleDefs[1]!.id, status: "ACTIVE" as const },
  ];
  for (const r of routeDefs) {
    await db.route.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        name: r.id.toUpperCase(),
        status: r.status,
        date: new Date(),
        driverId: r.driverId,
        vehicleId: r.vehicleId,
        companyId: COMPANY_ID,
        distanceKm: randFloat(30, 200),
      },
      update: {},
    });
  }
  console.log(`  routes: ${routeDefs.length}`);

  // ---------------------------------------------------------------------
  // Shipments — inactive (24h+ stuck IN_TRANSIT), unassigned PENDING,
  // SLA-expired, SLA-expiring-soon. trackingId must be globally unique.
  // ---------------------------------------------------------------------
  const shipmentDefs = [
    // Inactive 24h+ (IN_TRANSIT, stale updatedAt)
    { id: "seed-shp-inactive-1", trackingId: "SEED-TRK-INACT-1", status: "IN_TRANSIT" as const, driverId: driverIds[0], staleHours: 30, slaDeadline: null as Date | null },
    { id: "seed-shp-inactive-2", trackingId: "SEED-TRK-INACT-2", status: "IN_TRANSIT" as const, driverId: driverIds[2], staleHours: 48, slaDeadline: null as Date | null },
    // Unassigned PENDING (no route)
    { id: "seed-shp-unassigned-1", trackingId: "SEED-TRK-UNASN-1", status: "PENDING" as const, driverId: null, staleHours: 0, slaDeadline: null as Date | null },
    { id: "seed-shp-unassigned-2", trackingId: "SEED-TRK-UNASN-2", status: "PENDING" as const, driverId: null, staleHours: 0, slaDeadline: null as Date | null },
    // SLA expired (still open, deadline passed)
    { id: "seed-shp-sla-expired-1", trackingId: "SEED-TRK-SLAEXP-1", status: "IN_TRANSIT" as const, driverId: driverIds[1], staleHours: 2, slaDeadline: daysAgo(0.25) },
    // SLA expiring soon (deadline within next few hours)
    { id: "seed-shp-sla-soon-1", trackingId: "SEED-TRK-SLASOON-1", status: "PROCESSING" as const, driverId: null, staleHours: 0, slaDeadline: daysFromNow(0.1) },
  ];
  for (const s of shipmentDefs) {
    const customer = pick(customerDefs, shipmentDefs.indexOf(s));
    await db.shipment.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        trackingId: s.trackingId,
        status: s.status,
        destination: "Kadıköy, İstanbul",
        customerId: customer.id,
        driverId: s.driverId ?? null,
        originWarehouseId: warehouseDefs[0]!.id,
        weightKg: randFloat(20, 400),
        volumeM3: randFloat(0.2, 4),
        slaDeadline: s.slaDeadline,
        companyId: COMPANY_ID,
      },
      update: {},
    });
    if (s.staleHours > 0) {
      await db.$executeRawUnsafe(
        `UPDATE "shipments" SET "updatedAt" = $1 WHERE id = $2`,
        new Date(Date.now() - s.staleHours * 3_600_000),
        s.id
      );
    }
  }
  console.log(`  shipments (today_actions scenarios): ${shipmentDefs.length}`);

  // ---------------------------------------------------------------------
  // Issues — DAMAGE type with claim fields (loss_and_damage.claim_recovery
  // reads this from `public.issues`, same rows the earlier claim_recovery
  // smoke test covered — here they're durable seed rows, not throwaway).
  // ---------------------------------------------------------------------
  const issueDefs = [
    { id: "seed-issue-1", claimStatus: "APPROVED" as const, filed: 5000, recovered: 4500 },
    { id: "seed-issue-2", claimStatus: "REJECTED" as const, filed: 2000, recovered: 0 },
    { id: "seed-issue-3", claimStatus: "FILED" as const, filed: 1200, recovered: null },
    { id: "seed-issue-4", claimStatus: "NONE" as const, filed: null, recovered: null },
  ];
  for (const iss of issueDefs) {
    await db.issue.upsert({
      where: { id: iss.id },
      create: {
        id: iss.id,
        title: "Kargo hasarı",
        description: "Taşıma sırasında paket hasar gördü",
        type: "DAMAGE",
        status: iss.claimStatus === "NONE" ? "OPEN" : "RESOLVED",
        priority: "MEDIUM",
        vehicleId: vehicleDefs[0]!.id,
        companyId: COMPANY_ID,
        claimStatus: iss.claimStatus,
        claimFiledAmount: iss.filed,
        claimRecoveredAmount: iss.recovered,
      },
      update: {},
    });
  }
  console.log(`  issues (with claim data): ${issueDefs.length}`);

  // ---------------------------------------------------------------------
  // Operating expenses (public.operating_expenses — durable rows matching
  // the OPERATING_EXPENSE_LOGGED events already seeded in report_events).
  // ---------------------------------------------------------------------
  const expenseCategories = ["LABOR", "WAREHOUSE_RENT", "PACKAGING"] as const;
  let expSeq = 0;
  for (let m = 0; m < 3; m++) {
    for (const category of expenseCategories) {
      expSeq++;
      const id = `seed-opex-${expSeq}`;
      const amount =
        category === "LABOR" ? randFloat(15000, 45000) :
        category === "WAREHOUSE_RENT" ? randFloat(8000, 20000) :
        randFloat(1000, 5000);
      await db.operatingExpense.upsert({
        where: { id },
        create: {
          id,
          companyId: COMPANY_ID,
          category,
          amount,
          currency: "TRY",
          date: daysAgo(m * 30 + 5),
          note: `Seed — ${category} gideri`,
        },
        update: {},
      });
    }
  }
  console.log(`  operating expenses: ${expSeq}`);

  console.log("Done.");
  process.exit(0);
}

runWithTenant(COMPANY_ID, main).catch((e) => {
  console.error(e);
  process.exit(1);
});
