"use server";

import { db } from "../../db";
import { authenticatedAction } from "../../auth-middleware";
import { checkPermission } from "../utils/checkPermission";
import { controllerGuard } from "../utils/controllerGuard";
import { WW_WRITE_ROLES, assertWarehouseAccess } from "./shared";
import { notifyManagerOfRestockRequest } from "./notifyRestock";
import { logReportEvent } from "@/app/lib/services/reportEvents";
import {
  isStockDiscrepancyType,
  type StockDiscrepancyType,
} from "@/app/lib/type/stockDiscrepancyTypes";

/**
 * Log a stock movement from the warehouse floor. PICK removes on-hand stock;
 * STOCK_IN and PUTAWAY add it (incoming goods); PACK is ledger-only (units are
 * already off-hand from an earlier PICK). Writes the movement in every case.
 */
type FloorMovementKind = "PICK" | "PACK" | "STOCK_IN" | "PUTAWAY";
const INBOUND_KINDS: readonly FloorMovementKind[] = ["STOCK_IN", "PUTAWAY"];

/**
 * Logs the moment an inbound vehicle arrives at the dock, before any stock
 * is actually counted in. This is the "dock" half of dock-to-stock — the
 * "stock" half is INBOUND_RECEIVED, written when logWarehouseMovement
 * records a STOCK_IN/PUTAWAY. Neither event references the other by id;
 * dock-to-stock is computed downstream by pairing each arrival with the
 * nearest following INBOUND_RECEIVED for the same warehouse. No domain
 * table is touched — this exists purely to give that pairing a timestamp
 * to start from.
 */
/**
 * tr-bir gelen aracın depo kapısına vardığı anı kaydeder (mal kabul öncesi)
 * en-logs the moment an inbound vehicle arrives at the warehouse dock (before receiving)
 * input (user: AuthenticatedUser, warehouseId: string, note?: string)
 * output (Promise<{ success: boolean }>)
 */
export const logInboundArrival = authenticatedAction(
  async (user, warehouseId: string, note?: string) => {
    const companyId = user?.companyId || "";
    const userId = user?.id || "";
    return controllerGuard("logInboundArrival", async () => {
      await checkPermission(user, companyId, WW_WRITE_ROLES);
      if (!companyId) throw new Error("User has no company");

      await assertWarehouseAccess(
        companyId,
        userId,
        warehouseId,
        user.roleName
      );

      const occurredAt = new Date();
      await db.$transaction(async (tx) => {
        await logReportEvent(tx, {
          eventType: "INBOUND_ARRIVED",
          occurredAt,
          companyId,
          subjectType: "WAREHOUSE",
          subjectId: warehouseId,
          warehouseId,
          payload: note?.trim() ? { note: note.trim() } : null,
          actorUserId: userId,
          sourceEventId: `inbound-arrived-${warehouseId}-${occurredAt.getTime()}`,
        });
      });

      return { success: true };
    });
  }
);

/**
 * tr-depo sahasındaki bir stok hareketini (toplama, paketleme, mal kabul vb.) kaydeder ve envanter miktarını günceller
 * en-logs a stock movement (pick, pack, stock-in, etc.) from the warehouse floor and updates inventory quantities accordingly
 * input (user: AuthenticatedUser, warehouseId: string, sku: string, quantity: number, kind: FloorMovementKind, zone?: string)
 * output (Promise<{ success: boolean, movementId: string }>)
 */
export const logWarehouseMovement = authenticatedAction(
  async (
    user,
    warehouseId: string,
    sku: string,
    quantity: number,
    kind: FloorMovementKind,
    zone?: string
  ) => {
    const companyId = user?.companyId || "";
    const userId = user?.id || "";
    return controllerGuard("logWarehouseMovement", async () => {
      await checkPermission(user, companyId, WW_WRITE_ROLES);
      if (!companyId) throw new Error("User has no company");
      if (!Number.isFinite(quantity) || quantity <= 0)
        throw new Error("Quantity must be positive");

      await assertWarehouseAccess(
        companyId,
        userId,
        warehouseId,
        user.roleName
      );

      const inventoryNode = await db.inventory.findFirst({
        where: { warehouseId, sku, companyId },
      });

      const isInbound = INBOUND_KINDS.includes(kind);

      const movement = await db.$transaction(
        async (tx) => {
          const mv = await tx.inventoryMovement.create({
            data: {
              warehouseId,
              sku,
              quantity: kind === "PICK" ? -quantity : quantity,
              type: kind,
              zone: zone?.trim() || inventoryNode?.zone || null,
              notes: inventoryNode?.name ?? sku,
              userId,
              companyId,
              date: new Date(),
            },
          });

          if (kind === "PICK" && inventoryNode) {
            await tx.inventory.update({
              where: { id: inventoryNode.id },
              data: {
                quantity: {
                  decrement: Math.min(quantity, inventoryNode.quantity),
                },
                allocatedQuantity: {
                  decrement: Math.min(quantity, inventoryNode.allocatedQuantity),
                },
              },
            });
          } else if (isInbound && inventoryNode) {
            // Incoming goods raise on-hand stock; allocation is untouched
            // (nothing has been reserved against these units yet).
            await tx.inventory.update({
              where: { id: inventoryNode.id },
              data: { quantity: { increment: quantity } },
            });
          }

          if (isInbound) {
            await logReportEvent(tx, {
              eventType: "INBOUND_RECEIVED",
              occurredAt: mv.date,
              companyId,
              subjectType: "INVENTORY_MOVEMENT",
              subjectId: mv.id,
              warehouseId,
              zoneId: mv.zone,
              quantity,
              payload: { sku, kind },
              sourceEventId: `inbound-received-${mv.id}`,
              actorUserId: userId,
            });
          }

          return mv;
        }
      );

      return { success: true, movementId: movement.id };
    });
  }
);

/**
 * Reconcile a physical count against the system for one SKU (eksik/fazla). The
 * DB quantity is the source of truth for "expected" — the client-supplied
 * `expected` is recorded for audit only, never trusted for the maths — so the
 * signed delta and the new on-hand are computed against the live row. Writes an
 * ADJUSTMENT movement carrying the reason and sets inventory to `counted`.
 */
/**
 * tr-fiziksel sayım sonucunu sistemle karşılaştırarak (eksik/fazla) stok düzeltmesi yapar ve 'ADJUSTMENT' hareketi kaydeder
 * en-reconciles a physical stock count against the system, adjusts the on-hand quantity, and logs an 'ADJUSTMENT' movement
 * input (user: AuthenticatedUser, warehouseId: string, sku: string, counted: number, reason: string, expected?: number, zone?: string, discrepancyType?: StockDiscrepancyType)
 * output (Promise<{ success: boolean, movementId: string | null, delta: number, counted: number }>)
 */
export const adjustWarehouseStock = authenticatedAction(
  async (
    user,
    warehouseId: string,
    sku: string,
    counted: number,
    reason: string,
    expected?: number,
    zone?: string,
    discrepancyType?: StockDiscrepancyType
  ) => {
    const companyId = user?.companyId || "";
    const userId = user?.id || "";
    return controllerGuard("adjustWarehouseStock", async () => {
      await checkPermission(user, companyId, WW_WRITE_ROLES);
      if (!companyId) throw new Error("User has no company");
      if (!Number.isFinite(counted) || counted < 0)
        throw new Error("Counted quantity must be zero or positive");
      const note = reason?.trim();
      if (!note) throw new Error("Adjustment reason is required");

      await assertWarehouseAccess(
        companyId,
        userId,
        warehouseId,
        user.roleName
      );

      const inventoryNode = await db.inventory.findFirst({
        where: { warehouseId, sku, companyId },
      });
      if (!inventoryNode)
        throw new Error("No inventory record for this SKU to adjust");

      // Expected = live on-hand; delta is signed (negative = eksik, positive =
      // fazla). A zero delta is a no-op we surface as such rather than writing
      // an empty ledger row.
      const systemExpected = inventoryNode.quantity;
      const delta = counted - systemExpected;
      if (delta === 0)
        return { success: true, movementId: null, delta: 0, counted };

      const movement = await db.$transaction(async (tx) => {
        const mv = await tx.inventoryMovement.create({
          data: {
            warehouseId,
            sku,
            quantity: delta,
            type: "ADJUSTMENT",
            zone: zone?.trim() || inventoryNode.zone || null,
            notes:
              expected !== undefined && expected !== systemExpected
                ? `${note} (counted ${counted} vs system ${systemExpected}; worker expected ${expected})`
                : `${note} (counted ${counted} vs system ${systemExpected})`,
            userId,
            companyId,
            date: new Date(),
          },
        });

        // Setting on-hand to the counted value keeps the correction accurate
        // even if the row shifted between read and write.
        await tx.inventory.update({
          where: { id: inventoryNode.id },
          data: { quantity: counted },
        });

        await logReportEvent(tx, {
          eventType: "STOCK_ADJUSTED",
          occurredAt: mv.date,
          companyId,
          subjectType: "INVENTORY_MOVEMENT",
          subjectId: mv.id,
          warehouseId,
          zoneId: mv.zone,
          quantity: delta,
          reasonCode: isStockDiscrepancyType(discrepancyType) ? discrepancyType : null,
          payload: { sku, reason: note, counted, systemExpected },
          sourceEventId: `stock-adjusted-${mv.id}`,
          actorUserId: userId,
        });

        return mv;
      });

      return { success: true, movementId: movement.id, delta, counted };
    });
  }
);

/**
 * Maps a task's kind to the ledger entry its progress represents. PACK is
 * ledger-only (the units already left on-hand stock at PICK time, see
 * logWarehouseMovement), so it never touches Inventory quantities — only
 * PICK (removes on-hand + allocated) and PUT (putaway, adds on-hand) do.
 */
const TASK_KIND_TO_MOVEMENT_TYPE: Record<string, "PICK" | "PACK" | "PUTAWAY"> = {
  PICK: "PICK",
  PACK: "PACK",
  PUT: "PUTAWAY",
};

/**
 * tr-bir depo görevinin (task) ilerlemesini kaydeder; tamamlanan birimler toplamı aşarsa görevi otomatik tamamlandı işaretler
 * en-advances the progress of a warehouse task; auto-completes it if done units reach the total
 * input (user: AuthenticatedUser, taskId: string, delta?: number)
 * output (Promise<{ success: boolean, done: number, complete: boolean }>)
 */
export const advanceWarehouseTask = authenticatedAction(
  async (user, taskId: string, delta?: number) => {
    const companyId = user?.companyId || "";
    const userId = user?.id || "";
    return controllerGuard("advanceWarehouseTask", async () => {
      await checkPermission(user, companyId, WW_WRITE_ROLES);

      const task = await db.warehouseTask.findFirst({ where: { id: taskId, companyId } });
      if (!task)
        throw new Error("Task not found or unauthorized");

      // Already-finished tasks write nothing, so answer before spending the
      // scope check on them.
      if (task.status === "COMPLETED" || task.doneUnits >= task.totalUnits) {
        return { success: true, done: task.totalUnits, complete: true };
      }

      // A locked operator must not advance work belonging to another site.
      await assertWarehouseAccess(
        companyId,
        userId,
        task.warehouseId,
        user.roleName
      );

      const step =
        delta && delta > 0 ? delta : Math.max(1, Math.ceil(task.totalUnits / 5));
      const nextDone = Math.min(task.totalUnits, task.doneUnits + step);
      const complete = nextDone >= task.totalUnits;
      const advancedUnits = nextDone - task.doneUnits;

      await db.$transaction(async (tx) => {
        await tx.warehouseTask.update({
          where: { id: taskId },
          data: {
            doneUnits: nextDone,
            status: complete ? "COMPLETED" : "IN_PROGRESS",
          },
        });

        // Older tasks created before this column existed carry no sku — the
        // progress still records, it just can't move inventory or feed the
        // Pick/Pack KPIs (which is the same degraded state they were already
        // in before this fix).
        if (!task.sku || advancedUnits <= 0) return;

        const movementType = TASK_KIND_TO_MOVEMENT_TYPE[task.kind];
        if (!movementType) return;

        await tx.inventoryMovement.create({
          data: {
            warehouseId: task.warehouseId,
            sku: task.sku,
            quantity: movementType === "PICK" ? -advancedUnits : advancedUnits,
            type: movementType,
            zone: task.zone,
            notes: task.name,
            userId,
            companyId,
            date: new Date(),
          },
        });

        if (movementType === "PICK") {
          const inventoryNode = await tx.inventory.findFirst({
            where: { warehouseId: task.warehouseId, sku: task.sku, companyId },
          });
          if (inventoryNode) {
            await tx.inventory.update({
              where: { id: inventoryNode.id },
              data: {
                quantity: { decrement: Math.min(advancedUnits, inventoryNode.quantity) },
                allocatedQuantity: {
                  decrement: Math.min(advancedUnits, inventoryNode.allocatedQuantity),
                },
              },
            });
          }
        } else if (movementType === "PUTAWAY") {
          const inventoryNode = await tx.inventory.findFirst({
            where: { warehouseId: task.warehouseId, sku: task.sku, companyId },
          });
          if (inventoryNode) {
            await tx.inventory.update({
              where: { id: inventoryNode.id },
              data: { quantity: { increment: advancedUnits } },
            });
          }
        }

        if (complete) {
          const eventType =
            task.kind === "PICK"
              ? "PICK_COMPLETED"
              : task.kind === "PACK"
                ? "PACK_COMPLETED"
                : "PUTAWAY_COMPLETED";
          await logReportEvent(tx, {
            eventType,
            occurredAt: new Date(),
            companyId,
            subjectType: "WAREHOUSE_TASK",
            subjectId: taskId,
            warehouseId: task.warehouseId,
            zoneId: task.zone,
            quantity: task.totalUnits,
            payload: { sku: task.sku, orderRef: task.orderRef },
            sourceEventId: `task-completed-${taskId}`,
            actorUserId: userId,
          });
        }
      });

      return { success: true, done: nextDone, complete };
    });
  }
);

/**
 * Raise a restock request (recorded as a RESTOCK_REQUEST movement). Pass `sku`
 * (and optionally `quantity`) to target a specific item — the worker saw *this*
 * product run low; omit `sku` for the legacy zone-wide request.
 */
/**
 * tr-depo sahasından (örneğin bir bölge veya belirli bir ürün için) stok tamamlama (restock) talebi oluşturur
 * en-raises a restock request from the warehouse floor (for a specific zone or item)
 * input (user: AuthenticatedUser, warehouseId: string, zone: string, sku?: string, quantity?: number)
 * output (Promise<{ success: boolean }>)
 */
export const requestRestock = authenticatedAction(
  async (
    user,
    warehouseId: string,
    zone: string,
    sku?: string,
    quantity?: number
  ) => {
    const companyId = user?.companyId || "";
    const userId = user?.id || "";
    return controllerGuard("requestRestock", async () => {
      await checkPermission(user, companyId, WW_WRITE_ROLES);
      if (!companyId) throw new Error("User has no company");

      await assertWarehouseAccess(
        companyId,
        userId,
        warehouseId,
        user.roleName
      );

      const targetSku = sku?.trim();
      // quantity is a requested amount, not a stock mutation, so we record it on
      // the movement for the replenisher but never touch inventory here.
      const qty =
        targetSku && Number.isFinite(quantity) && (quantity as number) > 0
          ? Math.floor(quantity as number)
          : 0;

      await db.inventoryMovement.create({
        data: {
          warehouseId,
          // Zone-wide requests (no sku) carry no item — sku stores an empty
          // string rather than a synthetic "ZONE-*" value so it never collides
          // with a real SKU in item-level reports.
          sku: targetSku || "",
          quantity: qty,
          type: "RESTOCK_REQUEST",
          zone: zone?.trim() || null,
          notes: targetSku
            ? `Restock requested — ${targetSku}${qty ? ` × ${qty}` : ""} (Zone ${zone})`
            : `Restock requested — Zone ${zone}`,
          userId,
          companyId,
        },
      });

      // A replenishment request is only actionable once someone is told to act on
      // it, so the warehouse manager is notified. Awaited but non-throwing: the
      // movement above is already committed and a bounced notification must not
      // fail the request the worker just filed.
      await notifyManagerOfRestockRequest({
        warehouseId,
        companyId,
        zone: zone?.trim() || "",
        sku: targetSku,
        quantity: qty,
        requestedByName: [user?.name, user?.surname].filter(Boolean).join(" "),
      });
      return { success: true };
    });
  }
);

/**
 * tr-depo çalışanının sahadan yeni bir sorun/arıza bildirmesini sağlar
 * en-allows a warehouse worker to report a new issue/defect from the floor.
 *    The warehouse (and reported zone) are persisted as real columns, so floor
 *    reports can be filtered by site instead of being buried in the title text.
 * input (user: AuthenticatedUser, warehouseId: string, title: string, description?: string, zone?: string, type?: "DAMAGE" | "OTHER")
 * output (Promise<{ success: boolean, issueId: string }>)
 */
export const reportWarehouseIssue = authenticatedAction(
  async (
    user,
    warehouseId: string,
    title: string,
    description?: string,
    zone?: string,
    type?: "DAMAGE" | "OTHER"
  ) => {
    const companyId = user?.companyId || "";
    const userId = user?.id || "";
    return controllerGuard("reportWarehouseIssue", async () => {
      await checkPermission(user, companyId, WW_WRITE_ROLES);
      if (!companyId) throw new Error("User has no company");

      await assertWarehouseAccess(
        companyId,
        userId,
        warehouseId,
        user.roleName
      );

      const issue = await db.$transaction(async (tx) => {
        const created = await tx.issue.create({
          data: {
            title: title?.trim() || "Warehouse floor issue",
            description: description?.trim() || null,
            type: type === "DAMAGE" ? "DAMAGE" : "OTHER",
            priority: "MEDIUM",
            status: "OPEN",
            warehouseId,
            zone: zone?.trim() || null,
            companyId,
          },
        });

        await logReportEvent(tx, {
          eventType: "ISSUE_OPENED",
          occurredAt: created.createdAt,
          companyId,
          subjectType: "ISSUE",
          subjectId: created.id,
          warehouseId,
          zoneId: zone?.trim() || null,
          payload: { source: "warehouse", type: created.type, priority: created.priority },
          sourceEventId: `issue-opened-${created.id}`,
          actorUserId: userId,
        });

        return created;
      });

      return { success: true, issueId: issue.id };
    });
  }
);
