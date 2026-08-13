"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { exclude } from "@/app/lib/utils/exclude";
import {
  getShipmentById,
  getShipmentStats,
  getShipmentVolumeHistory,
  getShipmentStatusDistribution,
  createShipment,
  updateShipment,
  deleteShipment,
  updateShipmentStatus,
} from "@/app/lib/controllers/shipments";
import { toast } from "sonner";
import {
  ShipmentWithRelations,
  ShipmentStats,
  ShipmentVolumeData,
  ShipmentStatusData,
} from "@/app/lib/type/shipment";
import { ShipmentStatus, ShipmentPriority, ShipmentServiceType } from "@/app/lib/type/enums";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { shipmentKeys } from "@/app/lib/query-keys/shipment.keys";
import type { InventoryShipmentItem } from "@/app/lib/type/add-shipment";
import { logger } from "@/app/lib/logger";


async function fetchShipments(filters?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: ShipmentStatus;
  unassigned?: boolean;
}): Promise<ShipmentWithRelations[] | { shipments: ShipmentWithRelations[]; totalCount: number }> {
  const params = new URLSearchParams();
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.search) params.set("search", filters.search);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.unassigned !== undefined) params.set("unassigned", String(filters.unassigned));
  params.set("_t", Date.now().toString());

  const res = await fetch(`/api/shipments?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`[useShipments] fetch failed: ${res.status}`);
  }

  return res.json();
}

export function useShipments(filters?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: ShipmentStatus;
  unassigned?: boolean;
}) {
  return useQuery({
    queryKey: shipmentKeys.lists(),
    queryFn: () => fetchShipments(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useShipmentDetails(id: string | null) {
  return useQuery({
    queryKey: shipmentKeys.details(id || ""),
    queryFn: async () => {
      if (!id) return null;
      const result = await getShipmentById(id);
      return result as ShipmentWithRelations | null;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useShipmentStats() {
  return useQuery({
    queryKey: shipmentKeys.stats(),
    queryFn: async () => {
      const result = await getShipmentStats();
      return result as ShipmentStats;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useShipmentVolumeHistory() {
  return useQuery({
    queryKey: shipmentKeys.history(),
    queryFn: async () => {
      const result: ShipmentVolumeData[] = await getShipmentVolumeHistory();
      return result;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useShipmentStatusDistribution() {
  return useQuery({
    queryKey: shipmentKeys.distribution(),
    queryFn: async () => {
      const result: ShipmentStatusData[] = await getShipmentStatusDistribution();
      return result;
    },
    staleTime: 1000 * 60 * 5,
  });
}

async function fetchShipmentDashboard(
  page: number,
  pageSize: number,
  status?: ShipmentStatus,
  search?: string
): Promise<{
  shipments: ShipmentWithRelations[];
  totalCount: number;
  stats: ShipmentStats;
  statsTrends?: {
    total?: { value: number; isUp: boolean };
    active?: { value: number; isUp: boolean };
    delayed?: { value: number; isUp: boolean };
    inTransit?: { value: number; isUp: boolean };
  };
  volumeHistory: ShipmentVolumeData[];
  statusDistribution: ShipmentStatusData[];
}> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (status && (status as string) !== "ALL") params.set("status", status);
  if (search) params.set("search", search);
  params.set("_t", Date.now().toString());

  const res = await fetch(`/api/shipments/dashboard?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`[useShipmentsWithDashboard] fetch failed: ${res.status}`);
  }

  return res.json();
}

export function useShipmentsWithDashboard(
  page: number = 1,
  pageSize: number = 10,
  status?: ShipmentStatus,
  search?: string
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: shipmentKeys.dashboardWithFilters(page, pageSize, status, search),
    queryFn: () => fetchShipmentDashboard(page, pageSize, status, search),
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
        queryKey: shipmentKeys.dashboardWithFilters(nextPage, pageSize, status, search),
        queryFn: () => fetchShipmentDashboard(nextPage, pageSize, status, search),
        staleTime: 1000 * 60 * 5,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, query.data, page, pageSize]);

  return query;
}


function patchCachedShipments(
  queryClient: ReturnType<typeof useQueryClient>,
  shipmentId: string,
  patch: Partial<ShipmentWithRelations>
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  const patchOne = (shipment: ShipmentWithRelations) =>
    shipment.id === shipmentId ? { ...shipment, ...patch } : shipment;

  queryClient
    .getQueryCache()
    .findAll({ queryKey: shipmentKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | ShipmentWithRelations[]
        | { shipments: ShipmentWithRelations[]; totalCount: number }
        | ShipmentWithRelations
        | null
        | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });

      if (Array.isArray(data)) {
        queryClient.setQueryData(query.queryKey, data.map(patchOne));
      } else if (Array.isArray((data as { shipments: ShipmentWithRelations[] }).shipments)) {
        const withShipments = data as { shipments: ShipmentWithRelations[] };
        queryClient.setQueryData(query.queryKey, {
          ...withShipments,
          shipments: withShipments.shipments.map(patchOne),
        });
      } else if ((data as ShipmentWithRelations).id === shipmentId) {
        queryClient.setQueryData(query.queryKey, patchOne(data as ShipmentWithRelations));
      }
    });

  return previous;
}

function rollbackCachedShipments(
  queryClient: ReturnType<typeof useQueryClient>,
  previous: Array<{ queryKey: readonly unknown[]; data: unknown }>
) {
  previous.forEach(({ queryKey, data }) => {
    queryClient.setQueryData(queryKey, data);
  });
}

function removeCachedShipment(
  queryClient: ReturnType<typeof useQueryClient>,
  shipmentId: string
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  queryClient
    .getQueryCache()
    .findAll({ queryKey: shipmentKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | ShipmentWithRelations[]
        | { shipments: ShipmentWithRelations[]; totalCount: number }
        | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });

      if (Array.isArray(data)) {
        queryClient.setQueryData(query.queryKey, data.filter((s) => s.id !== shipmentId));
      } else if (Array.isArray((data as { shipments: ShipmentWithRelations[] }).shipments)) {
        const withShipments = data as { shipments: ShipmentWithRelations[]; totalCount: number };
        queryClient.setQueryData(query.queryKey, {
          ...withShipments,
          shipments: withShipments.shipments.filter((s) => s.id !== shipmentId),
          totalCount: Math.max(0, withShipments.totalCount - 1),
        });
      }
    });

  return previous;
}

function insertCachedShipment(
  queryClient: ReturnType<typeof useQueryClient>,
  shipment: ShipmentWithRelations
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  queryClient
    .getQueryCache()
    .findAll({ queryKey: shipmentKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | ShipmentWithRelations[]
        | { shipments: ShipmentWithRelations[]; totalCount: number }
        | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });

      if (Array.isArray(data)) {
        queryClient.setQueryData(query.queryKey, [shipment, ...data]);
      } else if (Array.isArray((data as { shipments: ShipmentWithRelations[] }).shipments)) {
        const withShipments = data as { shipments: ShipmentWithRelations[]; totalCount: number };
        queryClient.setQueryData(query.queryKey, {
          ...withShipments,
          shipments: [shipment, ...withShipments.shipments],
          totalCount: withShipments.totalCount + 1,
        });
      }
    });

  return previous;
}

export function useShipmentMutations() {
  const queryClient = useQueryClient();
  const dict = useDictionary();

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
    queryClient.invalidateQueries({ queryKey: shipmentKeys.all, refetchType: "none" });
  const settleError = () =>
    queryClient.invalidateQueries({ queryKey: shipmentKeys.all, refetchType: "active" });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Partial<ShipmentWithRelations>, "originLat" | "originLng" | "destinationLat" | "destinationLng"> & { customerId: string; origin: string; destination: string; status: ShipmentStatus; originLat?: number | null | undefined; originLng?: number | null | undefined; destinationLat?: number | null | undefined; destinationLng?: number | null | undefined; inventoryItems?: InventoryShipmentItem[] }) =>
      createShipment({
        customerId: data.customerId!,
        origin: data.origin!,
        destination: data.destination!,
        status: data.status!,
        itemsCount: data.itemsCount || 0,
        weightKg: data.weightKg || 0,
        volumeM3: data.volumeM3 || 0,
        palletCount: data.palletCount || 0,
        cargoType: data.cargoType || "",
        destinationLat: data.destinationLat || undefined,
        destinationLng: data.destinationLng || undefined,
        originLat: data.originLat || undefined,
        originLng: data.originLng || undefined,
        trackingId: data.trackingId || "",
        customerLocationId: data.customerLocationId || "",
        priority: data.priority || ShipmentPriority.MEDIUM,
        type: data.type || ShipmentServiceType.STANDARD_FREIGHT,
        slaDeadline: data.slaDeadline ? new Date(data.slaDeadline) : null,
        contactEmail: data.contactEmail || "",
        billingAccount: data.billingAccount || "",
        inventoryItems: data.inventoryItems || [],
        originWarehouseId: data.originWarehouseId || undefined,
        referenceNumber: data.referenceNumber || undefined,
        trailerId: data.trailerId || undefined,
        driverId: data.driverId || undefined,
        stops: data.stops || undefined,
      }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: shipmentKeys.all });
      const tempId = `temp-${Date.now()}`;
      const optimisticShipment: ShipmentWithRelations = {
        id: tempId,
        trackingId: data.trackingId || "",
        customerId: data.customerId ?? null,
        customerLocationId: data.customerLocationId || null,
        driverId: null,
        status: data.status,
        origin: data.origin,
        originWarehouseId: data.originWarehouseId ?? null,
        originLat: data.originLat ?? null,
        originLng: data.originLng ?? null,
        destination: data.destination,
        destinationLat: data.destinationLat ?? null,
        destinationLng: data.destinationLng ?? null,
        itemsCount: data.itemsCount || 0,
        priority: data.priority ?? ShipmentPriority.MEDIUM,
        type: data.type ?? ShipmentServiceType.STANDARD_FREIGHT,
        slaDeadline: data.slaDeadline ? new Date(data.slaDeadline) : null,
        weightKg: data.weightKg ?? 0,
        volumeM3: data.volumeM3 ?? 0,
        palletCount: data.palletCount ?? 0,
        cargoType: data.cargoType || "",
        contactEmail: data.contactEmail || null,
        billingAccount: data.billingAccount || null,
        routeId: null,
        trailerId: null,
        referenceNumber: data.referenceNumber ?? null,
        customer: null,
        driver: null,
        route: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const previous = insertCachedShipment(queryClient, optimisticShipment);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedShipments(queryClient, context.previous);
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
      data: Omit<Partial<ShipmentWithRelations>, "stops"> & {
        stops?: Parameters<typeof updateShipment>[1]["stops"];
        inventoryItems?: InventoryShipmentItem[];
      };
    }) => {
      const updateData = exclude(data, [
        "company",
        "history",
        "customer",
        "driver",
        "route",
        "items",
        "companyId",
      ]) as Parameters<typeof updateShipment>[1];
      return updateShipment(id, updateData);
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: shipmentKeys.all });
      const previous = patchCachedShipments(queryClient, id, data as Partial<ShipmentWithRelations>);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedShipments(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successUpdate);
      settleSuccess();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteShipment(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: shipmentKeys.all });
      const previous = removeCachedShipment(queryClient, id);
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) rollbackCachedShipments(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successDelete);
      settleSuccess();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      location,
      description,
    }: {
      id: string;
      status: ShipmentStatus;
      location?: string;
      description?: string;
    }) => updateShipmentStatus(id, status, location, description),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: shipmentKeys.all });
      const previous = patchCachedShipments(queryClient, id, { status });
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) rollbackCachedShipments(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successUpdate);
      settleSuccess();
    },
  });

  return {
    createShipment: createMutation,
    updateShipment: updateMutation,
    deleteShipment: deleteMutation,
    updateShipmentStatus: updateStatusMutation,
  };
}
