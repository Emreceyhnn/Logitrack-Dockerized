import { ShipmentPriority } from "./enums";
import { InventoryWithRelations } from "./inventory";

export { ShipmentPriority };

export interface InventoryShipmentItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  maxQuantity?: number;
  unit: "Each" | "Box" | "Pallet";
  weightKg?: number;
  volumeM3?: number;
  palletCount?: number;
  cargoType?: string;
}

export interface AddShipmentBasicInfo {
  referenceNumber: string;
  priority: ShipmentPriority;
  type: string;
  slaDeadline: Date | null;
}

export interface AddShipmentLogistics {
  originWarehouseId: string;
  originLat?: number;
  originLng?: number;
  destination: string;
  destinationLat?: number;
  destinationLng?: number;
  customerId: string;
  customerLocationId: string;
  contactEmail: string;
  billingAccount: string;
}

export interface AddShipmentCargo {
  weightKg: number;
  volumeM3: number;
  palletCount: number;
  cargoType: string;
}

export interface AddShipmentInventory {
  items: InventoryShipmentItem[];
}

export interface AddShipmentRoute {
  assignedRouteId: string | null;
}

export interface AddShipmentPageState {
  data: {
    basicInfo: AddShipmentBasicInfo;
    logistics: AddShipmentLogistics;
    cargo: AddShipmentCargo;
    inventory: AddShipmentInventory;
    route: AddShipmentRoute;
  };
  availableInventory: InventoryWithRelations[];
  currentStep: number;
  isLoading: boolean;
  isLoadingInventory: boolean;
  error: string | null;
  isSuccess: boolean;
}

export interface AddShipmentPageActions {
  updateBasicInfo: (data: Partial<AddShipmentBasicInfo>) => void;
  updateLogistics: (data: Partial<AddShipmentLogistics>) => void;
  updateCargo: (data: Partial<AddShipmentCargo>) => void;
  updateInventory: (data: Partial<AddShipmentInventory>) => void;
  addInventoryItem: (item: InventoryShipmentItem) => void;
  removeInventoryItem: (id: string) => void;
  updateRoute: (data: Partial<AddShipmentRoute>) => void;
  setStep: (step: number) => void;
  handleSubmit: () => Promise<void>;
  closeDialog: () => void;
  reset: () => void;
}

export interface AddShipmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
