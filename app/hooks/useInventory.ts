"use client";

import { useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  getInventory,
  getInventoryItemById,
  getLowStockItems,
  getInventoryMovements,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  logWarehouseFulfillment,
  adjustInventoryStock,
} from "@/app/lib/controllers/inventory";
import { addInventoryItem } from "@/app/lib/controllers/warehouse";
import type { Inventory } from "@/app/lib/type/enums";
import { toast } from "sonner";

import { inventoryKeys } from "@/app/lib/query-keys/inventory.keys";
import { warehouseKeys } from "@/app/lib/query-keys/warehouse.keys";
import { InventoryWithRelations, LowStockItem } from "@/app/lib/type/inventory";
import type { WarehouseWithRelations } from "@/app/lib/type/warehouse";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { logger } from "@/app/lib/logger";


export function useInventory(warehouseId?: string) {
  return useQuery({
    queryKey: inventoryKeys.lists(warehouseId),
    queryFn: () => getInventory(warehouseId),
    staleTime: 1000 * 60 * 5,
  });
}

async function fetchInventoryDashboard(
  page: number,
  pageSize: number,
  warehouseId?: string,
  search?: string,
  sortBy?: string,
  sortOrder?: "asc" | "desc",
  status?: string[]
): Promise<{
  items: InventoryWithRelations[];
  totalCount: number;
  stats: {
    totalItems: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalValue: number;
  };
  statsTrends?: {
    totalItems?: { value: number; isUp: boolean };
    lowStock?: { value: number; isUp: boolean };
    outOfStock?: { value: number; isUp: boolean };
  };
  lowStockItems: LowStockItem[];
}> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (warehouseId) params.set("warehouseId", warehouseId);
  if (search) params.set("search", search);
  if (sortBy) params.set("sortBy", sortBy);
  if (sortOrder) params.set("sortOrder", sortOrder);
  if (status && status.length > 0) params.set("status", status.join(","));

  // The warehouse details dialog reuses this tab inside the public Live Demo,
  // where /api/inventory/dashboard 401s. Fall back to the fixed mock endpoint,
  // which ignores the filter params (the demo dataset is not filterable).
  const isDemo =
    typeof window !== "undefined" &&
    window.location.pathname.includes("/demo");

  const response = await fetch(
    isDemo
      ? "/api/demo/inventory/dashboard"
      : `/api/inventory/dashboard?${params.toString()}`,
    {
      method: "GET",
      credentials: "include",
    }
  );
  if (!response.ok) {
    throw new Error("Failed to fetch inventory dashboard data");
  }
  return response.json();
}

export function useInventoryWithDashboard(
  page: number = 1,
  pageSize: number = 10,
  warehouseId?: string,
  search?: string,
  sortBy?: string,
  sortOrder?: "asc" | "desc",
  status?: string[]
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: inventoryKeys.dashboardWithFilters(
      page,
      pageSize,
      warehouseId,
      search,
      sortBy,
      sortOrder,
      status
    ),
    queryFn: () =>
      fetchInventoryDashboard(
        page,
        pageSize,
        warehouseId,
        search,
        sortBy,
        sortOrder,
        status
      ),
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
        queryKey: inventoryKeys.dashboardWithFilters(
          nextPage,
          pageSize,
          warehouseId,
          search,
          sortBy,
          sortOrder,
          status
        ),
        queryFn: () =>
          fetchInventoryDashboard(
            nextPage,
            pageSize,
            warehouseId,
            search,
            sortBy,
            sortOrder,
            status
          ),
        staleTime: 1000 * 60 * 5,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, query.data, page, pageSize]);

  return query;
}

export function useInventoryItem(id: string | null) {
  return useQuery({
    queryKey: inventoryKeys.details(id || ""),
    queryFn: () => (id ? getInventoryItemById(id) : null),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useLowStockItems() {
  return useQuery({
    queryKey: inventoryKeys.lowStock(),
    queryFn: () => getLowStockItems(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useInventoryMovements(
  sku: string | null,
  warehouseId: string | null
) {
  return useQuery({
    queryKey: inventoryKeys.movements(sku || "", warehouseId || ""),
    queryFn: () => getInventoryMovements(sku!, warehouseId!),
    enabled: !!sku && !!warehouseId,
    staleTime: 1000 * 60 * 5,
  });
}

function patchCachedInventory(
  queryClient: ReturnType<typeof useQueryClient>,
  itemId: string,
  patch: Partial<InventoryWithRelations>
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  const patchOne = (item: InventoryWithRelations) =>
    item.id === itemId ? { ...item, ...patch } : item;

  queryClient
    .getQueryCache()
    .findAll({ queryKey: inventoryKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | InventoryWithRelations[]
        | { items: InventoryWithRelations[] }
        | InventoryWithRelations
        | null
        | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });

      if (Array.isArray(data)) {
        queryClient.setQueryData(query.queryKey, data.map(patchOne));
      } else if (Array.isArray((data as { items: InventoryWithRelations[] }).items)) {
        const withItems = data as { items: InventoryWithRelations[] };
        queryClient.setQueryData(query.queryKey, {
          ...withItems,
          items: withItems.items.map(patchOne),
        });
      } else if ((data as InventoryWithRelations).id === itemId) {
        queryClient.setQueryData(query.queryKey, patchOne(data as InventoryWithRelations));
      }
    });

  return previous;
}

function rollbackCachedInventory(
  queryClient: ReturnType<typeof useQueryClient>,
  previous: Array<{ queryKey: readonly unknown[]; data: unknown }>
) {
  previous.forEach(({ queryKey, data }) => {
    queryClient.setQueryData(queryKey, data);
  });
}

function removeCachedInventory(
  queryClient: ReturnType<typeof useQueryClient>,
  itemId: string
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  queryClient
    .getQueryCache()
    .findAll({ queryKey: inventoryKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | InventoryWithRelations[]
        | { items: InventoryWithRelations[]; totalCount: number }
        | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });

      if (Array.isArray(data)) {
        queryClient.setQueryData(query.queryKey, data.filter((i) => i.id !== itemId));
      } else if (Array.isArray((data as { items: InventoryWithRelations[] }).items)) {
        const withItems = data as { items: InventoryWithRelations[]; totalCount: number };
        queryClient.setQueryData(query.queryKey, {
          ...withItems,
          items: withItems.items.filter((i) => i.id !== itemId),
          totalCount: Math.max(0, withItems.totalCount - 1),
        });
      }
    });

  return previous;
}

function insertCachedInventory(
  queryClient: ReturnType<typeof useQueryClient>,
  item: InventoryWithRelations
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  queryClient
    .getQueryCache()
    .findAll({ queryKey: inventoryKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | InventoryWithRelations[]
        | { items: InventoryWithRelations[]; totalCount: number }
        | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });

      if (Array.isArray(data)) {
        queryClient.setQueryData(query.queryKey, [item, ...data]);
      } else if (Array.isArray((data as { items: InventoryWithRelations[] }).items)) {
        const withItems = data as { items: InventoryWithRelations[]; totalCount: number };
        queryClient.setQueryData(query.queryKey, {
          ...withItems,
          items: [item, ...withItems.items],
          totalCount: withItems.totalCount + 1,
        });
      }
    });

  return previous;
}

function findCachedWarehouseSummary(
  queryClient: ReturnType<typeof useQueryClient>,
  warehouseId: string
): { code: string; name: string } | undefined {
  for (const query of queryClient.getQueryCache().findAll({ queryKey: warehouseKeys.all })) {
    const data = query.state.data as
      | WarehouseWithRelations[]
      | { warehouses: WarehouseWithRelations[] }
      | undefined;
    if (!data) continue;
    const list = Array.isArray(data) ? data : (data as { warehouses: WarehouseWithRelations[] }).warehouses;
    const found = list?.find((w) => w.id === warehouseId);
    if (found) return { code: found.code, name: found.name };
  }
  return undefined;
}

function buildOptimisticInventoryItem(
  tempId: string,
  data: {
    warehouseId: string;
    sku: string;
    name: string;
    quantity: number;
    minStock?: number;
    weightKg?: number;
    volumeM3?: number;
    palletCount?: number;
    cargoType?: string;
    unitValue?: number;
    imageUrl?: string | null;
    currency?: string;
    zone?: string | undefined;
  },
  warehouse?: { code: string; name: string }
): InventoryWithRelations {
  return {
    id: tempId,
    warehouseId: data.warehouseId,
    sku: data.sku,
    name: data.name,
    zone: data.zone ?? null,
    quantity: data.quantity,
    allocatedQuantity: 0,
    minStock: data.minStock ?? 0,
    imageUrl: data.imageUrl ?? null,
    unitValue: data.unitValue ?? 0,
    unit: "Each",
    currency: data.currency ?? "USD",
    weightKg: data.weightKg ?? 0,
    volumeM3: data.volumeM3 ?? 0,
    palletCount: data.palletCount ?? 0,
    cargoType: data.cargoType ?? "General Cargo",
    updatedAt: new Date(),
    warehouse: warehouse ?? { code: "", name: "" },
  };
}

export function useInventoryMutations() {
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
  // mark inventory queries stale (refetchType: "none") instead of forcing an
  // immediate refetch of every mounted query — that would flash a loading
  // state right on top of the optimistic update. On error we force a real
  // refetch of active queries to resync with the server after rollback.
  const settleSuccess = () =>
    queryClient.invalidateQueries({ queryKey: inventoryKeys.all, refetchType: "none" });
  const settleError = () =>
    queryClient.invalidateQueries({ queryKey: inventoryKeys.all, refetchType: "active" });

  const createMutation = useMutation({
    mutationFn: (data: {
      warehouseId: string;
      sku: string;
      name: string;
      quantity: number;
      minStock: number;
      weightKg?: number;
      volumeM3?: number;
      palletCount?: number;
      cargoType?: string;
      unitValue?: number;
    }) => createInventoryItem(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: inventoryKeys.all });
      const tempId = `temp-${Date.now()}`;
      const warehouse = findCachedWarehouseSummary(queryClient, data.warehouseId);
      const optimisticItem = buildOptimisticInventoryItem(tempId, data, warehouse);
      const previous = insertCachedInventory(queryClient, optimisticItem);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedInventory(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess("Item added to inventory successfully");
      settleSuccess();
    },
  });

  const addWarehouseItemMutation = useMutation({
    mutationFn: (data: {
      warehouseId: string;
      sku: string;
      name: string;
      quantity: number;
      minStock?: number;
      weightKg?: number;
      volumeM3?: number;
      palletCount?: number;
      cargoType?: string;
      imageUrl?: string;
      unitValue?: number;
      currency?: string;
      zone?: string | undefined;
    }) =>
      addInventoryItem(
        data.warehouseId,
        data.sku,
        data.name,
        data.quantity,
        data.minStock,
        data.weightKg,
        data.volumeM3,
        data.palletCount,
        data.cargoType,
        data.imageUrl,
        data.unitValue,
        data.currency,
        data.zone
      ),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: inventoryKeys.all });
      const tempId = `temp-${Date.now()}`;
      const warehouse = findCachedWarehouseSummary(queryClient, data.warehouseId);
      const optimisticItem = buildOptimisticInventoryItem(tempId, data, warehouse);
      const previous = insertCachedInventory(queryClient, optimisticItem);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedInventory(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successAdd);
      settleSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Inventory> }) =>
      updateInventoryItem(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: inventoryKeys.all });
      const previous = patchCachedInventory(queryClient, id, data as Partial<InventoryWithRelations>);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedInventory(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successUpdate);
      settleSuccess();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInventoryItem(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: inventoryKeys.all });
      const previous = removeCachedInventory(queryClient, id);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedInventory(queryClient, context.previous);
      handleError(dict.toasts.errorGeneric, error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess(dict.toasts.successDelete);
      settleSuccess();
    },
  });

  const logFulfillmentMutation = useMutation({
    mutationFn: (data: {
      warehouseId: string;
      sku: string;
      quantity: number;
      type: "PICK" | "PACK";
    }) =>
      logWarehouseFulfillment(
        data.warehouseId,
        data.sku,
        data.quantity,
        data.type
      ),
    onMutate: async ({ warehouseId, sku, quantity }) => {
      await queryClient.cancelQueries({ queryKey: inventoryKeys.all });

      let matchedId: string | undefined;
      let currentQuantity: number | undefined;
      for (const query of queryClient.getQueryCache().findAll({ queryKey: inventoryKeys.all })) {
        const data = query.state.data as
          | InventoryWithRelations[]
          | { items: InventoryWithRelations[] }
          | undefined;
        if (!data) continue;
        const list = Array.isArray(data) ? data : (data as { items: InventoryWithRelations[] }).items;
        const found = list?.find((i) => i.warehouseId === warehouseId && i.sku === sku);
        if (found) {
          matchedId = found.id;
          currentQuantity = found.quantity;
          break;
        }
      }

      const previous =
        matchedId && currentQuantity !== undefined
          ? patchCachedInventory(queryClient, matchedId, {
              quantity: Math.max(0, currentQuantity - quantity),
            })
          : [];

      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedInventory(queryClient, context.previous);
      handleError("Failed to log fulfillment", error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess("Fulfillment logged successfully");
      settleSuccess();
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: (data: {
      id: string;
      delta: number;
      type?: import("@/app/lib/type/enums").MovementType;
      notes?: string;
    }) => adjustInventoryStock(data.id, data.delta, data.type, data.notes),
    onMutate: async ({ id, delta }) => {
      await queryClient.cancelQueries({ queryKey: inventoryKeys.all });

      let currentQuantity: number | undefined;
      for (const query of queryClient.getQueryCache().findAll({ queryKey: inventoryKeys.all })) {
        const data = query.state.data as
          | InventoryWithRelations[]
          | { items: InventoryWithRelations[] }
          | InventoryWithRelations
          | null
          | undefined;
        if (!data) continue;
        const list = Array.isArray(data)
          ? data
          : (data as { items: InventoryWithRelations[] }).items || [data as InventoryWithRelations];
        const found = list?.find((i) => i?.id === id);
        if (found) {
          currentQuantity = found.quantity;
          break;
        }
      }

      const previous =
        currentQuantity !== undefined
          ? patchCachedInventory(queryClient, id, {
              quantity: Math.max(0, currentQuantity + delta),
            })
          : [];

      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedInventory(queryClient, context.previous);
      handleError("Failed to adjust stock", error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess("Stock adjusted successfully");
      settleSuccess();
    },
  });

  return {
    createItem: createMutation,
    addWarehouseItem: addWarehouseItemMutation,
    updateItem: updateMutation,
    deleteItem: deleteMutation,
    logFulfillment: logFulfillmentMutation,
    adjustStock: adjustStockMutation,
  };
}
