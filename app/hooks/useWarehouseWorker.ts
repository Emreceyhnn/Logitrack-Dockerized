import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { warehouseWorkerKeys } from "@/app/lib/query-keys/warehouseWorker.keys";
import {
  logWarehouseMovement,
  adjustWarehouseStock,
  advanceWarehouseTask,
  requestRestock,
  reportWarehouseIssue,
} from "@/app/lib/controllers/warehouseWorker";
import type { WarehouseWorkerDashboard } from "@/app/lib/type/warehouseWorker";

async function fetchWarehouseWorkerDashboard(
  warehouseId?: string
): Promise<WarehouseWorkerDashboard> {
  const qs = warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : "";
  const res = await fetch(`/api/warehouse-worker/dashboard${qs}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`[useWarehouseWorker] fetch failed: ${res.status}`);
  }

  return res.json();
}

export function useWarehouseWorker(warehouseId?: string) {
  return useQuery<WarehouseWorkerDashboard>({
    queryKey: warehouseWorkerKeys.dashboard(warehouseId),
    queryFn: () => fetchWarehouseWorkerDashboard(warehouseId),
    staleTime: 1000 * 30,
    placeholderData: (previousData) => previousData,
  });
}

function patchCachedDashboards(
  queryClient: ReturnType<typeof useQueryClient>,
  patch: (data: WarehouseWorkerDashboard) => WarehouseWorkerDashboard
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  queryClient
    .getQueryCache()
    .findAll({ queryKey: warehouseWorkerKeys.all })
    .forEach((query) => {
      const data = query.state.data as WarehouseWorkerDashboard | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });
      queryClient.setQueryData(query.queryKey, patch(data));
    });

  return previous;
}

function rollbackCachedDashboards(
  queryClient: ReturnType<typeof useQueryClient>,
  previous: Array<{ queryKey: readonly unknown[]; data: unknown }>
) {
  previous.forEach(({ queryKey, data }) => {
    queryClient.setQueryData(queryKey, data);
  });
}

export function useWarehouseWorkerMutations() {
  const queryClient = useQueryClient();

  // onMutate already patches the cache optimistically, so on success we only
  // mark the dashboard query stale (refetchType: "none") instead of forcing
  // an immediate refetch — that would flash a loading state right on top of
  // the optimistic update. On error we force a real refetch of active
  // queries to resync with the server after rollback.
  const settleSuccess = () =>
    queryClient.invalidateQueries({ queryKey: warehouseWorkerKeys.all, refetchType: "none" });
  const settleError = () =>
    queryClient.invalidateQueries({ queryKey: warehouseWorkerKeys.all, refetchType: "active" });

  const logMovementMutation = useMutation({
    mutationFn: ({
      warehouseId,
      sku,
      quantity,
      kind,
      zone,
    }: {
      warehouseId: string;
      sku: string;
      quantity: number;
      kind: "PICK" | "PACK" | "STOCK_IN" | "PUTAWAY";
      zone?: string;
    }) => logWarehouseMovement(warehouseId, sku, quantity, kind, zone),
    onMutate: async ({ sku, quantity, kind }) => {
      await queryClient.cancelQueries({ queryKey: warehouseWorkerKeys.all });
      const previous = patchCachedDashboards(queryClient, (data) => {
        const isInbound = kind === "STOCK_IN" || kind === "PUTAWAY";
        return {
          ...data,
          kpis: {
            ...data.kpis,
            picks: kind === "PICK" ? data.kpis.picks + quantity : data.kpis.picks,
            packs: kind === "PACK" ? data.kpis.packs + quantity : data.kpis.packs,
          },
          catalog: data.catalog.map((item) =>
            item.sku === sku
              ? {
                  ...item,
                  quantity:
                    kind === "PICK"
                      ? Math.max(0, item.quantity - quantity)
                      : isInbound
                        ? item.quantity + quantity
                        : item.quantity,
                  available:
                    kind === "PICK"
                      ? Math.max(0, item.available - quantity)
                      : isInbound
                        ? item.available + quantity
                        : item.available,
                }
              : item
          ),
        };
      });
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) rollbackCachedDashboards(queryClient, context.previous);
      settleError();
    },
    onSuccess: () => settleSuccess(),
  });

  const adjustStockMutation = useMutation({
    mutationFn: ({
      warehouseId,
      sku,
      counted,
      reason,
      expected,
      zone,
    }: {
      warehouseId: string;
      sku: string;
      counted: number;
      reason: string;
      expected?: number | undefined;
      zone?: string | undefined;
    }) => adjustWarehouseStock(warehouseId, sku, counted, reason, expected, zone),
    onMutate: async ({ sku, counted }) => {
      await queryClient.cancelQueries({ queryKey: warehouseWorkerKeys.all });
      const previous = patchCachedDashboards(queryClient, (data) => ({
        ...data,
        catalog: data.catalog.map((item) =>
          item.sku === sku ? { ...item, quantity: counted } : item
        ),
      }));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) rollbackCachedDashboards(queryClient, context.previous);
      settleError();
    },
    onSuccess: () => settleSuccess(),
  });

  const advanceTaskMutation = useMutation({
    mutationFn: ({ taskId, delta }: { taskId: string; delta?: number | undefined }) =>
      advanceWarehouseTask(taskId, delta),
    onMutate: async ({ taskId, delta }) => {
      await queryClient.cancelQueries({ queryKey: warehouseWorkerKeys.all });
      const previous = patchCachedDashboards(queryClient, (data) => ({
        ...data,
        tasks: data.tasks.map((task) => {
          if (task.id !== taskId) return task;
          const step = delta && delta > 0 ? delta : Math.max(1, Math.ceil(task.total / 5));
          const nextDone = Math.min(task.total, task.done + step);
          return { ...task, done: nextDone, complete: nextDone >= task.total };
        }),
      }));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) rollbackCachedDashboards(queryClient, context.previous);
      settleError();
    },
    onSuccess: () => settleSuccess(),
  });

  const requestRestockMutation = useMutation({
    mutationFn: ({
      warehouseId,
      zone,
      sku,
      quantity,
    }: {
      warehouseId: string;
      zone: string;
      sku?: string | undefined;
      quantity?: number | undefined;
    }) => requestRestock(warehouseId, zone, sku, quantity),
    onError: () => settleError(),
    onSuccess: () => settleSuccess(),
  });

  const reportIssueMutation = useMutation({
    mutationFn: ({
      warehouseId,
      title,
      description,
      zone,
    }: {
      warehouseId: string;
      title: string;
      description?: string;
      zone?: string;
    }) => reportWarehouseIssue(warehouseId, title, description, zone),
    onError: () => settleError(),
    onSuccess: () => settleSuccess(),
  });

  return {
    logMovement: logMovementMutation,
    adjustStock: adjustStockMutation,
    advanceTask: advanceTaskMutation,
    requestRestock: requestRestockMutation,
    reportIssue: reportIssueMutation,
  };
}
