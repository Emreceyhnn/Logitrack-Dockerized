import { PaginationMeta } from "./dataTable";

export interface CompanyProfile {
  id?: string;
  name?: string;
  avatarUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyStats {
  users: number;
  vehicles: number;
  drivers: number;
  warehouses: number;
  customers: number;
  shipments: number;
}

export interface CompanyMember {
  id: string;
  name: string;
  surname: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  roleId: string | null;
  roleName: string | null;
  assignedWarehouseId: string | null;
  createdAt: string;
}

export interface CompanyPageData {
  profile: CompanyProfile;
  stats: CompanyStats;
  statsTrends?: {
    users?: { value: number; isUp: boolean };
    vehicles?: { value: number; isUp: boolean };
    drivers?: { value: number; isUp: boolean };
    warehouses?: { value: number; isUp: boolean };
    customers?: { value: number; isUp: boolean };
    shipments?: { value: number; isUp: boolean };
  };
  members: CompanyMember[];
  totalCount: number;
  meta: PaginationMeta;
}

export interface CompanyPageState {
  data: CompanyPageData | null;
  loading: boolean;
  error: string | null;
}

export interface CompanyPageActions {
  fetchData: () => Promise<void>;
  refreshAll: () => Promise<void>;
  deleteMember: (memberId: string) => Promise<void>;
  updateFilters: (filters: Partial<{ search: string }>) => void;
  updatePagination: (pagination: Partial<{ page: number; pageSize: number }>) => void;
}

export interface CompanyPageProps {
  state: CompanyPageState;
  actions: CompanyPageActions;
}
