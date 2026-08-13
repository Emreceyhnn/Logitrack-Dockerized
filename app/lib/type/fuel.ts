

export interface FuelLog {
  id: string;
  vehicleId: string;
  driverId: string;
  companyId: string | null;
  date: Date | string;
  volumeLiter: number;
  cost: number;
  odometerKm: number;
  location: string | null;
  fuelType: string;
  receiptUrl: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface FuelLogWithRelations extends FuelLog {
  vehicle: {
    id: string;
    plate: string;
    fleetNo: string;
  };
  driver: {
    id: string;
    user: {
      name: string;
      surname: string;
    };
  };
}

export interface FuelPageState {
  logs: FuelLogWithRelations[];
  stats: {
    totalCost: number;
    totalVolume: number;
    avgFuelPrice: number;
    efficiencyKml: number;
  } | null;
  filters: {
    vehicleId?: string;
    driverId?: string;
    startDate?: Date;
    endDate?: Date;
  };
  loading: boolean;
  error: string | null;
}

export interface FuelPageActions {
  fetchLogs: () => Promise<void>;
  fetchStats: () => Promise<void>;
  createLog: (data: Omit<FuelLog, "id" | "createdAt" | "updatedAt" | "companyId">) => Promise<void>;
  updateFilters: (filters: Partial<FuelPageState["filters"]>) => void;
  refreshAll: () => Promise<void>;
}

export interface FuelTableProps {
  state: FuelPageState;
  actions: FuelPageActions;
}

export interface FuelKpiCardProps {
  state: FuelPageState;
  actions: FuelPageActions;
}

export interface AddFuelLogDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
