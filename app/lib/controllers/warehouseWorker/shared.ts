// Shared constants and helpers for the warehouse-worker submodules. Plain module
// (not a "use server" boundary) so it may export constants and sync/async helpers.

import rolesConfig from "@/roles.json";
import { db } from "../../db";
import { isWarehouseOnlyRole } from "../../roles";

/**
 * Fallback shift targets, used when the warehouse carries no override of its
 * own. A warehouse can raise/lower them via `Warehouse.specifications` entries
 * of the form `picksTarget=300` / `packsTarget=220` (see `resolveTargets`), so
 * these are the floor, not a hard-coded company-wide rule.
 */
export const PICKS_TARGET = 240;
export const PACKS_TARGET = 180;

/**
 * Shift window used for the throughput ("rate") KPI, as local hours. Picks and
 * packs are counted from midnight, but the rate divides by the hours elapsed
 * *within the shift* so the number reads as units/hour rather than a running
 * daily total.
 */
export const SHIFT_START_HOUR = 8;
export const SHIFT_END_HOUR = 18;

/**
 * Roles allowed to open the panel and read its data. `role_dispatcher` is
 * included deliberately: dispatchers coordinate the floor and need visibility.
 */
export const WW_ROLES = [
  "role_admin",
  "role_manager",
  "role_warehouse",
  "role_dispatcher",
];

/**
 * Roles allowed to *write* from the panel (movements, counts, task progress,
 * restock requests, issue reports). Narrower than WW_ROLES on purpose: the
 * Dispatcher permission set in roles.json grants routes/shipments/fleet but no
 * `inventory:write`, so dispatchers get read-only access here and the two
 * sources of truth no longer contradict each other.
 */
export const WW_WRITE_ROLES = ["role_admin", "role_manager", "role_warehouse"];

/** Role names (lowercased) belonging to the write-capable role ids above. */
const WW_WRITE_ROLE_NAMES: ReadonlySet<string> = new Set(
  rolesConfig
    .filter((r) => WW_WRITE_ROLES.includes(r.id))
    .flatMap((r) => (r.names ?? [r.name]).map((n) => n.toLocaleLowerCase("en-US")))
);

/**
 * tr-kullanıcının panelden yazma (hareket/sayım/görev) yetkisi olup olmadığını döner
 * en-true when the role may write from the panel. Matches on role *name* the
 *    same way checkPermission does — the session's roleId is not authoritative.
 * input (roleName: string | null | undefined)
 * output (boolean)
 */
export function canWriteFromPanel(roleName: string | null | undefined): boolean {
  if (!roleName) return false;
  return WW_WRITE_ROLE_NAMES.has(roleName.trim().toLocaleLowerCase("en-US"));
}

/**
 * tr-bugünün başlangıcını (00:00:00) temsil eden Date nesnesini döndürür
 * en-returns a Date object representing the start of today (00:00:00)
 * input ()
 * output (Date)
 */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * tr-vardiya başlangıcından bu yana geçen saati hesaplar (hız KPI'ı için)
 * en-hours elapsed within the current shift, used as the divisor for the
 *    throughput KPI. Clamped to the shift window so a pre-shift scan cannot
 *    divide by ~0 and a late-evening view does not keep inflating the divisor.
 * input (now?: Date)
 * output (number)
 */
export function shiftHoursElapsed(now: Date = new Date()): number {
  const hours = now.getHours() + now.getMinutes() / 60;
  const capped = Math.min(SHIFT_END_HOUR, Math.max(SHIFT_START_HOUR, hours));
  // Half an hour minimum: at shift start the rate would otherwise be unbounded.
  return Math.max(0.5, capped - SHIFT_START_HOUR);
}

/**
 * tr-deponun kendi hedeflerini (specifications içindeki picksTarget/packsTarget) çözer, yoksa varsayılanı döner
 * en-resolves per-warehouse shift targets from `Warehouse.specifications`
 *    entries like `picksTarget=300`, falling back to the module defaults.
 * input (specifications?: string[] | null)
 * output ({ picksTarget: number, packsTarget: number })
 */
export function resolveTargets(specifications?: string[] | null): {
  picksTarget: number;
  packsTarget: number;
} {
  const read = (key: string, fallback: number) => {
    const hit = (specifications ?? []).find((s) =>
      s.trim().toLocaleLowerCase("en-US").startsWith(`${key.toLocaleLowerCase("en-US")}=`)
    );
    if (!hit) return fallback;
    const parsed = Number.parseInt(hit.split("=")[1]?.trim() ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  return {
    picksTarget: read("picksTarget", PICKS_TARGET),
    packsTarget: read("packsTarget", PACKS_TARGET),
  };
}

/**
 * tr-bir depo bölgesindeki kullanım oranını (yüzde) hesaplar
 * en-calculates the percentage of used capacity in a warehouse zone
 * input (used: number, capacity: number)
 * output (number)
 */
export function zonePct(used: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.round((used / capacity) * 100));
}

/**
 * Sentinel zone code for inventory whose `zone` is empty or does not match any
 * configured WarehouseZone. Previously such rows were hashed into a real zone,
 * which made a fabricated location indistinguishable from a surveyed one and
 * silently corrupted the capacity chart. They are now grouped here so the UI
 * can label them "unassigned" and prompt someone to place the stock.
 */
export const UNASSIGNED_ZONE = "__UNASSIGNED__";

/**
 * The set of warehouses a given user may see from this panel.
 *
 * Company-wide for roles that legitimately oversee more than one site
 * (admin/manager/dispatcher). For floor-locked operators it narrows to the
 * sites they are actually attached to — `User.assignedWarehouseId` plus any
 * warehouse they manage — so the switcher can no longer be used to read another
 * site's tasks, stock and capacity. Returning `null` means "no restriction".
 *
 * input (companyId: string, userId: string, roleName: string | null)
 * output (Promise<string[] | null>)
 */
export async function accessibleWarehouseIds(
  companyId: string,
  userId: string,
  roleName: string | null | undefined
): Promise<string[] | null> {
  if (!isWarehouseOnlyRole(roleName)) return null;

  const [me, managed] = await Promise.all([
    db.user.findFirst({
      where: { id: userId, companyId },
      select: { assignedWarehouseId: true },
    }),
    db.warehouse.findMany({
      where: { companyId, managerId: userId },
      select: { id: true },
    }),
  ]);

  const ids = new Set(managed.map((w) => w.id));
  if (me?.assignedWarehouseId) ids.add(me.assignedWarehouseId);
  return [...ids];
}

/**
 * tr-çalışanın görevli olduğu depoyu bulur (atanmış depo > açıkça belirtilen depo > yönettiği depo > şirketin ilk deposu)
 * en-resolves the warehouse a worker is attached to. `allowedIds` (when not
 *    null) hard-limits every step, so a locked operator passing someone else's
 *    warehouseId falls back to their own site instead of being served it.
 * input (companyId: string, userId: string, warehouseId?: string, allowedIds?: string[] | null)
 * output (Promise<Warehouse | null>)
 */
export async function resolveWarehouse(
  companyId: string,
  userId: string,
  warehouseId?: string,
  allowedIds?: string[] | null
) {
  // A locked user with no attachment at all has nothing to show; falling
  // through to "company's first warehouse" would reopen the leak.
  if (allowedIds && allowedIds.length === 0) return null;
  const scope = allowedIds ? { id: { in: allowedIds } } : {};

  if (warehouseId) {
    const wh = await db.warehouse.findFirst({
      where: { id: warehouseId, companyId, ...scope },
    });
    if (wh) return wh;
  }

  const assigned = allowedIds
    ? await db.warehouse.findFirst({
        where: { companyId, ...scope },
        orderBy: { createdAt: "asc" },
      })
    : null;
  if (assigned) return assigned;

  const managed = await db.warehouse.findFirst({
    where: { companyId, managerId: userId, ...scope },
    orderBy: { createdAt: "asc" },
  });
  if (managed) return managed;

  return db.warehouse.findFirst({
    where: { companyId, ...scope },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * tr-bir kullanıcının belirtilen depoya yazma erişimi olup olmadığını doğrular
 * en-asserts the user may write to `warehouseId`: it must exist inside their
 *    company and, for floor-locked operators, inside their assigned scope.
 *    Throws the same opaque message in both cases so the panel cannot be used
 *    to probe which warehouse ids exist.
 * input (companyId: string, userId: string, warehouseId: string, roleName: string | null)
 * output (Promise<void>)
 */
export async function assertWarehouseAccess(
  companyId: string,
  userId: string,
  warehouseId: string,
  roleName: string | null | undefined
): Promise<void> {
  const allowed = await accessibleWarehouseIds(companyId, userId, roleName);
  if (allowed && !allowed.includes(warehouseId))
    throw new Error("Invalid warehouse or unauthorized");

  const warehouse = await db.warehouse.findFirst({
    where: { id: warehouseId, companyId },
    select: { id: true },
  });
  if (!warehouse) throw new Error("Invalid warehouse or unauthorized");
}
