import {
  VehicleStatus,
  VehicleType,
} from "./enums";
import {
  Issue,
  Document,
  MaintenanceRecord,
  Route,
  FuelLog,
} from "./enums";

export interface VehicleDashboardProps {
  id: string;
  plate: string;
  status: VehicleStatus;
  maxLoadKg: number;
  documents: {
    type: string;
    expiryDate: Date | null;
  }[];
  issues: {
    id: string;
  }[];
  maintenanceRecords: {
    type: string;
    date: Date;
    status: string | null;
  }[];
}

export interface VehicleDashboardResponseType {
  vehiclesKpis: {
    totalVehicles: number;
    available: number;
    inService: number;
    onTrip: number;
    openIssues: number;
    docsDueSoon: number;
  };
  vehiclesCapacity: {
    id: string;
    plate: string;
    maxLoadKg: number;
  }[];
  expiringDocs: {
    id: string;
    plate: string;
    documentType: string;
    expiryDate: Date | null;
  }[];
  plannedServices: {
    id: string;
    plate: string;
    serviceType: string;
    serviceDate: Date;
  }[];
  kpiTrends?: {
    totalVehicles?: { value: number; isUp: boolean };
  };
}

export interface DriverWithUser {
  id: string;
  rating: number | null;
  user: {
    name: string;
    surname: string;
    avatarUrl: string | null;
  };
}

export interface VehicleWithRelations {
  id: string;
  fleetNo: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  type: VehicleType;
  maxLoadKg: number;
  fuelType: string;
  nextServiceKm: number | null;
  avgFuelConsumption: number | null;
  status: VehicleStatus;
  odometerKm: number | null;
  fuelLevel: number | null;
  fuelCapacity: number | null;
  currentLat: number | null;
  currentLng: number | null;
  driver: DriverWithUser | null;
  issues: Issue[];
  documents: Document[];
  maintenanceRecords: MaintenanceRecord[];
  /** Only included by detail queries (getVehicleById); list queries omit it. */
  fuelLogs?: FuelLog[];
  routes: Route[];
  photo: string | null;
  engineSize?: string | null;
  transmission?: string | null;
  techNotes?: string | null;
  registrationExpiry?: Date | null;
  inspectionExpiry?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Filter types
export interface VehicleFilters {
  search?: string | undefined;
  status?: VehicleStatus[] | undefined;
  type?: VehicleType[] | undefined;
  hasIssues?: boolean | undefined;
  hasDriver?: boolean | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

import { PaginationMeta } from "./dataTable";

// Page state (centralized)
export interface VehiclePageState {
  vehicles: VehicleWithRelations[];
  dashboardData: VehicleDashboardResponseType | null;
  filters: VehicleFilters;
  selectedVehicleId: string | null;
  loading: boolean;
  /** Background refetch with rows already on screen — dim, don't blank. */
  refreshing?: boolean | undefined;
  error: string | null;
  meta?: PaginationMeta;
}

// Page actions
export interface VehiclePageActions {
  fetchVehicles: () => Promise<void>;
  fetchDashboardData: () => Promise<void>;
  selectVehicle: (id: string | null) => void;
  updateFilters: (filters: Partial<VehicleFilters>) => void;
  refreshAll: () => Promise<void>;
  setPage?: (page: number) => void;
  setLimit?: (limit: number) => void;
}

// Component props
export interface VehicleToolbarProps {
  state: VehiclePageState;
  actions: VehiclePageActions;
}

export interface VehicleTableProps {
  state: VehiclePageState;
  actions: VehiclePageActions & {
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onUpdateSuccess?: () => void;
  };
}

export interface VehicleKpiCardProps {
  state: VehiclePageState;
  actions: VehiclePageActions;
}

export interface EditVehicleDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  vehicle: {
    id: string;
    fleetNo: string;
    plate: string;
    type: VehicleType;
    brand: string;
    model: string;
    year: number;
    maxLoadKg: number;
    fuelType: string;
    status: VehicleStatus;
    odometerKm?: number | null;
    nextServiceKm?: number | null;
    avgFuelConsumption?: number | null;
    fuelLevel?: number | null;
    fuelCapacity?: number | null;
  };
}

export interface VehicleFormData {
  type: VehicleType;
  brand: string;
  model: string;
  year: number | "";
  maxLoadKg: number | "";
  fuelType: string;
  status: VehicleStatus;
  odometerKm?: number | "";
  nextServiceKm?: number | "";
  avgFuelConsumption?: number | "";
}

import { Dayjs } from "dayjs";

export interface VehicleStep1Data {
  photo?: string | File;
  fleetNo: string;
  plate: string;
  type: VehicleType | "";
  brand: string;
  model: string;
  year: number | "";
  odometerKm: number | "";
  nextServiceKm: number | "";
  status: string | "";
}

export interface VehicleStep2Data {
  maxLoadKg: number | "";
  fuelType: string;
  fuelLevel: number | "";
  fuelCapacity: number | "";
  avgFuelConsumption: number | "";
  engineSize: string;
  transmission: string;
  techNotes: string;
}

export interface VehicleStep3Data {
  registrationExpiry: Dayjs | null;
  inspectionExpiry: Dayjs | null;
  nextServiceDueKm: number | "";
  enableExpiryAlerts: boolean;
  documents: {
    id: string;
    type: string;
    name: string;
    size: string;
    uploadedAt: string;
    file: File | null;
  }[];
}

export interface VehicleFormValues
  extends VehicleStep1Data, VehicleStep2Data, VehicleStep3Data {}

export interface AddVehiclePageState {
  currentStep: number;
  data: {
    step1: VehicleStep1Data;
    step2: VehicleStep2Data;
    step3: VehicleStep3Data;
  };
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
}

export interface AddVehiclePageActions {
  updateStep1: (data: Partial<VehicleStep1Data>) => void;
  updateStep2: (data: Partial<VehicleStep2Data>) => void;
  updateStep3: (data: Partial<VehicleStep3Data>) => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  handleSubmit: () => Promise<void>;
  closeDialog: () => void;
  reset: () => void;
}

export interface AddVehiclePageProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export interface VehicleLocation {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  lastUpdated: number;
}
