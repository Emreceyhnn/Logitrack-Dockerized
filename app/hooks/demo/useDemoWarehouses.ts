"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  WarehouseWithRelations,
  WarehouseStats,
  InventoryMovementWithRelations,
} from "@/app/lib/type/warehouse";

async function fetchDemoWarehouseDashboard(): Promise<{
  warehouses: WarehouseWithRelations[];
  totalCount: number;
  stats: WarehouseStats;
  statsTrends?: { totalWarehouses?: { value: number; isUp: boolean } };
  recentMovements: InventoryMovementWithRelations[];
}> {
  const res = await fetch("/api/demo/warehouses/dashboard", {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`[useDemoWarehouses] fetch failed: ${res.status}`);
  }

  return res.json();
}

// Demo-local mirror of useWarehousesWithDashboard — reads the public mock
// endpoint. Pagination params are accepted for signature parity but are not
// sent anywhere (fixed mock dataset).
export function useDemoWarehousesWithDashboard() {
  return useQuery({
    queryKey: ["demo", "warehouses", "dashboard"],
    queryFn: () => fetchDemoWarehouseDashboard(),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
}
