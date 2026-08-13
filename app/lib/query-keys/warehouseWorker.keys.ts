export const warehouseWorkerKeys = {
  all: ["warehouseWorker"] as const,
  dashboard: (warehouseId?: string) =>
    [...warehouseWorkerKeys.all, "dashboard", warehouseId ?? "default"] as const,
};
