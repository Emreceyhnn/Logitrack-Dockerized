import { DriverFilters } from "@/app/lib/type/driver";

export const driverKeys = {
  all: ["drivers"] as const,
  lists: () => [...driverKeys.all, "list"] as const,
  list: (params: DriverFilters) => [...driverKeys.lists(), params] as const,
  details: () => [...driverKeys.all, "detail"] as const,
  detail: (id: string) => [...driverKeys.details(), id] as const,
  dashboard: () => [...driverKeys.all, "dashboard"] as const,
  dashboardWithFilters: (filters: DriverFilters) =>
    [...driverKeys.dashboard(), { filters }] as const,
};
