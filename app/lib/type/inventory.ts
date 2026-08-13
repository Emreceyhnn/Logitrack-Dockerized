import { Inventory } from "./enums";

// Domain Models
export interface InventoryWithRelations extends Omit<
  Inventory,
  "imageUrl" | "unitValue" | "unit"
> {
  warehouse: {
    code: string;
    name: string;
  };
  imageUrl: string | null;
  unitValue: number | null;
  unit: string;
  currency: string;
}

export interface LowStockItem extends Inventory {
  warehouse: {
    name: string;
  };
}

export interface InventoryMovement {
  id: string;
  sku: string;
  quantity: number;
  type: string;
  date: Date;
  notes?: string | null;
  user?: {
    name: string;
    surname: string;
  } | null;
}

export interface InventoryStats {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
}

export interface CreateInventoryInput {
  warehouseId: string;
  sku: string;
  name: string;
  zone?: string | null;
  quantity: number;
  minStock?: number;
  weightKg?: number | null;
  volumeM3?: number | null;
  palletCount?: number | null;
  cargoType?: string | null;
  unitValue?: number | null;
  currency?: string | null;
  imageUrl?: string | null;
}

export type UpdateInventoryInput = Partial<CreateInventoryInput>;

// Page State
export interface InventoryPageState {
  inventory: InventoryWithRelations[];
  lowStockItems: LowStockItem[];
  totalCount: number;
  stats: InventoryStats | null;
  selectedItemId: string | null;
  selectedItem: InventoryWithRelations | null;
  recentMovements: InventoryMovement[]; // New field
  isDetailsOpen: boolean;
  isEditOpen: boolean;
  filters: {
    warehouseId?: string | undefined;
    search?: string | undefined;
    status?: string[] | undefined;
  };
  loading: boolean;
  error: string | null;
}

// Page Actions
export interface InventoryPageActions {
  fetchInventory: (warehouseId?: string) => Promise<void>;
  fetchLowStock: () => Promise<void>;
  refreshAll: () => Promise<void>;
  openDetails: (id: string) => void;
  closeDetails: () => void;
  openEdit: (id: string) => void;
  closeEdit: () => void;
  updateItem: (id: string, data: Partial<Inventory>) => Promise<void>;
  updateFilters: (filters: Partial<InventoryPageState["filters"]>) => void;
}

// Component Props
import { PaginationMeta } from "./dataTable";

export interface InventoryTableProps {
  items: InventoryWithRelations[];
  loading: boolean;
  /** Background refetch with rows already on screen — dim, don't blank. */
  refreshing?: boolean | undefined;
  onSelect: (id: string) => void;
  onEdit?: ((item: InventoryWithRelations) => void) | undefined;
  onDelete: (id: string) => void;
  meta?: PaginationMeta | undefined;
  onPageChange?: ((page: number) => void) | undefined;
  onLimitChange?: ((limit: number) => void) | undefined;
  sortField?: string | undefined;
  sortOrder?: "asc" | "desc" | undefined;
  onRequestSort?: ((field: string) => void) | undefined;
}

export interface InventoryDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryWithRelations | null;
  onEdit: (id: string) => void;
}

export interface InventoryEditProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryWithRelations | null;
  onUpdate: (id: string, data: Partial<Inventory>) => Promise<void>;
}
