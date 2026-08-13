import { Customer, Shipment, CustomerLocation } from "./enums";

// Domain Models
export interface CustomerWithRelations extends Customer {
  _count?: {
    shipments: number;
  };
  shipments?: Shipment[];
  locations?: CustomerLocation[];
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  totalShipments: number;
}


export interface CustomerFormLocation {
  id?: string;
  name: string;
  address: string;
  lat?: number | undefined;
  lng?: number | undefined;
  isDefault: boolean;
}

export interface CustomerFormValues {
  name: string;
  code: string;
  industry: string;
  taxId: string;
  email: string;
  phone: string;
  locations: CustomerFormLocation[];
}

// Page State
export interface CustomerPageState {
  customers: CustomerWithRelations[];
  totalCount: number;
  stats: CustomerStats | null;
  selectedCustomerId: string | null;
  filters: {
    search?: string;
  };
  loading: boolean;
  error: string | null;
}

// Page Actions
export interface CustomerPageActions {
  fetchCustomers: () => Promise<void>;
  selectCustomer: (id: string) => void;
  updateFilters: (filters: Partial<CustomerPageState["filters"]>) => void;
}

// Component Props
import { PaginationMeta } from "./dataTable";

export interface CustomerListProps {
  customers: CustomerWithRelations[];
  selectedId: string | null;
  loading?: boolean;
  onSelect: (id: string) => void;
  onEdit?: (customer: CustomerWithRelations) => void;
  onDelete?: (customer: CustomerWithRelations) => void;
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}
