export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  details: (id: string) => [...customerKeys.all, "detail", id] as const,
  dashboard: () => [...customerKeys.all, "dashboard"] as const,
  dashboardWithFilters: (page: number, pageSize: number, search?: string) =>
    [...customerKeys.dashboard(), { page, pageSize, search }] as const,
};
