"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  getTrailerById,
  createTrailer,
  updateTrailer,
  deleteTrailer,
  assignTrailerToVehicle,
} from "@/app/lib/controllers/trailer";
import { TrailerFilters } from "@/app/lib/type/trailer";
import type { Trailer } from "@/app/lib/type/enums";
import { trailerKeys } from "@/app/lib/query-keys/trailer.keys";
import { vehicleKeys } from "@/app/lib/query-keys/vehicle.keys";
import { toast } from "sonner";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { logger } from "@/app/lib/logger";


async function fetchTrailers(filters: TrailerFilters): Promise<{
  trailers: import("@/app/lib/type/trailer").TrailerWithRelations[];
  kpis: {
    total: number;
    available: number;
    inUse: number;
    maintenance: number;
    issues: number;
  };
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.search) params.set("search", filters.search);
  if (filters.status?.length) filters.status.forEach((s) => params.append("status", s));
  if (filters.type?.length) filters.type.forEach((t) => params.append("type", t));
  if (filters.isColdChain !== undefined) params.set("isColdChain", String(filters.isColdChain));

  const res = await fetch(`/api/trailers?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`[useTrailers] fetch failed: ${res.status}`);
  }

  return res.json();
}

export function useTrailers(filters: TrailerFilters = {}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: trailerKeys.list(filters),
    queryFn: () => fetchTrailers(filters),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    const total = query.data?.meta?.total;
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    if (!total) return;
    const totalPages = Math.ceil(total / limit);
    const pagesToPrefetch = Math.max(1, Math.ceil(30 / limit));
    for (let i = 1; i <= pagesToPrefetch; i++) {
      const nextPage = page + i;
      if (nextPage > totalPages) break;
      const nextFilters = { ...filters, page: nextPage };
      queryClient.prefetchQuery({
        queryKey: trailerKeys.list(nextFilters),
        queryFn: () => fetchTrailers(nextFilters),
        staleTime: 1000 * 60 * 5,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, query.data, filters.page, filters.limit]);

  return query;
}

export function useTrailer(id: string) {
  return useQuery({
    queryKey: trailerKeys.detail(id),
    queryFn: () => getTrailerById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

function patchCachedTrailers(
  queryClient: ReturnType<typeof useQueryClient>,
  trailerId: string,
  patch: Partial<import("@/app/lib/type/trailer").TrailerWithRelations>
) {
  type TrailerWithRelations = import("@/app/lib/type/trailer").TrailerWithRelations;
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  const patchOne = (trailer: TrailerWithRelations) =>
    trailer.id === trailerId ? { ...trailer, ...patch } : trailer;

  queryClient
    .getQueryCache()
    .findAll({ queryKey: trailerKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | { trailers: TrailerWithRelations[] }
        | TrailerWithRelations
        | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });

      if (Array.isArray((data as { trailers: TrailerWithRelations[] }).trailers)) {
        const withTrailers = data as { trailers: TrailerWithRelations[] };
        queryClient.setQueryData(query.queryKey, {
          ...withTrailers,
          trailers: withTrailers.trailers.map(patchOne),
        });
      } else if ((data as TrailerWithRelations).id === trailerId) {
        queryClient.setQueryData(query.queryKey, patchOne(data as TrailerWithRelations));
      }
    });

  return previous;
}

function rollbackCachedTrailers(
  queryClient: ReturnType<typeof useQueryClient>,
  previous: Array<{ queryKey: readonly unknown[]; data: unknown }>
) {
  previous.forEach(({ queryKey, data }) => {
    queryClient.setQueryData(queryKey, data);
  });
}

function removeCachedTrailer(
  queryClient: ReturnType<typeof useQueryClient>,
  trailerId: string
) {
  type TrailerWithRelations = import("@/app/lib/type/trailer").TrailerWithRelations;
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  queryClient
    .getQueryCache()
    .findAll({ queryKey: trailerKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | { trailers: TrailerWithRelations[]; kpis: unknown; meta: { total: number } }
        | undefined;
      if (!data) return;
      if (!Array.isArray(data.trailers)) return;

      previous.push({ queryKey: query.queryKey, data });

      queryClient.setQueryData(query.queryKey, {
        ...data,
        trailers: data.trailers.filter((t) => t.id !== trailerId),
        meta: { ...data.meta, total: Math.max(0, data.meta.total - 1) },
      });
    });

  return previous;
}

function insertCachedTrailer(
  queryClient: ReturnType<typeof useQueryClient>,
  trailer: import("@/app/lib/type/trailer").TrailerWithRelations
) {
  type TrailerWithRelations = import("@/app/lib/type/trailer").TrailerWithRelations;
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  queryClient
    .getQueryCache()
    .findAll({ queryKey: trailerKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | { trailers: TrailerWithRelations[]; kpis: unknown; meta: { total: number } }
        | undefined;
      if (!data) return;
      if (!Array.isArray(data.trailers)) return;

      previous.push({ queryKey: query.queryKey, data });

      queryClient.setQueryData(query.queryKey, {
        ...data,
        trailers: [trailer, ...data.trailers],
        meta: { ...data.meta, total: data.meta.total + 1 },
      });
    });

  return previous;
}

function buildOptimisticTrailer(
  tempId: string,
  data: Partial<Trailer>
): import("@/app/lib/type/trailer").TrailerWithRelations {
  return {
    id: tempId,
    fleetNo: data.fleetNo || "",
    plate: data.plate || "",
    type: data.type!,
    capacityVolumeM3: data.capacityVolumeM3 ?? 0,
    maxLoadKg: data.maxLoadKg ?? 0,
    isColdChain: data.isColdChain ?? false,
    status: data.status || ("AVAILABLE" as Trailer["status"]),
    currentVehicleId: null,
    currentVehicle: null,
    assignments: [],
  };
}

function findCachedVehicleSummary(
  queryClient: ReturnType<typeof useQueryClient>,
  vehicleId: string
): { id: string; plate: string; fleetNo: string } | null {
  for (const query of queryClient.getQueryCache().findAll({ queryKey: vehicleKeys.all })) {
    const data = query.state.data as
      | import("@/app/lib/type/vehicle").VehicleWithRelations[]
      | { vehicles: import("@/app/lib/type/vehicle").VehicleWithRelations[] }
      | undefined;
    if (!data) continue;
    const list = Array.isArray(data) ? data : data.vehicles;
    const found = list?.find((v) => v.id === vehicleId);
    if (found) return { id: found.id, plate: found.plate, fleetNo: found.fleetNo };
  }
  return null;
}

export function useTrailerMutations() {
  const dict = useDictionary();
  const queryClient = useQueryClient();

  const handleSuccess = (message: string) => {
    toast.success(message);
  };

  const handleError = (message: string, error: unknown) => {
    logger.error(message, error);
    toast.error(error instanceof Error ? error.message : message);
  };

  const settleSuccess = () =>
    queryClient.invalidateQueries({ queryKey: trailerKeys.all, refetchType: "none" });
  const settleError = () =>
    queryClient.invalidateQueries({ queryKey: trailerKeys.all, refetchType: "active" });
  const settleSuccessWithVehicles = () => {
    queryClient.invalidateQueries({ queryKey: trailerKeys.all, refetchType: "none" });
    queryClient.invalidateQueries({ queryKey: vehicleKeys.all, refetchType: "none" });
  };
  const settleErrorWithVehicles = () => {
    queryClient.invalidateQueries({ queryKey: trailerKeys.all, refetchType: "active" });
    queryClient.invalidateQueries({ queryKey: vehicleKeys.all, refetchType: "active" });
  };

  const createMut = useMutation({
    mutationFn: (data: Partial<Trailer>) => createTrailer(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: trailerKeys.all });
      const tempId = `temp-${Date.now()}`;
      const optimisticTrailer = buildOptimisticTrailer(tempId, data);
      const previous = insertCachedTrailer(queryClient, optimisticTrailer);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedTrailers(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successAdd);
      settleSuccess();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Trailer> }) => updateTrailer(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: trailerKeys.all });
      const previous = patchCachedTrailers(queryClient, id, data as Partial<import("@/app/lib/type/trailer").TrailerWithRelations>);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedTrailers(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successUpdate);
      settleSuccess();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTrailer(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: trailerKeys.all });
      const previous = removeCachedTrailer(queryClient, id);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedTrailers(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successDelete);
      settleSuccess();
    },
  });

  const assignMut = useMutation({
    mutationFn: ({ trailerId, vehicleId }: { trailerId: string; vehicleId: string | null }) =>
      assignTrailerToVehicle(trailerId, vehicleId),
    onMutate: async ({ trailerId, vehicleId }) => {
      await queryClient.cancelQueries({ queryKey: trailerKeys.all });
      const currentVehicle = vehicleId ? findCachedVehicleSummary(queryClient, vehicleId) : null;
      const previous = patchCachedTrailers(queryClient, trailerId, {
        currentVehicle,
        currentVehicleId: vehicleId,
      });
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedTrailers(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleErrorWithVehicles();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successUpdate);
      settleSuccessWithVehicles();
    },
  });

  return {
    createTrailer: createMut,
    updateTrailer: updateMut,
    deleteTrailer: deleteMut,
    assignTrailer: assignMut,
  };
}
