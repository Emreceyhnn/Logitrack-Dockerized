"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
} from "@/app/lib/actions/profile";
import { profileKeys } from "@/app/lib/query-keys/profile.keys";
import { logger } from "@/app/lib/logger";
import type { ProfileUser } from "@/app/lib/type/profile";

async function fetchProfile(): Promise<ProfileUser> {
  const p = await getMyProfile();
  return {
    ...p,
    lastLoginAt: p.lastLoginAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

export function useProfile(enabled: boolean) {
  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: fetchProfile,
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

export function useProfileMutations() {
  const queryClient = useQueryClient();

  const handleError = (message: string, error: unknown) => {
    logger.error(message, error);
    toast.error(error instanceof Error ? error.message : message);
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; surname: string; avatarUrl?: string | null }) => {
      const r = await updateMyProfile(data);
      if ("error" in r) throw new Error(r.error);
      return r;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: profileKeys.me() });
      const previous = queryClient.getQueryData<ProfileUser>(profileKeys.me());
      if (previous) {
        queryClient.setQueryData<ProfileUser>(profileKeys.me(), {
          ...previous,
          name: data.name,
          surname: data.surname,
          ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
        });
      }
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(profileKeys.me(), context.previous);
      handleError("Failed to update profile", error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: profileKeys.me() }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const r = await changeMyPassword(data);
      if ("error" in r) throw new Error(r.error);
      return r;
    },
  });

  return {
    updateProfile: updateProfileMutation,
    changePassword: changePasswordMutation,
  };
}
