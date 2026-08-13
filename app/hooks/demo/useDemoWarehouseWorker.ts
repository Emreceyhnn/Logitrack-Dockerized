import { useQuery } from "@tanstack/react-query";
import type { WarehouseWorkerDashboard } from "@/app/lib/type/warehouseWorker";

// Demo-local mirror of useWarehouseWorker — reads the public mock endpoint.
// Passes warehouseId to fetch corresponding mock warehouse data.
async function fetchDemoWarehouseWorkerDashboard(
  warehouseId?: string
): Promise<WarehouseWorkerDashboard> {
  const url = warehouseId
    ? `/api/demo/warehouse-worker/dashboard?warehouseId=${encodeURIComponent(
        warehouseId
      )}`
    : "/api/demo/warehouse-worker/dashboard";
  const res = await fetch(url, {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`[useDemoWarehouseWorker] fetch failed: ${res.status}`);
  }

  return res.json();
}

export function useDemoWarehouseWorker(warehouseId?: string) {
  return useQuery<WarehouseWorkerDashboard>({
    queryKey: ["demo", "warehouse-worker", "dashboard", warehouseId ?? "default"],
    queryFn: () => fetchDemoWarehouseWorkerDashboard(warehouseId),
    staleTime: 1000 * 30,
    placeholderData: (previousData) => previousData,
  });
}
