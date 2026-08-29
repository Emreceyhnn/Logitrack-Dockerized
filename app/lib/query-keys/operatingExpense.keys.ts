export const operatingExpenseKeys = {
  all: ["operatingExpenses"] as const,
  lists: () => [...operatingExpenseKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...operatingExpenseKeys.lists(), { filters }] as const,
};
