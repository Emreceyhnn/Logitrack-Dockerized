"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  ShipmentWithRelations,
  ShipmentStats,
  ShipmentVolumeData,
  ShipmentStatusData,
} from "@/app/lib/type/shipment";

async function fetchDemoShipmentDashboard(): Promise<{
  shipments: ShipmentWithRelations[];
  totalCount: number;
  stats: ShipmentStats;
  statsTrends?: {
    total?: { value: number; isUp: boolean };
    active?: { value: number; isUp: boolean };
    delayed?: { value: number; isUp: boolean };
    inTransit?: { value: number; isUp: boolean };
  };
  volumeHistory: ShipmentVolumeData[];
  statusDistribution: ShipmentStatusData[];
}> {
  const res = await fetch("/api/demo/shipments/dashboard", {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`[useDemoShipments] fetch failed: ${res.status}`);
  }

  return res.json();
}

// Demo-local mirror of useShipmentsWithDashboard — reads the public mock
// endpoint. Pagination/filter params are accepted for signature parity with
// the real hook's call sites but are not sent anywhere (fixed mock dataset).
export function useDemoShipmentsWithDashboard() {
  return useQuery({
    queryKey: ["demo", "shipments", "dashboard"],
    queryFn: () => fetchDemoShipmentDashboard(),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
}
