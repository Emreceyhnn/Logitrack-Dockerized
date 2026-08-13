"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type {
  DeletableEntity,
  DeletionActions,
  DeletionResult,
  DeletionState,
  DeletionTarget,
} from "@/app/lib/type/admin/deletion";

/**
 * tr-Silme ve geri yükleme akışını yöneten paylaşılan hook.
 * en-Shared delete/restore flow for the admin data screens.
 *
 *    Owns the confirmation target, the in-flight state and the API calls, so
 *    each screen only has to render a delete button and the dialog. The caller
 *    supplies `onChanged` to refresh its own list after a successful mutation.
 * input (onChanged: () => void | Promise<void>)
 * output ({ state, actions })
 */
export function useAdminDeletion(onChanged: () => void | Promise<void>) {
  const dict = useDictionary();
  const t = dict.admin.data.deletion;

  const [state, setState] = useState<DeletionState>({
    target: null,
    busy: false,
    error: null,
    lastResult: null,
  });

  const requestDelete = useCallback((target: DeletionTarget) => {
    setState({ target, busy: false, error: null, lastResult: null });
  }, []);

  const cancelDelete = useCallback(() => {
    setState((s) => (s.busy ? s : { ...s, target: null, error: null }));
  }, []);

  const post = useCallback(
    async (body: Record<string, unknown>): Promise<DeletionResult> => {
      const res = await fetch("/api/admin/deletion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        throw new Error(
          (json as { error?: string })?.error ?? `Failed (${res.status})`
        );
      }
      return (json as { result: DeletionResult }).result;
    },
    []
  );

  const confirmDelete = useCallback(
    async (confirmLabel?: string) => {
      const target = state.target;
      if (!target) return;

      setState((s) => ({ ...s, busy: true, error: null }));

      try {
        const result = await post({
          action: "delete",
          entity: target.entity,
          id: target.id,
          ...(confirmLabel !== undefined ? { confirmLabel } : {}),
        });

        setState({
          target: null,
          busy: false,
          error: null,
          lastResult: result,
        });

        // Surface the cascade explicitly — an operator deleting a company
        // should see how many people were signed out by it.
        const cascade = result.cascadeSummary?.users;
        toast.success(
          cascade
            ? `${t.deleteSuccess} — ${cascade} ${t.cascadeUsers}`
            : t.deleteSuccess
        );

        await onChanged();
      } catch (err) {
        // Keep the dialog open on failure so the operator can correct the
        // confirmation text rather than starting over.
        setState((s) => ({
          ...s,
          busy: false,
          error: err instanceof Error ? err.message : dict.admin.common.error,
        }));
      }
    },
    [state.target, post, onChanged, t.deleteSuccess, t.cascadeUsers, dict.admin.common.error]
  );

  const restore = useCallback(
    async (entity: DeletableEntity, id: string) => {
      setState((s) => ({ ...s, busy: true, error: null }));
      try {
        const result = await post({ action: "restore", entity, id });
        setState((s) => ({ ...s, busy: false, lastResult: result }));
        toast.success(t.restoreSuccess);
        await onChanged();
      } catch (err) {
        setState((s) => ({ ...s, busy: false }));
        toast.error(
          err instanceof Error ? err.message : dict.admin.common.error
        );
      }
    },
    [post, onChanged, t.restoreSuccess, dict.admin.common.error]
  );

  const hardDeleteUser = useCallback(
    async (id: string) => {
      setState((s) => ({ ...s, busy: true, error: null }));
      try {
        const result = await post({ action: "hardDeleteUser", id });
        setState({ target: null, busy: false, error: null, lastResult: result });
        toast.success(t.hardDeleteSuccess);
        await onChanged();
      } catch (err) {
        setState((s) => ({ ...s, busy: false }));
        toast.error(
          err instanceof Error ? err.message : dict.admin.common.error
        );
      }
    },
    [post, onChanged, t.hardDeleteSuccess, dict.admin.common.error]
  );

  const actions = useMemo<DeletionActions>(
    () => ({
      requestDelete,
      cancelDelete,
      confirmDelete,
      restore,
      hardDeleteUser,
    }),
    [requestDelete, cancelDelete, confirmDelete, restore, hardDeleteUser]
  );

  return { state, actions };
}
