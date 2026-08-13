export const inventoryKeys = {
  all: ["inventory"] as const,
  lists: (warehouseId?: string) =>
    [...inventoryKeys.all, "list", { warehouseId }] as const,
  details: (id: string) => [...inventoryKeys.all, "detail", id] as const,
  lowStock: () => [...inventoryKeys.all, "lowStock"] as const,
  movements: (sku: string, warehouseId: string) =>
    [...inventoryKeys.all, "movements", { sku, warehouseId }] as const,
  dashboard: () => [...inventoryKeys.all, "dashboard"] as const,
  dashboardWithFilters: (
    page: number,
    pageSize: number,
    warehouseId?: string,
    search?: string,
    sortBy?: string,
    sortOrder?: "asc" | "desc",
    status?: string[]
  ) =>
    [
      ...inventoryKeys.dashboard(),
      { page, pageSize, warehouseId, search, sortBy, sortOrder, status },
    ] as const,
};
