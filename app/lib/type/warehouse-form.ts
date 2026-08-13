import { WarehouseType } from "./enums";

export interface WarehouseBasicInfo {
  name: string;
  code: string;
  type: WarehouseType;
  openingTime?: string;
  closingTime?: string;
  is247: boolean;
  timezone: string;
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
