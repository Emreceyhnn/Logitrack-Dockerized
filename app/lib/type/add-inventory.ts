export interface AddInventoryItemDetails {
  sku: string;
  name: string;
  category: string;
  weightKg?: number;
  volumeM3?: number;
  palletCount?: number;
  cargoType?: string;
  imageUrl?: string;
  unitValue?: number;
}

export interface AddInventoryStorageLevels {
  warehouseId: string;
  zone?: string;
  initialQuantity: number;
  minStockLevel: number;
}

export interface AddInventoryPageState {
  data: {
    itemDetails: AddInventoryItemDetails;
    storageLevels: AddInventoryStorageLevels;
  };
  currentStep: number;
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
}

export interface AddInventoryPageActions {
  updateItemDetails: (data: Partial<AddInventoryItemDetails>) => void;
  updateStorageLevels: (data: Partial<AddInventoryStorageLevels>) => void;
  setStep: (step: number) => void;
  handleSubmit: () => Promise<void>;
  closeDialog: () => void;
  reset: () => void;
}

export interface AddInventoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialWarehouseId?: string;
}
