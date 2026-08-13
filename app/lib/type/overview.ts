// Domain Models
export interface ActionRequiredItems {
  type: "vehicle" | "driver" | "SHIPMENT_DELAY" | "DOCUMENT_DUE" | "warehouse";
  title: string;
  message?: string;
  messageKey?: string;
  messageParams?: Record<string, string | number> | undefined;
  link?: string | undefined;
  /**
   * Severity of a document alert, derived from its expiry date rather than the
   * stored `Document.status` (which is never updated to EXPIRED). Drives both
   * the ordering and the visual treatment — an already-lapsed document must
   * not look like an upcoming renewal.
   */
  urgency?: "EXPIRED" | "EXPIRING_SOON" | undefined;
}

export interface OverviewStats {
  activeShipments: number;
  delayedShipments: number;
  vehiclesOnTrip: number;
  vehiclesInService: number;
  availableVehicles: number;
  activeDrivers: number;
  warehouses: number;
  inventorySkus: number;
}

export type KpiTrend = { value: number; isUp: boolean } | undefined;

export interface OverviewStatsTrends {
  activeShipments: KpiTrend;
  delayedShipments: KpiTrend;
  vehiclesOnTrip: KpiTrend;
  vehiclesInService: KpiTrend;
  availableVehicles: KpiTrend;
  activeDrivers: KpiTrend;
  warehouses: KpiTrend;
  inventorySkus: KpiTrend;
}

export interface DailyOperationsData {
  plannedRoutes: number;
  completedDeliveries: number;
  failedDeliveries: number;
  avgDeliveryTimeMin: number;
  fuelConsumedLiters: number;
}

export interface FuelStat {
  id: string;
  plate: string;
  value: number; // volumeLiter (sum)
  totalCost: number;
}

export interface FuelLogStat {
  plate: string;
  amount: number;
  date: string;
}

export interface WarehouseCapacityStat {
  warehouseName: string;
  warehouseId: string;
  capacity: number; // pallet utilization %
  volume: number;   // volume utilization %
  palletUsed: number;
  palletCapacity: number;
  volumeUsed: number;
  volumeCapacity: number;
}

export interface LowStockItemStat {
  item: string;
  sku: string;
  warehouseId: string; // warehouse name
  onHand: number;
  minStock: number;
}

export interface PicksAndPacksData {
  picks: number;
  packs: number;
}

export interface TrendData {
  date: string;
  value: number;
}

export interface ShipmentDayStat {
  date: string;
  count: number;
}

export interface MapData {
  position: {
    lat: number;
    lng: number;
  };
  name: string;
  id: string;
  type: "W" | "V" | "C";
}

export interface DashboardData {
  stats: OverviewStats | null;
  statsTrends?: OverviewStatsTrends;
  dailyOps: DailyOperationsData | null;
  fuelStats: FuelStat[];
  fuelLogs: FuelLogStat[];
  warehouseCapacity: WarehouseCapacityStat[];
  lowStockItems: LowStockItemStat[];
  shipmentStatus: string[];
  picksAndPacks: PicksAndPacksData | null;
  trends: TrendData[];
  shipmentVolume: ShipmentDayStat[];
  mapData: MapData[];
}

// Page State
export interface OverviewPageState {
  data: DashboardData;
  alerts: ActionRequiredItems[];
  loading: boolean;
  error: string | null;
}

// Page Actions
export interface OverviewPageActions {
  fetchDashboardData: () => Promise<void>;
}

// Component Props
export interface OverviewKpiCardProps {
  values: OverviewStats | null;
  loading?: boolean;
}
