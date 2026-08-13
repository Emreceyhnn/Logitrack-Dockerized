/**
 * Platform User domain model
 */
export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface DriverStateData {
  employeeId: string;
  phone: string;
  licenseNumber: string;
  licenseType: string;
  licenseExpiry: string;
}

/**
 * Single Root State for Add Company Member
 */
export interface AddMemberState {
  searchQuery: string;
  results: PlatformUser[];
  selectedUserId: string | null;
  selectedRole: string;
  driverData: DriverStateData;
  loading: boolean;
  error: string | null;
}

/**
 * Actions for Add Company Member
 */
export interface AddMemberActions {
  setSearchQuery: (query: string) => void;
  selectUser: (id: string | null) => void;
  setRole: (role: string) => void;
  setDriverData: (field: keyof DriverStateData, value: string) => void;
  submit: () => Promise<void>;
  reset: () => void;
}

/**
 * Props for the dialog component
 */
export interface AddMemberDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
