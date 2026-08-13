export interface AddCustomerIdentity {
  name: string;
  code: string;
  industry: string;
  taxId: string;
}

export interface AddCustomerContact {
  email: string;
  phone: string;
  locations: {
    id?: string;
    name: string;
    address: string;
    lat?: number;
    lng?: number;
    isDefault: boolean;
  }[];
}

export interface AddCustomerPageState {
  data: {
    identity: AddCustomerIdentity;
    contact: AddCustomerContact;
  };
  currentStep: number;
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
}

export interface AddCustomerPageActions {
  updateIdentity: (data: Partial<AddCustomerIdentity>) => void;
  updateContact: (data: Partial<AddCustomerContact>) => void;
  setStep: (step: number) => void;
  handleSubmit: () => Promise<void>;
  closeDialog: () => void;
  reset: () => void;
}

export interface AddCustomerDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
