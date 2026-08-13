"use client";

import { useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  getWarehouseById,
  getWarehouseStats,
  getRecentStockMovements,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  assignManagerToWarehouse,
  getWarehouseZones,
  createWarehouseZone,
  updateWarehouseZone,
  deleteWarehouseZone,
} from "@/app/lib/controllers/warehouse";
import type { Warehouse } from "@/app/lib/type/enums";
import { toast } from "sonner";

import { warehouseKeys } from "@/app/lib/query-keys/warehouse.keys";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { logger } from "@/app/lib/logger";

import {
  WarehouseWithRelations,
  WarehouseStats,
  InventoryMovementWithRelations,
} from "@/app/lib/type/warehouse";

async function fetchWarehouses(): Promise<WarehouseWithRelations[]> {
  const params = new URLSearchParams();
  params.set("_t", Date.now().toString());

  const res = await fetch(`/api/warehouses?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`[useWarehouses] fetch failed: ${res.status}`);
  }

  return res.json();
}

export function useWarehouses() {
  return useQuery({
    queryKey: warehouseKeys.lists(),
    queryFn: () => fetchWarehouses(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useWarehouse(id: string | null) {
  return useQuery({
    queryKey: warehouseKeys.details(id || ""),
    queryFn: () => (id ? getWarehouseById(id) : null),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useWarehouseStats() {
  return useQuery({
    queryKey: warehouseKeys.stats(),
    queryFn: () => getWarehouseStats(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useRecentStockMovements() {
  return useQuery({
    queryKey: warehouseKeys.movements(),
    queryFn: () => getRecentStockMovements(),
    staleTime: 1000 * 60 * 5,
  });
}

async function fetchWarehouseDashboard(
  page: number,
  pageSize: number
): Promise<{
  warehouses: WarehouseWithRelations[];
  totalCount: number;
  stats: WarehouseStats;
  statsTrends?: {
    totalWarehouses?: { value: number; isUp: boolean };
  };
  recentMovements: InventoryMovementWithRelations[];
}> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  params.set("_t", Date.now().toString());

  const res = await fetch(`/api/warehouses/dashboard?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`[useWarehousesWithDashboard] fetch failed: ${res.status}`);
  }

  return res.json();
}

export function useWarehousesWithDashboard(
  page: number = 1,
  pageSize: number = 10
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: warehouseKeys.dashboardWithFilters(page, pageSize),
    queryFn: () => fetchWarehouseDashboard(page, pageSize),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    const totalCount = query.data?.totalCount;
    if (!totalCount) return;
    const totalPages = Math.ceil(totalCount / pageSize);
    const pagesToPrefetch = Math.max(1, Math.ceil(30 / pageSize));
    for (let i = 1; i <= pagesToPrefetch; i++) {
      const nextPage = page + i;
      if (nextPage > totalPages) break;
      queryClient.prefetchQuery({
        queryKey: warehouseKeys.dashboardWithFilters(nextPage, pageSize),
        queryFn: () => fetchWarehouseDashboard(nextPage, pageSize),
        staleTime: 1000 * 60 * 5,
      });
    }

  }, [queryClient, query.data, page, pageSize]);

  return query;
}

function patchCachedWarehouses(
  queryClient: ReturnType<typeof useQueryClient>,
  warehouseId: string,
  patch: Partial<WarehouseWithRelations>
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  const patchOne = (warehouse: WarehouseWithRelations) =>
    warehouse.id === warehouseId ? { ...warehouse, ...patch } : warehouse;

  queryClient
    .getQueryCache()
    .findAll({ queryKey: warehouseKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | WarehouseWithRelations[]
        | { warehouses: WarehouseWithRelations[] }
        | WarehouseWithRelations
        | null
        | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });

      if (Array.isArray(data)) {
        queryClient.setQueryData(query.queryKey, data.map(patchOne));
      } else if (Array.isArray((data as { warehouses: WarehouseWithRelations[] }).warehouses)) {
        const withWarehouses = data as { warehouses: WarehouseWithRelations[] };
        queryClient.setQueryData(query.queryKey, {
          ...withWarehouses,
          warehouses: withWarehouses.warehouses.map(patchOne),
        });
      } else if ((data as WarehouseWithRelations).id === warehouseId) {
        queryClient.setQueryData(query.queryKey, patchOne(data as WarehouseWithRelations));
      }
    });

  return previous;
}

function rollbackCachedWarehouses(
  queryClient: ReturnType<typeof useQueryClient>,
  previous: Array<{ queryKey: readonly unknown[]; data: unknown }>
) {
  previous.forEach(({ queryKey, data }) => {
    queryClient.setQueryData(queryKey, data);
  });
}

function removeCachedWarehouse(
  queryClient: ReturnType<typeof useQueryClient>,
  warehouseId: string
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  queryClient
    .getQueryCache()
    .findAll({ queryKey: warehouseKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | WarehouseWithRelations[]
        | { warehouses: WarehouseWithRelations[]; totalCount: number }
        | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });

      if (Array.isArray(data)) {
        queryClient.setQueryData(query.queryKey, data.filter((w) => w.id !== warehouseId));
      } else if (Array.isArray((data as { warehouses: WarehouseWithRelations[] }).warehouses)) {
        const withWarehouses = data as { warehouses: WarehouseWithRelations[]; totalCount: number };
        queryClient.setQueryData(query.queryKey, {
          ...withWarehouses,
          warehouses: withWarehouses.warehouses.filter((w) => w.id !== warehouseId),
          totalCount: Math.max(0, withWarehouses.totalCount - 1),
        });
      }
    });

  return previous;
}

function insertCachedWarehouse(
  queryClient: ReturnType<typeof useQueryClient>,
  warehouse: WarehouseWithRelations
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  queryClient
    .getQueryCache()
    .findAll({ queryKey: warehouseKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | WarehouseWithRelations[]
        | { warehouses: WarehouseWithRelations[]; totalCount: number }
        | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });

      if (Array.isArray(data)) {
        queryClient.setQueryData(query.queryKey, [warehouse, ...data]);
      } else if (Array.isArray((data as { warehouses: WarehouseWithRelations[] }).warehouses)) {
        const withWarehouses = data as { warehouses: WarehouseWithRelations[]; totalCount: number };
        queryClient.setQueryData(query.queryKey, {
          ...withWarehouses,
          warehouses: [warehouse, ...withWarehouses.warehouses],
          totalCount: withWarehouses.totalCount + 1,
        });
      }
    });

  return previous;
}

function buildOptimisticWarehouse(
  tempId: string,
  data: {
    name: string;
    code: string;
    type: import("@prisma/client").WarehouseType;
    address: string;
    city: string;
    country: string;
    lat?: number | undefined;
    lng?: number | undefined;
    managerId?: string | null | undefined;
    capacityPallets: number;
    capacityVolumeM3: number;
    operatingHours?: string | undefined;
    timezone?: string | undefined;
    specifications?: string[] | undefined;
  }
): WarehouseWithRelations {
  return {
    id: tempId,
    code: data.code,
    name: data.name,
    type: data.type,
    address: data.address,
    city: data.city,
    country: data.country,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    capacityPallets: data.capacityPallets,
    capacityVolumeM3: data.capacityVolumeM3,
    operatingHours: data.operatingHours ?? null,
    timezone: data.timezone ?? "UTC",
    specifications: data.specifications ?? [],
    managerId: data.managerId ?? null,
    manager: null,
    inventory: [],
    drivers: [],
  };
}

// Warehouse CRUD/manager mutations affect list, detail, dashboard, and stats
// (capacity/count aggregates) but never the "recent stock movements" feed,
// which is driven by inventory activity, not warehouse records themselves.
//
// refetchType: "none" — onMutate already patched the cache optimistically, so
// we only need to mark these queries stale for the NEXT natural refetch
// (tab refocus, remount, manual retry). Using the default ("active") would
// force every mounted dashboard/list query to refetch immediately, which
// flashes a loading state right on top of the optimistic update we just
// applied — defeating the point of doing it optimistically.
const invalidateWarehouseCrudQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  options?: { refetchType?: "active" | "none" }
) => {
  const refetchType = options?.refetchType ?? "none";
  queryClient.invalidateQueries({ queryKey: warehouseKeys.lists(), refetchType });
  queryClient.invalidateQueries({ queryKey: warehouseKeys.detailsAll(), refetchType });
  queryClient.invalidateQueries({ queryKey: warehouseKeys.dashboard(), refetchType });
  queryClient.invalidateQueries({ queryKey: warehouseKeys.stats(), refetchType });
};

export function useWarehouseMutations() {
  const queryClient = useQueryClient();
  const dict = useDictionary();

  const handleSuccess = (message: string) => {
    toast.success(message);
  };

  const handleError = (message: string, error: unknown) => {
    logger.error(message, error);
    toast.error(error instanceof Error ? error.message : message);
  };

  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      code: string;
      type: import("@prisma/client").WarehouseType;
      address: string;
      city: string;
      country: string;
      lat?: number | undefined;
      lng?: number | undefined;
      // Nullable: a warehouse may legitimately be created with no manager, and
      // the "unassigned" option must not be forced through as an empty string.
      managerId?: string | null | undefined;
      capacityPallets: number;
      capacityVolumeM3: number;
      operatingHours?: string | undefined;
      timezone?: string | undefined;
      specifications?: string[] | undefined;
    }) =>
      createWarehouse(
        data.name,
        data.code,
        data.type,
        data.address,
        data.city,
        data.country,
        data.lat,
        data.lng,
        data.managerId,
        data.capacityPallets,
        data.capacityVolumeM3,
        data.operatingHours,
        data.timezone,
        data.specifications
      ),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: warehouseKeys.all });
      const tempId = `temp-${Date.now()}`;
      const optimisticWarehouse = buildOptimisticWarehouse(tempId, data);
      const previous = insertCachedWarehouse(queryClient, optimisticWarehouse);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedWarehouses(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      invalidateWarehouseCrudQueries(queryClient, { refetchType: "active" });
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successAdd);
      invalidateWarehouseCrudQueries(queryClient);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Warehouse> }) =>
      updateWarehouse(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: warehouseKeys.all });
      const previous = patchCachedWarehouses(queryClient, id, data as Partial<WarehouseWithRelations>);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedWarehouses(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      invalidateWarehouseCrudQueries(queryClient, { refetchType: "active" });
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successUpdate);
      invalidateWarehouseCrudQueries(queryClient);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWarehouse(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: warehouseKeys.all });
      const previous = removeCachedWarehouse(queryClient, id);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedWarehouses(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      invalidateWarehouseCrudQueries(queryClient, { refetchType: "active" });
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successDelete);
      invalidateWarehouseCrudQueries(queryClient);
    },
  });

  const assignManagerMutation = useMutation({
    mutationFn: ({ warehouseId, userId }: { warehouseId: string; userId: string }) => assignManagerToWarehouse(warehouseId, userId),
    onMutate: async ({ warehouseId, userId }) => {
      await queryClient.cancelQueries({ queryKey: warehouseKeys.all });
      const previous = patchCachedWarehouses(queryClient, warehouseId, { managerId: userId });
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedWarehouses(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      invalidateWarehouseCrudQueries(queryClient, { refetchType: "active" });
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successUpdate);
      invalidateWarehouseCrudQueries(queryClient);
    },
  });

  return {
    createWarehouse: createMutation,
    updateWarehouse: updateMutation,
    deleteWarehouse: deleteMutation,
    assignManager: assignManagerMutation,
  };
}

export function useWarehouseZones(warehouseId: string | null | undefined) {
  return useQuery({
    queryKey: warehouseKeys.zones(warehouseId || ""),
    queryFn: () => getWarehouseZones(warehouseId as string),
    enabled: !!warehouseId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useWarehouseZoneMutations(warehouseId: string) {
  const queryClient = useQueryClient();
  const dict = useDictionary();

  const handleSuccess = (message: string) => toast.success(message);
  const handleError = (message: string, error: unknown) => {
    logger.error(message, error);
    toast.error(error instanceof Error ? error.message : message);
  };

  const settle = () => {
    queryClient.invalidateQueries({ queryKey: warehouseKeys.zones(warehouseId) });
    // Zone edits change per-zone capacity/occupancy, which the warehouse
    // worker dashboard and warehouse detail views also read.
    queryClient.invalidateQueries({ queryKey: warehouseKeys.detailsAll() });
  };

  const createZoneMutation = useMutation({
    mutationFn: (data: { code: string; name?: string; capacityPallets?: number }) =>
      createWarehouseZone(warehouseId, data.code, data.name, data.capacityPallets),
    onError: (error: Error) => handleError(dict.toasts.errorGeneric, error),
    onSuccess: () => {
      handleSuccess(dict.toasts.successAdd);
      settle();
    },
  });

  const updateZoneMutation = useMutation({
    mutationFn: ({
      zoneId,
      data,
    }: {
      zoneId: string;
      data: { name?: string; capacityPallets?: number };
    }) => updateWarehouseZone(zoneId, data),
    onError: (error: Error) => handleError(dict.toasts.errorGeneric, error),
    onSuccess: () => {
      handleSuccess(dict.toasts.successUpdate);
      settle();
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (zoneId: string) => deleteWarehouseZone(zoneId),
    onError: (error: Error) => handleError(dict.toasts.errorGeneric, error),
    onSuccess: () => {
      handleSuccess(dict.toasts.successDelete);
      settle();
    },
  });

  return {
    createZone: createZoneMutation,
    updateZone: updateZoneMutation,
    deleteZone: deleteZoneMutation,
  };
}
