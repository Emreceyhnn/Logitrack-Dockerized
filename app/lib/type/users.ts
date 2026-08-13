import { User, Role, Driver } from "./enums";

// Domain Models
export interface UserWithRelations extends User {
  role: Role | null;
  driver?: Driver | null;
}

// Page State
export interface UsersPageState {
  users: UserWithRelations[];
  selectedUserId: string | null;
  filters: {
    role?: string;
    search?: string;
  };
  loading: boolean;
  error: string | null;
}

// Page Actions
export interface UsersPageActions {
  fetchUsers: () => Promise<void>;
  selectUser: (id: string | null) => void;
  updateFilters: (filters: Partial<UsersPageState["filters"]>) => void;
}

// Component Props
export interface UserListProps {
  users: UserWithRelations[];
  loading: boolean;
  onSelect: (id: string) => void;
}
