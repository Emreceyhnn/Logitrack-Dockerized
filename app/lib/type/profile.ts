// ─── Profile Page Domain Types ────────────────────────────────────────────

export interface ProfileUser {
  id: string;
  name: string;
  surname: string;
  email: string;
  avatarUrl: string | null;
  roleId: string | null;
  companyId: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface ProfileFormData {
  name: string;
  surname: string;
  email: string;
  avatarUrl: string | null;
}

export interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ProfilePageState {
  user: ProfileUser | null;
  activeTab: number;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  profileForm: ProfileFormData;
  passwordForm: PasswordFormData;
}

export interface ProfilePageActions {
  setActiveTab: (tab: number) => void;
  updateProfileForm: (data: Partial<ProfileFormData>) => void;
  updatePasswordForm: (data: Partial<PasswordFormData>) => void;
  saveProfile: () => Promise<void>;
  changePassword: () => Promise<void>;
  refresh: () => Promise<void>;
}
