/** Shared types for the Warehouse Worker dashboard. */

export type WarehouseTaskKind = "PICK" | "PACK" | "PUT";
export type WarehouseTaskPriority = "LOW" | "MEDIUM" | "HIGH";

export interface WWWorker {
  name: string;
  initials: string;
  role: string;
}

export interface WWWarehouse {
  id: string;
  name: string;
  code: string;
  city: string;
}

export interface WWKpis {
  picks: number;
  picksTarget: number;
  packs: number;
  packsTarget: number;
  rate: number;
}

export interface WWTask {
  id: string;
  kind: WarehouseTaskKind;
  name: string;
  orderRef: string;
  zone: string;
  done: number;
  total: number;
  priority: WarehouseTaskPriority;
  complete: boolean;
}

export interface WWZone {
  code: string;
  capacityPallets: number;
  usedPallets: number;
  pct: number;
  /** True for the synthetic "no zone recorded" bucket — never a real,
   *  fillable location, so it must not trigger capacity alerts or divert
   *  suggestions the way an actual zone would. */
  isUnassigned?: boolean;
}

export interface WWMovement {
  id: string;
  type: string;
  name: string;
  sku: string;
  qty: number;
  zone: string;
  who: string;
  self: boolean;
  at: string;
}

export interface WWCatalogItem {
  sku: string;
  name: string;
  zone: string;
  quantity: number;
  /** On-hand minus allocated — what's actually pickable right now. */
  available: number;
  /** Reorder threshold (0 = untracked). Low when available <= minStock. */
  minStock: number;
  lowStock: boolean;
}

/** A SKU whose available stock has fallen to/below its reorder point. */
export interface WWLowStockItem {
  sku: string;
  name: string;
  zone: string;
  available: number;
  minStock: number;
  /** Units to bring available back up to the threshold (>= 1). */
  suggestedQty: number;
}

export interface WWWarehouseOption {
  id: string;
  name: string;
  code: string;
}

/** Sentinel zone code for stock with no valid WarehouseZone. Mirrors
 *  UNASSIGNED_ZONE in the controller's shared module. */
export const UNASSIGNED_ZONE = "__UNASSIGNED__";

export interface WarehouseWorkerDashboard {
  warehouse: WWWarehouse | null;
  warehouses: WWWarehouseOption[];
  worker: WWWorker;
  /** False for read-only roles (e.g. Dispatcher): the panel hides every
   *  write control and the server rejects the mutation regardless. */
  canWrite: boolean;
  kpis: WWKpis;
  tasks: WWTask[];
  zones: WWZone[];
  feed: WWMovement[];
  catalog: WWCatalogItem[];
  /** SKUs at/below their reorder point, worst first — the proactive shortage
   *  signal the worker sees without having to scan each item. */
  lowStock: WWLowStockItem[];
  /** Pallets held by stock with no valid zone. Deliberately kept out of the
   *  per-zone bars so the capacity chart shows only surveyed locations. */
  unassignedPallets: number;
  capacity: { used: number; total: number; pct: number; free: number };
}
