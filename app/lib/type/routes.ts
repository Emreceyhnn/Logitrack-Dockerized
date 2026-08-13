import { Route, RouteStatus } from "./enums";
import { ShipmentStopWithRelations } from "./shipment";

// Domain Models
export interface RouteWithRelations extends Route {
  vehicle?: {
    id: string;
    plate: string;
    type: string;
    brand: string;
    model: string;
    currentLat: number | null;
    currentLng: number | null;
    fuelLevel: number | null;
  } | null;

  driver?: {
    id: string;
    status: string;
    phone: string;
    employeeId: string;
    licenseNumber: string | null;
    licenseType: string | null;
    licenseExpiry: Date | null;
    rating: number | null;
    efficiencyScore: number | null;
    safetyScore: number | null;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      name: string;
      surname: string;
      avatarUrl: string | null;
    };
  } | null;

  shipments?: {
    id: string;
    status: string;
    origin: string | null;
    originLat?: number | null;
    originLng?: number | null;
    destination: string;
    destinationLat?: number | null;
    destinationLng?: number | null;
    stops?: ShipmentStopWithRelations[];
  }[];
  metrics?: {
    totalDistanceKm?: number;
    totalDurationMin?: number;
    totalStops?: number;
    efficiencyShare?: number;
  };
  stops?: { address: string; lat?: number | undefined; lng?: number | undefined }[] | null;
}

// KPI / Stats
export interface RouteStats {
  active: number;
  inProgress: number;
  completedToday: number;
  delayed: number;
}

export interface RouteNotification {
  id: string;
  title: string;
  message: string;
  date: Date;
  type: "info" | "warning" | "error";
}

export interface RouteNotification {
  id: string;
  title: string;
  message: string;
  date: Date;
  type: "info" | "warning" | "error";
}

export interface RouteEfficiencyStats {
  fuelConsumption: number;
  onTimePerformance: number;
  vehicleUtilization: number;
  recentNotifications: RouteNotification[];
}

export interface MapRouteData {
  position: {
    lat: number;
    lng: number;
  };
  name: string;
  id: string;
  type: string;
  routeId: string;
  routeName: string | null;
}

// Page State
export interface RoutesPageState {
  routes: RouteWithRelations[];
  stats: RouteStats | null;
  efficiency: RouteEfficiencyStats | null;
  mapData: MapRouteData[];
  // Filter Types:
  filters: {
    status?: RouteStatus[];
    search?: string;
    date?: Date;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  selectedRouteId: string | null;
  viewMode: "list" | "map";
  loading: boolean;
  error: string | null;
}

// Page Actions
export interface RoutesPageActions {
  fetchRoutes: (page?: number, status?: RouteStatus) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchEfficiency: () => Promise<void>;
  fetchMapData: () => Promise<void>;
  refreshAll: () => Promise<void>;
  updateFilters: (filters: Partial<RoutesPageState["filters"]>) => void;
  changePage: (page: number) => void;
}

// Component Props
export interface RouteTableProps {
  routes: RouteWithRelations[];
  loading: boolean;
  onSelect?: (id: string) => void;
  pagination: RoutesPageState["pagination"];
  onPageChange: (page: number) => void;
}

export interface RoutesKpiCardProps {
  stats: RouteStats | null;
}
export interface RouteFormValues {
  name: string;
  startTime: Date | null;
  endTime: Date | null;
  startType: "WAREHOUSE" | "CUSTOMER";
  startId: string;
  startAddress: string;
  startLat: number;
  startLng: number;
  endType: "WAREHOUSE" | "CUSTOMER";
  endId: string;
  endAddress: string;
  endLat?: number;
  endLng?: number;
  distanceKm: number;
  durationMin: number;
  driverId: string;
  vehicleId: string;
  stops: { address: string; lat?: number | undefined; lng?: number | undefined }[];
  /**
   * Encoded polyline from the routing engine, captured alongside the distance
   * and duration it already derives. Persisted so deviation checks have a
   * corridor; empty until the map panel resolves a route.
   */
  shape: string;
  /**
   * Per-route deviation tolerance. `undefined` means "use the default" rather
   * than "no corridor" — the field is an optional override, not a toggle.
   */
  bufferMeters?: number | undefined;
}
