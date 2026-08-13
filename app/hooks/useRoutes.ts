"use client";

import { useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  getRouteStats,
  getRouteEfficiencyStats,
  getActiveRoutesLocations,
  createRoute,
  updateRoute,
  deleteRoute,
  updateRouteStatus,
} from "@/app/lib/controllers/routes";
import { toast } from "sonner";

import {
  RouteWithRelations,
  RouteStats,
  RouteEfficiencyStats,
  MapRouteData,
} from "@/app/lib/type/routes";
import { RouteStatus } from "@/app/lib/type/enums";

import { routeKeys } from "@/app/lib/query-keys/route.keys";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { logger } from "@/app/lib/logger";


async function fetchRoutes(
  page: number,
  pageSize: number,
  status?: string
): Promise<{
  routes: RouteWithRelations[];
  totalCount: number;
}> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (status) params.set("status", status);

  const res = await fetch(`/api/routes?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`[useRoutes] fetch failed: ${res.status}`);
  }

  return res.json();
}

export function useRoutes(page: number, pageSize: number, status?: string) {
  return useQuery({
    queryKey: routeKeys.lists(page, pageSize, status),
    queryFn: () => fetchRoutes(page, pageSize, status),
    staleTime: 1000 * 60 * 5,
  });
}

export function useRouteStats() {
  return useQuery({
    queryKey: routeKeys.stats(),
    queryFn: async (): Promise<RouteStats | null> => {
      const res = await getRouteStats();
      return res as RouteStats | null;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useRouteEfficiency() {
  return useQuery({
    queryKey: routeKeys.efficiency(),
    queryFn: async (): Promise<RouteEfficiencyStats | null> => {
      const res = await getRouteEfficiencyStats();
      return res as RouteEfficiencyStats | null;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useRouteLocations() {
  return useQuery({
    queryKey: routeKeys.locations(),
    queryFn: async (): Promise<MapRouteData[]> => {
      const res = await getActiveRoutesLocations();
      return res as MapRouteData[];
    },
    staleTime: 1000 * 30,
  });
}

async function fetchRouteDashboard(
  page: number,
  pageSize: number,
  status?: string | string[]
) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (Array.isArray(status)) {
    status.forEach((s) => params.append("status", s));
  } else if (status) {
    params.set("status", status);
  }
  params.set("_t", Date.now().toString());

  const res = await fetch(`/api/routes/dashboard?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`[useRoutes] fetch dashboard failed: ${res.status}`);
  }

  return res.json();
}

export function useRoutesWithDashboard(
  page: number,
  pageSize: number,
  status?: string | string[]
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: routeKeys.dashboardWithFilters(page, pageSize, status),
    queryFn: () => fetchRouteDashboard(page, pageSize, status),
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
        queryKey: routeKeys.dashboardWithFilters(nextPage, pageSize, status),
        queryFn: () => fetchRouteDashboard(nextPage, pageSize, status),
        staleTime: 1000 * 60 * 5,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, query.data, page, pageSize]);

  return query;
}

function patchCachedRoutes(
  queryClient: ReturnType<typeof useQueryClient>,
  routeId: string,
  patch: Partial<RouteWithRelations>
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  const patchOne = (route: RouteWithRelations) =>
    route.id === routeId ? { ...route, ...patch } : route;

  queryClient
    .getQueryCache()
    .findAll({ queryKey: routeKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | { routes: RouteWithRelations[]; totalCount: number }
        | RouteWithRelations
        | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });

      if (Array.isArray((data as { routes: RouteWithRelations[] }).routes)) {
        const withRoutes = data as { routes: RouteWithRelations[] };
        queryClient.setQueryData(query.queryKey, {
          ...withRoutes,
          routes: withRoutes.routes.map(patchOne),
        });
      } else if ((data as RouteWithRelations).id === routeId) {
        queryClient.setQueryData(query.queryKey, patchOne(data as RouteWithRelations));
      }
    });

  return previous;
}

function rollbackCachedRoutes(
  queryClient: ReturnType<typeof useQueryClient>,
  previous: Array<{ queryKey: readonly unknown[]; data: unknown }>
) {
  previous.forEach(({ queryKey, data }) => {
    queryClient.setQueryData(queryKey, data);
  });
}

function insertCachedRoute(
  queryClient: ReturnType<typeof useQueryClient>,
  route: RouteWithRelations
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  queryClient
    .getQueryCache()
    .findAll({ queryKey: routeKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | { routes: RouteWithRelations[]; totalCount: number }
        | undefined;
      if (!data || !Array.isArray(data.routes)) return;

      previous.push({ queryKey: query.queryKey, data });

      queryClient.setQueryData(query.queryKey, {
        ...data,
        routes: [route, ...data.routes],
        totalCount: data.totalCount + 1,
      });
    });

  return previous;
}

function removeCachedRoute(
  queryClient: ReturnType<typeof useQueryClient>,
  routeId: string
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  queryClient
    .getQueryCache()
    .findAll({ queryKey: routeKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | { routes: RouteWithRelations[]; totalCount: number }
        | undefined;
      if (!data) return;
      if (!Array.isArray(data.routes)) return;

      previous.push({ queryKey: query.queryKey, data });

      queryClient.setQueryData(query.queryKey, {
        ...data,
        routes: data.routes.filter((r) => r.id !== routeId),
        totalCount: Math.max(0, data.totalCount - 1),
      });
    });

  return previous;
}

export function useRouteMutations() {
  const dict = useDictionary();
  const queryClient = useQueryClient();

  const handleSuccess = (message: string) => {
    toast.success(message);
  };

  const handleError = (message: string, error: unknown) => {
    logger.error(message, error);
    toast.error(error instanceof Error ? error.message : message);
  };

  // onMutate already patches the cache optimistically (where present), so on
  // success we only mark queries stale (refetchType: "none") instead of
  // forcing an immediate refetch of every mounted query — that would flash a
  // loading state right on top of the optimistic update. On error we force a
  // real refetch of active queries to resync with the server after rollback.
  const settleSuccess = () =>
    queryClient.invalidateQueries({ queryKey: routeKeys.all, refetchType: "none" });
  const settleError = () =>
    queryClient.invalidateQueries({ queryKey: routeKeys.all, refetchType: "active" });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof createRoute>) => createRoute(...data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: routeKeys.all });
      const [
        name,
        date,
        startTime,
        endTime,
        distanceKm,
        durationMin,
        driverId,
        vehicleId,
        ,
        stops,
        shape,
        bufferMeters,
      ] = data;
      const optimisticRoute: RouteWithRelations = {
        id: `temp-${Date.now()}`,
        name: name || null,
        status: RouteStatus.PLANNED,
        date,
        startTime: startTime ?? null,
        endTime: endTime ?? null,
        distanceKm: distanceKm ?? null,
        durationMin: durationMin ?? null,
        stops: stops ?? null,
        driverId: driverId || null,
        vehicleId: vehicleId || null,
        shape: shape ?? null,
        bufferMeters: bufferMeters ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const previous = insertCachedRoute(queryClient, optimisticRoute);
      return { previous, tempId: optimisticRoute.id };
    },
    onSuccess: (result, _vars, context) => {
      // tr-İyimser satır `temp-...` kimliğiyle eklendi; settleSuccess yalnızca sorguları
      //    bayat işaretlediği için (refetchType: "none") bu sahte kimlik ekranda kalır ve
      //    "Başlat" gibi aksiyonlar onu sunucuya gönderip 500 alır. Sunucudan dönen gerçek
      //    kaydı yerine koyarak kimliği hemen düzeltiyoruz.
      // en-The optimistic row was inserted with a `temp-...` id. settleSuccess only marks
      //    queries stale (refetchType: "none"), so that fake id stays on screen and actions
      //    like "activate" would send it to the server and fail. Swap in the real record.
      if (context?.tempId && result?.route) {
        patchCachedRoutes(
          queryClient,
          context.tempId,
          result.route as Partial<RouteWithRelations>
        );
      }
      handleSuccess(dict.toasts.successAdd);
      settleSuccess();
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedRoutes(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRoute(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: routeKeys.all });
      const previous = removeCachedRoute(queryClient, id);
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) rollbackCachedRoutes(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successDelete);
      settleSuccess();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RouteStatus }) => {
      // tr-Kayıt sunucuya işlenmeden aksiyon tetiklenirse kimlik hâlâ iyimser satırın
      //    geçici kimliği olabilir; sunucuya göndermek 500 üretir.
      // en-If the action fires before the create round-trip lands, the id can still be the
      //    optimistic row's placeholder; sending it to the server produces a 500.
      if (id.startsWith("temp-")) {
        throw new Error(dict.routes.table.notSyncedYet);
      }
      return updateRouteStatus(id, status);
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: routeKeys.all });
      const previous = patchCachedRoutes(queryClient, id, { status });
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) rollbackCachedRoutes(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successUpdate);
      settleSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof updateRoute>[1];
    }) => updateRoute(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: routeKeys.all });
      const previous = patchCachedRoutes(queryClient, id, data as Partial<RouteWithRelations>);
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) rollbackCachedRoutes(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successUpdate);
      settleSuccess();
    },
  });

  return {
    createRoute: createMutation,
    updateRoute: updateMutation,
    deleteRoute: deleteMutation,
    updateRouteStatus: updateStatusMutation,
  };
}
