import { WarehouseType } from "./enums";

export interface WarehouseBasicInfo {
  name: string;
  code: string;
  type: WarehouseType;
  openingTime?: string;
  closingTime?: string;
  is247: boolean;
  timezone: string;
  /** "HH:mm", warehouse-local time. Optional — no cut-off means the metric is n/a, not a false miss. */
  cutoffTime?: string;
}

export interface WarehouseLocation {
  address: string;
  city: string;
  country: string;
  postalCode: string;
  lat?: number | undefined;
  lng?: number | undefined;
  managerId: string;
}

export interface WarehouseCapacity {
  capacityPallets: number;
  capacityVolumeM3: number;
  specifications: string[];
}

export interface WarehouseFormActions {
  updateBasicInfo: (data: Partial<WarehouseBasicInfo>) => void;
  updateLocation: (data: Partial<WarehouseLocation>) => void;
  updateCapacity: (data: Partial<WarehouseCapacity>) => void;
  setStep: (step: number) => void;
}
