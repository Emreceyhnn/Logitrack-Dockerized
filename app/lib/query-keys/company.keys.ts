export const companyKeys = {
  all: ["company"] as const,
  profile: () => [...companyKeys.all, "profile"] as const,
  dashboard: () => [...companyKeys.all, "dashboard"] as const,
  dashboardWithFilters: (filters: { page: number; pageSize: number; search?: string | undefined }) =>
    [...companyKeys.dashboard(), filters] as const,
  joinRequests: () => [...companyKeys.all, "joinRequests"] as const,
  invitations: () => [...companyKeys.all, "invitations"] as const,
};
