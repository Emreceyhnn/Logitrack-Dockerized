import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  getCompanyProfile,
  addCompanyUser,
  updateCompanyMember,
  removeCompanyUser,
} from "@/app/lib/controllers/company";
import {
  getPendingJoinRequests,
  getAllJoinRequests,
  acceptJoinRequest,
  rejectJoinRequest,
} from "@/app/lib/controllers/joinRequests";
import {
  getCompanyInvitations,
  resendInvitation,
  revokeInvitation,
} from "@/app/lib/controllers/invitations";
import { toast } from "sonner";

import { companyKeys } from "@/app/lib/query-keys/company.keys";
import { logger } from "@/app/lib/logger";
import type { CompanyMember } from "@/app/lib/type/company";


async function fetchCompanyDashboard(filters: {
  page: number;
  pageSize: number;
  search?: string;
}) {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));
  if (filters.search) params.set("search", filters.search);

  const res = await fetch(`/api/company/dashboard?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    },
  });

  if (!res.ok) {
    throw new Error(`[useCompanyWithDashboard] fetch failed: ${res.status}`);
  }

  return res.json();
}

export function useCompanyWithDashboard(filters: {
  page: number;
  pageSize: number;
  search?: string;
}) {
  return useQuery({
    queryKey: companyKeys.dashboardWithFilters(filters),
    queryFn: () => fetchCompanyDashboard(filters),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCompanyProfile() {
  return useQuery({
    queryKey: companyKeys.profile(),
    queryFn: () => getCompanyProfile(),
    staleTime: 1000 * 60 * 10,
  });
}

function removeCachedCompanyMember(
  queryClient: ReturnType<typeof useQueryClient>,
  memberId: string
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  queryClient
    .getQueryCache()
    .findAll({ queryKey: companyKeys.dashboard() })
    .forEach((query) => {
      const data = query.state.data as
        | { members: CompanyMember[]; totalCount: number }
        | undefined;
      if (!data) return;
      if (!Array.isArray(data.members)) return;

      previous.push({ queryKey: query.queryKey, data });

      queryClient.setQueryData(query.queryKey, {
        ...data,
        members: data.members.filter((m) => m.id !== memberId),
        totalCount: Math.max(0, data.totalCount - 1),
      });
    });

  return previous;
}

function rollbackCachedCompany(
  queryClient: ReturnType<typeof useQueryClient>,
  previous: Array<{ queryKey: readonly unknown[]; data: unknown }>
) {
  previous.forEach(({ queryKey, data }) => {
    queryClient.setQueryData(queryKey, data);
  });
}

function insertCachedCompanyMember(
  queryClient: ReturnType<typeof useQueryClient>,
  member: CompanyMember
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  queryClient
    .getQueryCache()
    .findAll({ queryKey: companyKeys.dashboard() })
    .forEach((query) => {
      const data = query.state.data as
        | { members: CompanyMember[]; totalCount: number }
        | undefined;
      if (!data) return;
      if (!Array.isArray(data.members)) return;

      previous.push({ queryKey: query.queryKey, data });

      queryClient.setQueryData(query.queryKey, {
        ...data,
        members: [member, ...data.members],
        totalCount: data.totalCount + 1,
      });
    });

  return previous;
}

function patchCachedCompanyMember(
  queryClient: ReturnType<typeof useQueryClient>,
  memberId: string,
  patch: Partial<CompanyMember>
) {
  const previous: Array<{ queryKey: readonly unknown[]; data: unknown }> = [];

  const patchOne = (member: CompanyMember) =>
    member.id === memberId ? { ...member, ...patch } : member;

  queryClient
    .getQueryCache()
    .findAll({ queryKey: companyKeys.dashboard() })
    .forEach((query) => {
      const data = query.state.data as
        | { members: CompanyMember[]; totalCount: number }
        | undefined;
      if (!data) return;
      if (!Array.isArray(data.members)) return;

      previous.push({ queryKey: query.queryKey, data });

      queryClient.setQueryData(query.queryKey, {
        ...data,
        members: data.members.map(patchOne),
      });
    });

  return previous;
}

export function useCompanyMutations() {
  const queryClient = useQueryClient();

  const handleSuccess = (message: string) => {
    toast.success(message);
  };

  const handleError = (message: string, error: Error | unknown) => {
    logger.error(message, error);
    toast.error((error as Error)?.message || message);
  };

  // onMutate already patches the cache optimistically, so on success we only
  // mark the dashboard query stale (refetchType: "none") instead of forcing
  // an immediate refetch — that would flash a loading state right on top of
  // the optimistic update. On error we force a real refetch of active
  // queries to resync with the server after rollback. Removing a member only
  // changes the dashboard's member list/count — the company profile and
  // pending join requests are untouched.
  const settleSuccess = () =>
    queryClient.invalidateQueries({ queryKey: companyKeys.dashboard(), refetchType: "none" });
  const settleError = () =>
    queryClient.invalidateQueries({ queryKey: companyKeys.dashboard(), refetchType: "active" });

  const addMemberMutation = useMutation({
    mutationFn: (data: {
      userId: string;
      roleName: string;
      driverData?:
        | {
            employeeId: string;
            phone: string;
            licenseType?: string;
            licenseNumber?: string;
            licenseExpiry?: string;
          }
        | undefined;
      warehouseId?: string | undefined;
      optimisticMember: CompanyMember;
    }) => addCompanyUser(data.userId, data.roleName, data.driverData, data.warehouseId),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: companyKeys.dashboard() });
      const previous = insertCachedCompanyMember(queryClient, data.optimisticMember);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedCompany(queryClient, context.previous);
      handleError("Failed to add member", error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess("Member added to company successfully");
      settleSuccess();
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof updateCompanyMember>[1];
      optimisticRoleName?: string | null;
    }) => updateCompanyMember(id, data),
    onMutate: async ({ id, data, optimisticRoleName }) => {
      await queryClient.cancelQueries({ queryKey: companyKeys.dashboard() });
      const patch: Partial<CompanyMember> = { ...data };
      if (optimisticRoleName) patch.roleName = optimisticRoleName;
      const previous = patchCachedCompanyMember(queryClient, id, patch);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedCompany(queryClient, context.previous);
      handleError("Failed to update member", error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess("Member updated successfully");
      settleSuccess();
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (memberId: string) => removeCompanyUser(memberId),
    onMutate: async (memberId) => {
      await queryClient.cancelQueries({ queryKey: companyKeys.dashboard() });
      const previous = removeCachedCompanyMember(queryClient, memberId);
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) rollbackCachedCompany(queryClient, context.previous);
      handleError("Failed to remove member", error);
      settleError();
    },
    onSuccess: () => {
      handleSuccess("Member removed from company successfully");
      settleSuccess();
    },
  });

  return {
    addMember: addMemberMutation,
    updateMember: updateMemberMutation,
    deleteMember: deleteMemberMutation,
  };
}

export function usePendingJoinRequests() {
  return useQuery({
    queryKey: companyKeys.joinRequests(),
    queryFn: () => getPendingJoinRequests(),
    staleTime: 1000 * 30,
  });
}

export function useAllJoinRequests() {
  return useQuery({
    queryKey: [...companyKeys.joinRequests(), "ALL"],
    queryFn: () => getAllJoinRequests(),
    staleTime: 1000 * 30,
  });
}

function removeCachedJoinRequest(
  queryClient: ReturnType<typeof useQueryClient>,
  requestId: string
) {
  const previousData = queryClient.getQueryData(companyKeys.joinRequests()) as
    | { id: string }[]
    | undefined;
  if (!Array.isArray(previousData)) return undefined;

  queryClient.setQueryData(
    companyKeys.joinRequests(),
    previousData.filter((r) => r.id !== requestId)
  );
  return previousData;
}

export function useJoinRequestMutations() {
  const queryClient = useQueryClient();

  // onMutate already patches the cache optimistically, so on success we only
  // mark queries stale (refetchType: "none") instead of forcing an immediate
  // refetch — that would flash a loading state right on top of the
  // optimistic update. On error we force a real refetch of active queries to
  // resync with the server after rollback.
  const settleSuccess = () =>
    queryClient.invalidateQueries({ queryKey: companyKeys.joinRequests(), refetchType: "none" });
  const settleError = () =>
    queryClient.invalidateQueries({ queryKey: companyKeys.joinRequests(), refetchType: "active" });

  const accept = useMutation({
    mutationFn: (params: {
      id: string;
      roleName: string;
      driverData?: {
        employeeId: string;
        phone: string;
        licenseType?: string;
        licenseNumber?: string;
        licenseExpiry?: string;
      };
    }) => acceptJoinRequest(params.id, params.roleName, params.driverData),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: companyKeys.joinRequests() });
      const previous = removeCachedJoinRequest(queryClient, id);
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(companyKeys.joinRequests(), context.previous);
      settleError();
      queryClient.invalidateQueries({ queryKey: companyKeys.dashboard(), refetchType: "active" });
    },
    onSuccess: () => {
      settleSuccess();
      // Accepting adds a new company member — only the dashboard's member
      // list/count is affected, not the profile.
      queryClient.invalidateQueries({ queryKey: companyKeys.dashboard(), refetchType: "none" });
    },
  });

  const reject = useMutation({
    mutationFn: (id: string) => rejectJoinRequest(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: companyKeys.joinRequests() });
      const previous = removeCachedJoinRequest(queryClient, id);
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(companyKeys.joinRequests(), context.previous);
      settleError();
    },
    onSuccess: settleSuccess,
  });

  return { accept, reject };
}

export function useCompanyInvitations(
  status?: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED" | "ALL"
) {
  return useQuery({
    queryKey: [...companyKeys.invitations(), status ?? "ALL"],
    queryFn: () => getCompanyInvitations(status),
    staleTime: 1000 * 30,
  });
}

export function useInvitationMutations() {
  const queryClient = useQueryClient();

  const settle = (refetchType: "none" | "active") =>
    queryClient.invalidateQueries({
      queryKey: companyKeys.invitations(),
      refetchType,
    });

  const resend = useMutation({
    mutationFn: (id: string) => resendInvitation(id),
    onSuccess: () => {
      // Resending mints a new token and pushes expiresAt out, so the row's
      // displayed expiry is stale until refetched.
      toast.success("Invitation resent");
      settle("none");
    },
    onError: (error: Error) => {
      logger.error("Failed to resend invitation", error);
      toast.error(error?.message || "Failed to resend invitation");
      settle("active");
    },
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeInvitation(id),
    onSuccess: () => {
      toast.success("Invitation revoked");
      settle("none");
    },
    onError: (error: Error) => {
      logger.error("Failed to revoke invitation", error);
      toast.error(error?.message || "Failed to revoke invitation");
      settle("active");
    },
  });

  return { resend, revoke };
}
