export const overviewKeys = {
  all: ["overview"] as const,
  dashboard: () => [...overviewKeys.all, "dashboard"] as const,
};
