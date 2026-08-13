import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/app/lib/controllers/customer";
import { toast } from "sonner";

import { customerKeys } from "@/app/lib/query-keys/customer.keys";
import { CustomerWithRelations, CustomerFormLocation } from "@/app/lib/type/customer";
import { logger } from "@/app/lib/logger";


async function fetchCustomers(): Promise<CustomerWithRelations[]> {
  const res = await fetch(`/api/customers`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`[useCustomers] fetch failed: ${res.status}`);
  }

  return res.json();
}

export function useCustomers() {
  return useQuery({
    queryKey: customerKeys.lists(),
    queryFn: () => fetchCustomers(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCustomer(id?: string | null) {
  return useQuery({
    queryKey: customerKeys.details(id || ""),
    queryFn: async () => {
      if (!id) return null;
      const { getCustomerById } = await import("@/app/lib/controllers/customer");
      return getCustomerById(id);
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

async function fetchCustomerDashboard(
  page: number,
  pageSize: number,
  search?: string
): Promise<{
  customers: CustomerWithRelations[];
  totalCount: number;
  stats: {
    totalCustomers: number;
    activeCustomers: number;
    totalShipments: number;
  };
  statsTrends?: {
    totalCustomers?: { value: number; isUp: boolean };
  };
}> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (search) params.set("search", search);

  const res = await fetch(`/api/customers/dashboard?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`[useCustomersWithDashboard] fetch failed: ${res.status}`);
  }

  return res.json();
}

export function useCustomersWithDashboard(
  page: number = 1,
  pageSize: number = 10,
  search?: string
) {
  return useQuery({
    queryKey: customerKeys.dashboardWithFilters(page, pageSize, search),
    queryFn: () => fetchCustomerDashboard(page, pageSize, search),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
}


function removeCachedCustomer(
  queryClient: ReturnType<typeof useQueryClient>,
  customerId: string
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  queryClient
    .getQueryCache()
    .findAll({ queryKey: customerKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | CustomerWithRelations[]
        | { customers: CustomerWithRelations[]; totalCount: number }
        | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });

      if (Array.isArray(data)) {
        queryClient.setQueryData(query.queryKey, data.filter((c) => c.id !== customerId));
      } else if (Array.isArray((data as { customers: CustomerWithRelations[] }).customers)) {
        const withCustomers = data as { customers: CustomerWithRelations[]; totalCount: number };
        queryClient.setQueryData(query.queryKey, {
          ...withCustomers,
          customers: withCustomers.customers.filter((c) => c.id !== customerId),
          totalCount: Math.max(0, withCustomers.totalCount - 1),
        });
      }
    });

  return previous;
}

function rollbackCachedCustomers(
  queryClient: ReturnType<typeof useQueryClient>,
  previous: Array<{ queryKey: readonly unknown[]; data: unknown }>
) {
  previous.forEach(({ queryKey, data }) => {
    queryClient.setQueryData(queryKey, data);
  });
}

function insertCachedCustomer(
  queryClient: ReturnType<typeof useQueryClient>,
  customer: CustomerWithRelations
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  queryClient
    .getQueryCache()
    .findAll({ queryKey: customerKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | CustomerWithRelations[]
        | { customers: CustomerWithRelations[]; totalCount: number }
        | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });

      if (Array.isArray(data)) {
        queryClient.setQueryData(query.queryKey, [customer, ...data]);
      } else if (Array.isArray((data as { customers: CustomerWithRelations[] }).customers)) {
        const withCustomers = data as { customers: CustomerWithRelations[]; totalCount: number };
        queryClient.setQueryData(query.queryKey, {
          ...withCustomers,
          customers: [customer, ...withCustomers.customers],
          totalCount: withCustomers.totalCount + 1,
        });
      }
    });

  return previous;
}

function patchCachedCustomer(
  queryClient: ReturnType<typeof useQueryClient>,
  customerId: string,
  patch: Partial<CustomerWithRelations>
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  const patchOne = (customer: CustomerWithRelations) =>
    customer.id === customerId ? { ...customer, ...patch } : customer;

  queryClient
    .getQueryCache()
    .findAll({ queryKey: customerKeys.all })
    .forEach((query) => {
      const data = query.state.data as
        | CustomerWithRelations[]
        | { customers: CustomerWithRelations[] }
        | CustomerWithRelations
        | null
        | undefined;
      if (!data) return;

      previous.push({ queryKey: query.queryKey, data });

      if (Array.isArray(data)) {
        queryClient.setQueryData(query.queryKey, data.map(patchOne));
      } else if (Array.isArray((data as { customers: CustomerWithRelations[] }).customers)) {
        const withCustomers = data as { customers: CustomerWithRelations[] };
        queryClient.setQueryData(query.queryKey, {
          ...withCustomers,
          customers: withCustomers.customers.map(patchOne),
        });
      } else if ((data as CustomerWithRelations).id === customerId) {
        queryClient.setQueryData(query.queryKey, patchOne(data as CustomerWithRelations));
      }
    });

  return previous;
}

export function useCustomerMutations() {
  const queryClient = useQueryClient();

  const handleSuccess = (message: string) => {
    toast.success(message);
  };

  const handleError = (message: string, error: Error | unknown) => {
    logger.error(message, error);
    toast.error((error as Error)?.message || message);
  };

  // onMutate already patches the cache optimistically, so on success we only
  // mark queries stale (refetchType: "none") instead of forcing an immediate
  // refetch of every mounted query — that would flash a loading state right
  // on top of the optimistic update. On error we force a real refetch of
  // active queries to resync with the server after rollback.
  const settleSuccess = () =>
    queryClient.invalidateQueries({ queryKey: customerKeys.all, refetchType: "none" });
  const settleError = () =>
    queryClient.invalidateQueries({ queryKey: customerKeys.all, refetchType: "active" });

  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      code: string;
      industry?: string | undefined;
      taxId?: string | undefined;
      email?: string | undefined;
      phone?: string | undefined;
      locations?: CustomerFormLocation[] | undefined;
    }) =>
      createCustomer(
        data.name,
        data.code,
        data.industry,
        data.taxId,
        data.email,
        data.phone,
        data.locations
      ),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: customerKeys.all });
      const tempId = `temp-${Date.now()}`;
      const optimisticCustomer: CustomerWithRelations = {
        id: tempId,
        name: data.name,
        code: data.code || `CUST-${tempId}`,
        industry: data.industry ?? null,
        taxId: data.taxId ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        companyId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        locations: (data.locations || []).map((loc) => ({
          id: loc.id || `temp-loc-${Date.now()}`,
          customerId: tempId,
          name: loc.name,
          address: loc.address,
          lat: loc.lat ?? null,
          lng: loc.lng ?? null,
          isDefault: loc.isDefault ?? false,
        })),
        _count: { shipments: 0 },
      };
      const previous = insertCachedCustomer(queryClient, optimisticCustomer);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedCustomers(queryClient, context.previous);
      handleError("Failed to create customer", error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess("Customer created successfully");
      settleSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof updateCustomer>[1];
    }) => updateCustomer(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: customerKeys.all });
      const previous = patchCachedCustomer(queryClient, id, data as Partial<CustomerWithRelations>);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedCustomers(queryClient, context.previous);
      handleError("Failed to update customer", error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess("Customer updated successfully");
      settleSuccess();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: customerKeys.all });
      const previous = removeCachedCustomer(queryClient, id);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedCustomers(queryClient, context.previous);
      handleError("Failed to delete customer", error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess("Customer deleted successfully");
      settleSuccess();
    },
  });

  return {
    createCustomer: createMutation,
    updateCustomer: updateMutation,
    deleteCustomer: deleteMutation,
  };
}
