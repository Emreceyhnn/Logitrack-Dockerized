export interface AddRouteStep1 {
  name: string;
  startTime: Date | null;
  endTime: Date | null;
}

export interface AddRouteStep2 {
  startType: "WAREHOUSE" | "CUSTOMER" | "ADDRESS";
  startId: string;
  startAddress: string;
  startLat?: number;
  startLng?: number;

  endType: "WAREHOUSE" | "CUSTOMER" | "ADDRESS";
  endId: string;
  endAddress: string;
  endLat?: number;
  endLng?: number;

  distanceKm: number;
  durationMin: number;
}

export interface AddRouteStep3 {
  driverId: string;
  vehicleId: string;
}

export interface AddRoutePageState {
  currentStep: number;
  data: {
    step1: AddRouteStep1;
    step2: AddRouteStep2;
    step3: AddRouteStep3;
  };
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
}

export interface AddRoutePageActions {
  updateStep1: (data: Partial<AddRouteStep1>) => void;
  updateStep2: (data: Partial<AddRouteStep2>) => void;
  updateStep3: (data: Partial<AddRouteStep3>) => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  handleSubmit: () => Promise<void>;
  closeDialog: () => void;
  reset: () => void;
}

export interface AddRouteDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
