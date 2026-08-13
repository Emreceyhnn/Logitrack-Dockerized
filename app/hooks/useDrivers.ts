"use client";

import { useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  createDriver,
  updateDriver,
  deleteDriver,
  updateDriverStatus,
  assignVehicleToDriver,
  unassignVehicleFromDriver,
} from "@/app/lib/controllers/driver";
import {
  DriverWithRelations,
  PaginatedResponse,
  DriverFilters,
  DriverDashboardResponseType,
  EligibleUser,
} from "@/app/lib/type/driver";
import { DriverStatus } from "@/app/lib/type/enums";
import { toast } from "sonner";

import { driverKeys } from "@/app/lib/query-keys/driver.keys";
import { vehicleKeys } from "@/app/lib/query-keys/vehicle.keys";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { logger } from "@/app/lib/logger";
import type { VehicleWithRelations } from "@/app/lib/type/vehicle";


async function fetchDrivers(
  page: number,
  limit: number,
  search?: string,
  status?: DriverStatus[],
  hasVehicle?: boolean,
  sortField?: string,
  sortOrder?: "asc" | "desc"
): Promise<PaginatedResponse<DriverWithRelations>> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (search) params.set("search", search);
  if (status?.length) status.forEach((s) => params.append("status", s));
  if (hasVehicle !== undefined) params.set("hasVehicle", String(hasVehicle));
  if (sortField) params.set("sortField", sortField);
  if (sortOrder) params.set("sortOrder", sortOrder);

  const res = await fetch(`/api/drivers?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`[useDrivers] fetch failed: ${res.status}`);
  }

  return res.json();
}

export function useDrivers(
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: DriverStatus[],
  hasVehicle?: boolean,
  sortField?: string,
  sortOrder?: "asc" | "desc"
) {
  return useQuery<PaginatedResponse<DriverWithRelations>>({
    queryKey: driverKeys.list({
      page,
      limit,
      search,
      status,
      hasVehicle,
      sortField,
      sortOrder,
    }),
    queryFn: () =>
      fetchDrivers(
        page,
        limit,
        search,
        status,
        hasVehicle,
        sortField,
        sortOrder
      ),
    staleTime: 1000 * 60 * 5,
  });
}

export function useDriverDashboardData() {
  return useQuery({
    queryKey: driverKeys.dashboard(),
    queryFn: async () => {
      const res = await fetch(`/api/drivers/dashboard`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`[useDriverDashboardData] fetch failed: ${res.status}`);
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

async function fetchDriverDashboard(filters: DriverFilters): Promise<{
  drivers: DriverWithRelations[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  driversKpis: DriverDashboardResponseType["driversKpis"];
  topPerformers: DriverDashboardResponseType["topPerformers"];
  performanceCharts: DriverDashboardResponseType["performanceCharts"];
  kpiTrends: DriverDashboardResponseType["kpiTrends"];
}> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.search) params.set("search", filters.search);
  if (filters.status?.length)
    filters.status.forEach((s) => params.append("status", s));
  if (filters.hasVehicle !== undefined)
    params.set("hasVehicle", String(filters.hasVehicle));
  if (filters.sortField) params.set("sortField", filters.sortField);
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);

  const res = await fetch(`/api/drivers/dashboard?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`[useDriverWithDashboard] fetch failed: ${res.status}`);
  }

  return res.json();
}

export function useDriverWithDashboard(
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: DriverStatus[],
  hasVehicle?: boolean,
  sortField?: string,
  sortOrder?: "asc" | "desc"
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: driverKeys.dashboardWithFilters({
      page,
      limit,
      search,
      status,
      hasVehicle,
      sortField,
      sortOrder,
    }),
    queryFn: () =>
      fetchDriverDashboard({
        page,
        limit,
        search,
        status,
        hasVehicle,
        sortField,
        sortOrder,
      }),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  // Prefetch the next ~30 items (multiple pages) so pagination feels instant.
  // prefetchQuery is a no-op for pages already in cache — only genuinely new
  // pages trigger a fetch (incremental behaviour).
  useEffect(() => {
    const totalPages = query.data?.meta?.totalPages;
    if (!totalPages) return;
    const pagesToPrefetch = Math.max(1, Math.ceil(30 / limit));
    for (let i = 1; i <= pagesToPrefetch; i++) {
      const nextPage = page + i;
      if (nextPage > totalPages) break;
      queryClient.prefetchQuery({
        queryKey: driverKeys.dashboardWithFilters({
          page: nextPage,
          limit,
          search,
          status,
          hasVehicle,
          sortField,
          sortOrder,
        }),
        queryFn: () =>
          fetchDriverDashboard({
            page: nextPage,
            limit,
            search,
            status,
            hasVehicle,
            sortField,
            sortOrder,
          }),
        staleTime: 1000 * 60 * 5,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, query.data, page, limit]);

  return query;
}

function patchCachedDrivers(
  queryClient: ReturnType<typeof useQueryClient>,
  driverId: string,
  patch: Partial<DriverWithRelations>
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  const patchOne = (driver: DriverWithRelations) =>
    driver.id === driverId ? { ...driver, ...patch } : driver;

  queryClient
    .getQueryCache()
    .findAll({ queryKey: driverKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | PaginatedResponse<DriverWithRelations>
        | { drivers: DriverWithRelations[] }
        | DriverWithRelations
        | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });

      if (
        typeof data === "object" &&
        "id" in data &&
        (data as DriverWithRelations).id === driverId
      ) {
        queryClient.setQueryData(query.queryKey, patchOne(data as DriverWithRelations));
      } else if (Array.isArray((data as PaginatedResponse<DriverWithRelations>).data)) {
        const paginated = data as PaginatedResponse<DriverWithRelations>;
        queryClient.setQueryData(query.queryKey, {
          ...paginated,
          data: paginated.data.map(patchOne),
        });
      } else if (Array.isArray((data as { drivers: DriverWithRelations[] }).drivers)) {
        const dashboard = data as { drivers: DriverWithRelations[] };
        queryClient.setQueryData(query.queryKey, {
          ...dashboard,
          drivers: dashboard.drivers.map(patchOne),
        });
      }
    });

  return previous;
}

function rollbackCachedDrivers(
  queryClient: ReturnType<typeof useQueryClient>,
  previous: Array<{ queryKey: readonly unknown[]; data: unknown }>
) {
  previous.forEach(({ queryKey, data }) => {
    queryClient.setQueryData(queryKey, data);
  });
}

function removeCachedDriver(
  queryClient: ReturnType<typeof useQueryClient>,
  driverId: string
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  queryClient
    .getQueryCache()
    .findAll({ queryKey: driverKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | PaginatedResponse<DriverWithRelations>
        | { drivers: DriverWithRelations[] }
        | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });

      if (Array.isArray((data as PaginatedResponse<DriverWithRelations>).data)) {
        const paginated = data as PaginatedResponse<DriverWithRelations>;
        queryClient.setQueryData(query.queryKey, {
          ...paginated,
          data: paginated.data.filter((d) => d.id !== driverId),
          meta: { ...paginated.meta, total: Math.max(0, paginated.meta.total - 1) },
        });
      } else if (Array.isArray((data as { drivers: DriverWithRelations[] }).drivers)) {
        const dashboard = data as { drivers: DriverWithRelations[] };
        queryClient.setQueryData(query.queryKey, {
          ...dashboard,
          drivers: dashboard.drivers.filter((d) => d.id !== driverId),
        });
      }
    });

  return previous;
}

function insertCachedDriver(
  queryClient: ReturnType<typeof useQueryClient>,
  driver: DriverWithRelations
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  queryClient
    .getQueryCache()
    .findAll({ queryKey: driverKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | PaginatedResponse<DriverWithRelations>
        | { drivers: DriverWithRelations[] }
        | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });

      if (Array.isArray((data as PaginatedResponse<DriverWithRelations>).data)) {
        const paginated = data as PaginatedResponse<DriverWithRelations>;
        queryClient.setQueryData(query.queryKey, {
          ...paginated,
          data: [driver, ...paginated.data],
          meta: { ...paginated.meta, total: paginated.meta.total + 1 },
        });
      } else if (Array.isArray((data as { drivers: DriverWithRelations[] }).drivers)) {
        const dashboard = data as { drivers: DriverWithRelations[] };
        queryClient.setQueryData(query.queryKey, {
          ...dashboard,
          drivers: [driver, ...dashboard.drivers],
        });
      }
    });

  return previous;
}

function findCachedDriver(
  queryClient: ReturnType<typeof useQueryClient>,
  driverId: string
): DriverWithRelations | null {
  for (const query of queryClient.getQueryCache().findAll({ queryKey: driverKeys.all })) {
    const data = query.state.data as
      | PaginatedResponse<DriverWithRelations>
      | { drivers: DriverWithRelations[] }
      | DriverWithRelations
      | undefined;
    if (!data) continue;
    if ("id" in data && (data as DriverWithRelations).id === driverId) {
      return data as DriverWithRelations;
    }
    const list = Array.isArray((data as PaginatedResponse<DriverWithRelations>).data)
      ? (data as PaginatedResponse<DriverWithRelations>).data
      : (data as { drivers: DriverWithRelations[] }).drivers;
    const found = list?.find((d) => d.id === driverId);
    if (found) return found;
  }
  return null;
}

function findCachedVehicle(
  queryClient: ReturnType<typeof useQueryClient>,
  vehicleId: string
): VehicleWithRelations | null {
  for (const query of queryClient.getQueryCache().findAll({ queryKey: vehicleKeys.all })) {
    const data = query.state.data as
      | VehicleWithRelations[]
      | { vehicles: VehicleWithRelations[] }
      | undefined;
    if (!data) continue;
    const list = Array.isArray(data) ? data : data.vehicles;
    const found = list?.find((v) => v.id === vehicleId);
    if (found) return found;
  }
  return null;
}

function patchCachedVehicleDriver(
  queryClient: ReturnType<typeof useQueryClient>,
  vehicleId: string,
  driver: VehicleWithRelations["driver"]
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  const patchOne = (vehicle: VehicleWithRelations) =>
    vehicle.id === vehicleId ? { ...vehicle, driver } : vehicle;

  queryClient
    .getQueryCache()
    .findAll({ queryKey: vehicleKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | VehicleWithRelations[]
        | { vehicles: VehicleWithRelations[] }
        | VehicleWithRelations
        | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });

      if (Array.isArray(data)) {
        queryClient.setQueryData(query.queryKey, data.map(patchOne));
      } else if (Array.isArray((data as { vehicles: VehicleWithRelations[] }).vehicles)) {
        const withVehicles = data as { vehicles: VehicleWithRelations[] };
        queryClient.setQueryData(query.queryKey, {
          ...withVehicles,
          vehicles: withVehicles.vehicles.map(patchOne),
        });
      } else if ((data as VehicleWithRelations).id === vehicleId) {
        queryClient.setQueryData(query.queryKey, patchOne(data as VehicleWithRelations));
      }
    });

  return previous;
}

export function useDriverMutations() {
  const dict = useDictionary();
  const queryClient = useQueryClient();

  const handleSuccess = (message: string) => {
    toast.success(message);
  };

  const handleError = (message: string, error: unknown) => {
    logger.error(message, error);
    toast.error(error instanceof Error ? error.message : message);
  };

  // onMutate already patches the cache optimistically, so on success we only
  // mark queries stale (refetchType: "none") instead of forcing an immediate
  // refetch of every mounted query — that would flash a loading state right
  // on top of the optimistic update. On error we force a real refetch of
  // active queries to resync with the server after rollback.
  const settleSuccess = () =>
    queryClient.invalidateQueries({ queryKey: driverKeys.all, refetchType: "none" });
  const settleError = () =>
    queryClient.invalidateQueries({ queryKey: driverKeys.all, refetchType: "active" });
  const settleSuccessWithVehicles = () => {
    queryClient.invalidateQueries({ queryKey: driverKeys.all, refetchType: "none" });
    queryClient.invalidateQueries({ queryKey: vehicleKeys.all, refetchType: "none" });
  };
  const settleErrorWithVehicles = () => {
    queryClient.invalidateQueries({ queryKey: driverKeys.all, refetchType: "active" });
    queryClient.invalidateQueries({ queryKey: vehicleKeys.all, refetchType: "active" });
  };

  const createMutation = useMutation({
    mutationFn: ({
      data,
    }: {
      data: Parameters<typeof createDriver>[0];
      eligibleUser: EligibleUser | undefined;
    }) => createDriver(data),
    onMutate: async ({ data, eligibleUser }) => {
      await queryClient.cancelQueries({ queryKey: driverKeys.all });
      const tempId = `temp-${Date.now()}`;
      const optimisticDriver: DriverWithRelations = {
        id: tempId,
        status: data.status,
        phone: data.phone,
        employeeId: data.employeeId ?? null,
        licenseNumber: data.licenseNumber ?? null,
        licenseType: data.licenseType ?? null,
        licenseExpiry: data.licenseExpiry ?? null,
        rating: null,
        efficiencyScore: null,
        safetyScore: null,
        hazmatCertified: data.hazmatCertified ?? false,
        languages: data.languages ?? [],
        homeBaseWarehouseId: data.homeBaseWarehouseId ?? null,
        user: eligibleUser
          ? {
              id: eligibleUser.id,
              name: eligibleUser.name,
              surname: eligibleUser.surname,
              email: eligibleUser.email,
              avatarUrl: eligibleUser.avatarUrl ?? null,
              roleId: eligibleUser.roleId ?? null,
            }
          : { id: data.userId, name: "", surname: "", email: "", avatarUrl: null, roleId: null },
        currentVehicle: null,
        homeBaseWarehouse: null,
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const previous = insertCachedDriver(queryClient, optimisticDriver);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedDrivers(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successAdd);
      settleSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof updateDriver>[1];
    }) => updateDriver(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: driverKeys.all });
      const previous = patchCachedDrivers(queryClient, id, data as Partial<DriverWithRelations>);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedDrivers(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successUpdate);
      settleSuccess();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDriver(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: driverKeys.all });
      const previous = removeCachedDriver(queryClient, id);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedDrivers(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successDelete);
      settleSuccess();
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DriverStatus }) =>
      updateDriverStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: driverKeys.all });
      const previous = patchCachedDrivers(queryClient, id, { status });
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedDrivers(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successUpdate);
      settleSuccess();
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({
      driverId,
      vehicleId,
    }: {
      driverId: string;
      vehicleId: string;
    }) => assignVehicleToDriver(driverId, vehicleId),
    onMutate: async ({ driverId, vehicleId }) => {
      await queryClient.cancelQueries({ queryKey: driverKeys.all });
      await queryClient.cancelQueries({ queryKey: vehicleKeys.all });

      const vehicle = findCachedVehicle(queryClient, vehicleId);
      const driver = findCachedDriver(queryClient, driverId);
      const previousDrivers = patchCachedDrivers(queryClient, driverId, {
        currentVehicle: vehicle
          ? { id: vehicle.id, plate: vehicle.plate, brand: vehicle.brand, model: vehicle.model }
          : null,
      });
      const previousVehicles =
        vehicle && driver
          ? patchCachedVehicleDriver(queryClient, vehicleId, {
              id: driver.id,
              rating: driver.rating,
              user: {
                name: driver.user.name,
                surname: driver.user.surname,
                avatarUrl: driver.user.avatarUrl,
              },
            })
          : [];

      return { previousDrivers, previousVehicles };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previousDrivers) rollbackCachedDrivers(queryClient, context.previousDrivers);
      if (context?.previousVehicles) rollbackCachedDrivers(queryClient, context.previousVehicles);
      handleError("Failed to assign vehicle", error);
      settleErrorWithVehicles();
    },
    onSuccess: () => {
      handleSuccess("Vehicle assigned successfully");
      settleSuccessWithVehicles();
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (driverId: string) => unassignVehicleFromDriver(driverId),
    onMutate: async (driverId) => {
      await queryClient.cancelQueries({ queryKey: driverKeys.all });
      await queryClient.cancelQueries({ queryKey: vehicleKeys.all });

      const driverQuery = queryClient
        .getQueryCache()
        .findAll({ queryKey: driverKeys.all })
        .map((q) => q.state.data)
        .find(
          (data): data is { drivers: DriverWithRelations[] } | PaginatedResponse<DriverWithRelations> =>
            !!data
        );
      const drivers = driverQuery
        ? Array.isArray((driverQuery as PaginatedResponse<DriverWithRelations>).data)
          ? (driverQuery as PaginatedResponse<DriverWithRelations>).data
          : (driverQuery as { drivers: DriverWithRelations[] }).drivers
        : [];
      const previousVehicleId = drivers.find((d) => d.id === driverId)?.currentVehicle?.id;

      const previousDrivers = patchCachedDrivers(queryClient, driverId, { currentVehicle: null });
      const previousVehicles = previousVehicleId
        ? patchCachedVehicleDriver(queryClient, previousVehicleId, null)
        : [];

      return { previousDrivers, previousVehicles };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previousDrivers) rollbackCachedDrivers(queryClient, context.previousDrivers);
      if (context?.previousVehicles) rollbackCachedDrivers(queryClient, context.previousVehicles);
      handleError("Failed to unassign vehicle", error);
      settleErrorWithVehicles();
    },
    onSuccess: () => {
      handleSuccess("Vehicle unassigned successfully");
      settleSuccessWithVehicles();
    },
  });

  return {
    createDriver: createMutation,
    updateDriver: updateMutation,
    deleteDriver: deleteMutation,
    updateDriverStatus: statusMutation,
    assignVehicle: assignMutation,
    unassignVehicle: unassignMutation,
  };
}
