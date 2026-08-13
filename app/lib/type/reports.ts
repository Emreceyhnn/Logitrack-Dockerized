export interface ReportsShipmentStatusCount {
  status: string;
  count: number;
}

// Type alias (not interface) so it gets an implicit index signature and can
// be passed straight to MUI X Charts' `dataset` prop without casting.
export type ReportsShipmentRouteCount = {
  route: string;
  count: number;
};

export interface ReportsShipments {
  statusCounts: ReportsShipmentStatusCount[];
  routeCounts: ReportsShipmentRouteCount[];
}

export interface ReportsFleetItem {
  plate: string;
  consumption: string;
  odometer: number;
  maintenanceCost: number;
}

export interface ReportsInventoryCategory {
  value: number;
  count: number;
}

export interface ReportsInventory {
  categoryStats: Record<string, ReportsInventoryCategory>;
}

export interface ReportsMetrics {
  totalShipments: number;
  onTimeRate: number;
  activeVehicles: number;
  totalInventoryValue: number;
  pendingOrders: number;
  avgDeliveryTime: number;
  avgFuelCons: number;
  maintenanceCost: number;
  totalDistance: number;
  stockTurnover: number;
  deadStock: number;
  warehouseCapacity: number;
}

export interface ReportsData {
  shipments: ReportsShipments;
  fleet: ReportsFleetItem[];
  inventory: ReportsInventory;
  metrics: ReportsMetrics;
}

// Page State
export interface ReportsPageState {
  data: ReportsData | null;
  loading: boolean;
  error: string | null;
}

// Page Actions
export interface ReportsPageActions {
  fetchReports: () => Promise<void>;
}

// Component Props
export interface ReportsPageProps {
  state: ReportsPageState;
  actions: ReportsPageActions;
}
