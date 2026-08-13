export const reportsKeys = {
  all: ["reports"] as const,
  dashboard: () => [...reportsKeys.all, "dashboard"] as const,
};
