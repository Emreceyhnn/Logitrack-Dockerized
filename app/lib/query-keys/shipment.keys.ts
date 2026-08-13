import { ShipmentStatus } from "@/app/lib/type/enums";

export const shipmentKeys = {
  all: ["shipments"] as const,
  lists: () => [...shipmentKeys.all, "list"] as const,
  details: (id: string) => [...shipmentKeys.all, "detail", id] as const,
  stats: () => [...shipmentKeys.all, "stats"] as const,
  history: () => [...shipmentKeys.all, "history"] as const,
  distribution: () => [...shipmentKeys.all, "distribution"] as const,
  dashboard: () => [...shipmentKeys.all, "dashboard"] as const,
  dashboardWithFilters: (page: number, pageSize: number, status?: ShipmentStatus, search?: string) =>
    [...shipmentKeys.dashboard(), { page, pageSize, status, search }] as const,
};
