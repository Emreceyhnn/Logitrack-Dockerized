import { WarehouseWithRelations } from "./warehouse";
import { WarehouseBasicInfo, WarehouseLocation, WarehouseCapacity, WarehouseFormActions } from "./warehouse-form";

export type EditWarehouseBasicInfo = WarehouseBasicInfo;
export type EditWarehouseLocation = WarehouseLocation;
export type EditWarehouseCapacity = WarehouseCapacity;

export interface EditWarehousePageState {
  data: {
    basicInfo: EditWarehouseBasicInfo;
    location: EditWarehouseLocation;
    capacity: EditWarehouseCapacity;
  };
  currentStep: number;
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
}

export interface EditWarehousePageActions extends WarehouseFormActions {
  handleSubmit: () => Promise<void>;
  closeDialog: () => void;
  reset: () => void;
}

export interface EditWarehouseDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  warehouseData?: WarehouseWithRelations | undefined;
}
