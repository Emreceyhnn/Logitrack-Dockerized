/**
 * Domain context for the Create Company flow
 */
export interface CompanyFormData {
  // Step 1: Branding
  name: string;
  logo: string | null;
  industry: string;
  domain: string;

  // Step 2: Regional
  timezone: string;
  currency: string;
  language: string;
  regionalVisibility: boolean;
}

/**
 * Single Root State for Create Company
 */
export interface CreateCompanyState {
  activeStep: number;
  formData: CompanyFormData;
  loading: boolean;
  error: string | null;
}

/**
 * Actions for Create Company
 */
export interface CreateCompanyActions {
  handleNext: () => void;
  handleBack: () => void;
  updateFormData: (data: Partial<CompanyFormData>) => void;
  submit: () => Promise<void>;
  reset: () => void;
}

/**
 * Props for the dialog component
 */
export interface CreateCompanyDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (lang?: string) => void;
}

/**
 * Child component props
 */
export interface CompanyStepProps {
  state: CreateCompanyState;
  actions: CreateCompanyActions;
}
