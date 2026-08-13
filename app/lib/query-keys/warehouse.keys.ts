export const warehouseKeys = {
  all: ["warehouses"] as const,
  lists: () => [...warehouseKeys.all, "list"] as const,
  detailsAll: () => [...warehouseKeys.all, "detail"] as const,
  details: (id: string) => [...warehouseKeys.detailsAll(), id] as const,
  stats: () => [...warehouseKeys.all, "stats"] as const,
  movements: () => [...warehouseKeys.all, "movements"] as const,
  dashboard: () => [...warehouseKeys.all, "dashboard"] as const,
  dashboardWithFilters: (page: number, pageSize: number) =>
    [...warehouseKeys.dashboard(), { page, pageSize }] as const,
  zonesAll: () => [...warehouseKeys.all, "zones"] as const,
  zones: (warehouseId: string) => [...warehouseKeys.zonesAll(), warehouseId] as const,
};
