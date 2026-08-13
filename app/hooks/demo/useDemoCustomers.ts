"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { CustomerWithRelations } from "@/app/lib/type/customer";

async function fetchDemoCustomerDashboard(): Promise<{
  customers: CustomerWithRelations[];
  totalCount: number;
  stats: {
    totalCustomers: number;
    activeCustomers: number;
    totalShipments: number;
  };
  statsTrends?: {
    totalCustomers?: { value: number; isUp: boolean };
  };
}> {
  const res = await fetch("/api/demo/customers/dashboard", {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`[useDemoCustomers] fetch failed: ${res.status}`);
  }

  return res.json();
}

// Demo-local mirror of useCustomersWithDashboard — reads the public mock
// endpoint. Pagination/search params are accepted for signature parity but are
// not sent anywhere (fixed mock dataset).
export function useDemoCustomersWithDashboard() {
  return useQuery({
    queryKey: ["demo", "customers", "dashboard"],
    queryFn: () => fetchDemoCustomerDashboard(),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
}
