"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  createVehicle,
  updateVehicle,
  deleteVehicle,
  updateVehicleStatus,
  assignDriverToVehicle,
  unassignDriverFromVehicle,
  uploadVehicleDocument,
  addMaintenanceRecord,
  createVehicleIssue,
} from "@/app/lib/controllers/vehicle";
import { createFuelLog } from "@/app/lib/controllers/fuel";
import {
  VehicleFilters,
  VehicleDashboardResponseType,
  VehicleWithRelations,
  DriverWithUser,
} from "@/app/lib/type/vehicle";
import { toast } from "sonner";

import { vehicleKeys } from "@/app/lib/query-keys/vehicle.keys";
import { driverKeys } from "@/app/lib/query-keys/driver.keys";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { logger } from "@/app/lib/logger";
import type { DriverWithRelations } from "@/app/lib/type/driver";


async function fetchVehicles(
  filters: VehicleFilters
): Promise<VehicleWithRelations[]> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("pageSize", String(filters.limit));
  if (filters.search) params.set("search", filters.search);
  if (filters.status?.length)
    filters.status.forEach((s) => params.append("status", s));
  if (filters.type?.length)
    filters.type.forEach((t) => params.append("type", t));
  if (filters.hasIssues !== undefined)
    params.set("hasIssues", String(filters.hasIssues));
  if (filters.hasDriver !== undefined)
    params.set("hasDriver", String(filters.hasDriver));

  const res = await fetch(`/api/vehicles?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`[useVehicles] fetch failed: ${res.status}`);
  }

  return res.json() as Promise<VehicleWithRelations[]>;
}

export function useVehicles(filters: VehicleFilters = {}) {
  return useQuery({
    queryKey: vehicleKeys.list(filters),
    queryFn: () => fetchVehicles(filters),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
}

export function useVehicle(id?: string | null) {
  return useQuery({
    queryKey: vehicleKeys.detail(id || ""),
    queryFn: async () => {
      if (!id) return null;
      const { getVehicleById } = await import("@/app/lib/controllers/vehicle");
      return getVehicleById(id);
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

async function fetchVehicleDashboard(
  filters: VehicleFilters
): Promise<
  VehicleDashboardResponseType & { vehicles: VehicleWithRelations[] }
> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("pageSize", String(filters.limit));
  if (filters.search) params.set("search", filters.search);
  if (filters.status?.length)
    filters.status.forEach((s) => params.append("status", s));
  if (filters.type?.length)
    filters.type.forEach((t) => params.append("type", t));
  if (filters.hasIssues !== undefined)
    params.set("hasIssues", String(filters.hasIssues));
  if (filters.hasDriver !== undefined)
    params.set("hasDriver", String(filters.hasDriver));

  const res = await fetch(`/api/vehicles/dashboard?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`[useVehicleWithDashboard] fetch failed: ${res.status}`);
  }

  return res.json() as Promise<
    VehicleDashboardResponseType & { vehicles: VehicleWithRelations[] }
  >;
}

export function useVehicleWithDashboard(filters: VehicleFilters = {}) {
  return useQuery({
    queryKey: vehicleKeys.dashboardWithFilters(filters),
    queryFn: () => fetchVehicleDashboard(filters),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
}

function patchCachedVehicles(
  queryClient: ReturnType<typeof useQueryClient>,
  vehicleId: string,
  patch: Partial<VehicleWithRelations>
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  const patchOne = (vehicle: VehicleWithRelations) =>
    vehicle.id === vehicleId ? { ...vehicle, ...patch } : vehicle;

  queryClient
    .getQueryCache()
    .findAll({ queryKey: vehicleKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | VehicleWithRelations[]
        | (VehicleDashboardResponseType & { vehicles: VehicleWithRelations[] })
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

function rollbackCachedVehicles(
  queryClient: ReturnType<typeof useQueryClient>,
  previous: Array<{ queryKey: readonly unknown[]; data: unknown }>
) {
  previous.forEach(({ queryKey, data }) => {
    queryClient.setQueryData(queryKey, data);
  });
}

function removeCachedVehicle(
  queryClient: ReturnType<typeof useQueryClient>,
  vehicleId: string
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  queryClient
    .getQueryCache()
    .findAll({ queryKey: vehicleKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | VehicleWithRelations[]
        | (VehicleDashboardResponseType & { vehicles: VehicleWithRelations[] })
        | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });

      if (Array.isArray(data)) {
        queryClient.setQueryData(query.queryKey, data.filter((v) => v.id !== vehicleId));
      } else if (Array.isArray((data as { vehicles: VehicleWithRelations[] }).vehicles)) {
        const withVehicles = data as { vehicles: VehicleWithRelations[] };
        queryClient.setQueryData(query.queryKey, {
          ...withVehicles,
          vehicles: withVehicles.vehicles.filter((v) => v.id !== vehicleId),
        });
      }
    });

  return previous;
}

function insertCachedVehicle(
  queryClient: ReturnType<typeof useQueryClient>,
  vehicle: VehicleWithRelations
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  queryClient
    .getQueryCache()
    .findAll({ queryKey: vehicleKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | VehicleWithRelations[]
        | (VehicleDashboardResponseType & { vehicles: VehicleWithRelations[] })
        | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });

      if (Array.isArray(data)) {
        queryClient.setQueryData(query.queryKey, [vehicle, ...data]);
      } else if (Array.isArray((data as { vehicles: VehicleWithRelations[] }).vehicles)) {
        const withVehicles = data as { vehicles: VehicleWithRelations[] };
        queryClient.setQueryData(query.queryKey, {
          ...withVehicles,
          vehicles: [vehicle, ...withVehicles.vehicles],
        });
      }
    });

  return previous;
}

function buildOptimisticVehicle(
  tempId: string,
  data: Record<string, unknown>
): VehicleWithRelations {
  return {
    id: tempId,
    fleetNo: (data.fleetNo as string) || "",
    plate: (data.plate as string) || "",
    brand: (data.brand as string) || "",
    model: (data.model as string) || "",
    year: (data.year as number) || new Date().getFullYear(),
    type: data.type as VehicleWithRelations["type"],
    maxLoadKg: (data.maxLoadKg as number) || 0,
    fuelType: (data.fuelType as string) || "",
    nextServiceKm: (data.nextServiceKm as number) ?? null,
    avgFuelConsumption: (data.avgFuelConsumption as number) ?? null,
    status: (data.status as VehicleWithRelations["status"]) || ("AVAILABLE" as VehicleWithRelations["status"]),
    odometerKm: (data.odometerKm as number) ?? null,
    fuelLevel: (data.fuelLevel as number) ?? null,
    fuelCapacity: (data.fuelCapacity as number) ?? null,
    currentLat: null,
    currentLng: null,
    driver: null,
    issues: [],
    documents: [],
    maintenanceRecords: [],
    routes: [],
    photo: (data.photo as string) ?? null,
    engineSize: (data.engineSize as string) ?? null,
    transmission: (data.transmission as string) ?? null,
    techNotes: (data.techNotes as string) ?? null,
    registrationExpiry: (data.registrationExpiry as Date) ?? null,
    inspectionExpiry: (data.inspectionExpiry as Date) ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function patchCachedDriverVehicle(
  queryClient: ReturnType<typeof useQueryClient>,
  driverId: string,
  currentVehicle: DriverWithRelations["currentVehicle"]
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  const patchOne = (driver: DriverWithRelations) =>
    driver.id === driverId ? { ...driver, currentVehicle } : driver;

  queryClient
    .getQueryCache()
    .findAll({ queryKey: driverKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | { data: DriverWithRelations[]; meta: unknown }
        | { drivers: DriverWithRelations[] }
        | DriverWithRelations
        | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });

      if ("id" in data && (data as DriverWithRelations).id === driverId) {
        queryClient.setQueryData(query.queryKey, patchOne(data as DriverWithRelations));
      } else if (Array.isArray((data as { data: DriverWithRelations[] }).data)) {
        const paginated = data as { data: DriverWithRelations[] };
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

function findCachedDriverByVehicleId(
  queryClient: ReturnType<typeof useQueryClient>,
  vehicleId: string
): DriverWithRelations | null {
  for (const query of queryClient.getQueryCache().findAll({ queryKey: driverKeys.all })) {
    const data = query.state.data as
      | { data: DriverWithRelations[] }
      | { drivers: DriverWithRelations[] }
      | undefined;
    if (!data) continue;
    const list = Array.isArray((data as { data: DriverWithRelations[] }).data)
      ? (data as { data: DriverWithRelations[] }).data
      : (data as { drivers: DriverWithRelations[] }).drivers;
    const found = list?.find((d) => d.currentVehicle?.id === vehicleId);
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
      | (VehicleDashboardResponseType & { vehicles: VehicleWithRelations[] })
      | undefined;
    if (!data) continue;
    const list = Array.isArray(data) ? data : (data as { vehicles: VehicleWithRelations[] }).vehicles;
    const found = list?.find((v) => v.id === vehicleId);
    if (found) return found;
  }
  return null;
}

export function useVehicleMutations() {
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
    queryClient.invalidateQueries({ queryKey: vehicleKeys.all, refetchType: "none" });
  const settleError = () =>
    queryClient.invalidateQueries({ queryKey: vehicleKeys.all, refetchType: "active" });
  const settleSuccessWithDrivers = () => {
    queryClient.invalidateQueries({ queryKey: vehicleKeys.all, refetchType: "none" });
    queryClient.invalidateQueries({ queryKey: driverKeys.all, refetchType: "none" });
  };
  const settleErrorWithDrivers = () => {
    queryClient.invalidateQueries({ queryKey: vehicleKeys.all, refetchType: "active" });
    queryClient.invalidateQueries({ queryKey: driverKeys.all, refetchType: "active" });
  };

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof createVehicle>[0]) =>
      createVehicle(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: vehicleKeys.all });
      const tempId = `temp-${Date.now()}`;
      const optimisticVehicle = buildOptimisticVehicle(tempId, data as Record<string, unknown>);
      const previous = insertCachedVehicle(queryClient, optimisticVehicle);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedVehicles(queryClient, context.previous);
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
      data: Parameters<typeof updateVehicle>[1];
    }) => updateVehicle(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: vehicleKeys.all });
      const previous = patchCachedVehicles(queryClient, id, data as Partial<VehicleWithRelations>);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedVehicles(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successUpdate);
      settleSuccess();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVehicle(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: vehicleKeys.all });
      const previous = removeCachedVehicle(queryClient, id);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedVehicles(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successDelete);
      settleSuccess();
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: Parameters<typeof updateVehicleStatus>[1];
    }) => updateVehicleStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: vehicleKeys.all });
      const previous = patchCachedVehicles(queryClient, id, { status });
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedVehicles(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successUpdate);
      settleSuccess();
    },
  });

  const assignDriverMutation = useMutation({
    mutationFn: ({
      vehicleId,
      driver,
    }: {
      vehicleId: string;
      driver: DriverWithUser;
    }) => assignDriverToVehicle(vehicleId, driver.id),
    onMutate: async ({ vehicleId, driver }) => {
      await queryClient.cancelQueries({ queryKey: vehicleKeys.all });
      await queryClient.cancelQueries({ queryKey: driverKeys.all });

      const previousVehicles = patchCachedVehicles(queryClient, vehicleId, { driver });

      const previouslyAssignedDriver = findCachedDriverByVehicleId(queryClient, vehicleId);
      const previousDrivers = [
        ...(previouslyAssignedDriver
          ? patchCachedDriverVehicle(queryClient, previouslyAssignedDriver.id, null)
          : []),
        ...patchCachedDriverVehicle(queryClient, driver.id, {
          id: vehicleId,
          plate: "",
          brand: "",
          model: "",
        }),
      ];

      return { previousVehicles, previousDrivers };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previousVehicles) rollbackCachedVehicles(queryClient, context.previousVehicles);
      if (context?.previousDrivers) rollbackCachedVehicles(queryClient, context.previousDrivers);
      handleError(dict.toasts.errorGeneric, error);
      settleErrorWithDrivers();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successUpdate);
      settleSuccessWithDrivers();
    },
  });

  const unassignDriverMutation = useMutation({
    mutationFn: (vehicleId: string) => unassignDriverFromVehicle(vehicleId),
    onMutate: async (vehicleId) => {
      await queryClient.cancelQueries({ queryKey: vehicleKeys.all });
      await queryClient.cancelQueries({ queryKey: driverKeys.all });

      const previousVehicles = patchCachedVehicles(queryClient, vehicleId, { driver: null });

      const previouslyAssignedDriver = findCachedDriverByVehicleId(queryClient, vehicleId);
      const previousDrivers = previouslyAssignedDriver
        ? patchCachedDriverVehicle(queryClient, previouslyAssignedDriver.id, null)
        : [];

      return { previousVehicles, previousDrivers };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previousVehicles) rollbackCachedVehicles(queryClient, context.previousVehicles);
      if (context?.previousDrivers) rollbackCachedVehicles(queryClient, context.previousDrivers);
      handleError(dict.toasts.errorGeneric, error);
      settleErrorWithDrivers();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successUpdate);
      settleSuccessWithDrivers();
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: ({
      vehicleId,
      data,
    }: {
      vehicleId: string;
      data: Parameters<typeof uploadVehicleDocument>[1];
    }) => uploadVehicleDocument(vehicleId, data),
    onMutate: async ({ vehicleId, data }) => {
      await queryClient.cancelQueries({ queryKey: vehicleKeys.all });

      const vehicle = findCachedVehicle(queryClient, vehicleId);
      const optimisticDoc = {
        id: `temp-${Date.now()}`,
        type: data.type,
        name: data.name,
        url: data.url,
        expiryDate: data.expiryDate ?? null,
        status: data.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const previous = vehicle
        ? patchCachedVehicles(queryClient, vehicleId, {
            documents: [...vehicle.documents, optimisticDoc],
          })
        : [];

      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedVehicles(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successAdd);
      settleSuccess();
    },
  });

  const addFuelLogMutation = useMutation({
    mutationFn: (data: Parameters<typeof createFuelLog>[0]) => createFuelLog(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: vehicleKeys.all });

      const vehicle = findCachedVehicle(queryClient, data.vehicleId);
      const optimisticLog = {
        id: `temp-${Date.now()}`,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        companyId: "",
        date: data.date ?? new Date(),
        volumeLiter: data.volumeLiter,
        cost: data.cost,
        odometerKm: data.odometerKm,
        location: data.location ?? null,
        fuelType: data.fuelType,
        currency: data.currency ?? "USD",
        receiptUrl: data.receiptUrl ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const previous = vehicle
        ? patchCachedVehicles(queryClient, data.vehicleId, {
            fuelLogs: [...(vehicle.fuelLogs || []), optimisticLog],
          })
        : [];

      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedVehicles(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successAdd);
      settleSuccess();
    },
  });

  const addMaintenanceRecordMutation = useMutation({
    mutationFn: ({
      vehicleId,
      data,
    }: {
      vehicleId: string;
      data: Parameters<typeof addMaintenanceRecord>[1];
    }) => addMaintenanceRecord(vehicleId, data),
    onMutate: async ({ vehicleId, data }) => {
      await queryClient.cancelQueries({ queryKey: vehicleKeys.all });

      const vehicle = findCachedVehicle(queryClient, vehicleId);
      const optimisticRecord = {
        id: `temp-${Date.now()}`,
        vehicleId,
        type: data.type,
        date: data.date,
        cost: data.cost,
        currency: data.currency ?? "USD",
        status: data.status ?? ("SCHEDULED" as import("@/app/lib/type/enums").MaintenanceStatus),
        description: data.description ?? null,
        documentUrl: data.documentUrl ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const previous = vehicle
        ? patchCachedVehicles(queryClient, vehicleId, {
            maintenanceRecords: [...vehicle.maintenanceRecords, optimisticRecord],
          })
        : [];

      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedVehicles(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successAdd);
      settleSuccess();
    },
  });

  const reportIssueMutation = useMutation({
    mutationFn: ({
      vehicleId,
      data,
    }: {
      vehicleId: string;
      data: Parameters<typeof createVehicleIssue>[1];
    }) => createVehicleIssue(vehicleId, data),
    onMutate: async ({ vehicleId, data }) => {
      await queryClient.cancelQueries({ queryKey: vehicleKeys.all });

      const vehicle = findCachedVehicle(queryClient, vehicleId);
      const optimisticIssue = {
        id: `temp-${Date.now()}`,
        title: data.title,
        description: data.description ?? null,
        status: "OPEN" as import("@/app/lib/type/enums").IssueStatus,
        priority: data.priority,
        type: data.type,
        vehicleId,
        driverId: data.driverId ?? null,
        companyId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const previous = vehicle
        ? patchCachedVehicles(queryClient, vehicleId, {
            issues: [...vehicle.issues, optimisticIssue],
          })
        : [];

      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedVehicles(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successAdd);
      settleSuccess();
    },
  });

  return {
    createVehicle: createMutation,
    updateVehicle: updateMutation,
    deleteVehicle: deleteMutation,
    updateVehicleStatus: statusMutation,
    assignDriver: assignDriverMutation,
    unassignDriver: unassignDriverMutation,
    uploadDocument: uploadDocumentMutation,
    addFuelLog: addFuelLogMutation,
    addMaintenanceRecord: addMaintenanceRecordMutation,
    reportIssue: reportIssueMutation,
  };
}
