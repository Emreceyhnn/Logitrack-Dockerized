"use server";

import { db } from "../../db";
import { authenticatedAction } from "../../auth-middleware";
import { checkPermission } from "../utils/checkPermission";

import type {
  WarehouseWorkerDashboard,
  WWTask,
  WWZone,
  WWMovement,
  WWCatalogItem,
  WWLowStockItem,
} from "../../type/warehouseWorker";
import {
  PICKS_TARGET,
  PACKS_TARGET,
  WW_ROLES,
  UNASSIGNED_ZONE,
  canWriteFromPanel,
  startOfToday,
  zonePct,
  resolveTargets,
  shiftHoursElapsed,
  accessibleWarehouseIds,
  resolveWarehouse,
} from "./shared";
import {
  palletsUsedFor,
  totalPalletsUsed,
} from "../../utils/palletOccupancy";

/**
 * tr-depo çalışanı (warehouse worker) gösterge paneli için görevler, hedefler, stok hareketleri ve düşük stok uyarıları dahil tüm verileri getirir
 * en-fetches all data for the warehouse worker dashboard, including tasks, KPIs, stock movements, and low stock alerts
 * input (user: AuthenticatedUser, warehouseId?: string)
 * output (Promise<WarehouseWorkerDashboard>)
 */
export const getWarehouseWorkerDashboard = authenticatedAction(
  async (user, warehouseId?: string): Promise<WarehouseWorkerDashboard> => {
    const companyId = user?.companyId || "";
    const userId = user?.id || "";
    await checkPermission(user, companyId, WW_ROLES);
    if (!companyId) throw new Error("User has no company");

    // Floor-locked operators are scoped to the sites they are attached to;
    // everyone else (admin/manager/dispatcher) keeps company-wide visibility.
    // `null` means unrestricted.
    const allowedIds = await accessibleWarehouseIds(
      companyId,
      userId,
      user.roleName
    );

    const warehouse = await resolveWarehouse(
      companyId,
      userId,
      warehouseId,
      allowedIds
    );

    // Dispatchers can watch the floor but hold no `inventory:write` grant in
    // roles.json, so the panel renders read-only for them.
    const canWrite = canWriteFromPanel(user.roleName);

    const worker = {
      name: `${user.name} ${user.surname}`.trim(),
      initials:
        `${user.name?.[0] ?? ""}${user.surname?.[0] ?? ""}`.toLocaleUpperCase(
          "en-US"
        ) || "WW",
      role: user.roleName || "Warehouse Worker",
    };

    // The switcher only ever lists what the caller is allowed to open, so a
    // locked operator cannot read another site's tasks, stock or capacity.
    const warehouses = (
      await db.warehouse.findMany({
        where: allowedIds ? { companyId, id: { in: allowedIds } } : { companyId },
        select: { id: true, name: true, code: true },
        orderBy: { code: "asc" },
      })
    ).map((w) => ({ id: w.id, name: w.name, code: w.code }));

    // No warehouse yet → return an empty-but-valid payload.
    if (!warehouse) {
      return {
        warehouse: null,
        warehouses,
        worker,
        canWrite,
        kpis: {
          picks: 0,
          picksTarget: PICKS_TARGET,
          packs: 0,
          packsTarget: PACKS_TARGET,
          rate: 0,
        },
        tasks: [],
        zones: [],
        feed: [],
        catalog: [],
        lowStock: [],
        unassignedPallets: 0,
        capacity: { used: 0, total: 0, pct: 0, free: 0 },
      };
    }

    const [movementsToday, tasksRaw, zonesRaw, feedRaw, inventoryRaw] =
      await Promise.all([
        db.inventoryMovement.findMany({
          where: {
            warehouseId: warehouse.id,
            companyId,
            date: { gte: startOfToday() },
            type: { in: ["PICK", "PACK"] },
          },
          select: { type: true, quantity: true },
        }),
        db.warehouseTask.findMany({
          where: { warehouseId: warehouse.id, companyId },
          orderBy: [
            { status: "asc" },
            { priority: "desc" },
            { createdAt: "asc" },
          ],
          take: 12,
        }),
        db.warehouseZone.findMany({
          where: { warehouseId: warehouse.id, companyId },
          orderBy: { code: "asc" },
        }),
        db.inventoryMovement.findMany({
          where: { warehouseId: warehouse.id, companyId },
          include: { user: { select: { name: true, surname: true } } },
          orderBy: { date: "desc" },
          take: 12,
        }),
        db.inventory.findMany({
          where: { warehouseId: warehouse.id, companyId },
          select: {
            sku: true,
            name: true,
            zone: true,
            quantity: true,
            allocatedQuantity: true,
            minStock: true,
            palletCount: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 500,
        }),
      ]);

    const picks = movementsToday
      .filter((m) => m.type === "PICK")
      .reduce((a, m) => a + Math.abs(m.quantity), 0);
    const packs = movementsToday
      .filter((m) => m.type === "PACK")
      .reduce((a, m) => a + Math.abs(m.quantity), 0);

    // Throughput is units/hour across the shift so far — not the running daily
    // total. shiftHoursElapsed clamps to the shift window, so the figure is
    // stable before the shift opens and stops inflating after it closes.
    const rate = Math.round((picks + packs) / shiftHoursElapsed()) || 0;

    // Per-warehouse targets when the site defines them, module defaults otherwise.
    const { picksTarget, packsTarget } = resolveTargets(warehouse.specifications);

    // Zones come from the WarehouseZone config; actual usage is derived live from
    // each inventory item's `zone` (pallet occupancy), so stats stay in sync.
    // Stock whose zone is empty or unknown is NOT invented into a real zone —
    // it is grouped under UNASSIGNED_ZONE and surfaced separately, so the
    // capacity chart only ever reflects surveyed locations.
    const zoneCodes = zonesRaw.map((z) => z.code);
    const skuZone = new Map<string, string>();
    const usedByZone = new Map<string, number>();
    for (const it of inventoryRaw) {
      const z =
        it.zone && zoneCodes.includes(it.zone) ? it.zone : UNASSIGNED_ZONE;
      skuZone.set(it.sku, z);
      usedByZone.set(z, (usedByZone.get(z) ?? 0) + palletsUsedFor(it));
    }

    const zones: WWZone[] = zonesRaw.map((z) => {
      const usedPallets = Math.round(usedByZone.get(z.code) ?? 0);
      return {
        code: z.code,
        capacityPallets: z.capacityPallets,
        usedPallets,
        pct: zonePct(usedPallets, z.capacityPallets),
      };
    });
    // Surface unlocated pallets as their own entry rather than letting them
    // vanish from the per-zone breakdown. Marked isUnassigned so the capacity
    // tab still lists it (so the worker knows to go fix the data) without
    // zoneCapacityAdvice treating it as a real zone that's "critically full"
    // and telling the worker to stop putting stock away here / divert to it.
    const unassignedPallets = Math.round(usedByZone.get(UNASSIGNED_ZONE) ?? 0);
    if (unassignedPallets > 0) {
      zones.push({
        code: UNASSIGNED_ZONE,
        capacityPallets: unassignedPallets,
        usedPallets: unassignedPallets,
        pct: 100,
        isUnassigned: true,
      });
    }

    const used = totalPalletsUsed(inventoryRaw);
    const total = warehouse.capacityPallets || 5000;

    const tasks: WWTask[] = tasksRaw.map((t) => ({
      id: t.id,
      kind: t.kind,
      name: t.name,
      orderRef: t.orderRef,
      zone: t.zone,
      done: t.doneUnits,
      total: t.totalUnits,
      priority: t.priority,
      complete: t.status === "COMPLETED" || t.doneUnits >= t.totalUnits,
    }));

    /* Build a sku→name map for feed enrichment */
    const skuName = new Map<string, string>();
    for (const it of inventoryRaw) {
      skuName.set(it.sku, it.name);
    }

    const feed: WWMovement[] = feedRaw.map((m) => ({
      id: m.id,
      type: m.type,
      name: m.notes || skuName.get(m.sku) || m.sku,
      sku: m.sku,
      qty: m.quantity,
      // The zone recorded on the movement itself (as of the moment it
      // happened) is authoritative; only fall back to the SKU's *current*
      // zone for movements logged before this column existed.
      zone: m.zone ?? skuZone.get(m.sku) ?? UNASSIGNED_ZONE,
      who: m.user ? `${m.user.name} ${m.user.surname}`.trim() : "System",
      self: m.userId === userId,
      at: m.date.toISOString(),
    }));

    // The catalog backs the scanner's SKU lookup, so it must cover the same
    // rows the shortage list scans. Slicing it to 100 previously made any SKU
    // that had not moved recently scan as "unrecognised" in a large warehouse.
    // A SKU is "low" when what's actually pickable (on-hand minus allocated)
    // has fallen to or below its reorder point. minStock 0 = untracked, never low.
    const catalog: WWCatalogItem[] = inventoryRaw.map((it) => {
      const available = it.quantity - (it.allocatedQuantity ?? 0);
      const minStock = it.minStock ?? 0;
      return {
        sku: it.sku,
        name: it.name,
        zone: skuZone.get(it.sku) ?? UNASSIGNED_ZONE,
        quantity: it.quantity,
        available,
        minStock,
        lowStock: minStock > 0 && available <= minStock,
      };
    });

    // Scan the full inventory (not just the 100-item catalog slice) for the
    // shortage list, worst deficit first; suggest enough to reach the threshold.
    const lowStock: WWLowStockItem[] = inventoryRaw
      .map((it) => {
        const available = it.quantity - (it.allocatedQuantity ?? 0);
        const minStock = it.minStock ?? 0;
        return {
          sku: it.sku,
          name: it.name,
          zone: skuZone.get(it.sku) ?? UNASSIGNED_ZONE,
          available,
          minStock,
          suggestedQty: Math.max(1, minStock - available),
        };
      })
      .filter((it) => it.minStock > 0 && it.available <= it.minStock)
      .sort((a, b) => a.available - a.minStock - (b.available - b.minStock))
      .slice(0, 20);

    return {
      warehouse: {
        id: warehouse.id,
        name: warehouse.name,
        code: warehouse.code,
        city: warehouse.city,
      },
      warehouses,
      worker,
      canWrite,
      kpis: {
        picks,
        picksTarget,
        packs,
        packsTarget,
        rate,
      },
      tasks,
      zones,
      feed,
      catalog,
      lowStock,
      unassignedPallets,
      capacity: {
        used,
        total,
        pct: zonePct(used, total),
        free: Math.max(0, total - used),
      },
    };
  }
);
