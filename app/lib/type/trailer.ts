import { Trailer, TrailerStatus, TrailerType, TrailerAssignment } from "./enums";
import { PaginationMeta } from "./dataTable";

export interface TrailerWithRelations extends Trailer {
  currentVehicle?: {
    id: string;
    plate: string;
    fleetNo: string;
  } | null;
  assignments?: TrailerAssignment[];
  currentWeightKg?: number;
  currentVolumeM3?: number;
  _count?: {
    shipments: number;
    issues: number;
    documents: number;
  };
}

export interface TrailerFilters {
  search?: string | undefined;
  status?: TrailerStatus[] | undefined;
  type?: TrailerType[] | undefined;
  isColdChain?: boolean | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface TrailerPageState {
  trailers: TrailerWithRelations[];
  filters: TrailerFilters;
  selectedTrailerId: string | null;
  isLoading: boolean;
  error: string | null;
  meta?: PaginationMeta;
}

export interface TrailerPageActions {
  fetchTrailers: () => Promise<void>;
  createTrailer: (data: Partial<Trailer>) => Promise<void>;
  updateTrailer: (id: string, data: Partial<Trailer>) => Promise<void>;
  deleteTrailer: (id: string) => Promise<void>;
  assignToVehicle: (trailerId: string, vehicleId: string) => Promise<void>;
  detachFromVehicle: (trailerId: string) => Promise<void>;
  updateFilters: (filters: Partial<TrailerFilters>) => void;
  selectTrailer: (id: string | null) => void;
}

export interface TrailerPageProps {
  state: TrailerPageState;
  actions: TrailerPageActions;
}
