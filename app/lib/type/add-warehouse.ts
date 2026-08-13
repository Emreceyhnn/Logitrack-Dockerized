import { WarehouseBasicInfo, WarehouseLocation, WarehouseCapacity, WarehouseFormActions } from "./warehouse-form";

export type AddWarehouseBasicInfo = WarehouseBasicInfo;
export type AddWarehouseLocation = WarehouseLocation;
export type AddWarehouseCapacity = WarehouseCapacity;

export interface AddWarehousePageState {
  data: {
    basicInfo: AddWarehouseBasicInfo;
    location: AddWarehouseLocation;
    capacity: AddWarehouseCapacity;
  };
  currentStep: number;
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
}

export interface AddWarehousePageActions extends WarehouseFormActions {
  handleSubmit: () => Promise<void>;
  closeDialog: () => void;
  reset: () => void;
}

export interface AddWarehouseDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
