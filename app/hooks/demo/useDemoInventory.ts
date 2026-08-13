"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  InventoryWithRelations,
  LowStockItem,
} from "@/app/lib/type/inventory";

async function fetchDemoInventoryDashboard(): Promise<{
  items: InventoryWithRelations[];
  totalCount: number;
  stats: {
    totalItems: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalValue: number;
  };
  statsTrends?: {
    totalItems?: { value: number; isUp: boolean };
    lowStock?: { value: number; isUp: boolean };
    outOfStock?: { value: number; isUp: boolean };
  };
  lowStockItems: LowStockItem[];
}> {
  const res = await fetch("/api/demo/inventory/dashboard", {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`[useDemoInventory] fetch failed: ${res.status}`);
  }

  return res.json();
}

// Demo-local mirror of useInventoryWithDashboard — reads the public mock
// endpoint. Pagination/filter/sort params are accepted for signature parity
// but are not sent anywhere (fixed mock dataset).
export function useDemoInventoryWithDashboard() {
  return useQuery({
    queryKey: ["demo", "inventory", "dashboard"],
    queryFn: () => fetchDemoInventoryDashboard(),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
}
