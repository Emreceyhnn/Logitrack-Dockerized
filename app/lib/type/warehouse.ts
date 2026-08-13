import { Warehouse, Driver } from "./enums";
// Note: Inventory not in enums yet, defining minimal interface here for now
export interface Inventory {
  id: string;
  sku: string;
  name: string;
  quantity: number;
}

// Domain Models
export interface WarehouseWithRelations extends Omit<Warehouse, "specifications"> {
  specifications: string[];
  manager?: {
    id: string;
    name: string;
    surname: string;
    email: string;
    avatarUrl: string | null;
  } | null;

  inventory?: Inventory[];

  // tr-`Driver` kendi içinde tam `user: User` tanımlar; kesişimle daraltmak yerine `Omit`
  //    gerekiyor, çünkü sorgu (warehouse/crud.ts) yalnızca bu üç alanı seçiyor ve tam
  //    `User` ile kesişim çakışıyordu.
  // en-`Driver` declares a full `user: User`; an intersection can't narrow it, so `Omit` is
  //    required — the query (warehouse/crud.ts) selects only these three fields and
  //    intersecting with the full `User` conflicted.
  drivers?: (Omit<Driver, "user"> & {
    user: {
      name: string;
      surname: string;
      avatarUrl: string | null;
    };
  })[];

  _count?: {
    inventory: number;
    drivers: number;
  };

  usedPallets?: number;
  usedVolume?: number;
}

export interface InventoryMovementWithRelations {
  id: string;
  warehouseId: string;
  sku: string;
  quantity: number;
  type: string;
  date: Date;
  warehouse: {
    code: string;
    name: string;
  };
  itemName: string;
}

// KPI / Stats
export interface WarehouseStats {
  totalWarehouses: number;
  totalSkus: number;
  totalItems: number;
  totalCapacityPallets: number;
  totalCapacityVolume: number;
}

// Page State
export interface WarehousePageState {
  warehouses: WarehouseWithRelations[];
  stats: WarehouseStats | null;
  totalCount: number;
  recentMovements: InventoryMovementWithRelations[];
  selectedWarehouseId: string | null;
  loading: boolean;
  error: string | null;
}

// Page Actions
export interface WarehousePageActions {
  fetchWarehouses: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchRecentMovements: () => Promise<void>;
  refreshAll: () => Promise<void>;
  selectWarehouse: (id: string | null) => void;
  editWarehouse: (id: string) => void;
  deleteWarehouse: (id: string) => Promise<void>;
}

// Component Props
export interface WarehouseKpiCardProps {
  stats: WarehouseStats | null;
  loading?: boolean;
}

import { PaginationMeta } from "./dataTable";

export interface WarehouseTableProps {
  warehouses: WarehouseWithRelations[];
  loading: boolean;
  /** Background refetch with rows already on screen — dim, don't blank. */
  refreshing?: boolean | undefined;
  onSelect: (id: string | null) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDetails?: (id: string) => void;
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}
