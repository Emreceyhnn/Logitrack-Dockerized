import {
  Shipment,
  Route,
  ShipmentHistory,
  Company,
  ShipmentStatus,
  ShipmentPriority,
  ShipmentItem,
} from "./enums";
import type { ShipmentServiceType } from "@prisma/client";
import { CustomerWithRelations } from "./customer";
import { InventoryShipmentItem } from "./add-shipment";

// Domain Models
export const SHIPMENT_STATUS_VALUES = Object.values(ShipmentStatus);

export interface ShipmentWithRelations
  extends Omit<
    Shipment,
    | "status"
    | "priority"
    | "originLat"
    | "originLng"
    | "destinationLat"
    | "destinationLng"
    | "type"
    | "slaDeadline"
    | "contactEmail"
    | "billingAccount"
    | "originWarehouseId"
  > {
  status: ShipmentStatus;
  priority: ShipmentPriority | null;
  originLat: number | null;
  originLng: number | null;
  destinationLat: number | null;
  destinationLng: number | null;
  customer: CustomerWithRelations | null;
  customerLocationId: string | null;
  originWarehouseId: string | null;
  driver: {
    id: string;
    user: {
      name: string;
      surname: string;
      avatarUrl: string | null;
    };
  } | null;
  route: Route | null;

  // New fields
  type: ShipmentServiceType | null;
  slaDeadline: Date | null;
  contactEmail: string | null;
  billingAccount: string | null;
  referenceNumber: string | null;

  // For detail view
  company?: Company | null;
  history?: ShipmentHistory[];
  items?: ShipmentItem[];
  stops?: ShipmentStopWithRelations[];
}

export interface ShipmentStopWithRelations {
  id?: string;
  customerId: string | null;
  customerLocationId: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  sequence: number;
  contactEmail?: string | null;
}

// KPI / Stats
export interface ShipmentStats {
  total: number;
  active: number;
  delayed: number;
  inTransit: number;
}

export interface ShipmentVolumeData {
  day: string; // Sun, Mon, etc.
  volume: number;
}

export interface ShipmentStatusData {
  status: ShipmentStatus;
  count: number;
}

// Page State
export interface ShipmentPageState {
  shipments: ShipmentWithRelations[];
  stats: ShipmentStats | null;
  totalCount: number;
  volumeHistory: ShipmentVolumeData[];
  statusDistribution: ShipmentStatusData[];
  selectedShipmentId: string | null;
  filters: {
    status?: ShipmentStatus | undefined;
    search?: string | undefined;
    date?: Date | undefined;
  };
  loading: boolean;
  /** Background refetch with data already on screen — dim, don't blank. */
  refreshing?: boolean | undefined;
  error: string | null;
}

// Page Actions
export interface ShipmentPageActions {
  fetchShipments: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchCharts: () => Promise<void>;
  refreshAll: () => Promise<void>;
  selectShipment: (id: string | null) => void;
  updateFilters: (filters: Partial<ShipmentPageState["filters"]>) => void;
}

// Component Props
export interface ShipmentTableProps {
  state: ShipmentPageState;
  actions: ShipmentPageActions & {
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
  };
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export interface ShipmentKpiCardProps {
  state: ShipmentPageState;
  actions: ShipmentPageActions;
}

export interface ShipmentAnalyticsProps {
  state: ShipmentPageState;
  actions: ShipmentPageActions;
}
export interface ShipmentFormValues {
  trackingId: string;
  referenceNumber: string;
  priority: ShipmentPriority;
  type: string;
  slaDeadline: Date | null;
  originWarehouseId: string;
  originLat?: number | undefined;
  originLng?: number | undefined;
  destination: string;
  destinationLat?: number | undefined;
  destinationLng?: number | undefined;
  customerId: string;
  customerLocationId: string;
  contactEmail: string;
  billingAccount: string;
  weightKg: number;
  volumeM3: number;
  palletCount: number;
  cargoType: string;
  assignedRouteId: string | null;
  trailerId: string | null;
  driverId: string | null;
  inventoryItems: InventoryShipmentItem[];
  stops: ShipmentStopWithRelations[];
}
