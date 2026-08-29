"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getOperatingExpenses,
  createOperatingExpense,
  deleteOperatingExpense,
} from "@/app/lib/controllers/operatingExpense";
import { operatingExpenseKeys } from "@/app/lib/query-keys/operatingExpense.keys";
import type { OperatingExpenseCategory } from "@/app/lib/type/enums";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { logger } from "@/app/lib/logger";

export function useOperatingExpenses(filters: {
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  category?: OperatingExpenseCategory | undefined;
} = {}) {
  return useQuery({
    queryKey: operatingExpenseKeys.list(filters),
    queryFn: () => getOperatingExpenses(filters),
  });
}

export function useOperatingExpenseMutations() {
  const queryClient = useQueryClient();
  const dict = useDictionary();

  const createMutation = useMutation({
    mutationFn: (data: {
      category: OperatingExpenseCategory;
      amount: number;
      date: Date;
      currency?: string | undefined;
      note?: string | undefined;
    }) => createOperatingExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: operatingExpenseKeys.all });
      toast.success(dict.common.success || "Success");
    },
    onError: (error: Error) => {
      logger.error(error);
      toast.error(dict.toasts.errorGeneric || "Something went wrong");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOperatingExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: operatingExpenseKeys.all });
      toast.success(dict.toasts.successDelete || "Deleted");
    },
    onError: (error: Error) => {
      logger.error(error);
      toast.error(dict.toasts.errorGeneric || "Something went wrong");
    },
  });

  return { createExpense: createMutation, deleteExpense: deleteMutation };
}
