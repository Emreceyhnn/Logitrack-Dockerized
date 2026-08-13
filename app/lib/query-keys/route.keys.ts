export const routeKeys = {
  all: ["routes"] as const,
  lists: (page: number, pageSize: number, status?: string) => 
    [...routeKeys.all, "list", { page, pageSize, status }] as const,
  stats: () => [...routeKeys.all, "stats"] as const,
  efficiency: () => [...routeKeys.all, "efficiency"] as const,
  locations: () => [...routeKeys.all, "locations"] as const,
  details: (id: string) => [...routeKeys.all, "detail", id] as const,
  dashboard: () => [...routeKeys.all, "dashboard"] as const,
  dashboardWithFilters: (page: number, pageSize: number, status?: string | string[]) =>
    [...routeKeys.dashboard(), { page, pageSize, status }] as const,
};
